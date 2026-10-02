# EU Energy Map — Tableau de Bord Pédagogique de l'Électricité Européenne

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-emerald.svg)](https://developer.mozilla.org/fr/docs/Web/Progressive_web_apps)
[![Data](https://img.shields.io/badge/Data-Electricity_Maps-amber.svg)](https://app.electricitymaps.com)

**EU Energy Map** est une application web progressive (PWA) pédagogique, factuelle et sobre permettant d'explorer en temps réel la situation électrique des **27 États membres de l'Union européenne**.

L'application ne cherche pas à reproduire l'interface commerciale d'Electricity Maps, mais à offrir un outil didactique pour comprendre :
- Comment l'électricité européenne est produite (nucléaire, hydraulique, éolien, solaire, gaz, charbon, biomasse, etc.) ;
- L'intensité carbone associée (en `gCO₂eq/kWh`) ;
- La distinction fondamentale entre énergie renouvelable et énergie bas-carbone (fossil-free) ;
- La demande totale (charge réseau en GW) et la charge résiduelle (net load) ;
- Les échanges et flux transfrontaliers entre pays interconnectés (réseau synchrone ENTSO-E) ;
- L'évolution de ces grandeurs sur 24 heures glissantes.

---

## 1. Principes Absolus & Règle d'Or des Données

1. **Aucune donnée inventée** : Si une information n'est pas transmise par l'API, elle est affichée comme `Donnée indisponible` ou `—`. Elle n'est **JAMAIS** convertie artificiellement en `0`.
2. **Distinction entre zéro et valeur absente** : `0 MW` indique une mesure réelle d'absence de production (ex: solaire de nuit) ; `null` indique une indisponibilité de mesure.
3. **Traçabilité des estimations** : Tout chiffre issu d'un modèle d'apprentissage ou d'une estimation porte le badge distinctif `<DataQualityBadge status="estimated" />`.
4. **Pas de clé API dans le frontend** : La clé secrète Electricity Maps n'est jamais injectée dans le code client. Toutes les requêtes transitent par un proxy serveur Express sécurisé.
5. **Neutralité factuelle** : L'outil ne propose aucun classement "meilleur/pire", aucun "gagnant/perdant" ni score global arbitraire.

---

## 2. Les 27 Pays Membres Couverts

| Code | Pays | Zone Electricity Maps |
|---|---|---|
| `AT` | Autriche | `AT` |
| `BE` | Belgique | `BE` |
| `BG` | Bulgarie | `BG` |
| `HR` | Croatie | `HR` |
| `CY` | Chypre | `CY` (réseau insulaire autonome) |
| `CZ` | Tchéquie | `CZ` |
| `DK` | Danemark | `DK` (`DK-DK1`, `DK-DK2`) |
| `EE` | Estonie | `EE` |
| `FI` | Finlande | `FI` |
| `FR` | France | `FR` |
| `DE` | Allemagne | `DE` |
| `GR` | Grèce | `GR` |
| `HU` | Hongrie | `HU` |
| `IE` | Irlande | `IE` |
| `IT` | Italie | `IT` (sous-zones de marché agrégées) |
| `LV` | Lettonie | `LV` |
| `LT` | Lituanie | `LT` |
| `LU` | Luxembourg | `LU` |
| `MT` | Malte | `MT` |
| `NL` | Pays-Bas | `NL` |
| `PL` | Pologne | `PL` |
| `PT` | Portugal | `PT` |
| `RO` | Roumanie | `RO` |
| `SK` | Slovaquie | `SK` |
| `SI` | Slovénie | `SI` |
| `ES` | Espagne | `ES` |
| `SE` | Suède | `SE` (`SE1` à `SE4` agrégées) |

---

## 3. Architecture Technique

```text
src/
├── components/
│   ├── common/             # Navbar, Footer, Badges de qualité, Bouton PWA, Offline
│   ├── europe/             # Carte interactive SVG, Cartes de synthèse, Tableau accessible
│   ├── countries/          # Fiche détaillée pays, mix en barres, "Pourquoi ce chiffre ?"
│   ├── compare/            # Comparateur multi-pays factuel (2 à 4 pays)
│   ├── carbon/             # Focus intensité carbone, ACV vs direct, historique 24h
│   ├── renewables/         # Focus filières renouvelables (éolien, solaire, hydro, etc.)
│   └── flows/              # Visualisation des échanges et flux transfrontaliers
├── data/
│   ├── euCountries.ts      # Définition des 27 pays et coordonnées cartographiques
│   ├── electricityZones.ts # Mapping officiel des zones de cotation
│   ├── sourcesMeta.ts      # Métadonnées et couleurs des sources énergétiques
│   └── referenceData.ts    # Relevés factuels certifiés pour secours / mode déconnecté
├── services/
│   └── electricityMaps/    # Normalizers stricts, client HTTP avec déduplication, cache
├── types/
│   └── energy.ts           # Types TypeScript garantissant l'intégrité
├── hooks/
│   ├── usePWAInstall.ts    # Hook d'installation PWA native
│   └── useOnlineStatus.ts  # Détection de la connectivité réseau
├── server.ts               # Proxy Express sécurisé, injection de token, cache serveur
└── App.tsx                 # Routage réactif par URL hash et état centralisé
```

---

## 4. Endpoints Utilisés (Electricity Maps API V4)

Le backend Express interroge désormais **100 % de l'API en V4** avec une cascade de résilience :

- `GET /v4/electricity-mix/latest?zone=XX` : Mix de production (`normal`), mix de consommation *flow-traced*, stockage, imports et exports (avec repli automatique sur `/v4/power-breakdown/latest` puis `/v3/power-breakdown/latest` si le plan de clé ne supporte pas encore le signal).
- `GET /v4/electricity-flows/latest?zone=XX` : Flux physiques et interconnexions transfrontalières.
- `GET /v4/carbon-intensity/latest?zone=XX` : Intensité carbone instantanée en cycle de vie (`gCO₂eq/kWh`).
- `GET /v4/carbon-intensity/history?zone=XX&temporalResolution=15_minutes` : Relevés glissants sur 24 heures avec support des granularités V4 (`15_minutes` par défaut — 96 points, `5_minutes` — 288 points, et `hourly` — 24 points).
- `GET /v4/carbon-intensity-fossil-only/latest?zone=XX` : Intensité carbone des seules filières thermiques fossiles.
- `GET /v4/carbon-intensity-level/latest?zone=XX` : Palier qualitatif d'intensité carbone officiel calculé par rapport à l'historique récent de la zone.
- `GET /v4/carbon-free-percentage-level/latest?zone=XX` : Palier qualitatif d'énergie décarbonée officiel.
- `GET /v4/renewable-percentage-level/latest?zone=XX` : Palier qualitatif d'énergie renouvelable officiel.
- `GET /v4/total-reported-load/latest?zone=XX` : Charge totale déclarée par les gestionnaires de réseau (TSO / RTE / ENTSO-E).
- `GET /v4/net-load/latest?zone=XX` : Charge résiduelle nette officielle intégrant stockage et échanges.

---

## 5. Installation & Configuration

### Prérequis
- Node.js 20+
- npm ou yarn

### 1. Cloner et installer les dépendances
```bash
npm install
```

### 2. Configuration des variables d'environnement
Créez un fichier `.env` à la racine (ou configurez vos variables serveur) :
```bash
# Token d'authentification pour l'API Electricity Maps (v3/v4)
# Utilisé côté serveur uniquement — ne jamais préfixer par VITE_
ELECTRICITY_MAPS_API_KEY="votre_cle_api_secrete"
```

> **Note de résilience :** Si aucune clé API n'est renseignée ou si le quota est dépassé (HTTP 429), le serveur bascule automatiquement sur un instantané de référence factuel certifié et l'affiche loyalement avec le badge "Réf. Factuelle".

### 3. Lancer en développement
```bash
npm run dev
```
L'application démarre sur `http://localhost:3000`.

### 4. Lancer les tests unitaires
```bash
npm run test
```

### 5. Compiler pour la production
```bash
npm run build
npm start
```

---

## 6. Progressive Web App (PWA) & Mode Hors-Ligne

- **Installabilité** : Bouton d'installation intégré dans l'en-tête (Desktop Chrome/Edge, Android, et guide dédié pour iOS Safari).
- **Service Worker** : Précaching des assets statiques via `vite-plugin-pwa` et stratégie `NetworkFirst` pour les requêtes de données.
- **Consultation hors-ligne** : En l'absence de réseau, un bandeau discret avertit l'utilisateur et affiche la dernière synchronisation connue stockée en cache local (`localStorage`).

---

## 7. Attribution & Droits

Données électriques fournies par **[Electricity Maps](https://app.electricitymaps.com)** et issues des gestionnaires de réseaux de transport européens (ENTSO-E).
Application développée à des fins pédagogiques et factuelles.
