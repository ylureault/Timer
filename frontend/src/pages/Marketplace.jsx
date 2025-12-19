import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { SESSION_TEMPLATES, importSalonConfig, exportSalonConfig } from '../utils/features'
import '../styles/Marketplace.css'

// Visual themes for timer display
export const VISUAL_THEMES = {
  cinematic: {
    id: 'cinematic',
    name: 'Cinématique',
    description: 'Thème sombre et élégant avec des effets de lumière',
    preview: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    colors: {
      background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      text: '#ffffff',
      accent: '#6C5CE7',
      secondary: '#4ECDC4'
    },
    effects: ['particles', 'glow', 'pulse']
  },
  neon: {
    id: 'neon',
    name: 'Néon Cyberpunk',
    description: 'Style futuriste avec des couleurs néon vibrantes',
    preview: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 100%)',
    colors: {
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 100%)',
      text: '#00ffff',
      accent: '#ff00ff',
      secondary: '#00ff00'
    },
    effects: ['neonGlow', 'scanlines', 'flicker']
  },
  minimal: {
    id: 'minimal',
    name: 'Minimaliste',
    description: 'Design épuré et moderne, focus sur l\'essentiel',
    preview: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
    colors: {
      background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
      text: '#1e293b',
      accent: '#6366f1',
      secondary: '#10b981'
    },
    effects: []
  },
  nature: {
    id: 'nature',
    name: 'Nature Zen',
    description: 'Ambiance relaxante inspirée de la nature',
    preview: 'linear-gradient(135deg, #134e4a 0%, #065f46 50%, #064e3b 100%)',
    colors: {
      background: 'linear-gradient(135deg, #134e4a 0%, #065f46 50%, #064e3b 100%)',
      text: '#ecfdf5',
      accent: '#34d399',
      secondary: '#fbbf24'
    },
    effects: ['leaves', 'ambient']
  },
  sunset: {
    id: 'sunset',
    name: 'Coucher de Soleil',
    description: 'Dégradés chauds et atmosphère apaisante',
    preview: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #831843 100%)',
    colors: {
      background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #831843 100%)',
      text: '#fef3c7',
      accent: '#f59e0b',
      secondary: '#ec4899'
    },
    effects: ['gradient', 'stars']
  },
  ocean: {
    id: 'ocean',
    name: 'Océan Profond',
    description: 'Bleus profonds et mouvements fluides',
    preview: 'linear-gradient(180deg, #0c4a6e 0%, #075985 50%, #0369a1 100%)',
    colors: {
      background: 'linear-gradient(180deg, #0c4a6e 0%, #075985 50%, #0369a1 100%)',
      text: '#e0f2fe',
      accent: '#38bdf8',
      secondary: '#06b6d4'
    },
    effects: ['waves', 'bubbles']
  },
  fire: {
    id: 'fire',
    name: 'Feu Intense',
    description: 'Énergie brûlante pour sessions dynamiques',
    preview: 'linear-gradient(180deg, #1a0a0a 0%, #450a0a 50%, #7f1d1d 100%)',
    colors: {
      background: 'linear-gradient(180deg, #1a0a0a 0%, #450a0a 50%, #7f1d1d 100%)',
      text: '#fef2f2',
      accent: '#ef4444',
      secondary: '#f97316'
    },
    effects: ['flames', 'embers']
  },
  corporate: {
    id: 'corporate',
    name: 'Professionnel',
    description: 'Style business élégant pour présentations',
    preview: 'linear-gradient(180deg, #1e293b 0%, #334155 100%)',
    colors: {
      background: 'linear-gradient(180deg, #1e293b 0%, #334155 100%)',
      text: '#f1f5f9',
      accent: '#3b82f6',
      secondary: '#8b5cf6'
    },
    effects: ['subtle']
  }
}

// Plugin definitions
const PLUGINS = [
  {
    id: 'sounds',
    name: 'Sons & Alertes',
    description: 'Notifications sonores personnalisables pour les transitions',
    icon: '🔔',
    installed: true,
    category: 'audio'
  },
  {
    id: 'keyboard',
    name: 'Raccourcis Clavier',
    description: 'Contrôlez le timer avec des raccourcis clavier',
    icon: '⌨️',
    installed: true,
    category: 'control'
  },
  {
    id: 'export',
    name: 'Export Avancé',
    description: 'Exportez vos configurations en JSON, PDF ou CSV',
    icon: '📥',
    installed: true,
    category: 'utility'
  },
  {
    id: 'analytics',
    name: 'Statistiques de Session',
    description: 'Visualisez le temps passé sur chaque session',
    icon: '📊',
    installed: false,
    category: 'analytics',
    premium: false
  },
  {
    id: 'slack',
    name: 'Intégration Slack',
    description: 'Envoyez des notifications dans vos channels Slack',
    icon: '💬',
    installed: false,
    category: 'integration',
    premium: true
  },
  {
    id: 'teams',
    name: 'Intégration Teams',
    description: 'Synchronisez avec Microsoft Teams',
    icon: '👥',
    installed: false,
    category: 'integration',
    premium: true
  },
  {
    id: 'music',
    name: 'Musique d\'Ambiance',
    description: 'Ajoutez de la musique de fond pendant les sessions',
    icon: '🎵',
    installed: false,
    category: 'audio',
    premium: false
  },
  {
    id: 'countdown',
    name: 'Compte à Rebours',
    description: 'Affichage 3-2-1 avant chaque session',
    icon: '⏳',
    installed: true,
    category: 'display'
  },
  {
    id: 'confetti',
    name: 'Célébration',
    description: 'Confettis et animations de fin de session',
    icon: '🎉',
    installed: true,
    category: 'display'
  },
  {
    id: 'notes',
    name: 'Notes de Session',
    description: 'Ajoutez des notes à chaque session du timer',
    icon: '📝',
    installed: false,
    category: 'utility',
    premium: false
  },
  {
    id: 'participants',
    name: 'Liste des Participants',
    description: 'Affichez les participants connectés en temps réel',
    icon: '👤',
    installed: false,
    category: 'collaboration',
    premium: false
  },
  {
    id: 'reactions',
    name: 'Réactions en Direct',
    description: 'Permettez aux participants d\'envoyer des réactions',
    icon: '❤️',
    installed: false,
    category: 'collaboration',
    premium: true
  }
]

function Marketplace() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [activeTab, setActiveTab] = useState('templates')
  const [selectedTheme, setSelectedTheme] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [plugins, setPlugins] = useState(PLUGINS)
  const [filterCategory, setFilterCategory] = useState('all')
  const [importedConfig, setImportedConfig] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  const handleInstallPlugin = (pluginId) => {
    setPlugins(plugins.map(p =>
      p.id === pluginId ? { ...p, installed: !p.installed } : p
    ))
  }

  const handleApplyTheme = (themeId) => {
    localStorage.setItem('timer_visual_theme', themeId)
    setSelectedTheme(themeId)
    // Show success feedback
  }

  const handleImportConfig = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const config = await importSalonConfig(file)
      setImportedConfig(config)
      setShowPreview(true)
    } catch (error) {
      console.error('Import error:', error)
      alert('Erreur lors de l\'import du fichier')
    }
  }

  const handleUseTemplate = (templateKey) => {
    const template = SESSION_TEMPLATES[templateKey]
    if (template && user) {
      // Store template in localStorage for use in Dashboard
      localStorage.setItem('pending_template', JSON.stringify({
        key: templateKey,
        ...template
      }))
      navigate('/dashboard?template=' + templateKey)
    } else if (!user) {
      navigate('/auth?redirect=/marketplace')
    }
  }

  const handleUseImportedConfig = () => {
    if (importedConfig && user) {
      localStorage.setItem('pending_import', JSON.stringify(importedConfig))
      navigate('/dashboard?import=true')
    } else if (!user) {
      navigate('/auth?redirect=/marketplace')
    }
  }

  const categories = [
    { id: 'all', name: 'Tous', icon: '📦' },
    { id: 'audio', name: 'Audio', icon: '🔊' },
    { id: 'display', name: 'Affichage', icon: '🖥️' },
    { id: 'control', name: 'Contrôle', icon: '🎮' },
    { id: 'integration', name: 'Intégrations', icon: '🔗' },
    { id: 'utility', name: 'Utilitaires', icon: '🛠️' },
    { id: 'collaboration', name: 'Collaboration', icon: '👥' }
  ]

  const filteredPlugins = filterCategory === 'all'
    ? plugins
    : plugins.filter(p => p.category === filterCategory)

  return (
    <div className="marketplace-page">
      {/* Header */}
      <header className="marketplace-header">
        <div className="header-left">
          <Link to="/" className="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="logo">
            <span className="logo-icon">🛒</span>
            <span>Marketplace</span>
          </div>
        </div>
        <div className="header-right">
          {user ? (
            <Link to="/dashboard" className="dashboard-link">
              Mon Dashboard
            </Link>
          ) : (
            <Link to="/auth" className="auth-link">
              Connexion
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="marketplace-hero">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hero-content"
        >
          <h1>Personnalisez votre Timer</h1>
          <p>Thèmes visuels, templates et plugins pour créer l'expérience parfaite</p>
        </motion.div>
      </section>

      {/* Tabs */}
      <nav className="marketplace-tabs">
        <button
          className={`tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <span className="tab-icon">📋</span>
          Templates
        </button>
        <button
          className={`tab ${activeTab === 'themes' ? 'active' : ''}`}
          onClick={() => setActiveTab('themes')}
        >
          <span className="tab-icon">🎨</span>
          Thèmes Visuels
        </button>
        <button
          className={`tab ${activeTab === 'plugins' ? 'active' : ''}`}
          onClick={() => setActiveTab('plugins')}
        >
          <span className="tab-icon">🔌</span>
          Plugins
        </button>
        <button
          className={`tab ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          <span className="tab-icon">📥</span>
          Import/Export
        </button>
      </nav>

      {/* Content */}
      <main className="marketplace-content">
        <AnimatePresence mode="wait">
          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <motion.section
              key="templates"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="templates-section"
            >
              <div className="section-header">
                <h2>Templates de Sessions</h2>
                <p>Configurations prêtes à l'emploi pour vos ateliers</p>
              </div>

              <div className="templates-grid">
                {Object.entries(SESSION_TEMPLATES).map(([key, template]) => (
                  <motion.div
                    key={key}
                    className="template-card"
                    whileHover={{ y: -4, scale: 1.02 }}
                    onClick={() => setSelectedTemplate(selectedTemplate === key ? null : key)}
                  >
                    <div className="template-header">
                      <div className="template-icon">
                        {key === 'daily' && '📅'}
                        {key === 'designThinking' && '💡'}
                        {key === 'presentation' && '📊'}
                        {key === 'formation' && '🎓'}
                        {key === 'pomodoro' && '🍅'}
                      </div>
                      <h3>{template.name}</h3>
                    </div>

                    <div className="template-sessions">
                      {template.sessions.slice(0, 4).map((session, idx) => (
                        <div
                          key={idx}
                          className="mini-session"
                          style={{ backgroundColor: session.couleur + '20', borderColor: session.couleur }}
                        >
                          <span className="session-dot" style={{ backgroundColor: session.couleur }}></span>
                          <span className="session-name">{session.nom_session}</span>
                          <span className="session-time">{session.duree_minutes}m</span>
                        </div>
                      ))}
                      {template.sessions.length > 4 && (
                        <div className="more-sessions">
                          +{template.sessions.length - 4} sessions
                        </div>
                      )}
                    </div>

                    <div className="template-meta">
                      <span>{template.sessions.length} sessions</span>
                      <span>
                        {template.sessions.reduce((acc, s) => acc + s.duree_minutes, 0)} min total
                      </span>
                    </div>

                    <AnimatePresence>
                      {selectedTemplate === key && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="template-actions"
                        >
                          <button
                            className="btn btn-primary"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUseTemplate(key)
                            }}
                          >
                            Utiliser ce template
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Themes Tab */}
          {activeTab === 'themes' && (
            <motion.section
              key="themes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="themes-section"
            >
              <div className="section-header">
                <h2>Thèmes Visuels</h2>
                <p>Personnalisez l'apparence de votre écran de timer</p>
              </div>

              <div className="themes-grid">
                {Object.entries(VISUAL_THEMES).map(([key, theme]) => (
                  <motion.div
                    key={key}
                    className={`theme-card ${selectedTheme === key ? 'selected' : ''}`}
                    whileHover={{ y: -4, scale: 1.02 }}
                  >
                    <div
                      className="theme-preview"
                      style={{ background: theme.preview }}
                    >
                      <div className="preview-timer">
                        <svg viewBox="0 0 100 100" className="preview-circle">
                          <circle
                            cx="50" cy="50" r="45"
                            fill="none"
                            stroke={theme.colors.accent + '30'}
                            strokeWidth="6"
                          />
                          <circle
                            cx="50" cy="50" r="45"
                            fill="none"
                            stroke={theme.colors.accent}
                            strokeWidth="6"
                            strokeDasharray="70 283"
                            strokeLinecap="round"
                            transform="rotate(-90 50 50)"
                          />
                        </svg>
                        <span className="preview-time" style={{ color: theme.colors.text }}>
                          12:34
                        </span>
                      </div>
                    </div>

                    <div className="theme-info">
                      <h3>{theme.name}</h3>
                      <p>{theme.description}</p>

                      <div className="theme-colors">
                        <span
                          className="color-dot"
                          style={{ backgroundColor: theme.colors.accent }}
                          title="Couleur principale"
                        ></span>
                        <span
                          className="color-dot"
                          style={{ backgroundColor: theme.colors.secondary }}
                          title="Couleur secondaire"
                        ></span>
                        <span
                          className="color-dot"
                          style={{ backgroundColor: theme.colors.text }}
                          title="Couleur texte"
                        ></span>
                      </div>

                      {theme.effects.length > 0 && (
                        <div className="theme-effects">
                          {theme.effects.map(effect => (
                            <span key={effect} className="effect-tag">
                              {effect}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      className={`btn ${selectedTheme === key ? 'btn-success' : 'btn-primary'}`}
                      onClick={() => handleApplyTheme(key)}
                    >
                      {selectedTheme === key ? '✓ Actif' : 'Appliquer'}
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Plugins Tab */}
          {activeTab === 'plugins' && (
            <motion.section
              key="plugins"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="plugins-section"
            >
              <div className="section-header">
                <h2>Plugins & Extensions</h2>
                <p>Étendez les fonctionnalités de votre timer</p>
              </div>

              <div className="plugin-categories">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    className={`category-btn ${filterCategory === cat.id ? 'active' : ''}`}
                    onClick={() => setFilterCategory(cat.id)}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>

              <div className="plugins-grid">
                {filteredPlugins.map((plugin) => (
                  <motion.div
                    key={plugin.id}
                    className={`plugin-card ${plugin.installed ? 'installed' : ''} ${plugin.premium ? 'premium' : ''}`}
                    whileHover={{ y: -2 }}
                  >
                    <div className="plugin-icon">{plugin.icon}</div>
                    <div className="plugin-info">
                      <h3>
                        {plugin.name}
                        {plugin.premium && <span className="premium-badge">PRO</span>}
                      </h3>
                      <p>{plugin.description}</p>
                    </div>
                    <button
                      className={`plugin-toggle ${plugin.installed ? 'active' : ''}`}
                      onClick={() => !plugin.premium && handleInstallPlugin(plugin.id)}
                      disabled={plugin.premium}
                    >
                      {plugin.premium ? 'Bientôt' : plugin.installed ? 'Désactiver' : 'Activer'}
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Import/Export Tab */}
          {activeTab === 'import' && (
            <motion.section
              key="import"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="import-section"
            >
              <div className="section-header">
                <h2>Import / Export</h2>
                <p>Partagez et sauvegardez vos configurations de timer</p>
              </div>

              <div className="import-export-grid">
                {/* Import Card */}
                <div className="ie-card import-card">
                  <div className="ie-icon">📥</div>
                  <h3>Importer un Timer</h3>
                  <p>Chargez une configuration de timer depuis un fichier JSON</p>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    onChange={handleImportConfig}
                    style={{ display: 'none' }}
                  />

                  <button
                    className="btn btn-primary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choisir un fichier
                  </button>

                  <div className="ie-format">
                    <span>Format supporté:</span>
                    <code>.json</code>
                  </div>
                </div>

                {/* Export Card */}
                <div className="ie-card export-card">
                  <div className="ie-icon">📤</div>
                  <h3>Exporter un Timer</h3>
                  <p>Téléchargez votre configuration pour la partager ou la sauvegarder</p>

                  <Link to="/dashboard" className="btn btn-outline">
                    Voir mes Timers
                  </Link>

                  <div className="ie-info">
                    <p>L'export se fait depuis le Dashboard sur chaque timer individuel</p>
                  </div>
                </div>

                {/* Community Templates */}
                <div className="ie-card community-card">
                  <div className="ie-icon">🌍</div>
                  <h3>Templates Communautaires</h3>
                  <p>Découvrez des configurations partagées par la communauté</p>

                  <div className="community-templates">
                    <div className="community-item">
                      <span className="item-icon">🎯</span>
                      <div className="item-info">
                        <strong>Sprint Planning</strong>
                        <span>Par @scrum_master</span>
                      </div>
                      <button className="btn-small">Utiliser</button>
                    </div>
                    <div className="community-item">
                      <span className="item-icon">🧘</span>
                      <div className="item-info">
                        <strong>Méditation Guidée</strong>
                        <span>Par @wellness_coach</span>
                      </div>
                      <button className="btn-small">Utiliser</button>
                    </div>
                    <div className="community-item">
                      <span className="item-icon">📚</span>
                      <div className="item-info">
                        <strong>Session d'Étude</strong>
                        <span>Par @student_life</span>
                      </div>
                      <button className="btn-small">Utiliser</button>
                    </div>
                  </div>

                  <button className="btn btn-outline see-more">
                    Voir plus de templates
                  </button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Import Preview Modal */}
      <AnimatePresence>
        {showPreview && importedConfig && (
          <motion.div
            className="preview-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              className="preview-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Aperçu de l'import</h2>
                <button className="close-btn" onClick={() => setShowPreview(false)}>×</button>
              </div>

              <div className="modal-body">
                <div className="import-info">
                  <h3>{importedConfig.name || 'Timer importé'}</h3>
                  <p>{importedConfig.sessions?.length || 0} sessions</p>
                </div>

                <div className="import-sessions">
                  {importedConfig.sessions?.map((session, idx) => (
                    <div key={idx} className="import-session-item">
                      <span
                        className="session-color"
                        style={{ backgroundColor: session.couleur }}
                      ></span>
                      <span className="session-name">{session.nom_session}</span>
                      <span className="session-duration">{session.duree_minutes}min</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline"
                  onClick={() => setShowPreview(false)}
                >
                  Annuler
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleUseImportedConfig}
                >
                  Utiliser cette configuration
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="marketplace-footer">
        <p>
          Créé avec ❤️ par <a href="https://insuffle.com" target="_blank" rel="noopener noreferrer">Insuffle</a>
        </p>
      </footer>
    </div>
  )
}

export default Marketplace
