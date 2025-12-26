import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/TimerDisplay.css';

const API_URL = import.meta.env.VITE_API_URL ?? '';

// QR Code generator (inline to avoid circular dependencies)
const getQRCodeUrl = (text, size = 200) => {
  const encoded = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
};

// Timer display formats
export const TIMER_FORMATS = {
  circle: {
    id: 'circle',
    name: 'Cercle classique',
    icon: '⭕',
    description: 'Style TimeTimer circulaire'
  },
  arc: {
    id: 'arc',
    name: 'Arc de cercle',
    icon: '🌙',
    description: 'Demi-cercle élégant'
  },
  bar: {
    id: 'bar',
    name: 'Barre de progression',
    icon: '📊',
    description: 'Style linéaire moderne'
  },
  digital: {
    id: 'digital',
    name: 'Digital',
    icon: '🔢',
    description: 'Affichage type réveil'
  },
  flip: {
    id: 'flip',
    name: 'Flip Clock',
    icon: '🔄',
    description: 'Style horloge à volets'
  },
  minimal: {
    id: 'minimal',
    name: 'Minimaliste',
    icon: '◻️',
    description: 'Texte épuré sans fioritures'
  },
  blocks: {
    id: 'blocks',
    name: 'Blocs',
    icon: '▪️',
    description: 'Segments lumineux'
  },
  wave: {
    id: 'wave',
    name: 'Vague',
    icon: '🌊',
    description: 'Animation fluide'
  },
  gauge: {
    id: 'gauge',
    name: 'Jauge plein écran',
    icon: '📈',
    description: 'Fond coloré vert→rouge'
  }
};

// Default format - will be updated from server via WebSocket
const getDefaultFormat = () => 'circle';

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

// Default theme - will be updated from server via WebSocket
const getDefaultTheme = () => VISUAL_THEMES.cinematic;
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

// Timer Format Components
const CircleTimer = ({ size, strokeWidth, radius, circumference, strokeDashoffset, sessionColor, progress, time, state }) => (
  <div className="timer-circle-wrapper">
    <div className="timer-glow" style={{
      background: `radial-gradient(circle, ${sessionColor}40 0%, transparent 70%)`,
      opacity: progress > 0.5 ? 0.8 : 0.3
    }} />
    <svg className="timer-svg" viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={sessionColor}
        strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: `drop-shadow(0 0 10px ${sessionColor}80)` }}
      />
      <motion.path
        d={describeArc(size / 2, size / 2, radius - 60, 0, 360 * progress)}
        fill={`${sessionColor}25`}
      />
    </svg>
    <div className="timer-center">
      <div className="timer-digits">
        <span className="digit-mins">{time.mins}</span>
        <span className="digit-separator">:</span>
        <span className="digit-secs">{time.secs.toString().padStart(2, '0')}</span>
      </div>
      <div className="timer-status">
        {state?.mode === 'play' && <motion.span className="status-playing" animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>● En cours</motion.span>}
        {state?.mode === 'pause' && <span className="status-paused">❚❚ Pause</span>}
        {state?.mode === 'termine' && <span className="status-done">✓ Terminé</span>}
      </div>
    </div>
  </div>
);

const ArcTimer = ({ progress, sessionColor, time, state }) => (
  <div className="timer-arc-wrapper">
    <svg viewBox="0 0 400 250" className="arc-svg">
      <path d="M 50 200 A 150 150 0 0 1 350 200" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="20" strokeLinecap="round" />
      <motion.path
        d="M 50 200 A 150 150 0 0 1 350 200"
        fill="none" stroke={sessionColor} strokeWidth="20" strokeLinecap="round"
        strokeDasharray="471" strokeDashoffset={471 * (1 - progress)}
        style={{ filter: `drop-shadow(0 0 15px ${sessionColor})` }}
      />
    </svg>
    <div className="arc-center">
      <div className="arc-time">{time.display}</div>
      <div className="arc-status">{state?.mode === 'play' ? '▶ En cours' : state?.mode === 'pause' ? '❚❚ Pause' : '✓ Terminé'}</div>
    </div>
  </div>
);

const BarTimer = ({ progress, sessionColor, time, state, currentSession }) => (
  <div className="timer-bar-wrapper">
    <div className="bar-time">{time.display}</div>
    <div className="bar-container">
      <motion.div
        className="bar-progress"
        style={{ backgroundColor: sessionColor, boxShadow: `0 0 30px ${sessionColor}` }}
        initial={false}
        animate={{ width: `${progress * 100}%` }}
        transition={{ duration: 0.5 }}
      />
      <div className="bar-markers">
        {[...Array(10)].map((_, i) => <div key={i} className="bar-marker" style={{ left: `${i * 10}%` }} />)}
      </div>
    </div>
    <div className="bar-info">
      <span className="bar-session">{currentSession?.nom_session}</span>
      <span className="bar-status">{state?.mode === 'play' ? '▶ En cours' : state?.mode === 'pause' ? '❚❚ Pause' : '✓'}</span>
    </div>
  </div>
);

const DigitalTimer = ({ time, sessionColor, state }) => (
  <div className="timer-digital-wrapper">
    <div className="digital-display" style={{ '--glow-color': sessionColor }}>
      <div className="digital-segment">{String(time.mins).padStart(2, '0')}</div>
      <div className="digital-colon">
        <span></span>
        <span></span>
      </div>
      <div className="digital-segment">{String(time.secs).padStart(2, '0')}</div>
    </div>
    <div className="digital-status" style={{ color: sessionColor }}>
      {state?.mode === 'play' && '● RUN'}
      {state?.mode === 'pause' && '❚❚ PAUSE'}
      {state?.mode === 'termine' && '✓ END'}
    </div>
  </div>
);

const FlipTimer = ({ time, sessionColor }) => {
  const FlipCard = ({ digit, label }) => (
    <div className="flip-card" style={{ '--accent': sessionColor }}>
      <div className="flip-top">{digit}</div>
      <div className="flip-bottom">{digit}</div>
      <div className="flip-label">{label}</div>
    </div>
  );
  return (
    <div className="timer-flip-wrapper">
      <FlipCard digit={String(Math.floor(time.mins / 10))} label="" />
      <FlipCard digit={String(time.mins % 10)} label="MIN" />
      <div className="flip-separator">:</div>
      <FlipCard digit={String(Math.floor(time.secs / 10))} label="" />
      <FlipCard digit={String(time.secs % 10)} label="SEC" />
    </div>
  );
};

const MinimalTimer = ({ time, sessionColor, state, currentSession }) => (
  <div className="timer-minimal-wrapper">
    <motion.div className="minimal-time" style={{ color: sessionColor }}
      animate={state?.mode === 'play' ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 2, repeat: Infinity }}
    >
      {time.display}
    </motion.div>
    <div className="minimal-session">{currentSession?.nom_session}</div>
    <div className="minimal-status">{state?.mode === 'play' ? 'En cours...' : state?.mode === 'pause' ? 'En pause' : 'Terminé'}</div>
  </div>
);

const BlocksTimer = ({ progress, sessionColor, time, state }) => {
  const totalBlocks = 60;
  const activeBlocks = Math.ceil(progress * totalBlocks);
  return (
    <div className="timer-blocks-wrapper">
      <div className="blocks-grid">
        {[...Array(totalBlocks)].map((_, i) => (
          <motion.div
            key={i}
            className={`block ${i < activeBlocks ? 'active' : ''}`}
            style={{ backgroundColor: i < activeBlocks ? sessionColor : 'rgba(255,255,255,0.1)' }}
            animate={i < activeBlocks ? { opacity: [0.7, 1, 0.7] } : {}}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.02 }}
          />
        ))}
      </div>
      <div className="blocks-time">{time.display}</div>
      <div className="blocks-status">{state?.mode === 'play' ? '▶' : state?.mode === 'pause' ? '❚❚' : '✓'}</div>
    </div>
  );
};

const WaveTimer = ({ progress, sessionColor, time, state }) => (
  <div className="timer-wave-wrapper">
    <div className="wave-container">
      <svg viewBox="0 0 400 300" preserveAspectRatio="none" className="wave-svg">
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={sessionColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={sessionColor} stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <motion.path
          fill="url(#waveGradient)"
          animate={{
            d: [
              `M0,${300 - progress * 250} Q100,${300 - progress * 250 - 30} 200,${300 - progress * 250} T400,${300 - progress * 250} V300 H0 Z`,
              `M0,${300 - progress * 250} Q100,${300 - progress * 250 + 30} 200,${300 - progress * 250} T400,${300 - progress * 250} V300 H0 Z`,
              `M0,${300 - progress * 250} Q100,${300 - progress * 250 - 30} 200,${300 - progress * 250} T400,${300 - progress * 250} V300 H0 Z`
            ]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </div>
    <div className="wave-content">
      <div className="wave-time" style={{ color: sessionColor }}>{time.display}</div>
      <div className="wave-status">{state?.mode === 'play' ? 'En cours' : state?.mode === 'pause' ? 'Pause' : 'Terminé'}</div>
    </div>
  </div>
);

// Gauge Timer - Full screen color gauge that goes from green to red
const GaugeTimer = ({ progress, time, state, currentSession }) => {
  // Calculate color based on progress (1=full time remaining=green, 0=no time=red)
  const getGaugeColor = (p) => {
    // progress: 1 = start (green), 0 = end (red)
    if (p >= 0.6) {
      // Green to Yellow (60% to 100%)
      const ratio = (p - 0.6) / 0.4;
      return `rgb(${Math.round(255 * (1 - ratio))}, ${Math.round(200 + 55 * ratio)}, 50)`;
    } else if (p >= 0.3) {
      // Yellow to Orange (30% to 60%)
      const ratio = (p - 0.3) / 0.3;
      return `rgb(255, ${Math.round(100 + 100 * ratio)}, 50)`;
    } else {
      // Orange to Red (0% to 30%)
      const ratio = p / 0.3;
      return `rgb(255, ${Math.round(50 + 50 * ratio)}, ${Math.round(50 * ratio)})`;
    }
  };

  const gaugeColor = getGaugeColor(progress);
  const fillHeight = (1 - progress) * 100; // Inverse: fills from bottom as time passes

  return (
    <div className="timer-gauge-wrapper">
      {/* Gauge background fill that rises as time passes */}
      <motion.div
        className="gauge-fill"
        style={{ backgroundColor: gaugeColor }}
        initial={false}
        animate={{ height: `${fillHeight}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />

      {/* Timer content overlay */}
      <div className="gauge-content">
        <div className="gauge-session-name">{currentSession?.nom_session}</div>
        <motion.div
          className="gauge-time"
          animate={progress < 0.15 ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.5, repeat: progress < 0.15 ? Infinity : 0 }}
        >
          {time.display}
        </motion.div>
        <div className="gauge-status">
          {state?.mode === 'play' && (
            <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
              ● EN COURS
            </motion.span>
          )}
          {state?.mode === 'pause' && <span>❚❚ PAUSE</span>}
          {state?.mode === 'termine' && <span>✓ TERMINÉ</span>}
        </div>
        <div className="gauge-progress-text">{Math.round(progress * 100)}% restant</div>
      </div>
    </div>
  );
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
  const [activeTheme, setActiveTheme] = useState(getDefaultTheme());
  const [activeFormat, setActiveFormat] = useState(getDefaultFormat());
  const [showQRCode, setShowQRCode] = useState(false);
  const wsRef = useRef(null);
  const timerRef = useRef(null);
  const containerRef = useRef(null);
  const audioRef = useRef(null);

  // Theme and format are now synced via WebSocket only
  // No more localStorage polling needed

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

            // Sync visual theme and display format from server
            if (data.visual_theme && VISUAL_THEMES[data.visual_theme]) {
              setActiveTheme(VISUAL_THEMES[data.visual_theme]);
            }
            if (data.display_format) {
              setActiveFormat(data.display_format);
            }
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

  // Update browser tab title with remaining time
  useEffect(() => {
    const time = formatTime(localTime);
    const sessionName = state?.current_session?.nom_session || 'Timer';

    if (state?.mode === 'play') {
      document.title = `${time.display} - ${sessionName} | Insuffle Timer`;
    } else if (state?.mode === 'pause') {
      document.title = `⏸ ${time.display} - ${sessionName} | Insuffle Timer`;
    } else if (state?.mode === 'termine') {
      document.title = `✓ Terminé | Insuffle Timer`;
    } else {
      document.title = `Insuffle Timer - ${code}`;
    }

    return () => {
      document.title = 'Insuffle Timer';
    };
  }, [localTime, state?.mode, state?.current_session?.nom_session, code]);

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
      <main className={`timer-main format-${activeFormat}`}>
        <motion.div
          className="timer-format-container"
          animate={isCritical ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 0.5, repeat: isCritical ? Infinity : 0 }}
        >
          {activeFormat === 'circle' && (
            <CircleTimer
              size={size} strokeWidth={strokeWidth} radius={radius}
              circumference={circumference} strokeDashoffset={strokeDashoffset}
              sessionColor={sessionColor} progress={progress} time={time} state={state}
            />
          )}
          {activeFormat === 'arc' && (
            <ArcTimer progress={progress} sessionColor={sessionColor} time={time} state={state} />
          )}
          {activeFormat === 'bar' && (
            <BarTimer progress={progress} sessionColor={sessionColor} time={time} state={state} currentSession={currentSession} />
          )}
          {activeFormat === 'digital' && (
            <DigitalTimer time={time} sessionColor={sessionColor} state={state} />
          )}
          {activeFormat === 'flip' && (
            <FlipTimer time={time} sessionColor={sessionColor} />
          )}
          {activeFormat === 'minimal' && (
            <MinimalTimer time={time} sessionColor={sessionColor} state={state} currentSession={currentSession} />
          )}
          {activeFormat === 'blocks' && (
            <BlocksTimer progress={progress} sessionColor={sessionColor} time={time} state={state} />
          )}
          {activeFormat === 'wave' && (
            <WaveTimer progress={progress} sessionColor={sessionColor} time={time} state={state} />
          )}
          {activeFormat === 'gauge' && (
            <GaugeTimer progress={progress} time={time} state={state} currentSession={currentSession} />
          )}
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
          <button className="qr-btn" onClick={() => setShowQRCode(true)} title="Afficher le QR Code">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
              <rect x="14" y="14" width="3" height="3"/>
              <rect x="18" y="14" width="3" height="3"/>
              <rect x="14" y="18" width="3" height="3"/>
              <rect x="18" y="18" width="3" height="3"/>
            </svg>
          </button>
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

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRCode && (
          <motion.div
            className="qr-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQRCode(false)}
          >
            <motion.div
              className="qr-modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="qr-close" onClick={() => setShowQRCode(false)}>×</button>
              <h3>Scannez pour suivre sur mobile</h3>
              <div className="qr-code-container">
                <img
                  src={getQRCodeUrl(`${window.location.origin}/display/${code}`, 250)}
                  alt="QR Code pour rejoindre le timer"
                />
              </div>
              <p className="qr-code-text">Code: <strong>{code}</strong></p>
              <p className="qr-url">{window.location.origin}/display/{code}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
