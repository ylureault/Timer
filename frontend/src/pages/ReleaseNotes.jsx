import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import '../styles/ReleaseNotes.css'

const RELEASES = [
  {
    version: '2.5.0',
    date: '2024-12-19',
    title: 'Quiz Interactif & Formats de Timer',
    type: 'major',
    features: [
      { icon: '📐', title: '8 Formats de Timer', description: 'Cercle, Arc, Barre, Digital, Flip Clock, Minimal, Blocs, Vague' },
      { icon: '📺', title: 'Page Embed Complète', description: 'Intégrez vos timers en iframe, JavaScript ou React' },
      { icon: '🛡️', title: 'Admin Sécurisé', description: 'Protection par mot de passe du panel admin' },
      { icon: '📧', title: 'Intégration Brevo', description: 'Gestion des emails marketing depuis l\'admin' },
      { icon: '💬', title: 'Gestion des Témoignages', description: 'Publiez ou masquez les avis depuis l\'admin' },
      { icon: '📝', title: 'Section Blog', description: 'Gérez vos articles depuis le panel admin' }
    ],
    improvements: [
      'Sélecteur de format depuis la télécommande',
      'Styles CSS optimisés pour tous les formats',
      'Navigation entre les écrans améliorée'
    ]
  },
  {
    version: '2.4.0',
    date: '2024-12-18',
    title: 'Thèmes & Édition de Sessions',
    type: 'major',
    features: [
      { icon: '🎨', title: '8 Thèmes Visuels', description: 'Cinématique, Néon, Minimal, Nature, Coucher de soleil, Océan, Feu, Corporate' },
      { icon: '✏️', title: 'Édition de Sessions', description: 'Ajoutez, modifiez et supprimez des sessions depuis la télécommande' },
      { icon: '🎚️', title: 'Préférences Télécommande', description: 'Personnalisez l\'affichage de votre télécommande' },
      { icon: '⚡', title: 'Actions Rapides', description: 'Modifiez les sessions en un clic' }
    ],
    improvements: [
      'Retour haptique sur mobile',
      'Synchronisation thème en temps réel',
      'Interface plus fluide'
    ]
  },
  {
    version: '2.3.0',
    date: '2024-12-17',
    title: 'Marketplace & Templates',
    type: 'major',
    features: [
      { icon: '🛒', title: 'Marketplace', description: 'Découvrez des thèmes, templates et plugins' },
      { icon: '📋', title: 'Templates de Session', description: 'Pomodoro, Réunion, Formation, HIIT et plus' },
      { icon: '📤', title: 'Import/Export', description: 'Sauvegardez et partagez vos configurations' },
      { icon: '🌐', title: 'Timers Communautaires', description: 'Explorez les créations de la communauté' }
    ],
    improvements: [
      'Navigation Marketplace dans le menu',
      'Prévisualisation des thèmes',
      'Installation en un clic'
    ]
  },
  {
    version: '2.2.0',
    date: '2024-12-16',
    title: 'Drag & Drop & QR Code',
    type: 'feature',
    features: [
      { icon: '📱', title: 'QR Code Télécommande', description: 'Scannez pour contrôler depuis votre mobile' },
      { icon: '🔀', title: 'Drag & Drop Sessions', description: 'Réorganisez vos sessions par glisser-déposer' },
      { icon: '🔗', title: 'Partage Social', description: 'LinkedIn, Facebook, Twitter, WhatsApp' }
    ],
    improvements: [
      'Interface Dashboard modernisée',
      'Animations fluides',
      'Meilleure ergonomie mobile'
    ]
  },
  {
    version: '2.1.0',
    date: '2024-12-15',
    title: 'Landing Page & SEO',
    type: 'feature',
    features: [
      { icon: '🏠', title: 'Landing Page Optimisée', description: 'Design moderne avec animations' },
      { icon: '🔍', title: 'SEO Amélioré', description: 'Meta tags, Open Graph, Twitter Cards' },
      { icon: '⭐', title: 'Témoignages', description: 'Section avis clients sur la landing' },
      { icon: '📊', title: 'Google Analytics', description: 'Suivi des visiteurs intégré' }
    ],
    improvements: [
      'Performance optimisée',
      'Responsive parfait',
      'Temps de chargement réduit'
    ]
  },
  {
    version: '2.0.0',
    date: '2024-12-10',
    title: 'Refonte Complète V2',
    type: 'major',
    features: [
      { icon: '🎬', title: 'Design Cinématique', description: 'Nouvelle interface visuelle premium' },
      { icon: '🔄', title: 'WebSocket Real-time', description: 'Synchronisation instantanée' },
      { icon: '🎯', title: 'Télécommande V2', description: 'Interface tactile repensée' },
      { icon: '👤', title: 'Système d\'Auth', description: 'Inscription et connexion sécurisées' },
      { icon: '📈', title: 'Dashboard', description: 'Gestion centralisée de vos timers' }
    ],
    improvements: [
      'Architecture complètement repensée',
      'Base de données PostgreSQL',
      'API REST robuste'
    ]
  },
  {
    version: '1.0.0',
    date: '2024-11-01',
    title: 'Version Initiale',
    type: 'initial',
    features: [
      { icon: '⏱️', title: 'Timer de base', description: 'Chronomètre avec sessions' },
      { icon: '📺', title: 'Affichage', description: 'Vue timer plein écran' },
      { icon: '🎮', title: 'Télécommande', description: 'Contrôle à distance basique' }
    ],
    improvements: []
  }
]

const ROADMAP = [
  { status: 'in-progress', title: 'Système Quiz Kahoot', description: 'Questions en live avec réponses depuis mobile' },
  { status: 'planned', title: 'Partage SMS & WhatsApp', description: 'Envoi de liens par message' },
  { status: 'planned', title: 'Mode Présentation', description: 'Intégration PowerPoint et Google Slides' },
  { status: 'planned', title: 'API Publique', description: 'Intégration avec vos applications' },
  { status: 'planned', title: 'Webhooks', description: 'Notifications sur événements' },
  { status: 'planned', title: 'Application Mobile', description: 'iOS et Android natives' }
]

export default function ReleaseNotes() {
  const [selectedVersion, setSelectedVersion] = useState(null)

  return (
    <div className="release-notes-page">
      {/* Header */}
      <header className="rn-header">
        <div className="header-left">
          <Link to="/" className="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="logo">
            <span className="logo-icon">📋</span>
            <span>Notes de Version</span>
          </div>
        </div>
        <div className="header-right">
          <Link to="/dashboard" className="dashboard-link">Mon Dashboard</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="rn-hero">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hero-content"
        >
          <h1>Notes de Version</h1>
          <p>Découvrez toutes les nouveautés et améliorations d'Insuffle Timer</p>
          <div className="current-version">
            <span className="version-badge">v{RELEASES[0].version}</span>
            <span className="version-date">{new Date(RELEASES[0].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </motion.div>
      </section>

      {/* Roadmap */}
      <section className="roadmap-section">
        <div className="section-header">
          <h2>Roadmap</h2>
          <p>Ce qui arrive bientôt</p>
        </div>
        <div className="roadmap-grid">
          {ROADMAP.map((item, index) => (
            <motion.div
              key={index}
              className={`roadmap-card ${item.status}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="roadmap-status">
                {item.status === 'in-progress' ? '🚧 En cours' : '📅 Planifié'}
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Releases Timeline */}
      <section className="releases-section">
        <div className="section-header">
          <h2>Historique des Versions</h2>
          <p>Toutes les mises à jour depuis le lancement</p>
        </div>

        <div className="releases-timeline">
          {RELEASES.map((release, index) => (
            <motion.div
              key={release.version}
              className={`release-card ${release.type}`}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="release-header">
                <div className="release-version">
                  <span className={`version-badge ${release.type}`}>v{release.version}</span>
                  <span className="release-type">
                    {release.type === 'major' && '🚀 Majeure'}
                    {release.type === 'feature' && '✨ Feature'}
                    {release.type === 'initial' && '🎉 Initial'}
                  </span>
                </div>
                <span className="release-date">
                  {new Date(release.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              <h3>{release.title}</h3>

              <div className="release-features">
                {release.features.map((feature, fIndex) => (
                  <div key={fIndex} className="feature-item">
                    <span className="feature-icon">{feature.icon}</span>
                    <div className="feature-info">
                      <strong>{feature.title}</strong>
                      <span>{feature.description}</span>
                    </div>
                  </div>
                ))}
              </div>

              {release.improvements.length > 0 && (
                <div className="release-improvements">
                  <h4>Améliorations</h4>
                  <ul>
                    {release.improvements.map((imp, iIndex) => (
                      <li key={iIndex}>{imp}</li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rn-cta">
        <motion.div
          className="cta-content"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2>Vous avez une idée ?</h2>
          <p>Suggérez des fonctionnalités et aidez-nous à améliorer Insuffle Timer</p>
          <div className="cta-buttons">
            <a href="mailto:contact@insuffle.com" className="btn-primary">
              Envoyer une suggestion
            </a>
            <Link to="/marketplace" className="btn-secondary">
              Explorer le Marketplace
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="rn-footer">
        <p>
          Créé avec ❤️ par <a href="https://insuffle.com" target="_blank" rel="noopener noreferrer">Insuffle</a>
        </p>
      </footer>
    </div>
  )
}
