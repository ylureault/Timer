import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/RemoteControl.css'

function RemoteControl() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionFeedback, setActionFeedback] = useState(null)
  const pollingInterval = useRef(null)

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
    pollingInterval.current = setInterval(fetchState, 500) // 500ms for remote control

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
      }
    }
  }, [code])

  const showFeedback = (message) => {
    setActionFeedback(message)
    setTimeout(() => setActionFeedback(null), 1500)
  }

  const handleAction = async (action, body = {}) => {
    try {
      const response = await fetch(`/api/salon/${code}/timer/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (data.success) {
        fetchState() // Immediate update
        showFeedback('✓')
      } else {
        showFeedback('✗')
      }
    } catch (err) {
      console.error(`Error performing ${action}:`, err)
      showFeedback('✗')
    }
  }

  const handleStart = () => handleAction('start')
  const handlePause = () => handleAction('pause')
  const handleNext = () => handleAction('next')
  const handlePrevious = () => handleAction('previous')
  const handleStop = () => {
    if (confirm('Êtes-vous sûr de vouloir arrêter le cycle ?')) {
      handleAction('stop')
    }
  }
  const handleAddTime = (seconds) => handleAction('addtime', { seconds })

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="remote-control loading">
        <div className="loader"></div>
        <p>Connexion à la télécommande...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="remote-control error">
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
      <div className="remote-control error">
        <div className="error-content">
          <h1>⏱️</h1>
          <h2>Aucune session disponible</h2>
          <p>Configurez des sessions pour ce salon</p>
        </div>
      </div>
    )
  }

  const { current_session, mode, temps_restant, session_en_cours, total_sessions, progress } = state

  const progressPercentage = Math.max(0, Math.min(100, progress * 100))
  const isPlaying = mode === 'play'
  const isPaused = mode === 'pause'
  const isCompleted = mode === 'termine'

  return (
    <div className="remote-control" style={{ '--session-color': current_session.couleur }}>
      {/* Feedback Toast */}
      {actionFeedback && (
        <div className="action-feedback">{actionFeedback}</div>
      )}

      {/* Header */}
      <div className="remote-header">
        <div className="salon-info">
          <h3>Télécommande</h3>
          <p>Code: {state.salon.code}</p>
        </div>
        <button className="btn-icon" onClick={() => window.location.reload()}>
          🔄
        </button>
      </div>

      {/* Current Session Display */}
      <div className="current-session-card" style={{ borderColor: current_session.couleur }}>
        <div className="session-header">
          <span className="session-badge" style={{ backgroundColor: current_session.couleur }}>
            {current_session.type === 'pause' ? '☕' : '🎯'}
          </span>
          <div className="session-details">
            <h2>{current_session.nom_session}</h2>
            <p>Session {session_en_cours + 1} / {total_sessions}</p>
          </div>
        </div>

        <div className="timer-circle">
          <svg viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="12"
            />
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke={current_session.couleur}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={565.48}
              strokeDashoffset={565.48 * (1 - progress)}
              transform="rotate(-90 100 100)"
              style={{ transition: isPlaying ? 'stroke-dashoffset 1s linear' : 'none' }}
            />
          </svg>
          <div className="timer-text">
            <div className="timer-time">{formatTime(temps_restant)}</div>
            <div className="timer-label">{isPlaying ? 'en cours' : isPaused ? 'en pause' : 'terminé'}</div>
          </div>
        </div>

        <div className="progress-info">
          <span>{Math.round(progressPercentage)}%</span>
        </div>
      </div>

      {/* Main Controls */}
      <div className="main-controls">
        {!isCompleted && (
          <button
            className={`btn-control btn-play-pause ${isPlaying ? 'playing' : ''}`}
            onClick={isPlaying ? handlePause : handleStart}
            style={{ backgroundColor: current_session.couleur }}
          >
            {isPlaying ? (
              <>
                <span className="control-icon">⏸</span>
                <span>Pause</span>
              </>
            ) : (
              <>
                <span className="control-icon">▶</span>
                <span>Démarrer</span>
              </>
            )}
          </button>
        )}

        {isCompleted && (
          <div className="completed-message">
            <span className="completed-icon">✓</span>
            <span>Toutes les sessions terminées</span>
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="nav-controls">
        <button
          className="btn-nav"
          onClick={handlePrevious}
          disabled={session_en_cours === 0}
        >
          <span className="nav-icon">◀</span>
          <span>Précédent</span>
        </button>

        <button
          className="btn-nav"
          onClick={handleNext}
          disabled={session_en_cours >= total_sessions - 1}
        >
          <span>Suivant</span>
          <span className="nav-icon">▶</span>
        </button>
      </div>

      {/* Time Adjustment Controls */}
      {!isCompleted && (
        <div className="time-controls">
          <h4>Ajuster le temps</h4>
          <div className="time-buttons">
            <button className="btn-time" onClick={() => handleAddTime(-60)}>
              -1 min
            </button>
            <button className="btn-time" onClick={() => handleAddTime(-30)}>
              -30 sec
            </button>
            <button className="btn-time" onClick={() => handleAddTime(30)}>
              +30 sec
            </button>
            <button className="btn-time" onClick={() => handleAddTime(60)}>
              +1 min
            </button>
            <button className="btn-time" onClick={() => handleAddTime(300)}>
              +5 min
            </button>
          </div>
        </div>
      )}

      {/* Sessions List */}
      <div className="sessions-list-remote">
        <h4>Toutes les sessions</h4>
        <div className="sessions-scroll">
          {state.sessions.map((session, idx) => (
            <div
              key={idx}
              className={`session-item-remote ${idx === session_en_cours ? 'active' : ''} ${idx < session_en_cours ? 'completed' : ''}`}
              style={{ borderLeftColor: session.couleur }}
            >
              <div className="session-item-number">
                {idx < session_en_cours ? '✓' : idx + 1}
              </div>
              <div className="session-item-info">
                <div className="session-item-name">{session.nom_session}</div>
                <div className="session-item-duration">
                  {Math.floor(session.duree_secondes / 60)} min
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="danger-zone">
        <button className="btn-stop" onClick={handleStop}>
          ⏹ Arrêter le cycle
        </button>
      </div>

      {/* Footer */}
      <div className="remote-footer">
        <a href={`/salon/${state.salon.code}`} target="_blank" rel="noopener noreferrer">
          Voir l'affichage principal ↗
        </a>
      </div>
    </div>
  )
}

export default RemoteControl
