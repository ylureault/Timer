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
    console.log('🔌 SalonDisplay: BroadcastChannel initialized')

    // Listen for theme changes from other tabs via BroadcastChannel
    themeChannel.current.onmessage = (event) => {
      if (event.data.type === 'theme-change') {
        const newTheme = event.data.theme
        setTheme(newTheme)
        console.log('✅ SalonDisplay: Theme received via BroadcastChannel:', newTheme)
        console.log('🎨 SalonDisplay: Theme state updated to:', newTheme)
      }
    }

    // Fallback: Listen for storage events (older browsers)
    const handleStorageChange = () => {
      const newTheme = localStorage.getItem('display_theme') || 'luxe'
      setTheme(newTheme)
      console.log('📦 SalonDisplay: Theme changed via storage event:', newTheme)
    }

    // Fallback: Listen for custom events (same window)
    const handleThemeChange = (event) => {
      const newTheme = event.detail?.theme || localStorage.getItem('display_theme') || 'luxe'
      setTheme(newTheme)
      console.log('🎯 SalonDisplay: Theme changed via custom event:', newTheme)
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('theme-change', handleThemeChange)

    // Sync on mount
    const initialTheme = localStorage.getItem('display_theme') || 'luxe'
    setTheme(initialTheme)
    console.log('🚀 SalonDisplay: Initial theme loaded:', initialTheme)

    return () => {
      if (themeChannel.current) {
        themeChannel.current.close()
        console.log('🔌 SalonDisplay: BroadcastChannel closed')
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

        // Sync theme from database
        if (data.theme_actif) {
          setTheme(data.theme_actif)
          localStorage.setItem('display_theme', data.theme_actif)
        }
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

  const isPaused = mode === 'pause'

  return (
    <motion.div
      className={`salon-display-premium ${isPlaying ? 'is-running' : ''} ${isPaused ? 'is-paused' : ''}`}
      data-theme={theme}
      style={{ '--progress': progress * 100 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Message Banner - Notification visible en haut */}
      {state.message_actuel && (
        <motion.div
          className="message-banner"
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          style={{
            position: 'fixed',
            top: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2000,
            background: 'linear-gradient(135deg, #FFB800 0%, #FFA000 100%)',
            color: '#1a1a1a',
            padding: '24px 50px',
            borderRadius: '20px',
            fontSize: '2rem',
            fontWeight: '800',
            boxShadow: '0 20px 60px rgba(255, 184, 0, 0.5), 0 0 0 4px rgba(255, 255, 255, 0.3)',
            minWidth: '400px',
            maxWidth: '90%',
            textAlign: 'center',
            backdropFilter: 'blur(20px)',
            border: '3px solid rgba(255, 255, 255, 0.4)'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px'
          }}>
            <span style={{ fontSize: '2.5rem' }}>📢</span>
            <span>{state.message_actuel}</span>
          </div>
        </motion.div>
      )}

      {/* Conditional rendering: Timer mode vs List mode */}
      {state.mode_affichage === 'list' ? (
        /* MODE LISTE: Agenda view with all sessions */
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '7rem 20px 5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          minHeight: '100vh',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1
        }}>
          {state.sessions.map((session, idx) => {
            const isCompleted = idx < session_en_cours
            const isCurrent = idx === session_en_cours
            const isUpcoming = idx > session_en_cours

            let progressPercent = 0
            if (isCurrent) {
              const elapsed = current_session.duree_secondes - temps_restant
              progressPercent = (elapsed / current_session.duree_secondes) * 100
            }

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                style={{
                  position: 'relative',
                  padding: isCurrent ? '40px' : '30px',
                  borderRadius: '20px',
                  border: `3px solid ${isCurrent ? session.couleur : 'rgba(59, 130, 246, 0.2)'}`,
                  background: isCompleted
                    ? 'linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(127, 29, 29, 0.1) 100%)'
                    : isCurrent
                    ? `linear-gradient(135deg, ${session.couleur}20 0%, ${session.couleur}10 100%)`
                    : 'rgba(31, 58, 139, 0.05)',
                  boxShadow: isCurrent
                    ? `0 20px 60px ${session.couleur}40, 0 0 0 1px ${session.couleur}20`
                    : '0 4px 12px rgba(0, 0, 0, 0.1)',
                  opacity: isUpcoming ? 0.6 : 1,
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}
              >
                {/* Progress bar background for current session */}
                {isCurrent && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${progressPercent}%`,
                    background: `linear-gradient(90deg, ${session.couleur}30, ${session.couleur}15)`,
                    transition: 'width 0.3s linear',
                    borderRadius: '17px 0 0 17px'
                  }} />
                )}

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '30px' }}>
                  {/* Status icon */}
                  <div style={{
                    fontSize: isCurrent ? '4rem' : '3rem',
                    flexShrink: 0,
                    opacity: isUpcoming ? 0.4 : 1
                  }}>
                    {isCompleted ? '✓' : isCurrent ? '▶' : '⭕'}
                  </div>

                  {/* Session info */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '15px',
                      marginBottom: isCurrent ? '15px' : '10px'
                    }}>
                      <span style={{
                        padding: '8px 16px',
                        borderRadius: '12px',
                        background: session.couleur,
                        color: 'white',
                        fontSize: isCurrent ? '1.1rem' : '0.95rem',
                        fontWeight: '700'
                      }}>
                        {session.type === 'pause' ? '☕' : '🎯'}
                      </span>
                      <h3 style={{
                        fontSize: isCurrent ? '2.5rem' : '1.8rem',
                        fontWeight: '700',
                        color: 'var(--text-white)',
                        margin: 0
                      }}>
                        {session.nom_session}
                      </h3>
                    </div>

                    {isCurrent && (
                      <div style={{
                        fontSize: '1.2rem',
                        color: 'var(--text-muted)',
                        marginTop: '10px'
                      }}>
                        {isPlaying ? '▶ En cours' : isCompleted ? '✓ Terminé' : '⏸ En pause'}
                      </div>
                    )}
                  </div>

                  {/* Time display */}
                  <div style={{
                    textAlign: 'right',
                    flexShrink: 0
                  }}>
                    {isCurrent ? (
                      <div style={{
                        fontSize: '5rem',
                        fontWeight: '700',
                        fontFamily: 'monospace',
                        color: session.couleur,
                        lineHeight: 1,
                        textShadow: `0 0 20px ${session.couleur}40`
                      }}>
                        {formatTime(temps_restant)}
                      </div>
                    ) : (
                      <div style={{
                        fontSize: '2rem',
                        fontWeight: '600',
                        color: 'var(--text-muted)',
                        fontFamily: 'monospace',
                        opacity: isCompleted ? 0.5 : 0.7
                      }}>
                        {formatTime(session.duree_secondes)}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        /* MODE TIMER: Circular timer view */
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
            <div
              className="timer-face"
              style={{
                '--progress': `${progress * 100}`,
                '--session-color': current_session.couleur
              }}
            >
              {/* Graduations */}
              <div className="timer-marks"></div>

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
          >
            {formatTime(temps_restant)}
          </motion.div>

          {/* Session indicator sous le temps */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              margin: '0.75rem 0 0.5rem'
            }}
          >
            <div style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: 'var(--text-white)',
              opacity: 0.7,
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              Session {session_en_cours + 1} / {total_sessions}
            </div>
            <div style={{
              width: '100px',
              height: '3px',
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div
                style={{
                  height: '100%',
                  width: `${((session_en_cours + 1) / total_sessions) * 100}%`,
                  background: 'linear-gradient(90deg, var(--brand-accent), var(--brand-primary))',
                  transition: 'width 0.3s ease',
                  borderRadius: '2px',
                  boxShadow: '0 0 8px var(--brand-accent)'
                }}
              />
            </div>
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
      )}

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

      {/* QR Code - Affichage sur mobile */}
      <motion.div
        className="qr-code-display"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8 }}
      >
        <div style={{
          background: 'white',
          padding: '0.75rem',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(window.location.origin)}/salon/${state.salon.code}`}
            alt="QR Code"
            style={{
              width: '120px',
              height: '120px',
              display: 'block'
            }}
          />
          <div style={{
            fontSize: '0.625rem',
            color: '#333',
            fontWeight: '600',
            textAlign: 'center',
            lineHeight: 1.3
          }}>
            Scannez pour<br/>voir sur mobile
          </div>
        </div>
      </motion.div>

      {/* Crédit Insuffle - Discret */}
      <a
        href="https://www.insuffle.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '15px',
          fontSize: '0.7rem',
          color: 'rgba(255, 255, 255, 0.4)',
          textDecoration: 'none',
          transition: 'color 0.2s ease',
          zIndex: 1500
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'
        }}
      >
        Créé par Insuffle
      </a>
    </motion.div>
  )
}

export default SalonDisplay
