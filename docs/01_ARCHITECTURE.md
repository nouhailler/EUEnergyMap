# 01 — Architecture Technique — EU Energy Map

## 1. État Actuel du Répertoire (Audit Initial)

- **Framework frontend** : React 19.0.1 avec Vite 8.3.0
- **Langage** : TypeScript 7.0.2 (options `strict`, target `ES2022`, resolution `bundler`)
- **Style CSS** : Tailwind CSS v4 via `@tailwindcss/vite`
- **Serveur backend** : Express 4.21.2 avec `tsx` pour l'exécution directe en TypeScript
- **Animations / Icônes** : `lucide-react` 0.546.0, `motion` 12.23.24
- **Outil de test** : `vitest`
- **PWA** : `vite-plugin-pwa` configuré avec service worker, manifest web et fallback hors ligne
- **Système de navigation** : Routage côté client réactif et léger par état d'URL (`history.pushState` / hash / URL search params synchronisés), sans surcoût de bundle, supportant :
  - `/` : Dashboard Europe temps réel avec carte SVG interactive
  - `/country/:code` : Vue détaillée par pays
  - `/compare` : Comparaison factuelle multi-pays (2 à 4 pays)
  - `/carbon` : Focus intensité carbone et mix bas-carbone
  - `/renewables` : Focus énergies renouvelables par source
  - `/flows` : Carte et tableau des interconnexions et flux transfrontaliers

---

## 2. Architecture Proposée (V0.1)

L'application adopte une architecture full-stack sobre et sécurisée :

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Navigateur Client (PWA)                         │
│                                                                        │
│  [ Header / Nav ] [ Mode Offline Indicator ] [ Install PWA Button ]    │
│  ──────────────────────────────────────────────────────────────────    │
│  [ Vues : Dashboard Carte | Pays | Comparaison | Carbone | Flux ]      │
│  ──────────────────────────────────────────────────────────────────    │
│  Hooks React (useEnergyData, useCountryDetail, useFlows, useCompare)   │
│  ──────────────────────────────────────────────────────────────────    │
│  Client Cache & Normalizers (CountryElectricitySnapshot, Net flows)   │
│  ──────────────────────────────────────────────────────────────────    │
│  Service Worker (Workbox - CacheFirst pour assets, NetworkFirst API)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Requêtes HTTP (/api/electricity-maps/*)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Backend Express Sécurisé (server.ts)                 │
│                                                                        │
│  - Middleware Vite en développement (port 3000)                        │
│  - Endpoint Proxy : /api/electricity-maps/:endpoint                    │
│  - Injection sécurisée du token (EMAPS_API_KEY ou ELECTRICITY_MAPS_KEY)│
│  - Cache mémoire serveur (TTL 5 minutes) pour épargner le quota API    │
│  - Fallback sur données réelles de secours vérifiées si quota épuisé    │
│    ou clé non configurée (avec badge explicite "Mode Référence / Démo")│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Requêtes HTTPS avec en-tête `auth-token`
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       Electricity Maps API (v4 / v3)                   │
│                                                                        │
│  - /v4/electricity-mix/latest                                          │
│  - /v4/carbon-intensity/latest                                         │
│  - /v3/power-breakdown/latest                                          │
│  - /v3/zones                                                           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Flux de Données

1. **Initialisation** : Au chargement, le client demande les instantanés énergétiques des 27 pays de l'Union européenne via `/api/electricity-maps/eu-summary`.
2. **Proxy & Mise en cache** :
   - Le serveur Express vérifie son cache en mémoire. Si les données ont moins de 5 minutes, il les renvoie immédiatement.
   - Si les données ont expiré ou sont absentes, le serveur interroge Electricity Maps en utilisant l'en-tête `auth-token`.
   - Si l'API renvoie une erreur de quota (HTTP 429), d'authentification (HTTP 401/403) ou si aucune clé n'est fournie, le serveur bascule gracieusement sur un instantané de référence factuel certifié et documenté, tout en marquant explicitement le statut.
3. **Normalisation Client** :
   - Les réponses brutes sont transformées en snapshots typés : `CountryElectricitySnapshot`.
   - Les valeurs `null` restent `null` (aucun zéro trompeur).
   - Les indicateurs `isEstimated` et `estimationMethod` sont préservés fidèlement.
4. **Diffusion UI** : Les composants React consomment les données normalisées via un Context ou des hooks React avec revalidation automatique (polling respectueux à intervalle configurable, ex: 15 minutes).

---

## 4. Dépendances Choisies

- `react` (v19) & `react-dom` : Moteur de rendu UI.
- `express` & `tsx` : Serveur proxy backend et runtime TypeScript.
- `vite-plugin-pwa` : Génération du service worker et intégration PWA conforme.
- `lucide-react` : Iconographie sobre et accessible (sans décorations superflues).
- `vitest` : Exécution rapide des tests unitaires et d'intégration.
- Carte SVG interactive personnalisée (zéro kilo-octet de librairie cartographique lourde comme Mapbox/Leaflet), optimisée pour le continent européen et les 27 pays de l'UE.

---

## 5. Décisions Techniques et Anti-Slop

1. **Pas de clé d'API dans le bundle client** : Interdiction formelle de variables `VITE_*` pour les clés d'API. Le backend Express détient la clé côté serveur.
2. **Intégrité stricte des données** :
   - Différenciation absolue entre `0` (valeur nulle mesurée) et `null` (donnée indisponible).
   - Différenciation absolue entre Part Renouvelable (éolien, solaire, hydro, géothermie, biomasse) et Part Bas-Carbone (renouvelable + nucléaire).
   - Respect des unités systématiques : `gCO₂eq/kWh`, `MW`, `GW`.
3. **PWA et Résilience Réseau** :
   - Cache des assets applicatifs.
   - Préservation locale des dernières données valides connues avec horodatage lisible.
   - Bannière non intrusive "Mode Hors Ligne".

---

## 6. Risques & Limites

- **Quotas de l'API gratuite** : Electricity Maps impose des limites de requêtes strictes. La couche de cache serveur (5 à 15 minutes) et le regroupement des requêtes protègent l'application contre les dépassements de quota.
- **Subdivisions nationales** : Certains pays de l'UE (Danemark DK-DK1/DK-DK2, Italie IT-NO/IT-CS/..., Suède SE1/SE2/SE3/SE4) sont découpés en plusieurs zones de bidding. L'application fournit pour chaque pays soit la zone représentative par défaut, soit l'agrégation documentée.
