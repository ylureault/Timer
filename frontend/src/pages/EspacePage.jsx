import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/Espace.css'

const Logo = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="#d9e0f5" strokeWidth="2.5" />
    <path d="M12 3a9 9 0 0 1 9 9" stroke="#1f3a8b" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="12" cy="12" r="2.4" fill="#1f3a8b" />
  </svg>
)

const formatDuree = (secondes) => {
  const m = Math.round((secondes || 0) / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const reste = m % 60
  return reste ? `${h} h ${String(reste).padStart(2, '0')}` : `${h} h`
}

const formatDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z'))
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const ETATS = {
  play: { texte: 'En cours', classe: 'est-actif' },
  pause: { texte: 'En pause', classe: 'est-pause' },
  termine: { texte: 'Terminé', classe: 'est-fini' },
}

export default function EspacePage() {
  const { cle } = useParams()
  const navigate = useNavigate()
  const [donnees, setDonnees] = useState(null)
  const [erreur, setErreur] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [renomme, setRenomme] = useState(false)
  const [nouveauNom, setNouveauNom] = useState('')
  const [lienCopie, setLienCopie] = useState(false)

  const charger = useCallback(async () => {
    try {
      const r = await fetch(`/api/espace/${cle}`)
      const d = await r.json()
      if (d.success) {
        setDonnees(d)
        setNouveauNom(d.espace.nom)
        setErreur(null)
      } else {
        setErreur(d.error || 'Espace introuvable')
      }
    } catch {
      setErreur('Connexion impossible')
    } finally {
      setChargement(false)
    }
  }, [cle])

  useEffect(() => {
    charger()
    // Les timers de l'espace changent d'état pendant qu'on anime.
    const id = setInterval(charger, 10000)
    return () => clearInterval(id)
  }, [charger])

  // La clé EST l'accès : ni indexation, ni fuite du lien par l'en-tête Referer
  // quand on clique vers l'extérieur.
  useEffect(() => {
    // index.html porte déjà « index, follow » : on modifie cette balise plutôt
    // que d'en ajouter une seconde qui la contredirait.
    const robots = document.querySelector('meta[name="robots"]')
    const ancienRobots = robots?.getAttribute('content') ?? null
    if (robots) robots.setAttribute('content', 'noindex, nofollow')

    const ref = document.createElement('meta')
    ref.name = 'referrer'
    ref.content = 'no-referrer'
    document.head.appendChild(ref)

    return () => {
      if (robots && ancienRobots !== null) robots.setAttribute('content', ancienRobots)
      ref.remove()
    }
  }, [])

  const copierLien = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setLienCopie(true)
      setTimeout(() => setLienCopie(false), 2400)
    } catch {
      /* presse-papiers indisponible */
    }
  }

  const enregistrerNom = async () => {
    const nom = nouveauNom.trim()
    if (!nom || nom === donnees?.espace?.nom) return setRenomme(false)
    await fetch(`/api/espace/${cle}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom }),
    })
    setRenomme(false)
    charger()
  }

  const retirer = async (code) => {
    await fetch(`/api/espace/${cle}/timer/${code}`, { method: 'DELETE' })
    charger()
  }

  if (chargement) {
    return (
      <div className="esp esp-etat">
        <div className="loader" />
        <p className="muted">Ouverture de l’espace…</p>
      </div>
    )
  }

  if (erreur) {
    return (
      <div className="esp esp-etat">
        <div className="esp-etat-carte card">
          <h1>Espace introuvable</h1>
          <p className="muted">
            Ce lien ne correspond à aucun espace. Il a peut-être été tronqué en le
            copiant, ou l’espace est resté inutilisé plus de six mois.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Retour à l’accueil
          </button>
        </div>
      </div>
    )
  }

  const { espace, timers } = donnees
  const totalSecondes = timers.reduce((t, x) => t + (x.duree_totale || 0), 0)

  return (
    <div className="esp">
      <header className="esp-tete">
        <a className="esp-logo" href="/">
          <Logo />
          <span>Timer <span className="esp-logo-sep">·</span> <strong>INSUFFLE</strong></span>
        </a>
        <button className="btn btn-secondary btn-sm" onClick={copierLien}>
          {lienCopie ? 'Lien copié' : 'Copier le lien de l’espace'}
        </button>
      </header>

      <main className="esp-corps">
        <div className="esp-titre">
          {renomme ? (
            <input
              className="input esp-titre-champ"
              value={nouveauNom}
              onChange={(e) => setNouveauNom(e.target.value)}
              onBlur={enregistrerNom}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.target.blur()
                if (e.key === 'Escape') { setNouveauNom(espace.nom); setRenomme(false) }
              }}
              maxLength={80}
              autoFocus
              aria-label="Nom de l’espace"
            />
          ) : (
            <h1>
              {espace.nom}
              <button
                className="esp-renommer"
                onClick={() => setRenomme(true)}
                aria-label="Renommer l’espace"
                title="Renommer"
              >
                ✎
              </button>
            </h1>
          )}
          <p className="esp-resume">
            {timers.length === 0
              ? 'Aucun timer pour le moment'
              : `${timers.length} timer${timers.length > 1 ? 's' : ''} · ${formatDuree(totalSecondes)} au total`}
          </p>
        </div>

        <div className="esp-actions">
          <button
            className="btn btn-primary btn-lg"
            onClick={() => navigate(`/create?espace=${cle}`)}
          >
            Créer un timer dans cet espace
          </button>
        </div>

        {timers.length === 0 ? (
          <div className="esp-vide card">
            <p>
              Cet espace est vide. Les timers que vous y créerez resteront rangés
              ici, retrouvables par ce lien — sans compte ni mot de passe.
            </p>
          </div>
        ) : (
          <ul className="esp-liste">
            {timers.map((t) => {
              const etat = ETATS[t.mode] || ETATS.pause
              return (
                <li key={t.code} className={`esp-carte ${etat.classe}`}>
                  <div className="esp-carte-haut">
                    <span className="esp-etat-pastille" aria-hidden="true" />
                    <div className="esp-carte-info">
                      <span className="esp-carte-nom">{t.name}</span>
                      <span className="esp-carte-meta">
                        <code>{t.code}</code> · {t.nb_sessions} séquence
                        {t.nb_sessions > 1 ? 's' : ''} · {formatDuree(t.duree_totale)}
                        {t.created_at ? ` · ${formatDate(t.created_at)}` : ''}
                      </span>
                    </div>
                    <span className="esp-carte-etat">{etat.texte}</span>
                  </div>

                  <div className="esp-carte-actions">
                    <a className="btn btn-secondary btn-sm" href={`/timer/${t.code}`}>
                      Afficher
                    </a>
                    <a className="btn btn-primary btn-sm" href={`/remote/${t.code}`}>
                      Piloter
                    </a>
                    {t.edit_token && (
                      <a className="btn btn-ghost btn-sm" href={`/edit/${t.edit_token}`}>
                        Modifier
                      </a>
                    )}
                    <button
                      className="esp-retirer"
                      onClick={() => retirer(t.code)}
                      title="Retirer de l’espace (le timer reste joignable par son code)"
                      aria-label={`Retirer ${t.name} de l’espace`}
                    >
                      ×
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <p className="esp-avertissement">
          <strong>Ce lien est la clé de l’espace.</strong> Gardez-le en favori :
          il n’y a ni compte ni mot de passe pour le retrouver. Toute personne
          qui l’obtient accède à ces timers.
        </p>
      </main>
    </div>
  )
}
