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

  // --- Les 13 signaux officiels de l'API Electricity Maps V4 ---

  // 1. Electricity mix : Mix de production et consommation par filière
  productionBreakdown: Record<ProductionSourceKey, number | null>;
  consumptionBreakdown?: Record<ProductionSourceKey, number | null>;

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
  | 'netLoad'
  | 'fossilOnlyCarbonIntensity'
  | 'primarySource';
