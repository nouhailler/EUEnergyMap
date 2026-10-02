import {
  CountryElectricitySnapshot,
  ProductionSourceKey,
  DataQualityStatus,
  CrossBorderFlow,
  SignalLevel,
  DominantSourceInfo,
  ApiV4SignalItem,
} from '../../types/energy';
import { EU_COUNTRIES } from '../../data/euCountries';
import { EU_REFERENCE_SNAPSHOTS } from '../../data/referenceData';
import { PRODUCTION_SOURCES } from '../../data/sourcesMeta';

export interface RawElectricityMapsBreakdown {
  zone?: string;
  datetime?: string;
  updatedAt?: string;
  // --- Format officiel V4 : /v4/electricity-mix/latest ---
  mix?: {
    normal?: Partial<Record<ProductionSourceKey, number | null>>;
    production?: Partial<Record<ProductionSourceKey, number | null>>;
    'flow-traced'?: Partial<Record<ProductionSourceKey, number | null>>;
    flowTraced?: Partial<Record<ProductionSourceKey, number | null>>;
    consumption?: Partial<Record<ProductionSourceKey, number | null>>;
    storage?: Record<string, number | null>;
    stockage?: Record<string, number | null>;
    imports?: Record<string, number | null>;
    exports?: Record<string, number | null>;
    productionTotal?: number | null;
    consumptionTotal?: number | null;
    importTotal?: number | null;
    exportTotal?: number | null;
  } | Partial<Record<ProductionSourceKey, number | null>>;
  normal?: Partial<Record<ProductionSourceKey, number | null>>;
  production?: Partial<Record<ProductionSourceKey, number | null>>;
  'flow-traced'?: Partial<Record<ProductionSourceKey, number | null>>;
  flowTraced?: Partial<Record<ProductionSourceKey, number | null>>;
  storage?: Record<string, number | null>;
  stockage?: Record<string, number | null>;
  imports?: Record<string, number | null>;
  exports?: Record<string, number | null>;
  // --- Format standard / V3 : /v3/power-breakdown/latest ---
  powerProductionBreakdown?: Partial<Record<ProductionSourceKey, number | null>>;
  powerProductionTotal?: number | null;
  powerConsumptionBreakdown?: Partial<Record<ProductionSourceKey, number | null>>;
  powerConsumptionTotal?: number | null;
  powerImportBreakdown?: Record<string, number | null>;
  powerImportTotal?: number | null;
  powerExportBreakdown?: Record<string, number | null>;
  powerExportTotal?: number | null;
  fossilFreePercentage?: number | null;
  renewablePercentage?: number | null;
  totalReportedLoad?: number | null;
  netLoad?: number | null;
  isEstimated?: boolean;
  estimationMethod?: string | null;
}

export interface RawElectricityMapsCarbon {
  zone?: string;
  carbonIntensity?: number | null;
  fossilOnlyCarbonIntensity?: number | null;
  carbonIntensityLevel?: SignalLevel | null;
  carbonFreeLevel?: SignalLevel | null;
  renewableLevel?: SignalLevel | null;
  datetime?: string;
  updatedAt?: string;
  isEstimated?: boolean;
  estimationMethod?: string | null;
}

/**
 * @deprecated Ne pas inventer de seuils locaux. Electricity Maps fournit /v4/carbon-intensity-level/latest relatif au comportement récent de la zone.
 */
export function computeCarbonIntensityLevel(_ci: number | null): SignalLevel | null {
  return null;
}

/**
 * Calcule le niveau qualitatif de part décarbonée (renouvelable + nucléaire)
 */
export function computeCarbonFreeLevel(cf: number | null): SignalLevel | null {
  if (cf === null || cf === undefined) return null;
  if (cf >= 90) return 'very-high';
  if (cf >= 70) return 'high';
  if (cf >= 45) return 'medium';
  if (cf >= 20) return 'low';
  return 'very-low';
}

/**
 * @deprecated Ne pas inventer de seuils locaux. Electricity Maps fournit /v4/renewable-percentage-level/latest relatif à la zone.
 */
export function computeRenewableLevel(_ren: number | null): SignalLevel | null {
  return null;
}

/**
 * Détermine la source principale d'électricité (Electricity Source)
 */
export function computeDominantSource(
  breakdown: Record<ProductionSourceKey, number | null>,
  totalProduction: number | null
): DominantSourceInfo | null {
  let maxKey: ProductionSourceKey | null = null;
  let maxMW = -1;

  for (const [key, val] of Object.entries(breakdown)) {
    if (key !== 'unknown' && val !== null && val > maxMW) {
      maxMW = val;
      maxKey = key as ProductionSourceKey;
    }
  }

  if (!maxKey || maxMW <= 0) {
    return null;
  }

  const meta = PRODUCTION_SOURCES[maxKey];
  const percentage = totalProduction && totalProduction > 0
    ? Math.round((maxMW / totalProduction) * 100)
    : null;

  return {
    key: maxKey,
    labelFr: meta ? meta.labelFr : maxKey,
    labelEn: meta ? meta.labelEn : maxKey,
    productionMW: maxMW,
    percentage,
  };
}

/**
 * Calcule l'intensité carbone des filières fossiles strictes (Fossil-only carbon intensity)
 * Facteurs d'émissions cycle de vie : Charbon ~820 gCO₂eq/kWh, Gaz ~490 g, Fioul ~750 g
 */
export function computeFossilOnlyCarbonIntensity(
  breakdown: Record<ProductionSourceKey, number | null>,
  explicitValue?: number | null
): number | null {
  if (explicitValue !== undefined && explicitValue !== null) {
    return Math.round(explicitValue);
  }

  const coal = breakdown.coal ?? 0;
  const gas = breakdown.gas ?? 0;
  const oil = breakdown.oil ?? 0;
  const fossilSum = coal + gas + oil;

  if (fossilSum <= 0) {
    return null; // Aucun fossile en fonctionnement
  }

  const weightedEmissions = (coal * 820) + (gas * 490) + (oil * 750);
  return Math.round(weightedEmissions / fossilSum);
}

/**
 * Extrait et structure les 13 signaux officiels de l'API Electricity Maps V4
 */
export function extract13Signals(snapshot: CountryElectricitySnapshot): ApiV4SignalItem[] {
  const ci = snapshot.carbonIntensity;
  const cf = snapshot.carbonFreeEnergyShare ?? snapshot.fossilFreePercentage;
  const ren = snapshot.renewableEnergyShare ?? snapshot.renewablePercentage;
  const fci = snapshot.fossilOnlyCarbonIntensity;
  const load = snapshot.totalLoad ?? snapshot.totalConsumption;
  const reported = snapshot.totalReportedLoad ?? snapshot.reportedLoad;
  const net = snapshot.netLoad;
  const dom = snapshot.dominantSource;

  return [
    // 1. Electricity mix
    {
      key: 'electricity_mix',
      nameEn: 'Electricity mix',
      nameFr: 'Mix électrique (Production & Consommation)',
      category: 'mix_flows',
      value: snapshot.totalProduction,
      unit: 'MW',
      formattedValue: snapshot.totalProduction != null ? `${snapshot.totalProduction.toLocaleString('fr-FR')} MW` : '—',
      descriptionFr: 'Ventilation détaillée de la production et de la consommation par filière énergétique.',
      apiEndpointV4: '/v4/electricity-mix/latest',
    },
    // 2. Electricity flows
    {
      key: 'electricity_flows',
      nameEn: 'Electricity flows',
      nameFr: 'Flux physiques transfrontaliers',
      category: 'mix_flows',
      value: snapshot.netExport,
      unit: 'MW',
      formattedValue: snapshot.netExport != null ? `${snapshot.netExport >= 0 ? '+' : ''}${snapshot.netExport.toLocaleString('fr-FR')} MW` : '—',
      descriptionFr: 'Solde net et interconnexions physiques transfrontalières avec les pays voisins.',
      apiEndpointV4: '/v4/electricity-flows/latest',
    },
    // 3. Electricity source
    {
      key: 'electricity_source',
      nameEn: 'Electricity source',
      nameFr: 'Source d’électricité dominante',
      category: 'mix_flows',
      value: dom?.percentage ?? null,
      unit: '%',
      formattedValue: dom ? `${dom.labelFr} (${dom.percentage}%)` : '—',
      descriptionFr: 'Filière de production majoritaire sur le réseau national.',
      apiEndpointV4: '/v4/electricity-mix/latest',
    },
    // 4. Total load
    {
      key: 'total_load',
      nameEn: 'Total load',
      nameFr: 'Total Load (Charge calculée)',
      category: 'load',
      value: load,
      unit: 'MW',
      formattedValue: load != null ? `${(load / 1000).toFixed(1)} GW (${load.toLocaleString('fr-FR')} MW)` : '—',
      descriptionFr: 'Total Load : valeur calculée selon la méthodologie Electricity Maps.',
      apiEndpointV4: '/v4/total-load/latest',
    },
    // 5. Total reported load
    {
      key: 'total_reported_load',
      nameEn: 'Total reported load',
      nameFr: 'Total Reported Load (Déclarée TSO)',
      category: 'load',
      value: reported,
      unit: 'MW',
      formattedValue: reported != null ? `${(reported / 1000).toFixed(1)} GW (${reported.toLocaleString('fr-FR')} MW)` : '—',
      descriptionFr: 'Total Reported Load : valeur fournie par le gestionnaire de réseau.',
      apiEndpointV4: '/v4/total-reported-load/latest',
    },
    // 6. Net load
    {
      key: 'net_load',
      nameEn: 'Net load',
      nameFr: 'Charge nette résiduelle (Net load)',
      category: 'load',
      value: net,
      unit: 'MW',
      formattedValue: net != null ? `${(net / 1000).toFixed(1)} GW (${net.toLocaleString('fr-FR')} MW)` : '—',
      descriptionFr: 'Net Load : signal officiel issu de /v4/net-load/latest (charge résiduelle calculée par Electricity Maps prenant en compte production, renouvelables, stockage et flux).',
      apiEndpointV4: '/v4/net-load/latest',
    },
    // 7. Carbon intensity
    {
      key: 'carbon_intensity',
      nameEn: 'Carbon intensity',
      nameFr: 'Intensité carbone de l’électricité',
      category: 'carbon',
      value: ci,
      unit: 'gCO₂eq/kWh',
      formattedValue: ci != null ? `${ci} gCO₂eq/kWh` : '—',
      descriptionFr: 'Émissions totales de gaz à effet de serre en cycle de vie par unité d’électricité.',
      apiEndpointV4: '/v4/carbon-intensity/latest',
    },
    // 8. Carbon-free energy share
    {
      key: 'carbon_free_energy_share',
      nameEn: 'Carbon-free energy share',
      nameFr: 'Part d’énergie décarbonée',
      category: 'carbon',
      value: cf,
      unit: '%',
      formattedValue: cf != null ? `${cf} %` : '—',
      descriptionFr: 'Proportion d’électricité issue de sources sans émissions directes de CO₂ (renouvelable + nucléaire).',
      apiEndpointV4: '/v4/carbon-free-energy-share/latest',
    },
    // 9. Renewable energy share
    {
      key: 'renewable_energy_share',
      nameEn: 'Renewable energy share',
      nameFr: 'Part d’énergie renouvelable',
      category: 'carbon',
      value: ren,
      unit: '%',
      formattedValue: ren != null ? `${ren} %` : '—',
      descriptionFr: 'Proportion d’électricité d’origine renouvelable (solaire, éolien, hydro, biomasse, géothermie).',
      apiEndpointV4: '/v4/renewable-energy-share/latest',
    },
    // 10. Fossil-only carbon intensity
    {
      key: 'fossil_only_carbon_intensity',
      nameEn: 'Fossil-only carbon intensity',
      nameFr: 'Intensité carbone fossile seule',
      category: 'carbon',
      value: fci ?? null,
      unit: 'gCO₂eq/kWh',
      formattedValue: fci != null ? `${fci} gCO₂eq/kWh` : 'Non applicable (0 fossile)',
      descriptionFr: 'Intensité carbone des seules unités thermiques fossiles en activité (efficacité thermique charbon/gaz/fioul).',
      apiEndpointV4: '/v4/fossil-only-carbon-intensity/latest',
    },
    // 11. Carbon-free level
    {
      key: 'carbon_free_level',
      nameEn: 'Carbon-free percentage level',
      nameFr: 'Carbon-Free Level (Niveau bas-carbone)',
      category: 'levels',
      value: snapshot.carbonFreeLevel ?? null,
      unit: 'niveau',
      formattedValue: snapshot.carbonFreeLevel ? `${formatCarbonFreeLevelBadge(snapshot.carbonFreeLevel).dot} ${formatCarbonFreeLevelBadge(snapshot.carbonFreeLevel).text}` : '—',
      level: snapshot.carbonFreeLevel,
      descriptionFr: 'Carbon-Free Level : niveau officiel Electricity Maps comparant la part décarbonée à la moyenne récente de la zone (🟢 HIGH, 🟡 MODERATE, 🔴 LOW).',
      apiEndpointV4: '/v4/carbon-free-percentage-level/latest',
    },
    // 12. Carbon intensity level
    {
      key: 'carbon_intensity_level',
      nameEn: 'Carbon intensity level',
      nameFr: 'Niveau d’intensité carbone (Carbon intensity level)',
      category: 'levels',
      value: snapshot.carbonIntensityLevel ?? null,
      unit: 'niveau',
      formattedValue: snapshot.carbonIntensityLevel ? `${formatCarbonIntensityLevelBadge(snapshot.carbonIntensityLevel).dot} ${formatCarbonIntensityLevelBadge(snapshot.carbonIntensityLevel).text}` : '—',
      level: snapshot.carbonIntensityLevel,
      descriptionFr: 'Carbon intensity level : niveau officiel Electricity Maps calculé relativement au comportement récent de la zone (/v4/carbon-intensity-level/latest), et non selon des seuils universels fixes.',
      apiEndpointV4: '/v4/carbon-intensity-level/latest',
    },
    // 13. Renewable level
    {
      key: 'renewable_level',
      nameEn: 'Renewable percentage level',
      nameFr: 'Renewable Level (Niveau de renouvelables)',
      category: 'levels',
      value: snapshot.renewableLevel ?? null,
      unit: 'niveau',
      formattedValue: snapshot.renewableLevel ? `${formatRenewableLevelBadge(snapshot.renewableLevel).dot} ${formatRenewableLevelBadge(snapshot.renewableLevel).text}` : '—',
      level: snapshot.renewableLevel,
      descriptionFr: 'Renewable level : niveau officiel Electricity Maps calculé en comparant la part renouvelable à la moyenne récente de la zone (/v4/renewable-percentage-level/latest), et non selon un seuil absolu.',
      apiEndpointV4: '/v4/renewable-percentage-level/latest',
    },
  ];
}

export function formatRenewableLevelBadge(level?: SignalLevel | null): { text: string; color: string; bg: string; dot: string } {
  switch (level) {
    case 'very-high':
    case 'high':
      return { text: 'HIGH', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800', dot: '🟢' };
    case 'medium':
      return { text: 'MODERATE', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800', dot: '🟡' };
    case 'low':
    case 'very-low':
      return { text: 'LOW', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800', dot: '🔴' };
    default:
      return { text: 'INDÉTERMINÉ', color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700', dot: '⚪' };
  }
}

export function formatCarbonFreeLevelBadge(level?: SignalLevel | null): { text: string; color: string; bg: string; dot: string } {
  switch (level) {
    case 'very-high':
    case 'high':
      return { text: 'HIGH', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800', dot: '🟢' };
    case 'medium':
      return { text: 'MODERATE', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800', dot: '🟡' };
    case 'low':
    case 'very-low':
      return { text: 'LOW', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800', dot: '🔴' };
    default:
      return { text: 'INDÉTERMINÉ', color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700', dot: '⚪' };
  }
}

export function formatCarbonIntensityLevelBadge(level?: SignalLevel | null): { text: string; color: string; bg: string; dot: string } {
  switch (level) {
    case 'very-low':
      return { text: 'VERY LOW', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800', dot: '🟢' };
    case 'low':
      return { text: 'LOW', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800', dot: '🟢' };
    case 'medium':
      return { text: 'MODERATE', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800', dot: '🟡' };
    case 'high':
      return { text: 'HIGH', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-950/60 border-orange-300 dark:border-orange-800', dot: '🟠' };
    case 'very-high':
      return { text: 'VERY HIGH', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800', dot: '🔴' };
    default:
      return { text: 'INDÉTERMINÉ', color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700', dot: '⚪' };
  }
}

export function parseSignalLevel(raw?: string | null): SignalLevel | null {
  if (!raw) return null;
  const s = String(raw).toLowerCase().replace(/_/g, '-').trim();
  if (s === 'very-high' || s === 'veryhigh') return 'very-high';
  if (s === 'high') return 'high';
  if (s === 'moderate' || s === 'medium' || s === 'mid') return 'medium';
  if (s === 'low') return 'low';
  if (s === 'very-low' || s === 'verylow') return 'very-low';
  return null;
}

function formatLevelFr(level: SignalLevel): string {
  switch (level) {
    case 'very-low':
      return 'Très faible';
    case 'low':
      return 'Faible';
    case 'medium':
      return 'Moyen';
    case 'high':
      return 'Élevé';
    case 'very-high':
      return 'Très élevé';
    default:
      return level;
  }
}

/**
 * Normalise et fusionne les réponses brutes d'Electricity Maps (v3/v4)
 * pour produire un CountryElectricitySnapshot conforme aux règles du projet.
 */
export function normalizeCountrySnapshot(
  countryCode: string,
  rawBreakdown?: RawElectricityMapsBreakdown | null,
  rawCarbon?: RawElectricityMapsCarbon | null,
  rawReportedLoad?: { value?: number | null; totalReportedLoad?: number | null } | null,
  rawNetLoad?: { value?: number | null; netLoad?: number | null; isEstimated?: boolean } | null,
  rawFossilOnlyCarbon?: { carbonIntensity?: number | null; value?: number | null; fossilOnlyCarbonIntensity?: number | null } | null,
  rawCarbonFreeLevel?: { level?: string | null; carbonFreePercentageLevel?: string | null } | null,
  rawCarbonIntensityLevel?: { level?: string | null; carbonIntensityLevel?: string | null } | null,
  rawRenewableLevel?: { level?: string | null; renewablePercentageLevel?: string | null } | null,
): CountryElectricitySnapshot {
  const countryConfig = EU_COUNTRIES.find((c) => c.code === countryCode);
  if (!countryConfig) {
    throw new Error(`Code pays inconnu dans l'Union Européenne : ${countryCode}`);
  }

  // Fallback si aucune donnée brute n'est fournie
  if (!rawBreakdown && !rawCarbon) {
    const fallback = EU_REFERENCE_SNAPSHOTS[countryCode];
    if (fallback) {
      return {
        ...fallback,
        dataSourceQuality: 'stale',
      };
    }
  }

  const zoneKey = rawBreakdown?.zone || rawCarbon?.zone || countryConfig.zoneKey;
  const datetime = rawBreakdown?.datetime || rawCarbon?.datetime || new Date().toISOString();
  const updatedAt = rawBreakdown?.updatedAt || rawCarbon?.updatedAt || datetime;

  const isEstimated = Boolean(rawBreakdown?.isEstimated || rawCarbon?.isEstimated);
  const estimationMethod = rawBreakdown?.estimationMethod || rawCarbon?.estimationMethod || null;

  // Carbone
  const carbonIntensity = rawCarbon?.carbonIntensity !== undefined && rawCarbon?.carbonIntensity !== null
    ? Math.round(rawCarbon.carbonIntensity)
    : null;

  // Production breakdown par source
  const sourceKeys: ProductionSourceKey[] = [
    'nuclear',
    'hydro',
    'wind',
    'solar',
    'gas',
    'coal',
    'oil',
    'biomass',
    'geothermal',
    'unknown',
  ];

  const productionBreakdown: Record<ProductionSourceKey, number | null> = {
    nuclear: null,
    hydro: null,
    wind: null,
    solar: null,
    gas: null,
    coal: null,
    oil: null,
    biomass: null,
    geothermal: null,
    unknown: null,
  };

  // Extraction de la production brute (support V4 electricity-mix et V3 power-breakdown)
  const rawProd = (rawBreakdown as any)?.mix?.normal
    ?? (rawBreakdown as any)?.mix?.production
    ?? (rawBreakdown as any)?.normal
    ?? (rawBreakdown as any)?.production
    ?? rawBreakdown?.powerProductionBreakdown
    ?? ((rawBreakdown as any)?.mix && !((rawBreakdown as any)?.mix?.normal || (rawBreakdown as any)?.mix?.['flow-traced']) ? (rawBreakdown as any)?.mix : undefined);

  if (rawProd) {
    for (const key of sourceKeys) {
      const val = rawProd[key];
      productionBreakdown[key] = val !== undefined && val !== null ? Math.round(val) : null;
    }
  }

  // Consommation par filière (Flow-traced) : intègre les flux d'échanges physiques transfrontaliers (V4 / V3)
  let consumptionBreakdown: Record<ProductionSourceKey, number | null> | undefined = undefined;

  const rawCons = (rawBreakdown as any)?.mix?.['flow-traced']
    ?? (rawBreakdown as any)?.mix?.flowTraced
    ?? (rawBreakdown as any)?.mix?.consumption
    ?? (rawBreakdown as any)?.['flow-traced']
    ?? (rawBreakdown as any)?.flowTraced
    ?? (rawBreakdown as any)?.consumption
    ?? rawBreakdown?.powerConsumptionBreakdown;

  if (rawCons && Object.keys(rawCons).length > 0) {
    consumptionBreakdown = {
      nuclear: null,
      hydro: null,
      wind: null,
      solar: null,
      gas: null,
      coal: null,
      oil: null,
      biomass: null,
      geothermal: null,
      unknown: null,
    };
    for (const key of sourceKeys) {
      const val = rawCons[key];
      consumptionBreakdown[key] = val !== undefined && val !== null ? Math.round(val) : null;
    }
  } else if (EU_REFERENCE_SNAPSHOTS[countryCode]?.consumptionBreakdown) {
    consumptionBreakdown = EU_REFERENCE_SNAPSHOTS[countryCode].consumptionBreakdown;
  }

  // Stockage d'énergie (Battery, Hydro pumping / discharge) (V4)
  const rawStorage = (rawBreakdown as any)?.mix?.storage
    ?? (rawBreakdown as any)?.mix?.stockage
    ?? (rawBreakdown as any)?.storage
    ?? (rawBreakdown as any)?.stockage;

  let storageBreakdown: Record<string, number | null> | undefined = undefined;
  let storageTotal: number | null = null;
  if (rawStorage && typeof rawStorage === 'object') {
    storageBreakdown = {};
    let sumStorage = 0;
    for (const [k, v] of Object.entries(rawStorage)) {
      if (v !== undefined && v !== null) {
        const rounded = Math.round(v as number);
        storageBreakdown[k] = rounded;
        sumStorage += rounded;
      } else {
        storageBreakdown[k] = null;
      }
    }
    storageTotal = sumStorage;
  }

  // Totaux de production et consommation (support V4 et V3)
  const rawProdTotal = (rawBreakdown as any)?.mix?.productionTotal
    ?? (rawBreakdown as any)?.productionTotal
    ?? (rawBreakdown as any)?.totalProduction
    ?? rawBreakdown?.powerProductionTotal;

  const totalProduction = rawProdTotal !== undefined && rawProdTotal !== null
    ? Math.round(rawProdTotal)
    : (rawProd ? Object.values(productionBreakdown).reduce((acc: number, v) => acc + (v ?? 0), 0) : null);

  const rawConsTotal = (rawBreakdown as any)?.mix?.consumptionTotal
    ?? (rawBreakdown as any)?.consumptionTotal
    ?? (rawBreakdown as any)?.totalConsumption
    ?? rawBreakdown?.powerConsumptionTotal;

  const totalConsumption = rawConsTotal !== undefined && rawConsTotal !== null
    ? Math.round(rawConsTotal)
    : (consumptionBreakdown ? Object.values(consumptionBreakdown).reduce((acc: number, v) => acc + (v ?? 0), 0) : null);

  // Total Reported Load : valeur fournie par le gestionnaire de réseau (TSO / GRT).
  // Strictly distinct from Total Load (méthodologie Electricity Maps).
  const rawReportedVal = rawReportedLoad?.value ?? rawReportedLoad?.totalReportedLoad ?? rawBreakdown?.totalReportedLoad;
  const reportedLoad = rawReportedVal !== undefined && rawReportedVal !== null
    ? Math.round(rawReportedVal)
    : (EU_REFERENCE_SNAPSHOTS[countryCode]?.reportedLoad ?? null);

  // Signal officiel V4 : Net Load (/v4/net-load/latest)
  // Issu prioritairement de l'API officielle Electricity Maps (prenant en compte stockage, échanges et profil de charge),
  // avec fallback sur Total Load - Solaire - Éolien si non fourni directement.
  const rawNetVal = rawNetLoad?.value ?? rawNetLoad?.netLoad ?? rawBreakdown?.netLoad;
  let netLoad: number | null = rawNetVal !== undefined && rawNetVal !== null
    ? Math.round(rawNetVal)
    : null;

  if (netLoad === null) {
    if (totalConsumption !== null && (productionBreakdown.solar !== null || productionBreakdown.wind !== null)) {
      const vRE = (productionBreakdown.solar ?? 0) + (productionBreakdown.wind ?? 0);
      netLoad = Math.max(0, totalConsumption - vRE);
    } else {
      netLoad = EU_REFERENCE_SNAPSHOTS[countryCode]?.netLoad ?? null;
    }
  }

  // Parts sans carbone et renouvelable
  const fossilFreePercentage = rawBreakdown?.fossilFreePercentage !== undefined && rawBreakdown?.fossilFreePercentage !== null
    ? Math.round(rawBreakdown.fossilFreePercentage)
    : null;

  const renewablePercentage = rawBreakdown?.renewablePercentage !== undefined && rawBreakdown?.renewablePercentage !== null
    ? Math.round(rawBreakdown.renewablePercentage)
    : null;

  // Calculs dérivés des nouveaux signaux V4
  const dominantSource = computeDominantSource(productionBreakdown, totalProduction);
  const explicitFci = rawFossilOnlyCarbon?.carbonIntensity ?? rawFossilOnlyCarbon?.value ?? rawFossilOnlyCarbon?.fossilOnlyCarbonIntensity ?? rawCarbon?.fossilOnlyCarbonIntensity ?? EU_REFERENCE_SNAPSHOTS[countryCode]?.fossilOnlyCarbonIntensity;
  const fossilOnlyCarbonIntensity = computeFossilOnlyCarbonIntensity(
    productionBreakdown,
    explicitFci
  );

  const rawApiCarbonIntensityLevel = parseSignalLevel(rawCarbonIntensityLevel?.level ?? rawCarbonIntensityLevel?.carbonIntensityLevel);
  const carbonIntensityLevel = rawApiCarbonIntensityLevel ?? rawCarbon?.carbonIntensityLevel ?? EU_REFERENCE_SNAPSHOTS[countryCode]?.carbonIntensityLevel ?? null;
  const rawApiCarbonFreeLevel = parseSignalLevel(rawCarbonFreeLevel?.level ?? rawCarbonFreeLevel?.carbonFreePercentageLevel);
  const carbonFreeLevel = rawApiCarbonFreeLevel ?? rawCarbon?.carbonFreeLevel ?? EU_REFERENCE_SNAPSHOTS[countryCode]?.carbonFreeLevel ?? computeCarbonFreeLevel(fossilFreePercentage);
  const rawApiRenewableLevel = parseSignalLevel(rawRenewableLevel?.level ?? rawRenewableLevel?.renewablePercentageLevel);
  const renewableLevel = rawApiRenewableLevel ?? rawCarbon?.renewableLevel ?? EU_REFERENCE_SNAPSHOTS[countryCode]?.renewableLevel ?? null;

  // Échanges transfrontaliers (support officiel V4 electricity-mix / electricity-flows et V3)
  const rawExportBreakdown = (rawBreakdown as any)?.mix?.exports
    ?? (rawBreakdown as any)?.exports
    ?? rawBreakdown?.powerExportBreakdown;

  const rawImportBreakdown = (rawBreakdown as any)?.mix?.imports
    ?? (rawBreakdown as any)?.imports
    ?? rawBreakdown?.powerImportBreakdown;

  const rawImportTotal = (rawBreakdown as any)?.mix?.importTotal
    ?? (rawBreakdown as any)?.importTotal
    ?? (rawBreakdown?.powerImportTotal !== undefined && rawBreakdown?.powerImportTotal !== null ? Math.round(rawBreakdown.powerImportTotal) : null);

  const importTotal = rawImportTotal !== null && rawImportTotal !== undefined
    ? rawImportTotal
    : (rawImportBreakdown ? Object.values(rawImportBreakdown).reduce((acc: number, val) => acc + (val ? Math.max(0, val as number) : 0), 0) : null);

  const rawExportTotal = (rawBreakdown as any)?.mix?.exportTotal
    ?? (rawBreakdown as any)?.exportTotal
    ?? (rawBreakdown?.powerExportTotal !== undefined && rawBreakdown?.powerExportTotal !== null ? Math.round(rawBreakdown.powerExportTotal) : null);

  const exportTotal = rawExportTotal !== null && rawExportTotal !== undefined
    ? rawExportTotal
    : (rawExportBreakdown ? Object.values(rawExportBreakdown).reduce((acc: number, val) => acc + (val ? Math.max(0, val as number) : 0), 0) : null);

  let netExport: number | null = null;
  if (exportTotal !== null && importTotal !== null) {
    netExport = exportTotal - importTotal;
  }

  // Décomposition des flux
  const exchangeFlows: CrossBorderFlow[] = [];
  if (rawExportBreakdown) {
    for (const [toZone, flowVal] of Object.entries(rawExportBreakdown)) {
      if (flowVal && (flowVal as number) > 0) {
        exchangeFlows.push({
          fromZone: zoneKey,
          toZone,
          flowMW: Math.round(flowVal as number),
          isEstimated,
        });
      }
    }
  }

  if (rawImportBreakdown) {
    for (const [fromZone, flowVal] of Object.entries(rawImportBreakdown)) {
      if (flowVal && (flowVal as number) > 0) {
        exchangeFlows.push({
          fromZone,
          toZone: zoneKey,
          flowMW: Math.round(flowVal as number),
          isEstimated,
        });
      }
    }
  }

  // Détermination de la qualité globale
  let dataSourceQuality: DataQualityStatus = 'measured';
  if (isEstimated) {
    dataSourceQuality = 'estimated';
  } else if (carbonIntensity === null && totalProduction === null) {
    dataSourceQuality = 'unavailable';
  }

  return {
    countryCode: countryConfig.code,
    countryNameFr: countryConfig.nameFr,
    countryNameEn: countryConfig.nameEn,
    flagEmoji: countryConfig.flag,
    zoneKey,
    subZones: countryConfig.subZones,
    datetime,
    updatedAt,

    // 13 signaux V4
    productionBreakdown,
    consumptionBreakdown,
    storageBreakdown,
    storageTotal,
    exchangeFlows,
    dominantSource,
    totalConsumption,
    totalLoad: totalConsumption,
    reportedLoad,
    totalReportedLoad: reportedLoad,
    netLoad,
    carbonIntensity,
    fossilFreePercentage,
    carbonFreeEnergyShare: fossilFreePercentage,
    renewablePercentage,
    renewableEnergyShare: renewablePercentage,
    fossilOnlyCarbonIntensity,
    carbonFreeLevel,
    carbonIntensityLevel,
    renewableLevel,

    // Autres métadonnées
    totalProduction,
    importTotal,
    exportTotal,
    netExport,
    isEstimated,
    estimationMethod,
    dataSourceQuality,
  };
}

/**
 * Calcule la synthèse de l'UE à partir d'une collection d'instantanés
 */
export function computeEUSummary(snapshots: Record<string, CountryElectricitySnapshot>) {
  const validSnapshots = Object.values(snapshots || {}).filter((s) => s && s.carbonIntensity !== null);

  if (validSnapshots.length === 0) {
    return {
      averageCarbonIntensity: null,
      totalProductionMW: null,
      totalConsumptionMW: null,
      averageRenewableShare: null,
      averageFossilFreeShare: null,
      coveredCountriesCount: 0,
    };
  }

  let totalConsumption = 0;
  let weightedCarbonSum = 0;
  let totalProd = 0;
  let renewableSum = 0;
  let fossilFreeSum = 0;
  let renewableCount = 0;
  let fossilFreeCount = 0;

  for (const s of validSnapshots) {
    const load = s.totalConsumption || s.totalProduction || 1000;
    if (s.carbonIntensity !== null) {
      weightedCarbonSum += s.carbonIntensity * load;
      totalConsumption += load;
    }
    if (s.totalProduction !== null) {
      totalProd += s.totalProduction;
    }
    if (s.renewablePercentage !== null) {
      renewableSum += s.renewablePercentage;
      renewableCount++;
    }
    if (s.fossilFreePercentage !== null) {
      fossilFreeSum += s.fossilFreePercentage;
      fossilFreeCount++;
    }
  }

  const averageCarbonIntensity = totalConsumption > 0 ? Math.round(weightedCarbonSum / totalConsumption) : null;
  const averageRenewableShare = renewableCount > 0 ? Math.round(renewableSum / renewableCount) : null;
  const averageFossilFreeShare = fossilFreeCount > 0 ? Math.round(fossilFreeSum / fossilFreeCount) : null;

  return {
    averageCarbonIntensity,
    totalProductionMW: totalProd > 0 ? totalProd : null,
    totalConsumptionMW: totalConsumption > 0 ? totalConsumption : null,
    averageRenewableShare,
    averageFossilFreeShare,
    coveredCountriesCount: validSnapshots.length,
  };
}
