# Illustrations de la landing page

Chaque illustration existe en **deux formats** :

- `.webp` — servi en priorité (≈ 30 Ko pièce)
- `.png` — repli pour les navigateurs sans WebP (≈ 120 Ko pièce)

Les sources déposées faisaient 1490 px de large pour ~1 Mo chacune, soit
9,7 Mo au total. Elles ont été redimensionnées à 900 px (les cartes font
~400 px, 900 couvre le 2x rétine) et recompressées : **326 Ko en WebP**.

## Correspondance

| Fichier (sans extension) | Emplacement |
|---|---|
| `t-synchro-a-la-seconde` | Carte « Synchro à la seconde » |
| `t-telecommande-dans-la-poche` | Carte « Télécommande dans la poche » |
| `t-deroule-complet` | Carte « Déroulé complet » |
| `t-ajustable-en-direct` | Carte « Ajustable en direct » |
| `t-lisible-du-fond-de-la-salle` | Carte « Lisible du fond de la salle » |
| `t-sans-compte-sans-trace` | Carte « Sans compte, sans trace » |
| `t-atelier-de-co-construction` | Cas d'usage « Atelier de co-construction » |
| `t-formation-montee-en-competences` | Cas d'usage « Formation » |
| `t-rituels-agiles` | Cas d'usage « Rituels agiles » |
| `t-pitchs-soutenances-jurys` | Cas d'usage « Pitchs & soutenances » |

## Pour remplacer ou ajouter une illustration

1. Déposer le PNG source ici sous le nom voulu
2. Régénérer les deux formats :

```bash
node -e "
const sharp=require('sharp'), fs=require('fs');
const f='mon-image.png';
sharp(f).resize({width:900,withoutEnlargement:true}).webp({quality:86,effort:6}).toFile(f.replace('.png','.webp'));
sharp(f).resize({width:900,withoutEnlargement:true}).png({palette:true,quality:82,effort:10}).toFile(f+'.tmp');
"
```

3. Déclarer le nom de base (sans extension) dans `src/pages/LandingPage.jsx`,
   champ `illu`, et rédiger son `alt`.

Si un fichier manque, la carte retombe sur son pictogramme : jamais d'image
cassée.
