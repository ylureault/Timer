import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { saveSessionNotes, getSessionNotes, calculateStats } from '../utils/features'
import '../styles/RemoteControl.css'

const SESSION_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
  '#EF4444', '#6366F1', '#14B8A6', '#64748B',
]

function RemoteControl() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionFeedback, setActionFeedback] = useState(null)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [stats, setStats] = useState(null)
  const [currentTheme, setCurrentTheme] = useState('luxe')
  const [message, setMessage] = useState('')
  const [viewMode, setViewMode] = useState('agenda')
  const [autoMode, setAutoMode] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showAddSession, setShowAddSession] = useState(false)
  const [newSession, setNewSession] = useState({ nom_session: '', duree_minutes: 5, couleur: '#3B82F6', type: 'session' })
  const [editingSession, setEditingSession] = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const initSoundEnabled = () => {
    const stored = localStorage.getItem('sound_enabled')
    if (stored === null || stored === undefined) {
      localStorage.setItem('sound_enabled', 'true')
      return true
    }
    return stored === 'true'
  }

  const [soundEnabled, setSoundEnabled] = useState(initSoundEnabled())
  const [isScrolled, setIsScrolled] = useState(false)
  const pollingInterval = useRef(null)
  const previousTimeRef = useRef(null)
  const audioContextRef = useRef(null)
  const failCountRef = useRef(0)

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    return audioContextRef.current
  }

  const playBeep = async () => {
    if (!soundEnabled) return
    try {
      const audioContext = getAudioContext()
      if (audioContext.state === 'suspended') await audioContext.resume()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
    } catch (err) {
      console.error('Error playing beep:', err)
    }
  }

  const playBell = async () => {
    try {
      const audioContext = getAudioContext()
      if (audioContext.state === 'suspended') await audioContext.resume()
      const frequencies = [800, 1000, 1200]
      const duration = 0.8
      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        oscillator.frequency.value = freq
        oscillator.type = 'sine'
        const startTime = audioContext.currentTime + (index * 0.05)
        gainNode.gain.setValueAtTime(0.15, startTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
        oscillator.start(startTime)
        oscillator.stop(startTime + duration)
      })
      showFeedback('Ding!')
    } catch (err) {
      console.error('Error playing bell:', err)
      showFeedback('Erreur son')
    }
  }

  const toggleSound = () => {
    const newValue = !soundEnabled
    setSoundEnabled(newValue)
    localStorage.setItem('sound_enabled', newValue.toString())
    showFeedback(newValue ? 'Sons activés' : 'Sons désactivés')
    if (newValue) setTimeout(playBeep, 100)
  }

  useEffect(() => {
    if (!state) return
    const t = state.temps_restant
    const prev = previousTimeRef.current
    if (
      soundEnabled &&
      state.mode === 'play' &&
      prev !== null && t < prev &&
      t <= 5 && t > 0
    ) {
      playBeep()
    }
    previousTimeRef.current = t
  }, [state?.temps_restant, state?.mode, soundEnabled])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 100)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleThemeChange = async (newTheme) => {
    setCurrentTheme(newTheme)
    try {
      const response = await fetch(`/api/timer/${code}/theme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme })
      })
      if (response.ok) {
        showFeedback('Thème changé')
        fetchState()
      } else {
        showFeedback('Erreur')
      }
    } catch (err) {
      console.error('Error changing theme:', err)
      showFeedback('Erreur')
    }
  }

  const themes = [
    { id: 'luxe', name: 'Luxe' },
    { id: 'aplat', name: 'Aplat' },
    { id: 'aurora', name: 'Aurora' }
  ]

  const fetchState = async () => {
    try {
      const response = await fetch(`/api/timer/${code}/state`)
      const data = await response.json()

      if (data.success) {
        setState(data)
        setError(null)
        failCountRef.current = 0
        if (data.theme && data.theme !== currentTheme) {
          setCurrentTheme(data.theme)
        }
        if (data.auto_mode !== undefined) {
          setAutoMode(data.auto_mode)
        }
      } else {
        failCountRef.current += 1
        if (!state || failCountRef.current >= 3) {
          setError(data.error || 'Timer introuvable')
        }
      }
      setLoading(false)
    } catch (err) {
      console.error('Error fetching state:', err)
      failCountRef.current += 1
      if (!state || failCountRef.current >= 3) {
        setError('Erreur de connexion')
      }
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchState()
    pollingInterval.current = setInterval(fetchState, 500)
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current)
    }
  }, [code])

  useEffect(() => {
    if (state && state.current_session) {
      const sessionId = state.session_en_cours
      const loadedNotes = getSessionNotes(code, sessionId)
      setNotes(loadedNotes)
    }
  }, [state?.session_en_cours, code])

  useEffect(() => {
    if (state && state.sessions) {
      const completedSessions = state.sessions.slice(0, state.session_en_cours)
      const statsData = calculateStats(state.sessions, completedSessions)
      setStats(statsData)
    }
  }, [state])

  const handleNotesChange = (e) => {
    const newNotes = e.target.value
    setNotes(newNotes)
    if (state) saveSessionNotes(code, state.session_en_cours, newNotes)
  }

  const showFeedback = (msg) => {
    setActionFeedback(msg)
    setTimeout(() => setActionFeedback(null), 1500)
  }

  const handleAction = async (action, body = {}) => {
    try {
      const response = await fetch(`/api/timer/${code}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await response.json()
      if (data.success) {
        fetchState()
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
  const handleReset = () => {
    setConfirmReset(true)
  }
  const confirmDoReset = () => {
    setConfirmReset(false)
    handleAction('reset')
  }
  const handleAddTime = (seconds) => handleAction('addtime', { seconds })

  const handleJumpToSession = async (sessionIndex) => {
    if (editMode) return
    try {
      await fetch(`/api/timer/${code}/goto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionIndex })
      })
      fetchState()
      showFeedback(`Session ${sessionIndex + 1}`)
    } catch (err) {
      console.error('Error jumping to session:', err)
      showFeedback('Erreur')
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim()) return
    try {
      const response = await fetch(`/api/timer/${code}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() })
      })
      if (response.ok) {
        setMessage('')
        showFeedback('Message envoyé')
      } else {
        showFeedback('Erreur')
      }
    } catch (err) {
      console.error('Error sending message:', err)
      showFeedback('Erreur')
    }
  }

  const handleClearMessage = async () => {
    try {
      await fetch(`/api/timer/${code}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: null })
      })
      showFeedback('Message effacé')
    } catch (err) {
      console.error('Error clearing message:', err)
      showFeedback('Erreur')
    }
  }

  const handleAutoModeToggle = async () => {
    const newAutoMode = !autoMode
    setAutoMode(newAutoMode)
    try {
      const response = await fetch(`/api/timer/${code}/auto-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_mode: newAutoMode })
      })
      if (response.ok) {
        showFeedback(newAutoMode ? 'Mode AUTO activé' : 'Mode AUTO désactivé')
      } else {
        showFeedback('Erreur')
        setAutoMode(!newAutoMode)
      }
    } catch (err) {
      console.error('Error toggling auto mode:', err)
      showFeedback('Erreur')
      setAutoMode(!newAutoMode)
    }
  }

  // ---- Session CRUD ----
  const handleAddNewSession = async () => {
    if (!newSession.nom_session.trim()) {
      showFeedback('Nom requis')
      return
    }
    try {
      const response = await fetch(`/api/timer/${code}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom_session: newSession.nom_session.trim(),
          duree_secondes: (parseInt(newSession.duree_minutes, 10) || 5) * 60,
          couleur: newSession.couleur,
          type: newSession.type,
        })
      })
      const data = await response.json()
      if (data.success) {
        showFeedback('Session ajoutée')
        setShowAddSession(false)
        setNewSession({ nom_session: '', duree_minutes: 5, couleur: SESSION_COLORS[(state?.sessions?.length || 0) % SESSION_COLORS.length], type: 'session' })
        fetchState()
      } else {
        showFeedback(data.error || 'Erreur')
      }
    } catch (err) {
      console.error('Error adding session:', err)
      showFeedback('Erreur')
    }
  }

  const handleUpdateSession = async (index, updates) => {
    try {
      const response = await fetch(`/api/timer/${code}/sessions/${index}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const data = await response.json()
      if (data.success) {
        showFeedback('Session modifiée')
        fetchState()
      } else {
        showFeedback(data.error || 'Erreur')
      }
    } catch (err) {
      console.error('Error updating session:', err)
      showFeedback('Erreur')
    }
  }

  const handleDeleteSession = async (index) => {
    if (state.sessions.length <= 1) {
      showFeedback('Au moins 1 session requise')
      return
    }
    try {
      const response = await fetch(`/api/timer/${code}/sessions/${index}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.success) {
        showFeedback('Session supprimée')
        setEditingSession(null)
        fetchState()
      } else {
        showFeedback(data.error || 'Erreur')
      }
    } catch (err) {
      console.error('Error deleting session:', err)
      showFeedback('Erreur')
    }
  }

  const formatTime = (seconds) => {
    const s = Math.max(0, Math.floor(seconds))
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="rc-state">
        <div className="loader"></div>
        <p>Connexion au timer...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rc-state">
        <div className="rc-state-card card">
          <h1>Timer introuvable</h1>
          <p>{error}</p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/')}>
            Retour
          </button>
        </div>
      </div>
    )
  }

  if (!state || !state.current_session) {
    return (
      <div className="rc-state">
        <div className="rc-state-card card">
          <h1>Aucune session</h1>
          <p>Configurez des sessions pour ce timer.</p>
        </div>
      </div>
    )
  }

  const { current_session, mode, temps_restant, session_en_cours, total_sessions } = state
  const effectiveTotal = state.effective_total || Math.max(current_session.duree_secondes, temps_restant)
  const progressValue = effectiveTotal > 0 ? 1 - (temps_restant / effectiveTotal) : 0
  const clampedProgress = Math.max(0, Math.min(1, progressValue))
  const progressPercentage = Math.round(clampedProgress * 100)
  const isPlaying = mode === 'play'
  const isPaused = mode === 'pause'
  const isCompleted = mode === 'termine'

  const sessionColor = current_session.couleur || 'var(--brand)'
  const RADIUS = 90
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS

  return (
    <div className="rc" style={{ '--session-color': sessionColor }}>
      {actionFeedback && (
        <div className="rc-feedback">{actionFeedback}</div>
      )}

      {/* Confirm reset overlay */}
      {confirmReset && (
        <div className="rc-confirm-overlay" onClick={() => setConfirmReset(false)}>
          <div className="rc-confirm-card card" onClick={e => e.stopPropagation()}>
            <h3>Réinitialiser le timer ?</h3>
            <p>Le timer reviendra à la première session.</p>
            <div className="rc-confirm-actions">
              <button className="btn btn-danger" onClick={confirmDoReset}>Réinitialiser</button>
              <button className="btn btn-secondary" onClick={() => setConfirmReset(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {isScrolled && (
        <div className="rc-sticky">
          <div className="rc-sticky-left">
            <span className="rc-sticky-time">{formatTime(temps_restant)}</span>
            <span className="rc-sticky-name">{current_session.nom_session}</span>
          </div>
          <div className="rc-sticky-right">
            <span className="rc-sticky-count">{session_en_cours + 1}/{total_sessions}</span>
            {!isCompleted && (
              <button
                className="btn btn-sm btn-primary"
                onClick={isPlaying ? handlePause : handleStart}
              >
                {isPlaying ? 'Pause' : 'Démarrer'}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="rc-shell">
        {/* Main header */}
        <header className="rc-header">
          <div className="rc-title">
            <h1>Télécommande</h1>
            <p className="rc-code">Code: {state.timer?.code || code}</p>
          </div>
          <div className="rc-header-actions">
            <button
              onClick={handleAutoModeToggle}
              className={`rc-icon-btn ${autoMode ? 'is-active' : ''}`}
              title={autoMode ? 'Mode AUTO activé' : 'Mode AUTO désactivé'}
              aria-label="Mode automatique"
            >
              {autoMode ? '⚡' : '🔘'}
            </button>
            <button
              onClick={toggleSound}
              className={`rc-icon-btn ${soundEnabled ? 'is-active' : ''}`}
              title={soundEnabled ? 'Sons activés' : 'Sons désactivés'}
              aria-label="Son"
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            <button
              className="rc-icon-btn"
              onClick={() => window.location.reload()}
              title="Rafraîchir"
              aria-label="Rafraîchir"
            >
              🔄
            </button>
          </div>
        </header>

        {/* Current session card */}
        <section className="card rc-session-card">
          <div className="rc-session-head">
            <span className="rc-session-dot" style={{ backgroundColor: sessionColor }}>
              {current_session.type === 'pause' ? '☕' : '🎯'}
            </span>
            <div className="rc-session-meta">
              <h2>{current_session.nom_session}</h2>
              <p>Session {session_en_cours + 1} / {total_sessions}</p>
            </div>
          </div>

          <div className="rc-ring">
            <svg viewBox="0 0 200 200">
              <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="var(--surface-2)" strokeWidth="12" />
              <circle
                cx="100" cy="100" r={RADIUS} fill="none" stroke={sessionColor}
                strokeWidth="12" strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - (1 - clampedProgress))}
                transform="rotate(-90 100 100)"
                style={{ transition: isPlaying ? 'stroke-dashoffset 1s linear' : 'none' }}
              />
            </svg>
            <div className="rc-ring-text">
              <div className="rc-ring-time">{formatTime(temps_restant)}</div>
              <div className="rc-ring-label">
                {isPlaying ? 'en cours' : isPaused ? 'en pause' : 'terminé'}
              </div>
            </div>
          </div>

          <div className="rc-progress-pct">{progressPercentage}% écoulé</div>
        </section>

        {/* Primary controls */}
        <div className="rc-primary">
          {!isCompleted ? (
            <button
              className="rc-playpause"
              onClick={isPlaying ? handlePause : handleStart}
              style={{ backgroundColor: isPlaying ? 'var(--brand)' : sessionColor }}
            >
              {isPlaying ? (
                <><span className="rc-pp-icon">⏸</span><span>Pause</span></>
              ) : (
                <><span className="rc-pp-icon">▶</span><span>Démarrer</span></>
              )}
            </button>
          ) : (
            <div className="rc-completed">
              <span className="rc-completed-icon">✓</span>
              <span>Toutes les sessions terminées</span>
            </div>
          )}

          <button onClick={playBell} className="rc-bell" title="Sonnerie" aria-label="Sonnerie">
            🔔
          </button>
        </div>

        {/* Navigation */}
        <div className="rc-nav">
          <button
            className="btn btn-secondary btn-lg"
            onClick={handlePrevious}
            disabled={session_en_cours === 0}
          >
            ◀ Précédent
          </button>
          <button
            className="btn btn-secondary btn-lg"
            onClick={handleNext}
            disabled={session_en_cours >= total_sessions - 1}
          >
            Suivant ▶
          </button>
        </div>

        {/* Time adjust */}
        {!isCompleted && (
          <section className="card rc-block">
            <h3 className="rc-block-title">Ajuster le temps</h3>
            <div className="rc-time-grid">
              <button className="rc-time-btn rc-time-neg" onClick={() => handleAddTime(-60)}>−1 min</button>
              <button className="rc-time-btn rc-time-neg" onClick={() => handleAddTime(-30)}>−30 s</button>
              <button className="rc-time-btn rc-time-pos" onClick={() => handleAddTime(30)}>+30 s</button>
              <button className="rc-time-btn rc-time-pos" onClick={() => handleAddTime(60)}>+1 min</button>
            </div>
          </section>
        )}

        {/* Theme */}
        <section className="card rc-block">
          <h3 className="rc-block-title">Thème</h3>
          <div className="rc-theme-grid">
            {themes.map(theme => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className={`rc-theme-btn ${currentTheme === theme.id ? 'is-selected' : ''}`}
              >
                {theme.name}
              </button>
            ))}
          </div>
        </section>

        {/* Message */}
        <section className="card rc-block">
          <h3 className="rc-block-title">Message à l'écran</h3>
          <div className="rc-message-row">
            <input
              className="input"
              type="text"
              placeholder="Message sur l'écran principal..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              className="btn btn-primary"
              onClick={handleSendMessage}
              disabled={!message.trim()}
            >
              Envoyer
            </button>
          </div>
          {state.message_actuel && (
            <div className="rc-message-active">
              <span className="rc-message-text">📢 {state.message_actuel}</span>
              <button className="rc-message-clear" onClick={handleClearMessage} aria-label="Effacer">✕</button>
            </div>
          )}
        </section>

        {/* Stats */}
        {stats && (
          <section className="card rc-block">
            <button className="rc-collapse-head" onClick={() => setShowStats(!showStats)}>
              <span className="rc-block-title">Statistiques</span>
              <span className="rc-collapse-right">
                <span className="rc-stat-pct">{stats.progress_percentage}%</span>
                <span className="rc-chevron">{showStats ? '▼' : '▶'}</span>
              </span>
            </button>
            {showStats && (
              <div className="rc-stats-grid">
                <div className="rc-stat-cell">
                  <div className="rc-stat-label">Sessions</div>
                  <div className="rc-stat-value">{stats.completed_sessions}/{stats.total_sessions}</div>
                </div>
                <div className="rc-stat-cell">
                  <div className="rc-stat-label">Temps écoulé</div>
                  <div className="rc-stat-value">{stats.completed_duration_minutes}/{stats.total_duration_minutes} min</div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Notes */}
        <section className="card rc-block">
          <button className="rc-collapse-head" onClick={() => setShowNotes(!showNotes)}>
            <span className="rc-block-title">Notes de session</span>
            <span className="rc-chevron">{showNotes ? '▼' : '▶'}</span>
          </button>
          {showNotes && (
            <textarea
              className="textarea rc-notes"
              value={notes}
              onChange={handleNotesChange}
              placeholder="Prenez des notes pour cette session..."
            />
          )}
        </section>

        {/* Sessions */}
        <section className="card rc-block">
          <div className="rc-sessions-head">
            <h3 className="rc-block-title">Sessions</h3>
            <div className="rc-sessions-actions">
              <button
                className={`rc-edit-toggle ${editMode ? 'is-active' : ''}`}
                onClick={() => { setEditMode(!editMode); setEditingSession(null); setShowAddSession(false) }}
              >
                {editMode ? '✓ Terminé' : '✎ Modifier'}
              </button>
              {!editMode && (
                <div className="rc-view-toggle">
                  <button
                    className={`rc-view-btn ${viewMode === 'agenda' ? 'is-active' : ''}`}
                    onClick={() => setViewMode('agenda')}
                  >
                    Agenda
                  </button>
                  <button
                    className={`rc-view-btn ${viewMode === 'normal' ? 'is-active' : ''}`}
                    onClick={() => setViewMode('normal')}
                  >
                    Liste
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Edit mode */}
          {editMode ? (
            <div className="rc-edit-list">
              {state.sessions.map((session, idx) => {
                const isEditing = editingSession === idx
                return (
                  <div
                    key={idx}
                    className={`rc-edit-item ${isEditing ? 'is-editing' : ''}`}
                    style={{ borderLeftColor: session.couleur }}
                  >
                    <div className="rc-edit-item-head" onClick={() => setEditingSession(isEditing ? null : idx)}>
                      <span className="rc-edit-color" style={{ backgroundColor: session.couleur }} />
                      <span className="rc-edit-name">{session.nom_session}</span>
                      <span className="rc-edit-dur">{Math.floor(session.duree_secondes / 60)} min</span>
                      <span className="rc-edit-chevron">{isEditing ? '▼' : '▶'}</span>
                    </div>

                    {isEditing && (
                      <div className="rc-edit-form">
                        <div className="rc-edit-field">
                          <label>Nom</label>
                          <input
                            className="input"
                            type="text"
                            defaultValue={session.nom_session}
                            onBlur={(e) => {
                              if (e.target.value.trim() && e.target.value !== session.nom_session) {
                                handleUpdateSession(idx, { nom_session: e.target.value.trim() })
                              }
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }}
                          />
                        </div>
                        <div className="rc-edit-field">
                          <label>Durée (minutes)</label>
                          <input
                            className="input"
                            type="number"
                            min="1"
                            defaultValue={Math.floor(session.duree_secondes / 60)}
                            onBlur={(e) => {
                              const mins = parseInt(e.target.value, 10) || 1
                              if (mins * 60 !== session.duree_secondes) {
                                handleUpdateSession(idx, { duree_secondes: mins * 60 })
                              }
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }}
                          />
                        </div>
                        <div className="rc-edit-field">
                          <label>Type</label>
                          <select
                            className="select"
                            defaultValue={session.type}
                            onChange={(e) => handleUpdateSession(idx, { type: e.target.value })}
                          >
                            <option value="session">Session</option>
                            <option value="pause">Pause</option>
                          </select>
                        </div>
                        <div className="rc-edit-field">
                          <label>Couleur</label>
                          <div className="rc-color-grid">
                            {SESSION_COLORS.map(c => (
                              <button
                                key={c}
                                className={`rc-color-dot ${session.couleur === c ? 'is-selected' : ''}`}
                                style={{ backgroundColor: c }}
                                onClick={() => handleUpdateSession(idx, { couleur: c })}
                              />
                            ))}
                          </div>
                        </div>
                        <button
                          className="btn btn-danger btn-sm rc-edit-delete"
                          onClick={() => handleDeleteSession(idx)}
                          disabled={state.sessions.length <= 1}
                        >
                          Supprimer cette session
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Add session */}
              {showAddSession ? (
                <div className="rc-add-session-form">
                  <div className="rc-edit-field">
                    <label>Nom</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="Ex : Brainstorming"
                      value={newSession.nom_session}
                      onChange={(e) => setNewSession({ ...newSession, nom_session: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddNewSession() }}
                      autoFocus
                    />
                  </div>
                  <div className="rc-add-row">
                    <div className="rc-edit-field" style={{ flex: 1 }}>
                      <label>Durée (min)</label>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        value={newSession.duree_minutes}
                        onChange={(e) => setNewSession({ ...newSession, duree_minutes: parseInt(e.target.value, 10) || 1 })}
                      />
                    </div>
                    <div className="rc-edit-field" style={{ flex: 1 }}>
                      <label>Type</label>
                      <select
                        className="select"
                        value={newSession.type}
                        onChange={(e) => setNewSession({ ...newSession, type: e.target.value, couleur: e.target.value === 'pause' ? '#64748B' : newSession.couleur })}
                      >
                        <option value="session">Session</option>
                        <option value="pause">Pause</option>
                      </select>
                    </div>
                  </div>
                  <div className="rc-edit-field">
                    <label>Couleur</label>
                    <div className="rc-color-grid">
                      {SESSION_COLORS.map(c => (
                        <button
                          key={c}
                          className={`rc-color-dot ${newSession.couleur === c ? 'is-selected' : ''}`}
                          style={{ backgroundColor: c }}
                          onClick={() => setNewSession({ ...newSession, couleur: c })}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="rc-add-actions">
                    <button className="btn btn-primary btn-sm" onClick={handleAddNewSession}>Ajouter</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowAddSession(false)}>Annuler</button>
                  </div>
                </div>
              ) : (
                <button
                  className="rc-add-session-btn"
                  onClick={() => setShowAddSession(true)}
                >
                  + Ajouter une session
                </button>
              )}
            </div>
          ) : viewMode === 'normal' ? (
            <div className="rc-list">
              {state.sessions.map((session, idx) => {
                const done = idx < session_en_cours
                const current = idx === session_en_cours
                return (
                  <button
                    key={idx}
                    onClick={() => handleJumpToSession(idx)}
                    className={`rc-list-item ${current ? 'is-current' : ''} ${done ? 'is-done' : ''}`}
                    style={{ borderLeftColor: session.couleur }}
                  >
                    <span
                      className="rc-list-num"
                      style={current ? { background: session.couleur, color: '#fff' } : undefined}
                    >
                      {done ? '✓' : idx + 1}
                    </span>
                    <span className="rc-list-info">
                      <span className="rc-list-name">{session.nom_session}</span>
                      <span className="rc-list-dur">{Math.floor(session.duree_secondes / 60)} min</span>
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="rc-agenda">
              {state.sessions.map((session, idx) => {
                const isSessionCompleted = idx < session_en_cours
                const isCurrent = idx === session_en_cours
                const isUpcoming = idx > session_en_cours
                let progressPercent = 0
                if (isCurrent && state.current_session) {
                  const et = state.effective_total || Math.max(state.current_session.duree_secondes, temps_restant)
                  const elapsed = et - temps_restant
                  progressPercent = Math.max(0, Math.min(100, (elapsed / et) * 100))
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleJumpToSession(idx)}
                    className={`rc-agenda-item ${isCurrent ? 'is-current' : ''} ${isSessionCompleted ? 'is-done' : ''}`}
                    style={isCurrent ? { borderColor: session.couleur } : undefined}
                  >
                    {isCurrent && (
                      <span
                        className="rc-agenda-fill"
                        style={{
                          width: `${progressPercent}%`,
                          background: `${session.couleur}22`
                        }}
                      />
                    )}
                    <span className="rc-agenda-row">
                      <span
                        className="rc-agenda-num"
                        style={
                          isCurrent
                            ? { background: session.couleur, color: '#fff' }
                            : isSessionCompleted
                              ? { background: 'var(--success)', color: '#fff' }
                              : undefined
                        }
                      >
                        {isSessionCompleted ? '✓' : isUpcoming ? '○' : '▶'}
                      </span>
                      <span className="rc-agenda-info">
                        <span className="rc-agenda-name">
                          {session.nom_session}
                          {session.type === 'pause' && <span> ☕</span>}
                        </span>
                        <span className="rc-agenda-sub">
                          <span>{Math.floor(session.duree_secondes / 60)} min</span>
                          {isSessionCompleted && <span className="rc-tag rc-tag-done">Terminée</span>}
                          {isUpcoming && <span className="rc-tag">À venir</span>}
                        </span>
                      </span>
                      {isCurrent && (
                        <span className="rc-agenda-time">
                          <span className="rc-agenda-time-val">{formatTime(temps_restant)}</span>
                          <span className="rc-agenda-time-pct">{Math.round(progressPercent)}% écoulé</span>
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* Footer */}
        <div className="rc-footer">
          <button className="btn btn-danger btn-lg btn-block" onClick={handleReset}>
            ⏹ Réinitialiser
          </button>
          <a
            className="rc-display-link"
            href={`/timer/${code}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Voir l'affichage ↗
          </a>
          <a
            className="rc-credit"
            href="https://www.insuffle.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Timer par INSUFFLE
          </a>
        </div>
      </div>
    </div>
  )
}

export default RemoteControl
