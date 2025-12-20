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

// Timer display formats
const TIMER_FORMATS = [
  { id: 'circle', name: 'Cercle', icon: '⭕' },
  { id: 'arc', name: 'Arc', icon: '🌙' },
  { id: 'bar', name: 'Barre', icon: '📊' },
  { id: 'digital', name: 'Digital', icon: '🔢' },
  { id: 'flip', name: 'Flip Clock', icon: '🔄' },
  { id: 'minimal', name: 'Minimal', icon: '◻️' },
  { id: 'blocks', name: 'Blocs', icon: '▪️' },
  { id: 'wave', name: 'Vague', icon: '🌊' },
  { id: 'gauge', name: 'Jauge', icon: '📈' }
];

// Visual themes
const VISUAL_THEMES = [
  { id: 'cinematic', name: 'Cinématique', preview: 'linear-gradient(180deg, #1a1a2e, #0f3460)' },
  { id: 'neon', name: 'Néon', preview: 'linear-gradient(135deg, #0a0a0a, #1a0a2e)' },
  { id: 'minimal', name: 'Minimaliste', preview: 'linear-gradient(180deg, #f8fafc, #e2e8f0)' },
  { id: 'nature', name: 'Nature', preview: 'linear-gradient(135deg, #134e4a, #064e3b)' },
  { id: 'sunset', name: 'Coucher de soleil', preview: 'linear-gradient(135deg, #1e1b4b, #831843)' },
  { id: 'ocean', name: 'Océan', preview: 'linear-gradient(180deg, #0c4a6e, #0369a1)' },
  { id: 'fire', name: 'Feu', preview: 'linear-gradient(180deg, #1a0a0a, #7f1d1d)' },
  { id: 'corporate', name: 'Pro', preview: 'linear-gradient(180deg, #1e293b, #334155)' }
];

const DEFAULT_COLORS = [
  '#6C5CE7', '#00CEC9', '#FF6B6B', '#FDCB6E', '#00B894', '#E17055', '#A29BFE', '#74B9FF'
];

// Remote preferences defaults
const DEFAULT_PREFERENCES = {
  showTimeAdjust: true,
  showMessage: true,
  showSessionsList: true,
  compactMode: false,
  quickEdit: true
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
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="8"
      />
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
        <span key={ripple.id} className="ripple" style={{ left: ripple.x, top: ripple.y }} />
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
  const [showSessionEditor, setShowSessionEditor] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showFormatSelector, setShowFormatSelector] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [currentFormat, setCurrentFormat] = useState(() =>
    localStorage.getItem('timer_display_format') || 'circle'
  );
  const [actionFeedback, setActionFeedback] = useState(null);
  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem('remote_preferences');
    return saved ? JSON.parse(saved) : DEFAULT_PREFERENCES;
  });
  const [currentTheme, setCurrentTheme] = useState(() =>
    localStorage.getItem('timer_visual_theme') || 'cinematic'
  );
  const [newSession, setNewSession] = useState({
    nom_session: '',
    duree_minutes: 5,
    couleur: DEFAULT_COLORS[0],
    type: 'session'
  });
  const wsRef = useRef(null);
  const timerRef = useRef(null);

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show action feedback with haptic
  const showFeedback = (text, type = 'success') => {
    setActionFeedback({ text, type });
    if (navigator.vibrate) {
      navigator.vibrate(type === 'success' ? 50 : [50, 50, 50]);
    }
    setTimeout(() => setActionFeedback(null), 1500);
  };

  // Save preferences
  const updatePreferences = (key, value) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    localStorage.setItem('remote_preferences', JSON.stringify(updated));
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
        setError(null);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'state') {
            setState(data);
            setLocalTime(data.temps_restant);
            setLoading(false);
            // Sync theme/format from server
            if (data.visual_theme) {
              setCurrentTheme(data.visual_theme);
            }
            if (data.display_format) {
              setCurrentFormat(data.display_format);
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
  const handlePlay = () => { apiCall('/start'); showFeedback('▶ Lecture'); };
  const handlePause = () => { apiCall('/pause'); showFeedback('⏸ Pause'); };
  const handleNext = () => { apiCall('/next'); showFeedback('⏭ Session suivante'); };
  const handlePrevious = () => { apiCall('/previous'); showFeedback('⏮ Session précédente'); };
  const handleReset = () => { apiCall('/reset'); showFeedback('🔄 Réinitialisé'); };
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

  // Theme selection - sync via server API
  const handleThemeSelect = async (themeId) => {
    setCurrentTheme(themeId);
    localStorage.setItem('timer_visual_theme', themeId);
    showFeedback(`🎨 Thème ${VISUAL_THEMES.find(t => t.id === themeId)?.name}`);
    setShowThemeSelector(false);
    // Sync to server for all clients
    await apiCall('/visual-theme', 'POST', { visual_theme: themeId });
  };

  // Format selection - sync via server API
  const handleFormatSelect = async (formatId) => {
    setCurrentFormat(formatId);
    localStorage.setItem('timer_display_format', formatId);
    showFeedback(`📐 Format ${TIMER_FORMATS.find(f => f.id === formatId)?.name}`);
    setShowFormatSelector(false);
    // Sync to server for all clients
    await apiCall('/display-format', 'POST', { display_format: formatId });
  };

  // Session management
  const handleAddSession = async () => {
    if (!newSession.nom_session.trim()) return;

    const result = await apiCall('/session', 'POST', {
      nom_session: newSession.nom_session,
      duree_secondes: newSession.duree_minutes * 60,
      couleur: newSession.couleur,
      type: newSession.type
    });

    if (result.success) {
      showFeedback('✨ Session ajoutée');
      setNewSession({
        nom_session: '',
        duree_minutes: 5,
        couleur: DEFAULT_COLORS[(state?.sessions?.length || 0) % DEFAULT_COLORS.length],
        type: 'session'
      });
      setShowSessionEditor(false);
    }
  };

  const handleUpdateSession = async () => {
    if (!editingSession || !newSession.nom_session.trim()) return;

    const result = await apiCall(`/session/${editingSession.index}`, 'PUT', {
      nom_session: newSession.nom_session,
      duree_secondes: newSession.duree_minutes * 60,
      couleur: newSession.couleur,
      type: newSession.type
    });

    if (result.success) {
      showFeedback('✓ Session modifiée');
      setEditingSession(null);
      setShowSessionEditor(false);
    }
  };

  const handleDeleteSession = async (index) => {
    if (!confirm('Supprimer cette session ?')) return;

    const result = await apiCall(`/session/${index}`, 'DELETE');
    if (result.success) {
      showFeedback('🗑️ Session supprimée');
    }
  };

  const openEditSession = (session, index) => {
    setEditingSession({ ...session, index });
    setNewSession({
      nom_session: session.nom_session,
      duree_minutes: Math.floor(session.duree_secondes / 60),
      couleur: session.couleur,
      type: session.type || 'session'
    });
    setShowSessionEditor(true);
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
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
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
        <Link to="/dashboard" className="back-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </Link>
        <motion.div className="header-info" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
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
      <motion.div className="main-controls" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <ControlButton onClick={handlePrevious} variant="secondary">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
        </ControlButton>
        <ControlButton onClick={isPlaying ? handlePause : handlePlay} variant="primary" className={isPlaying ? 'pause' : 'play'}>
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          )}
        </ControlButton>
        <ControlButton onClick={handleNext} variant="secondary">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
        </ControlButton>
      </motion.div>

      {/* Time adjustment */}
      {preferences.showTimeAdjust && (
        <motion.div className="time-adjust" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <button onClick={() => handleAddTime(-60)}>-1 min</button>
          <button onClick={() => handleAddTime(-30)}>-30s</button>
          <button onClick={() => handleAddTime(30)}>+30s</button>
          <button onClick={() => handleAddTime(60)}>+1 min</button>
        </motion.div>
      )}

      {/* Sessions list with quick edit */}
      {preferences.showSessionsList && (
        <motion.div className="sessions-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <div className="sessions-header">
            <h3>Sessions</h3>
            {preferences.quickEdit && (
              <button className="add-session-btn" onClick={() => { setEditingSession(null); setShowSessionEditor(true); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            )}
          </div>
          <div className="sessions-scroll">
            {state?.sessions?.map((session, index) => (
              <motion.div
                key={index}
                className={`session-item ${index === state.session_en_cours ? 'active' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
              >
                <button className="session-main" onClick={() => handleGoTo(index)}>
                  <div className="session-color" style={{ backgroundColor: session.couleur }} />
                  <div className="session-info">
                    <span className="session-name">{session.nom_session}</span>
                    <span className="session-duration">{formatTime(session.duree_secondes)}</span>
                  </div>
                  {index === state.session_en_cours && (
                    <motion.div className="session-current-badge" layoutId="active-badge">En cours</motion.div>
                  )}
                </button>
                {preferences.quickEdit && (
                  <div className="session-quick-actions">
                    <button className="quick-action edit" onClick={() => openEditSession(session, index)} title="Modifier">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button className="quick-action delete" onClick={() => handleDeleteSession(index)} title="Supprimer">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Message section */}
      {preferences.showMessage && (
        <motion.div className="message-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <h3>📢 Message pour l'écran</h3>
          <div className="message-input-row">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex: Pause café dans 5 min..."
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <motion.button className="send-btn" onClick={sendMessage} whileTap={{ scale: 0.95 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </motion.button>
          </div>
          <AnimatePresence>
            {state?.message_actuel && (
              <motion.div className="current-message" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <span>"{state.message_actuel}"</span>
                <button onClick={clearMessage}>×</button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Theme selector button */}
      <motion.button
        className="theme-selector-btn"
        onClick={() => setShowThemeSelector(true)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <span className="theme-preview-mini" style={{ background: VISUAL_THEMES.find(t => t.id === currentTheme)?.preview }} />
        🎨 Changer le thème
      </motion.button>

      {/* Format selector button */}
      <motion.button
        className="format-selector-btn"
        onClick={() => setShowFormatSelector(true)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <span className="format-icon-mini">{TIMER_FORMATS.find(f => f.id === currentFormat)?.icon}</span>
        📐 Format d'affichage
      </motion.button>

      {/* Reset button */}
      <motion.button className="reset-btn" onClick={handleReset} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>
        Recommencer depuis le début
      </motion.button>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div className="settings-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)} />
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
                <input type="checkbox" checked={state?.auto_mode || false} onChange={(e) => handleAutoMode(e.target.checked)} />
                <span className="toggle"></span>
              </label>

              <div className="settings-section">
                <h4>🎛️ Affichage télécommande</h4>

                <label className="setting-item">
                  <span>Ajustement du temps</span>
                  <input type="checkbox" checked={preferences.showTimeAdjust} onChange={(e) => updatePreferences('showTimeAdjust', e.target.checked)} />
                  <span className="toggle"></span>
                </label>

                <label className="setting-item">
                  <span>Zone de message</span>
                  <input type="checkbox" checked={preferences.showMessage} onChange={(e) => updatePreferences('showMessage', e.target.checked)} />
                  <span className="toggle"></span>
                </label>

                <label className="setting-item">
                  <span>Liste des sessions</span>
                  <input type="checkbox" checked={preferences.showSessionsList} onChange={(e) => updatePreferences('showSessionsList', e.target.checked)} />
                  <span className="toggle"></span>
                </label>

                <label className="setting-item">
                  <span>Édition rapide des sessions</span>
                  <span className="setting-desc">Modifier/supprimer depuis la liste</span>
                  <input type="checkbox" checked={preferences.quickEdit} onChange={(e) => updatePreferences('quickEdit', e.target.checked)} />
                  <span className="toggle"></span>
                </label>
              </div>

              <div className="display-link">
                <span>🖥️ Affichage pour participants</span>
                <a href={`/display/${code}`} target="_blank" rel="noopener noreferrer">
                  Ouvrir dans un nouvel onglet
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              </div>

              <div className="display-link">
                <span>🛒 Personnalisation</span>
                <Link to="/marketplace">
                  Marketplace - Thèmes & Templates
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </Link>
              </div>

              <button className="close-settings" onClick={() => setShowSettings(false)}>Fermer</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Theme selector modal */}
      <AnimatePresence>
        {showThemeSelector && (
          <>
            <motion.div className="settings-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowThemeSelector(false)} />
            <motion.div
              className="theme-modal"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="modal-header">
                <h3>🎨 Choisir un thème</h3>
                <button className="close-btn" onClick={() => setShowThemeSelector(false)}>×</button>
              </div>
              <div className="themes-grid">
                {VISUAL_THEMES.map((theme) => (
                  <motion.button
                    key={theme.id}
                    className={`theme-option ${currentTheme === theme.id ? 'active' : ''}`}
                    onClick={() => handleThemeSelect(theme.id)}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="theme-preview" style={{ background: theme.preview }}>
                      {currentTheme === theme.id && <span className="check">✓</span>}
                    </div>
                    <span className="theme-name">{theme.name}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Format selector modal */}
      <AnimatePresence>
        {showFormatSelector && (
          <>
            <motion.div className="settings-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFormatSelector(false)} />
            <motion.div
              className="theme-modal"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="modal-header">
                <h3>📐 Format d'affichage</h3>
                <button className="close-btn" onClick={() => setShowFormatSelector(false)}>×</button>
              </div>
              <div className="themes-grid">
                {TIMER_FORMATS.map((format) => (
                  <motion.button
                    key={format.id}
                    className={`theme-option ${currentFormat === format.id ? 'active' : ''}`}
                    onClick={() => handleFormatSelect(format.id)}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="format-preview">
                      <span className="format-icon">{format.icon}</span>
                      {currentFormat === format.id && <span className="check">✓</span>}
                    </div>
                    <span className="theme-name">{format.name}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Session editor modal */}
      <AnimatePresence>
        {showSessionEditor && (
          <>
            <motion.div className="settings-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSessionEditor(false)} />
            <motion.div
              className="session-editor-modal"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
            >
              <div className="modal-header">
                <h3>{editingSession ? '✏️ Modifier la session' : '✨ Nouvelle session'}</h3>
                <button className="close-btn" onClick={() => { setShowSessionEditor(false); setEditingSession(null); }}>×</button>
              </div>

              <div className="editor-form">
                <div className="form-group">
                  <label>Nom de la session</label>
                  <input
                    type="text"
                    value={newSession.nom_session}
                    onChange={(e) => setNewSession({ ...newSession, nom_session: e.target.value })}
                    placeholder="Ex: Brainstorming"
                  />
                </div>

                <div className="form-group">
                  <label>Durée (minutes)</label>
                  <div className="duration-input">
                    <button onClick={() => setNewSession({ ...newSession, duree_minutes: Math.max(1, newSession.duree_minutes - 1) })}>-</button>
                    <input
                      type="number"
                      value={newSession.duree_minutes}
                      onChange={(e) => setNewSession({ ...newSession, duree_minutes: Math.max(1, parseInt(e.target.value) || 1) })}
                      min="1"
                    />
                    <button onClick={() => setNewSession({ ...newSession, duree_minutes: newSession.duree_minutes + 1 })}>+</button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Type</label>
                  <div className="type-selector">
                    <button
                      className={newSession.type === 'session' ? 'active' : ''}
                      onClick={() => setNewSession({ ...newSession, type: 'session' })}
                    >
                      📋 Session
                    </button>
                    <button
                      className={newSession.type === 'pause' ? 'active' : ''}
                      onClick={() => setNewSession({ ...newSession, type: 'pause' })}
                    >
                      ☕ Pause
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Couleur</label>
                  <div className="color-picker">
                    {DEFAULT_COLORS.map((color) => (
                      <button
                        key={color}
                        className={`color-option ${newSession.couleur === color ? 'active' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewSession({ ...newSession, couleur: color })}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => { setShowSessionEditor(false); setEditingSession(null); }}>
                  Annuler
                </button>
                <button className="btn-confirm" onClick={editingSession ? handleUpdateSession : handleAddSession}>
                  {editingSession ? '✓ Modifier' : '+ Ajouter'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer branding */}
      <footer className="remote-footer">
        <span>Propulsé par</span>
        <a href="https://insuffle.com" target="_blank" rel="noopener noreferrer">Insuffle</a>
      </footer>
    </div>
  );
}
