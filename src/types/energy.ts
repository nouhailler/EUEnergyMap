/**
 * Modèle de données typé pour l'application EU Energy Map.
 * Conforme aux règles d'intégrité :
 * - Aucune invention de données
 * - Valeur null conservée et distinguée de 0
 * - Traçabilité des estimations
 */

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

export interface ProductionSourceMeta {
  key: ProductionSourceKey;
  labelFr: string;
  labelEn: string;
  color: string;
  isRenewable: boolean;
  isCarbonFree: boolean;
  descriptionFr: string;
}

export interface CrossBorderFlow {
  fromZone: string;
  toZone: string;
  flowMW: number;
  isEstimated?: boolean;
}

export type DataQualityStatus = 'measured' | 'estimated' | 'unavailable' | 'stale';

export interface CountryElectricitySnapshot {
  countryCode: string;           // Code ISO alpha-2 (ex: "FR", "DE")
  countryNameFr: string;         // Nom officiel français (ex: "France")
  countryNameEn: string;         // Nom officiel anglais (ex: "France")
  flagEmoji: string;             // Drapeau emoji
  zoneKey: string;               // Clé de zone Electricity Maps (ex: "FR")
  subZones?: string[];           // Sous-zones le cas échéant (ex: ["DK-DK1", "DK-DK2"])

  datetime: string;              // Horodatage ISO de la mesure
  updatedAt: string;             // Horodatage ISO de mise à jour chez Electricity Maps

  // Métriques carbone
  carbonIntensity: number | null; // gCO₂eq/kWh
  carbonIntensityLevel?: 'low' | 'medium' | 'high' | 'very-high' | null;

  // Parts d'énergies (%)
  fossilFreePercentage: number | null; // % bas-carbone (renouvelable + nucléaire)
  renewablePercentage: number | null;  // % renouvelable strict

  // Puissances et charges (MW)
  totalProduction: number | null;      // Total produit (MW)
  totalConsumption: number | null;     // Charge totale / Total Load (MW)
  reportedLoad: number | null;         // Charge rapportée officiellement (MW)
  netLoad: number | null;              // Charge nette résiduelle (Load - Solaire - Éolien)

  // Mix de production détaillé (MW par source)
  productionBreakdown: Record<ProductionSourceKey, number | null>;

  // Mix de consommation (flow-traced si disponible)
  consumptionBreakdown?: Record<ProductionSourceKey, number | null>;

  // Échanges transfrontaliers (MW)
  importTotal: number | null;          // Somme des imports (MW)
  exportTotal: number | null;          // Somme des exports (MW)
  netExport: number | null;            // Solde net = exportTotal - importTotal (+: exportateur net, -: importateur)
  exchangeFlows: CrossBorderFlow[];    // Détail des flux vers/depuis les voisins

  // Qualité et traçabilité
  isEstimated: boolean;
  estimationMethod: string | null;
  dataSourceQuality: DataQualityStatus;
}

export interface CarbonHistoryPoint {
  datetime: string;
  carbonIntensity: number | null;
  isEstimated: boolean;
}

export interface CountryHistoryData {
  zoneKey: string;
  history: CarbonHistoryPoint[];
}

export type IndicatorMode =
  | 'carbonIntensity'
  | 'renewableShare'
  | 'carbonFreeShare'
  | 'totalLoad'
  | 'primarySource';
