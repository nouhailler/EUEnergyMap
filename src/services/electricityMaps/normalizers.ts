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
 * Calcule le niveau qualitatif d'intensité carbone selon les seuils standards V4
 */
export function computeCarbonIntensityLevel(ci: number | null): SignalLevel | null {
  if (ci === null || ci === undefined) return null;
  if (ci < 50) return 'very-low';
  if (ci < 150) return 'low';
  if (ci < 300) return 'medium';
  if (ci < 500) return 'high';
  return 'very-high';
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
 * Calcule le niveau qualitatif de part renouvelable
 */
export function computeRenewableLevel(ren: number | null): SignalLevel | null {
  if (ren === null || ren === undefined) return null;
  if (ren >= 80) return 'very-high';
  if (ren >= 60) return 'high';
  if (ren >= 35) return 'medium';
  if (ren >= 15) return 'low';
  return 'very-low';
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
      apiEndpointV4: '/v4/power-breakdown/latest',
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
      apiEndpointV4: '/v4/power-breakdown/latest',
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
      apiEndpointV4: '/v4/power-breakdown/latest',
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
      nameFr: 'Charge nette résiduelle',
      category: 'load',
      value: net,
      unit: 'MW',
      formattedValue: net != null ? `${net.toLocaleString('fr-FR')} MW` : '—',
      descriptionFr: 'Charge totale résiduelle après déduction des énergies renouvelables intermittentes (solaire + éolien).',
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
      nameEn: 'Carbon-free level',
      nameFr: 'Niveau qualitatif décarboné',
      category: 'levels',
      value: snapshot.carbonFreeLevel ?? null,
      unit: 'palier',
      formattedValue: snapshot.carbonFreeLevel ? formatLevelFr(snapshot.carbonFreeLevel) : '—',
      level: snapshot.carbonFreeLevel,
      descriptionFr: 'Palier qualitatif normalisé Electricity Maps évaluant le taux de décarbonation.',
      apiEndpointV4: '/v4/carbon-free-level/latest',
    },
    // 12. Carbon intensity level
    {
      key: 'carbon_intensity_level',
      nameEn: 'Carbon intensity level',
      nameFr: 'Niveau d’intensité carbone',
      category: 'levels',
      value: snapshot.carbonIntensityLevel ?? null,
      unit: 'palier',
      formattedValue: snapshot.carbonIntensityLevel ? formatLevelFr(snapshot.carbonIntensityLevel) : '—',
      level: snapshot.carbonIntensityLevel,
      descriptionFr: 'Classification de l’impact environnemental de très faible à très élevé.',
      apiEndpointV4: '/v4/carbon-intensity-level/latest',
    },
    // 13. Renewable level
    {
      key: 'renewable_level',
      nameEn: 'Renewable level',
      nameFr: 'Niveau qualitatif renouvelable',
      category: 'levels',
      value: snapshot.renewableLevel ?? null,
      unit: 'palier',
      formattedValue: snapshot.renewableLevel ? formatLevelFr(snapshot.renewableLevel) : '—',
      level: snapshot.renewableLevel,
      descriptionFr: 'Palier qualitatif normalisé évaluant la pénétration des énergies renouvelables.',
      apiEndpointV4: '/v4/renewable-level/latest',
    },
  ];
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
  rawReportedLoad?: { value?: number | null; totalReportedLoad?: number | null } | null
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

  const rawProd = rawBreakdown?.powerProductionBreakdown;
  if (rawProd) {
    for (const key of sourceKeys) {
      const val = rawProd[key];
      productionBreakdown[key] = val !== undefined && val !== null ? Math.round(val) : null;
    }
  }

  // Totaux de production et consommation
  const totalProduction = rawBreakdown?.powerProductionTotal !== undefined && rawBreakdown?.powerProductionTotal !== null
    ? Math.round(rawBreakdown.powerProductionTotal)
    : null;

  const totalConsumption = rawBreakdown?.powerConsumptionTotal !== undefined && rawBreakdown?.powerConsumptionTotal !== null
    ? Math.round(rawBreakdown.powerConsumptionTotal)
    : null;

  // Total Reported Load : valeur fournie par le gestionnaire de réseau (TSO / GRT).
  // Strictly distinct from Total Load (méthodologie Electricity Maps).
  const rawReportedVal = rawReportedLoad?.value ?? rawReportedLoad?.totalReportedLoad ?? rawBreakdown?.totalReportedLoad;
  const reportedLoad = rawReportedVal !== undefined && rawReportedVal !== null
    ? Math.round(rawReportedVal)
    : (EU_REFERENCE_SNAPSHOTS[countryCode]?.reportedLoad ?? null);

  // Calcul rigoureux de la charge nette (Net Load) :
  // Net load = Total Load - (Solar + Wind)
  let netLoad: number | null = rawBreakdown?.netLoad ?? null;
  if (netLoad === null && totalConsumption !== null) {
    const solarVal = productionBreakdown.solar ?? 0;
    const windVal = productionBreakdown.wind ?? 0;
    netLoad = Math.max(0, Math.round(totalConsumption - (solarVal + windVal)));
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
  const fossilOnlyCarbonIntensity = computeFossilOnlyCarbonIntensity(
    productionBreakdown,
    rawCarbon?.fossilOnlyCarbonIntensity
  );

  const carbonIntensityLevel = rawCarbon?.carbonIntensityLevel ?? computeCarbonIntensityLevel(carbonIntensity);
  const carbonFreeLevel = rawCarbon?.carbonFreeLevel ?? computeCarbonFreeLevel(fossilFreePercentage);
  const renewableLevel = rawCarbon?.renewableLevel ?? computeRenewableLevel(renewablePercentage);

  // Échanges transfrontaliers
  const importTotal = rawBreakdown?.powerImportTotal !== undefined && rawBreakdown?.powerImportTotal !== null
    ? Math.round(rawBreakdown.powerImportTotal)
    : null;

  const exportTotal = rawBreakdown?.powerExportTotal !== undefined && rawBreakdown?.powerExportTotal !== null
    ? Math.round(rawBreakdown.powerExportTotal)
    : null;

  let netExport: number | null = null;
  if (exportTotal !== null && importTotal !== null) {
    netExport = exportTotal - importTotal;
  }

  // Décomposition des flux
  const exchangeFlows: CrossBorderFlow[] = [];
  if (rawBreakdown?.powerExportBreakdown) {
    for (const [toZone, flowVal] of Object.entries(rawBreakdown.powerExportBreakdown)) {
      if (flowVal && flowVal > 0) {
        exchangeFlows.push({
          fromZone: zoneKey,
          toZone,
          flowMW: Math.round(flowVal),
          isEstimated,
        });
      }
    }
  }

  if (rawBreakdown?.powerImportBreakdown) {
    for (const [fromZone, flowVal] of Object.entries(rawBreakdown.powerImportBreakdown)) {
      if (flowVal && flowVal > 0) {
        exchangeFlows.push({
          fromZone,
          toZone: zoneKey,
          flowMW: Math.round(flowVal),
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
