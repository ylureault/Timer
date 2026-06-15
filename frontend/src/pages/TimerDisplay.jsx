import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/TimerDisplay.css';

// Three display themes only: luxe, aplat, aurora
const THEMES = ['luxe', 'aplat', 'aurora'];

const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
};

const getQRCodeUrl = (text, size = 220) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;

const formatTime = (seconds) => {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return { mins, secs, display: `${mins}:${secs.toString().padStart(2, '0')}` };
};

// ============================================================
// THEME RENDERERS — each receives { time, progress, state, currentSession, sessionColor }
// progress: 1 = full time remaining, 0 = time over
// ============================================================

const StatusLabel = ({ mode }) => {
  if (mode === 'play') return <span className="td-status td-status-play">En cours</span>;
  if (mode === 'pause') return <span className="td-status td-status-pause">En pause</span>;
  if (mode === 'termine') return <span className="td-status td-status-done">Terminé</span>;
  return <span className="td-status">Prêt</span>;
};

// --- Luxe : elegant circular watch, dark premium ---
const LuxeTimer = ({ time, progress, state, currentSession, sessionColor }) => {
  const size = 460;
  const stroke = 10;
  const r = (size - stroke) / 2 - 18;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);

  // minute ticks
  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const angle = (i * 6 - 90) * (Math.PI / 180);
    const major = i % 5 === 0;
    const inner = major ? r + 4 : r + 8;
    const outer = r + 14;
    ticks.push(
      <line
        key={i}
        x1={size / 2 + inner * Math.cos(angle)}
        y1={size / 2 + inner * Math.sin(angle)}
        x2={size / 2 + outer * Math.cos(angle)}
        y2={size / 2 + outer * Math.sin(angle)}
        stroke={major ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.15)'}
        strokeWidth={major ? 2 : 1}
      />
    );
  }

  return (
    <div className="luxe-wrap">
      <div className="luxe-ring anim-breathe" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="luxe-svg">
          {ticks}
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={sessionColor} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={c}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.6, ease: 'linear' }}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ filter: `drop-shadow(0 0 12px ${sessionColor}88)` }}
          />
        </svg>
        <div className="luxe-center">
          <div className="luxe-time">{time.display}</div>
          <StatusLabel mode={state?.mode} />
        </div>
      </div>
    </div>
  );
};

// --- Aplat : flat, light, ultra minimal ---
const AplatTimer = ({ time, progress, state, currentSession, sessionColor }) => (
  <div className="aplat-wrap">
    <div className="aplat-time" style={{ color: sessionColor }}>{time.display}</div>
    <div className="aplat-bar-track">
      <motion.div
        className="aplat-bar-fill"
        style={{ background: sessionColor }}
        animate={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
        transition={{ duration: 0.6, ease: 'linear' }}
      />
    </div>
    <StatusLabel mode={state?.mode} />
  </div>
);

// --- Aurora : radial colorful glow ---
const AuroraTimer = ({ time, progress, state, currentSession, sessionColor }) => (
  <div className="aurora-wrap">
    <motion.div
      className="aurora-orb"
      style={{
        background: `radial-gradient(circle at 50% 50%, ${sessionColor}cc 0%, ${sessionColor}55 35%, transparent 70%)`,
      }}
      animate={{ scale: state?.mode === 'play' ? [1, 1.06, 1] : 1, opacity: [0.85, 1, 0.85] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    />
    <div className="aurora-center">
      <div className="aurora-time">{time.display}</div>
      <StatusLabel mode={state?.mode} />
    </div>
  </div>
);

const THEME_RENDERERS = {
  luxe: LuxeTimer,
  aplat: AplatTimer,
  aurora: AuroraTimer,
};

// ============================================================
// MAIN
// ============================================================

export default function TimerDisplay() {
  const { code } = useParams();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localTime, setLocalTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const wsRef = useRef(null);
  const pollRef = useRef(null);
  const tickRef = useRef(null);
  const containerRef = useRef(null);
  const prevSessionRef = useRef(null);
  const audioRef = useRef(null);
  const lastBeepRef = useRef(null);

  const theme = THEMES.includes(state?.theme) ? state.theme : 'luxe';

  // ---- normalize + apply a state payload (from WS or polling) ----
  const applyState = useCallback((data) => {
    if (!data || (data.success === false)) return;
    setError(null);
    setLoading(false);
    if (prevSessionRef.current !== null && data.session_en_cours !== prevSessionRef.current) {
      setShowTransition(true);
      setTimeout(() => setShowTransition(false), 1800);
    }
    prevSessionRef.current = data.session_en_cours;
    setState(data);
    setLocalTime(data.temps_restant ?? 0);
  }, []);

  // ---- polling fallback ----
  const pollOnce = useCallback(async () => {
    try {
      const res = await fetch(`/api/timer/${code}/state`);
      const data = await res.json();
      if (data.success) applyState(data);
      else setError(data.error || 'Timer introuvable');
    } catch {
      setError('Erreur de connexion');
    }
  }, [code, applyState]);

  // ---- WebSocket (primary) with polling fallback ----
  useEffect(() => {
    let closed = false;

    const startPolling = () => {
      if (pollRef.current) return;
      pollOnce();
      pollRef.current = setInterval(pollOnce, 1000);
    };
    const stopPolling = () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };

    const connect = () => {
      try {
        const ws = new WebSocket(`${getWsUrl()}?code=${code}`);
        wsRef.current = ws;

        const fallbackTimer = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) startPolling();
        }, 2500);

        ws.onopen = () => { clearTimeout(fallbackTimer); stopPolling(); setError(null); };
        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'state') applyState(data);
          } catch { /* ignore */ }
        };
        ws.onclose = () => {
          clearTimeout(fallbackTimer);
          if (!closed) { startPolling(); setTimeout(connect, 3000); }
        };
        ws.onerror = () => { startPolling(); };
      } catch {
        startPolling();
      }
    };

    connect();
    // ensure we have an initial state quickly
    pollOnce();

    return () => {
      closed = true;
      stopPolling();
      if (wsRef.current) wsRef.current.close();
    };
  }, [code, applyState, pollOnce]);

  // ---- periodic resync (corrects drift in backgrounded tabs; server only
  //      broadcasts on actions, so the local countdown can drift) ----
  useEffect(() => {
    const id = setInterval(() => { pollOnce(); }, 15000);
    return () => clearInterval(id);
  }, [pollOnce]);

  // ---- local countdown ----
  useEffect(() => {
    if (state?.mode === 'play') {
      tickRef.current = setInterval(() => {
        setLocalTime((prev) => Math.max(0, prev - 1));
      }, 1000);
    } else {
      clearInterval(tickRef.current);
    }
    return () => clearInterval(tickRef.current);
  }, [state?.mode]);

  // ---- soft beep on the final 3 seconds ----
  useEffect(() => {
    if (!soundEnabled || state?.mode !== 'play') return;
    if (localTime > 0 && localTime <= 3 && lastBeepRef.current !== localTime) {
      lastBeepRef.current = localTime;
      try {
        if (!audioRef.current) audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
        const ac = audioRef.current;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.frequency.value = localTime === 1 ? 1040 : 760;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.0001, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12, ac.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.18);
        osc.start(); osc.stop(ac.currentTime + 0.2);
      } catch { /* ignore */ }
    }
  }, [localTime, soundEnabled, state?.mode]);

  // ---- document title ----
  useEffect(() => {
    const t = formatTime(localTime);
    const name = state?.current_session?.nom_session || 'Timer';
    if (state?.mode === 'play') document.title = `${t.display} — ${name}`;
    else if (state?.mode === 'pause') document.title = `❚❚ ${t.display} — ${name}`;
    else if (state?.mode === 'termine') document.title = `✓ Terminé — Timer par INSUFFLE`;
    else document.title = `Timer par INSUFFLE`;
    return () => { document.title = 'Timer par INSUFFLE'; };
  }, [localTime, state?.mode, state?.current_session?.nom_session]);

  // ---- fullscreen ----
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  // ---- keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.key.toLowerCase()) {
        case 'f': e.preventDefault(); toggleFullscreen(); break;
        case 'm': setSoundEnabled((s) => !s); break;
        case 'q': setShowQRCode((q) => !q); break;
        case 'c': navigator.clipboard?.writeText(code); break;
        case 'escape': if (showQRCode) setShowQRCode(false); break;
        default: break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleFullscreen, showQRCode, code]);

  // ---- derived ----
  const currentSession = state?.current_session;
  const sessionColor = currentSession?.couleur || '#3b82f6';
  const total = state?.effective_total || Math.max(currentSession?.duree_secondes || 1, localTime);
  const progress = Math.max(0, Math.min(1, localTime / total));
  const time = formatTime(localTime);
  const isCritical = state?.mode === 'play' && localTime <= 10 && localTime > 0;
  const Renderer = THEME_RENDERERS[theme];

  if (loading) {
    return (
      <div className={`tdisplay theme-${theme} td-loading`}>
        <div className="loader" />
        <p>Connexion au timer…</p>
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className={`tdisplay theme-aplat td-error`}>
        <div className="td-error-card">
          <h1>Timer introuvable</h1>
          <p className="muted">{error}</p>
          <p className="muted">Code : {code}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`tdisplay theme-${theme} ${isCritical ? 'is-critical' : ''}`}
      style={{ '--session-color': sessionColor }}
    >
      {/* Header */}
      <header className="td-header">
        <div className="td-session-meta">
          <span className="td-session-index">
            Session {(state?.session_en_cours ?? 0) + 1} / {state?.total_sessions || 1}
          </span>
          <h1 className="td-session-name">{currentSession?.nom_session || 'Timer'}</h1>
        </div>
      </header>

      {/* Timer core */}
      <main className="td-main">
        <AnimatePresence mode="wait">
          <motion.div
            key={theme}
            className="td-core"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.35 }}
          >
            {Renderer && (
              <Renderer
                time={time}
                progress={progress}
                state={state}
                currentSession={currentSession}
                sessionColor={sessionColor}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Live message */}
        <AnimatePresence>
          {state?.message_actuel && (
            <motion.div
              className="td-message"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {state.message_actuel}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Session dots */}
      <div className="td-dots">
        {state?.sessions?.map((s, i) => (
          <span
            key={i}
            className={`td-dot ${i === state.session_en_cours ? 'is-active' : ''} ${i < state.session_en_cours ? 'is-done' : ''}`}
            style={{ '--dot-color': s.couleur }}
            title={s.nom_session}
          />
        ))}
      </div>

      {/* Footer */}
      <footer className="td-footer">
        <div className="td-foot-left">
          <span className="td-code">Code&nbsp;<strong>{state?.timer?.code || code}</strong></span>
          <button className="td-icon-btn" onClick={() => setShowQRCode(true)} title="QR code (Q)" aria-label="Afficher le QR code de la télécommande">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="3" height="3" />
              <rect x="18" y="18" width="3" height="3" /><rect x="14" y="18" width="3" height="3" />
              <rect x="18" y="14" width="3" height="3" />
            </svg>
          </button>
        </div>

        <a className="td-foot-brand" href="https://www.insuffle.com" target="_blank" rel="noopener noreferrer">
          Timer par <strong>INSUFFLE</strong>
        </a>

        <div className="td-foot-right">
          <button className="td-icon-btn" onClick={() => setSoundEnabled((s) => !s)} title="Son (M)" aria-label={soundEnabled ? 'Couper le son' : 'Activer le son'}>
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <button className="td-icon-btn" onClick={toggleFullscreen} title="Plein écran (F)" aria-label="Basculer le plein écran">
            {isFullscreen ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            )}
          </button>
        </div>
      </footer>

      {/* QR modal */}
      <AnimatePresence>
        {showQRCode && (
          <motion.div
            className="td-qr-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowQRCode(false)}
          >
            <motion.div
              className="td-qr-card"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="td-qr-close" onClick={() => setShowQRCode(false)}>×</button>
              <h3>Piloter ce timer</h3>
              <img src={getQRCodeUrl(`${window.location.origin}/remote/${code}`)} alt="QR code télécommande" />
              <p className="muted">Scannez pour ouvrir la télécommande</p>
              <p className="td-qr-code">{state?.timer?.code || code}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session transition */}
      <AnimatePresence>
        {showTransition && currentSession && (
          <motion.div
            className="td-transition"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="td-transition-card"
              initial={{ scale: 0.85, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, opacity: 0 }}
              style={{ borderColor: sessionColor }}
            >
              <span className="td-transition-label" style={{ color: sessionColor }}>Session suivante</span>
              <h2>{currentSession.nom_session}</h2>
              <span className="td-transition-time">{formatTime(currentSession.duree_secondes).display}</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion */}
      <AnimatePresence>
        {state?.mode === 'termine' && (
          <motion.div
            className="td-complete"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="td-complete-card"
              initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
            >
              <div className="td-complete-check">✓</div>
              <h2>Terminé</h2>
              <p className="muted">Toutes les sessions sont terminées</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
