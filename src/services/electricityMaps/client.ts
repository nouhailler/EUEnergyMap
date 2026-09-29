import { CountryElectricitySnapshot, CountryHistoryData, CarbonHistoryPoint } from '../../types/energy';
import { clientCache } from './cache';
import { EU_REFERENCE_SNAPSHOTS, generateReferenceHistory } from '../../data/referenceData';

const IN_FLIGHT_PROMISES = new Map<string, Promise<unknown>>();

function sanitizeSnapshot(s: CountryElectricitySnapshot): CountryElectricitySnapshot {
  if (!s) return s;
  return {
    ...s,
    exchangeFlows: Array.isArray(s.exchangeFlows) ? s.exchangeFlows : [],
    productionBreakdown: s.productionBreakdown || {
      nuclear: null,
      geothermal: null,
      biomass: null,
      coal: null,
      wind: null,
      solar: null,
      hydro: null,
      gas: null,
      oil: null,
      unknown: null,
    },
    subZones: Array.isArray(s.subZones) ? s.subZones : [],
  };
}

function sanitizeSummary(res: EUSummaryResponse): EUSummaryResponse {
  if (!res || !res.snapshots) return res;
  const sanitizedSnapshots: Record<string, CountryElectricitySnapshot> = {};
  for (const [code, s] of Object.entries(res.snapshots)) {
    sanitizedSnapshots[code] = sanitizeSnapshot(s);
  }
  return {
    ...res,
    snapshots: sanitizedSnapshots,
  };
}

export interface EUSummaryResponse {
  snapshots: Record<string, CountryElectricitySnapshot>;
  isDemoFallback: boolean;
  source: string;
  timestamp: string;
}

export interface ZoneHistoryResponse {
  zoneKey: string;
  history: CarbonHistoryPoint[];
  isDemoFallback: boolean;
}

export class ElectricityMapsClient {
  private baseUrl = '/api/electricity-maps';

  /**
   * Récupère les instantanés pour l'ensemble des 27 pays de l'Union Européenne
   */
  async getEUSummary(forceRefresh = false): Promise<EUSummaryResponse> {
    const cacheKey = 'eu_summary_v1';

    if (!forceRefresh) {
      const cached = clientCache.get<EUSummaryResponse>(cacheKey);
      if (cached) return sanitizeSummary(cached);
    }

    if (IN_FLIGHT_PROMISES.has(cacheKey)) {
      return IN_FLIGHT_PROMISES.get(cacheKey) as Promise<EUSummaryResponse>;
    }

    const promise = (async () => {
      try {
        const res = await fetch(`${this.baseUrl}/eu-summary`, {
          headers: { Accept: 'application/json' },
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} lors de la récupération du résumé UE`);
        }

        const rawData: EUSummaryResponse = await res.json();
        const data = sanitizeSummary(rawData);
        clientCache.set(cacheKey, data, 5 * 60 * 1000); // 5 min TTL
        return data;
      } catch (err) {
        console.warn('Erreur réseau ou proxy, vérification du cache stale ou fallback:', err);
        const stale = clientCache.getStale<EUSummaryResponse>(cacheKey);
        if (stale) {
          return sanitizeSummary({
            ...stale.data,
            source: 'Cache hors-ligne local',
          });
        }

        // Fallback ultime sur données de référence certifiées
        return sanitizeSummary({
          snapshots: EU_REFERENCE_SNAPSHOTS,
          isDemoFallback: true,
          source: 'Données de référence vérifiées (Mode dégradé)',
          timestamp: new Date().toISOString(),
        });
      } finally {
        IN_FLIGHT_PROMISES.delete(cacheKey);
      }
    })();

    IN_FLIGHT_PROMISES.set(cacheKey, promise);
    return promise;
  }

  /**
   * Récupère l'instantané détaillé d'une zone spécifique
   */
  async getZoneSnapshot(zoneKey: string, forceRefresh = false): Promise<CountryElectricitySnapshot> {
    const cacheKey = `zone_snapshot_${zoneKey}`;

    if (!forceRefresh) {
      const cached = clientCache.get<CountryElectricitySnapshot>(cacheKey);
      if (cached) return sanitizeSnapshot(cached);
    }

    if (IN_FLIGHT_PROMISES.has(cacheKey)) {
      return IN_FLIGHT_PROMISES.get(cacheKey) as Promise<CountryElectricitySnapshot>;
    }

    const promise = (async () => {
      try {
        const res = await fetch(`${this.baseUrl}/snapshot?zone=${encodeURIComponent(zoneKey)}`);
        if (!res.ok) {
          throw new Error(`Erreur HTTP ${res.status} pour la zone ${zoneKey}`);
        }
        const rawData: CountryElectricitySnapshot = await res.json();
        const data = sanitizeSnapshot(rawData);
        clientCache.set(cacheKey, data, 5 * 60 * 1000);
        return data;
      } catch (err) {
        console.warn(`Snapshot pour ${zoneKey} indisponible, récupération secours :`, err);
        const stale = clientCache.getStale<CountryElectricitySnapshot>(cacheKey);
        if (stale) return sanitizeSnapshot(stale.data);

        // Fallback par pays
        const ref = EU_REFERENCE_SNAPSHOTS[zoneKey];
        if (ref) return sanitizeSnapshot(ref);

        throw err;
      } finally {
        IN_FLIGHT_PROMISES.delete(cacheKey);
      }
    })();

    IN_FLIGHT_PROMISES.set(cacheKey, promise);
    return promise;
  }

  /**
   * Récupère l'historique 24h d'une zone
   */
  async getZoneHistory(
    zoneKey: string,
    fallbackIntensity?: number,
    referenceDate?: string | Date
  ): Promise<CountryHistoryData> {
    const cacheKey = `zone_history_${zoneKey}`;
    const cached = clientCache.get<CountryHistoryData>(cacheKey);
    if (cached && Array.isArray(cached.history) && cached.history.length > 0) return cached;

    try {
      const res = await fetch(`${this.baseUrl}/history?zone=${encodeURIComponent(zoneKey)}`);
      if (!res.ok) {
        throw new Error(`Erreur HTTP ${res.status}`);
      }
      const data: ZoneHistoryResponse = await res.json();
      const result: CountryHistoryData = {
        zoneKey: data?.zoneKey || zoneKey,
        history: Array.isArray(data?.history) ? data.history : [],
      };
      if (result.history.length > 0) {
        clientCache.set(cacheKey, result, 15 * 60 * 1000);
        return result;
      }
      throw new Error('Empty history returned');
    } catch {
      const snapshot = EU_REFERENCE_SNAPSHOTS[zoneKey];
      const baseIntensity = fallbackIntensity ?? snapshot?.carbonIntensity ?? 150;
      const history = generateReferenceHistory(zoneKey, baseIntensity, referenceDate || snapshot?.datetime);
      return {
        zoneKey,
        history: Array.isArray(history) ? history : [],
      };
    }
  }
}

export const emapsClient = new ElectricityMapsClient();
