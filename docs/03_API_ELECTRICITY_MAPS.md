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
| **Intensité Carbone Instantanée** | V4 & V3 | `/v4/carbon-intensity/latest` | `zone` (ex: `FR`) | Disponible (standard) | `zone`, `carbonIntensity`, `datetime`, `isEstimated`, `estimationMethod` |
| **Historique Carbone (24h)** | V4 & V3 | `/v4/carbon-intensity/history` | `zone`, `temporalResolution` (`15_minutes`, `5_minutes`, `hourly`) | Disponible (standard) | `zone`, `granularity`, `history` [ { `carbonIntensity`, `fossilOnlyCarbonIntensity`, `datetime` } ] |
| **Timeline 24h Complète (10 signaux)** | V4 Proxy | `/api/electricity-maps/timeline` | `zone`, `granularity` (`15_minutes` défaut) | Intégration complète | `points` : carbone, renouvelable, bas-carbone, load, net load, solaire, éolien, nucléaire, flux |
| **Mix Électrique & Sources** | V4 | `/v4/electricity-mix/latest` | `zone` | V4 Prioritaire | `mix` (`normal`, `flow-traced`, `storage`, `imports`, `exports`) |
| **Historique du Mix Électrique (24h)** | V4 | `/v4/electricity-mix/history` | `zone`, `temporalResolution` (`15_minutes`, `5_minutes`, `hourly`) | V4 Prioritaire & Dédié | `history` [ { `datetime`, `mix`: { `production`: { `nuclear`, `wind`, `solar`, `hydro`, `gas`, `coal`, `biomass`... } } } ] |
| **Flux Physiques Transfrontaliers** | V4 | `/v4/electricity-flows/latest` | `zone` | V4 Dédié | `imports`, `exports`, `importTotal`, `exportTotal`, `netExport` |
| **Charge Réseau (Total Reported Load)** | V4 | `/v4/total-reported-load/latest` | `zone` | V4 Officiel | `value`, `totalReportedLoad` (donnée GRT) |
| **Charge Nette (Net Load)** | V4 | `/v4/net-load/latest` | `zone` | V4 Officiel | `value`, `netLoad` officiel |
| **Intensité Hors Renouvelable (Fossil-Only)** | V4 | `/v4/carbon-intensity-fossil-only/latest` | `zone` | V4 Officiel | `carbonIntensity` (empreinte thermique pure) |
| **Niveaux Relatifs Qualitatifs** | V4 | `/v4/carbon-intensity-level/latest`, `/v4/carbon-free-percentage-level/latest`, `/v4/renewable-percentage-level/latest` | `zone` | V4 Officiel | `level` (`very-low`, `low`, `medium`, `high`, `very-high`) |

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

## 4. Page « Journée électrique » (Timeline 24h & 10 Signaux Physiques V4)

L'application expose une vue temporelle continue modélisant l'intégralité des dimensions électriques sur 24 heures glissantes avec granularités V4 (`15_minutes` par défaut, `5_minutes` et `hourly`) :

1. **Intensité carbone** (`carbonIntensity` - gCO₂eq/kWh) : empreinte ACV directe et indirecte du mix consommé.
2. **Renouvelable** (`renewablePercentage` - %) : part combinée du solaire, de l'éolien, de l'hydraulique et de la biomasse.
3. **Bas-carbone** (`fossilFreePercentage` - %) : électricité décarbonée sans émissions directes (renouvelable + nucléaire).
4. **Total Load** (`totalLoad` - MW) : consommation brute totale appelée par le réseau.
5. **Reported Load** (`totalReportedLoad` - MW) : charge officiellement télémesurée et déclarée par le gestionnaire de réseau (TSO / RTE / TenneT / Amprion).
6. **Net Load** (`netLoad` - MW) : charge nette résiduelle (Total Load - Solaire - Éolien), visualisant la fameuse « Courbe du canard » (Duck Curve).
7. **Solaire** (`solar` - MW) : profil en cloche diurne de l'énergie photovoltaïque.
8. **Éolien** (`wind` - MW) : production éolienne terrestre et en mer.
9. **Nucléaire** (`nuclear` - MW) : production continue du ruban de base (baseload).
10. **Flux** (`netExport` - MW) : solde physique net des échanges transfrontaliers (+ exportateur, - importateur).

---

## 5. Codes d'Erreurs & Stratégie de Résilience

- **401 Unauthorized / 403 Forbidden** : Clé API absente ou invalide. Le proxy répond avec code explicite et fournit le mode démonstration certifié avec badge clair.
- **404 Not Found** : Zone non supportée ou sans données actives. L'application affiche "Zone non couverte ou donnée indisponible".
- **429 Too Many Requests** : Dépassement de quota. Le proxy renvoie les dernières données en cache ou active le mode résilient sans bloquer l'interface.
- **500 / 503 Server Error** : Panne amont d'Electricity Maps. Gestion par fallback gracieux avec notification discrète à l'utilisateur.
