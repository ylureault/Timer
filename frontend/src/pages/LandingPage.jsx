import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { THEMES, applyTheme, getHistory } from '../utils/features'
import '../styles/LandingPage.css'

function LandingPage() {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  const [demoTime, setDemoTime] = useState(1800) // 30 minutes
  const [demoRunning, setDemoRunning] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('selected_theme') || 'light')
  const [history, setHistory] = useState([])

  // Demo timer
  useEffect(() => {
    if (demoRunning && demoTime > 0) {
      const interval = setInterval(() => {
        setDemoTime(prev => Math.max(0, prev - 1))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [demoRunning, demoTime])

  // Load theme and history on mount
  useEffect(() => {
    applyTheme(currentTheme)
    setHistory(getHistory())
  }, [])

  const handleThemeChange = (themeName) => {
    setCurrentTheme(themeName)
    applyTheme(themeName)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleCreateSalon = () => {
    navigate('/create')
  }

  const handleJoinSalon = () => {
    if (joinCode.trim().length === 4) {
      navigate(`/salon/${joinCode}`)
    }
  }

  const progress = ((1800 - demoTime) / 1800) * 100

  return (
    <div className="landing-page-modern">
      {/* HERO SECTION */}
      <section className="hero-modern">
        <div className="hero-bg">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>

        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="hero-content-modern"
          >
            <motion.div
              className="badge-hero"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              ⏱️ Timer Salon • Nouvelle génération
            </motion.div>

            <h1 className="hero-title-modern">
              Orchestrez le temps de vos{' '}
              <span className="gradient-text">ateliers</span>
            </h1>

            <p className="hero-subtitle-modern">
              Créez des séquences temporelles partagées, contrôlées à distance.
              <br />
              Simple, visuel, et terriblement efficace.
            </p>

            <motion.div
              className="hero-actions-modern"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <button className="btn btn-primary btn-xl" onClick={handleCreateSalon}>
                <span>Créer un salon</span>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <div className="join-input-modern glass">
                <input
                  type="text"
                  placeholder="Code 4 chiffres"
                  maxLength="4"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinSalon()}
                />
                <button onClick={handleJoinSalon} disabled={joinCode.length !== 4}>
                  Rejoindre
                </button>
              </div>
            </motion.div>

            {/* Live Stats */}
            <motion.div
              className="hero-stats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="stat-item">
                <div className="stat-value">100%</div>
                <div className="stat-label">Gratuit</div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <div className="stat-value">0</div>
                <div className="stat-label">Installation</div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <div className="stat-value">∞</div>
                <div className="stat-label">Sessions</div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Floating Timer Preview */}
        <motion.div
          className="hero-demo-float"
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <div className="demo-timer-card card-glass">
            <div className="demo-header">
              <span className="demo-session-badge">Session en cours</span>
              <span className="demo-live-dot"></span>
            </div>
            <div className="demo-time-display">{formatTime(demoTime)}</div>
            <div className="demo-progress-bar">
              <motion.div
                className="demo-progress-fill"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              ></motion.div>
            </div>
            <div className="demo-controls-minimal">
              <button
                className={`demo-btn ${demoRunning ? 'playing' : ''}`}
                onClick={() => setDemoRunning(!demoRunning)}
              >
                {demoRunning ? '⏸' : '▶'}
              </button>
              <button className="demo-btn" onClick={() => setDemoTime(1800)}>
                ↻
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* FEATURES SECTION */}
      <section className="features-modern">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="section-header-modern"
          >
            <h2 className="section-title-modern">
              Tout ce dont vous avez besoin
            </h2>
            <p className="section-subtitle-modern">
              Une solution complète pour gérer le temps de vos événements
            </p>
          </motion.div>

          <div className="features-grid">
            {[
              {
                icon: '🎨',
                title: 'Interface magnifique',
                description: 'Un design moderne qui impressionne votre audience',
                color: '#6366f1'
              },
              {
                icon: '📱',
                title: 'Télécommande mobile',
                description: 'Contrôlez tout depuis votre smartphone',
                color: '#14b8a6'
              },
              {
                icon: '⚡',
                title: 'Temps réel',
                description: 'Synchronisation instantanée sur tous les écrans',
                color: '#f59e0b'
              },
              {
                icon: '🎯',
                title: 'Super simple',
                description: 'Prêt en 30 secondes, sans installation',
                color: '#ec4899'
              },
              {
                icon: '🎭',
                title: 'Sessions colorées',
                description: 'Chaque session a sa couleur unique',
                color: '#8b5cf6'
              },
              {
                icon: '🔄',
                title: 'Glisser-déposer',
                description: 'Réorganisez vos sessions en un geste',
                color: '#10b981'
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                className="feature-card card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
              >
                <div className="feature-icon" style={{ background: `${feature.color}15`, color: feature.color }}>
                  {feature.icon}
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-it-works-modern">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="section-header-modern"
          >
            <h2 className="section-title-modern">Comment ça marche</h2>
            <p className="section-subtitle-modern">En 4 étapes simples</p>
          </motion.div>

          <div className="steps-modern">
            {[
              { num: '01', title: 'Créer', desc: 'Créez votre salon en un clic' },
              { num: '02', title: 'Configurer', desc: 'Ajoutez vos sessions et timing' },
              { num: '03', title: 'Projeter', desc: 'Affichez le timer en grand' },
              { num: '04', title: 'Contrôler', desc: 'Pilotez depuis votre mobile' }
            ].map((step, idx) => (
              <motion.div
                key={idx}
                className="step-modern"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15 }}
              >
                <div className="step-number">{step.num}</div>
                <div className="step-content">
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
                {idx < 3 && <div className="step-arrow">→</div>}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="use-cases-modern">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="section-header-modern"
          >
            <h2 className="section-title-modern">
              Pensé pour vos temps collectifs
            </h2>
          </motion.div>

          <div className="use-cases-grid">
            {[
              {
                title: 'Ateliers & Séminaires',
                description: 'Gérez vos sessions de travail avec fluidité',
                icon: '🎯',
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              },
              {
                title: 'Cours & Formations',
                description: 'Respectez vos horaires sans débordement',
                icon: '📚',
                gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
              },
              {
                title: 'Réunions Agiles',
                description: 'Time-boxing efficace pour vos retros',
                icon: '💼',
                gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
              }
            ].map((useCase, idx) => (
              <motion.div
                key={idx}
                className="use-case-card-modern card-glass"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.02 }}
                style={{ background: `${useCase.gradient}, rgba(255,255,255,0.1)` }}
              >
                <div className="use-case-icon-modern">{useCase.icon}</div>
                <h3>{useCase.title}</h3>
                <p>{useCase.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HISTORY SECTION */}
      {history.length > 0 && (
        <section className="features-modern" style={{ paddingTop: '60px', paddingBottom: '60px', background: 'var(--gray-50)' }}>
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="section-header-modern"
            >
              <h2 className="section-title-modern">Vos salons récents</h2>
              <p className="section-subtitle-modern">Retrouvez vos derniers salons créés</p>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
              {history.slice(0, 6).map((salon, idx) => (
                <motion.div
                  key={salon.code_4chiffres || idx}
                  className="card"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ y: -5 }}
                  style={{ padding: '24px', cursor: 'pointer' }}
                  onClick={() => navigate(`/remote/${salon.code_4chiffres}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--gray-900)', marginBottom: '8px' }}>
                        {salon.nom || 'Mon Salon'}
                      </h3>
                      <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary)', fontFamily: 'monospace', letterSpacing: '0.3rem' }}>
                        {salon.code_4chiffres}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                    <span>{salon.sessions_count || 0} sessions</span>
                    <span>•</span>
                    <span>{new Date(salon.created_at).toLocaleDateString()}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA SECTION */}
      <section className="cta-modern">
        <div className="container">
          <motion.div
            className="cta-card card-glass"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2>Prêt à orchestrer le temps ?</h2>
            <p>Créez votre premier salon maintenant</p>
            <button className="btn btn-primary btn-xl" onClick={handleCreateSalon}>
              Commencer gratuitement
            </button>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer-modern">
        <div className="container">
          <div className="footer-content-modern">
            <div className="footer-brand">
              <div className="footer-logo">⏱️ Timer Salon</div>
              <p>Orchestrez le temps de vos ateliers</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-end' }}>
              <div className="footer-links-modern">
                <a href="#">Mentions légales</a>
                <span>•</span>
                <a href="#">Contact</a>
                <span>•</span>
                <a href="#">Documentation</a>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--gray-400)' }}>Thème:</span>
                {Object.entries(THEMES).map(([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => handleThemeChange(key)}
                    style={{
                      padding: '8px 16px',
                      background: currentTheme === key ? 'var(--primary)' : 'transparent',
                      color: currentTheme === key ? 'white' : 'var(--gray-400)',
                      border: '1px solid',
                      borderColor: currentTheme === key ? 'var(--primary)' : 'var(--gray-700)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    {theme.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="footer-copy">
            © 2025 Timer Salon. Créé avec ❤️ pour les facilitateurs.
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
