# CLAUDE.md — Timer par INSUFFLE

Guide pour toute session Claude travaillant sur ce dépôt. Contient l'architecture
et **comment / quoi déployer**.

## Vue d'ensemble

Minuteur visuel partagé, **sans authentification**. N'importe qui crée un timer et
reçoit un code public `XXX-XXX` (affichage/pilotage) + un lien d'édition secret
`/edit/<token>`. Synchronisation temps réel via WebSocket, avec repli polling.

- **Frontend** : React 18 + Vite + React Router (`frontend/`). Sort un build statique dans `frontend/dist`.
- **Backend** : Node + Express + SQLite (`better-sqlite3`) + serveur WebSocket (`ws`) (`backend/`).
- **Routes UI** : `/` · `/create` · `/timer/:code` · `/remote/:code` · `/edit/:token`
- **Données** : SQLite `backend/timer_v2.db` (3 tables : `timers`, `sessions`, `timer_states`), créé automatiquement au 1er lancement. Nettoyage auto des timers inactifs > 7 jours (intervalle in-process, pas de cron).

## Commandes

```bash
npm run install:all   # installe racine + backend + frontend
npm run dev           # dev : backend (nodemon) + frontend (vite) en parallèle
npm run build         # build frontend -> frontend/dist
npm start             # prod : lance le backend (sert aussi frontend/dist s'il existe)
```

En dev, Vite (`frontend/vite.config.js`) proxifie `/api` → `:3000` et `/ws` → `:3001`.

---

# Déploiement

## Quoi déployer (2 artefacts)

1. **Le build frontend** — fichiers statiques générés par `npm run build` dans
   `frontend/dist`. Aucune logique serveur dedans : juste HTML/JS/CSS.
2. **Le backend** — le process Node (`backend/server.js`). Il fait 3 choses :
   - API REST sur `PORT` (défaut **3000**)
   - serveur WebSocket sur `WS_PORT` (défaut **3001**, port distinct)
   - sert `frontend/dist` (statique + fallback SPA) **si le dossier existe**

> Modèle recommandé : **un seul serveur** qui fait tourner le backend, lequel sert
> aussi le frontend déjà buildé. Pas besoin d'héberger le frontend ailleurs.

## Comment déployer (serveur unique)

```bash
# sur la machine/conteneur cible (Node 18+ ; testé en Node 22)
npm run install:all
npm run build          # produit frontend/dist
PORT=3000 WS_PORT=3001 npm start
```

Le backend écoute sur `0.0.0.0`. `GET /api/health` renvoie `{ "status": "ok" }`
(utile comme health check plateforme).

## ⚠️ WebSocket : le point critique

Le navigateur se connecte à **`wss://<domaine>/ws?code=XXX`** (même hôte, chemin
`/ws`). Or le serveur WS écoute sur un **port séparé `WS_PORT` (3001)**, PAS sur
`/ws` du serveur HTTP. En dev, Vite fait le pont ; **en prod il n'y a pas de Vite**.

Il faut donc l'une de ces options :

- **(recommandé) Reverse proxy** qui route `/ws` → `127.0.0.1:3001` (en conservant
  la query string `?code=`) et `/` + `/api` → `127.0.0.1:3000`.
- **Build avec `VITE_WS_URL`** : `VITE_WS_URL=wss://mon-domaine:3001 npm run build`
  (exige d'exposer le port 3001 publiquement en TLS).
- **Ne rien faire** : le `/timer/:code` bascule alors sur le **polling** (fallback
  déjà codé) et `/remote/:code` poll de toute façon. Ça marche, mais moins « temps
  réel ». Acceptable pour un usage léger.

### Exemple nginx

```nginx
server {
  listen 443 ssl;
  server_name timer.insuffle.com;
  # ... certs ssl ...

  location /ws {
    proxy_pass http://127.0.0.1:3001;   # query string conservée automatiquement
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
  }

  location / {
    proxy_pass http://127.0.0.1:3000;   # API + SPA servies par le backend
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### Exemple Caddy (TLS auto)

```
timer.insuffle.com {
  @ws path /ws*
  reverse_proxy @ws 127.0.0.1:3001
  reverse_proxy 127.0.0.1:3000
}
```

## Variables d'environnement

| Variable        | Quand        | Défaut | Rôle                                            |
|-----------------|--------------|--------|-------------------------------------------------|
| `PORT`          | runtime      | 3000   | port HTTP (API + SPA)                           |
| `WS_PORT`       | runtime      | 3001   | port du serveur WebSocket                       |
| `VITE_WS_URL`   | **build**    | (auto) | force l'URL WS du client (sinon `wss://host/ws`)|

Aucune clé/secret nécessaire (pas d'auth, pas d'email, pas d'API tierce hormis
`api.qrserver.com` appelé côté navigateur pour les QR codes).

## Persistance (important)

La base est un **fichier** : `backend/timer_v2.db`. Sur un hébergeur à système de
fichiers éphémère (conteneurs PaaS, Heroku…), il est **réinitialisé à chaque
redéploiement** → timers perdus. Monter un **volume persistant** sur `backend/`
(ou déplacer le fichier sur un disque persistant).

## Contrainte : une seule instance backend

L'état WebSocket (Map des connexions par code) et les `setInterval`
(auto-advance + nettoyage) sont **en mémoire, par process**. Lancer plusieurs
instances casserait la synchro WS et déclencherait l'auto-advance en double.
→ Déployer **une seule instance** (scale = 1). Pas d'auto-scaling horizontal.

## Exemple Dockerfile (serveur unique)

```dockerfile
FROM node:22-slim
WORKDIR /app
# better-sqlite3 = module natif -> outils de build
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY . .
RUN npm run install:all && npm run build
ENV PORT=3000 WS_PORT=3001
EXPOSE 3000 3001
CMD ["npm", "start"]
```

(Mettre un reverse proxy devant pour `/ws`, ou exposer 3001 + `VITE_WS_URL`.)

## Checklist de déploiement

1. `npm run install:all` puis `npm run build` (vérifier `frontend/dist` créé).
2. Démarrer le backend (`npm start`) en **instance unique**.
3. Reverse proxy : `/ws` → `:3001`, le reste → `:3000` (sinon fallback polling).
4. Volume persistant pour `backend/timer_v2.db`.
5. Tester : `GET /api/health` = ok ; créer un timer, ouvrir `/timer/:code`,
   piloter via `/remote/:code`, vérifier que le temps change en direct.

---

## Note de maintenance

`backend/package.json` liste encore des dépendances **inutilisées** depuis la
suppression de l'auth (`bcryptjs`, `jsonwebtoken`, `nodemailer`, `nanoid`,
`uuid`). Seules `express`, `cors`, `ws`, `better-sqlite3` sont requises. Les
retirer accélère l'install et réduit la surface de build natif (optionnel).
