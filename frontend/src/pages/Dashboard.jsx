import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Dashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Color palette for sessions
const COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#0ea5e9', '#3b82f6', '#6366f1'
];

export default function Dashboard() {
  const { user, logout, authFetch, isAuthenticated, loading: authLoading } = useAuth();
  const [timers, setTimers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTimer, setEditingTimer] = useState(null);
  const [newTimer, setNewTimer] = useState({ name: '', description: '', sessions: [] });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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
      </main>

      {/* Insuffle branding */}
      <footer className="dashboard-footer">
        Propulsé par <a href="https://insuffle.be" target="_blank" rel="noopener noreferrer">Insuffle</a>
      </footer>

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
              className="modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2>Nouveau Timer</h2>
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
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button className="cancel" onClick={() => setShowCreateModal(false)}>
                  Annuler
                </button>
                <button className="confirm" onClick={createTimer}>
                  Créer
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
                  <h3>Sessions ({editingTimer.sessions.length})</h3>
                  <button className="add-session-btn" onClick={addSession}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Ajouter
                  </button>
                </div>

                <div className="sessions-list">
                  {editingTimer.sessions.map((session, index) => (
                    <div key={index} className="session-item">
                      <div
                        className="session-color-indicator"
                        style={{ backgroundColor: session.couleur }}
                      />
                      <input
                        type="text"
                        className="session-name"
                        value={session.nom_session}
                        onChange={(e) => updateSession(index, 'nom_session', e.target.value)}
                        placeholder="Nom de la session"
                      />
                      <div className="session-duration">
                        <input
                          type="text"
                          value={formatDuration(session.duree_secondes)}
                          onChange={(e) => updateSession(index, 'duree_secondes', parseDuration(e.target.value))}
                          placeholder="5:00"
                        />
                      </div>
                      <input
                        type="color"
                        className="session-color-picker"
                        value={session.couleur}
                        onChange={(e) => updateSession(index, 'couleur', e.target.value)}
                        title="Choisir la couleur"
                      />
                      <button
                        className="session-action duplicate"
                        onClick={() => duplicateSession(index)}
                        title="Dupliquer"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                      </button>
                      <button
                        className="session-action delete"
                        onClick={() => removeSession(index)}
                        title="Supprimer"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ))}

                  {editingTimer.sessions.length === 0 && (
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
