import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import '../styles/Embed.css'

const EMBED_EXAMPLES = [
  {
    id: 'pomodoro',
    title: 'Timer Pomodoro',
    description: 'Parfait pour la productivité personnelle',
    code: '1234',
    useCase: 'Blog productivité, App de travail',
    preview: 'https://timer.insuffle.com/display/1234'
  },
  {
    id: 'meeting',
    title: 'Timer Réunion',
    description: 'Gardez vos réunions dans les temps',
    code: '5678',
    useCase: 'Intranet, Outils collaboratifs',
    preview: 'https://timer.insuffle.com/display/5678'
  },
  {
    id: 'training',
    title: 'Timer Formation',
    description: 'Structure pour sessions de formation',
    code: '9012',
    useCase: 'LMS, Plateformes e-learning',
    preview: 'https://timer.insuffle.com/display/9012'
  }
]

const USE_CASES = [
  {
    icon: '🏫',
    title: 'Écoles & Universités',
    description: 'Intégrez des timers dans vos plateformes e-learning pour gérer les examens chronométrés, les présentations d\'étudiants et les ateliers.'
  },
  {
    icon: '🏢',
    title: 'Entreprises',
    description: 'Ajoutez des timers à votre intranet pour les daily meetings, les sessions de brainstorming et les sprints agile.'
  },
  {
    icon: '🎮',
    title: 'Gaming & Événements',
    description: 'Utilisez nos timers pour des quiz en direct, des escape games, des hackathons et des compétitions.'
  },
  {
    icon: '📺',
    title: 'Streaming & Webinaires',
    description: 'Affichez un timer professionnel pendant vos lives, conférences et présentations en ligne.'
  },
  {
    icon: '🧘',
    title: 'Bien-être & Sport',
    description: 'Intégrez des timers pour les séances de méditation, HIIT, yoga et exercices chronométrés.'
  },
  {
    icon: '📱',
    title: 'Applications Web',
    description: 'Embarquez notre timer dans votre SaaS, votre application de productivité ou votre outil interne.'
  }
]

export default function Embed() {
  const { code: urlCode } = useParams()
  const [activeTab, setActiveTab] = useState('iframe')
  const [timerCode, setTimerCode] = useState(urlCode || 'XXX-XXX')
  const [embedSize, setEmbedSize] = useState('medium')
  const [showRemote, setShowRemote] = useState(false)
  const [copied, setCopied] = useState(false)

  // Update timerCode when URL parameter changes
  useEffect(() => {
    if (urlCode) {
      setTimerCode(urlCode)
    }
  }, [urlCode])

  const sizes = {
    small: { width: 400, height: 300 },
    medium: { width: 800, height: 600 },
    large: { width: 1200, height: 800 },
    fullscreen: { width: '100%', height: '100vh' }
  }

  const currentSize = sizes[embedSize]

  const iframeCode = `<iframe
  src="https://timer.insuffle.com/display/${timerCode}"
  width="${currentSize.width}"
  height="${currentSize.height}"
  frameborder="0"
  allow="fullscreen"
  style="border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);"
></iframe>`

  const jsCode = `<!-- Insuffle Timer Widget -->
<div id="insuffle-timer"></div>
<script src="https://timer.insuffle.com/embed.js"></script>
<script>
  InsuffleTimer.init({
    container: '#insuffle-timer',
    code: '${timerCode}',
    theme: 'cinematic',
    width: '${currentSize.width}',
    height: '${currentSize.height}',
    showControls: ${showRemote},
    onSessionChange: (session) => {
      console.log('Session changed:', session);
    },
    onComplete: () => {
      console.log('Timer completed!');
    }
  });
</script>`

  const reactCode = `import { InsuffleTimer } from '@insuffle/timer-react';

function MyComponent() {
  return (
    <InsuffleTimer
      code="${timerCode}"
      theme="cinematic"
      width={${typeof currentSize.width === 'string' ? `"${currentSize.width}"` : currentSize.width}}
      height={${typeof currentSize.height === 'string' ? `"${currentSize.height}"` : currentSize.height}}
      showControls={${showRemote}}
      onSessionChange={(session) => console.log(session)}
      onComplete={() => console.log('Done!')}
    />
  );
}`

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getCodeForTab = () => {
    switch (activeTab) {
      case 'iframe': return iframeCode
      case 'js': return jsCode
      case 'react': return reactCode
      default: return iframeCode
    }
  }

  return (
    <div className="embed-page">
      {/* Header */}
      <header className="embed-header">
        <div className="header-left">
          <Link to="/" className="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="logo">
            <span className="logo-icon">📺</span>
            <span>Intégration & Embed</span>
          </div>
        </div>
        <div className="header-right">
          <Link to="/dashboard" className="dashboard-link">Mon Dashboard</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="embed-hero">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hero-content"
        >
          <h1>Intégrez Insuffle Timer partout</h1>
          <p>Embarquez notre timer professionnel sur votre site web, application ou plateforme en quelques lignes de code</p>
        </motion.div>
      </section>

      {/* Live Preview + Code Generator */}
      <section className="generator-section">
        <div className="generator-grid">
          {/* Preview */}
          <div className="preview-panel">
            <h2>Aperçu en direct</h2>
            <div className="preview-frame" style={{ maxWidth: embedSize === 'fullscreen' ? '100%' : currentSize.width }}>
              <div className="preview-mockup">
                <div className="mockup-header">
                  <div className="traffic-lights">
                    <span></span><span></span><span></span>
                  </div>
                  <div className="url-bar">timer.insuffle.com/display/{timerCode}</div>
                </div>
                <div className="mockup-content">
                  <div className="timer-placeholder">
                    <svg viewBox="0 0 100 100" className="timer-circle">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#2a2a4a" strokeWidth="6" />
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#6C5CE7" strokeWidth="6"
                        strokeDasharray="180 283" strokeLinecap="round" transform="rotate(-90 50 50)" />
                    </svg>
                    <div className="timer-text">
                      <span className="time">25:00</span>
                      <span className="label">Session 1</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration */}
          <div className="config-panel">
            <h2>Configuration</h2>

            <div className="config-group">
              <label>Code du timer</label>
              <input
                type="text"
                value={timerCode}
                onChange={(e) => {
                  // Auto-format as XXX-XXX
                  let value = e.target.value.replace(/[^0-9]/g, '');
                  if (value.length > 3) {
                    value = value.slice(0, 3) + '-' + value.slice(3, 6);
                  }
                  if (value.length <= 7) {
                    setTimerCode(value);
                  }
                }}
                placeholder="XXX-XXX"
                maxLength={7}
              />
              <span className="hint">Le code à 6 caractères de votre timer (format: XXX-XXX)</span>
            </div>

            <div className="config-group">
              <label>Taille</label>
              <div className="size-options">
                {Object.keys(sizes).map((size) => (
                  <button
                    key={size}
                    className={`size-btn ${embedSize === size ? 'active' : ''}`}
                    onClick={() => setEmbedSize(size)}
                  >
                    {size === 'small' && '📱 Petit'}
                    {size === 'medium' && '💻 Moyen'}
                    {size === 'large' && '🖥️ Grand'}
                    {size === 'fullscreen' && '📺 Plein écran'}
                  </button>
                ))}
              </div>
            </div>

            <div className="config-group">
              <label className="toggle-label">
                <span>Afficher les contrôles</span>
                <input
                  type="checkbox"
                  checked={showRemote}
                  onChange={(e) => setShowRemote(e.target.checked)}
                />
                <span className="toggle"></span>
              </label>
            </div>

            {/* Code tabs */}
            <div className="code-section">
              <div className="code-tabs">
                <button
                  className={`code-tab ${activeTab === 'iframe' ? 'active' : ''}`}
                  onClick={() => setActiveTab('iframe')}
                >
                  HTML/iFrame
                </button>
                <button
                  className={`code-tab ${activeTab === 'js' ? 'active' : ''}`}
                  onClick={() => setActiveTab('js')}
                >
                  JavaScript
                </button>
                <button
                  className={`code-tab ${activeTab === 'react' ? 'active' : ''}`}
                  onClick={() => setActiveTab('react')}
                >
                  React
                </button>
              </div>

              <div className="code-block">
                <pre><code>{getCodeForTab()}</code></pre>
                <button
                  className="copy-btn"
                  onClick={() => copyToClipboard(getCodeForTab())}
                >
                  {copied ? '✓ Copié!' : '📋 Copier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="usecases-section">
        <div className="section-header">
          <h2>Cas d'utilisation</h2>
          <p>Découvrez comment nos clients utilisent Insuffle Timer</p>
        </div>

        <div className="usecases-grid">
          {USE_CASES.map((useCase, index) => (
            <motion.div
              key={index}
              className="usecase-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <span className="usecase-icon">{useCase.icon}</span>
              <h3>{useCase.title}</h3>
              <p>{useCase.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Examples Gallery */}
      <section className="examples-section">
        <div className="section-header">
          <h2>Exemples d'intégration</h2>
          <p>Inspirez-vous de ces exemples prêts à l'emploi</p>
        </div>

        <div className="examples-grid">
          {EMBED_EXAMPLES.map((example) => (
            <motion.div
              key={example.id}
              className="example-card"
              whileHover={{ y: -8 }}
            >
              <div className="example-preview">
                <div className="mini-timer">
                  <svg viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#333" strokeWidth="4" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#6C5CE7" strokeWidth="4"
                      strokeDasharray="150 251" strokeLinecap="round" transform="rotate(-90 50 50)" />
                  </svg>
                </div>
              </div>
              <div className="example-info">
                <h3>{example.title}</h3>
                <p>{example.description}</p>
                <span className="example-usecase">{example.useCase}</span>
              </div>
              <button className="example-btn">
                Voir le code
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* API Documentation */}
      <section className="api-section">
        <div className="section-header">
          <h2>API & Événements</h2>
          <p>Personnalisez le comportement du timer avec notre API JavaScript</p>
        </div>

        <div className="api-grid">
          <div className="api-card">
            <h3>Événements disponibles</h3>
            <div className="api-list">
              <div className="api-item">
                <code>onSessionChange</code>
                <span>Déclenché à chaque changement de session</span>
              </div>
              <div className="api-item">
                <code>onComplete</code>
                <span>Déclenché quand le timer est terminé</span>
              </div>
              <div className="api-item">
                <code>onPlay</code>
                <span>Déclenché au démarrage</span>
              </div>
              <div className="api-item">
                <code>onPause</code>
                <span>Déclenché à la pause</span>
              </div>
              <div className="api-item">
                <code>onTimeUpdate</code>
                <span>Déclenché chaque seconde</span>
              </div>
            </div>
          </div>

          <div className="api-card">
            <h3>Méthodes de contrôle</h3>
            <div className="api-list">
              <div className="api-item">
                <code>timer.play()</code>
                <span>Démarre le timer</span>
              </div>
              <div className="api-item">
                <code>timer.pause()</code>
                <span>Met en pause</span>
              </div>
              <div className="api-item">
                <code>timer.next()</code>
                <span>Session suivante</span>
              </div>
              <div className="api-item">
                <code>timer.previous()</code>
                <span>Session précédente</span>
              </div>
              <div className="api-item">
                <code>timer.reset()</code>
                <span>Réinitialise le timer</span>
              </div>
            </div>
          </div>

          <div className="api-card">
            <h3>Options de personnalisation</h3>
            <div className="api-list">
              <div className="api-item">
                <code>theme</code>
                <span>cinematic, neon, minimal, nature...</span>
              </div>
              <div className="api-item">
                <code>showControls</code>
                <span>Affiche/masque les contrôles</span>
              </div>
              <div className="api-item">
                <code>autoPlay</code>
                <span>Démarre automatiquement</span>
              </div>
              <div className="api-item">
                <code>muted</code>
                <span>Désactive les sons</span>
              </div>
              <div className="api-item">
                <code>locale</code>
                <span>Langue (fr, en, es...)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <motion.div
          className="cta-content"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2>Prêt à intégrer Insuffle Timer ?</h2>
          <p>Créez votre premier timer et obtenez votre code d'intégration en 2 minutes</p>
          <div className="cta-buttons">
            <Link to="/auth" className="btn-primary">
              Créer un compte gratuit
            </Link>
            <Link to="/marketplace" className="btn-secondary">
              Explorer le Marketplace
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="embed-footer">
        <p>
          Créé avec ❤️ par <a href="https://insuffle.com" target="_blank" rel="noopener noreferrer">Insuffle</a>
        </p>
      </footer>
    </div>
  )
}
