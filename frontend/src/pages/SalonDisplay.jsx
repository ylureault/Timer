import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import '../styles/SalonDisplay.css'

function SalonDisplay() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
      setError('Erreur de connexion')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchState()
    const interval = setInterval(fetchState, 300)
    return () => clearInterval(interval)
  }, [code])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="salon-display-modern loading">
        <motion.div className="loader-modern" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <div className="loader-ring"></div>
        </motion.div>
        <p>Chargement...</p>
      </div>
    )
  }

  if (error || !state?.current_session) {
    return (
      <div className="salon-display-modern error">
        <motion.div className="error-content-modern" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="error-icon">{error ? '😕' : '⏱️'}</div>
          <h2>{error || 'Aucune session'}</h2>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Retour</button>
        </motion.div>
      </div>
    )
  }

  const { current_session, mode, temps_restant, temps_ecoule, progress, session_en_cours, total_sessions } = state
  const progressPct = Math.max(0, Math.min(100, progress * 100))

  return (
    <motion.div className="salon-display-modern" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ backgroundColor: current_session.couleur }}>
      <div className="display-bg">
        <motion.div className="progress-overlay" animate={{ scaleX: progressPct / 100 }} transition={{ duration: mode === 'play' ? 1 : 0.3 }} />
        <div className="gradient-overlay"></div>
      </div>

      <div className="display-content-modern">
        <motion.div className="session-info-display" key={session_en_cours} initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="session-type-badge glass">{current_session.type === 'pause' ? '☕ Pause' : '🎯 Session'}</div>
          <h1 className="session-name-display">{current_session.nom_session}</h1>
          <div className="session-counter">{session_en_cours + 1} / {total_sessions}</div>
        </motion.div>

        <div className="timer-circle-container">
          <svg className="timer-circle-svg" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
            <motion.circle cx="100" cy="100" r="85" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={534.07} animate={{ strokeDashoffset: 534.07 * (1 - progress) }}
              transform="rotate(-90 100 100)" transition={{ duration: mode === 'play' ? 1 : 0.3 }} />
          </svg>

          <div className="timer-center">
            <motion.div className={`timer-display-main ${mode === 'play' ? 'playing' : 'paused'}`} key={temps_restant} initial={{ scale: 1.1 }} animate={{ scale: 1 }}>
              {formatTime(temps_restant)}
            </motion.div>
            {mode === 'pause' && temps_restant > 0 && <motion.div className="timer-status-badge" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>⏸ Pause</motion.div>}
            {mode === 'termine' && <motion.div className="timer-status-badge completed" initial={{ scale: 0 }} animate={{ scale: 1 }}>✓ Terminé</motion.div>}
          </div>
        </div>

        <motion.div className="time-cards" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="time-card glass">
            <div className="time-label">Temps écoulé</div>
            <div className="time-value">{formatTime(temps_ecoule)}</div>
            <div className="time-percentage">{Math.round(progressPct)}%</div>
          </div>
          <div className="time-card glass">
            <div className="time-label">Temps restant</div>
            <div className="time-value">{formatTime(temps_restant)}</div>
            <div className="time-percentage">{Math.round(100 - progressPct)}%</div>
          </div>
        </motion.div>

        {session_en_cours + 1 < total_sessions && (
          <motion.div className="upcoming-section" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
            <h3 className="upcoming-title">À venir</h3>
            <div className="upcoming-grid">
              {state.sessions.slice(session_en_cours + 1, session_en_cours + 4).map((session, idx) => (
                <motion.div key={idx} className="upcoming-card glass" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 + idx * 0.1 }} whileHover={{ scale: 1.05 }}>
                  <div className="upcoming-color" style={{ backgroundColor: session.couleur }}></div>
                  <div className="upcoming-info">
                    <div className="upcoming-name">{session.nom_session}</div>
                    <div className="upcoming-duration">{Math.floor(session.duree_secondes / 60)} min</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div className="display-footer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          <div className="footer-info glass">
            <span>Code: {state.salon.code}</span>
            <span>•</span>
            <span>Télécommande: /remote/{state.salon.code}</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default SalonDisplay
