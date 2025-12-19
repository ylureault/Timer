import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import '../styles/AdminPanel.css';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const ADMIN_PASSWORD = 'Normandie2026!';

export default function AdminPanel() {
  const { user, authFetch, isAuthenticated, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => {
    return sessionStorage.getItem('admin_unlocked') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [activeTab, setActiveTab] = useState('stats');
  const [testimonials, setTestimonials] = useState([
    { id: 1, name: 'Marie D.', company: 'TechCorp', text: 'Insuffle Timer a transformé nos réunions !', rating: 5, visible: true },
    { id: 2, name: 'Pierre L.', company: 'StartupXYZ', text: 'Simple, efficace, indispensable.', rating: 5, visible: true },
    { id: 3, name: 'Sophie M.', company: 'Agence Web', text: 'Nos clients adorent les présentations avec timer.', rating: 4, visible: false }
  ]);
  const [brevoConfig, setBrevoConfig] = useState({
    apiKey: '',
    listId: '',
    welcomeTemplate: '',
    enabled: false
  });
  const [blogPosts, setBlogPosts] = useState([
    { id: 1, title: 'Comment optimiser vos réunions', slug: 'optimiser-reunions', status: 'published', date: '2024-01-15' },
    { id: 2, title: '10 techniques de productivité', slug: '10-techniques-productivite', status: 'draft', date: '2024-01-20' }
  ]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [newBlogPost, setNewBlogPost] = useState({ title: '', slug: '', content: '', status: 'draft' });
  const [showBlogEditor, setShowBlogEditor] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const navigate = useNavigate();

  // Password verification
  const verifyPassword = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminUnlocked(true);
      sessionStorage.setItem('admin_unlocked', 'true');
      setPasswordError('');
    } else {
      setPasswordError('Mot de passe incorrect');
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
  };

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/admin/stats`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Erreur lors du chargement des statistiques');
    }
  }, [authFetch]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/admin/users`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const fetchFeedbacks = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/admin/feedbacks`);
      const data = await res.json();
      if (data.success) {
        setFeedbacks(data.feedbacks);
      }
    } catch (err) {
      // Fallback to localStorage feedbacks
      const savedFeedbacks = localStorage.getItem('user_feedbacks');
      if (savedFeedbacks) {
        setFeedbacks(JSON.parse(savedFeedbacks));
      }
    }
  }, [authFetch]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    } else if (isAuthenticated && isAdminUnlocked) {
      fetchStats();
      fetchUsers();
      fetchFeedbacks();
      // Load blog posts from localStorage
      const savedPosts = localStorage.getItem('admin_blog_posts');
      if (savedPosts) {
        setBlogPosts(JSON.parse(savedPosts));
      }
    } else if (isAuthenticated && !isAdminUnlocked) {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, isAdminUnlocked, navigate, fetchStats, fetchUsers, fetchFeedbacks]);

  // Toggle testimonial visibility
  const toggleTestimonialVisibility = (id) => {
    setTestimonials(prev => prev.map(t =>
      t.id === id ? { ...t, visible: !t.visible } : t
    ));
  };

  // Delete testimonial
  const deleteTestimonial = (id) => {
    setTestimonials(prev => prev.filter(t => t.id !== id));
  };

  // Save Brevo config
  const saveBrevoConfig = () => {
    localStorage.setItem('brevo_config', JSON.stringify(brevoConfig));
    alert('Configuration Brevo sauvegardée !');
  };

  // Blog functions
  const saveBlogPost = () => {
    if (!newBlogPost.title.trim()) return;

    const slug = newBlogPost.slug || newBlogPost.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const post = {
      id: editingPost?.id || Date.now(),
      ...newBlogPost,
      slug,
      date: editingPost?.date || new Date().toISOString().split('T')[0]
    };

    let updatedPosts;
    if (editingPost) {
      updatedPosts = blogPosts.map(p => p.id === editingPost.id ? post : p);
    } else {
      updatedPosts = [post, ...blogPosts];
    }

    setBlogPosts(updatedPosts);
    localStorage.setItem('admin_blog_posts', JSON.stringify(updatedPosts));
    localStorage.setItem('blog_posts', JSON.stringify(updatedPosts.filter(p => p.status === 'published')));

    setNewBlogPost({ title: '', slug: '', content: '', status: 'draft' });
    setShowBlogEditor(false);
    setEditingPost(null);
    alert(editingPost ? 'Article mis à jour !' : 'Article créé !');
  };

  const editBlogPost = (post) => {
    setEditingPost(post);
    setNewBlogPost({
      title: post.title,
      slug: post.slug,
      content: post.content || '',
      status: post.status
    });
    setShowBlogEditor(true);
  };

  const deleteBlogPost = (id) => {
    if (!confirm('Supprimer cet article ?')) return;
    const updatedPosts = blogPosts.filter(p => p.id !== id);
    setBlogPosts(updatedPosts);
    localStorage.setItem('admin_blog_posts', JSON.stringify(updatedPosts));
    localStorage.setItem('blog_posts', JSON.stringify(updatedPosts.filter(p => p.status === 'published')));
  };

  const togglePostStatus = (id) => {
    const updatedPosts = blogPosts.map(p =>
      p.id === id ? { ...p, status: p.status === 'published' ? 'draft' : 'published' } : p
    );
    setBlogPosts(updatedPosts);
    localStorage.setItem('admin_blog_posts', JSON.stringify(updatedPosts));
    localStorage.setItem('blog_posts', JSON.stringify(updatedPosts.filter(p => p.status === 'published')));
  };

  // Delete feedback
  const deleteFeedback = (id) => {
    const updatedFeedbacks = feedbacks.filter(f => f.id !== id);
    setFeedbacks(updatedFeedbacks);
    localStorage.setItem('user_feedbacks', JSON.stringify(updatedFeedbacks));
  };

  if (authLoading || loading) {
    return (
      <div className="admin-loading">
        <div className="loader"></div>
        <p>Chargement...</p>
      </div>
    );
  }

  // Password gate
  if (!isAdminUnlocked) {
    return (
      <div className="admin-password-gate">
        <motion.div
          className="password-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="lock-icon">🔐</div>
          <h1>Admin Panel</h1>
          <p>Entrez le mot de passe administrateur</p>
          <div className="password-form">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && verifyPassword()}
              placeholder="Mot de passe"
              autoFocus
            />
            {passwordError && <span className="password-error">{passwordError}</span>}
            <button onClick={verifyPassword}>Accéder</button>
          </div>
          <Link to="/dashboard" className="back-to-dashboard">
            Retour au Dashboard
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      {/* Header */}
      <header className="admin-header">
        <div className="header-left">
          <Link to="/dashboard" className="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Retour
          </Link>
        </div>
        <h1>Admin Panel</h1>
        <div className="header-right">
          <span className="admin-badge">Admin</span>
        </div>
      </header>

      {/* Tabs */}
      <div className="admin-tabs">
        <button className={`tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
          📊 Statistiques
        </button>
        <button className={`tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          👥 Utilisateurs
        </button>
        <button className={`tab ${activeTab === 'testimonials' ? 'active' : ''}`} onClick={() => setActiveTab('testimonials')}>
          💬 Témoignages
        </button>
        <button className={`tab ${activeTab === 'brevo' ? 'active' : ''}`} onClick={() => setActiveTab('brevo')}>
          📧 Brevo
        </button>
        <button className={`tab ${activeTab === 'blog' ? 'active' : ''}`} onClick={() => setActiveTab('blog')}>
          📝 Blog
        </button>
        <button className={`tab ${activeTab === 'feedback' ? 'active' : ''}`} onClick={() => setActiveTab('feedback')}>
          📣 Feedbacks
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="admin-error">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="stats-grid">
              <motion.div className="stat-card users" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div className="stat-value">{stats?.totalUsers || 0}</div>
                <div className="stat-label">Utilisateurs</div>
              </motion.div>

              <motion.div className="stat-card timers" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12,6 12,12 16,14"/>
                  </svg>
                </div>
                <div className="stat-value">{stats?.totalTimers || 0}</div>
                <div className="stat-label">Timers créés</div>
              </motion.div>

              <motion.div className="stat-card sessions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <div className="stat-value">{stats?.totalSessions || 0}</div>
                <div className="stat-label">Sessions totales</div>
              </motion.div>

              <motion.div className="stat-card active" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                </div>
                <div className="stat-value">{stats?.activeTimers || 0}</div>
                <div className="stat-label">Timers actifs aujourd'hui</div>
              </motion.div>
            </div>

            {/* Quick actions */}
            <div className="quick-actions">
              <h2>Actions rapides</h2>
              <div className="actions-grid">
                <button className="action-card" onClick={() => navigate('/dashboard')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                  </svg>
                  <span>Dashboard</span>
                </button>
                <button className="action-card" onClick={() => window.location.reload()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/>
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                  </svg>
                  <span>Rafraîchir</span>
                </button>
                <button className="action-card" onClick={() => navigate('/marketplace')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                  </svg>
                  <span>Marketplace</span>
                </button>
                <button className="action-card" onClick={() => navigate('/embed')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                  </svg>
                  <span>Embed</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div
            key="users"
            className="users-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h2>Utilisateurs ({users.length})</h2>
            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Email</th>
                    <th>Timers</th>
                    <th>Inscrit le</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">{u.username?.charAt(0).toUpperCase()}</div>
                          <span>{u.username}</span>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td><span className="timer-badge">{u.timer_count || 0} / 5</span></td>
                      <td>{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan="4" className="no-data">Aucun utilisateur</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Testimonials Tab */}
        {activeTab === 'testimonials' && (
          <motion.div
            key="testimonials"
            className="testimonials-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="section-header-admin">
              <h2>Témoignages</h2>
              <button className="add-btn">+ Ajouter</button>
            </div>
            <div className="testimonials-list">
              {testimonials.map((t) => (
                <div key={t.id} className={`testimonial-item ${t.visible ? 'visible' : 'hidden'}`}>
                  <div className="testimonial-content">
                    <div className="testimonial-header">
                      <strong>{t.name}</strong>
                      <span className="company">{t.company}</span>
                      <div className="rating">{'⭐'.repeat(t.rating)}</div>
                    </div>
                    <p>"{t.text}"</p>
                  </div>
                  <div className="testimonial-actions">
                    <button className={`visibility-btn ${t.visible ? 'visible' : ''}`} onClick={() => toggleTestimonialVisibility(t.id)}>
                      {t.visible ? '👁️ Visible' : '👁️‍🗨️ Masqué'}
                    </button>
                    <button className="edit-btn">✏️</button>
                    <button className="delete-btn" onClick={() => deleteTestimonial(t.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Brevo Tab */}
        {activeTab === 'brevo' && (
          <motion.div
            key="brevo"
            className="brevo-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h2>Configuration Brevo (Email Marketing)</h2>
            <div className="brevo-form">
              <div className="form-group">
                <label>Clé API Brevo</label>
                <input
                  type="password"
                  value={brevoConfig.apiKey}
                  onChange={(e) => setBrevoConfig({ ...brevoConfig, apiKey: e.target.value })}
                  placeholder="xkeysib-..."
                />
              </div>
              <div className="form-group">
                <label>ID de la liste de contacts</label>
                <input
                  type="text"
                  value={brevoConfig.listId}
                  onChange={(e) => setBrevoConfig({ ...brevoConfig, listId: e.target.value })}
                  placeholder="Ex: 2"
                />
              </div>
              <div className="form-group">
                <label>ID du template email de bienvenue</label>
                <input
                  type="text"
                  value={brevoConfig.welcomeTemplate}
                  onChange={(e) => setBrevoConfig({ ...brevoConfig, welcomeTemplate: e.target.value })}
                  placeholder="Ex: 1"
                />
              </div>
              <div className="form-group toggle-group">
                <label>Activer l'intégration Brevo</label>
                <button
                  className={`toggle-btn ${brevoConfig.enabled ? 'active' : ''}`}
                  onClick={() => setBrevoConfig({ ...brevoConfig, enabled: !brevoConfig.enabled })}
                >
                  {brevoConfig.enabled ? 'Activé' : 'Désactivé'}
                </button>
              </div>
              <button className="save-btn" onClick={saveBrevoConfig}>
                💾 Sauvegarder la configuration
              </button>
            </div>
            <div className="brevo-info">
              <h3>Comment configurer Brevo ?</h3>
              <ol>
                <li>Créez un compte sur <a href="https://brevo.com" target="_blank" rel="noopener noreferrer">brevo.com</a></li>
                <li>Allez dans SMTP & API {'->'} API Keys</li>
                <li>Créez une nouvelle clé API</li>
                <li>Créez une liste de contacts pour les inscriptions</li>
                <li>Créez un template d'email de bienvenue</li>
              </ol>
            </div>
          </motion.div>
        )}

        {/* Blog Tab */}
        {activeTab === 'blog' && (
          <motion.div
            key="blog"
            className="blog-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="section-header-admin">
              <h2>Articles de Blog</h2>
              <button className="add-btn" onClick={() => { setShowBlogEditor(true); setEditingPost(null); setNewBlogPost({ title: '', slug: '', content: '', status: 'draft' }); }}>
                + Nouvel article
              </button>
            </div>

            {/* Blog Editor Modal */}
            {showBlogEditor && (
              <div className="modal-overlay" onClick={() => setShowBlogEditor(false)}>
                <div className="blog-editor-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>{editingPost ? 'Modifier l\'article' : 'Nouvel article'}</h3>
                    <button className="close-btn" onClick={() => setShowBlogEditor(false)}>×</button>
                  </div>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Titre</label>
                      <input
                        type="text"
                        value={newBlogPost.title}
                        onChange={(e) => setNewBlogPost({ ...newBlogPost, title: e.target.value })}
                        placeholder="Titre de l'article"
                      />
                    </div>
                    <div className="form-group">
                      <label>Slug (URL)</label>
                      <input
                        type="text"
                        value={newBlogPost.slug}
                        onChange={(e) => setNewBlogPost({ ...newBlogPost, slug: e.target.value })}
                        placeholder="mon-article (généré automatiquement si vide)"
                      />
                    </div>
                    <div className="form-group">
                      <label>Contenu (Markdown)</label>
                      <textarea
                        value={newBlogPost.content}
                        onChange={(e) => setNewBlogPost({ ...newBlogPost, content: e.target.value })}
                        placeholder="# Titre&#10;&#10;Votre contenu ici..."
                        rows={15}
                      />
                    </div>
                    <div className="form-group">
                      <label>Statut</label>
                      <select
                        value={newBlogPost.status}
                        onChange={(e) => setNewBlogPost({ ...newBlogPost, status: e.target.value })}
                      >
                        <option value="draft">Brouillon</option>
                        <option value="published">Publié</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button className="cancel-btn" onClick={() => setShowBlogEditor(false)}>Annuler</button>
                    <button className="save-btn" onClick={saveBlogPost}>
                      {editingPost ? 'Mettre à jour' : 'Créer l\'article'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="blog-list">
              {blogPosts.map((post) => (
                <div key={post.id} className={`blog-item ${post.status}`}>
                  <div className="blog-content">
                    <h3>{post.title}</h3>
                    <div className="blog-meta">
                      <span className="slug">/{post.slug}</span>
                      <span className="date">{new Date(post.date).toLocaleDateString('fr-FR')}</span>
                      <span className={`status-badge ${post.status}`}>
                        {post.status === 'published' ? '🟢 Publié' : '🟡 Brouillon'}
                      </span>
                    </div>
                  </div>
                  <div className="blog-actions">
                    <button className="edit-btn" onClick={() => editBlogPost(post)}>✏️ Modifier</button>
                    <button className="visibility-btn" onClick={() => togglePostStatus(post.id)}>
                      {post.status === 'published' ? '📤 Dépublier' : '📥 Publier'}
                    </button>
                    <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="preview-btn">👁️ Voir</a>
                    <button className="delete-btn" onClick={() => deleteBlogPost(post.id)}>🗑️</button>
                  </div>
                </div>
              ))}
              {blogPosts.length === 0 && (
                <p className="no-data">Aucun article. Cliquez sur "Nouvel article" pour en créer un.</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Feedback Tab */}
        {activeTab === 'feedback' && (
          <motion.div
            key="feedback"
            className="feedback-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="section-header-admin">
              <h2>Feedbacks ({feedbacks.length})</h2>
            </div>
            <div className="feedback-list">
              {feedbacks.map((feedback) => (
                <div key={feedback.id} className="feedback-item">
                  <div className="feedback-header">
                    <div className="feedback-user">
                      <span className="user-avatar">{(feedback.user_name || feedback.email || 'A').charAt(0).toUpperCase()}</span>
                      <div className="user-info">
                        <strong>{feedback.user_name || 'Anonyme'}</strong>
                        <span>{feedback.email || 'Pas d\'email'}</span>
                      </div>
                    </div>
                    <span className="feedback-date">
                      {new Date(feedback.created_at || feedback.date).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="feedback-content">
                    <span className={`feedback-type ${feedback.type || 'suggestion'}`}>
                      {feedback.type === 'bug' ? '🐛 Bug' : feedback.type === 'feature' ? '💡 Feature' : '💬 Suggestion'}
                    </span>
                    <p>{feedback.message || feedback.content}</p>
                  </div>
                  <div className="feedback-actions">
                    <button className="delete-btn" onClick={() => deleteFeedback(feedback.id)}>🗑️ Supprimer</button>
                  </div>
                </div>
              ))}
              {feedbacks.length === 0 && (
                <div className="no-feedbacks">
                  <p>Aucun feedback pour le moment</p>
                  <span>Les feedbacks soumis par les utilisateurs apparaîtront ici</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="admin-footer">
        Propulsé par <a href="https://insuffle.com" target="_blank" rel="noopener noreferrer">Insuffle</a>
      </footer>
    </div>
  );
}
