# Illustrations de la landing page

Déposer les fichiers dans ce dossier, **avec exactement ces noms**. La page
les détecte toute seule : tant qu'un fichier est absent, la carte affiche son
pictogramme et rien n'est cassé.

| Fichier | Illustration attendue |
|---|---|
| `sync-ecrans.png` | Écran de salle + ordinateur portable + téléphone, même horloge |
| `telecommande.png` | Main qui appuie sur un téléphone, ondes vers l'écran |
| `deroule-frise.png` | Trois personnages devant une frise de séquences |
| `ajout-temps.png` | Doigt sur un bouton « + » qui allonge une barre |
| `public-horloge.png` | Public assis face au grand écran avec l'horloge |
| `sans-papier.png` | Ordre du jour à la corbeille, QR code sur le téléphone |

## Format

- **PNG** (ou JPG/WebP en changeant l'extension dans `LandingPage.jsx`)
- Ratio proche de **10:7** (les fichiers fournis sont en ~1500×1050, parfait)
- Fond blanc : les cartes sont blanches, le trait noir et jaune s'y pose seul
- Poids conseillé : **moins de 200 Ko** par image. Au-delà, compresser —
  ces illustrations au trait se compressent très bien.

Les textes alternatifs sont déjà rédigés dans `src/pages/LandingPage.jsx`
(champ `alt` de chaque entrée de `FEATURES`) : inutile d'y toucher.

## Deux images encore sans emplacement

Les illustrations « atelier autour de la table » et « journée avec pauses »
n'ont pas encore de place attribuée. Dis-moi où tu les veux (hero, section
cas d'usage, bandeau publics) et je les câble.
