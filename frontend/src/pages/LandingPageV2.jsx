import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import '../styles/LandingPageV2.css';

const API_URL = import.meta.env.VITE_API_URL ?? '';

// Animated gradient mesh background
const GradientMesh = () => (
  <div className="gradient-mesh">
    <div className="mesh-gradient mesh-1" />
    <div className="mesh-gradient mesh-2" />
    <div className="mesh-gradient mesh-3" />
    <div className="noise-overlay" />
  </div>
);

// Floating particles
const FloatingParticles = () => (
  <div className="floating-particles">
    {[...Array(20)].map((_, i) => (
      <motion.div
        key={i}
        className="particle"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: `${2 + Math.random() * 4}px`,
          height: `${2 + Math.random() * 4}px`,
        }}
        animate={{
          y: [0, -30, 0],
          opacity: [0.3, 0.8, 0.3],
        }}
        transition={{
          duration: 3 + Math.random() * 2,
          repeat: Infinity,
          delay: Math.random() * 2,
        }}
      />
    ))}
  </div>
);

// Features data with enhanced descriptions
const FEATURES = [
  {
    icon: '🎯',
    title: 'Time Timer Visuel',
    desc: 'Visualisez le temps qui passe comme jamais auparavant',
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    highlight: true
  },
  {
    icon: '📱',
    title: 'Controle Mobile',
    desc: 'Pilotez depuis votre smartphone en temps reel',
    gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)'
  },
  {
    icon: '🎨',
    title: '13+ Formats',
    desc: 'DeLorean, LED Board, Modern Timer et plus encore',
    gradient: 'linear-gradient(135deg, #f43f5e, #ec4899)'
  },
  {
    icon: '⚡',
    title: 'Sync Instantanee',
    desc: 'WebSocket pour une synchronisation < 100ms',
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)'
  },
  {
    icon: '👥',
    title: 'Code 6 Chiffres',
    desc: 'Partagez facilement avec XXX-XXX',
    gradient: 'linear-gradient(135deg, #10b981, #06b6d4)'
  },
  {
    icon: '🔒',
    title: '100% Gratuit',
    desc: 'Aucune carte bancaire requise',
    gradient: 'linear-gradient(135deg, #8b5cf6, #6366f1)'
  }
];

// Logos of "trusted by" companies (placeholder text)
const TRUSTED_BY = [
  'Workshops', 'Formations', 'Agile Teams', 'Facilitators', 'Coaches', 'Trainers'
];

// Timer format showcase
const TIMER_FORMATS = [
  { name: 'Time Timer', style: 'Classique disque rouge', color: '#E53935' },
  { name: 'DeLorean', style: 'Retour vers le Futur', color: '#00ff00' },
  { name: 'LED Board', style: 'Panneau scoreboard', color: '#ff0000' },
  { name: 'Modern', style: 'Segments modernes', color: '#FF6B35' },
  { name: 'Digital', style: 'Affichage LED', color: '#6C5CE7' },
  { name: 'Gauge', style: 'Jauge plein ecran', color: '#00CEC9' }
];

export default function LandingPageV2() {
  const [joinCode, setJoinCode] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState({ loading: false, message: '', type: '' });
  const [activeFormat, setActiveFormat] = useState(0);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const heroRef = useRef(null);

  // Parallax scroll effect
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroY = useTransform(scrollY, [0, 400], [0, 100]);

  // Rotating words animation
  const words = ['ateliers', 'formations', 'reunions', 'sprints', 'workshops'];
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Rotate through timer formats
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFormat((prev) => (prev + 1) % TIMER_FORMATS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Newsletter subscription handler
  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;

    setNewsletterStatus({ loading: true, message: '', type: '' });

    try {
      const res = await fetch(`${API_URL}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail })
      });
      const data = await res.json();

      if (data.success) {
        setNewsletterStatus({ loading: false, message: data.message, type: 'success' });
        setNewsletterEmail('');
      } else {
        setNewsletterStatus({ loading: false, message: data.error || 'Une erreur est survenue', type: 'error' });
      }
    } catch (err) {
      setNewsletterStatus({ loading: false, message: 'Erreur de connexion', type: 'error' });
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (joinCode.trim()) {
      navigate(`/display/${joinCode.trim()}`);
    }
  };

  return (
    <div className="landing-v2 premium">
      {/* Background */}
      <GradientMesh />
      <FloatingParticles />

      {/* Header */}
      <motion.header
        className="landing-header glass"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100 }}
      >
        <Link to="/" className="logo">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </div>
          <span className="logo-text">Insuffle<span className="logo-accent">Timer</span></span>
        </Link>

        <nav className="header-nav">
          <a href="#features" className="nav-link">Fonctionnalites</a>
          <a href="#formats" className="nav-link">Formats</a>
          <Link to="/marketplace" className="nav-link">Marketplace</Link>
          <Link to="/blog" className="nav-link">Blog</Link>
          {isAuthenticated ? (
            <Link to="/dashboard" className="nav-btn primary">
              Dashboard
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          ) : (
            <Link to="/auth" className="nav-btn primary">
              Commencer
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          )}
        </nav>

        {/* Mobile menu button */}
        <button className="mobile-menu-btn">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </motion.header>

      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        className="hero-section"
        style={{ opacity: heroOpacity, y: heroY }}
      >
        <div className="hero-content">
          {/* Badge */}
          <motion.div
            className="hero-badge"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="badge-pulse" />
            <span className="badge-text">100% Gratuit - Aucune carte requise</span>
            <span className="badge-arrow">→</span>
          </motion.div>

          {/* Main Title */}
          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Le timer visuel
            <br />
            pour vos{' '}
            <span className="word-wrapper">
              <AnimatePresence mode="wait">
                <motion.span
                  key={wordIndex}
                  className="rotating-word"
                  initial={{ y: 50, opacity: 0, rotateX: -90 }}
                  animate={{ y: 0, opacity: 1, rotateX: 0 }}
                  exit={{ y: -50, opacity: 0, rotateX: 90 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  {words[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="hero-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            L'outil prefere des facilitateurs. Creez des sessions chronometrees
            spectaculaires et partagez-les avec un simple code.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="hero-cta"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link
              to={isAuthenticated ? '/dashboard' : '/auth'}
              className="cta-primary"
            >
              <span>Creer un timer</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>

            <form onSubmit={handleJoin} className="join-inline">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^0-9]/g, '');
                  if (value.length > 3) {
                    value = value.slice(0, 3) + '-' + value.slice(3, 6);
                  }
                  if (value.length <= 7) {
                    setJoinCode(value);
                  }
                }}
                placeholder="XXX-XXX"
                maxLength={7}
              />
              <button type="submit" disabled={joinCode.length < 7}>
                Rejoindre
              </button>
            </form>
          </motion.div>

          {/* Benefits instead of fake social proof */}
          <motion.div
            className="hero-benefits"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <div className="benefit-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>100% gratuit</span>
            </div>
            <div className="benefit-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>Sans inscription</span>
            </div>
            <div className="benefit-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>Open source</span>
            </div>
          </motion.div>
        </div>

        {/* Hero Visual */}
        <motion.div
          className="hero-visual"
          initial={{ opacity: 0, scale: 0.8, rotateY: -20 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <div className="preview-wrapper">
            <div className="preview-browser">
              <div className="browser-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="browser-url">timer.insuffle.com</div>
            </div>
            <div className="preview-screen">
              <div className="preview-timer-container">
                <motion.div
                  className="preview-session-badge"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Session 2/5
                </motion.div>
                <div className="preview-session-name">Brainstorming</div>
                <div className="preview-timer">
                  <svg className="timer-ring" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" className="ring-bg" />
                    <motion.circle
                      cx="50" cy="50" r="42"
                      className="ring-progress"
                      strokeDasharray="264"
                      strokeDashoffset="66"
                      transform="rotate(-90 50 50)"
                      animate={{ strokeDashoffset: [66, 132, 66] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    />
                  </svg>
                  <div className="timer-center">
                    <motion.span
                      className="timer-value"
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      5:00
                    </motion.span>
                    <span className="timer-status">En cours</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="preview-glow" />
          </div>

          {/* Floating badges around preview */}
          <motion.div
            className="floating-badge badge-format"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <span className="badge-icon">🎨</span>
            <span>13+ Formats</span>
          </motion.div>

          <motion.div
            className="floating-badge badge-sync"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1 }}
          >
            <span className="badge-icon">⚡</span>
            <span>Temps reel</span>
          </motion.div>

          <motion.div
            className="floating-badge badge-mobile"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
          >
            <span className="badge-icon">📱</span>
            <span>Mobile</span>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Trusted By Strip */}
      <section className="trusted-section">
        <div className="trusted-content">
          <span className="trusted-label">Ideal pour</span>
          <div className="trusted-logos">
            {TRUSTED_BY.map((name, i) => (
              <span key={i} className="trusted-item">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" id="features">
        <div className="section-container">
          <motion.div
            className="section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="section-tag">Fonctionnalites</span>
            <h2>Tout ce dont vous avez besoin</h2>
            <p>Un outil complet pour gerer le temps de vos sessions</p>
          </motion.div>

          <div className="features-grid">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                className={`feature-card ${feature.highlight ? 'highlight' : ''}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                <div className="feature-icon" style={{ background: feature.gradient }}>
                  {feature.icon}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
                {feature.highlight && (
                  <div className="feature-badge">Populaire</div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timer Formats Showcase */}
      <section className="formats-section" id="formats">
        <div className="section-container">
          <motion.div
            className="section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="section-tag">Formats</span>
            <h2>13+ styles de timer uniques</h2>
            <p>Du classique Time Timer au style DeLorean</p>
          </motion.div>

          <div className="formats-showcase">
            <div className="formats-list">
              {TIMER_FORMATS.map((format, i) => (
                <motion.div
                  key={format.name}
                  className={`format-item ${i === activeFormat ? 'active' : ''}`}
                  onClick={() => setActiveFormat(i)}
                  whileHover={{ x: 10 }}
                >
                  <div className="format-indicator" style={{ background: format.color }} />
                  <div className="format-info">
                    <h4>{format.name}</h4>
                    <span>{format.style}</span>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="format-preview"
              key={activeFormat}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="format-preview-screen" style={{ '--accent': TIMER_FORMATS[activeFormat].color }}>
                <div className="format-demo">
                  <div className="format-timer-display">
                    <span className="format-time">12:34</span>
                    <span className="format-name">{TIMER_FORMATS[activeFormat].name}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="section-container">
          <div className="stats-grid">
            <motion.div
              className="stat-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="stat-value">100%</span>
              <span className="stat-label">Gratuit</span>
            </motion.div>
            <motion.div
              className="stat-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <span className="stat-value">13+</span>
              <span className="stat-label">Formats de timer</span>
            </motion.div>
            <motion.div
              className="stat-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <span className="stat-value">&lt;100ms</span>
              <span className="stat-label">Synchronisation</span>
            </motion.div>
            <motion.div
              className="stat-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <span className="stat-value">∞</span>
              <span className="stat-label">Participants</span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="how-section">
        <div className="section-container">
          <motion.div
            className="section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="section-tag">Comment ca marche</span>
            <h2>Pret en 30 secondes</h2>
            <p>Trois etapes simples pour demarrer</p>
          </motion.div>

          <div className="steps-grid">
            <motion.div
              className="step-card"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Creez votre timer</h3>
                <p>Definissez vos sessions avec noms, durees et couleurs personnalisees</p>
              </div>
            </motion.div>

            <motion.div
              className="step-card"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Partagez le code</h3>
                <p>Un code XXX-XXX unique pour que tous rejoignent</p>
              </div>
            </motion.div>

            <motion.div
              className="step-card"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Controlez en temps reel</h3>
                <p>Pilotez depuis votre mobile, tous voient les changements instantanement</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="section-container">
          <motion.div
            className="cta-card"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="cta-glow" />
            <h2>Pret a transformer vos sessions ?</h2>
            <p>Rejoignez des centaines de facilitateurs qui utilisent Insuffle Timer</p>
            <div className="cta-buttons">
              <Link to={isAuthenticated ? '/dashboard' : '/auth'} className="cta-primary large">
                {isAuthenticated ? 'Acceder au Dashboard' : 'Commencer gratuitement'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
            </div>
            <p className="cta-note">Aucune carte bancaire requise</p>
          </motion.div>
        </div>
      </section>

      {/* Share Section */}
      <section className="share-section">
        <div className="section-container">
          <motion.div
            className="share-content"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h3>Partagez Insuffle Timer</h3>
            <p>Faites decouvrir l'outil a vos collegues</p>
            <div className="social-share-buttons">
              <a
                href={`https://wa.me/?text=${encodeURIComponent('Decouvrez Insuffle Timer - Le timer visuel pour vos ateliers ! https://timer.insuffle.com')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn whatsapp"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://timer.insuffle.com')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn linkedin"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Decouvrez Insuffle Timer - Le timer visuel pour vos ateliers !')}&url=${encodeURIComponent('https://timer.insuffle.com')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn twitter"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                X
              </a>
              <button
                className="social-btn copy"
                onClick={() => {
                  navigator.clipboard.writeText('https://timer.insuffle.com');
                  alert('Lien copie !');
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copier
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="newsletter-section">
        <div className="section-container">
          <motion.div
            className="newsletter-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="newsletter-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div className="newsletter-text">
              <h3>Restez informe</h3>
              <p>Conseils de facilitation et nouvelles fonctionnalites</p>
            </div>
            <form className="newsletter-form" onSubmit={handleNewsletterSubmit}>
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                disabled={newsletterStatus.loading}
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={newsletterStatus.loading}
              >
                {newsletterStatus.loading ? '...' : "S'inscrire"}
              </motion.button>
            </form>
            {newsletterStatus.message && (
              <motion.p
                className={`newsletter-message ${newsletterStatus.type}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {newsletterStatus.message}
              </motion.p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-main">
            <div className="footer-brand">
              <div className="logo">
                <div className="logo-icon small">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12,6 12,12 16,14"/>
                  </svg>
                </div>
                <span>Insuffle Timer</span>
              </div>
              <p>L'outil de gestion du temps visuel pour les facilitateurs et equipes.</p>
            </div>

            <div className="footer-links">
              <div className="footer-col">
                <h4>Produit</h4>
                <a href="#features">Fonctionnalites</a>
                <a href="#formats">Formats</a>
                <Link to="/marketplace">Marketplace</Link>
                <Link to="/embed">Integration</Link>
              </div>
              <div className="footer-col">
                <h4>Ressources</h4>
                <Link to="/blog">Blog</Link>
                <Link to="/release-notes">Notes de version</Link>
                <a href="https://insuffle.com/contact" target="_blank" rel="noopener noreferrer">Support</a>
              </div>
              <div className="footer-col">
                <h4>Legal</h4>
                <a href="#">Mentions legales</a>
                <a href="#">Confidentialite</a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© 2025 Insuffle Timer</span>
            <span className="footer-divider">•</span>
            <span>Propulse par <a href="https://insuffle.com" target="_blank" rel="noopener noreferrer">Insuffle</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
