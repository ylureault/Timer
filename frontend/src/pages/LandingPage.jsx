import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/LandingPage.css'

function LandingPage() {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  const [demoTime, setDemoTime] = useState(30 * 60)
  const [demoRunning, setDemoRunning] = useState(false)
  const [currentWord, setCurrentWord] = useState(0)

  const timeWords = [
    '30 min',
    '5 min de pause',
    '+30 secondes',
    'temps écoulé',
    'temps gagné'
  ]

  // Rotating words animation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWord(prev => (prev + 1) % timeWords.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  // Demo timer
  useEffect(() => {
    if (demoRunning && demoTime > 0) {
      const interval = setInterval(() => {
        setDemoTime(prev => Math.max(0, prev - 1))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [demoRunning, demoTime])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleCreateSalon = () => {
    navigate('/create')
  }

  const handleJoinSalon = () => {
    if (joinCode.trim().length === 4) {
      navigate(`/salon/${joinCode}`)
    }
  }

  return (
    <div className="landing-page">
      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="circular-timer"></div>
        </div>

        <div className="container hero-content">
          <h1 className="hero-title fade-in">
            Orchestrez le temps de vos ateliers,<br />
            comme un chef d'orchestre
          </h1>

          <p className="hero-subtitle fade-in" style={{ animationDelay: '0.2s' }}>
            Créez des séquences temporelles partagées, pilotées à distance
          </p>

          <div className="rotating-words fade-in" style={{ animationDelay: '0.3s' }}>
            {timeWords.map((word, idx) => (
              <span
                key={idx}
                className={`word ${idx === currentWord ? 'active' : ''}`}
              >
                {word}
              </span>
            ))}
          </div>

          <div className="hero-actions fade-in" style={{ animationDelay: '0.4s' }}>
            <button className="btn btn-primary btn-lg pulse" onClick={handleCreateSalon}>
              Créer un salon maintenant
            </button>

            <div className="join-salon">
              <input
                type="text"
                className="input"
                placeholder="Code à 4 chiffres"
                maxLength="4"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinSalon()}
              />
              <button className="btn btn-outline" onClick={handleJoinSalon}>
                Rejoindre
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">Comment ça marche</h2>

          <div className="steps">
            <div className="step slide-in-left">
              <div className="step-icon">1</div>
              <h3>Créer un salon</h3>
              <p>En quelques secondes, générez votre espace dédié</p>
            </div>

            <div className="step slide-in-left" style={{ animationDelay: '0.1s' }}>
              <div className="step-icon">2</div>
              <h3>Ajouter les sessions</h3>
              <p>Configurez durées, noms et couleurs de chaque séquence</p>
            </div>

            <div className="step slide-in-left" style={{ animationDelay: '0.2s' }}>
              <div className="step-icon">3</div>
              <h3>Projeter le chrono</h3>
              <p>Affichez le timer en plein écran pour tous</p>
            </div>

            <div className="step slide-in-left" style={{ animationDelay: '0.3s' }}>
              <div className="step-icon">4</div>
              <h3>Piloter avec votre téléphone</h3>
              <p>Contrôlez tout depuis la télécommande mobile</p>
            </div>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="use-cases">
        <div className="container">
          <h2 className="section-title">Pensé pour vos temps collectifs</h2>

          <div className="use-case-grid">
            <div className="use-case-card card fade-in">
              <div className="use-case-icon">🎯</div>
              <h3>Ateliers et séminaires</h3>
              <p>Plus de fluidité dans vos animations</p>
            </div>

            <div className="use-case-card card fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="use-case-icon">📚</div>
              <h3>Cours et formations</h3>
              <p>Moins de débordements de temps</p>
            </div>

            <div className="use-case-card card fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="use-case-icon">💼</div>
              <h3>Réunions et rétrospectives</h3>
              <p>Des sessions cadrées et efficaces</p>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE DEMO */}
      <section className="live-demo">
        <div className="container">
          <h2 className="section-title">Aperçu en temps réel</h2>

          <div className="demo-container card">
            <div className="demo-timer">
              <div className="demo-session-name">Session de travail</div>
              <div className="demo-time">{formatTime(demoTime)}</div>
              <div className="demo-progress">
                <div
                  className="demo-progress-bar"
                  style={{ width: `${((30 * 60 - demoTime) / (30 * 60)) * 100}%` }}
                ></div>
              </div>
              <div className="demo-controls">
                <button
                  className="btn btn-primary"
                  onClick={() => setDemoRunning(!demoRunning)}
                >
                  {demoRunning ? 'Pause' : 'Play'}
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => setDemoTime(30 * 60)}
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="demo-sessions">
              <div className="demo-session active" style={{ backgroundColor: '#3B82F6' }}>
                <span>Session 1</span>
                <span>30 min</span>
              </div>
              <div className="demo-session" style={{ backgroundColor: '#10B981' }}>
                <span>Session 2</span>
                <span>10 min</span>
              </div>
              <div className="demo-session" style={{ backgroundColor: '#6B7280' }}>
                <span>Pause</span>
                <span>5 min</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="about">
        <div className="container">
          <div className="about-content card">
            <h2>Conçu pour les facilitateurs</h2>
            <p>
              Timer Salon est né de l'envie de rendre le temps visible, ludique et moins stressant.
              Créé pour les formateurs, animateurs et tous ceux qui orchestrent des moments collectifs,
              cet outil simple transforme la gestion du temps en une expérience fluide et visuelle.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <p>&copy; 2025 Timer Salon. Tous droits réservés.</p>
            <div className="footer-links">
              <a href="#">Mentions légales</a>
              <a href="#">Contact</a>
              <a href="#">Documentation</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
