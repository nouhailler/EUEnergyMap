# 02 — Modèle de Données — EU Energy Map

## 1. Principes Fondamentaux de Modélisation

1. **Aucune invention de données** : Si un champ est absent ou nul dans la réponse d'Electricity Maps, il reste `null` ou `undefined`. Il n'est JAMAIS converti artificiellement en `0`.
2. **Distinction entre zéro et donnée absente** :
   - `0 MW` ou `0 gCO₂eq/kWh` signifie qu'une mesure ou estimation a effectivement conclu à une valeur nulle (ex: production solaire à minuit = 0 MW).
   - `null` signifie qu'aucune mesure n'est disponible ou que la zone ne reporte pas cette grandeur. L'affichage prescrit est "—" ou "Donnée indisponible".
3. **Statut et traçabilité des estimations** :
   - `isEstimated: boolean`
   - `estimationMethod: string | null`
   - `isStale: boolean` (données plus anciennes qu'un certain seuil)

---

## 2. Types TypeScript Principaux

### 2.1 Sources de Production (`ProductionSourceKey`)

```typescript
export type ProductionSourceKey =
  | 'nuclear'
  | 'hydro'
  | 'wind'
  | 'solar'
  | 'gas'
  | 'coal'
  | 'oil'
  | 'biomass'
  | 'geothermal'
  | 'unknown';
```

### 2.2 Instantané Électrique d'un Pays (`CountryElectricitySnapshot`)

```typescript
export interface CountryElectricitySnapshot {
  countryCode: string;          // Code ISO-3166-1 alpha-2 (ex: "FR", "DE")
  countryNameFr: string;        // Nom en français (ex: "France")
  countryNameEn: string;        // Nom en anglais (ex: "France")
  flagEmoji: string;            // Emoji drapeau (ex: "🇫🇷")
  zoneKey: string;              // Zone Electricity Maps (ex: "FR", "DE")
  subZones?: string[];          // Sous-zones si applicables (ex: ["DK-DK1", "DK-DK2"])

  timestamp: string;            // Date/heure ISO de la mesure (ex: "2024-03-24T12:00:00.000Z")
  updatedAt: string;            // Date/heure de calcul chez Electricity Maps

  // Métriques d'émissions
  carbonIntensity: number | null; // gCO₂eq/kWh (cycle de vie)
  carbonIntensityLevel?: 'low' | 'medium' | 'high' | 'very-high' | null;

  // Métriques de parts énergétiques (%)
  fossilFreePercentage: number | null; // % bas-carbone (renouvelable + nucléaire)
  renewablePercentage: number | null;  // % renouvelable strict

  // Charges et puissance (MW)
  totalProduction: number | null;     // Total de la production nationale (MW)
  totalConsumption: number | null;    // Total consommé dans la zone (MW) - Total Load
  reportedLoad: number | null;        // Charge officiellement rapportée (MW)
  netLoad: number | null;             // Charge résiduelle (consommation - solaire - éolien)

  // Mix de production détaillé (MW par source)
  productionBreakdown: Record<ProductionSourceKey, number | null>;

  // Mix de consommation flow-traced (si disponible)
  consumptionBreakdown?: Record<ProductionSourceKey, number | null>;

  // Échanges transfrontaliers (MW)
  importTotal: number | null;         // Total importé (MW)
  exportTotal: number | null;         // Total exporté (MW)
  netExport: number | null;           // Export net = exportTotal - importTotal
  exchangeFlows: CrossBorderFlow[];   // Détail pays par pays

  // Métadonnées de qualité
  isEstimated: boolean;
  estimationMethod: string | null;
  dataSourceQuality: 'measured' | 'estimated' | 'unavailable' | 'stale';
}
```

### 2.3 Flux Transfrontaliers (`CrossBorderFlow`)

```typescript
export interface CrossBorderFlow {
  fromZone: string;     // Zone expéditrice
  toZone: string;       // Zone réceptrice
  flowMW: number;       // Volume du flux en MW (positif)
  isEstimated?: boolean;
}
```

---

## 3. Définitions et Rôles Pédagogiques

- **Intensité Carbone (`gCO₂eq/kWh`)** : Émissions de gaz à effet de serre rapportées à chaque kilowattheure consommé ou produit. Exprimée systématiquement en `gCO₂eq/kWh`.
- **Part Bas-Carbone / Sans Fossile (`fossilFreePercentage`)** : Part de l'électricité générée sans combustion fossile. Elle englobe le renouvelable (solaire, éolien, hydro, biomasse, géothermie) ET le nucléaire.
- **Part Renouvelable (`renewablePercentage`)** : Part strictement renouvelable (solaire, éolien, hydroélectricité, géothermie, biomasse).
- **Charge Totale (`totalLoad` / `powerConsumptionTotal`)** : Puissance instantanée consommée par le réseau du pays (exprimée en MW ou GW).
- **Charge Nette / Résiduelle (`netLoad`)** : Charge totale diminuée des énergies renouvelables variables (éolien + solaire). Elle représente la puissance devant être couverte par les sources pilotables (nucléaire, hydro, gaz, charbon) ou les imports.
- **Solde Import / Export** :
  - Si `netExport > 0` : le pays est **exportateur net** (sa production dépasse sa consommation).
  - Si `netExport < 0` : le pays est **importateur net** (il dépend des flux de ses voisins).
