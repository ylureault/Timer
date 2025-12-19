import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/TimerDisplay.css';

const API_URL = import.meta.env.VITE_API_URL ?? '';

// Visual themes configuration
const VISUAL_THEMES = {
  cinematic: {
    id: 'cinematic',
    background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    textColor: '#ffffff',
    particleColors: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181']
  },
  neon: {
    id: 'neon',
    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 100%)',
    textColor: '#00ffff',
    particleColors: ['#00ffff', '#ff00ff', '#00ff00', '#ffff00', '#ff6600']
  },
  minimal: {
    id: 'minimal',
    background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
    textColor: '#1e293b',
    particleColors: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
  },
  nature: {
    id: 'nature',
    background: 'linear-gradient(135deg, #134e4a 0%, #065f46 50%, #064e3b 100%)',
    textColor: '#ecfdf5',
    particleColors: ['#34d399', '#a7f3d0', '#6ee7b7', '#10b981', '#059669']
  },
  sunset: {
    id: 'sunset',
    background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #831843 100%)',
    textColor: '#fef3c7',
    particleColors: ['#f59e0b', '#ec4899', '#f472b6', '#fbbf24', '#fb7185']
  },
  ocean: {
    id: 'ocean',
    background: 'linear-gradient(180deg, #0c4a6e 0%, #075985 50%, #0369a1 100%)',
    textColor: '#e0f2fe',
    particleColors: ['#38bdf8', '#06b6d4', '#22d3ee', '#0ea5e9', '#0284c7']
  },
  fire: {
    id: 'fire',
    background: 'linear-gradient(180deg, #1a0a0a 0%, #450a0a 50%, #7f1d1d 100%)',
    textColor: '#fef2f2',
    particleColors: ['#ef4444', '#f97316', '#fbbf24', '#dc2626', '#ea580c']
  },
  corporate: {
    id: 'corporate',
    background: 'linear-gradient(180deg, #1e293b 0%, #334155 100%)',
    textColor: '#f1f5f9',
    particleColors: ['#3b82f6', '#8b5cf6', '#6366f1', '#2563eb', '#7c3aed']
  }
};

const getActiveTheme = () => {
  const savedTheme = localStorage.getItem('timer_visual_theme');
  return VISUAL_THEMES[savedTheme] || VISUAL_THEMES.cinematic;
};
const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
};

// Confetti particle component
const Confetti = ({ color }) => {
  const style = {
    '--x': `${Math.random() * 100}vw`,
    '--rotation': `${Math.random() * 360}deg`,
    '--delay': `${Math.random() * 0.5}s`,
    backgroundColor: color
  };
  return <div className="confetti" style={style} />;
};

// Floating particle
const Particle = ({ index, theme }) => {
  const colors = theme?.particleColors || ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'];
  const style = {
    '--size': `${10 + Math.random() * 20}px`,
    '--x': `${Math.random() * 100}%`,
    '--y': `${Math.random() * 100}%`,
    '--duration': `${15 + Math.random() * 10}s`,
    '--delay': `${Math.random() * 5}s`,
    backgroundColor: colors[index % colors.length]
  };
  return <div className="floating-particle" style={style} />;
};

export default function TimerDisplay() {
  const { code } = useParams();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localTime, setLocalTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [prevSessionIndex, setPrevSessionIndex] = useState(0);
  const [activeTheme, setActiveTheme] = useState(getActiveTheme());
  const wsRef = useRef(null);
  const timerRef = useRef(null);
  const containerRef = useRef(null);
  const audioRef = useRef(null);

  // Listen for theme changes
  useEffect(() => {
    const handleStorageChange = () => {
      setActiveTheme(getActiveTheme());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return { mins, secs, display: `${mins}:${secs.toString().padStart(2, '0')}` };
  };

  // Calculate progress (0 to 1, where 1 = full time remaining)
  const calculateProgress = useCallback(() => {
    if (!state?.current_session) return 1;
    const total = state.current_session.duree_secondes;
    return Math.max(0, Math.min(1, localTime / total));
  }, [state, localTime]);

  // Connect WebSocket
  useEffect(() => {
    const connect = () => {
      wsRef.current = new WebSocket(`${getWsUrl()}?code=${code}`);

      wsRef.current.onopen = () => {
        setError(null);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'state') {
            // Detect session change for transition
            if (state && data.session_en_cours !== state.session_en_cours) {
              triggerTransition(data.current_session);
            }
            setState(data);
            setLocalTime(data.temps_restant);
            setLoading(false);
          }
        } catch (err) {
          console.error('Parse error:', err);
        }
      };

      wsRef.current.onclose = () => {
        setTimeout(connect, 2000);
      };

      wsRef.current.onerror = () => {
        setError('Connexion perdue');
      };
    };

    connect();
    return () => wsRef.current?.close();
  }, [code]);

  // Trigger session transition animation
  const triggerTransition = (newSession) => {
    setShowTransition(true);
    setTimeout(() => setShowTransition(false), 2000);
  };

  // Local countdown
  useEffect(() => {
    if (state?.mode === 'play') {
      timerRef.current = setInterval(() => {
        setLocalTime((prev) => {
          const next = Math.max(0, prev - 1);
          // Trigger countdown effect for last 5 seconds
          if (next <= 5 && next > 0 && !showCountdown) {
            setShowCountdown(true);
          }
          if (next === 0) {
            setShowCountdown(false);
          }
          return next;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setShowCountdown(false);
    }
    return () => clearInterval(timerRef.current);
  }, [state?.mode]);

  // Completion effect
  useEffect(() => {
    if (state?.mode === 'termine') {
      setShowComplete(true);
    } else {
      setShowComplete(false);
    }
  }, [state?.mode]);

  // Fullscreen
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
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const progress = calculateProgress();
  const currentSession = state?.current_session;
  const sessionColor = currentSession?.couleur || '#6C5CE7';
  const time = formatTime(localTime);
  const isLowTime = localTime <= 30 && localTime > 5;
  const isCritical = localTime <= 5 && localTime > 0;

  // Dynamic background based on session and theme
  const themeBg = activeTheme?.background || 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
  const themeText = activeTheme?.textColor || '#ffffff';
  const bgOverlay = `linear-gradient(135deg, ${sessionColor}15 0%, ${sessionColor}05 50%, transparent 100%)`;

  // SVG parameters for circular timer
  const size = 420;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  if (loading) {
    return (
      <div className="timer-display loading">
        <div className="loading-content">
          <motion.div
            className="loading-logo"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Connexion au timer...
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`timer-display ${isLowTime ? 'low-time' : ''} ${isCritical ? 'critical' : ''} theme-${activeTheme?.id || 'cinematic'}`}
      style={{
        '--session-color': sessionColor,
        '--theme-text': themeText,
        background: themeBg
      }}
    >
      {/* Animated background */}
      <div className="timer-bg" style={{ background: bgOverlay }}>
        {[...Array(8)].map((_, i) => (
          <Particle key={i} index={i} theme={activeTheme} />
        ))}
      </div>

      {/* Pulse rings on low time */}
      <AnimatePresence>
        {(isLowTime || isCritical) && (
          <motion.div
            className="pulse-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="pulse-ring ring-1" style={{ borderColor: sessionColor }} />
            <div className="pulse-ring ring-2" style={{ borderColor: sessionColor }} />
            <div className="pulse-ring ring-3" style={{ borderColor: sessionColor }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="timer-header">
        <motion.div
          className="session-badge"
          style={{ backgroundColor: sessionColor }}
          initial={{ scale: 0, y: -20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          Session {(state?.session_en_cours || 0) + 1} / {state?.total_sessions || 1}
        </motion.div>

        <motion.h1
          className="session-title"
          key={currentSession?.nom_session}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          {currentSession?.nom_session || 'Timer'}
        </motion.h1>
      </header>

      {/* Main timer */}
      <main className="timer-main">
        <motion.div
          className="timer-circle-wrapper"
          animate={isCritical ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 0.5, repeat: isCritical ? Infinity : 0 }}
        >
          {/* Glow effect */}
          <div
            className="timer-glow"
            style={{
              background: `radial-gradient(circle, ${sessionColor}40 0%, transparent 70%)`,
              opacity: progress > 0.5 ? 0.8 : 0.3
            }}
          />

          {/* SVG Timer */}
          <svg className="timer-svg" viewBox={`0 0 ${size} ${size}`}>
            {/* Background track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={strokeWidth}
            />

            {/* Progress arc */}
            <motion.circle
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
              initial={false}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{
                filter: `drop-shadow(0 0 10px ${sessionColor}80)`
              }}
            />

            {/* Inner filled arc (TimeTimer style) */}
            <motion.path
              d={describeArc(size / 2, size / 2, radius - 60, 0, 360 * progress)}
              fill={`${sessionColor}25`}
              initial={false}
              animate={{ d: describeArc(size / 2, size / 2, radius - 60, 0, 360 * progress) }}
              transition={{ duration: 0.5 }}
            />
          </svg>

          {/* Center content */}
          <div className="timer-center">
            <AnimatePresence mode="wait">
              <motion.div
                className="timer-digits"
                key={time.display}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.2, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <span className="digit-mins">{time.mins}</span>
                <span className="digit-separator">:</span>
                <span className="digit-secs">{time.secs.toString().padStart(2, '0')}</span>
              </motion.div>
            </AnimatePresence>

            <div className="timer-status">
              {state?.mode === 'play' && (
                <motion.span
                  className="status-playing"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  ● En cours
                </motion.span>
              )}
              {state?.mode === 'pause' && <span className="status-paused">❚❚ Pause</span>}
              {state?.mode === 'termine' && <span className="status-done">✓ Terminé</span>}
            </div>
          </div>
        </motion.div>

        {/* Message */}
        <AnimatePresence>
          {state?.message_actuel && (
            <motion.div
              className="timer-message"
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.9 }}
              style={{ backgroundColor: sessionColor }}
            >
              <span className="message-icon">💬</span>
              {state.message_actuel}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Session progress dots */}
      <div className="sessions-track">
        {state?.sessions?.map((session, index) => (
          <motion.div
            key={index}
            className={`session-dot ${index === state.session_en_cours ? 'active' : ''} ${index < state.session_en_cours ? 'done' : ''}`}
            style={{ '--dot-color': session.couleur }}
            whileHover={{ scale: 1.2 }}
            animate={index === state.session_en_cours ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 1.5, repeat: index === state.session_en_cours ? Infinity : 0 }}
          >
            {index < state.session_en_cours && (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            )}
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <footer className="timer-footer">
        <div className="footer-left">
          <span className="join-code">Code: <strong>{code}</strong></span>
        </div>
        <div className="footer-center">
          <a href="https://insuffle.com" target="_blank" rel="noopener noreferrer" className="insuffle-link">
            <span>Propulsé par</span>
            <strong>Insuffle</strong>
          </a>
        </div>
        <div className="footer-right">
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
        </div>
      </footer>

      {/* Session transition overlay */}
      <AnimatePresence>
        {showTransition && currentSession && (
          <motion.div
            className="transition-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="transition-content"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              style={{ backgroundColor: sessionColor }}
            >
              <span className="transition-label">Prochaine session</span>
              <h2>{currentSession.nom_session}</h2>
              <span className="transition-duration">{formatTime(currentSession.duree_secondes).display}</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Countdown overlay (last 5 seconds) */}
      <AnimatePresence>
        {showCountdown && localTime > 0 && localTime <= 5 && (
          <motion.div
            className="countdown-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="countdown-number"
              key={localTime}
              initial={{ scale: 3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300 }}
              style={{ color: sessionColor }}
            >
              {localTime}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion overlay */}
      <AnimatePresence>
        {showComplete && (
          <motion.div
            className="complete-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Confetti */}
            {[...Array(50)].map((_, i) => (
              <Confetti key={i} color={['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#6C5CE7'][i % 5]} />
            ))}

            <motion.div
              className="complete-content"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            >
              <motion.div
                className="complete-icon"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: 3 }}
              >
                🎉
              </motion.div>
              <h2>Bravo !</h2>
              <p>Toutes les sessions sont terminées</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Arc path helper
function describeArc(x, y, radius, startAngle, endAngle) {
  if (endAngle <= 0) return 'M ' + x + ' ' + y;
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

function polarToCartesian(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
