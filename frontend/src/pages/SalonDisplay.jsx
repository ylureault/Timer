import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toggleFullscreen, soundManager, setupKeyboardShortcuts } from '../utils/features'
import '../styles/SalonDisplay.css'

function SalonDisplay() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [theme, setTheme] = useState(localStorage.getItem('display_theme') || 'luxe')
  const prevSessionRef = useRef(null)
  const prevTempsRestantRef = useRef(null)
  const themeChannel = useRef(null)

  // Initialize BroadcastChannel for reliable cross-tab theme synchronization
  useEffect(() => {
    themeChannel.current = new BroadcastChannel('salon-theme-channel')

    // Listen for theme changes from other tabs via BroadcastChannel
    themeChannel.current.onmessage = (event) => {
      if (event.data.type === 'theme-change') {
        const newTheme = event.data.theme
        setTheme(newTheme)
        console.log('✅ Theme received via BroadcastChannel:', newTheme)
      }
    }

    // Fallback: Listen for storage events (older browsers)
    const handleStorageChange = () => {
      const newTheme = localStorage.getItem('display_theme') || 'luxe'
      setTheme(newTheme)
      console.log('Theme changed via storage event:', newTheme)
    }

    // Fallback: Listen for custom events (same window)
    const handleThemeChange = (event) => {
      const newTheme = event.detail?.theme || localStorage.getItem('display_theme') || 'luxe'
      setTheme(newTheme)
      console.log('Theme changed via custom event:', newTheme)
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('theme-change', handleThemeChange)

    // Sync on mount
    const initialTheme = localStorage.getItem('display_theme') || 'luxe'
    setTheme(initialTheme)
    console.log('Initial theme loaded:', initialTheme)

    return () => {
      if (themeChannel.current) {
        themeChannel.current.close()
      }
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('theme-change', handleThemeChange)
    }
  }, [])

  const fetchState = async () => {
    try {
      const response = await fetch(`/api/salon/${code}/state`)
      const data = await response.json()

      if (data.success) {
        setState(data)
        setError(null)
      } else {
        setError(data.error || 'Salon non trouvé')
      }
      setLoading(false)
    } catch (err) {
      console.error('Error fetching state:', err)
      setError('Erreur de connexion')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchState()
    const interval = setInterval(fetchState, 300)
    return () => clearInterval(interval)
  }, [code])

  // Keyboard shortcuts
  useEffect(() => {
    const cleanup = setupKeyboardShortcuts({
      fullscreen: () => {
        const newState = toggleFullscreen()
        setIsFullscreen(newState)
      },
      exitFullscreen: () => {
        if (document.fullscreenElement) {
          document.exitFullscreen()
          setIsFullscreen(false)
        }
      }
    })
    return cleanup
  }, [])

  // Sound notifications and session change detection
  useEffect(() => {
    if (!state) return

    const currentSession = state.session_en_cours
    const tempsRestant = state.temps_restant

    // Session change detection
    if (prevSessionRef.current !== null && prevSessionRef.current !== currentSession) {
      soundManager.playSessionEnd()
    }

    // Warning at 10 seconds remaining
    if (prevTempsRestantRef.current === 11 && tempsRestant === 10) {
      soundManager.playWarning()
    }

    prevSessionRef.current = currentSession
    prevTempsRestantRef.current = tempsRestant
  }, [state])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="salon-display-loading">
        <div className="loader-premium"></div>
        <p>Connexion au salon...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="salon-display-error">
        <h1>😕</h1>
        <h2>{error}</h2>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Retour à l'accueil
        </button>
      </div>
    )
  }

  if (!state || !state.current_session) {
    return (
      <div className="salon-display-error">
        <h1>⏱️</h1>
        <h2>Aucune session disponible</h2>
      </div>
    )
  }

  const { current_session, mode, temps_restant, session_en_cours, total_sessions } = state
  const totalDuration = current_session.duree_secondes || 1
  const progress = Math.max(0, Math.min(1, temps_restant / totalDuration))
  const angle = progress * 360

  const isPlaying = mode === 'play'
  const isCompleted = mode === 'termine'

  // Calculate dynamic dial numbers based on session duration (in minutes)
  const durationMinutes = Math.floor(totalDuration / 60)
  const dialNumbers = {
    n0: durationMinutes, // Top (start)
    n15: Math.floor(durationMinutes * 0.75), // Right (75%)
    n30: Math.floor(durationMinutes * 0.5), // Bottom (50%)
    n45: Math.floor(durationMinutes * 0.25) // Left (25%)
  }

  return (
    <motion.div
      className={`salon-display-premium ${isPlaying ? 'is-running' : ''}`}
      data-theme={theme}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header compact */}
      <motion.div className="display-header-minimal" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="session-progress-bar">
          <div className="progress-fill" style={{ width: `${((session_en_cours + 1) / total_sessions) * 100}%` }}></div>
        </div>
        <div className="session-indicator">
          Session {session_en_cours + 1} / {total_sessions}
        </div>
      </motion.div>

      {/* Message Banner */}
      {state.message_actuel && (
        <motion.div
          className="message-banner"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          style={{
            position: 'fixed',
            top: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'linear-gradient(135deg, var(--brand-accent) 0%, rgba(255, 222, 89, 0.9) 100%)',
            color: 'var(--brand-dark)',
            padding: '20px 40px',
            borderRadius: '16px',
            fontSize: '1.5rem',
            fontWeight: '700',
            boxShadow: '0 10px 40px rgba(255, 222, 89, 0.4), 0 0 0 3px rgba(255, 255, 255, 0.2)',
            maxWidth: '80%',
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
            animation: 'pulse-glow 2s ease-in-out infinite'
          }}
        >
          <span style={{ marginRight: '12px', fontSize: '1.8rem' }}>📢</span>
          {state.message_actuel}
        </motion.div>
      )}

      {/* Le timer circulaire premium */}
      <div className="timer-stage">
        <motion.div
          className="timer-container-lux"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Lunette métallique brossée */}
          <div className="timer-bezel"></div>

          {/* Cadran */}
          <div className="timer-face">
            {/* Graduations */}
            <div className="timer-marks"></div>

            {/* Chiffres sur le cadran (quarts) - dynamiques basés sur la durée */}
            <div className="timer-numbers">
              <div className="num n0">{dialNumbers.n0}</div>
              <div className="num n15">{dialNumbers.n15}</div>
              <div className="num n30">{dialNumbers.n30}</div>
              <div className="num n45">{dialNumbers.n45}</div>
            </div>

            {/* Disque de progression avec la couleur de session */}
            <div
              className="color-wedge"
              style={{
                '--angle': `${angle}deg`,
                '--session-color': current_session.couleur,
                '--session-color-dark': current_session.couleur + 'dd'
              }}
            ></div>
          </div>

          {/* Vitre en verre */}
          <div className="glass-overlay"></div>

          {/* Bouton central */}
          <div className="center-knob"></div>
        </motion.div>

        {/* Temps digital sous le timer */}
        <motion.div
          className="digital-time-display"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          key={temps_restant}
        >
          {formatTime(temps_restant)}
        </motion.div>

        {/* Nom de la session */}
        <motion.div
          className="session-name-display"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <span className="session-badge" style={{ backgroundColor: current_session.couleur }}>
            {current_session.type === 'pause' ? '☕' : '🎯'}
          </span>
          <h2>{current_session.nom_session}</h2>
        </motion.div>

        {/* État */}
        <motion.div
          className="mode-indicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {isPlaying ? '▶ En cours' : isCompleted ? '✓ Terminé' : '⏸ En pause'}
        </motion.div>
      </div>

      {/* Footer minimaliste */}
      <motion.div className="display-footer-minimal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
        <div className="footer-info-minimal glass">
          <span>Code: {state.salon.code}</span>
          <span>•</span>
          <span>/remote/{state.salon.code}</span>
          <span>•</span>
          <button
            onClick={() => {
              const newState = toggleFullscreen()
              setIsFullscreen(newState)
            }}
            className="btn-icon-minimal"
            title="Plein écran (F)"
          >
            {isFullscreen ? '⛶' : '⛶'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default SalonDisplay
