# Backlog QA — « 200 utilisateurs »

Campagne de test avant déploiement : **10 itérations × ~411 assertions = 4110 tests**
automatisés (création concurrente, flux de contrôle, WebSocket, cas limites,
validation, édition par token) + **audit heuristique UX/UI** de chaque écran.

## Résultats automatisés

| Métrique | Valeur |
|---|---|
| Assertions totales | **4110** |
| Réussites | **4110 (100%)** après corrections |
| Échecs fonctionnels backend | **0** |
| Latence HTTP p95 / p99 / max — *avant* WAL | 548 / 818 / 1158 ms (8 req > 1 s) |
| Latence HTTP p95 / p99 / max — *après* WAL | **39 / 84 / 134 ms (0 req > 1 s)** |

Harnais : `backend/qa-harness.mjs` (réutilisable : `node qa-harness.mjs`).

> Note : un 1er run montrait 22 « échecs » WS/itération — c'était un **bug du
> harnais** (il jetait les messages capturés avant d'attacher son écouteur) ; le
> vrai client (`onmessage` synchrone) ne perd pas l'état initial. Corrigé.

---

## Findings (UX / UI / fonctionnel)

Légende statut : ✅ corrigé dans ce lot · 🔜 backlog (à planifier)

### 🔴 Haute priorité
| # | Zone | Problème | Statut |
|---|------|----------|--------|
| H1 | Télécommande | **Bip à chaque seconde** pendant la lecture : `useEffect([temps_restant])` déclenchait `playBeep()` à chaque tick du compte à rebours → son incessant. | ✅ |
| H2 | Télécommande | **Écran d'erreur clignotant** : un seul poll échoué (hoquet réseau) remplaçait toute l'UI par « Timer introuvable », puis revenait au poll suivant. | ✅ |

### 🟠 Priorité moyenne
| # | Zone | Problème | Statut |
|---|------|----------|--------|
| M1 | Création / Édition | Champ **durée** : `parseInt(value)||1` empêche de vider le champ pour retaper (saute à 1) ; minutes entières uniquement. | ✅ (saisie) / 🔜 (sous-minute) |
| M2 | Édition | Boutons **Copier** sans repli `execCommand` (échec en HTTP) ni retour visuel « Copié ». | ✅ |
| M3 | Global (a11y) | Pas de style **`:focus-visible`** (navigation clavier invisible) ; `--text-muted` (#8b94a8) sous le ratio WCAG AA ; icônes d'affichage sans `aria-label`. | ✅ |
| M4 | Assets | Aucun dossier **`public/`** : favicon `/timer-icon.svg` en 404, `og-image.png` (partage social) manquant. | ✅ (favicon) / 🔜 (image OG 1200×630) |
| M5 | Affichage | **Dérive d'horloge** possible dans un onglet en arrière-plan (compte à rebours local, pas de resynchro périodique pendant la lecture — le serveur ne diffuse qu'aux actions). | ✅ (resync léger) |
| M6 | Backend | **SQLite synchrone** : pic de créations simultanées bloque la boucle (p99 ~0,8 s). Acceptable à l'échelle réelle (1 créateur, N spectateurs). | ✅ (WAL) / 🔜 (file d'écriture si besoin) |

### 🟡 Basse priorité / améliorations
| # | Zone | Problème | Statut |
|---|------|----------|--------|
| L1 | Création / Édition | `alert()` / `confirm()` natifs (bloquants, hors charte). | 🔜 |
| L2 | Télécommande | Bouton « Rafraîchir » = rechargement complet de la page. | 🔜 |
| L3 | Télécommande | « Ajouter une session » sans nom = no-op silencieux (pas de retour). | 🔜 |
| L4 | Création | Pas de bouton « Créer un autre timer » sur l'écran de succès. | 🔜 |
| L5 | Édition | Modifier les sessions réinitialise le timer en cours côté serveur (sémantique d'édition) — à signaler à l'utilisateur. | 🔜 |
| L6 | Affichage | Bip de fin soumis à la politique autoplay (contexte audio suspendu sans interaction) sur un écran projeté. | 🔜 |
| L7 | Landing | Le mot rotatif peut provoquer un léger saut de largeur. | 🔜 |

---

## Lot de corrections appliqué dans ce commit
- H1, H2, M1 (saisie), M2, M3, M4 (favicon), M5, M6 (WAL).
- Re-test : `node backend/qa-harness.mjs` → 4110/4110, et `npm run build` OK.

## Reste à planifier
M1 (durées sous-minute), M4 (image OG), L1–L7.
