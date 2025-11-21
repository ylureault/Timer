import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import '../styles/Insuffle.css'

function LandingPageInsufle() {
  const navigate = useNavigate()

  // Compteurs animés pour la section Data
  const [counters, setCounters] = useState({
    projects: 0,
    success: 0,
    experts: 0,
    satisfaction: 0
  })

  // Animation des compteurs au scroll
  const dataRef = useRef(null)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          animateCounters()
        }
      },
      { threshold: 0.5 }
    )

    if (dataRef.current) {
      observer.observe(dataRef.current)
    }

    return () => {
      if (dataRef.current) {
        observer.unobserve(dataRef.current)
      }
    }
  }, [hasAnimated])

  const animateCounters = () => {
    const duration = 2000
    const steps = 60
    const interval = duration / steps

    const targets = {
      projects: 500,
      success: 94,
      experts: 50,
      satisfaction: 98
    }

    let currentStep = 0

    const timer = setInterval(() => {
      currentStep++
      const progress = currentStep / steps

      setCounters({
        projects: Math.floor(targets.projects * progress),
        success: Math.floor(targets.success * progress),
        experts: Math.floor(targets.experts * progress),
        satisfaction: Math.floor(targets.satisfaction * progress)
      })

      if (currentStep >= steps) {
        clearInterval(timer)
        setCounters(targets)
      }
    }, interval)
  }

  const handleCreateSalon = () => {
    navigate('/create')
  }

  const symptomes = [
    "Perte de sens collectif",
    "Réunions sans fin ni décision",
    "Initiatives qui s'essoufflent",
    "Equipes désorientées",
    "Projets enlisés",
    "Vision floue",
    "Silos organisationnels",
    "Transformation en panne"
  ]

  const clients = [
    "CAC 40",
    "Scale-ups",
    "ETI",
    "Secteur Public",
    "ONG Internationales",
    "Fonds d'investissement"
  ]

  const verbatims = [
    { text: "On ne sait plus où on va...", author: "DAF, Groupe industriel" },
    { text: "Trop de chantiers, aucune priorité claire", author: "DG, PME Tech" },
    { text: "Les équipes sont perdues", author: "DRH, Service public" },
    { text: "Nos projets n'aboutissent jamais", author: "CDO, Retail" },
    { text: "On tourne en rond depuis 2 ans", author: "CEO, Start-up" },
    { text: "Impossible de prendre une décision", author: "Comex, Banque" }
  ]

  const piliers = [
    {
      title: "Système",
      description: "Votre organisation est un système complexe, non une machine. Les interactions comptent plus que les organigrammes."
    },
    {
      title: "Limite",
      description: "Accepter les contraintes et limites n'est pas un échec, c'est la condition du mouvement stratégique."
    },
    {
      title: "Émergence",
      description: "Les solutions durables émergent d'un processus itératif, pas d'un grand plan miracle."
    }
  ]

  const phases = [
    {
      number: "01",
      title: "Observer",
      description: "Diagnostic systémique et cartographie des flux réels (pas des intentions). On regarde ce qui se passe vraiment, pas ce qui devrait se passer."
    },
    {
      number: "02",
      title: "Décider",
      description: "Choix stratégique radical : que garde-t-on, que coupe-t-on ? Construction d'une boussole décisionnelle partagée (4C)."
    },
    {
      number: "03",
      title: "Cadencer",
      description: "Définir un rythme soutenable et des jalons clairs. Synchroniser les équipes. Créer la respiration collective."
    },
    {
      number: "04",
      title: "Transformer",
      description: "Déployer les capacités nécessaires, ajuster en continu. Ancrer la transformation dans le réel."
    }
  ]

  const offres = [
    {
      icon: "🧭",
      title: "Diagnostic Boussole",
      subtitle: "3 semaines • Sur-mesure",
      description: "Cartographie systémique de votre organisation. Identification des blocages réels. Construction collective de la Boussole 4C."
    },
    {
      icon: "⚡",
      title: "Sprint Décisionnel",
      subtitle: "5 jours • Intensif",
      description: "Trancher les nœuds stratégiques qui paralysent. Méthode ODCT accélérée pour débloquer une situation critique."
    },
    {
      icon: "🚀",
      title: "Programme Transformation",
      subtitle: "6-12 mois • Accompagnement",
      description: "De la vision au déploiement. Coaching opérationnel, rituels de pilotage, montée en compétence des équipes."
    }
  ]

  return (
    <div className="insuffle-landing">
      {/* Noise overlay */}
      <div className="noise-overlay"></div>

      {/* HERO SECTION */}
      <section className="hero-insuffle">
        <div className="postit-container">
          <div className="postit">📊 Trop de projets</div>
          <div className="postit">🌫️ Vision floue</div>
          <div className="postit">🔄 Réunions infinies</div>
          <div className="postit">❓ Équipes perdues</div>
        </div>

        <div className="hero-content-insuffle">
          <motion.h1
            className="hero-title-insuffle"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            ARRÊTER DE{' '}
            <span className="word-rotate">TOURNER</span>
            <br />
            EN ROND
          </motion.h1>

          <motion.p
            className="hero-subtitle-insuffle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Cabinet de transformation stratégique pour organisations en quête de clarté.
            <br />
            Nous vous aidons à retrouver le cap, la cadence, et la capacité d'agir.
          </motion.p>

          <motion.button
            className="cta-button"
            onClick={handleCreateSalon}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Parlons-en →
          </motion.button>
        </div>
      </section>

      {/* BANDEAU ALERTE SYMPTÔMES */}
      <div className="bandeau-marquee">
        <div className="marquee-content">
          {[...symptomes, ...symptomes, ...symptomes].map((symptome, idx) => (
            <div key={idx} className="marquee-item">
              {symptome}
            </div>
          ))}
        </div>
      </div>

      {/* DATA SECTION */}
      <section className="data-section" ref={dataRef}>
        <div className="data-grid">
          <div className="data-item">
            <div className="data-value">{counters.projects}+</div>
            <div className="data-label">Projets transformés</div>
          </div>
          <div className="data-item">
            <div className="data-value">{counters.success}%</div>
            <div className="data-label">Taux de réussite</div>
          </div>
          <div className="data-item">
            <div className="data-value">{counters.experts}+</div>
            <div className="data-label">Experts mobilisés</div>
          </div>
          <div className="data-item">
            <div className="data-value">{counters.satisfaction}%</div>
            <div className="data-label">Satisfaction client</div>
          </div>
        </div>
      </section>

      {/* BANDEAU CLIENTS */}
      <div className="bandeau-clients">
        <div className="clients-marquee">
          {[...clients, ...clients, ...clients, ...clients].map((client, idx) => (
            <div key={idx} className="client-item">
              {client}
            </div>
          ))}
        </div>
      </div>

      {/* CONSTAT SECTION */}
      <section className="constat-section">
        <div className="constat-container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="section-title-insuffle">Le brouillard</h2>
            <p className="section-subtitle-insuffle">
              Vous n'êtes pas seuls. La plupart des organisations sont prises dans le même tourbillon.
            </p>
          </motion.div>

          <div className="constat-grid">
            <motion.div
              className="constat-text"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <p>
                <strong>Trop d'initiatives</strong>, pas assez de focus.<br />
                <strong>Trop de réunions</strong>, pas assez de décisions.<br />
                <strong>Trop de slides</strong>, pas assez d'action.<br />
                <br />
                Résultat : l'organisation tourne, mais n'avance plus.
              </p>
            </motion.div>

            <div className="verbatims-grid">
              {verbatims.map((verbatim, idx) => (
                <motion.div
                  key={idx}
                  className="verbatim-card"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className="verbatim-text">"{verbatim.text}"</div>
                  <div className="verbatim-author">— {verbatim.author}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PILIER COMPLEXITÉ */}
      <section className="pilier-section">
        <div className="pilier-container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="section-title-insuffle">Notre conviction</h2>
            <p className="section-subtitle-insuffle">
              La transformation n'est pas un projet. C'est un processus continu d'adaptation.
            </p>
          </motion.div>

          <div className="pilier-grid">
            {piliers.map((pilier, idx) => (
              <motion.div
                key={idx}
                className="pilier-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15 }}
              >
                <h3 className="pilier-title">{pilier.title}</h3>
                <p className="pilier-description">{pilier.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* BOUSSOLE 4C */}
      <section className="boussole-section">
        <div className="boussole-container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="section-title-insuffle">La Boussole 4C</h2>
            <p className="section-subtitle-insuffle">
              Notre outil de navigation stratégique : Cap • Cadence • Capacités • Contraintes
            </p>
          </motion.div>

          <motion.div
            className="radar-system"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="radar-grid">
              <div className="radar-circle"></div>
              <div className="radar-circle"></div>
              <div className="radar-circle"></div>
              <div className="radar-circle"></div>
              <div className="radar-line horizontal"></div>
              <div className="radar-line vertical"></div>
            </div>

            <div className="radar-sweep"></div>

            <div className="cardinal-points">
              <div className="cardinal-point north">
                <span className="cardinal-label">01</span>
                CAP
              </div>
              <div className="cardinal-point east">
                <span className="cardinal-label">02</span>
                CADENCE
              </div>
              <div className="cardinal-point south">
                <span className="cardinal-label">03</span>
                CAPACITÉS
              </div>
              <div className="cardinal-point west">
                <span className="cardinal-label">04</span>
                CONTRAINTES
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* MODÈLE ODCT */}
      <section className="odct-section">
        <div className="odct-container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="section-title-insuffle">Méthode ODCT</h2>
            <p className="section-subtitle-insuffle">
              Observer • Décider • Cadencer • Transformer
            </p>
          </motion.div>

          <div className="odct-timeline">
            {phases.map((phase, idx) => (
              <motion.div
                key={idx}
                className="odct-phase"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="odct-number">{phase.number}</div>
                <h3 className="odct-title">{phase.title}</h3>
                <p className="odct-description">{phase.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* OFFRES - Les 3 Portes */}
      <section className="offres-section">
        <div className="offres-container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="section-title-insuffle">Nos interventions</h2>
            <p className="section-subtitle-insuffle">
              Trois portes d'entrée selon votre urgence et votre maturité
            </p>
          </motion.div>

          <div className="offres-grid">
            {offres.map((offre, idx) => (
              <motion.div
                key={idx}
                className="door-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15 }}
              >
                <div className="door-header">
                  <div className="door-icon">{offre.icon}</div>
                  <h3 className="door-title">{offre.title}</h3>
                  <p className="door-subtitle">{offre.subtitle}</p>
                </div>
                <div className="door-content-wrapper">
                  <div className="door-content">
                    <p className="door-description">{offre.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="cta-final-section">
        <motion.div
          className="cta-box"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="cta-title">Prêt à retrouver le cap ?</h2>
          <p className="cta-description">
            Discutons de votre situation en toute confidentialité.
            <br />
            Premier échange gratuit, sans engagement.
          </p>
          <button className="cta-button" onClick={handleCreateSalon}>
            Prendre rendez-vous →
          </button>
        </motion.div>
      </section>
    </div>
  )
}

export default LandingPageInsufle
