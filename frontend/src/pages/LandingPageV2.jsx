import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import '../styles/LandingPageV2.css';

// Animated background orbs
const Orb = ({ delay, size, color, x, y }) => (
  <motion.div
    className="orb"
    style={{
      width: size,
      height: size,
      background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
      left: x,
      top: y
    }}
    animate={{
      x: [0, 50, -30, 0],
      y: [0, -40, 60, 0],
      scale: [1, 1.2, 0.9, 1]
    }}
    transition={{
      duration: 20,
      delay,
      repeat: Infinity,
      ease: 'easeInOut'
    }}
  />
);

// Floating icon component
const FloatingIcon = ({ icon, delay, x, y }) => (
  <motion.div
    className="floating-icon"
    style={{ left: x, top: y }}
    animate={{
      y: [0, -20, 0],
      rotate: [0, 10, -10, 0]
    }}
    transition={{
      duration: 4,
      delay,
      repeat: Infinity,
      ease: 'easeInOut'
    }}
  >
    {icon}
  </motion.div>
);

export default function LandingPageV2() {
  const [joinCode, setJoinCode] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Rotating words animation
  const words = ['ateliers', 'formations', 'réunions', 'sprints', 'workshops'];
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    if (joinCode.trim()) {
      navigate(`/display/${joinCode.trim()}`);
    }
  };

  return (
    <div className="landing-v2">
      {/* Animated background */}
      <div className="landing-bg">
        <Orb delay={0} size="600px" color="#6C5CE7" x="-10%" y="-20%" />
        <Orb delay={3} size="400px" color="#00CEC9" x="70%" y="60%" />
        <Orb delay={6} size="500px" color="#FF6B6B" x="80%" y="-10%" />
        <Orb delay={9} size="350px" color="#FDCB6E" x="10%" y="70%" />

        {/* Grid pattern */}
        <div className="grid-pattern" />
      </div>

      {/* Floating decorative icons */}
      <div className="floating-icons">
        <FloatingIcon icon="⏱️" delay={0} x="5%" y="20%" />
        <FloatingIcon icon="🎯" delay={1} x="90%" y="30%" />
        <FloatingIcon icon="✨" delay={2} x="15%" y="70%" />
        <FloatingIcon icon="🚀" delay={3} x="85%" y="75%" />
      </div>

      {/* Header */}
      <header className="landing-header">
        <motion.div
          className="logo"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </div>
          <span>Insuffle Timer</span>
        </motion.div>

        <motion.nav
          className="header-nav"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {isAuthenticated ? (
            <Link to="/dashboard" className="nav-btn primary">
              <span>Mon Dashboard</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          ) : (
            <>
              <Link to="/auth" className="nav-btn ghost">Connexion</Link>
              <Link to="/auth" className="nav-btn primary">
                <span>Créer un compte</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
            </>
          )}
        </motion.nav>
      </header>

      {/* Hero */}
      <main className="landing-main">
        <motion.div
          className="hero"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <motion.div
            className="hero-badge"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, delay: 0.5 }}
          >
            <span className="badge-dot" />
            Nouveau : Comptes utilisateurs disponibles
          </motion.div>

          <h1 className="hero-title">
            Le timer visuel pour vos
            <br />
            <span className="word-wrapper">
              <AnimatePresence mode="wait">
                <motion.span
                  key={wordIndex}
                  className="rotating-word"
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -40, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {words[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>

          <p className="hero-subtitle">
            Créez des sessions chronométrées avec un affichage spectaculaire.
            <br />
            Partagez avec un simple code à 4 chiffres.
          </p>

          {/* Join form */}
          <motion.form
            className="join-form"
            onSubmit={handleJoin}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className={`input-group ${isTyping ? 'focused' : ''}`}>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                placeholder="Code à 4 chiffres"
                maxLength={4}
                pattern="[0-9]*"
                inputMode="numeric"
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={joinCode.length < 4}
              >
                <span>Rejoindre</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </motion.button>
            </div>
          </motion.form>

          {/* CTA */}
          <motion.div
            className="cta-row"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <span className="cta-divider">ou</span>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to={isAuthenticated ? '/dashboard' : '/auth'}
                className="cta-btn"
              >
                <div className="cta-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="16"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                </div>
                <div className="cta-text">
                  <strong>{isAuthenticated ? 'Gérer mes timers' : 'Créer un timer gratuitement'}</strong>
                  <span>Jusqu'à 5 timers par compte</span>
                </div>
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Preview */}
        <motion.div
          className="preview-section"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <div className="preview-card">
            <div className="preview-screen">
              <div className="preview-header">
                <span className="preview-badge">Session 2/5</span>
                <span className="preview-title">Brainstorming</span>
              </div>
              <div className="preview-timer">
                <svg className="timer-ring" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6"/>
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="#6C5CE7"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray="264"
                    strokeDashoffset="66"
                    transform="rotate(-90 50 50)"
                    animate={{ strokeDashoffset: [66, 132, 198, 66] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  />
                </svg>
                <motion.span
                  className="timer-value"
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  5:00
                </motion.span>
              </div>
            </div>
            <div className="preview-glow" />
          </div>
        </motion.div>
      </main>

      {/* Features */}
      <section className="features">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Une expérience visuelle unique
        </motion.h2>

        <div className="features-grid">
          {[
            { icon: '⏱️', title: 'Timer circulaire', desc: 'Style TimeTimer avec temps visible en un coup d\'œil', color: '#6C5CE7' },
            { icon: '📱', title: 'Télécommande', desc: 'Contrôlez depuis votre smartphone', color: '#00CEC9' },
            { icon: '🎨', title: 'Personnalisable', desc: 'Couleurs et durées pour chaque session', color: '#FF6B6B' },
            { icon: '⚡', title: 'Temps réel', desc: 'Synchronisation instantanée WebSocket', color: '#FDCB6E' }
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              className="feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <div className="feature-icon" style={{ background: `${feature.color}20`, color: feature.color }}>
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
            <span>Insuffle Timer</span>
          </div>
          <div className="footer-links">
            <span>Propulsé par</span>
            <a href="https://insuffle.com" target="_blank" rel="noopener noreferrer">
              <strong>Insuffle</strong>
            </a>
            <span>•</span>
            <span>Facilitation & Intelligence Collective</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
