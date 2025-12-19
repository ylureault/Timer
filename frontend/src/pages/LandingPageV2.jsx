import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import '../styles/LandingPageV2.css';

export default function LandingPageV2() {
  const [joinCode, setJoinCode] = useState('');
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

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
        <div className="bg-shape shape-1"></div>
        <div className="bg-shape shape-2"></div>
        <div className="bg-shape shape-3"></div>
      </div>

      {/* Header */}
      <header className="landing-header">
        <div className="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
          <span>Insuffle Timer</span>
        </div>
        <nav className="header-nav">
          {isAuthenticated ? (
            <Link to="/dashboard" className="nav-btn primary">
              Mon Dashboard
            </Link>
          ) : (
            <>
              <Link to="/auth" className="nav-btn secondary">
                Connexion
              </Link>
              <Link to="/auth" className="nav-btn primary">
                Créer un compte
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero section */}
      <main className="landing-main">
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1>
            Gérez vos temps collectifs
            <span className="highlight"> comme un pro</span>
          </h1>
          <p className="hero-subtitle">
            Créez des timers visuels pour vos ateliers, formations, réunions et événements.
            Partagez avec vos participants en un clic.
          </p>

          {/* Join a timer */}
          <div className="join-section">
            <form onSubmit={handleJoin} className="join-form">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Entrez le code à 4 chiffres"
                maxLength={4}
                pattern="[0-9]*"
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Rejoindre
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12,5 19,12 12,19"/>
                </svg>
              </motion.button>
            </form>
          </div>

          {/* CTA buttons */}
          <div className="cta-buttons">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to={isAuthenticated ? '/dashboard' : '/auth'} className="cta-btn primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
                {isAuthenticated ? 'Mes Timers' : 'Créer mon compte gratuit'}
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Features preview */}
        <motion.div
          className="features-preview"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="preview-card">
            <div className="preview-timer">
              <div className="timer-ring">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#667eea"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="282.7"
                    strokeDashoffset="70"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="timer-value">5:00</div>
              </div>
              <div className="preview-session">Brainstorming</div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Features section */}
      <section className="features-section">
        <h2>Tout pour animer vos sessions</h2>
        <div className="features-grid">
          <motion.div
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="feature-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
            </div>
            <h3>Timer visuel</h3>
            <p>Affichage style TimeTimer avec cercle décroissant. Visible pour tous les participants.</p>
          </motion.div>

          <motion.div
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <div className="feature-icon" style={{ background: '#f0fdf4', color: '#22c55e' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                <line x1="12" y1="18" x2="12.01" y2="18"/>
              </svg>
            </div>
            <h3>Télécommande</h3>
            <p>Contrôlez votre timer depuis votre téléphone. Play, pause, navigation entre sessions.</p>
          </motion.div>

          <motion.div
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <div className="feature-icon" style={{ background: '#fefce8', color: '#eab308' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h3>Partage facile</h3>
            <p>Code à 4 chiffres pour rejoindre. Idéal pour ateliers et formations.</p>
          </motion.div>

          <motion.div
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <div className="feature-icon" style={{ background: '#faf5ff', color: '#a855f7' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <h3>Multi-sessions</h3>
            <p>Créez plusieurs sessions avec durées et couleurs personnalisées.</p>
          </motion.div>
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
          <p>
            Propulsé par <a href="https://insuffle.be" target="_blank" rel="noopener noreferrer">Insuffle</a>
            {' • '}
            Facilitation visuelle & intelligence collective
          </p>
        </div>
      </footer>
    </div>
  );
}
