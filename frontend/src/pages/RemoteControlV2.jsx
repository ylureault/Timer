import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/RemoteControlV2.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export default function RemoteControlV2() {
  const { code } = useParams();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localTime, setLocalTime] = useState(0);
  const [message, setMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const wsRef = useRef(null);
  const timerRef = useRef(null);

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
      return { success: false };
    }
  };

  // Connect WebSocket
  useEffect(() => {
    const connect = () => {
      wsRef.current = new WebSocket(`${WS_URL}?code=${code}`);

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
  const handlePlay = () => apiCall('/start');
  const handlePause = () => apiCall('/pause');
  const handleNext = () => apiCall('/next');
  const handlePrevious = () => apiCall('/previous');
  const handleReset = () => apiCall('/reset');
  const handleAddTime = (seconds) => apiCall('/addtime', 'POST', { seconds });
  const handleGoTo = (index) => apiCall('/goto', 'POST', { sessionIndex: index });
  const handleAutoMode = (enabled) => apiCall('/auto-mode', 'POST', { auto_mode: enabled });

  // Send message
  const sendMessage = () => {
    if (message.trim()) {
      apiCall('/message', 'POST', { message: message.trim() });
      setMessage('');
    }
  };

  const clearMessage = () => {
    apiCall('/message', 'POST', { message: null });
  };

  const currentSession = state?.current_session;
  const sessionColor = currentSession?.couleur || '#667eea';
  const isPlaying = state?.mode === 'play';
  const progress = currentSession
    ? Math.max(0, Math.min(1, localTime / currentSession.duree_secondes))
    : 0;

  if (loading) {
    return (
      <div className="remote-v2 loading">
        <div className="loader"></div>
        <p>Connexion...</p>
      </div>
    );
  }

  return (
    <div className="remote-v2" style={{ '--session-color': sessionColor }}>
      {/* Header */}
      <header className="remote-header">
        <Link to="/" className="back-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </Link>
        <div className="header-info">
          <span className="timer-name">{state?.timer?.name || 'Timer'}</span>
          <span className="timer-code">{code}</span>
        </div>
        <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </header>

      {/* Current session display */}
      <div className="current-session-card" style={{ background: sessionColor }}>
        <div className="session-title">{currentSession?.nom_session || 'Aucune session'}</div>
        <div className="session-progress">
          Session {(state?.session_en_cours || 0) + 1} / {state?.total_sessions || 1}
        </div>
        <div className="timer-display-big">
          {formatTime(localTime)}
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {/* Main controls */}
      <div className="main-controls">
        <button className="control-btn secondary" onClick={handlePrevious}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
          </svg>
        </button>

        <motion.button
          className={`control-btn primary ${isPlaying ? 'pause' : 'play'}`}
          onClick={isPlaying ? handlePause : handlePlay}
          whileTap={{ scale: 0.95 }}
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
        </motion.button>

        <button className="control-btn secondary" onClick={handleNext}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>
      </div>

      {/* Time adjustment */}
      <div className="time-adjust">
        <button onClick={() => handleAddTime(-60)}>-1 min</button>
        <button onClick={() => handleAddTime(-30)}>-30s</button>
        <button onClick={() => handleAddTime(30)}>+30s</button>
        <button onClick={() => handleAddTime(60)}>+1 min</button>
      </div>

      {/* Sessions list */}
      <div className="sessions-list">
        <h3>Sessions</h3>
        <div className="sessions-scroll">
          {state?.sessions?.map((session, index) => (
            <motion.button
              key={index}
              className={`session-item ${index === state.session_en_cours ? 'active' : ''}`}
              onClick={() => handleGoTo(index)}
              whileTap={{ scale: 0.98 }}
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
                <div className="session-current-badge">En cours</div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Message section */}
      <div className="message-section">
        <h3>Message à afficher</h3>
        <div className="message-input-row">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ex: Pause café dans 5 min..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button className="send-btn" onClick={sendMessage}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        {state?.message_actuel && (
          <div className="current-message">
            <span>"{state.message_actuel}"</span>
            <button onClick={clearMessage}>×</button>
          </div>
        )}
      </div>

      {/* Reset button */}
      <button className="reset-btn" onClick={handleReset}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 4v6h6"/>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>
        Recommencer
      </button>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="settings-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <h3>Paramètres</h3>

            <label className="setting-item">
              <span>Mode automatique</span>
              <input
                type="checkbox"
                checked={state?.auto_mode || false}
                onChange={(e) => handleAutoMode(e.target.checked)}
              />
              <span className="toggle"></span>
            </label>

            <div className="display-link">
              <span>Affichage pour participants:</span>
              <a href={`/display/${code}`} target="_blank" rel="noopener noreferrer">
                Ouvrir
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
        )}
      </AnimatePresence>

      {/* Footer branding */}
      <footer className="remote-footer">
        Propulsé par <a href="https://insuffle.be" target="_blank" rel="noopener noreferrer">Insuffle</a>
      </footer>
    </div>
  );
}
