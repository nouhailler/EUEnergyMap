import { CountryElectricitySnapshot, CountryHistoryData, CarbonHistoryPoint, TemporalGranularity, TimelineData, TimelineHistoryPoint, MixHistoryData, FlowsHistoryData } from '../../types/energy';
import { clientCache } from './cache';
import { EU_REFERENCE_SNAPSHOTS, getLastKnownObservation } from '../../data/referenceData';

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
   * Récupère l'historique 24h d'une zone avec support des granularités V4
   * ('15_minutes' par défaut, '5_minutes', 'hourly')
   * Règle stricte « Zéro donnée inventée » : Aucune courbe artificielle générée par sinus.
   */
  async getZoneHistory(
    zoneKey: string,
    fallbackIntensity?: number,
    referenceDate?: string | Date,
    granularity: TemporalGranularity = '15_minutes'
  ): Promise<CountryHistoryData> {
    const cacheKey = `zone_history_${zoneKey}_${granularity}`;
    const cached = clientCache.get<CountryHistoryData>(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`${this.baseUrl}/history?zone=${encodeURIComponent(zoneKey)}&granularity=${encodeURIComponent(granularity)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.history) && data.history.length > 0) {
          const result: CountryHistoryData = {
            zoneKey: data.zoneKey || zoneKey,
            granularity,
            history: data.history,
            isDemoFallback: Boolean(data.isDemoFallback),
          };
          clientCache.set(cacheKey, result, 15 * 60 * 1000);
          return result;
        }
        if (data && data.isUnavailable) {
          const result: CountryHistoryData = {
            zoneKey: data.zoneKey || zoneKey,
            granularity,
            history: [],
            isUnavailable: true,
            message: data.message || "Donnée historique indisponible (aucune courbe synthétique n'est générée)",
            lastKnown: data.lastKnown,
          };
          clientCache.set(cacheKey, result, 15 * 60 * 1000);
          return result;
        }
      }
    } catch {
      // Indisponibilité réseau
    }

    const snapshot = EU_REFERENCE_SNAPSHOTS[zoneKey];
    const lastKnown = getLastKnownObservation(snapshot);
    const result: CountryHistoryData = {
      zoneKey,
      granularity,
      history: [],
      isUnavailable: true,
      message: "Donnée historique indisponible (aucune courbe synthétique n'est générée)",
      lastKnown,
    };
    clientCache.set(cacheKey, result, 15 * 60 * 1000);
    return result;
  }

  /**
   * Récupère les séries temporelles complètes de la « Journée électrique » (24h)
   * Couvre : Carbone, Renouvelable, Bas-carbone, Total Load, Reported Load, Net Load,
   * Solaire, Éolien, Nucléaire, Flux transfrontaliers.
   * Règle d'intégrité stricte : aucune courbe fabriquée par sinus.
   */
  async getZoneTimeline(
    zoneKey: string,
    granularity: TemporalGranularity = '15_minutes'
  ): Promise<TimelineData> {
    const cacheKey = `zone_timeline_${zoneKey}_${granularity}`;
    const cached = clientCache.get<TimelineData>(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`${this.baseUrl}/timeline?zone=${encodeURIComponent(zoneKey)}&granularity=${encodeURIComponent(granularity)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.points) && data.points.length > 0) {
          const result: TimelineData = {
            zoneKey: data.zoneKey || zoneKey,
            granularity,
            points: data.points,
            isDemoFallback: Boolean(data.isDemoFallback),
          };
          clientCache.set(cacheKey, result, 15 * 60 * 1000);
          return result;
        }
        if (data && data.isUnavailable) {
          const result: TimelineData = {
            zoneKey: data.zoneKey || zoneKey,
            granularity,
            points: [],
            isUnavailable: true,
            message: data.message || "Donnée historique 24h indisponible (aucune courbe synthétique n'est générée)",
            lastKnown: data.lastKnown,
          };
          clientCache.set(cacheKey, result, 15 * 60 * 1000);
          return result;
        }
      }
    } catch {
      // Indisponibilité réseau
    }

    const snapshot = EU_REFERENCE_SNAPSHOTS[zoneKey];
    const lastKnown = getLastKnownObservation(snapshot);
    const result: TimelineData = {
      zoneKey,
      granularity,
      points: [],
      isUnavailable: true,
      message: "Donnée historique 24h indisponible (aucune courbe synthétique n'est générée)",
      lastKnown,
    };
    clientCache.set(cacheKey, result, 15 * 60 * 1000);
    return result;
  }

  /**
   * Récupère l'historique complet du mix électrique sur 24h
   * (nucléaire, éolien, solaire, hydraulique, gaz, charbon, biomasse...)
   * Règle d'intégrité stricte : aucune courbe fabriquée par sinus.
   */
  async getZoneMixHistory(
    zoneKey: string,
    granularity: TemporalGranularity = '15_minutes'
  ): Promise<MixHistoryData> {
    const cacheKey = `zone_mix_history_${zoneKey}_${granularity}`;
    const cached = clientCache.get<MixHistoryData>(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`${this.baseUrl}/mix-history?zone=${encodeURIComponent(zoneKey)}&granularity=${encodeURIComponent(granularity)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.points) && data.points.length > 0) {
          const result: MixHistoryData = {
            zoneKey: data.zoneKey || zoneKey,
            granularity,
            points: data.points,
            isDemoFallback: Boolean(data.isDemoFallback),
            timestamp: data.timestamp,
          };
          clientCache.set(cacheKey, result, 15 * 60 * 1000);
          return result;
        }
        if (data && data.isUnavailable) {
          const result: MixHistoryData = {
            zoneKey: data.zoneKey || zoneKey,
            granularity,
            points: [],
            isUnavailable: true,
            message: data.message || "Historique du mix 24h indisponible (aucune courbe synthétique n'est générée)",
            lastKnown: data.lastKnown,
          };
          clientCache.set(cacheKey, result, 15 * 60 * 1000);
          return result;
        }
      }
    } catch {
      // Indisponibilité réseau
    }

    const snapshot = EU_REFERENCE_SNAPSHOTS[zoneKey];
    const lastKnown = getLastKnownObservation(snapshot);
    const result: MixHistoryData = {
      zoneKey,
      granularity,
      points: [],
      isUnavailable: true,
      message: "Historique du mix 24h indisponible (aucune courbe synthétique n'est générée)",
      lastKnown,
    };
    clientCache.set(cacheKey, result, 15 * 60 * 1000);
    return result;
  }

  /**
   * Récupère l'historique complet des flux physiques transfrontaliers sur 24h
   * Conforme à l'endpoint V4 : /v4/electricity-flows/history?zone=XX
   * Règle d'intégrité stricte : aucune courbe fabriquée par sinus.
   */
  async getZoneFlowsHistory(
    zoneKey: string,
    granularity: TemporalGranularity = '15_minutes'
  ): Promise<FlowsHistoryData> {
    const cacheKey = `zone_flows_history_${zoneKey}_${granularity}`;
    const cached = clientCache.get<FlowsHistoryData>(cacheKey);
    if (cached) return cached;

    const snapshot = EU_REFERENCE_SNAPSHOTS[zoneKey];
    const rawInterconnectors = Array.isArray(snapshot?.exchangeFlows) ? snapshot.exchangeFlows : [];
    const defaultInterconnectors = rawInterconnectors.map((f) => {
      const isExport = f.fromZone === zoneKey;
      const peer = isExport ? f.toZone : f.fromZone;
      return {
        peerZone: peer,
        peerNameFr: peer,
        peerFlag: '🌐',
        pairKey: `${f.fromZone}->${f.toZone}`,
        label: `${f.fromZone} → ${f.toZone}`,
        reverseLabel: `${f.toZone} → ${f.fromZone}`,
      };
    });

    try {
      const res = await fetch(`${this.baseUrl}/flows-history?zone=${encodeURIComponent(zoneKey)}&granularity=${encodeURIComponent(granularity)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.points) && data.points.length > 0) {
          const result: FlowsHistoryData = {
            zoneKey: data.zoneKey || zoneKey,
            granularity,
            points: data.points,
            interconnectors: Array.isArray(data.interconnectors) && data.interconnectors.length > 0 ? data.interconnectors : defaultInterconnectors,
            isDemoFallback: Boolean(data.isDemoFallback),
            timestamp: data.timestamp,
          };
          clientCache.set(cacheKey, result, 15 * 60 * 1000);
          return result;
        }
        if (data && data.isUnavailable) {
          const result: FlowsHistoryData = {
            zoneKey: data.zoneKey || zoneKey,
            granularity,
            points: [],
            interconnectors: Array.isArray(data.interconnectors) && data.interconnectors.length > 0 ? data.interconnectors : defaultInterconnectors,
            isUnavailable: true,
            message: data.message || "Historique des flux 24h indisponible (aucune courbe synthétique n'est générée)",
            lastKnown: data.lastKnown,
          };
          clientCache.set(cacheKey, result, 15 * 60 * 1000);
          return result;
        }
      }
    } catch {
      // Indisponibilité réseau
    }

    const lastKnown = getLastKnownObservation(snapshot);
    const result: FlowsHistoryData = {
      zoneKey,
      granularity,
      points: [],
      interconnectors: defaultInterconnectors,
      isUnavailable: true,
      message: "Historique des flux 24h indisponible (aucune courbe synthétique n'est générée)",
      lastKnown,
    };
    clientCache.set(cacheKey, result, 15 * 60 * 1000);
    return result;
  }
}

export const emapsClient = new ElectricityMapsClient();
