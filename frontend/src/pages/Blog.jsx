import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import '../styles/Blog.css'

// Default blog posts (will be loaded from localStorage or API)
const DEFAULT_POSTS = [
  {
    id: 1,
    title: 'Comment optimiser vos réunions avec un timer visuel',
    slug: 'optimiser-reunions-timer-visuel',
    excerpt: 'Découvrez les meilleures pratiques pour structurer vos réunions et gagner en productivité grâce au time boxing.',
    content: `
# Comment optimiser vos réunions avec un timer visuel

Les réunions interminables sont l'un des plus grands tueurs de productivité en entreprise. Un timer visuel peut transformer radicalement votre façon de gérer le temps.

## Pourquoi utiliser un timer visuel ?

1. **Visibilité pour tous** - Chaque participant voit le temps restant
2. **Responsabilisation** - On respecte naturellement les contraintes de temps
3. **Meilleure préparation** - Savoir qu'on a un temps limité pousse à être concis

## Les bonnes pratiques

### 1. Définissez des sessions claires
Découpez votre réunion en blocs de temps dédiés à chaque sujet. Par exemple :
- 5 min : Tour de table rapide
- 15 min : Point principal
- 10 min : Questions/réponses
- 5 min : Actions et prochaines étapes

### 2. Utilisez les codes couleur
Insuffle Timer permet d'assigner une couleur à chaque session. Utilisez-les pour catégoriser visuellement vos activités.

### 3. Partagez le timer avec les participants
Le code à 4 chiffres permet à tous de suivre sur leur appareil.

## Conclusion

Un timer visuel n'est pas qu'un gadget - c'est un outil de transformation culturelle qui aide les équipes à respecter le temps de chacun.
    `,
    category: 'Productivité',
    author: 'Équipe Insuffle',
    date: '2024-12-15',
    readTime: 5,
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800',
    status: 'published'
  },
  {
    id: 2,
    title: '10 techniques Pomodoro avancées pour développeurs',
    slug: 'techniques-pomodoro-developpeurs',
    excerpt: 'Allez au-delà de la méthode Pomodoro classique avec ces adaptations pensées pour les métiers du code.',
    content: `
# 10 techniques Pomodoro avancées pour développeurs

La méthode Pomodoro est un classique, mais les développeurs peuvent l'adapter pour maximiser leur flow créatif.

## 1. Le Pomodoro Long (90 minutes)

Pour les tâches de deep work comme l'architecture ou le debugging complexe, 25 minutes c'est trop court. Essayez des sessions de 90 minutes avec 15 minutes de pause.

## 2. Le Pomodoro Pair Programming

Alternez les rôles de driver/navigator à chaque pomodoro pour maintenir l'énergie.

## 3. Le Pomodoro Sprint

Idéal pour les deadlines : enchaînez 4 pomodoros avec des pauses de 5 minutes, puis une grande pause de 30 minutes.

## 4. Le Pomodoro Code Review

Dédiez des pomodoros entiers aux revues de code pour une attention maximale.

## 5. Le Pomodoro Documentation

Forcez-vous à documenter en time-boxant cette activité souvent négligée.

## Conclusion

Expérimentez et trouvez votre propre rythme. L'important est de structurer votre temps, pas de suivre une règle rigide.
    `,
    category: 'Développement',
    author: 'Équipe Insuffle',
    date: '2024-12-12',
    readTime: 7,
    image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800',
    status: 'published'
  },
  {
    id: 3,
    title: 'Facilitation visuelle : le pouvoir du timer partagé',
    slug: 'facilitation-visuelle-timer-partage',
    excerpt: 'Comment utiliser un timer partagé pour améliorer vos ateliers de facilitation et libérer la créativité.',
    content: `
# Facilitation visuelle : le pouvoir du timer partagé

En tant que facilitateur, votre mission est de créer un cadre propice à la collaboration. Le timer visuel est votre meilleur allié.

## Le cadre temporel libère la créativité

Contrairement à ce qu'on pourrait penser, les contraintes de temps ne brident pas la créativité - elles la libèrent. Savoir qu'on a exactement 5 minutes pour brainstormer élimine la procrastination.

## Sessions types pour vos ateliers

### Ice breaker (5 min)
Un tour de table rapide où chacun répond à une question fun.

### Brainstorming divergent (10-15 min)
Phase de génération d'idées sans jugement.

### Vote et convergence (5 min)
Dot voting ou autre méthode de priorisation.

### Prototypage rapide (20-30 min)
Construction de la solution retenue.

### Pitch final (2 min par équipe)
Présentation des résultats avec contrainte de temps.

## Astuces de pro

- Affichez le timer sur grand écran
- Utilisez les sons/vibrations comme signaux
- Prévoir un buffer de 10% pour les imprévus
    `,
    category: 'Facilitation',
    author: 'Équipe Insuffle',
    date: '2024-12-10',
    readTime: 6,
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
    status: 'published'
  },
  {
    id: 4,
    title: 'Design Thinking en 60 minutes : le guide express',
    slug: 'design-thinking-60-minutes',
    excerpt: 'Appliquez le Design Thinking en une heure chrono avec notre template de sessions optimisé.',
    content: `
# Design Thinking en 60 minutes : le guide express

Le Design Thinking ne nécessite pas forcément plusieurs jours. Voici comment en tirer l'essentiel en une heure.

## Le template 60 minutes

### 1. Empathie (10 min)
- 5 min : Partage des insights clients/utilisateurs
- 5 min : Carte d'empathie collaborative

### 2. Définition (10 min)
- Formulation du problème sous forme de "How Might We..."

### 3. Idéation (15 min)
- 8 min : Brainstorming silencieux (post-its)
- 7 min : Présentation et regroupement

### 4. Prototype (15 min)
- Sketch rapide ou storyboard de la solution

### 5. Test (10 min)
- Feedback interne ou simulation

## Conseils pour réussir

1. **Préparation** - Les données d'empathie doivent être prêtes
2. **Facilitation stricte** - Respectez les temps à la seconde
3. **Focus** - Un seul problème, une seule solution

## Template Insuffle Timer

Créez un timer avec ces 5 sessions pour guider automatiquement votre atelier.
    `,
    category: 'Design',
    author: 'Équipe Insuffle',
    date: '2024-12-08',
    readTime: 4,
    image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800',
    status: 'published'
  }
]

const CATEGORIES = ['Tous', 'Productivité', 'Développement', 'Facilitation', 'Design', 'Agile']

export default function Blog() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('Tous')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPost, setCurrentPost] = useState(null)

  // Load posts
  useEffect(() => {
    const savedPosts = localStorage.getItem('blog_posts')
    if (savedPosts) {
      try {
        const parsed = JSON.parse(savedPosts)
        setPosts([...DEFAULT_POSTS, ...parsed])
      } catch {
        setPosts(DEFAULT_POSTS)
      }
    } else {
      setPosts(DEFAULT_POSTS)
    }
  }, [])

  // Load current post when slug changes
  useEffect(() => {
    if (slug) {
      const post = posts.find(p => p.slug === slug)
      setCurrentPost(post)
    } else {
      setCurrentPost(null)
    }
  }, [slug, posts])

  // Filter posts
  const filteredPosts = posts.filter(post => {
    if (post.status !== 'published') return false
    const matchesCategory = selectedCategory === 'Tous' || post.category === selectedCategory
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Render markdown-like content
  const renderContent = (content) => {
    if (!content) return null

    return content.split('\n').map((line, i) => {
      if (line.startsWith('# ')) {
        return <h1 key={i}>{line.replace('# ', '')}</h1>
      } else if (line.startsWith('## ')) {
        return <h2 key={i}>{line.replace('## ', '')}</h2>
      } else if (line.startsWith('### ')) {
        return <h3 key={i}>{line.replace('### ', '')}</h3>
      } else if (line.startsWith('- ')) {
        return <li key={i}>{line.replace('- ', '')}</li>
      } else if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i}><strong>{line.replace(/\*\*/g, '')}</strong></p>
      } else if (line.trim() === '') {
        return <br key={i} />
      } else if (/^\d+\./.test(line)) {
        return <li key={i}>{line.replace(/^\d+\.\s*/, '')}</li>
      } else {
        return <p key={i}>{line}</p>
      }
    })
  }

  // Single post view
  if (currentPost) {
    return (
      <div className="blog-page">
        <header className="blog-header">
          <div className="header-left">
            <button onClick={() => navigate('/blog')} className="back-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <Link to="/" className="logo">
              <span className="logo-icon">⏱️</span>
              <span>Insuffle Timer</span>
            </Link>
          </div>
          <nav className="header-nav">
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
          </nav>
        </header>

        <motion.article
          className="blog-article"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="article-hero" style={{ backgroundImage: `url(${currentPost.image})` }}>
            <div className="article-hero-overlay">
              <div className="article-meta">
                <span className="category-badge">{currentPost.category}</span>
                <span className="read-time">{currentPost.readTime} min de lecture</span>
              </div>
              <h1>{currentPost.title}</h1>
              <div className="article-author">
                <span className="author-avatar">{currentPost.author.charAt(0)}</span>
                <span className="author-name">{currentPost.author}</span>
                <span className="article-date">
                  {new Date(currentPost.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          <div className="article-content">
            {renderContent(currentPost.content)}
          </div>

          <div className="article-footer">
            <div className="share-article">
              <h4>Partager cet article</h4>
              <div className="share-buttons">
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="share-btn linkedin"
                >
                  LinkedIn
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(currentPost.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="share-btn twitter"
                >
                  Twitter
                </a>
                <button
                  className="share-btn copy"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href)
                    alert('Lien copié !')
                  }}
                >
                  Copier
                </button>
              </div>
            </div>

            <div className="related-cta">
              <h3>Prêt à transformer vos réunions ?</h3>
              <p>Créez votre premier timer gratuitement</p>
              <Link to="/auth" className="cta-btn">Commencer maintenant</Link>
            </div>
          </div>
        </motion.article>

        <footer className="blog-footer">
          <p>
            Créé avec passion par <a href="https://insuffle.com" target="_blank" rel="noopener noreferrer">Insuffle</a>
          </p>
        </footer>
      </div>
    )
  }

  // Blog listing view
  return (
    <div className="blog-page">
      <header className="blog-header">
        <div className="header-left">
          <Link to="/" className="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <Link to="/" className="logo">
            <span className="logo-icon">⏱️</span>
            <span>Insuffle Timer</span>
          </Link>
        </div>
        <nav className="header-nav">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/marketplace" className="nav-link">Marketplace</Link>
        </nav>
      </header>

      <section className="blog-hero">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1>Blog Insuffle Timer</h1>
          <p>Conseils, techniques et bonnes pratiques pour mieux gérer votre temps</p>
        </motion.div>
      </section>

      <section className="blog-filters">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher un article..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="category-filters">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section className="blog-grid">
        <AnimatePresence>
          {filteredPosts.map((post, index) => (
            <motion.article
              key={post.id}
              className="blog-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(`/blog/${post.slug}`)}
            >
              <div className="card-image" style={{ backgroundImage: `url(${post.image})` }}>
                <span className="category-badge">{post.category}</span>
              </div>
              <div className="card-content">
                <h2>{post.title}</h2>
                <p>{post.excerpt}</p>
                <div className="card-meta">
                  <span className="author">{post.author}</span>
                  <span className="date">
                    {new Date(post.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="read-time">{post.readTime} min</span>
                </div>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>

        {filteredPosts.length === 0 && (
          <div className="no-posts">
            <p>Aucun article trouvé</p>
            <button onClick={() => { setSelectedCategory('Tous'); setSearchQuery(''); }}>
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </section>

      <section className="blog-newsletter">
        <motion.div
          className="newsletter-card"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2>Restez informé</h2>
          <p>Recevez nos derniers articles et conseils directement dans votre boîte mail</p>
          <form className="newsletter-form" onSubmit={(e) => { e.preventDefault(); alert('Merci ! Vous êtes inscrit.'); }}>
            <input type="email" placeholder="votre@email.com" required />
            <button type="submit">S'inscrire</button>
          </form>
        </motion.div>
      </section>

      <footer className="blog-footer">
        <div className="footer-links">
          <Link to="/">Accueil</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/release-notes">Notes de version</Link>
        </div>
        <p>
          Créé avec passion par <a href="https://insuffle.com" target="_blank" rel="noopener noreferrer">Insuffle</a>
        </p>
      </footer>
    </div>
  )
}
