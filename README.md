# Multibrand Token Exporter

**Multibrand Token Exporter** est un plugin Figma conçu pour automatiser l'extraction des Design Tokens. Il fait le pont entre vos **Primitives** (valeurs brutes) et vos **Tokens Sémantiques**, en gérant intelligemment les thèmes multi-marques (Light/Dark mode) grâce à une interface de mapping visuelle.

![TypeScript](https://img.shields.io/badge/Made%20with-TypeScript-blue) ![Figma](https://img.shields.io/badge/Platform-Figma-black)

## Fonctionnalités

* **Mapping Intelligent** : Détecte automatiquement les liens entre vos collections de Primitives et vos Tokens Sémantiques.
* **Multi-Marques** : Gérez plusieurs marques (ex: Legacy, NewBrand) avec leurs propres modes Light et Dark.
* **Interface Visuelle** : UI moderne pour configurer le mapping "Source → Cible" avant l'export.
* **JSON Structuré** : Génère un fichier JSON propre, imbriqué (Nested), prêt pour l'intégration (compatible Style Dictionary).
* **Gestion de la Transparence** : Les couleurs avec transparence incluent automatiquement le canal alpha dans leur valeur hexadécimale (format RGBA).
* **Tri Alphabétique** : Les tokens et sous-catégories sont automatiquement triés alphabétiquement dans le JSON final.
* **Métadonnées d'Export** : Chaque export inclut un timestamp et des informations sur la version pour traçabilité.
* **Filtrage Intelligent** : Ignore automatiquement les variables privées (commençant par `_`, `#`).

---

## Installation & Développement

Ce projet utilise **TypeScript** et **esbuild** pour une compilation ultra-rapide et un code modulaire.

### Prérequis

* Node.js (v16 ou supérieur)
* NPM
* L'application Figma Desktop

### 1. Installation des dépendances

À la racine du projet, lancez :

```bash
npm install
```

---

### 2. Compilation (Build)
Pour construire le fichier final `dist/code.js` utilisé par Figma :

```bash
npm run build
```

Pour lancer le mode "Watch" (recompilation automatique à chaque sauvegarde pendant le dev) :

```bash
npm run watch
```

---

### 3. Installation dans Figma
1. Ouvrez **Figma**.
1. Allez dans **Menu > Plugins > Development > Import plugin from manifest...**
1. Sélectionnez le fichier `manifest.json` situé à la racine de ce projet.
---
## Architecture du Projet
Le code est séparé en plusieurs modules pour faciliter la maintenance et l'évolution.

```plaintext
MultibrandTokenExporter/
├── dist/             # Fichier compilé (généré automatiquement)
├── src/
│   ├── code.ts       # Contrôleur principal (Communication Figma <-> UI)
│   ├── ui.html       # Interface Utilisateur (HTML/CSS/JS)
│   └── core/         # Cœur logique (Indépendant de l'API Figma UI)
│       ├── export.ts   # Construction de l'arbre JSON récursif
│       ├── resolve.ts  # Résolution des Alias et Modes (Light/Dark)
│       └── utils.ts    # Helpers (Conversion Hex avec transparence, Nettoyage noms)
├── manifest.json     # Configuration du plugin Figma
├── package.json      # Scripts et dépendances
└── tsconfig.json     # Configuration TypeScript
```

---

## Utilisation
1. Ouvrez votre fichier **Design System** dans Figma (celui contenant vos variables).

1. Lancez le plugin : **Plugins > Development > Multibrand Token Exporter**.

1. **Mapping Global** :

    - Sélectionnez votre collection Source (ex: `_Primitives`).

    - Sélectionnez votre collection Cible (ex: `01. Modes` / Sémantique).

1. **Configuration des Marques** :

    - Le plugin pré-remplit les marques en lisant les colonnes (Modes) de vos Primitives.

    - Vérifiez que chaque colonne (Light/Dark) pointe vers la bonne Primitive.

1. Cliquez sur **Exporter le JSON**.

---

## Structure du JSON exporté
Le fichier généré inclut des métadonnées d'export et suit une structure hiérarchique basée sur les noms de vos variables (ex: `Colors/Border/Primary`). Les tokens et groupes sont automatiquement triés alphabétiquement.

```json
{
  "metadata": {
    "exportedAt": "2026-01-28T14:32:45.123Z",
    "timestamp": 1737814365123,
    "version": "1.0.0",
    "generator": "Multibrand Token Exporter"
  },
  "tokens": [
    {
      "name": "Colors",
      "type": "group",
      "children": [
        {
          "name": "Border",
          "type": "group",
          "children": [
            {
              "name": "primary",
              "type": "token",
              "path": "Colors/Border/Primary",
              "modes": {
                "Legacy": {
                  "light": {
                    "hex": "#E5E5E5",
                    "primitiveName": "UI/Color/Neutral/200"
                  },
                  "dark": {
                    "hex": "#333333",
                    "primitiveName": "UI/Color/Neutral/800"
                  }
                },
                "NewBrand": {
                  "light": {
                    "hex": "#7B61FF80",
                    "primitiveName": "UI/Color/Brand/200"
                  },
                  "dark": {
                    "hex": "#4801A0",
                    "primitiveName": "UI/Color/Brand/700"
                  }
                }
              }
            }
          ]
        }
      ]
    }
  ]
}
```

## Règles de Nommage
Pour que le plugin fonctionne de manière optimale :
- **Primitives** : Doivent contenir les valeurs Hex brutes (avec transparence si applicable).
- **Transparence** : Les couleurs avec transparence < 100% incluent automatiquement le canal alpha (ex: `#FF000080` pour 50% d'opacité).
- **Tokens Sémantiques** : Doivent être des Alias pointant vers les Primitives.
- **Exclusions** : Les variables commençant par `_` ou `#` sont automatiquement exclues de l'export.
- **Noms Numériques** : Un token nommé `Gray/50` sera transformé en `gray-50` pour éviter les clés purement numériques.
- **Organisation** : Les tokens et groupes sont triés alphabétiquement dans l'export final, avec les groupes placés avant les tokens individuels.

---
**Développé avec ❤️ pour faciliter l'export de Design Tokens multi-marques.**