import {
  CountryElectricitySnapshot,
  ProductionSourceKey,
  DataQualityStatus,
  CrossBorderFlow,
} from '../../types/energy';
import { EU_COUNTRIES, EU_ZONE_MAP } from '../../data/euCountries';
import { EU_REFERENCE_SNAPSHOTS } from '../../data/referenceData';

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
  isEstimated?: boolean;
  estimationMethod?: string | null;
}

export interface RawElectricityMapsCarbon {
  zone?: string;
  carbonIntensity?: number | null;
  datetime?: string;
  updatedAt?: string;
  isEstimated?: boolean;
  estimationMethod?: string | null;
}

/**
 * Normalise et fusionne les réponses brutes d'Electricity Maps (v3/v4)
 * pour produire un CountryElectricitySnapshot conforme aux règles du projet :
 * - Aucune conversion de null en zéro
 * - Traçabilité des estimations
 * - Calcul certifié de la charge nette et du solde d'échanges
 */
export function normalizeCountrySnapshot(
  countryCode: string,
  rawBreakdown?: RawElectricityMapsBreakdown | null,
  rawCarbon?: RawElectricityMapsCarbon | null,
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

  let carbonIntensityLevel: 'low' | 'medium' | 'high' | 'very-high' | null = null;
  if (carbonIntensity !== null) {
    if (carbonIntensity < 100) carbonIntensityLevel = 'low';
    else if (carbonIntensity < 250) carbonIntensityLevel = 'medium';
    else if (carbonIntensity < 500) carbonIntensityLevel = 'high';
    else carbonIntensityLevel = 'very-high';
  }

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
      // Si la valeur est null ou undefined, on laisse null
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

  const reportedLoad = totalConsumption; // Par convention dans l'API

  // Calcul rigoureux de la charge nette (Net Load) :
  // Net load = Total Load - (Solar + Wind)
  let netLoad: number | null = null;
  if (totalConsumption !== null) {
    const solarVal = productionBreakdown.solar ?? 0;
    const windVal = productionBreakdown.wind ?? 0;
    // Si au moins l'un des deux est disponible ou que totalConsumption est défini
    netLoad = Math.max(0, Math.round(totalConsumption - (solarVal + windVal)));
  }

  // Parts sans carbone et renouvelable
  const fossilFreePercentage = rawBreakdown?.fossilFreePercentage !== undefined && rawBreakdown?.fossilFreePercentage !== null
    ? Math.round(rawBreakdown.fossilFreePercentage)
    : null;

  const renewablePercentage = rawBreakdown?.renewablePercentage !== undefined && rawBreakdown?.renewablePercentage !== null
    ? Math.round(rawBreakdown.renewablePercentage)
    : null;

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
        // Flux entrant
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
    carbonIntensity,
    carbonIntensityLevel,
    fossilFreePercentage,
    renewablePercentage,
    totalProduction,
    totalConsumption,
    reportedLoad,
    netLoad,
    productionBreakdown,
    importTotal,
    exportTotal,
    netExport,
    exchangeFlows,
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
