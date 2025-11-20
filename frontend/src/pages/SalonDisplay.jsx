import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/SalonDisplay.css'

function SalonDisplay() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [previousSession, setPreviousSession] = useState(null)
  const pollingInterval = useRef(null)

  const fetchState = async () => {
    try {
      const response = await fetch(`/api/salon/${code}/state`)
      const data = await response.json()

      if (data.success) {
        // Detect session change for transition animation
        if (state && state.session_en_cours !== data.session_en_cours) {
          setPreviousSession(state.current_session)
          setTimeout(() => setPreviousSession(null), 1000)
        }
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

    // Poll every 300ms as specified
    pollingInterval.current = setInterval(fetchState, 300)

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
      }
    }
  }, [code])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatTimeElapsed = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins === 0) return `${secs}s`
    return `${mins}m ${secs}s`
  }

  if (loading) {
    return (
      <div className="salon-display loading">
        <div className="loader"></div>
        <p>Chargement du salon...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="salon-display error">
        <div className="error-content">
          <h1>😕</h1>
          <h2>{error}</h2>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  if (!state || !state.current_session) {
    return (
      <div className="salon-display error">
        <div className="error-content">
          <h1>⏱️</h1>
          <h2>Aucune session disponible</h2>
          <p>Configurez des sessions pour ce salon</p>
        </div>
      </div>
    )
  }

  const { current_session, mode, temps_restant, temps_ecoule, progress, session_en_cours, total_sessions } = state

  const progressPercentage = Math.max(0, Math.min(100, progress * 100))

  return (
    <div
      className={`salon-display ${mode}`}
      style={{
        backgroundColor: current_session.couleur,
        transition: 'background-color 1s ease'
      }}
    >
      {/* Progress Background */}
      <div
        className="progress-background"
        style={{
          width: `${progressPercentage}%`,
          transition: mode === 'play' ? 'width 1s linear' : 'none'
        }}
      ></div>

      {/* Session Transition Overlay */}
      {previousSession && (
        <div className="session-transition">
          <div className="transition-from" style={{ backgroundColor: previousSession.couleur }}>
            {previousSession.nom_session}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="display-content">
        {/* Session Info */}
        <div className="session-info fade-in">
          <div className="session-type">
            {current_session.type === 'pause' ? '☕ Pause' : '🎯 Session'}
          </div>
          <h1 className="session-name">{current_session.nom_session}</h1>
          <div className="session-number">
            {session_en_cours + 1} / {total_sessions}
          </div>
        </div>

        {/* Timer Display */}
        <div className="timer-display">
          <div className={`timer-main ${mode === 'play' ? 'running' : 'paused'}`}>
            {formatTime(temps_restant)}
          </div>

          {mode === 'pause' && temps_restant > 0 && (
            <div className="timer-status pause-indicator">
              ⏸ En pause
            </div>
          )}

          {mode === 'termine' && (
            <div className="timer-status completed">
              ✓ Terminé
            </div>
          )}
        </div>

        {/* Time Info */}
        <div className="time-info">
          <div className="time-block">
            <div className="time-label">Temps écoulé</div>
            <div className="time-value">{formatTimeElapsed(temps_ecoule)}</div>
          </div>
          <div className="time-separator">•</div>
          <div className="time-block">
            <div className="time-label">Temps restant</div>
            <div className="time-value">{formatTimeElapsed(temps_restant)}</div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="visual-progress">
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${progressPercentage}%`,
                transition: mode === 'play' ? 'width 1s linear' : 'width 0.3s ease'
              }}
            ></div>
          </div>
          <div className="progress-percentage">{Math.round(progressPercentage)}%</div>
        </div>

        {/* Upcoming Sessions Preview */}
        {session_en_cours + 1 < total_sessions && (
          <div className="upcoming-sessions">
            <div className="upcoming-label">À venir</div>
            <div className="upcoming-list">
              {state.sessions.slice(session_en_cours + 1, session_en_cours + 4).map((session, idx) => (
                <div key={idx} className="upcoming-session" style={{ borderLeftColor: session.couleur }}>
                  <span className="upcoming-name">{session.nom_session}</span>
                  <span className="upcoming-duration">{Math.floor(session.duree_secondes / 60)} min</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Remote Control Hint */}
        <div className="remote-hint">
          <p>Télécommande: {window.location.origin}/remote/{state.salon.code}</p>
        </div>
      </div>
    </div>
  )
}

export default SalonDisplay
