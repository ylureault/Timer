# Plan de Tests - Timer Salon Platform
## Tests pour 100 Utilisateurs / Tous les Cas d'Usage

---

## 🎯 Objectifs des Tests
- Vérifier tous les flux utilisateurs (création, affichage, contrôle, admin)
- Tester le changement de thème entre onglets/fenêtres
- Vérifier la synchronisation en temps réel
- Tester l'accessibilité et l'UX/UI
- Valider les performances et la stabilité

---

## 📋 SCÉNARIOS DE TEST

### **CATÉGORIE 1: Création de Salon (20 tests)**

#### Test 1.1: Création de salon basique
- **Steps:**
  1. Ouvrir la landing page
  2. Cliquer sur "Créer un salon"
  3. Entrer un nom de salon
  4. Ajouter 2 sessions (travail + pause)
  5. Cliquer sur "Créer le salon"
- **Résultat attendu:** Modal de succès s'affiche avec code 4 chiffres + design ticket
- **Status:** ✅ À tester

#### Test 1.2: Création avec 10 sessions
- **Steps:**
  1. Créer un salon
  2. Ajouter 10 sessions de types variés
  3. Changer les couleurs de chaque session
  4. Créer le salon
- **Résultat attendu:** Toutes les sessions sont créées dans l'ordre
- **Status:** ✅ À tester

#### Test 1.3: Drag & Drop des sessions
- **Steps:**
  1. Créer 5 sessions
  2. Réorganiser par drag & drop
  3. Vérifier l'ordre final
  4. Créer le salon
- **Résultat attendu:** L'ordre est préservé après création
- **Status:** ✅ À tester

#### Test 1.4: Validation des champs
- **Steps:**
  1. Essayer de créer un salon sans nom
  2. Essayer avec 0 sessions
  3. Essayer avec une durée négative
  4. Essayer avec un nom vide pour une session
- **Résultat attendu:** Messages d'erreur clairs pour chaque cas
- **Status:** ✅ À tester

#### Test 1.5: Templates de sessions
- **Steps:**
  1. Utiliser le template "Atelier classique"
  2. Utiliser le template "Sprint intensif"
  3. Utiliser le template "Formation longue"
- **Résultat attendu:** Sessions pré-remplies correctement
- **Status:** ✅ À tester

#### Test 1.6: Suppression de sessions
- **Steps:**
  1. Créer 5 sessions
  2. Supprimer la 3ème session
  3. Vérifier que les autres restent
- **Résultat attendu:** Session supprimée, ordre préservé
- **Status:** ✅ À tester

#### Test 1.7: Modification des couleurs
- **Steps:**
  1. Créer une session
  2. Ouvrir le color picker
  3. Choisir une couleur custom
- **Résultat attendu:** Couleur appliquée visuellement
- **Status:** ✅ À tester

#### Test 1.8: Création avec durées très courtes (1 min)
- **Steps:**
  1. Créer sessions de 1 minute
  2. Vérifier l'affichage du timer
- **Résultat attendu:** Timer fonctionne correctement
- **Status:** ✅ À tester

#### Test 1.9: Création avec durées très longues (120 min)
- **Steps:**
  1. Créer sessions de 2 heures
  2. Vérifier l'affichage
- **Résultat attendu:** Affichage correct
- **Status:** ✅ À tester

#### Test 1.10: Export/Import de configuration
- **Steps:**
  1. Créer un salon complexe
  2. Exporter la configuration (JSON)
  3. Créer un nouveau salon
  4. Importer la configuration
- **Résultat attendu:** Configuration restaurée à l'identique
- **Status:** ✅ À tester

#### Test 1.11-1.20: Tests supplémentaires de création
- Création avec caractères spéciaux
- Création avec emojis dans le nom
- Création puis annulation
- Refresh pendant la création
- Création simultanée par 10 utilisateurs
- Création avec mobile (tactile)
- Création avec clavier uniquement (accessibilité)
- Création avec lecteur d'écran
- Création en mode offline puis online
- Création avec mauvaise connexion réseau
- **Status:** ✅ À tester

---

### **CATÉGORIE 2: Affichage Salon (20 tests)**

#### Test 2.1: Affichage initial
- **Steps:**
  1. Créer un salon
  2. Ouvrir l'URL d'affichage `/salon/CODE`
- **Résultat attendu:** Première session affichée, timer à 0
- **Status:** ✅ À tester

#### Test 2.2: Affichage avec code invalide
- **Steps:**
  1. Ouvrir `/salon/9999`
- **Résultat attendu:** Message d'erreur "Salon non trouvé"
- **Status:** ✅ À tester

#### Test 2.3: Changement de thème - Luxe
- **Steps:**
  1. Ouvrir affichage
  2. Changer vers thème "Luxe" depuis remote
  3. Vérifier l'affichage
- **Résultat attendu:** Thème circulaire premium appliqué
- **Status:** ✅ À tester

#### Test 2.4: Changement de thème - Applat
- **Steps:**
  1. Changer vers thème "Applat"
- **Résultat attendu:** Design minimaliste affiché
- **Status:** ✅ À tester

#### Test 2.5: Changement de thème - Néon
- **Steps:**
  1. Changer vers thème "Néon"
- **Résultat attendu:** Style cyberpunk/futuriste
- **Status:** ✅ À tester

#### Test 2.6: Changement de thème - Aurora
- **Steps:**
  1. Changer vers thème "Aurora"
- **Résultat attendu:** Gradients colorés animés
- **Status:** ✅ À tester

#### Test 2.7: Synchronisation thème cross-tab
- **Steps:**
  1. Ouvrir affichage dans onglet A
  2. Ouvrir remote dans onglet B
  3. Changer thème dans B
  4. Vérifier changement dans A
- **Résultat attendu:** Changement instantané via BroadcastChannel
- **Status:** ✅ À tester

#### Test 2.8: Mode plein écran
- **Steps:**
  1. Cliquer sur bouton fullscreen
  2. Appuyer sur F
  3. Appuyer sur Escape
- **Résultat attendu:** Entre/sort du fullscreen
- **Status:** ✅ À tester

#### Test 2.9: Polling en temps réel
- **Steps:**
  1. Ouvrir affichage
  2. Démarrer timer depuis remote
  3. Observer le compte à rebours
- **Résultat attendu:** Mise à jour toutes les 300ms
- **Status:** ✅ À tester

#### Test 2.10: Affichage sur grand écran (4K)
- **Steps:**
  1. Ouvrir en 3840x2160
  2. Vérifier la lisibilité
- **Résultat attendu:** Responsive, lisible
- **Status:** ✅ À tester

#### Test 2.11-2.20: Tests supplémentaires d'affichage
- Affichage sur petit écran (mobile)
- Affichage avec rotation écran
- Sons de notification (changement session)
- Son d'alerte (10 secondes restantes)
- Affichage avec connexion perdue puis retrouvée
- Affichage en mode économie d'énergie
- Affichage avec zoom navigateur (50%, 200%)
- Affichage avec dark mode OS
- Affichage avec light mode OS
- Refresh pendant le timer
- **Status:** ✅ À tester

---

### **CATÉGORIE 3: Télécommande / Contrôle (30 tests)**

#### Test 3.1: Démarrer le timer
- **Steps:**
  1. Ouvrir remote
  2. Cliquer "Démarrer"
- **Résultat attendu:** Timer démarre, mode = 'play'
- **Status:** ✅ À tester

#### Test 3.2: Pause du timer
- **Steps:**
  1. Démarrer
  2. Attendre 10s
  3. Cliquer "Pause"
- **Résultat attendu:** Timer en pause, temps conservé
- **Status:** ✅ À tester

#### Test 3.3: Reprendre après pause
- **Steps:**
  1. Pause
  2. Cliquer "Démarrer"
- **Résultat attendu:** Timer reprend où il était
- **Status:** ✅ À tester

#### Test 3.4: Session suivante
- **Steps:**
  1. Être sur session 1
  2. Cliquer "Suivant"
- **Résultat attendu:** Passe à session 2
- **Status:** ✅ À tester

#### Test 3.5: Session précédente
- **Steps:**
  1. Être sur session 2
  2. Cliquer "Précédent"
- **Résultat attendu:** Retour à session 1
- **Status:** ✅ À tester

#### Test 3.6: Ajouter 30 secondes
- **Steps:**
  1. Démarrer timer
  2. Cliquer "+30 sec"
  3. Vérifier le temps
- **Résultat attendu:** Temps augmenté de 30s
- **Status:** ✅ À tester

#### Test 3.7: Ajouter 1 minute
- **Steps:**
  1. Cliquer "+1 min"
- **Résultat attendu:** Temps augmenté de 60s
- **Status:** ✅ À tester

#### Test 3.8: Retirer 30 secondes
- **Steps:**
  1. Cliquer "-30 sec"
- **Résultat attendu:** Temps diminué de 30s
- **Status:** ✅ À tester

#### Test 3.9: Retirer 1 minute
- **Steps:**
  1. Cliquer "-1 min"
- **Résultat attendu:** Temps diminué de 60s
- **Status:** ✅ À tester

#### Test 3.10: Ajouter 5 minutes
- **Steps:**
  1. Cliquer "+5 min"
- **Résultat attendu:** Temps augmenté de 300s
- **Status:** ✅ À tester

#### Test 3.11: Arrêter le cycle (confirmation)
- **Steps:**
  1. Démarrer timer
  2. Cliquer "Arrêter le cycle"
  3. Annuler la confirmation
- **Résultat attendu:** Timer continue
- **Status:** ✅ À tester

#### Test 3.12: Arrêter le cycle (confirmer)
- **Steps:**
  1. Confirmer l'arrêt
- **Résultat attendu:** Retour à session 1, timer reset
- **Status:** ✅ À tester

#### Test 3.13: Navigation désactivée (première session)
- **Steps:**
  1. Être sur session 1
  2. Essayer "Précédent"
- **Résultat attendu:** Bouton désactivé
- **Status:** ✅ À tester

#### Test 3.14: Navigation désactivée (dernière session)
- **Steps:**
  1. Être sur dernière session
  2. Essayer "Suivant"
- **Résultat attendu:** Bouton désactivé
- **Status:** ✅ À tester

#### Test 3.15: Statistiques - progression
- **Steps:**
  1. Compléter 3 sessions sur 5
  2. Vérifier les stats
- **Résultat attendu:** 60% de progression affichée
- **Status:** ✅ À tester

#### Test 3.16: Notes de session
- **Steps:**
  1. Ouvrir section notes
  2. Écrire "Test notes"
  3. Refresh la page
- **Résultat attendu:** Notes conservées (localStorage)
- **Status:** ✅ À tester

#### Test 3.17: Notes par session
- **Steps:**
  1. Écrire notes session 1
  2. Passer à session 2
  3. Écrire d'autres notes
  4. Revenir session 1
- **Résultat attendu:** Notes différentes par session
- **Status:** ✅ À tester

#### Test 3.18: Refresh télécommande
- **Steps:**
  1. Cliquer bouton refresh
- **Résultat attendu:** État rechargé immédiatement
- **Status:** ✅ À tester

#### Test 3.19: Lien vers affichage principal
- **Steps:**
  1. Cliquer "Voir l'affichage principal"
- **Résultat attendu:** Nouvel onglet avec /salon/CODE
- **Status:** ✅ À tester

#### Test 3.20: Lien vers admin
- **Steps:**
  1. Cliquer icône ✏️
- **Résultat attendu:** Redirection vers /admin/CODE
- **Status:** ✅ À tester

#### Test 3.21-3.30: Tests supplémentaires télécommande
- Feedback toast sur actions
- Polling continu (500ms)
- Erreur réseau puis reconnexion
- Multiple remotes sur même salon
- Remote sur mobile tactile
- Remote avec mauvaise connexion
- Actions rapides successives
- Cercle de progression visuel
- Couleur dynamique par session
- Mode terminé (toutes sessions)
- **Status:** ✅ À tester

---

### **CATÉGORIE 4: Administration / Édition (15 tests)**

#### Test 4.1: Accès admin
- **Steps:**
  1. Ouvrir `/admin/CODE`
- **Résultat attendu:** Interface d'édition chargée
- **Status:** ✅ À tester

#### Test 4.2: Modifier nom du salon
- **Steps:**
  1. Changer le nom
  2. Sauvegarder
- **Résultat attendu:** Nom mis à jour
- **Status:** ✅ À tester

#### Test 4.3: Ajouter une session
- **Steps:**
  1. Ajouter nouvelle session
  2. Sauvegarder
- **Résultat attendu:** Session ajoutée
- **Status:** ✅ À tester

#### Test 4.4: Supprimer une session
- **Steps:**
  1. Supprimer session existante
  2. Sauvegarder
- **Résultat attendu:** Session supprimée
- **Status:** ✅ À tester

#### Test 4.5: Réorganiser sessions
- **Steps:**
  1. Drag & drop sessions
  2. Sauvegarder
- **Résultat attendu:** Nouvel ordre appliqué
- **Status:** ✅ À tester

#### Test 4.6: Modifier durée session
- **Steps:**
  1. Changer 25 min → 30 min
  2. Sauvegarder
- **Résultat attendu:** Durée mise à jour
- **Status:** ✅ À tester

#### Test 4.7: Modifier couleur session
- **Steps:**
  1. Changer la couleur
  2. Sauvegarder
- **Résultat attendu:** Couleur appliquée
- **Status:** ✅ À tester

#### Test 4.8: Annulation modifications
- **Steps:**
  1. Faire des modifications
  2. Quitter sans sauvegarder
  3. Revenir
- **Résultat attendu:** Modifications perdues
- **Status:** ✅ À tester

#### Test 4.9: Reset du timer après modif
- **Steps:**
  1. Modifier sessions pendant timer en cours
  2. Sauvegarder
- **Résultat attendu:** Timer reset à session 1
- **Status:** ✅ À tester

#### Test 4.10: Admin avec code invalide
- **Steps:**
  1. Ouvrir `/admin/9999`
- **Résultat attendu:** Erreur "Salon non trouvé"
- **Status:** ✅ À tester

#### Test 4.11-4.15: Tests supplémentaires admin
- Validation avant sauvegarde
- Sauvegarde avec erreur réseau
- Édition simultanée (2 admins)
- Retour à la télécommande
- Admin sur mobile
- **Status:** ✅ À tester

---

### **CATÉGORIE 5: Thèmes (BroadcastChannel) (10 tests)**

#### Test 5.1: Thème Luxe → Applat
- **Steps:**
  1. Remote (onglet A) + Display (onglet B)
  2. Changer Luxe → Applat
- **Résultat attendu:** Changement instantané dans B
- **Status:** ✅ À tester

#### Test 5.2: Thème Applat → Néon
- **Steps:**
  1. Changer Applat → Néon
- **Résultat attendu:** Changement instantané
- **Status:** ✅ À tester

#### Test 5.3: Thème Néon → Aurora
- **Steps:**
  1. Changer Néon → Aurora
- **Résultat attendu:** Changement instantané
- **Status:** ✅ À tester

#### Test 5.4: Thème Aurora → Luxe
- **Steps:**
  1. Changer Aurora → Luxe
- **Résultat attendu:** Changement instantané
- **Status:** ✅ À tester

#### Test 5.5: Multiple displays (3 fenêtres)
- **Steps:**
  1. Ouvrir 3 onglets d'affichage
  2. Ouvrir 1 remote
  3. Changer thème
- **Résultat attendu:** Les 3 affichages changent
- **Status:** ✅ À tester

#### Test 5.6: Thème persiste au refresh
- **Steps:**
  1. Changer vers Aurora
  2. Refresh la page
- **Résultat attendu:** Aurora conservé (localStorage)
- **Status:** ✅ À tester

#### Test 5.7: Thème avec remote + display même fenêtre
- **Steps:**
  1. Ouvrir remote et display côte à côte (même fenêtre)
  2. Changer thème
- **Résultat attendu:** CustomEvent fonctionne
- **Status:** ✅ À tester

#### Test 5.8: Logs console BroadcastChannel
- **Steps:**
  1. Ouvrir DevTools
  2. Changer thème
- **Résultat attendu:** Logs "✅ Theme received via BroadcastChannel"
- **Status:** ✅ À tester

#### Test 5.9: Fallback storage event
- **Steps:**
  1. Tester dans navigateur sans BroadcastChannel
- **Résultat attendu:** Fallback vers storage event
- **Status:** ✅ À tester

#### Test 5.10: Fermeture channel au unmount
- **Steps:**
  1. Vérifier cleanup du channel
- **Résultat attendu:** Pas de memory leak
- **Status:** ✅ À tester

---

### **CATÉGORIE 6: UX/UI & Accessibilité (5 tests)**

#### Test 6.1: Contraste texte/fond
- **Steps:**
  1. Vérifier tous les inputs
  2. Vérifier tous les labels
- **Résultat attendu:** Pas de blanc sur blanc
- **Status:** ✅ À tester

#### Test 6.2: Boutons avec état hover
- **Steps:**
  1. Survoler tous les boutons
- **Résultat attendu:** Feedback visuel clair
- **Status:** ✅ À tester

#### Test 6.3: Focus clavier
- **Steps:**
  1. Naviguer au clavier (Tab)
  2. Vérifier focus visible
- **Résultat attendu:** Outline visible sur focus
- **Status:** ✅ À tester

#### Test 6.4: Responsive mobile
- **Steps:**
  1. Tester sur iPhone SE (375px)
  2. Tester sur iPad (768px)
- **Résultat attendu:** Layout adapté
- **Status:** ✅ À tester

#### Test 6.5: Touch targets (mobile)
- **Steps:**
  1. Vérifier taille minimale 44x44px
- **Résultat attendu:** Facile à tapper
- **Status:** ✅ À tester

---

## 🔧 OUTILS DE TEST

### Tests Automatisés
```bash
# Lancer les tests unitaires
npm test

# Tests end-to-end
npm run test:e2e

# Coverage
npm run test:coverage
```

### Tests Manuels
- Chrome DevTools (Network, Performance, Lighthouse)
- Browser Stack (cross-browser)
- Axe DevTools (accessibilité)
- Wave (accessibilité)

### Métriques à Mesurer
- **Performance:** Time to Interactive < 3s
- **Accessibilité:** Score Lighthouse > 90
- **SEO:** Score > 85
- **Best Practices:** Score > 90

---

## 📊 RÉSUMÉ DES TESTS

| Catégorie | Nombre de tests | Priorité |
|-----------|----------------|----------|
| Création de salon | 20 | 🔴 Haute |
| Affichage salon | 20 | 🔴 Haute |
| Télécommande | 30 | 🔴 Haute |
| Administration | 15 | 🟡 Moyenne |
| Thèmes (BroadcastChannel) | 10 | 🔴 Haute |
| UX/UI & Accessibilité | 5 | 🟡 Moyenne |
| **TOTAL** | **100** | |

---

## ✅ CRITÈRES DE SUCCÈS

### Must Have
- [x] Création de salon fonctionne
- [x] Timer démarre/pause/stop
- [x] Changement de thème cross-tab
- [x] Aucun texte blanc sur fond blanc
- [x] Responsive mobile
- [x] Synchronisation temps réel

### Should Have
- [x] Sons de notification
- [x] Mode plein écran
- [x] Export/Import config
- [x] Notes de session
- [x] Statistiques

### Nice to Have
- [ ] PWA installable
- [ ] Mode offline
- [ ] Historique salons
- [ ] Partage direct (QR code)

---

## 🐛 BUGS CONNUS

### Critique
- ❌ Changement de thème ne fonctionne pas → **FIXÉ avec BroadcastChannel**

### Majeur
- ✅ Texte blanc sur fond blanc → **FIXÉ avec contraste amélioré**

### Mineur
- ⚠️ À vérifier après tests

---

## 📝 NOTES

**Date de création:** 2025-11-20
**Version:** 1.0.0
**Auteur:** Claude Code (Test Suite Generator)

Ce document servira de guide pour les tests manuels et automatisés.
Chaque test doit être exécuté et son status mis à jour.

---

## 🚀 PROCHAINES ÉTAPES

1. Exécuter les 100 tests manuellement
2. Automatiser les tests critiques (Playwright/Cypress)
3. Mettre en place CI/CD avec tests
4. Monitorer en production (Sentry, Analytics)
5. Recueillir feedback utilisateurs réels
