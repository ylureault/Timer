import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/RemoteControlV2.css';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
};

// Animated background orb
const Orb = ({ delay, size, color, x, y }) => (
  <motion.div
    className="remote-orb"
    style={{
      width: size,
      height: size,
      background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
      left: x,
      top: y
    }}
    animate={{
      x: [0, 30, -20, 0],
      y: [0, -25, 40, 0],
      scale: [1, 1.1, 0.95, 1]
    }}
    transition={{
      duration: 15,
      delay,
      repeat: Infinity,
      ease: 'easeInOut'
    }}
  />
);

// Circular progress component
const CircularProgress = ({ progress, color, size = 180 }) => {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <svg className="circular-progress" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="8"
      />
      {/* Progress circle */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        initial={false}
        animate={{ strokeDashoffset }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      {/* Inner glow */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius - 15}
        fill="none"
        stroke={`${color}20`}
        strokeWidth="30"
        filter="blur(10px)"
      />
    </svg>
  );
};

// Control button with ripple effect
const ControlButton = ({ onClick, children, variant = 'secondary', disabled, className = '' }) => {
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    if (disabled) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples(prev => [...prev, { x, y, id }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);

    onClick?.();
  };

  return (
    <motion.button
      className={`control-btn ${variant} ${className}`}
      onClick={handleClick}
      whileTap={{ scale: 0.92 }}
      disabled={disabled}
    >
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="ripple"
          style={{ left: ripple.x, top: ripple.y }}
        />
      ))}
      {children}
    </motion.button>
  );
};

export default function RemoteControlV2() {
  const { code } = useParams();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localTime, setLocalTime] = useState(0);
  const [message, setMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const wsRef = useRef(null);
  const timerRef = useRef(null);

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show action feedback
  const showFeedback = (text, type = 'success') => {
    setActionFeedback({ text, type });
    setTimeout(() => setActionFeedback(null), 1500);
  };

  // API call helper
  const apiCall = async (endpoint, method = 'POST', body = null) => {
    try {
      const res = await fetch(`${API_URL}/api/timer/${code}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : null
      });
      return await res.json();
    } catch (err) {
      console.error('API error:', err);
      showFeedback('Erreur de connexion', 'error');
      return { success: false };
    }
  };

  // Connect WebSocket
  useEffect(() => {
    const connect = () => {
      wsRef.current = new WebSocket(`${getWsUrl()}?code=${code}`);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setError(null);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'state') {
            setState(data);
            setLocalTime(data.temps_restant);
            setLoading(false);
          }
        } catch (err) {
          console.error('Parse error:', err);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected, reconnecting...');
        setTimeout(connect, 2000);
      };

      wsRef.current.onerror = () => {
        setError('Connexion perdue');
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [code]);

  // Local timer
  useEffect(() => {
    if (state?.mode === 'play') {
      timerRef.current = setInterval(() => {
        setLocalTime((prev) => Math.max(0, prev - 1));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [state?.mode]);

  // Timer controls
  const handlePlay = () => {
    apiCall('/start');
    showFeedback('▶ Lecture');
  };

  const handlePause = () => {
    apiCall('/pause');
    showFeedback('⏸ Pause');
  };

  const handleNext = () => {
    apiCall('/next');
    showFeedback('⏭ Session suivante');
  };

  const handlePrevious = () => {
    apiCall('/previous');
    showFeedback('⏮ Session précédente');
  };

  const handleReset = () => {
    apiCall('/reset');
    showFeedback('🔄 Réinitialisé');
  };

  const handleAddTime = (seconds) => {
    apiCall('/addtime', 'POST', { seconds });
    showFeedback(seconds > 0 ? `+${seconds}s` : `${seconds}s`);
  };

  const handleGoTo = (index) => {
    apiCall('/goto', 'POST', { sessionIndex: index });
    showFeedback(`Session ${index + 1}`);
  };

  const handleAutoMode = (enabled) => {
    apiCall('/auto-mode', 'POST', { auto_mode: enabled });
    showFeedback(enabled ? 'Mode auto activé' : 'Mode auto désactivé');
  };

  // Send message
  const sendMessage = () => {
    if (message.trim()) {
      apiCall('/message', 'POST', { message: message.trim() });
      setMessage('');
      showFeedback('📨 Message envoyé');
    }
  };

  const clearMessage = () => {
    apiCall('/message', 'POST', { message: null });
    showFeedback('Message effacé');
  };

  const currentSession = state?.current_session;
  const sessionColor = currentSession?.couleur || '#6C5CE7';
  const isPlaying = state?.mode === 'play';
  const progress = currentSession
    ? Math.max(0, Math.min(1, localTime / currentSession.duree_secondes))
    : 0;

  const isLowTime = localTime > 0 && localTime <= 30;
  const isCritical = localTime > 0 && localTime <= 10;

  if (loading) {
    return (
      <div className="remote-v2 loading">
        <div className="remote-bg">
          <Orb delay={0} size="300px" color="#6C5CE7" x="-20%" y="10%" />
          <Orb delay={2} size="250px" color="#00CEC9" x="70%" y="60%" />
        </div>
        <motion.div
          className="loading-spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Connexion en cours...
        </motion.p>
      </div>
    );
  }

  return (
    <div className="remote-v2" style={{ '--session-color': sessionColor }}>
      {/* Animated background */}
      <div className="remote-bg">
        <Orb delay={0} size="350px" color={sessionColor} x="-15%" y="-10%" />
        <Orb delay={3} size="280px" color="#00CEC9" x="75%" y="50%" />
        <Orb delay={6} size="200px" color="#FF6B6B" x="60%" y="80%" />
      </div>

      {/* Action feedback toast */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div
            className={`action-feedback ${actionFeedback.type}`}
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
          >
            {actionFeedback.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="remote-header">
        <Link to="/" className="back-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </Link>
        <motion.div
          className="header-info"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="timer-name">{state?.timer?.name || 'Timer'}</span>
          <span className="timer-code">Code: {code}</span>
        </motion.div>
        <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </header>

      {/* Timer display with circular progress */}
      <motion.div
        className={`timer-card ${isLowTime ? 'low-time' : ''} ${isCritical ? 'critical' : ''}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="timer-card-header">
          <span className="session-name">{currentSession?.nom_session || 'Aucune session'}</span>
          <span className="session-counter">
            Session {(state?.session_en_cours || 0) + 1} / {state?.total_sessions || 1}
          </span>
        </div>

        <div className="timer-circle-container">
          <CircularProgress progress={progress} color={sessionColor} size={180} />
          <div className="timer-value-overlay">
            <motion.span
              className="timer-big"
              animate={isCritical ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.5, repeat: isCritical ? Infinity : 0 }}
            >
              {formatTime(localTime)}
            </motion.span>
            <span className={`timer-status ${isPlaying ? 'playing' : 'paused'}`}>
              {isPlaying ? '● EN COURS' : '○ PAUSE'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Main controls */}
      <motion.div
        className="main-controls"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <ControlButton onClick={handlePrevious} variant="secondary">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
          </svg>
        </ControlButton>

        <ControlButton
          onClick={isPlaying ? handlePause : handlePlay}
          variant="primary"
          className={isPlaying ? 'pause' : 'play'}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6zM14 4h4v16h-4z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </ControlButton>

        <ControlButton onClick={handleNext} variant="secondary">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </ControlButton>
      </motion.div>

      {/* Time adjustment */}
      <motion.div
        className="time-adjust"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <button onClick={() => handleAddTime(-60)}>-1 min</button>
        <button onClick={() => handleAddTime(-30)}>-30s</button>
        <button onClick={() => handleAddTime(30)}>+30s</button>
        <button onClick={() => handleAddTime(60)}>+1 min</button>
      </motion.div>

      {/* Sessions list */}
      <motion.div
        className="sessions-list"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <h3>Sessions</h3>
        <div className="sessions-scroll">
          {state?.sessions?.map((session, index) => (
            <motion.button
              key={index}
              className={`session-item ${index === state.session_en_cours ? 'active' : ''}`}
              onClick={() => handleGoTo(index)}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.05 }}
            >
              <div
                className="session-color"
                style={{ backgroundColor: session.couleur }}
              />
              <div className="session-info">
                <span className="session-name">{session.nom_session}</span>
                <span className="session-duration">{formatTime(session.duree_secondes)}</span>
              </div>
              {index === state.session_en_cours && (
                <motion.div
                  className="session-current-badge"
                  layoutId="active-badge"
                >
                  En cours
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Message section */}
      <motion.div
        className="message-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <h3>📢 Message pour l'écran</h3>
        <div className="message-input-row">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ex: Pause café dans 5 min..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <motion.button
            className="send-btn"
            onClick={sendMessage}
            whileTap={{ scale: 0.95 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </motion.button>
        </div>
        <AnimatePresence>
          {state?.message_actuel && (
            <motion.div
              className="current-message"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <span>"{state.message_actuel}"</span>
              <button onClick={clearMessage}>×</button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Reset button */}
      <motion.button
        className="reset-btn"
        onClick={handleReset}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 4v6h6"/>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>
        Recommencer depuis le début
      </motion.button>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              className="settings-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              className="settings-panel"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="settings-handle" />
              <h3>⚙️ Paramètres</h3>

              <label className="setting-item">
                <span>Mode automatique</span>
                <span className="setting-desc">Passer automatiquement à la session suivante</span>
                <input
                  type="checkbox"
                  checked={state?.auto_mode || false}
                  onChange={(e) => handleAutoMode(e.target.checked)}
                />
                <span className="toggle"></span>
              </label>

              <div className="display-link">
                <span>🖥️ Affichage pour participants</span>
                <a href={`/display/${code}`} target="_blank" rel="noopener noreferrer">
                  Ouvrir dans un nouvel onglet
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              </div>

              <button className="close-settings" onClick={() => setShowSettings(false)}>
                Fermer
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer branding */}
      <footer className="remote-footer">
        <span>Propulsé par</span>
        <a href="https://insuffle.be" target="_blank" rel="noopener noreferrer">
          Insuffle
        </a>
      </footer>
    </div>
  );
}
