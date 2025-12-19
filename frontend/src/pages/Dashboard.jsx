import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../contexts/AuthContext';
import { SESSION_TEMPLATES, exportSalonConfig, importSalonConfig, generateQRCodeSVG } from '../utils/features';
import '../styles/Dashboard.css';

const API_URL = import.meta.env.VITE_API_URL ?? '';

// Color palette for sessions
const COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#0ea5e9', '#3b82f6', '#6366f1'
];

// Template icons
const TEMPLATE_ICONS = {
  daily: '📅',
  designThinking: '💡',
  presentation: '🎤',
  formation: '📚',
  pomodoro: '🍅'
};

// Sortable Session Item Component
function SortableSessionItem({ session, index, onUpdate, onDuplicate, onRemove, formatDuration, parseDuration }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: session.id || index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="session-item">
      <div className="drag-handle" {...attributes} {...listeners}>
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <circle cx="7" cy="5" r="1.5"/>
          <circle cx="13" cy="5" r="1.5"/>
          <circle cx="7" cy="10" r="1.5"/>
          <circle cx="13" cy="10" r="1.5"/>
          <circle cx="7" cy="15" r="1.5"/>
          <circle cx="13" cy="15" r="1.5"/>
        </svg>
      </div>
      <div
        className="session-color-indicator"
        style={{ backgroundColor: session.couleur }}
      />
      <input
        type="text"
        className="session-name"
        value={session.nom_session}
        onChange={(e) => onUpdate(index, 'nom_session', e.target.value)}
        placeholder="Nom de la session"
      />
      <div className="session-duration">
        <input
          type="text"
          value={formatDuration(session.duree_secondes)}
          onChange={(e) => onUpdate(index, 'duree_secondes', parseDuration(e.target.value))}
          placeholder="5:00"
        />
      </div>
      <input
        type="color"
        className="session-color-picker"
        value={session.couleur}
        onChange={(e) => onUpdate(index, 'couleur', e.target.value)}
        title="Choisir la couleur"
      />
      <select
        className="session-type-select"
        value={session.type || 'session'}
        onChange={(e) => onUpdate(index, 'type', e.target.value)}
      >
        <option value="session">Session</option>
        <option value="pause">Pause</option>
      </select>
      <button
        className="session-action duplicate"
        onClick={() => onDuplicate(index)}
        title="Dupliquer"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      </button>
      <button
        className="session-action delete"
        onClick={() => onRemove(index)}
        title="Supprimer"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout, authFetch, isAuthenticated, loading: authLoading } = useAuth();
  const [timers, setTimers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTimer, setEditingTimer] = useState(null);
  const [newTimer, setNewTimer] = useState({ name: '', description: '', sessions: [] });
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const navigate = useNavigate();

  // Testimonial form state
  const [testimonialForm, setTestimonialForm] = useState({ content: '', rating: 5, company: '' });
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);

  // Feedback form state
  const [feedbackForm, setFeedbackForm] = useState({ content: '', type: 'feedback' });
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  // Share form state
  const [shareEmail, setShareEmail] = useState('');
  const [showShareForm, setShowShareForm] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for sessions
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id && editingTimer) {
      const oldIndex = editingTimer.sessions.findIndex((s, i) => (s.id || i) === active.id);
      const newIndex = editingTimer.sessions.findIndex((s, i) => (s.id || i) === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        setEditingTimer({
          ...editingTimer,
          sessions: arrayMove(editingTimer.sessions, oldIndex, newIndex)
        });
      }
    }
  };

  // Fetch timers
  const fetchTimers = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/timers`);
      const data = await res.json();
      if (data.success) {
        setTimers(data.timers);
      }
    } catch (err) {
      setError('Erreur lors du chargement des timers');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    } else if (isAuthenticated) {
      fetchTimers();
    }
  }, [authLoading, isAuthenticated, navigate, fetchTimers]);

  // Create timer
  const createTimer = async () => {
    if (!newTimer.name.trim()) {
      setError('Le nom du timer est requis');
      return;
    }

    try {
      const res = await authFetch(`${API_URL}/api/timers`, {
        method: 'POST',
        body: JSON.stringify(newTimer)
      });

      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewTimer({ name: '', description: '', sessions: [] });
        fetchTimers();
      } else {
        setError(data.error);
      }
    } catch {
      setError('Erreur lors de la création');
    }
  };

  // Delete timer
  const deleteTimer = async (id) => {
    if (!confirm('Supprimer ce timer ?')) return;

    try {
      const res = await authFetch(`${API_URL}/api/timers/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchTimers();
      }
    } catch {
      setError('Erreur lors de la suppression');
    }
  };

  // Duplicate timer
  const duplicateTimer = async (id) => {
    try {
      const res = await authFetch(`${API_URL}/api/timers/${id}/duplicate`, {
        method: 'POST'
      });

      const data = await res.json();
      if (data.success) {
        fetchTimers();
      } else {
        setError(data.error);
      }
    } catch {
      setError('Erreur lors de la duplication');
    }
  };

  // Edit timer
  const openEditModal = async (timer) => {
    try {
      const res = await authFetch(`${API_URL}/api/timers/${timer.id}`);
      const data = await res.json();
      if (data.success) {
        setEditingTimer(data.timer);
        setShowEditModal(true);
      }
    } catch {
      setError('Erreur lors du chargement');
    }
  };

  const saveTimer = async () => {
    if (!editingTimer) return;

    try {
      const res = await authFetch(`${API_URL}/api/timers/${editingTimer.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editingTimer.name,
          description: editingTimer.description,
          sessions: editingTimer.sessions
        })
      });

      if (res.ok) {
        setShowEditModal(false);
        setEditingTimer(null);
        fetchTimers();
      }
    } catch {
      setError('Erreur lors de la sauvegarde');
    }
  };

  // Add session to editing timer
  const addSession = () => {
    if (!editingTimer) return;
    const newSession = {
      nom_session: `Session ${editingTimer.sessions.length + 1}`,
      duree_secondes: 300,
      couleur: COLORS[editingTimer.sessions.length % COLORS.length],
      type: 'session'
    };
    setEditingTimer({
      ...editingTimer,
      sessions: [...editingTimer.sessions, newSession]
    });
  };

  // Duplicate session
  const duplicateSession = (index) => {
    if (!editingTimer) return;
    const session = editingTimer.sessions[index];
    const newSession = { ...session, nom_session: `${session.nom_session} (copie)` };
    const newSessions = [...editingTimer.sessions];
    newSessions.splice(index + 1, 0, newSession);
    setEditingTimer({ ...editingTimer, sessions: newSessions });
  };

  // Remove session
  const removeSession = (index) => {
    if (!editingTimer) return;
    const newSessions = editingTimer.sessions.filter((_, i) => i !== index);
    setEditingTimer({ ...editingTimer, sessions: newSessions });
  };

  // Update session
  const updateSession = (index, field, value) => {
    if (!editingTimer) return;
    const newSessions = [...editingTimer.sessions];
    newSessions[index] = { ...newSessions[index], [field]: value };
    setEditingTimer({ ...editingTimer, sessions: newSessions });
  };

  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Parse duration input
  const parseDuration = (value) => {
    const parts = value.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1] || 0);
    }
    return parseInt(value) * 60;
  };

  // Submit testimonial
  const submitTestimonial = async () => {
    if (testimonialForm.content.length < 10) {
      setError('Le témoignage doit contenir au moins 10 caractères');
      return;
    }

    try {
      const res = await authFetch(`${API_URL}/api/testimonials`, {
        method: 'POST',
        body: JSON.stringify(testimonialForm)
      });

      const data = await res.json();
      if (data.success) {
        setShowTestimonialForm(false);
        setTestimonialForm({ content: '', rating: 5, company: '' });
        setSuccessMessage('Merci pour votre témoignage ! Il sera visible après approbation.');
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError(data.error);
      }
    } catch {
      setError('Erreur lors de l\'envoi du témoignage');
    }
  };

  // Submit feedback
  const submitFeedback = async () => {
    if (feedbackForm.content.length < 10) {
      setError('Le message doit contenir au moins 10 caractères');
      return;
    }

    try {
      const res = await authFetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        body: JSON.stringify(feedbackForm)
      });

      const data = await res.json();
      if (data.success) {
        setShowFeedbackForm(false);
        setFeedbackForm({ content: '', type: 'feedback' });
        setSuccessMessage('Merci pour votre retour !');
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError(data.error);
      }
    } catch {
      setError('Erreur lors de l\'envoi');
    }
  };

  // Share by email
  const shareByEmail = () => {
    const subject = encodeURIComponent('Découvre Insuffle Timer !');
    const body = encodeURIComponent(`Salut !\n\nJe te recommande Insuffle Timer, un super outil pour gérer le temps de tes ateliers et réunions.\n\nC'est gratuit et super simple à utiliser : https://timer.insuffle.com\n\nÀ bientôt !`);
    window.open(`mailto:${shareEmail}?subject=${subject}&body=${body}`);
    setShowShareForm(false);
    setShareEmail('');
    setSuccessMessage('Invitation envoyée !');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  if (authLoading || loading) {
    return (
      <div className="dashboard-loading">
        <div className="loader"></div>
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <Link to="/" className="logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
            <span>Insuffle Timer</span>
          </Link>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="user-name">{user?.username}</span>
            <span className="timer-count">{timers.length}/5 timers</span>
          </div>
          <button className="logout-btn" onClick={logout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Déconnexion
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="dashboard-main">
        <div className="dashboard-title-row">
          <h1>Mes Timers</h1>
          <motion.button
            className="create-btn"
            onClick={() => setShowCreateModal(true)}
            disabled={timers.length >= 5}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nouveau Timer
          </motion.button>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="dashboard-error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {error}
              <button onClick={() => setError(null)}>×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success message */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              className="dashboard-success"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {successMessage}
              <button onClick={() => setSuccessMessage(null)}>×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timer cards */}
        <div className="timer-grid">
          <AnimatePresence>
            {timers.map((timer, index) => (
              <motion.div
                key={timer.id}
                className="timer-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="timer-card-header">
                  <h3>{timer.name}</h3>
                  <span className="timer-code">{timer.code_4chiffres}</span>
                </div>

                {timer.description && (
                  <p className="timer-description">{timer.description}</p>
                )}

                <div className="timer-stats">
                  <span>{timer.session_count || 0} sessions</span>
                </div>

                <div className="timer-actions">
                  <button
                    className="action-btn edit"
                    onClick={() => openEditModal(timer)}
                    title="Modifier"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    className="action-btn duplicate"
                    onClick={() => duplicateTimer(timer.id)}
                    title="Dupliquer"
                    disabled={timers.length >= 5}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => deleteTimer(timer.id)}
                    title="Supprimer"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>

                <div className="timer-links">
                  <Link to={`/display/${timer.code_4chiffres}`} className="link-btn display">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                      <line x1="8" y1="21" x2="16" y2="21"/>
                      <line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                    Affichage
                  </Link>
                  <Link to={`/remote/${timer.code_4chiffres}`} className="link-btn remote">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                      <line x1="12" y1="18" x2="12.01" y2="18"/>
                    </svg>
                    Télécommande
                  </Link>
                </div>

                {/* QR Code section */}
                <div className="timer-qr-section">
                  <div className="qr-code-mini">
                    <img
                      src={generateQRCodeSVG(`${window.location.origin}/remote/${timer.code_4chiffres}`, 80)}
                      alt="QR Code"
                      title="Scanner pour ouvrir la télécommande"
                    />
                  </div>
                  <div className="qr-info">
                    <span className="qr-label">Scannez pour la télécommande</span>
                    <span className="qr-code-text">Code: {timer.code_4chiffres}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty state */}
          {timers.length === 0 && (
            <motion.div
              className="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              <h3>Aucun timer</h3>
              <p>Créez votre premier timer pour commencer !</p>
              <button onClick={() => setShowCreateModal(true)}>
                Créer un timer
              </button>
            </motion.div>
          )}
        </div>

        {/* Community Section */}
        <section className="community-section">
          <h2>Participez à la communauté</h2>
          <p>Aidez-nous à améliorer Insuffle Timer et partagez-le !</p>

          <div className="community-cards">
            <motion.div
              className="community-card testimonial-card"
              whileHover={{ scale: 1.02 }}
            >
              <div className="card-icon">💬</div>
              <h3>Témoignage</h3>
              <p>Partagez votre expérience avec Insuffle Timer</p>
              <button onClick={() => setShowTestimonialForm(true)}>
                Laisser un témoignage
              </button>
            </motion.div>

            <motion.div
              className="community-card feedback-card"
              whileHover={{ scale: 1.02 }}
            >
              <div className="card-icon">💡</div>
              <h3>Suggestions</h3>
              <p>Proposez des améliorations ou signalez des bugs</p>
              <button onClick={() => setShowFeedbackForm(true)}>
                Envoyer un feedback
              </button>
            </motion.div>

            <motion.div
              className="community-card share-card"
              whileHover={{ scale: 1.02 }}
            >
              <div className="card-icon">🚀</div>
              <h3>Partager</h3>
              <p>Recommandez Insuffle Timer à vos collègues</p>
              <button onClick={() => setShowShareForm(true)}>
                Inviter quelqu'un
              </button>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Insuffle branding */}
      <footer className="dashboard-footer">
        Propulsé par <a href="https://insuffle.com" target="_blank" rel="noopener noreferrer">Insuffle</a>
      </footer>

      {/* Testimonial Modal */}
      <AnimatePresence>
        {showTestimonialForm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTestimonialForm(false)}
          >
            <motion.div
              className="modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2>Laissez un témoignage</h2>
              <p className="modal-subtitle">Votre avis nous aide à progresser !</p>

              <div className="form-group">
                <label>Votre témoignage</label>
                <textarea
                  value={testimonialForm.content}
                  onChange={(e) => setTestimonialForm({ ...testimonialForm, content: e.target.value })}
                  placeholder="Partagez votre expérience avec Insuffle Timer..."
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label>Note</label>
                <div className="rating-input">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${testimonialForm.rating >= star ? 'active' : ''}`}
                      onClick={() => setTestimonialForm({ ...testimonialForm, rating: star })}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Entreprise (optionnel)</label>
                <input
                  type="text"
                  value={testimonialForm.company}
                  onChange={(e) => setTestimonialForm({ ...testimonialForm, company: e.target.value })}
                  placeholder="Votre entreprise ou organisation"
                />
              </div>

              <div className="modal-actions">
                <button className="cancel" onClick={() => setShowTestimonialForm(false)}>
                  Annuler
                </button>
                <button className="confirm" onClick={submitTestimonial}>
                  Envoyer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      <AnimatePresence>
        {showFeedbackForm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFeedbackForm(false)}
          >
            <motion.div
              className="modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2>Envoyez-nous un feedback</h2>
              <p className="modal-subtitle">Bug, suggestion, amélioration... on veut tout savoir !</p>

              <div className="form-group">
                <label>Type de feedback</label>
                <select
                  value={feedbackForm.type}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, type: e.target.value })}
                >
                  <option value="feedback">Suggestion d'amélioration</option>
                  <option value="bug">Signalement de bug</option>
                  <option value="feature">Demande de fonctionnalité</option>
                  <option value="other">Autre</option>
                </select>
              </div>

              <div className="form-group">
                <label>Votre message</label>
                <textarea
                  value={feedbackForm.content}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, content: e.target.value })}
                  placeholder="Décrivez votre suggestion ou le problème rencontré..."
                  rows={4}
                />
              </div>

              <div className="modal-actions">
                <button className="cancel" onClick={() => setShowFeedbackForm(false)}>
                  Annuler
                </button>
                <button className="confirm" onClick={submitFeedback}>
                  Envoyer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareForm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowShareForm(false)}
          >
            <motion.div
              className="modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2>Partagez Insuffle Timer</h2>
              <p className="modal-subtitle">Invitez vos collègues à découvrir l'outil !</p>

              <div className="form-group">
                <label>Email de la personne à inviter</label>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="collegue@entreprise.com"
                />
              </div>

              <div className="share-options">
                <button className="share-option" onClick={shareByEmail}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Email
                </button>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://timer.insuffle.com')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="share-option linkedin"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://timer.insuffle.com')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="share-option facebook"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </a>
                <button
                  className="share-option"
                  onClick={() => {
                    navigator.clipboard.writeText('https://timer.insuffle.com');
                    setSuccessMessage('Lien copié !');
                    setTimeout(() => setSuccessMessage(null), 2000);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Copier
                </button>
              </div>

              <div className="modal-actions">
                <button className="cancel" onClick={() => setShowShareForm(false)}>
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              className="modal modal-large"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2>Nouveau Timer</h2>

              {/* Templates section */}
              <div className="templates-section">
                <h3>Commencer avec un modèle</h3>
                <div className="templates-grid">
                  {Object.entries(SESSION_TEMPLATES).map(([key, template]) => (
                    <motion.button
                      key={key}
                      className={`template-card ${newTimer.name === template.name ? 'selected' : ''}`}
                      onClick={() => setNewTimer({
                        name: template.name,
                        description: '',
                        sessions: template.sessions.map(s => ({
                          nom_session: s.nom_session,
                          duree_secondes: s.duree_minutes * 60,
                          couleur: s.couleur,
                          type: s.type
                        }))
                      })}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="template-icon">{TEMPLATE_ICONS[key]}</span>
                      <span className="template-name">{template.name}</span>
                      <span className="template-sessions">{template.sessions.length} sessions</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="divider">
                <span>ou personnaliser</span>
              </div>

              <div className="form-group">
                <label>Nom du timer</label>
                <input
                  type="text"
                  value={newTimer.name}
                  onChange={(e) => setNewTimer({ ...newTimer, name: e.target.value })}
                  placeholder="Ex: Sprint Planning"
                />
              </div>
              <div className="form-group">
                <label>Description (optionnel)</label>
                <textarea
                  value={newTimer.description}
                  onChange={(e) => setNewTimer({ ...newTimer, description: e.target.value })}
                  placeholder="Description de votre timer..."
                  rows={2}
                />
              </div>

              {/* Sessions preview */}
              {newTimer.sessions.length > 0 && (
                <div className="sessions-preview">
                  <h4>Sessions ({newTimer.sessions.length})</h4>
                  <div className="sessions-preview-list">
                    {newTimer.sessions.map((session, index) => (
                      <div key={index} className="session-preview-item" style={{ borderLeftColor: session.couleur }}>
                        <span className="session-preview-name">{session.nom_session}</span>
                        <span className="session-preview-duration">{Math.floor(session.duree_secondes / 60)} min</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button className="cancel" onClick={() => {
                  setShowCreateModal(false);
                  setNewTimer({ name: '', description: '', sessions: [] });
                }}>
                  Annuler
                </button>
                <button className="confirm" onClick={createTimer}>
                  Créer le timer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && editingTimer && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              className="modal modal-large"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2>Modifier : {editingTimer.name}</h2>

              <div className="form-row">
                <div className="form-group">
                  <label>Nom du timer</label>
                  <input
                    type="text"
                    value={editingTimer.name}
                    onChange={(e) => setEditingTimer({ ...editingTimer, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Code d'accès</label>
                  <input type="text" value={editingTimer.code_4chiffres} disabled />
                </div>
              </div>

              <div className="sessions-section">
                <div className="sessions-header">
                  <div>
                    <h3>Sessions ({editingTimer.sessions.length})</h3>
                    <p className="sessions-hint">Glissez pour réorganiser</p>
                  </div>
                  <button className="add-session-btn" onClick={addSession}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Ajouter
                  </button>
                </div>

                <div className="sessions-list">
                  {editingTimer.sessions.length > 0 ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={editingTimer.sessions.map((s, i) => s.id || i)}
                        strategy={verticalListSortingStrategy}
                      >
                        {editingTimer.sessions.map((session, index) => (
                          <SortableSessionItem
                            key={session.id || index}
                            session={session}
                            index={index}
                            onUpdate={updateSession}
                            onDuplicate={duplicateSession}
                            onRemove={removeSession}
                            formatDuration={formatDuration}
                            parseDuration={parseDuration}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="no-sessions">
                      Aucune session. Cliquez sur "Ajouter" pour créer votre première session.
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button className="cancel" onClick={() => setShowEditModal(false)}>
                  Annuler
                </button>
                <button className="confirm" onClick={saveTimer}>
                  Enregistrer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
