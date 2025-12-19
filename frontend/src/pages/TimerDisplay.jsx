import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/TimerDisplay.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export default function TimerDisplay() {
  const { code } = useParams();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localTime, setLocalTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wsRef = useRef(null);
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  // Calculate progress for TimeTimer style (360° circle)
  const calculateProgress = useCallback(() => {
    if (!state?.current_session) return 0;
    const total = state.current_session.duree_secondes;
    const remaining = localTime;
    return Math.max(0, Math.min(1, remaining / total));
  }, [state, localTime]);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        setError('Connexion perdue, reconnexion...');
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [code]);

  // Local timer countdown
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

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Play end sound
  useEffect(() => {
    if (localTime === 0 && state?.mode === 'play') {
      // Could add sound here
    }
  }, [localTime, state?.mode]);

  const progress = calculateProgress();
  const currentSession = state?.current_session;
  const sessionColor = currentSession?.couleur || '#667eea';

  // SVG circle parameters
  const size = 400;
  const strokeWidth = 40;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  if (loading) {
    return (
      <div className="timer-display loading">
        <div className="loader-ring">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <p>Connexion au timer...</p>
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="timer-display error">
        <h2>Timer non trouvé</h2>
        <p>Le code "{code}" n'existe pas ou a été supprimé.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`timer-display ${state?.mode === 'termine' ? 'completed' : ''}`}
      style={{ '--session-color': sessionColor }}
    >
      {/* Background gradient based on session color */}
      <div
        className="timer-bg"
        style={{
          background: `linear-gradient(135deg, ${sessionColor}22 0%, ${sessionColor}11 100%)`
        }}
      />

      {/* Header with session name FIRST */}
      <header className="timer-header">
        <motion.div
          className="session-name-header"
          key={currentSession?.nom_session}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1>{currentSession?.nom_session || 'Timer'}</h1>
        </motion.div>
        <div className="session-indicator">
          Session {(state?.session_en_cours || 0) + 1} / {state?.total_sessions || 1}
        </div>
      </header>

      {/* Main timer circle - TimeTimer style */}
      <main className="timer-main">
        <motion.div
          className="timer-circle-container"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {/* SVG Circle */}
          <svg className="timer-svg" viewBox={`0 0 ${size} ${size}`}>
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={strokeWidth}
            />
            {/* Progress circle - fills from top, clockwise */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={sessionColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="progress-circle"
            />
            {/* Colored fill segment - like TimeTimer */}
            <path
              d={describeArc(size / 2, size / 2, radius - strokeWidth / 2, 0, 360 * progress)}
              fill={`${sessionColor}33`}
              className="fill-segment"
            />
          </svg>

          {/* Center content */}
          <div className="timer-center">
            <motion.div
              className="timer-time"
              key={localTime}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
            >
              {formatTime(localTime)}
            </motion.div>
            <div className="timer-status">
              {state?.mode === 'play' && 'En cours'}
              {state?.mode === 'pause' && 'Pause'}
              {state?.mode === 'termine' && 'Terminé'}
            </div>
          </div>
        </motion.div>

        {/* Message display */}
        <AnimatePresence>
          {state?.message_actuel && (
            <motion.div
              className="timer-message"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {state.message_actuel}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Sessions progress bar */}
      <div className="sessions-progress">
        {state?.sessions?.map((session, index) => (
          <div
            key={index}
            className={`session-dot ${index === state.session_en_cours ? 'active' : ''} ${index < state.session_en_cours ? 'done' : ''}`}
            style={{ backgroundColor: index <= state.session_en_cours ? session.couleur : '#e2e8f0' }}
            title={session.nom_session}
          />
        ))}
      </div>

      {/* Footer with branding and fullscreen */}
      <footer className="timer-footer">
        <div className="timer-code-display">
          Code: <strong>{code}</strong>
        </div>
        <div className="insuffle-brand">
          Propulsé par <a href="https://insuffle.be" target="_blank" rel="noopener noreferrer">Insuffle</a>
        </div>
        <button className="fullscreen-btn" onClick={toggleFullscreen}>
          {isFullscreen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          )}
        </button>
      </footer>

      {/* Completion animation */}
      <AnimatePresence>
        {state?.mode === 'termine' && (
          <motion.div
            className="completion-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="completion-content"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <div className="completion-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h2>Session terminée !</h2>
              <p>Toutes les sessions sont complétées</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper function to describe an arc path for the fill segment
function describeArc(x, y, radius, startAngle, endAngle) {
  if (endAngle <= 0) return '';

  const start = polarToCartesian(x, y, radius, endAngle - 90);
  const end = polarToCartesian(x, y, radius, startAngle - 90);
  const largeArcFlag = endAngle <= 180 ? '0' : '1';

  return [
    'M', x, y,
    'L', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    'Z'
  ].join(' ');
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}
