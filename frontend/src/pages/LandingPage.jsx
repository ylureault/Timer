import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { THEMES, applyTheme } from '../utils/features'
import '../styles/LandingPage.css'

function LandingPage() {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  const [demoTime, setDemoTime] = useState(1800) // 30 minutes
  const [demoRunning, setDemoRunning] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('selected_theme') || 'light')

  // Demo timer
  useEffect(() => {
    if (demoRunning && demoTime > 0) {
      const interval = setInterval(() => {
        setDemoTime(prev => Math.max(0, prev - 1))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [demoRunning, demoTime])

  // Load theme on mount
  useEffect(() => {
    applyTheme(currentTheme)
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

        {/* Floating Premium Circular Timer Preview */}
        <motion.div
          className="hero-demo-float"
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, type: "spring" }}
        >
          <div className="demo-timer-premium">
            {/* Circular timer like luxe theme */}
            <div className="demo-circular-timer">
              {/* Metal bezel */}
              <div className="demo-bezel"></div>

              {/* Watch face */}
              <div className="demo-face">
                {/* Tick marks */}
                <div className="demo-marks"></div>

                {/* Progress arc */}
                <svg className="demo-progress-svg" viewBox="0 0 200 200">
                  <circle
                    cx="100"
                    cy="100"
                    r="85"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                  />
                  <motion.circle
                    cx="100"
                    cy="100"
                    r="85"
                    fill="none"
                    stroke="url(#gradient-demo)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={534.07}
                    animate={{
                      strokeDashoffset: 534.07 * (1 - progress / 100),
                      rotate: -90
                    }}
                    transition={{ duration: 1 }}
                    style={{ transformOrigin: 'center' }}
                  />
                  <defs>
                    <linearGradient id="gradient-demo" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#14b8a6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Center display */}
                <div className="demo-center-display">
                  <div className="demo-time-big">{formatTime(demoTime)}</div>
                  <div className="demo-session-label">Session Focus</div>
                </div>
              </div>

              {/* Glass overlay */}
              <div className="demo-glass"></div>

              {/* Center button */}
              <motion.button
                className={`demo-center-btn ${demoRunning ? 'playing' : ''}`}
                onClick={() => setDemoRunning(!demoRunning)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {demoRunning ? '⏸' : '▶'}
              </motion.button>
            </div>

            {/* Controls below */}
            <div className="demo-controls-modern">
              <motion.button
                className="demo-control-btn glass"
                onClick={() => setDemoTime(1800)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                ↻ Reset
              </motion.button>
              <motion.div className="demo-live-indicator" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
                <span className="demo-live-dot"></span>
                <span>Live Demo</span>
              </motion.div>
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
