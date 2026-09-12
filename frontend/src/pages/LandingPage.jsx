import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import '../styles/LandingPage.css'

const WORDS = [
  'ateliers', 'réunions', 'Codir', 'formations', 'webinaires', 'conférences',
  'workshops', 'séminaires', 'rétrospectives', 'démos', 'daily', 'plénières',
  'masterclass', 'cérémonies', 'brainstormings', 'soutenances',
]

const Logo = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="#d9e0f5" strokeWidth="2.5" />
    <path d="M12 3a9 9 0 0 1 9 9" stroke="#1f3a8b" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="12" cy="12" r="2.4" fill="#1f3a8b" />
  </svg>
)

/* <picture> : WebP d'abord (97 % plus léger que le PNG source), PNG en
   repli. Si aucun fichier n'existe, on retombe sur le pictogramme — la page
   ne montre jamais d'image cassée. */
function Illustration({ base, alt, icon, className = 'lp-fcard-illu' }) {
  const [ok, setOk] = useState(Boolean(base))

  if (base && ok) {
    return (
      <picture>
        <source srcSet={`/illustrations/${base}.webp`} type="image/webp" />
        <img
          className={className}
          src={`/illustrations/${base}.png`}
          alt={alt}
          loading="lazy"
          decoding="async"
          width="900"
          height="637"
          onError={() => setOk(false)}
        />
      </picture>
    )
  }

  if (!icon) return null

  return (
    <div className="lp-fcard-icon" aria-hidden="true">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
        {icon}
      </svg>
    </div>
  )
}

const FEATURES = [
  {
    icon: <path d="M12 6V3L8 7l4 4V8a4 4 0 1 1-4 4H6a6 6 0 1 0 6-6z" />,
    illu: 't-synchro-a-la-seconde',
    alt: "Un écran de salle, un ordinateur portable et un téléphone affichant la même horloge",
    title: 'Synchro à la seconde',
    description:
      "L'écran de la salle, le vidéoprojecteur et votre téléphone affichent exactement le même temps.",
  },
  {
    icon: <path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm5 16.5a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z" />,
    illu: 't-telecommande-dans-la-poche',
    alt: 'Une main appuie sur un téléphone qui pilote à distance l’horloge affichée sur un écran',
    title: 'Télécommande dans la poche',
    description:
      'Lancez, mettez en pause, ajoutez 2 minutes ou passez à la suite depuis votre mobile, sans rien installer.',
  },
  {
    icon: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
    illu: 't-deroule-complet',
    alt: 'Trois personnes observent une frise de séquences avec un curseur de progression',
    title: 'Déroulé complet',
    description:
      'Enchaînez vos séquences et vos pauses. Le groupe voit où il en est et ce qui arrive ensuite.',
  },
  {
    icon: <path d="M12 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-8-8V2zm1 4h-2v7l5.25 3.15 1-1.64L13 11.8V6z" />,
    illu: 't-ajustable-en-direct',
    alt: 'Un doigt appuie sur un bouton plus qui allonge la première séquence d’une suite',
    title: 'Ajustable en direct',
    description:
      "Un débat qui s'étire ? Ajoutez du temps d'un geste, tous les écrans se recalent instantanément.",
  },
  {
    icon: <path d="M3 5h18v2H3zm0 6h18v2H3zm0 6h12v2H3z" />,
    illu: 't-lisible-du-fond-de-la-salle',
    alt: 'Un public assis face à un grand écran affichant une horloge, chacun la voit',
    title: 'Lisible du fond de la salle',
    description:
      'Trois affichages au choix, pensés pour rester lisibles à dix mètres comme sur un écran partagé.',
  },
  {
    icon: <path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />,
    illu: 't-sans-compte-sans-trace',
    alt: 'Un ordre du jour papier à la corbeille, remplacé par un QR code sur un téléphone',
    title: 'Sans compte, sans trace',
    description:
      'Pas d’inscription, pas de mot de passe, aucune donnée personnelle. Un lien, un code, c’est tout.',
  },
]

const STEPS = [
  {
    num: '1',
    title: 'Composez le déroulé',
    desc: 'Ajoutez vos séquences et vos pauses, avec leur durée. Quelques clics suffisent.',
  },
  {
    num: '2',
    title: 'Projetez le timer',
    desc: 'Ouvrez le lien sur l’écran de la salle ou partagez-le en visio. Le QR code fait le reste.',
  },
  {
    num: '3',
    title: 'Pilotez depuis le mobile',
    desc: 'Vous gardez la main : pause, temps additionnel, séquence suivante, message à l’écran.',
  },
]

const PUBLICS = [
  'Facilitateurs & facilitatrices',
  'Formateurs',
  'Scrum masters',
  'Consultants',
  'Enseignants',
  'Organisateurs d’événements',
]

const USECASES = [
  {
    titre: 'Atelier de co-construction',
    illu: 't-atelier-de-co-construction',
    alt: 'Un facilitateur anime un groupe debout autour d’une table couverte de post-it, une horloge projetée derrière lui',
    texte:
      "Une divergence qui s'emballe, une convergence bâclée : l'atelier se joue souvent sur la tenue du temps. Séquencez idéation, regroupement et vote, projetez le déroulé, et laissez le minuteur porter la contrainte à votre place. Vous n'êtes plus celui qui coupe la parole, c'est le temps affiché qui le fait.",
    meta: '6 à 8 séquences · 2 à 3 h',
  },
  {
    titre: 'Formation et montée en compétences',
    illu: 't-formation-montee-en-competences',
    alt: 'Le déroulé d’une journée de formation, séquences et pauses alternées du lever au coucher du soleil',
    texte:
      "Alternez apports, exercices et pauses sur une journée entière. Les participants voient le rythme à l'avance, savent quand la pause arrive, et reviennent à l'heure parce que l'écran l'annonce. Les durées se réajustent en direct quand un exercice prend plus que prévu.",
    meta: 'Journée · 8 à 12 séquences',
  },
  {
    titre: 'Rituels agiles',
    illu: 't-rituels-agiles',
    alt: 'Trois personnes observent une frise de séquences avec un curseur de progression',
    texte:
      "Daily de quinze minutes, rétrospective en cinq temps, revue de sprint minutée. Le timer partagé rend la time-box visible par toute l'équipe plutôt que gardée par le scrum master. Le dépassement s'affiche : on voit précisément de combien on déborde.",
    meta: 'Daily 15 min · Rétro 1 h',
  },
  {
    titre: 'Pitchs, soutenances et jurys',
    illu: 't-pitchs-soutenances-jurys',
    alt: 'Un public assis face à un grand écran affichant une horloge, chacun voit le même temps',
    texte:
      "Chaque intervenant dispose du même temps, affiché en grand et lisible du fond de la salle. Le décompte devient un arbitre neutre : plus de discussion sur qui a eu plus de temps, plus de sonnerie à déclencher à la main.",
    meta: '5 min par passage',
  },
]

const FAQ = [
  {
    q: 'Faut-il créer un compte pour utiliser le timer ?',
    a: "Non. Aucune inscription, aucun mot de passe, aucune carte bancaire. Vous créez un timer, vous recevez un code à six chiffres et un lien d'édition secret. C'est tout.",
  },
  {
    q: 'Comment les participants voient-ils le temps restant ?',
    a: "Vous projetez l'affichage sur l'écran de la salle, ou vous partagez votre écran en visio. Un QR code permet aussi à chacun d'ouvrir le timer sur son téléphone.",
  },
  {
    q: 'Puis-je modifier le déroulé pendant la séance ?',
    a: "Oui. Depuis la télécommande, vous ajoutez ou supprimez des séquences, changez les durées et ajoutez du temps à la volée. Tous les écrans se mettent à jour immédiatement.",
  },
  {
    q: 'Le timer fonctionne-t-il à distance et en hybride ?',
    a: "Oui. La synchronisation passe par le web : tous ceux qui ouvrent le lien voient le même temps, qu'ils soient dans la salle ou connectés à distance.",
  },
  {
    q: 'Combien de temps mon timer est-il conservé ?',
    a: 'Un timer reste accessible tant qu’il est utilisé. Les timers inactifs depuis plus de sept jours sont automatiquement supprimés.',
  },
]

function useLiveStats() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let alive = true

    const load = async () => {
      try {
        const res = await fetch('/api/stats/live')
        if (!res.ok) return
        const data = await res.json()
        if (alive && data.success) setStats(data)
      } catch {
        /* réseau indisponible : on garde la dernière valeur connue */
      }
    }

    load()
    const id = setInterval(load, 10000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  return stats
}

const formatNumber = (n) =>
  typeof n === 'number' ? n.toLocaleString('fr-FR') : '—'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/* Compteur qui s'incrémente vers sa valeur. Rend la donnée vivante plutôt
   que de la faire apparaître d'un coup. */
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(typeof target === 'number' ? target : 0)
  const fromRef = useRef(0)

  useEffect(() => {
    if (typeof target !== 'number') return
    if (prefersReducedMotion()) {
      setValue(target)
      fromRef.current = target
      return
    }

    const from = fromRef.current
    if (from === target) return
    const start = performance.now()
    let raf

    const step = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (t < 1) raf = requestAnimationFrame(step)
      else fromRef.current = target
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}

/* Révélation au défilement. On n'« arme » (= masque) qu'après avoir
   confirmé que l'observateur existe : sans lui, le contenu reste visible. */
function useReveal() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    if (prefersReducedMotion()) return

    const targets = el.querySelectorAll('.reveal')
    targets.forEach((t) => t.classList.add('is-armed'))

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible')
            io.unobserve(e.target)
          }
        })
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
    )

    targets.forEach((t) => io.observe(t))

    // Filet de sécurité : si rien n'a été révélé au bout de 2 s
    // (observateur en échec, onglet en arrière-plan…), on démasque tout.
    const safety = setTimeout(() => {
      targets.forEach((t) => t.classList.add('is-visible'))
    }, 2000)

    return () => {
      io.disconnect()
      clearTimeout(safety)
    }
  }, [])

  return ref
}

/* Le minuteur de la vitrine tourne vraiment, au lieu d'être une image figée. */
function useDemoCountdown(from = 750) {
  const [left, setLeft] = useState(from)
  useEffect(() => {
    if (prefersReducedMotion()) return
    const id = setInterval(() => setLeft((v) => (v <= 1 ? from : v - 1)), 1000)
    return () => clearInterval(id)
  }, [from])
  return left
}

const mmss = (s) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

function LiveStat({ label, value, hero = false }) {
  const shown = useCountUp(value)
  return (
    <div className={`lp-stat ${hero ? 'lp-stat-hero' : ''}`}>
      <dt>{label}</dt>
      <dd>{typeof value === 'number' ? shown.toLocaleString('fr-FR') : '—'}</dd>
    </div>
  )
}

function LandingPage() {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [openFaq, setOpenFaq] = useState(null)
  const [joinError, setJoinError] = useState('')
  const stats = useLiveStats()
  const revealRef = useReveal()
  const demoLeft = useDemoCountdown(750)

  useEffect(() => {
    const interval = setInterval(
      () => setCurrentWordIndex((prev) => (prev + 1) % WORDS.length),
      2200
    )
    return () => clearInterval(interval)
  }, [])

  const handleCreateTimer = () => navigate('/create')

  const handleJoinTimer = () => {
    const trimmed = joinCode.trim()
    const digits = trimmed.replace(/-/g, '')
    if (digits.length < 6) {
      setJoinError('Un code contient six chiffres, par exemple 428-903.')
      return
    }
    setJoinError('')
    const formatted = trimmed.includes('-')
      ? trimmed
      : `${digits.slice(0, 3)}-${digits.slice(3, 6)}`
    navigate(`/timer/${formatted}`)
  }

  // Formatage à la saisie : l'utilisateur tape 6 chiffres, le tiret s'ajoute.
  const handleJoinChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
    setJoinCode(digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits)
    if (joinError) setJoinError('')
  }

  const ringRadius = 92
  const ringCircumference = 2 * Math.PI * ringRadius

  return (
    <div className="lp" ref={revealRef}>
      <a className="lp-skip" href="#contenu">Aller au contenu</a>

      {/* ================= NAVBAR ================= */}
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <a className="lp-logo" href="/">
            <Logo />
            <span className="lp-logo-text">
              Timer <span className="lp-logo-sep">·</span>{' '}
              <span className="lp-logo-brand">INSUFFLE</span>
            </span>
          </a>

          <nav className="lp-nav-links">
            <a href="#fonctionnalites" className="lp-nav-link">Fonctionnalités</a>
            <a href="#deroule" className="lp-nav-link">Comment ça marche</a>
            <a href="#faq" className="lp-nav-link">Questions</a>
            <button className="btn btn-primary btn-sm" onClick={handleCreateTimer}>
              Créer un timer
            </button>
          </nav>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section className="lp-hero">
        <div className="lp-hero-bg" aria-hidden="true">
          <span className="lp-orb lp-orb-blue" />
          <span className="lp-orb lp-orb-yellow" />
        </div>

        <div className="lp-hero-grid">
          <motion.div
            className="lp-hero-left"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <span className="lp-eyebrow">Gratuit · Sans inscription</span>

            <h1 className="lp-hero-title">
              Le timer partagé de vos{' '}
              {/* Pas d'AnimatePresence ici : le mode "wait" laissait un instant
                  sans aucun mot, et le titre se lisait tronqué. La clé suffit
                  à rejouer l'entrée, le mot est toujours présent. */}
              <motion.span
                key={currentWordIndex}
                className="lp-rotating-word"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
              >
                {WORDS[currentWordIndex]}
              </motion.span>
            </h1>

            <p className="lp-hero-desc">
              Projetez le temps qui reste, pilotez-le depuis votre téléphone, gardez
              le groupe dans le rythme. L’outil des facilitateurs qui tiennent
              vraiment leur déroulé.
            </p>

            <div className="lp-hero-actions">
              <button
                className="btn btn-primary btn-xl anim-soft"
                onClick={handleCreateTimer}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Créer mon timer
              </button>

              <div className="lp-join">
                <input
                  type="text"
                  inputMode="numeric"
                  className={`input lp-join-input ${joinError ? 'has-error' : ''}`}
                  placeholder="XXX-XXX"
                  maxLength={7}
                  value={joinCode}
                  onChange={handleJoinChange}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinTimer()}
                  aria-label="Code du timer à rejoindre"
                  aria-invalid={joinError ? 'true' : undefined}
                  aria-describedby={joinError ? 'lp-join-err' : undefined}
                />
                <button className="btn btn-secondary" onClick={handleJoinTimer}>
                  Rejoindre
                </button>
              </div>
            </div>

            {joinError && (
              <p className="lp-join-error" id="lp-join-err" role="alert">
                {joinError}
              </p>
            )}

            <p className="lp-reassurance">
              Aucun compte · Aucune carte bancaire · Prêt en moins d’une minute
            </p>
          </motion.div>

          {/* Mise en scène : l'écran projeté + la télécommande */}
          <motion.div
            className="lp-hero-right"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div className="lp-mockup">
              {/* L'écran de la salle */}
              <div className="lp-screen">
                <div className="lp-screen-glow" aria-hidden="true" />
                <div className="lp-screen-head">
                  <span className="lp-screen-step">Séquence 2 / 4</span>
                  <span className="lp-screen-name">Idéation</span>
                </div>

                <div className="lp-screen-ring anim-breathe">
                  <svg viewBox="0 0 224 224" className="lp-ring-svg" aria-hidden="true">
                    <circle className="lp-ring-track" cx="112" cy="112" r={ringRadius} />
                    <circle
                      className="lp-ring-progress"
                      cx="112"
                      cy="112"
                      r={ringRadius}
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringCircumference * (1 - demoLeft / 750)}
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <div className="lp-ring-center">
                    <div className="lp-ring-time">{mmss(demoLeft)}</div>
                    <div className="lp-ring-status">
                      <span className="lp-ring-dot" />
                      En cours
                    </div>
                  </div>
                </div>

                <div className="lp-screen-dots" aria-hidden="true">
                  <span className="is-done" />
                  <span className="is-active" />
                  <span />
                  <span />
                </div>
              </div>

              {/* La télécommande, posée par-dessus */}
              <div className="lp-remote">
                <span className="lp-remote-label">Télécommande</span>
                <span className="lp-remote-time">{mmss(demoLeft)}</span>
                <div className="lp-remote-row">
                  <span className="lp-remote-btn">
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  </span>
                  <span className="lp-remote-pill">+ 2 min</span>
                  <span className="lp-remote-pill">Suivant</span>
                </div>
              </div>

              {/* Puces flottantes */}
              <span className="lp-chip lp-chip-sync">
                <span className="lp-chip-dot" />
                {stats?.ecrans_connectes ? `${stats.ecrans_connectes} écrans` : 'Écrans'} synchronisés
              </span>
              <span className="lp-chip lp-chip-time">+ 2 min ajoutées</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= COMPTEUR LIVE ================= */}
      <section className="lp-live" aria-label="Activité en direct">
        <div className="lp-live-inner">
          <div className="lp-live-head">
            <span className="lp-live-pulse" aria-hidden="true" />
            <span className="lp-live-title">En ce moment même</span>
          </div>

          <dl className="lp-live-stats">
            <LiveStat hero label="Timers en cours" value={stats?.timers_en_cours} />
            <LiveStat label="Écrans connectés" value={stats?.ecrans_connectes} />
            <LiveStat label="Timers créés" value={stats?.timers_total} />
            <LiveStat label="Minutes orchestrées" value={stats?.minutes_orchestrees} />
          </dl>
        </div>
      </section>

      {/* ================= FONCTIONNALITÉS ================= */}
      <section className="lp-section" id="contenu">
        <header className="lp-section-head">
          <h2>Tout ce qu’il faut pour tenir le temps</h2>
          <p>
            Pensé avec des facilitateurs, pour le moment précis où la séance
            déborde et où il faut décider vite.
          </p>
        </header>

        {/* #features : ancre historique, des liens externes pointent dessus */}
        <span id="features" className="lp-anchor" aria-hidden="true" />
        <div className="lp-cards" id="fonctionnalites">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="lp-fcard reveal"
            >
              <Illustration base={feature.illu} alt={feature.alt} icon={feature.icon} />
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ================= CAS D'USAGE ================= */}
      <section className="lp-section lp-section-alt has-grain" id="cas-usage">
        <header className="lp-section-head reveal">
          <h2>Quatre situations où le temps décide de tout</h2>
          <p>
            Le minuteur ne fait pas l’animation à votre place. Il enlève la
            charge de surveiller la montre pendant que vous écoutez.
          </p>
        </header>

        <div className="lp-usecases">
          {USECASES.map((u) => (
            <article key={u.titre} className="lp-usecase reveal">
              <Illustration base={u.illu} alt={u.alt} className="lp-usecase-illu" />
              <h3>{u.titre}</h3>
              <p>{u.texte}</p>
              <span className="lp-usecase-meta">{u.meta}</span>
            </article>
          ))}
        </div>
      </section>

      {/* ================= DÉROULÉ ================= */}
      <section className="lp-section lp-section-steps" id="deroule">
        <header className="lp-section-head">
          <h2>Trois étapes, une minute</h2>
          <p>Pas de prise en main, pas de tutoriel. Vous ouvrez, vous animez.</p>
        </header>

        <ol className="lp-steps">
          {STEPS.map((step) => (
            <li key={step.num} className="lp-step reveal">
              <span className="lp-step-num">{step.num}</span>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ================= PUBLICS ================= */}
      <section className="lp-section lp-section-publics">
        <div className="lp-publics-card reveal has-grain">
          <h2>Fait pour celles et ceux qui animent</h2>
          <ul className="lp-publics">
            {PUBLICS.map((p) => (
              <li key={p} className="badge badge-primary">{p}</li>
            ))}
          </ul>
          <button className="btn btn-primary btn-lg" onClick={handleCreateTimer}>
            Créer mon premier timer
          </button>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="lp-section" id="faq">
        <header className="lp-section-head">
          <h2>Questions fréquentes</h2>
        </header>

        <div className="lp-faq">
          {FAQ.map((item, idx) => (
            <details
              key={item.q}
              className="lp-faq-item reveal"
              open={openFaq === idx}
              onToggle={(e) => e.currentTarget.open && setOpenFaq(idx)}
            >
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <div className="lp-footer-wordmark">
              <Logo size={20} />
              Timer <span className="lp-logo-sep">·</span>{' '}
              <span className="lp-logo-brand">INSUFFLE</span>
            </div>
            <p className="lp-footer-tagline">
              Orchestrez le temps de vos temps collectifs.
            </p>
          </div>

          <nav className="lp-footer-links">
            <a href="https://www.insuffle.com" target="_blank" rel="noopener noreferrer">
              insuffle.com
            </a>
            <a href="https://ateliers.insuffle.com" target="_blank" rel="noopener noreferrer">
              Méthodes d’animation
            </a>
            <a
              href="https://www.linkedin.com/company/insuffle/"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
          </nav>
        </div>
        <div className="lp-footer-copy">© 2026 Timer par INSUFFLE</div>
      </footer>
    </div>
  )
}

export default LandingPage
