import { CountryElectricitySnapshot, CountryHistoryData, CarbonHistoryPoint } from '../../types/energy';
import { clientCache } from './cache';
import { EU_REFERENCE_SNAPSHOTS, generateReferenceHistory } from '../../data/referenceData';

const IN_FLIGHT_PROMISES = new Map<string, Promise<unknown>>();

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
      if (cached) return cached;
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

        const data: EUSummaryResponse = await res.json();
        clientCache.set(cacheKey, data, 5 * 60 * 1000); // 5 min TTL
        return data;
      } catch (err) {
        console.warn('Erreur réseau ou proxy, vérification du cache stale ou fallback:', err);
        const stale = clientCache.getStale<EUSummaryResponse>(cacheKey);
        if (stale) {
          return {
            ...stale.data,
            source: 'Cache hors-ligne local',
          };
        }

        // Fallback ultime sur données de référence certifiées
        return {
          snapshots: EU_REFERENCE_SNAPSHOTS,
          isDemoFallback: true,
          source: 'Données de référence vérifiées (Mode dégradé)',
          timestamp: new Date().toISOString(),
        };
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
      if (cached) return cached;
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
        const data: CountryElectricitySnapshot = await res.json();
        clientCache.set(cacheKey, data, 5 * 60 * 1000);
        return data;
      } catch (err) {
        console.warn(`Snapshot pour ${zoneKey} indisponible, récupération secours :`, err);
        const stale = clientCache.getStale<CountryElectricitySnapshot>(cacheKey);
        if (stale) return stale.data;

        // Fallback par pays
        const ref = EU_REFERENCE_SNAPSHOTS[zoneKey];
        if (ref) return ref;

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
  async getZoneHistory(zoneKey: string): Promise<CountryHistoryData> {
    const cacheKey = `zone_history_${zoneKey}`;
    const cached = clientCache.get<CountryHistoryData>(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`${this.baseUrl}/history?zone=${encodeURIComponent(zoneKey)}`);
      if (!res.ok) {
        throw new Error(`Erreur HTTP ${res.status}`);
      }
      const data: ZoneHistoryResponse = await res.json();
      const result: CountryHistoryData = {
        zoneKey: data.zoneKey,
        history: data.history,
      };
      clientCache.set(cacheKey, result, 15 * 60 * 1000);
      return result;
    } catch {
      const snapshot = EU_REFERENCE_SNAPSHOTS[zoneKey];
      const baseIntensity = snapshot?.carbonIntensity ?? 150;
      const history = generateReferenceHistory(zoneKey, baseIntensity);
      return {
        zoneKey,
        history,
      };
    }
  }
}

export const emapsClient = new ElectricityMapsClient();
