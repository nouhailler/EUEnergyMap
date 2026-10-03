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

export type SignalLevel = 'very-low' | 'low' | 'medium' | 'high' | 'very-high';

export interface DominantSourceInfo {
  key: ProductionSourceKey;
  labelFr: string;
  labelEn: string;
  productionMW: number | null;
  percentage: number | null; // % de la production totale
}

export interface CrossBorderFlow {
  fromZone: string;
  toZone: string;
  flowMW: number;
  isEstimated?: boolean;
}

export type DataQualityStatus = 'measured' | 'estimated' | 'unavailable' | 'stale';

/**
 * Instantané énergétique conforme aux 13 signaux exposés par l'API Electricity Maps (V4)
 */
export interface CountryElectricitySnapshot {
  countryCode: string;           // Code ISO alpha-2 (ex: "FR", "DE")
  countryNameFr: string;         // Nom officiel français (ex: "France")
  countryNameEn: string;         // Nom officiel anglais (ex: "France")
  flagEmoji: string;             // Drapeau emoji
  zoneKey: string;               // Clé de zone Electricity Maps (ex: "FR")
  subZones?: string[];           // Sous-zones le cas échéant (ex: ["DK-DK1", "DK-DK2"])

  datetime: string;              // Horodatage ISO de la mesure
  updatedAt: string;             // Horodatage ISO de mise à jour chez Electricity Maps
  dataTimestamp?: string;        // Date et heure effectives de la donnée mesurée (ex: "2024-03-24T12:00:00Z")
  retrievedAt?: string;          // Date et heure de récupération / synchro par l'application (ex: "2026-10-03T11:35:00Z")
  source?: string;               // Source factuelle (ex: "Référence locale", "Electricity Maps API (Live)")

  // --- Les 13 signaux officiels de l'API Electricity Maps V4 ---

  // 1. Electricity mix : Mix de production et consommation par filière (V4)
  productionBreakdown: Record<ProductionSourceKey, number | null>;
  consumptionBreakdown?: Record<ProductionSourceKey, number | null>;
  storageBreakdown?: Record<string, number | null>;
  storageTotal?: number | null;

  // 2. Electricity flows : Flux transfrontaliers physiques & imports / exports
  exchangeFlows: CrossBorderFlow[];    // Détail des flux vers/depuis les voisins
  importTotal: number | null;          // Somme des imports (MW)
  exportTotal: number | null;          // Somme des exports (MW)
  netExport: number | null;            // Solde net = exportTotal - importTotal (+: exportateur net, -: importateur)

  // 3. Electricity source : Source primaire dominante
  dominantSource?: DominantSourceInfo | null;

  // 4. Total load : Charge totale / consommation électrique globale (MW)
  totalConsumption: number | null;     // Charge totale (MW)
  totalLoad?: number | null;           // Alias normalisé V4 (MW)

  // 5. Total reported load : Charge totale rapportée officiellement par les TSO (MW)
  reportedLoad: number | null;         // Charge rapportée officiellement (MW)
  totalReportedLoad?: number | null;   // Alias normalisé V4 (MW)

  // 6. Net load : Charge nette résiduelle (Total Load - Solaire - Éolien) (MW)
  netLoad: number | null;              // Charge nette résiduelle (MW)

  // 7. Carbon intensity : Intensité carbone globale (gCO₂eq/kWh)
  carbonIntensity: number | null;      // gCO₂eq/kWh

  // 8. Carbon-free energy share : Part d'énergie décarbonée (renouvelable + nucléaire) (%)
  fossilFreePercentage: number | null; // % bas-carbone
  carbonFreeEnergyShare?: number | null; // Alias normalisé V4 (%)

  // 9. Renewable energy share : Part d'énergie renouvelable stricte (%)
  renewablePercentage: number | null;  // % renouvelable strict
  renewableEnergyShare?: number | null; // Alias normalisé V4 (%)

  // 10. Fossil-only carbon intensity : Intensité carbone des seules sources fossiles (gCO₂eq/kWh)
  fossilOnlyCarbonIntensity?: number | null; // gCO₂eq/kWh des filières fossiles

  // 11. Carbon-free level : Niveau qualitatif officiel de décarbonation
  carbonFreeLevel?: SignalLevel | null;

  // 12. Carbon intensity level : Niveau qualitatif officiel d'intensité carbone
  carbonIntensityLevel?: SignalLevel | null;

  // 13. Renewable level : Niveau qualitatif officiel de renouvelables
  renewableLevel?: SignalLevel | null;

  // Autres indicateurs de production et qualité
  totalProduction: number | null;      // Total produit (MW)
  isEstimated: boolean;
  estimationMethod: string | null;
  dataSourceQuality: DataQualityStatus;
}

export interface ApiV4SignalItem {
  key: string;
  nameEn: string;
  nameFr: string;
  category: 'mix_flows' | 'load' | 'carbon' | 'levels';
  value: string | number | null;
  unit: string;
  formattedValue: string;
  level?: SignalLevel | null;
  descriptionFr: string;
  apiEndpointV4: string;
}

export type TemporalGranularity = '5_minutes' | '15_minutes' | 'hourly';

export interface GranularityOption {
  value: TemporalGranularity;
  label: string;
  shortLabel: string;
  description: string;
  points24h: number;
}

export const GRANULARITY_OPTIONS: GranularityOption[] = [
  {
    value: '5_minutes',
    label: '5 minutes',
    shortLabel: '5 min',
    description: 'Ultra-haute fréquence (ajustements temps réel et réserves primaires)',
    points24h: 288,
  },
  {
    value: '15_minutes',
    label: '15 minutes',
    shortLabel: '15 min',
    description: 'Résolution standard européenne (marchés infra-journaliers ENTSO-E / Euphemia)',
    points24h: 96,
  },
  {
    value: 'hourly',
    label: '1 heure',
    shortLabel: '1 h',
    description: 'Résolution horaire historique (marché Day-Ahead)',
    points24h: 24,
  },
];

export interface CarbonHistoryPoint {
  datetime: string;
  carbonIntensity: number | null;
  fossilOnlyCarbonIntensity?: number | null;
  isEstimated: boolean;
}

export interface CountryHistoryData {
  zoneKey: string;
  granularity?: TemporalGranularity;
  history: CarbonHistoryPoint[];
  isDemoFallback?: boolean;
  isUnavailable?: boolean;
  message?: string;
  dataTimestamp?: string;
  retrievedAt?: string;
  source?: string;
  lastKnown?: {
    datetime: string;
    carbonIntensity: number | null;
    fossilOnlyCarbonIntensity?: number | null;
    updatedAt?: string;
  } | null;
}

export type TimelineIndicator =
  | 'carbonIntensity'
  | 'renewable'
  | 'carbonFree'
  | 'totalLoad'
  | 'reportedLoad'
  | 'netLoad'
  | 'solar'
  | 'wind'
  | 'nuclear'
  | 'flows';

export interface TimelineIndicatorMeta {
  key: TimelineIndicator;
  label: string;
  unit: string;
  shortUnit: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  description: string;
  badgeLabel?: string;
}

export const TIMELINE_INDICATORS: TimelineIndicatorMeta[] = [
  {
    key: 'carbonIntensity',
    label: 'Intensité carbone',
    unit: 'gCO₂eq/kWh',
    shortUnit: 'g',
    color: '#e11d48',
    gradientFrom: '#e11d48',
    gradientTo: '#fb7185',
    description: 'Émissions directes et cycle de vie par kWh produit/consommé',
  },
  {
    key: 'renewable',
    label: 'Renouvelable',
    unit: '%',
    shortUnit: '%',
    color: '#10b981',
    gradientFrom: '#10b981',
    gradientTo: '#34d399',
    description: 'Part des énergies renouvelables (éolien, solaire, hydro, biomasse)',
  },
  {
    key: 'carbonFree',
    label: 'Bas-carbone',
    unit: '%',
    shortUnit: '%',
    color: '#6366f1',
    gradientFrom: '#6366f1',
    gradientTo: '#818cf8',
    description: 'Électricité sans émissions directes de CO₂ (renouvelable + nucléaire)',
  },
  {
    key: 'totalLoad',
    label: 'Total Load',
    unit: 'MW',
    shortUnit: 'GW',
    color: '#0284c7',
    gradientFrom: '#0284c7',
    gradientTo: '#38bdf8',
    description: 'Consommation électrique brute totale du territoire (puissance appelée)',
  },
  {
    key: 'reportedLoad',
    label: 'Reported Load',
    unit: 'MW',
    shortUnit: 'GW',
    color: '#0d9488',
    gradientFrom: '#0d9488',
    gradientTo: '#2dd4bf',
    description: 'Charge officiellement déclarée par le gestionnaire de réseau (GRT / TSO)',
  },
  {
    key: 'netLoad',
    label: 'Net Load',
    unit: 'MW',
    shortUnit: 'GW',
    color: '#f59e0b',
    gradientFrom: '#f59e0b',
    gradientTo: '#fbbf24',
    description: 'Charge résiduelle nette à couvrir hors énergies variables (Load - Solaire - Éolien)',
  },
  {
    key: 'solar',
    label: 'Solaire',
    unit: 'MW',
    shortUnit: 'GW',
    color: '#eab308',
    gradientFrom: '#eab308',
    gradientTo: '#fde047',
    description: 'Production photovoltaïque instantanée sur le réseau',
  },
  {
    key: 'wind',
    label: 'Éolien',
    unit: 'MW',
    shortUnit: 'GW',
    color: '#06b6d4',
    gradientFrom: '#06b6d4',
    gradientTo: '#67e8f9',
    description: 'Production éolienne terrestre (onshore) et en mer (offshore)',
  },
  {
    key: 'nuclear',
    label: 'Nucléaire',
    unit: 'MW',
    shortUnit: 'GW',
    color: '#8b5cf6',
    gradientFrom: '#8b5cf6',
    gradientTo: '#a78bfa',
    description: 'Production des réacteurs nucléaires de base continue',
  },
  {
    key: 'flows',
    label: 'Flux',
    unit: 'MW',
    shortUnit: 'GW',
    color: '#14b8a6',
    gradientFrom: '#14b8a6',
    gradientTo: '#2dd4bf',
    description: 'Solde physique net des échanges transfrontaliers (+ exportateur, - importateur)',
  },
];

export interface TimelineHistoryPoint {
  datetime: string;
  carbonIntensity: number | null;
  fossilOnlyCarbonIntensity: number | null;
  renewablePercentage: number | null;
  fossilFreePercentage: number | null;
  totalLoad: number | null;
  totalReportedLoad: number | null;
  netLoad: number | null;
  solar: number | null;
  wind: number | null;
  nuclear: number | null;
  hydro: number | null;
  gas: number | null;
  coal: number | null;
  biomass?: number | null;
  oil?: number | null;
  geothermal?: number | null;
  unknown?: number | null;
  totalProduction?: number | null;
  netExport: number | null;
  importTotal: number | null;
  exportTotal: number | null;
  isEstimated: boolean;
}

export interface TimelineData {
  zoneKey: string;
  granularity: TemporalGranularity;
  points: TimelineHistoryPoint[];
  isDemoFallback?: boolean;
  isUnavailable?: boolean;
  message?: string;
  dataTimestamp?: string;
  retrievedAt?: string;
  source?: string;
  lastKnown?: any;
}

export interface MixHistoryPoint {
  datetime: string;
  hourLabel: string;
  fullDateLabel: string;
  nuclear: number;
  hydro: number;
  wind: number;
  solar: number;
  gas: number;
  coal: number;
  biomass: number;
  oil: number;
  geothermal: number;
  unknown: number;
  totalProduction: number;
  totalConsumption: number;
  netExport: number;
  isEstimated: boolean;
}

export interface MixHistoryData {
  zoneKey: string;
  granularity: TemporalGranularity;
  points: MixHistoryPoint[];
  isDemoFallback?: boolean;
  isUnavailable?: boolean;
  message?: string;
  dataTimestamp?: string;
  retrievedAt?: string;
  source?: string;
  timestamp?: string;
  lastKnown?: any;
}

export interface InterconnectorFlowItem {
  fromZone: string;
  toZone: string;
  flowMW: number;
  isExport: boolean;
  peerZone: string;
  peerNameFr: string;
  peerFlag: string;
}

export interface FlowHistoryPoint {
  datetime: string;
  hourLabel: string;
  fullDateLabel: string;
  flows: Record<string, number>; // peerZone -> net flowMW (positive = export, negative = import)
  flowItems: InterconnectorFlowItem[];
  netExportTotal: number;
  importTotal: number;
  exportTotal: number;
  isEstimated: boolean;
}

export interface InterconnectorMeta {
  peerZone: string;
  peerNameFr: string;
  peerFlag: string;
  pairKey: string; // "FR->DE"
  label: string;   // "France → Allemagne"
  reverseLabel: string; // "Allemagne → France"
}

export interface FlowsHistoryData {
  zoneKey: string;
  granularity: TemporalGranularity;
  points: FlowHistoryPoint[];
  interconnectors: InterconnectorMeta[];
  isDemoFallback?: boolean;
  isUnavailable?: boolean;
  message?: string;
  dataTimestamp?: string;
  retrievedAt?: string;
  source?: string;
  timestamp?: string;
  lastKnown?: any;
}

export type IndicatorMode =
  | 'carbonIntensity'
  | 'renewableShare'
  | 'carbonFreeShare'
  | 'totalLoad'
  | 'netLoad'
  | 'fossilOnlyCarbonIntensity'
  | 'primarySource';
