import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import '../styles/LandingPage.css'

function LandingPage() {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')

  // Rotating words animation
  const words = [
    'ateliers', 'réunions', 'Codir', 'formations', 'webinaires', 'conférences',
    'workshops', 'séminaires', 'présentations', 'démos', 'trainings', 'sessions',
    'événements', 'cérémonies', 'interventions', 'masterclass', 'rendez-vous',
    'rencontres', 'animations', 'plénières'
  ]
  const [currentWordIndex, setCurrentWordIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % words.length)
    }, 2200)

    return () => clearInterval(interval)
  }, [])

  const handleCreateTimer = () => {
    navigate('/create')
  }

  const handleJoinTimer = () => {
    const trimmed = joinCode.trim()
    const digits = trimmed.replace(/-/g, '')
    if (digits.length >= 6) {
      // Accept formats: XXX-XXX or XXXXXX
      const formatted = trimmed.includes('-')
        ? trimmed
        : `${digits.slice(0, 3)}-${digits.slice(3, 6)}`
      navigate(`/timer/${formatted}`)
    }
  }

  const features = [
    {
      icon: '⚡',
      title: 'Synchro temps réel',
      description: 'Tous les écrans restent parfaitement synchronisés, à la seconde près.'
    },
    {
      icon: '📱',
      title: 'Télécommande mobile',
      description: 'Pilotez votre timer depuis votre smartphone, sans rien installer.'
    },
    {
      icon: '🔗',
      title: 'QR code de partage',
      description: 'Partagez l’accès en un instant grâce à un QR code dédié.'
    },
    {
      icon: '🗂️',
      title: 'Modèles prédéfinis',
      description: 'Démarrez plus vite avec des séquences prêtes à l’emploi.'
    },
    {
      icon: '🎨',
      title: '3 thèmes d’affichage',
      description: 'Choisissez le rendu qui s’accorde le mieux à votre scène.'
    },
    {
      icon: '🖥️',
      title: 'Mode plein écran',
      description: 'Projetez le timer en grand, lisible depuis le fond de la salle.'
    }
  ]

  const steps = [
    {
      num: '1',
      title: 'Créer',
      desc: 'Composez votre séquence de sessions en quelques clics, sans inscription.'
    },
    {
      num: '2',
      title: 'Projeter',
      desc: 'Affichez le timer en plein écran sur l’écran de votre salle.'
    },
    {
      num: '3',
      title: 'Piloter',
      desc: 'Lancez, mettez en pause et passez à la suite depuis votre mobile.'
    }
  ]

  return (
    <div className="lp">
      {/* TOP NAV */}
      <header className="lp-nav">
        <div className="container lp-nav-inner">
          <div className="lp-wordmark">
            <span className="lp-wordmark-icon" aria-hidden="true">⏱</span>
            Timer par <span className="lp-wordmark-brand">INSUFFLE</span>
          </div>
          <button className="btn btn-primary" onClick={handleCreateTimer}>
            Créer un timer
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="lp-hero">
        <div className="container">
          <motion.div
            className="lp-hero-content"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="badge badge-primary lp-hero-badge">
              Sans inscription · 100% gratuit
            </span>

            <h1 className="lp-hero-title">
              Orchestrez le temps de vos{' '}
              <span className="lp-rotating">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentWordIndex}
                    className="lp-rotating-word"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    transition={{ duration: 0.3 }}
                  >
                    {words[currentWordIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>

            <p className="lp-hero-subtitle">
              Créez des séquences temporelles partagées, contrôlées à distance.
              Simple, visuel et terriblement efficace.
            </p>

            <div className="lp-hero-actions">
              <button
                className="btn btn-primary btn-xl"
                onClick={handleCreateTimer}
              >
                Créer un timer
              </button>

              <div className="lp-join">
                <input
                  type="text"
                  className="input lp-join-input"
                  placeholder="XXX-XXX"
                  maxLength={7}
                  value={joinCode}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9-]/g, '')
                    setJoinCode(raw)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinTimer()}
                  aria-label="Code du timer à rejoindre"
                />
                <button
                  className="btn btn-secondary"
                  onClick={handleJoinTimer}
                  disabled={joinCode.replace(/-/g, '').length < 6}
                >
                  Rejoindre
                </button>
              </div>
            </div>
          </motion.div>

          {/* PRODUCT PREVIEW */}
          <motion.div
            className="lp-preview card"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <div className="lp-preview-bar">
              <span className="lp-preview-dot" />
              <span className="lp-preview-dot" />
              <span className="lp-preview-dot" />
            </div>
            <div className="lp-preview-stage">
              <div className="lp-ring">
                <svg viewBox="0 0 240 240" className="lp-ring-svg" aria-hidden="true">
                  <circle
                    className="lp-ring-track"
                    cx="120"
                    cy="120"
                    r="104"
                  />
                  <circle
                    className="lp-ring-progress"
                    cx="120"
                    cy="120"
                    r="104"
                  />
                </svg>
                <div className="lp-ring-center">
                  <div className="lp-ring-time">12:30</div>
                  <div className="lp-ring-label">Atelier en cours</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="lp-section">
        <div className="container">
          <motion.div
            className="lp-section-head"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="lp-section-title">Comment ça marche</h2>
            <p className="lp-section-subtitle">Trois étapes, et c’est parti.</p>
          </motion.div>

          <div className="lp-steps">
            {steps.map((step, idx) => (
              <motion.div
                key={step.num}
                className="card lp-step"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
              >
                <div className="lp-step-num">{step.num}</div>
                <h3 className="lp-step-title">{step.title}</h3>
                <p className="lp-step-desc">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-section lp-section-alt">
        <div className="container">
          <motion.div
            className="lp-section-head"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="lp-section-title">Fonctionnalités</h2>
            <p className="lp-section-subtitle">
              Tout ce qu’il faut pour maîtriser le temps de vos événements.
            </p>
          </motion.div>

          <div className="lp-features">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                className="card lp-feature"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.06 }}
              >
                <div className="lp-feature-icon" aria-hidden="true">
                  {feature.icon}
                </div>
                <h3 className="lp-feature-title">{feature.title}</h3>
                <p className="lp-feature-desc">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="container lp-footer-inner">
          <div className="lp-footer-brand">
            <div className="lp-footer-wordmark">
              Timer par <span className="lp-wordmark-brand">INSUFFLE</span>
            </div>
            <p className="lp-footer-tagline">
              Orchestrez le temps de vos temps collectifs.
            </p>
          </div>
          <nav className="lp-footer-links">
            <a href="https://www.insuffle.com" target="_blank" rel="noopener noreferrer">
              insuffle.com
            </a>
            <a
              href="https://www.linkedin.com/company/insuffle/"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
            <a
              href="/create"
              onClick={(e) => {
                e.preventDefault()
                handleCreateTimer()
              }}
            >
              Créer un timer
            </a>
          </nav>
        </div>
        <div className="container lp-footer-copy">
          © 2026 Timer par INSUFFLE
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
