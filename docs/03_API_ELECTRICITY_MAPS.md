# 03 — Spécification API Electricity Maps

## 1. Vue d'Ensemble & Authentification

- **Base URL V4** : `https://api.electricitymaps.com/v4`
- **Base URL V3** : `https://api.electricitymap.org/v3` (ou `https://api.electricitymaps.com/v3`)
- **En-tête d'authentification** :
  ```http
  auth-token: <VOTRE_CLE_API_SECRETE>
  ```
- **Règle absolue de sécurité** : L'en-tête `auth-token` n'est JAMAIS émis depuis le navigateur de l'utilisateur. Toutes les requêtes transitent par le serveur proxy `/api/electricity-maps/*` qui y adjoint la clé d'environnement serveur.

---

## 2. Table des Endpoints Requis & Disponibilité Réelle

| Fonctionnalité | Version | Endpoint | Paramètres | Disponibilité API | Champs de Données Clés |
|---|---|---|---|---|---|
| **Intensité Carbone Instantanée** | V4 & V3 | `/v4/carbon-intensity/latest` ou `/v3/carbon-intensity/latest` | `zone` (ex: `FR`), `emissionFactorType` (ex: `lifecycle`) | Disponible (standard) | `zone`, `carbonIntensity`, `datetime`, `isEstimated`, `estimationMethod` |
| **Historique Carbone (24h)** | V4 & V3 | `/v4/carbon-intensity/history` ou `/v3/carbon-intensity/history` | `zone` (ex: `FR`) | Disponible (standard) | `zone`, `history` [ { `carbonIntensity`, `datetime`, `isEstimated` } ] |
| **Mix Électrique & Sources** | V4 | `/v4/electricity-mix/latest` | `zone`, `flowTraced` (`true`/`false`), `breakdownType` | V4 Standard | `nuclear`, `hydro`, `wind`, `solar`, `gas`, `coal`, `oil`, `biomass`, `geothermal` |
| **Décomposition Électrique (Power Breakdown)** | V3 | `/v3/power-breakdown/latest` | `zone` | V3 Standard | `powerProductionBreakdown`, `powerProductionTotal`, `powerConsumptionBreakdown`, `powerConsumptionTotal`, `fossilFreePercentage`, `renewablePercentage` |
| **Échanges & Flux Transfrontaliers** | V3/V4 | Fourni dans `power-breakdown/latest` (`powerImportBreakdown`, `powerExportBreakdown`) | `zone` | Standard | Dictionnaires `{ [zoneCode]: MW }` des imports et exports |
| **Charge Totale (Total Load)** | V3/V4 | Fourni via `powerConsumptionTotal` dans breakdown | `zone` | Standard | Puissance totale consommée en MW |
| **Charge Nette (Net Load)** | Calculé | Dérivé : `Total Load - (Solaire + Éolien)` | Client/Proxy | Standard | Grandeur calculée avec mention explicite |
| **Liste des Zones Officielles** | V3/V4 | `/v3/zones` | Aucun | Public (sans auth) | Catalogue JSON des zones avec dénominations |
| **Historique Étendu (> 24h)** | V4 | `/v4/carbon-intensity/past-range` | `zone`, `start`, `end` | Réservé Plans Payants | Non accessible sur plan gratuit standard |
| **Prix Day-Ahead** | V4 | `/v4/price/latest` | `zone` | Réservé Plans Payants | Hors périmètre V0.1 |

---

## 3. Formats de Réponse Officiels

### 3.1 `/carbon-intensity/latest` (V4 / V3)
```json
{
  "zone": "FR",
  "carbonIntensity": 42,
  "datetime": "2024-03-24T12:00:00.000Z",
  "updatedAt": "2024-03-24T12:15:00.000Z",
  "createdAt": "2024-03-24T12:10:00.000Z",
  "emissionFactorType": "lifecycle",
  "isEstimated": false,
  "estimationMethod": null
}
```

### 3.2 `/power-breakdown/latest` (V3)
```json
{
  "zone": "FR",
  "datetime": "2024-03-24T12:00:00.000Z",
  "updatedAt": "2024-03-24T12:15:00.000Z",
  "createdAt": "2024-03-24T12:10:00.000Z",
  "powerProductionBreakdown": {
    "nuclear": 41200,
    "geothermal": 0,
    "biomass": 1100,
    "coal": 0,
    "wind": 6500,
    "solar": 4200,
    "hydro": 5400,
    "gas": 1200,
    "oil": 100,
    "unknown": 0
  },
  "powerProductionTotal": 59700,
  "powerConsumptionBreakdown": {
    "nuclear": 35000,
    "geothermal": 0,
    "biomass": 1000,
    "coal": 0,
    "wind": 5800,
    "solar": 3900,
    "hydro": 4800,
    "gas": 1100,
    "oil": 90,
    "unknown": 0
  },
  "powerConsumptionTotal": 51690,
  "powerImportBreakdown": {
    "DE": 200
  },
  "powerImportTotal": 200,
  "powerExportBreakdown": {
    "GB": 2000,
    "ES": 1500,
    "BE": 1200,
    "IT": 1010
  },
  "powerExportTotal": 5710,
  "fossilFreePercentage": 94,
  "renewablePercentage": 29,
  "isEstimated": false,
  "estimationMethod": null
}
```

---

## 4. Codes d'Erreurs & Stratégie de Résilience

- **401 Unauthorized / 403 Forbidden** : Clé API absente ou invalide. Le proxy répond avec code explicite et fournit le mode démonstration certifié avec badge clair.
- **404 Not Found** : Zone non supportée ou sans données actives. L'application affiche "Zone non couverte ou donnée indisponible".
- **429 Too Many Requests** : Dépassement de quota. Le proxy renvoie les dernières données en cache ou active le mode résilient sans bloquer l'interface.
- **500 / 503 Server Error** : Panne amont d'Electricity Maps. Gestion par fallback gracieux avec notification discrète à l'utilisateur.
