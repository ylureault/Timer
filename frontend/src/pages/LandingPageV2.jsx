import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import '../styles/LandingPageV2.css';

const API_URL = import.meta.env.VITE_API_URL ?? '';

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

// Features data
const FEATURES = [
  { icon: '⏱️', title: 'Timer circulaire', desc: 'Style TimeTimer avec temps visible en un coup d\'œil', color: '#6C5CE7', category: 'core' },
  { icon: '📱', title: 'Télécommande mobile', desc: 'Contrôlez depuis votre smartphone en temps réel', color: '#00CEC9', category: 'core' },
  { icon: '🎨', title: 'Sessions colorées', desc: 'Personnalisez couleurs et durées pour chaque session', color: '#FF6B6B', category: 'core' },
  { icon: '⚡', title: 'Sync temps réel', desc: 'WebSocket pour synchronisation instantanée', color: '#FDCB6E', category: 'core' },
  { icon: '📋', title: 'Templates prédéfinis', desc: 'Daily, Pomodoro, Design Thinking, Formation...', color: '#A29BFE', category: 'productivity' },
  { icon: '👥', title: 'Multi-participants', desc: 'Code sécurisé XXX-XXX pour rejoindre facilement', color: '#74B9FF', category: 'collaboration' },
  { icon: '🔐', title: 'Comptes sécurisés', desc: 'Créez un compte pour sauvegarder vos timers', color: '#55EFC4', category: 'security' },
  { icon: '📊', title: 'Dashboard intuitif', desc: 'Gérez jusqu\'à 5 timers par compte', color: '#FD79A8', category: 'productivity' },
  { icon: '🎬', title: 'Animations fluides', desc: 'Transitions et effets visuels spectaculaires', color: '#E17055', category: 'ux' },
  { icon: '🔔', title: 'Alertes visuelles', desc: 'Compte à rebours et pulsations d\'alerte', color: '#00B894', category: 'ux' },
  { icon: '📺', title: 'Mode plein écran', desc: 'Affichage optimisé pour vidéoprojecteur', color: '#6C5CE7', category: 'display' },
  { icon: '💬', title: 'Messages en direct', desc: 'Envoyez des messages sur l\'écran principal', color: '#FDCB6E', category: 'collaboration' }
];

// Use cases
const USE_CASES = [
  { title: 'Ateliers collaboratifs', desc: 'Structurez vos sessions de brainstorming', icon: '💡' },
  { title: 'Formations', desc: 'Gérez le temps de vos modules', icon: '📚' },
  { title: 'Réunions d\'équipe', desc: 'Respectez l\'ordre du jour', icon: '👥' },
  { title: 'Sprints Agile', desc: 'Daily meetings et rétrospectives', icon: '🏃' },
  { title: 'Présentations', desc: 'Maîtrisez votre temps de parole', icon: '🎤' },
  { title: 'Pomodoro', desc: 'Alternez focus et pauses', icon: '🍅' }
];

export default function LandingPageV2() {
  const [joinCode, setJoinCode] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [testimonials, setTestimonials] = useState([]);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState({ loading: false, message: '', type: '' });
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

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

  // Rotating words animation
  const words = ['ateliers', 'formations', 'réunions', 'sprints', 'workshops'];
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Fetch testimonials
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const res = await fetch(`${API_URL}/api/testimonials`);
        const data = await res.json();
        if (data.success) {
          setTestimonials(data.testimonials);
        }
      } catch (err) {
        console.log('No testimonials yet');
      }
    };
    fetchTestimonials();
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
        <div className="grid-pattern" />
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
          <a href="#features" className="nav-btn ghost">Fonctionnalités</a>
          <a href="#usecases" className="nav-btn ghost">Cas d'usage</a>
          <Link to="/blog" className="nav-btn ghost">Blog</Link>
          <Link to="/marketplace" className="nav-btn ghost">Marketplace</Link>
          {isAuthenticated ? (
            <Link to="/dashboard" className="nav-btn primary">
              <span>Dashboard</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          ) : (
            <Link to="/auth" className="nav-btn primary">
              <span>Commencer</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
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
            100% Gratuit - Aucune carte requise
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
            L'outil de gestion du temps préféré des facilitateurs.
            <br />
            Créez des sessions chronométrées spectaculaires, partagez avec un code sécurisé.
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
                onChange={(e) => {
                  // Auto-format as XXX-XXX
                  let value = e.target.value.replace(/[^0-9]/g, '');
                  if (value.length > 3) {
                    value = value.slice(0, 3) + '-' + value.slice(3, 6);
                  }
                  if (value.length <= 7) {
                    setJoinCode(value);
                  }
                }}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                placeholder="Code XXX-XXX"
                maxLength={7}
                aria-label="Code de session format XXX-XXX"
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={joinCode.length < 7}
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
                  <span>Prêt en 30 secondes</span>
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

      {/* Stats */}
      <section className="stats-section">
        <motion.div
          className="stats-grid"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="stat-item">
            <span className="stat-value">100%</span>
            <span className="stat-label">Gratuit</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">5</span>
            <span className="stat-label">Timers par compte</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">&lt;1s</span>
            <span className="stat-label">Synchronisation</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">∞</span>
            <span className="stat-label">Participants</span>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="features" id="features">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2>Fonctionnalités complètes</h2>
          <p>Tout ce dont vous avez besoin pour gérer le temps de vos sessions</p>
        </motion.div>

        <div className="features-grid">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
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

      {/* Use Cases */}
      <section className="usecases" id="usecases">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2>Parfait pour tous vos cas d'usage</h2>
          <p>Insuffle Timer s'adapte à tous les contextes professionnels</p>
        </motion.div>

        <div className="usecases-grid">
          {USE_CASES.map((usecase, i) => (
            <motion.div
              key={usecase.title}
              className="usecase-card"
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <span className="usecase-icon">{usecase.icon}</span>
              <div className="usecase-content">
                <h3>{usecase.title}</h3>
                <p>{usecase.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="testimonials" id="testimonials">
          <motion.div
            className="section-header"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2>Ce que nos utilisateurs disent</h2>
            <p>Découvrez les retours de la communauté</p>
          </motion.div>

          <div className="testimonials-grid">
            {testimonials.slice(0, 6).map((testimonial, i) => (
              <motion.div
                key={testimonial.id}
                className="testimonial-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="testimonial-stars">
                  {'★'.repeat(testimonial.rating)}{'☆'.repeat(5 - testimonial.rating)}
                </div>
                <p className="testimonial-text">"{testimonial.content}"</p>
                <div className="testimonial-author">
                  <div className="author-avatar">
                    {testimonial.author_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="author-info">
                    <strong>{testimonial.author_name}</strong>
                    {testimonial.company && <span>{testimonial.company}</span>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="cta-section">
        <motion.div
          className="cta-content"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2>Prêt à transformer vos sessions ?</h2>
          <p>Créez votre premier timer en moins de 30 secondes</p>
          <Link to={isAuthenticated ? '/dashboard' : '/auth'} className="cta-button">
            <span>{isAuthenticated ? 'Accéder au Dashboard' : 'Commencer gratuitement'}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </motion.div>
      </section>

      {/* Share Section */}
      <section className="share-section">
        <motion.div
          className="share-content"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h3>Partagez Insuffle Timer</h3>
          <p>Faites découvrir l'outil à vos collègues</p>
          <div className="social-share-buttons">
            <a
              href={`https://wa.me/?text=${encodeURIComponent('Découvrez Insuffle Timer - Le timer visuel pour vos ateliers et formations ! 🚀 https://timer.insuffle.com')}`}
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
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Découvrez Insuffle Timer - Le timer visuel pour vos ateliers et formations ! 🚀')}&url=${encodeURIComponent('https://timer.insuffle.com')}`}
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
                alert('Lien copié !');
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
      </section>

      {/* Newsletter Section */}
      <section className="newsletter-section">
        <motion.div
          className="newsletter-content"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="newsletter-icon">📬</div>
          <h3>Restez informé</h3>
          <p>Recevez nos conseils de facilitation et les nouvelles fonctionnalités</p>
          <form className="newsletter-form" onSubmit={handleNewsletterSubmit}>
            <div className="newsletter-input-group">
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
                {newsletterStatus.loading ? 'Envoi...' : "S'inscrire"}
              </motion.button>
            </div>
            {newsletterStatus.message && (
              <motion.p
                className={`newsletter-message ${newsletterStatus.type}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {newsletterStatus.message}
              </motion.p>
            )}
          </form>
          <p className="newsletter-privacy">Pas de spam, désinscription en 1 clic</p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-main">
            <div className="footer-brand">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              <span>Insuffle Timer</span>
            </div>
            <p className="footer-desc">
              L'outil de gestion du temps visuel pour les facilitateurs, formateurs et équipes agiles.
            </p>
          </div>

          <div className="footer-links-grid">
            <div className="footer-col">
              <h4>Produit</h4>
              <a href="#features">Fonctionnalités</a>
              <a href="#usecases">Cas d'usage</a>
              <Link to="/auth">Créer un compte</Link>
            </div>
            <div className="footer-col">
              <h4>Ressources</h4>
              <Link to="/blog">Blog</Link>
              <Link to="/marketplace">Marketplace</Link>
              <Link to="/embed">Intégration</Link>
              <Link to="/release-notes">Notes de version</Link>
              <a href="https://insuffle.com/contact" target="_blank" rel="noopener noreferrer">Support</a>
            </div>
            <div className="footer-col">
              <h4>Légal</h4>
              <a href="#">Mentions légales</a>
              <a href="#">Confidentialité</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2025 Insuffle Timer. Propulsé par</span>
          <a href="https://insuffle.com" target="_blank" rel="noopener noreferrer">Insuffle</a>
          <span>- Facilitation & Intelligence Collective</span>
        </div>
      </footer>
    </div>
  );
}
