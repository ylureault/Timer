import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import '../styles/LandingPage.css'
import '../styles/HeroButtons.css'
import '../styles/PremiumEffects.css'

function LandingPage() {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')

  // Rotating words animation
  const words = [
    'ateliers', 'réunions', 'Codir', 'formations', 'webinaires', 'conférences',
    'workshops', 'séminaires', 'présentations', 'démos', 'trainings', 'sessions',
    'événements', 'cérémonies', 'interventions', 'masterclass', 'rendez-vous',
    'rencontres', 'animations', 'plénières'
  ]
  const [currentWordIndex, setCurrentWordIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % words.length)
    }, 2000) // Change word every 2 seconds

    return () => clearInterval(interval)
  }, [])

  const handleCreateSalon = () => {
    navigate('/create')
  }

  const handleJoinSalon = () => {
    if (joinCode.trim().length === 4) {
      navigate(`/salon/${joinCode}`)
    }
  }

  return (
    <div className="landing-page-modern">
      {/* Noise overlay INSUFFLE */}
      <div className="noise-overlay"></div>

      {/* HERO SECTION */}
      <section className="hero-modern">
        {/* Premium background effects */}
        <div className="gradient-mesh"></div>
        <div className="aurora-bg"></div>

        {/* Floating particles */}
        <div className="particle particle-1"></div>
        <div className="particle particle-2"></div>
        <div className="particle particle-3"></div>
        <div className="particle particle-4"></div>

        <div className="hero-bg">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>

        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="hero-content-modern"
          >
            <motion.div
              className="badge-hero"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              ⏱️ Timer Salon • Nouvelle génération
            </motion.div>

            <h1 className="hero-title-modern">
              Orchestrez le temps de vos
              <br />
              <span className="text-shine rotating-word" key={currentWordIndex}>
                {words[currentWordIndex]}
              </span>
            </h1>

            <p className="hero-subtitle-modern">
              Créez des séquences temporelles partagées, contrôlées à distance.
              <br />
              Simple, visuel, et terriblement efficace.
            </p>

            <motion.div
              className="hero-actions-modern"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              <motion.button
                className="btn-cta-hero btn-magnetic glow-insuffle ripple"
                onClick={handleCreateSalon}
                whileHover={{ scale: 1.05, boxShadow: "0 25px 70px rgba(31, 58, 139, 0.5)" }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="btn-cta-text">Créer mon premier salon</span>
                <span className="btn-cta-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </motion.button>

              <div className="divider-or">
                <span>ou</span>
              </div>

              <div className="join-input-hero glass-ultra">
                <input
                  type="text"
                  placeholder="1234"
                  maxLength="4"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinSalon()}
                  className="shimmer"
                />
                <motion.button
                  onClick={handleJoinSalon}
                  disabled={joinCode.length !== 4}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="gradient-border"
                >
                  Rejoindre un salon →
                </motion.button>
              </div>
            </motion.div>

            {/* Live Stats */}
            <motion.div
              className="hero-stats glass-ultra shadow-depth-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              <div className="stat-item">
                <div className="stat-value">100%</div>
                <div className="stat-label">Gratuit Forever</div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <div className="stat-value">&lt; 30s</div>
                <div className="stat-label">Pour démarrer</div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <div className="stat-value">∞</div>
                <div className="stat-label">Salons illimités</div>
              </div>
            </motion.div>
          </motion.div>
        </div>

      </section>

      {/* FEATURES SECTION */}
      <section className="features-modern">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="section-header-modern"
          >
            <h2 className="section-title-modern">
              Tout ce dont vous avez besoin
            </h2>
            <p className="section-subtitle-modern">
              Une solution complète pour gérer le temps de vos événements
            </p>
          </motion.div>

          <div className="features-grid">
            {[
              {
                icon: '🎨',
                title: 'Interface magnifique',
                description: 'Un design moderne qui impressionne votre audience',
                color: '#6366f1'
              },
              {
                icon: '📱',
                title: 'Télécommande mobile',
                description: 'Contrôlez tout depuis votre smartphone',
                color: '#1f3a8b'
              },
              {
                icon: '⚡',
                title: 'Temps réel',
                description: 'Synchronisation instantanée sur tous les écrans',
                color: '#ffde59'
              },
              {
                icon: '🎯',
                title: 'Super simple',
                description: 'Prêt en 30 secondes, sans installation',
                color: '#ec4899'
              },
              {
                icon: '🎭',
                title: 'Sessions colorées',
                description: 'Chaque session a sa couleur unique',
                color: '#8b5cf6'
              },
              {
                icon: '🔄',
                title: 'Glisser-déposer',
                description: 'Réorganisez vos sessions en un geste',
                color: '#10b981'
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                className="feature-card card card-3d gradient-border shadow-depth-2 glass-ultra"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -8, boxShadow: '0 30px 60px rgba(31, 58, 139, 0.2)' }}
              >
                <div className="feature-icon" style={{ background: `${feature.color}15`, color: feature.color }}>
                  {feature.icon}
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-it-works-modern">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="section-header-modern"
          >
            <h2 className="section-title-modern">Comment ça marche</h2>
            <p className="section-subtitle-modern">En 4 étapes simples</p>
          </motion.div>

          <div className="steps-modern">
            {[
              { num: '01', title: 'Créer', desc: 'Créez votre salon en un clic' },
              { num: '02', title: 'Configurer', desc: 'Ajoutez vos sessions et timing' },
              { num: '03', title: 'Projeter', desc: 'Affichez le timer en grand' },
              { num: '04', title: 'Contrôler', desc: 'Pilotez depuis votre mobile' }
            ].map((step, idx) => (
              <motion.div
                key={idx}
                className="step-modern"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15 }}
              >
                <div className="step-number">{step.num}</div>
                <div className="step-content">
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
                {idx < 3 && <div className="step-arrow">→</div>}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="use-cases-modern">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="section-header-modern"
          >
            <h2 className="section-title-modern">
              Pensé pour vos temps collectifs
            </h2>
          </motion.div>

          <div className="use-cases-grid">
            {[
              {
                title: 'Ateliers & Séminaires',
                description: 'Gérez vos sessions de travail avec fluidité',
                icon: '🎯',
                gradient: 'linear-gradient(135deg, #1f3a8b 0%, #3b82f6 100%)'
              },
              {
                title: 'Cours & Formations',
                description: 'Respectez vos horaires sans débordement',
                icon: '📚',
                gradient: 'linear-gradient(135deg, #3b82f6 0%, #ffde59 100%)'
              },
              {
                title: 'Réunions & Workshops',
                description: 'Time-boxing efficace pour vos événements',
                icon: '💼',
                gradient: 'linear-gradient(135deg, #1f3a8b 0%, #ffde59 100%)'
              }
            ].map((useCase, idx) => (
              <motion.div
                key={idx}
                className="use-case-card-modern card-glass glass-ultra shadow-depth-3 gradient-border"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.03, y: -8 }}
                style={{ background: `${useCase.gradient}, rgba(255,255,255,0.1)` }}
              >
                <div className="use-case-icon-modern">{useCase.icon}</div>
                <h3>{useCase.title}</h3>
                <p>{useCase.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* CTA SECTION */}
      <section className="cta-modern">
        <div className="container">
          <motion.div
            className="cta-card card-glass glass-ultra shadow-depth-4 gradient-border"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.02 }}
          >
            <h2 className="text-shine">Prêt à orchestrer le temps ?</h2>
            <p>Créez votre premier salon maintenant</p>
            <motion.button
              className="btn btn-primary btn-xl btn-magnetic glow-insuffle ripple"
              onClick={handleCreateSalon}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Commencer gratuitement
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer-modern">
        <div className="container">
          <div className="footer-content-modern">
            <div className="footer-brand">
              <div className="footer-logo">⏱️ Timer Salon</div>
              <p>Orchestrez le temps de vos ateliers</p>
            </div>
            <div className="footer-links-modern">
              <a href="https://www.insuffle.com" target="_blank" rel="noopener noreferrer">Insuffle</a>
              <a href="#features">Fonctionnalités</a>
              <a href="#" onClick={(e) => { e.preventDefault(); handleCreateSalon(); }}>Créer un salon</a>
            </div>
          </div>
          <div className="footer-copy">
            © 2025 Timer Salon. Créé avec ❤️ par <a href="https://www.insuffle.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-primary)', fontWeight: '600', textDecoration: 'none' }}>Insuffle</a> pour les facilitateurs.
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
