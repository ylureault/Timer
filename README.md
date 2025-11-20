# Timer Salon - Plateforme de Création de Salons avec Chronomètre Télécommandé

Une plateforme web moderne pour orchestrer le temps de vos ateliers, séminaires et formations avec un chronomètre visuel contrôlé à distance.

## 🎯 Fonctionnalités

### Création de Salons
- Création rapide de salons avec code à 4 chiffres et URL unique
- Configuration illimitée de sessions avec nom, durée et couleur personnalisés
- Support des sessions normales et des pauses
- Réorganisation par drag & drop des sessions

### Affichage Principal (Mode Projection)
- Chronomètre géant avec animation fluide
- Jauge de progression visuelle qui remplit l'écran
- Affichage du temps écoulé et restant
- Transitions animées entre les sessions
- Aperçu des sessions à venir
- Couleurs personnalisées par session

### Télécommande Mobile
- Interface mobile-first optimisée pour smartphone
- Contrôles tactiles : Play/Pause, Suivant/Précédent
- Ajustement du temps (+/- 30s, 1min, 5min)
- Vue circulaire du temps restant
- Liste de toutes les sessions
- Synchronisation en temps réel

### Synchronisation
- AJAX polling léger (300-500ms)
- Pas de WebSocket requis
- Mise à jour en temps réel sur tous les écrans
- Gestion côté serveur du temps

## 🛠️ Stack Technique

### Backend
- **Node.js** avec Express
- **SQLite** pour le stockage des données
- **API REST** pour toutes les opérations
- Architecture sans WebSocket (AJAX polling)

### Frontend
- **React 18** avec Hooks
- **Vite** pour le build et le dev server
- **React Router** pour la navigation
- **React Beautiful DnD** pour le drag & drop
- CSS3 avec animations modernes

## 📦 Installation

### Prérequis
- Node.js 16+ et npm

### Installation
```bash
# Cloner le repository
git clone <repository-url>
cd Timer

# Installer toutes les dépendances (root, backend, frontend)
npm run install:all
```

## 🚀 Démarrage

### Mode Développement
```bash
# Démarrer backend et frontend simultanément
npm run dev
```

Le serveur backend démarre sur `http://localhost:3000`
Le frontend démarre sur `http://localhost:5173`

### Production

```bash
# Build du frontend
npm run build

# Démarrer le serveur backend
npm start
```

## 📱 Utilisation

### 1. Créer un Salon

1. Accédez à la page d'accueil
2. Cliquez sur "Créer un salon maintenant"
3. Ajoutez vos sessions :
   - Nom de la session
   - Durée en minutes
   - Type (Session ou Pause)
   - Couleur
4. Réorganisez les sessions par glisser-déposer si nécessaire
5. Cliquez sur "Créer le salon"

### 2. Affichage Principal

- URL: `/salon/<code-4-chiffres>` ou `/salon/<url-unique>`
- À projeter sur grand écran
- Affiche le chronomètre en temps réel
- S'actualise automatiquement

### 3. Télécommande

- URL: `/remote/<code-4-chiffres>`
- À ouvrir sur smartphone/tablette
- Contrôle complet du timer :
  - ▶ Démarrer / ⏸ Pause
  - ◀ Session précédente / Session suivante ▶
  - Ajuster le temps (+/- secondes/minutes)
  - ⏹ Arrêter le cycle

## 🎨 Structure du Projet

```
Timer/
├── backend/
│   ├── server.js           # Serveur Express et API REST
│   ├── database.js         # Configuration SQLite et schéma
│   ├── utils.js            # Fonctions utilitaires
│   └── package.json        # Dépendances backend
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx      # Page d'accueil
│   │   │   ├── CreateSalon.jsx      # Création de salon
│   │   │   ├── SalonDisplay.jsx     # Affichage timer
│   │   │   └── RemoteControl.jsx    # Télécommande
│   │   ├── styles/          # CSS pour chaque page
│   │   ├── App.jsx          # Composant principal
│   │   └── main.jsx         # Point d'entrée React
│   ├── index.html
│   ├── vite.config.js
│   └── package.json         # Dépendances frontend
├── package.json             # Scripts racine
└── README.md
```

## 🔌 API Endpoints

### Création de Salon
- `POST /api/salon/create` - Créer un nouveau salon

### Gestion des Sessions
- `POST /api/salon/:code/sessions/add` - Ajouter une session
- `POST /api/salon/:code/sessions/update` - Modifier une session
- `POST /api/salon/:code/sessions/reorder` - Réorganiser les sessions
- `DELETE /api/salon/:code/sessions/remove` - Supprimer une session
- `GET /api/salon/:code/sessions` - Récupérer toutes les sessions

### Contrôle du Timer
- `POST /api/salon/:code/timer/start` - Démarrer le timer
- `POST /api/salon/:code/timer/pause` - Mettre en pause
- `POST /api/salon/:code/timer/addtime` - Ajouter du temps
- `POST /api/salon/:code/timer/next` - Session suivante
- `POST /api/salon/:code/timer/previous` - Session précédente
- `POST /api/salon/:code/timer/stop` - Arrêter le cycle

### État
- `GET /api/salon/:code/state` - Récupérer l'état actuel (polling)

## 🎭 Cas d'Usage

### Ateliers et Séminaires
- Gestion fluide des temps de parole
- Pauses programmées
- Transitions visuelles entre activités

### Cours et Formations
- Respect des timing de cours
- Gestion des exercices chronométrés
- Pauses bien définies

### Réunions et Rétrospectives
- Time-boxing des discussions
- Ateliers agiles (sprint planning, retros)
- Gestion du temps équitable

## 🌈 Couleurs par Défaut

- Bleu (`#3B82F6`) - Sessions standard
- Vert (`#10B981`) - Activités collaboratives
- Orange (`#F59E0B`) - Présentations
- Violet (`#8B5CF6`) - Réflexion individuelle
- Rose (`#EC4899`) - Brainstorming
- Rouge (`#EF4444`) - Urgence/Important
- Gris (`#6B7280`) - Pauses

## 🔒 Sécurité

- Code à 4 chiffres pour accès rapide
- URL unique pour chaque salon
- Token admin pour opérations sensibles
- Pas d'authentification lourde requise
- Sessions temporaires

## 📊 Base de Données

### Tables
- **salons** - Informations des salons
- **sessions** - Sessions de chaque salon
- **timer_states** - État actuel des timers

SQLite est utilisé pour sa simplicité et l'absence de dépendances externes.

## 🚧 Améliorations Futures (V2)

- Export des séquences au format JSON
- Clonage de salons existants
- Templates de séquences prédéfinis
- Synchronisation WebSocket (optionnelle)
- Statistiques d'utilisation
- Mode sombre
- Sons/notifications
- Multi-langues

## 📝 Licence

MIT

## 👥 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 🆘 Support

Pour toute question ou problème, ouvrez une issue sur GitHub.

---

**Créé avec ❤️ pour faciliter la gestion du temps collectif**
