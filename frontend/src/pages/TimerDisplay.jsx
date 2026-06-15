import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDisplayOptions } from '../hooks/useDisplayOptions';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import '../styles/TimerDisplay.css';

const API_URL = import.meta.env.VITE_API_URL ?? '';

// QR Code generator (inline to avoid circular dependencies)
const getQRCodeUrl = (text, size = 200) => {
  const encoded = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
};

// Timer display formats
export const TIMER_FORMATS = {
  timetimer: {
    id: 'timetimer',
    name: 'Time Timer',
    icon: '🔴',
    description: 'Style Time Timer classique'
  },
  moderntimer: {
    id: 'moderntimer',
    name: 'Modern Timer',
    icon: '⏱️',
    description: 'Timer moderne avec segments'
  },
  delorean: {
    id: 'delorean',
    name: 'DeLorean',
    icon: '🚗',
    description: 'Style Retour vers le Futur'
  },
  ledboard: {
    id: 'ledboard',
    name: 'LED Board',
    icon: '🔴',
    description: 'Panneau LED scoreboard'
  },
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

// Visual themes configuration - 3 themes: luxe, aplat, aurora
const VISUAL_THEMES = {
  luxe: {
    id: 'luxe',
    background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    textColor: '#ffffff',
    particleColors: ['#FFE66D', '#4ECDC4', '#FF6B6B', '#95E1D3', '#F38181']
  },
  aplat: {
    id: 'aplat',
    background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
    textColor: '#1e293b',
    particleColors: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
    isLight: true
  },
  aurora: {
    id: 'aurora',
    background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #831843 100%)',
    textColor: '#fef3c7',
    particleColors: ['#f59e0b', '#ec4899', '#f472b6', '#fbbf24', '#fb7185']
  }
};

// Default theme - will be updated from server via WebSocket
const getDefaultTheme = () => VISUAL_THEMES.luxe;
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

// Time Timer - Classic red disk style like the physical Time Timer
const TimeTimerDisplay = ({ progress, time, state, currentSession, sessionColor }) => {
  // Get total duration in minutes for the dial scale
  const totalDurationMinutes = Math.ceil((currentSession?.duree_secondes || 60) / 60);

  // Determine dial max value (round up to nice numbers)
  const getDialMax = (minutes) => {
    if (minutes <= 5) return 5;
    if (minutes <= 10) return 10;
    if (minutes <= 15) return 15;
    if (minutes <= 20) return 20;
    if (minutes <= 30) return 30;
    if (minutes <= 45) return 45;
    if (minutes <= 60) return 60;
    if (minutes <= 90) return 90;
    return Math.ceil(minutes / 30) * 30;
  };

  const dialMax = getDialMax(totalDurationMinutes);

  // Create the pie slice path for the red area
  const createPieSlice = (percentage) => {
    if (percentage <= 0) return '';
    if (percentage >= 1) return 'M 200 200 m -150 0 a 150 150 0 1 0 300 0 a 150 150 0 1 0 -300 0';

    const angleRad = (percentage * 360 - 90) * (Math.PI / 180);
    const startAngleRad = -90 * (Math.PI / 180);

    const x1 = 200 + 150 * Math.cos(startAngleRad);
    const y1 = 200 + 150 * Math.sin(startAngleRad);
    const x2 = 200 + 150 * Math.cos(angleRad);
    const y2 = 200 + 150 * Math.sin(angleRad);

    const largeArc = percentage > 0.5 ? 1 : 0;

    return `M 200 200 L ${x1} ${y1} A 150 150 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  // Generate tick marks and numbers based on dial max
  const ticks = [];
  const numbers = [];
  const tickCount = dialMax <= 15 ? dialMax : (dialMax <= 30 ? dialMax : dialMax);
  const tickInterval = 360 / tickCount;
  const numberInterval = dialMax <= 10 ? 1 : (dialMax <= 30 ? 5 : 15);

  for (let i = 0; i <= tickCount; i++) {
    if (i === tickCount) continue; // Skip last to avoid overlap with 0
    const angle = (i * tickInterval - 90) * (Math.PI / 180);
    const minuteValue = (i / tickCount) * dialMax;
    const isMainTick = minuteValue % numberInterval === 0;
    const innerR = isMainTick ? 135 : 145;
    const outerR = 155;

    const x1 = 200 + innerR * Math.cos(angle);
    const y1 = 200 + innerR * Math.sin(angle);
    const x2 = 200 + outerR * Math.cos(angle);
    const y2 = 200 + outerR * Math.sin(angle);

    ticks.push(
      <line
        key={`tick-${i}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#333"
        strokeWidth={isMainTick ? 2 : 1}
      />
    );

    if (isMainTick) {
      const numR = 170;
      const numX = 200 + numR * Math.cos(angle);
      const numY = 200 + numR * Math.sin(angle);
      const displayNum = Math.round(minuteValue).toString();
      numbers.push(
        <text
          key={`num-${i}`}
          x={numX}
          y={numY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#333"
          fontSize="16"
          fontWeight="bold"
          fontFamily="Arial, sans-serif"
        >
          {displayNum}
        </text>
      );
    }
  }

  return (
    <div className="timetimer-wrapper">
      <div className="timetimer-frame">
        <svg viewBox="0 0 400 400" className="timetimer-svg">
          {/* White background circle */}
          <circle cx="200" cy="200" r="180" fill="white" />

          {/* Red pie slice showing remaining time */}
          <motion.path
            d={createPieSlice(progress)}
            fill={sessionColor || "#E53935"}
            initial={false}
            animate={{ d: createPieSlice(progress) }}
            transition={{ duration: 0.3, ease: 'linear' }}
          />

          {/* Tick marks */}
          {ticks}

          {/* Numbers around the edge */}
          {numbers}

          {/* Center dot */}
          <circle cx="200" cy="200" r="12" fill="#333" />

          {/* Minute hand indicator */}
          <line
            x1="200"
            y1="200"
            x2="200"
            y2="70"
            stroke="#333"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>

        {/* Session name below */}
        <div className="timetimer-info">
          <div className="timetimer-session">{currentSession?.nom_session}</div>
          <div className="timetimer-time">{time.display}</div>
          <div className="timetimer-status">
            {state?.mode === 'play' && <span className="status-play">En cours</span>}
            {state?.mode === 'pause' && <span className="status-pause">Pause</span>}
            {state?.mode === 'termine' && <span className="status-done">Terminé</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

// Modern Timer - White case with segmented radial display and digital center
const ModernTimerDisplay = ({ progress, time, state, currentSession, sessionColor }) => {
  const totalSegments = 60;
  const elapsedSegments = Math.round((1 - progress) * totalSegments);

  // Create segments around the circle
  const segments = [];
  for (let i = 0; i < totalSegments; i++) {
    const startAngle = (i * 6 - 90) * (Math.PI / 180);
    const endAngle = ((i + 1) * 6 - 91) * (Math.PI / 180);
    const innerR = 120;
    const outerR = 155;

    const x1 = 200 + innerR * Math.cos(startAngle);
    const y1 = 200 + innerR * Math.sin(startAngle);
    const x2 = 200 + outerR * Math.cos(startAngle);
    const y2 = 200 + outerR * Math.sin(startAngle);
    const x3 = 200 + outerR * Math.cos(endAngle);
    const y3 = 200 + outerR * Math.sin(endAngle);
    const x4 = 200 + innerR * Math.cos(endAngle);
    const y4 = 200 + innerR * Math.sin(endAngle);

    const isElapsed = i < elapsedSegments;

    segments.push(
      <path
        key={`seg-${i}`}
        d={`M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} Z`}
        fill={isElapsed ? (sessionColor || '#FF6B35') : '#E5E5E5'}
        stroke="white"
        strokeWidth="1"
      />
    );
  }

  return (
    <div className="moderntimer-wrapper">
      <div className="moderntimer-case">
        <svg viewBox="0 0 400 400" className="moderntimer-svg">
          {/* White background */}
          <circle cx="200" cy="200" r="180" fill="#FAFAFA" />

          {/* Segments */}
          {segments}

          {/* Inner circle for display */}
          <circle cx="200" cy="200" r="110" fill="white" />

          {/* Small ticks around inner circle */}
          {[0, 15, 30, 45].map((min) => {
            const angle = (min * 6 - 90) * (Math.PI / 180);
            return (
              <line
                key={`mtick-${min}`}
                x1={200 + 95 * Math.cos(angle)}
                y1={200 + 95 * Math.sin(angle)}
                x2={200 + 105 * Math.cos(angle)}
                y2={200 + 105 * Math.sin(angle)}
                stroke="#999"
                strokeWidth="2"
              />
            );
          })}
        </svg>

        {/* Digital display in center */}
        <div className="moderntimer-center">
          <motion.div
            className="moderntimer-time"
            animate={progress < 0.1 ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.5, repeat: progress < 0.1 ? Infinity : 0 }}
          >
            {time.display}
          </motion.div>
          <div className="moderntimer-session">{currentSession?.nom_session}</div>
          <div className="moderntimer-status">
            {state?.mode === 'play' && <span className="playing">EN COURS</span>}
            {state?.mode === 'pause' && <span className="paused">PAUSE</span>}
            {state?.mode === 'termine' && <span className="done">TERMINÉ</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

// DeLorean Timer - Back to the Future LED style
const DeLoreanDisplay = ({ time, state, currentSession, sessionColor }) => {
  // Seven-segment digit component
  const SevenSegmentDigit = ({ digit, color = '#FF3333' }) => {
    const segments = {
      '0': [1,1,1,1,1,1,0],
      '1': [0,1,1,0,0,0,0],
      '2': [1,1,0,1,1,0,1],
      '3': [1,1,1,1,0,0,1],
      '4': [0,1,1,0,0,1,1],
      '5': [1,0,1,1,0,1,1],
      '6': [1,0,1,1,1,1,1],
      '7': [1,1,1,0,0,0,0],
      '8': [1,1,1,1,1,1,1],
      '9': [1,1,1,1,0,1,1]
    };

    const active = segments[digit] || segments['0'];
    const segmentPaths = [
      'M 10 5 L 50 5 L 45 15 L 15 15 Z',     // top (a)
      'M 55 10 L 55 45 L 48 50 L 48 20 Z',   // top-right (b)
      'M 55 55 L 55 90 L 48 85 L 48 60 Z',   // bottom-right (c)
      'M 10 95 L 50 95 L 45 85 L 15 85 Z',   // bottom (d)
      'M 5 55 L 5 90 L 12 85 L 12 60 Z',     // bottom-left (e)
      'M 5 10 L 5 45 L 12 50 L 12 20 Z',     // top-left (f)
      'M 10 50 L 50 50 L 48 55 L 48 45 L 12 45 L 12 55 Z' // middle (g)
    ];

    return (
      <svg viewBox="0 0 60 100" className="seven-segment">
        {segmentPaths.map((path, i) => (
          <path
            key={i}
            d={path}
            fill={active[i] ? color : 'rgba(100,30,30,0.3)'}
            style={{ filter: active[i] ? `drop-shadow(0 0 8px ${color})` : 'none' }}
          />
        ))}
      </svg>
    );
  };

  const mins = String(time.mins).padStart(2, '0');
  const secs = String(time.secs).padStart(2, '0');

  return (
    <div className="delorean-wrapper">
      <div className="delorean-panel">
        {/* Header plate */}
        <div className="delorean-header">
          <div className="delorean-label">DESTINATION TIME</div>
          <div className="delorean-rivets">
            <span className="rivet"></span>
            <span className="rivet"></span>
          </div>
        </div>

        {/* Main display */}
        <div className="delorean-display">
          <div className="delorean-row">
            <div className="delorean-label-sm">MIN</div>
            <div className="delorean-digits">
              <SevenSegmentDigit digit={mins[0]} color="#FF3333" />
              <SevenSegmentDigit digit={mins[1]} color="#FF3333" />
            </div>
            <div className="delorean-colon">
              <span></span>
              <span></span>
            </div>
            <div className="delorean-digits">
              <SevenSegmentDigit digit={secs[0]} color="#FF3333" />
              <SevenSegmentDigit digit={secs[1]} color="#FF3333" />
            </div>
            <div className="delorean-label-sm">SEC</div>
          </div>
        </div>

        {/* Session info */}
        <div className="delorean-session">
          <span className="session-name">{currentSession?.nom_session}</span>
          <span className={`session-status ${state?.mode}`}>
            {state?.mode === 'play' && '● RUNNING'}
            {state?.mode === 'pause' && '○ STOPPED'}
            {state?.mode === 'termine' && '✓ COMPLETE'}
          </span>
        </div>

        {/* Bottom rivets */}
        <div className="delorean-footer">
          <span className="rivet"></span>
          <span className="rivet"></span>
          <span className="rivet"></span>
          <span className="rivet"></span>
        </div>
      </div>
    </div>
  );
};

// LED Board - Red LED scoreboard style
const LEDBoardDisplay = ({ time, state, currentSession, progress }) => {
  // Generate LED dot matrix for a character
  const LEDChar = ({ char, color = '#FF0000' }) => {
    // 5x7 LED matrix patterns
    const patterns = {
      '0': ['01110','10001','10011','10101','11001','10001','01110'],
      '1': ['00100','01100','00100','00100','00100','00100','01110'],
      '2': ['01110','10001','00001','00110','01000','10000','11111'],
      '3': ['01110','10001','00001','00110','00001','10001','01110'],
      '4': ['00010','00110','01010','10010','11111','00010','00010'],
      '5': ['11111','10000','11110','00001','00001','10001','01110'],
      '6': ['00110','01000','10000','11110','10001','10001','01110'],
      '7': ['11111','00001','00010','00100','01000','01000','01000'],
      '8': ['01110','10001','10001','01110','10001','10001','01110'],
      '9': ['01110','10001','10001','01111','00001','00010','01100'],
      ':': ['00000','00100','00100','00000','00100','00100','00000'],
      ' ': ['00000','00000','00000','00000','00000','00000','00000']
    };

    const pattern = patterns[char] || patterns[' '];

    return (
      <div className="led-char">
        {pattern.map((row, rowIndex) => (
          <div key={rowIndex} className="led-row">
            {row.split('').map((dot, colIndex) => (
              <span
                key={colIndex}
                className={`led-dot ${dot === '1' ? 'on' : 'off'}`}
                style={dot === '1' ? {
                  backgroundColor: color,
                  boxShadow: `0 0 6px ${color}, 0 0 12px ${color}`
                } : {}}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  const displayTime = `${String(time.mins).padStart(2, '0')}:${String(time.secs).padStart(2, '0')}`;

  return (
    <div className="ledboard-wrapper">
      <div className="ledboard-frame">
        {/* LED Border */}
        <div className="ledboard-border">
          {[...Array(40)].map((_, i) => (
            <span
              key={i}
              className={`border-led ${i % 3 === 0 ? 'on' : 'off'}`}
              style={{ animationDelay: `${i * 0.05}s` }}
            />
          ))}
        </div>

        {/* Main display area */}
        <div className="ledboard-display">
          {/* Session name */}
          <div className="ledboard-title">
            {currentSession?.nom_session?.toUpperCase() || 'TIMER'}
          </div>

          {/* Time display */}
          <div className="ledboard-time">
            {displayTime.split('').map((char, i) => (
              <LEDChar
                key={i}
                char={char}
                color={progress < 0.15 ? '#FF0000' : '#FF3300'}
              />
            ))}
          </div>

          {/* Status bar */}
          <div className="ledboard-status">
            <div className="status-indicator">
              <span className={`status-light ${state?.mode}`}></span>
              <span className="status-text">
                {state?.mode === 'play' && 'RUNNING'}
                {state?.mode === 'pause' && 'PAUSED'}
                {state?.mode === 'termine' && 'COMPLETE'}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        </div>
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
  const [showUI, setShowUI] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [currentClock, setCurrentClock] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Display options hook
  const { options: displayOptions, updateOption } = useDisplayOptions();

  // Current time clock
  useEffect(() => {
    if (displayOptions.showCurrentTime) {
      const updateClock = () => {
        setCurrentClock(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      };
      updateClock();
      const interval = setInterval(updateClock, 1000);
      return () => clearInterval(interval);
    }
  }, [displayOptions.showCurrentTime]);

  // Confetti effect on timer complete
  useEffect(() => {
    if (state?.mode === 'termine' && displayOptions.confettiOnEnd) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [state?.mode, displayOptions.confettiOnEnd]);

  // Keyboard shortcuts handlers
  const keyboardHandlers = {
    togglePlayPause: () => {
      // Display page is view-only, but we can trigger visual effects
      console.log('Play/Pause - use remote control');
    },
    toggleFullscreen: () => {
      if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    },
    exitFullscreen: () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    },
    toggleMute: () => setSoundEnabled(prev => !prev),
    toggleUI: () => setShowUI(prev => !prev),
    cycleTheme: () => {
      const themeIds = Object.keys(VISUAL_THEMES);
      const currentIndex = themeIds.indexOf(activeTheme?.id || 'luxe');
      const nextIndex = (currentIndex + 1) % themeIds.length;
      setActiveTheme(VISUAL_THEMES[themeIds[nextIndex]]);
    },
    cycleFormat: () => {
      const formatIds = Object.keys(TIMER_FORMATS);
      const currentIndex = formatIds.indexOf(activeFormat);
      const nextIndex = (currentIndex + 1) % formatIds.length;
      setActiveFormat(formatIds[nextIndex]);
    },
    toggleDarkMode: () => {
      if (activeTheme?.isLight) {
        setActiveTheme(VISUAL_THEMES.luxe);
      } else {
        setActiveTheme(VISUAL_THEMES.aplat);
      }
    },
    toggleAnnotations: () => updateOption('showFacilitatorName', !displayOptions.showFacilitatorName),
    copyCode: () => {
      navigator.clipboard.writeText(code);
    },
    toggleQRCode: () => setShowQRCode(prev => !prev),
    showHelp: () => {} // Handled by hook
  };

  const { showHelp, setShowHelp, getShortcutsList } = useKeyboardShortcuts(keyboardHandlers, true);

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

            // Sync theme from server state
            if (data.theme && VISUAL_THEMES[data.theme]) {
              setActiveTheme(VISUAL_THEMES[data.theme]);
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
          {activeFormat === 'timetimer' && (
            <TimeTimerDisplay
              progress={progress} time={time} state={state}
              currentSession={currentSession} sessionColor={sessionColor}
            />
          )}
          {activeFormat === 'moderntimer' && (
            <ModernTimerDisplay
              progress={progress} time={time} state={state}
              currentSession={currentSession} sessionColor={sessionColor}
            />
          )}
          {activeFormat === 'delorean' && (
            <DeLoreanDisplay
              time={time} state={state}
              currentSession={currentSession} sessionColor={sessionColor}
            />
          )}
          {activeFormat === 'ledboard' && (
            <LEDBoardDisplay
              time={time} state={state}
              currentSession={currentSession} progress={progress}
            />
          )}
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
            <span>Timer par</span>
            <strong>INSUFFLE</strong>
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
                  src={getQRCodeUrl(`${window.location.origin}/remote/${code}`, 250)}
                  alt="QR Code pour rejoindre le timer"
                />
              </div>
              <p className="qr-code-text">Code: <strong>{code}</strong></p>
              <p className="qr-url">{window.location.origin}/remote/{code}</p>
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
