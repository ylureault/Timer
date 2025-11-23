import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { saveSessionNotes, getSessionNotes, calculateStats } from '../utils/features'
import '../styles/RemoteControl.css'

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
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('display_theme') || 'luxe')
  const [message, setMessage] = useState('')
  const [viewMode, setViewMode] = useState('agenda') // 'normal' or 'agenda' - for local remote view
  const [autoMode, setAutoMode] = useState(false) // Auto-advance to next session when current ends
  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('sound_enabled') === 'true')
  const [isScrolled, setIsScrolled] = useState(false)
  const pollingInterval = useRef(null)
  const themeChannel = useRef(null)
  const previousTimeRef = useRef(null)
  const audioContextRef = useRef(null)

  // Initialize BroadcastChannel for reliable cross-tab communication
  useEffect(() => {
    themeChannel.current = new BroadcastChannel('salon-theme-channel')
    console.log('🔌 RemoteControl: BroadcastChannel initialized')

    // Listen for theme changes from other tabs
    themeChannel.current.onmessage = (event) => {
      if (event.data.type === 'theme-change') {
        setCurrentTheme(event.data.theme)
        console.log('📡 RemoteControl: Theme received via BroadcastChannel:', event.data.theme)
      }
    }

    return () => {
      if (themeChannel.current) {
        themeChannel.current.close()
        console.log('🔌 RemoteControl: BroadcastChannel closed')
      }
    }
  }, [])

  // Initialize Audio Context
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    return audioContextRef.current
  }

  // Play a short beep sound (for time changes)
  const playBeep = () => {
    if (!soundEnabled) return

    try {
      const audioContext = getAudioContext()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800 // Hz
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
    } catch (err) {
      console.error('Error playing beep:', err)
    }
  }

  // Play a bell sound (manual alert)
  const playBell = async () => {
    try {
      const audioContext = getAudioContext()

      // Resume AudioContext if suspended (browser autoplay policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      // Create a bell-like sound with multiple frequencies
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

      showFeedback('🔔 Ding!')
    } catch (err) {
      console.error('Error playing bell:', err)
      showFeedback('❌ Erreur son')
    }
  }

  // Toggle sound on/off
  const toggleSound = () => {
    const newValue = !soundEnabled
    setSoundEnabled(newValue)
    localStorage.setItem('sound_enabled', newValue.toString())
    showFeedback(newValue ? '🔊 Sons activés' : '🔇 Sons désactivés')

    // Play a test beep if enabling
    if (newValue) {
      setTimeout(playBeep, 100)
    }
  }

  // Detect time changes and play sound
  useEffect(() => {
    if (!state || !soundEnabled) return

    const currentTime = state.temps_restant

    // If time changed (not just first load)
    if (previousTimeRef.current !== null && previousTimeRef.current !== currentTime) {
      playBeep()
    }

    previousTimeRef.current = currentTime
  }, [state?.temps_restant, soundEnabled])

  // Track scroll position for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleThemeChange = async (newTheme) => {
    console.log('🎨 RemoteControl: Changing theme to:', newTheme)
    setCurrentTheme(newTheme)

    // Save to database via API (primary method)
    try {
      const response = await fetch(`/api/salon/${code}/theme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme })
      })

      if (response.ok) {
        console.log('✅ RemoteControl: Theme saved to database:', newTheme)
        showFeedback('✓ Thème changé')

        // Also save to localStorage for backward compatibility
        localStorage.setItem('display_theme', newTheme)

        // Broadcast to other tabs
        if (themeChannel.current) {
          themeChannel.current.postMessage({ type: 'theme-change', theme: newTheme })
        }

        fetchState() // Refresh state immediately
      } else {
        console.error('❌ RemoteControl: Failed to save theme to database')
        showFeedback('✗ Erreur')
      }
    } catch (err) {
      console.error('Error changing theme:', err)
      showFeedback('✗ Erreur')
    }
  }

  const themes = [
    { id: 'gradient', name: 'Gradient', desc: 'Fond = jauge', emoji: '🌅', color: '#8B5CF6' },
    { id: 'applat', name: 'Applat', desc: 'Barre sobre', emoji: '▬', color: '#3B82F6' },
    { id: 'luxe', name: 'Luxe', desc: 'Montre', emoji: '⌚', color: '#888' },
    { id: 'neon', name: 'Néon', desc: 'Cyber', emoji: '▭', color: '#00d9ff' },
    { id: 'aurora', name: 'Aurora', desc: 'Radial', emoji: '◉', color: '#ec4899' }
  ]

  const fetchState = async () => {
    try {
      const response = await fetch(`/api/salon/${code}/state`)
      const data = await response.json()

      if (data.success) {
        setState(data)
        setError(null)

        // Sync theme from database
        if (data.theme_actif && data.theme_actif !== currentTheme) {
          setCurrentTheme(data.theme_actif)
          localStorage.setItem('display_theme', data.theme_actif)
        }

        // Sync auto mode from database
        if (data.auto_mode !== undefined) {
          setAutoMode(data.auto_mode)
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
    pollingInterval.current = setInterval(fetchState, 500) // 500ms for remote control

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
      }
    }
  }, [code])

  // Load notes when session changes
  useEffect(() => {
    if (state && state.current_session) {
      const sessionId = state.session_en_cours
      const loadedNotes = getSessionNotes(code, sessionId)
      setNotes(loadedNotes)
    }
  }, [state?.session_en_cours, code])

  // Calculate statistics
  useEffect(() => {
    if (state && state.sessions) {
      const completedSessions = state.sessions.slice(0, state.session_en_cours)
      const statsData = calculateStats(state.sessions, completedSessions)
      setStats(statsData)
    }
  }, [state])

  // Handle notes save
  const handleNotesChange = (e) => {
    const newNotes = e.target.value
    setNotes(newNotes)
    if (state) {
      saveSessionNotes(code, state.session_en_cours, newNotes)
    }
  }

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

  // Jump to a specific session and start it
  const handleJumpToSession = async (sessionIndex) => {
    if (sessionIndex === session_en_cours) {
      // Already on this session, just ensure it's started
      if (!isPlaying) {
        handleStart()
      }
      return
    }

    try {
      // First, navigate to the session
      const direction = sessionIndex > session_en_cours ? 'next' : 'previous'
      const steps = Math.abs(sessionIndex - session_en_cours)

      // Call next/previous multiple times to reach target session
      for (let i = 0; i < steps; i++) {
        await handleAction(direction)
        await new Promise(resolve => setTimeout(resolve, 100)) // Small delay between steps
      }

      // Then start the session
      setTimeout(() => {
        handleStart()
        showFeedback(`✓ Session ${sessionIndex + 1} lancée`)
      }, 200)
    } catch (err) {
      console.error('Error jumping to session:', err)
      showFeedback('✗ Erreur')
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim()) return
    try {
      const response = await fetch(`/api/salon/${code}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() })
      })
      if (response.ok) {
        setMessage('')
        showFeedback('✓ Message envoyé')
      } else {
        showFeedback('✗ Erreur')
      }
    } catch (err) {
      console.error('Error sending message:', err)
      showFeedback('✗ Erreur')
    }
  }

  const handleClearMessage = async () => {
    try {
      const response = await fetch(`/api/salon/${code}/message/clear`, { method: 'POST' })
      if (response.ok) {
        showFeedback('✓ Message effacé')
      } else {
        showFeedback('✗ Erreur')
      }
    } catch (err) {
      console.error('Error clearing message:', err)
      showFeedback('✗ Erreur')
    }
  }

  const handleDisplayModeChange = async (newMode) => {
    try {
      const response = await fetch(`/api/salon/${code}/display-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode })
      })

      if (response.ok) {
        showFeedback('✓ Mode changé')
        fetchState() // Refresh state immediately
      } else {
        showFeedback('✗ Erreur')
      }
    } catch (err) {
      console.error('Error changing display mode:', err)
      showFeedback('✗ Erreur')
    }
  }

  const handleAutoModeToggle = async () => {
    const newAutoMode = !autoMode
    setAutoMode(newAutoMode)

    try {
      const response = await fetch(`/api/salon/${code}/auto-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_mode: newAutoMode })
      })

      if (response.ok) {
        showFeedback(newAutoMode ? '✓ Mode AUTO activé' : '✓ Mode AUTO désactivé')
      } else {
        showFeedback('✗ Erreur')
        setAutoMode(!newAutoMode) // Revert on error
      }
    } catch (err) {
      console.error('Error toggling auto mode:', err)
      showFeedback('✗ Erreur')
      setAutoMode(!newAutoMode) // Revert on error
    }
  }

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

      {/* Sticky Header - Appears on scroll */}
      {isScrolled && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: 'linear-gradient(135deg, var(--brand-dark) 0%, var(--brand-primary) 100%)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '900',
              color: 'white'
            }}>
              {formatTime(temps_restant)}
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.9rem', fontWeight: '600' }}>
              {current_session.nom_session}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.7)',
              fontWeight: '600'
            }}>
              Session {session_en_cours + 1}/{total_sessions}
            </div>
            {!isCompleted && (
              <button
                onClick={isPlaying ? handlePause : handleStart}
                style={{
                  padding: '6px 12px',
                  background: isPlaying ? 'rgba(255, 255, 255, 0.2)' : current_session.couleur,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.8rem'
                }}
              >
                {isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="remote-header">
        <div className="salon-info">
          <h3>Télécommande</h3>
          <p>Code: {state.salon.code}</p>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={handleAutoModeToggle}
            className="header-btn-compact"
            style={{
              background: autoMode ? 'var(--brand-primary)' : 'rgba(255, 255, 255, 0.1)',
              borderColor: autoMode ? 'var(--brand-primary)' : 'rgba(255, 255, 255, 0.3)'
            }}
            title={autoMode ? 'Mode AUTO activé' : 'Mode AUTO désactivé'}
          >
            {autoMode ? '⚡' : '🔘'}
          </button>
          <button
            onClick={toggleSound}
            className="header-btn-compact"
            style={{
              background: soundEnabled ? 'var(--brand-primary)' : 'rgba(255, 255, 255, 0.1)',
              borderColor: soundEnabled ? 'var(--brand-primary)' : 'rgba(255, 255, 255, 0.3)'
            }}
            title={soundEnabled ? 'Sons activés' : 'Sons désactivés'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <button
            className="btn-icon"
            onClick={() => navigate(`/admin/${state.salon.code}`)}
            title="Modifier"
          >
            ✏️
          </button>
          <button className="btn-icon" onClick={() => window.location.reload()}>
            🔄
          </button>
        </div>
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
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%' }}>
          {!isCompleted && (
            <button
              className={`btn-control btn-play-pause ${isPlaying ? 'playing' : ''}`}
              onClick={isPlaying ? handlePause : handleStart}
              style={{ backgroundColor: current_session.couleur, flex: 1 }}
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
            <div className="completed-message" style={{ flex: 1 }}>
              <span className="completed-icon">✓</span>
              <span>Toutes les sessions terminées</span>
            </div>
          )}

          <button
            onClick={playBell}
            style={{
              padding: '16px',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '1.5rem',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
              minWidth: '64px'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            title="Sonnerie - Faire sonner la cloche pour alerter"
          >
            🔔
          </button>
        </div>
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
          <div className="time-buttons-grid">
            <button
              className="btn-time btn-time-negative"
              onClick={() => handleAddTime(-60)}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                borderColor: 'rgba(239, 68, 68, 0.3)'
              }}
            >
              -1 min
            </button>
            <button
              className="btn-time btn-time-negative"
              onClick={() => handleAddTime(-30)}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                borderColor: 'rgba(239, 68, 68, 0.3)'
              }}
            >
              -30 sec
            </button>
            <button
              className="btn-time btn-time-positive"
              onClick={() => handleAddTime(30)}
              style={{
                background: 'rgba(34, 197, 94, 0.15)',
                borderColor: 'rgba(34, 197, 94, 0.3)'
              }}
            >
              +30 sec
            </button>
            <button
              className="btn-time btn-time-positive"
              onClick={() => handleAddTime(60)}
              style={{
                background: 'rgba(34, 197, 94, 0.15)',
                borderColor: 'rgba(34, 197, 94, 0.3)'
              }}
            >
              +1 min
            </button>
          </div>
        </div>
      )}

      {/* Theme Selector */}
      <div className="theme-selector-section" style={{
        background: 'var(--brand-card)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        boxShadow: '0 4px 12px rgba(31, 58, 139, 0.3)',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-white)', fontSize: '0.9rem' }}>
          <span style={{ fontSize: '1rem' }}>🎨</span>
          <span>Thème</span>
        </h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px'
        }}>
          {themes.map(theme => (
            <button
              key={theme.id}
              onClick={() => handleThemeChange(theme.id)}
              style={{
                padding: '10px 6px',
                background: currentTheme === theme.id ? 'var(--brand-primary)' : 'rgba(31, 58, 139, 0.1)',
                color: currentTheme === theme.id ? 'white' : 'var(--text-white)',
                border: '2px solid',
                borderColor: currentTheme === theme.id ? 'var(--brand-primary)' : 'rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center',
                fontSize: '0.8rem',
                fontWeight: '600',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>{theme.emoji}</span>
              <span style={{ fontSize: '0.7rem' }}>{theme.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Display Mode Toggle */}
      <div style={{
        background: 'var(--brand-card)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        boxShadow: '0 4px 12px rgba(31, 58, 139, 0.3)',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-white)', fontSize: '0.9rem' }}>
          <span style={{ fontSize: '1rem' }}>📺</span>
          <span>Affichage principal</span>
        </h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px'
        }}>
          <button
            onClick={() => handleDisplayModeChange('timer')}
            style={{
              padding: '10px',
              background: state?.mode_affichage === 'timer' || !state?.mode_affichage ? 'var(--brand-primary)' : 'rgba(31, 58, 139, 0.1)',
              color: state?.mode_affichage === 'timer' || !state?.mode_affichage ? 'white' : 'var(--text-white)',
              border: '2px solid',
              borderColor: state?.mode_affichage === 'timer' || !state?.mode_affichage ? 'var(--brand-primary)' : 'rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center',
              fontSize: '0.85rem',
              fontWeight: '600',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px'
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>⏱️</span>
            <span>Timer</span>
          </button>
          <button
            onClick={() => handleDisplayModeChange('list')}
            style={{
              padding: '10px',
              background: state?.mode_affichage === 'list' ? 'var(--brand-primary)' : 'rgba(31, 58, 139, 0.1)',
              color: state?.mode_affichage === 'list' ? 'white' : 'var(--text-white)',
              border: '2px solid',
              borderColor: state?.mode_affichage === 'list' ? 'var(--brand-primary)' : 'rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center',
              fontSize: '0.85rem',
              fontWeight: '600',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px'
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>📋</span>
            <span>Liste</span>
          </button>
        </div>
      </div>

      {/* Message Broadcasting Section */}
      <div className="message-section" style={{
        background: 'var(--brand-card)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 4px 12px rgba(31, 58, 139, 0.3)',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-white)' }}>
          <span>📢</span>
          <span>Envoyer un message</span>
        </h4>
        <div style={{ display: 'flex', gap: '8px', marginBottom: state.message_actuel ? '12px' : '0' }}>
          <input
            type="text"
            placeholder="Message à afficher sur l'écran principal..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            style={{
              flex: 1,
              padding: '12px',
              border: '2px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              fontSize: '0.9375rem',
              fontFamily: 'inherit',
              background: 'rgba(31, 58, 139, 0.1)',
              color: 'var(--text-white)'
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            style={{
              padding: '12px 20px',
              background: message.trim() ? 'var(--brand-primary)' : 'rgba(100, 116, 139, 0.3)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: message.trim() ? 'pointer' : 'not-allowed',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            Envoyer
          </button>
        </div>
        {state.message_actuel && (
          <div style={{
            padding: '12px',
            background: 'rgba(255, 222, 89, 0.15)',
            border: '2px solid var(--brand-accent)',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: '600', color: 'var(--text-white)' }}>📢 {state.message_actuel}</span>
            <button onClick={handleClearMessage} style={{
              padding: '4px 12px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'var(--text-white)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '600'
            }}>
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Statistics Section - Collapsible */}
      {stats && (
        <div className="stats-section" style={{
          background: 'var(--brand-card)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          boxShadow: '0 4px 12px rgba(31, 58, 139, 0.3)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <h4 style={{
            marginBottom: showStats ? '12px' : '0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            color: 'var(--text-white)'
          }} onClick={() => setShowStats(!showStats)}>
            <span>📊 Statistiques</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '1.5rem',
                fontWeight: '900',
                color: 'var(--brand-accent)'
              }}>
                {stats.progress_percentage}%
              </span>
              <span style={{ fontSize: '1.25rem' }}>{showStats ? '▼' : '▶'}</span>
            </div>
          </h4>
          {showStats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px'
            }}>
              <div style={{
                padding: '8px',
                background: 'rgba(31, 58, 139, 0.15)',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                  Sessions
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-white)' }}>
                  {stats.completed_sessions}/{stats.total_sessions}
                </div>
              </div>
              <div style={{
                padding: '8px',
                background: 'rgba(31, 58, 139, 0.15)',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                  Temps écoulé
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-white)' }}>
                  {stats.completed_duration_minutes}/{stats.total_duration_minutes} min
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes Section */}
      <div className="notes-section" style={{
        background: 'var(--brand-card)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 4px 12px rgba(31, 58, 139, 0.3)',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <h4 style={{
          marginBottom: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          color: 'var(--text-white)'
        }} onClick={() => setShowNotes(!showNotes)}>
          <span>📝 Notes de session</span>
          <span style={{ fontSize: '1.5rem' }}>{showNotes ? '▼' : '▶'}</span>
        </h4>
        {showNotes && (
          <textarea
            value={notes}
            onChange={handleNotesChange}
            placeholder="Prenez des notes pour cette session..."
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px',
              border: '2px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              fontSize: '0.9375rem',
              fontFamily: 'inherit',
              resize: 'vertical',
              background: 'rgba(31, 58, 139, 0.1)',
              color: 'var(--text-white)'
            }}
          />
        )}
      </div>

      {/* Sessions View - Toggle between Normal and Agenda */}
      <div style={{
        background: 'var(--brand-card)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 4px 12px rgba(31, 58, 139, 0.3)',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h4 style={{ margin: 0, color: 'var(--text-white)' }}>📋 Sessions</h4>
          <div style={{
            display: 'flex',
            gap: '8px',
            background: 'rgba(31, 58, 139, 0.2)',
            padding: '4px',
            borderRadius: '8px'
          }}>
            <button
              onClick={() => setViewMode('normal')}
              style={{
                padding: '8px 16px',
                background: viewMode === 'normal' ? 'var(--brand-primary)' : 'transparent',
                color: viewMode === 'normal' ? 'white' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem',
                transition: 'all 0.2s'
              }}
            >
              📑 Normal
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              style={{
                padding: '8px 16px',
                background: viewMode === 'agenda' ? 'var(--brand-primary)' : 'transparent',
                color: viewMode === 'agenda' ? 'white' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem',
                transition: 'all 0.2s'
              }}
            >
              📅 Agenda
            </button>
          </div>
        </div>

        {viewMode === 'normal' ? (
          // Vue normale (liste compacte) - DÉSACTIVÉE, on affiche toujours la vue agenda
          <div className="sessions-scroll" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {state.sessions.map((session, idx) => (
              <div
                key={idx}
                onClick={() => handleJumpToSession(idx)}
                className={`session-item-remote ${idx === session_en_cours ? 'active' : ''} ${idx < session_en_cours ? 'completed' : ''}`}
                style={{
                  borderLeft: `4px solid ${session.couleur}`,
                  padding: '12px',
                  marginBottom: '8px',
                  borderRadius: '8px',
                  background: idx === session_en_cours
                    ? 'rgba(59, 130, 246, 0.15)'
                    : idx < session_en_cours
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'rgba(31, 58, 139, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '1rem',
                  background: idx === session_en_cours
                    ? 'var(--brand-accent)'
                    : idx < session_en_cours
                    ? '#ef4444'
                    : 'rgba(100, 116, 139, 0.3)',
                  color: idx === session_en_cours ? 'var(--brand-dark)' : 'white'
                }}>
                  {idx < session_en_cours ? '✓' : idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: '600',
                    color: 'var(--text-white)',
                    marginBottom: '2px'
                  }}>
                    {session.nom_session}
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)'
                  }}>
                    {Math.floor(session.duree_secondes / 60)} min
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Vue AGENDA (planning vertical avec jauges)
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {state.sessions.map((session, idx) => {
              const isCompleted = idx < session_en_cours
              const isCurrent = idx === session_en_cours
              const isUpcoming = idx > session_en_cours

              // Calcul de la progression pour la session en cours
              let progressPercent = 0
              if (isCurrent && state.current_session) {
                const elapsed = state.current_session.duree_secondes - temps_restant
                progressPercent = (elapsed / state.current_session.duree_secondes) * 100
              }

              return (
                <div
                  key={idx}
                  onClick={() => handleJumpToSession(idx)}
                  style={{
                    position: 'relative',
                    padding: '16px',
                    borderRadius: '12px',
                    border: `2px solid ${isCurrent ? session.couleur : 'rgba(59, 130, 246, 0.2)'}`,
                    background: isCompleted
                      ? 'rgba(239, 68, 68, 0.1)'
                      : isCurrent
                      ? 'rgba(31, 58, 139, 0.15)'
                      : 'rgba(100, 116, 139, 0.05)',
                    overflow: 'hidden',
                    boxShadow: isCurrent
                      ? `0 0 20px ${session.couleur}40`
                      : '0 2px 8px rgba(0,0,0,0.1)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)'
                    e.currentTarget.style.boxShadow = `0 4px 20px ${session.couleur}30`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = isCurrent ? `0 0 20px ${session.couleur}40` : '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  {/* Jauge de progression pour session en cours */}
                  {isCurrent && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${progressPercent}%`,
                        background: `linear-gradient(90deg, ${session.couleur}20, ${session.couleur}40)`,
                        transition: 'width 0.3s ease',
                        zIndex: 0
                      }}
                    />
                  )}

                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Icône de statut */}
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '900',
                      fontSize: '1.5rem',
                      background: isCompleted
                        ? '#ef4444'
                        : isCurrent
                        ? session.couleur
                        : 'rgba(100, 116, 139, 0.3)',
                      color: isCompleted || isCurrent ? 'white' : 'rgba(255,255,255,0.5)',
                      boxShadow: isCurrent ? `0 0 15px ${session.couleur}60` : 'none',
                      flexShrink: 0
                    }}>
                      {isCompleted ? '✓' : isUpcoming ? '⭕' : '▶'}
                    </div>

                    {/* Infos session */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: '700',
                        fontSize: '1.125rem',
                        color: 'var(--text-white)',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span>{session.nom_session}</span>
                        {session.type === 'pause' && <span>☕</span>}
                        {session.type === 'travail' && <span>🎯</span>}
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center'
                      }}>
                        <span>⏱ {Math.floor(session.duree_secondes / 60)} min</span>
                        {isCompleted && <span style={{ color: '#ef4444', fontWeight: '600' }}>✓ Terminée</span>}
                        {isUpcoming && <span style={{ color: 'var(--text-muted)' }}>À venir</span>}
                      </div>
                    </div>

                    {/* Temps restant pour session en cours */}
                    {isCurrent && (
                      <div style={{
                        textAlign: 'right',
                        flexShrink: 0
                      }}>
                        <div style={{
                          fontSize: '2rem',
                          fontWeight: '900',
                          color: 'var(--brand-accent)',
                          lineHeight: 1,
                          fontVariantNumeric: 'tabular-nums',
                          textShadow: '0 0 10px rgba(255, 222, 89, 0.5)'
                        }}>
                          {formatTime(temps_restant)}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          marginTop: '4px',
                          fontWeight: '600'
                        }}>
                          {Math.round(progressPercent)}% écoulé
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
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

      {/* Crédit Insuffle */}
      <div className="insuffle-credit">Créé par Insuffle</div>
    </div>
  )
}

export default RemoteControl
