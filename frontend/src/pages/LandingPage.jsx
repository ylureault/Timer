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
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 6V3L8 7l4 4V8a4 4 0 1 1-4 4H6a6 6 0 1 0 6-6z" />
        </svg>
      ),
      title: 'Synchro temps réel',
      description: 'Tous les écrans restent parfaitement synchronisés, à la seconde près.'
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm5 16.5a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z" />
        </svg>
      ),
      title: 'Pilotage mobile',
      description: 'Pilotez votre timer depuis votre smartphone, sans rien installer.'
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
        </svg>
      ),
      title: 'Modèles prêts',
      description: 'Démarrez plus vite avec des séquences prêtes à l’emploi.'
    }
  ]

  // Ring SVG math: r=92, circumference = 2*PI*92 = 578.053
  // 75% progress => dashoffset = 578.053 * (1 - 0.75) = 144.513
  const ringRadius = 92
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference * 0.25 // 25% remaining = 75% filled

  return (
    <div className="lp">
      {/* NAVBAR */}
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-logo">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="#dbe4f7" strokeWidth="2.5" />
              <path d="M12 3a9 9 0 0 1 9 9" stroke="#1f3a8b" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="12" cy="12" r="2.4" fill="#1f3a8b" />
            </svg>
            <span className="lp-logo-text">
              Timer <span className="lp-logo-sep">&middot;</span>{' '}
              <span className="lp-logo-brand">INSUFFLE</span>
            </span>
          </div>

          <nav className="lp-nav-links">
            <a href="#features" className="lp-nav-link">Fonctionnalités</a>
            <a href="/create" className="lp-nav-link" onClick={(e) => { e.preventDefault(); handleCreateTimer() }}>Modèles</a>
            <span className="lp-lang-toggle">
              <span className="lp-lang-active">FR</span>
              <span className="lp-lang-divider">/</span>
              <span className="lp-lang-inactive">EN</span>
            </span>
            <button className="btn btn-primary lp-nav-cta" onClick={handleCreateTimer}>
              Créer un minuteur
            </button>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-grid">
          {/* Left column: text + CTAs */}
          <motion.div
            className="lp-hero-left"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="lp-hero-badge">
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="10" fill="#22c55e" />
                <path d="M6 10.5l2.5 2.5L14 7.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              100% gratuit &middot; sans inscription
            </span>

            <h1 className="lp-hero-title">
              Le minuteur visuel qui{' '}
              <br className="lp-br-desktop" />
              rythme vos{' '}
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

            <p className="lp-hero-desc">
              Créez des séquences temporelles partagées et contrôlées à distance.
              Simple, visuel et terriblement efficace.
            </p>

            <div className="lp-hero-actions">
              <button
                className="btn btn-primary btn-xl lp-cta-primary anim-soft"
                onClick={handleCreateTimer}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Créer un minuteur
              </button>
              <button className="btn btn-ghost lp-cta-secondary">
                Voir une démo
              </button>
            </div>

            {/* Join code input */}
            <div className="lp-join">
              <div className="lp-join-field">
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
                  className="btn btn-secondary lp-join-btn"
                  onClick={handleJoinTimer}
                  disabled={joinCode.replace(/-/g, '').length < 6}
                >
                  Rejoindre
                </button>
              </div>
            </div>

            <p className="lp-reassurance">
              Aucune carte bancaire &middot; Aucun compte &middot; Prêt en un lien
            </p>
          </motion.div>

          {/* Right column: ring preview */}
          <motion.div
            className="lp-hero-right"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <div className="lp-ring-card">
              <div className="lp-ring anim-breathe">
                <svg viewBox="0 0 224 224" className="lp-ring-svg" aria-hidden="true">
                  <circle
                    className="lp-ring-track"
                    cx="112"
                    cy="112"
                    r={ringRadius}
                  />
                  <circle
                    className="lp-ring-progress"
                    cx="112"
                    cy="112"
                    r={ringRadius}
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                  />
                </svg>
                <div className="lp-ring-center">
                  <div className="lp-ring-time">12:30</div>
                </div>
              </div>
              <div className="lp-ring-indicator">
                <span className="lp-ring-dot" />
                Synchronisé en direct
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-features-section" id="features">
        <div className="lp-features-grid">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.title}
              className="lp-fcard"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
            >
              <div className="lp-fcard-icon" aria-hidden="true">
                {feature.icon}
              </div>
              <h3 className="lp-fcard-title">{feature.title}</h3>
              <p className="lp-fcard-desc">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <div className="lp-footer-wordmark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="#dbe4f7" strokeWidth="2.5" />
                <path d="M12 3a9 9 0 0 1 9 9" stroke="#1f3a8b" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="12" cy="12" r="2.4" fill="#1f3a8b" />
              </svg>
              Timer <span className="lp-logo-sep">&middot;</span>{' '}
              <span className="lp-logo-brand">INSUFFLE</span>
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
        <div className="lp-footer-copy">
          &copy; 2026 Timer par INSUFFLE
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
