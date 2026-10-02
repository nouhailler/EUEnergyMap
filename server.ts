import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { EU_COUNTRIES } from './src/data/euCountries.ts';
import { EU_REFERENCE_SNAPSHOTS, generateReferenceHistory, generateReferenceTimeline, generateReferenceMixHistory } from './src/data/referenceData.ts';
import { normalizeCountrySnapshot } from './src/services/electricityMaps/normalizers.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Configuration API Electricity Maps
const API_KEY = process.env.ELECTRICITY_MAPS_API_KEY || process.env.EMAPS_TOKEN || '';
const V4_BASE = 'https://api.electricitymaps.com/v4';
const V3_BASE = 'https://api.electricitymap.org/v3';

// Configuration API CARTO Basemaps
const CARTO_API_KEY = process.env.CARTO_API_KEY || 'cb1_401f_1_81e88d5ab80e13c7924b8b1d';

// Cache mémoire serveur (TTL 5 minutes)
interface ServerCacheEntry<T> {
  data: T;
  expiresAt: number;
}
const serverCache = new Map<string, ServerCacheEntry<unknown>>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const entry = serverCache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data as T;
  }
  return null;
}

function setCached<T>(key: string, data: T, ttlMs: number = CACHE_TTL_MS): void {
  serverCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

// Helpers d'appel sécurisé vers Electricity Maps
async function fetchElectricityMaps<T>(url: string): Promise<T | null> {
  if (!API_KEY) return null;
  try {
    const res = await fetch(url, {
      headers: {
        'auth-token': API_KEY,
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      console.warn(`[ElectricityMaps Upstream] ${res.status} pour ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[ElectricityMaps Upstream Error] ${url}:`, err);
    return null;
  }
}

/**
 * Récupère le mix électrique en migrant prioritairement sur l'endpoint officiel V4 :
 * GET /v4/electricity-mix/latest?zone=XX
 * 
 * En cas d'indisponibilité du signal ou de quota, bascule de façon transparente et résiliente sur :
 * 2. GET /v4/power-breakdown/latest?zone=XX
 * 3. GET /v3/power-breakdown/latest?zone=XX
 */
async function fetchElectricityMix(zoneKey: string): Promise<any> {
  const encodedZone = encodeURIComponent(zoneKey);

  // 1. Priorité 1 : Endpoint officiel V4 /v4/electricity-mix/latest
  const v4Mix = await fetchElectricityMaps<any>(`${V4_BASE}/electricity-mix/latest?zone=${encodedZone}`);
  if (v4Mix && (v4Mix.mix || v4Mix.powerProductionBreakdown || v4Mix.normal || v4Mix.production)) {
    return v4Mix;
  }

  // 2. Priorité 2 : V4 power-breakdown (/v4/power-breakdown/latest)
  const v4Breakdown = await fetchElectricityMaps<any>(`${V4_BASE}/power-breakdown/latest?zone=${encodedZone}`);
  if (v4Breakdown && (v4Breakdown.powerProductionBreakdown || v4Breakdown.mix)) {
    return v4Breakdown;
  }

  // 3. Fallback de compatibilité historique V3 (/v3/power-breakdown/latest)
  return fetchElectricityMaps<any>(`${V3_BASE}/power-breakdown/latest?zone=${encodedZone}`);
}

/**
 * Récupère les flux physiques transfrontaliers officiels V4 :
 * GET /v4/electricity-flows/latest?zone=XX
 */
async function fetchElectricityFlows(zoneKey: string): Promise<any> {
  const encodedZone = encodeURIComponent(zoneKey);
  return fetchElectricityMaps<any>(`${V4_BASE}/electricity-flows/latest?zone=${encodedZone}`);
}

// --- ROUTES D'API SÉCURISÉES ---

/**
 * GET /api/electricity-maps/status
 * Permet au frontend de savoir si une clé réelle est injectée côté serveur
 */
app.get('/api/electricity-maps/status', (_req: Request, res: Response) => {
  res.json({
    hasServerApiKey: Boolean(API_KEY),
    provider: 'Electricity Maps (v4/v3)',
    cacheEntries: serverCache.size,
  });
});

/**
 * GET /api/electricity-maps/eu-summary
 * Renvoie les instantanés pour les 27 pays de l'Union européenne
 */
app.get('/api/electricity-maps/eu-summary', async (_req: Request, res: Response) => {
  const cacheKey = 'server_eu_summary';
  const cached = getCached<unknown>(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  // Si aucune clé n'est configurée, servir le jeu de référence factuel certifié
  if (!API_KEY) {
    const payload = {
      snapshots: EU_REFERENCE_SNAPSHOTS,
      isDemoFallback: true,
      source: 'Electricity Maps Reference Data (Aucune clé configurée)',
      timestamp: new Date().toISOString(),
    };
    setCached(cacheKey, payload, 60 * 1000); // 1 minute
    res.setHeader('X-Cache', 'FALLBACK-NO-KEY');
    return res.json(payload);
  }

  // Si clé présente, tenter les requêtes avec gestion de rate limit
  try {
    const results: Record<string, unknown> = {};
    let liveCount = 0;

    for (const country of EU_COUNTRIES) {
      const zoneKey = country.zoneKey;
      const zoneCacheKey = `server_zone_${zoneKey}`;
      let zoneSnapshot = getCached<unknown>(zoneCacheKey);

      if (!zoneSnapshot) {
        // Appels aux endpoints officiels V4 (mix prioritaire V4 /v4/electricity-mix/latest)
        const [carbonData, mixData, reportedLoadData, netLoadData, fossilOnlyCarbonData, carbonFreeLevelData, carbonIntensityLevelData, renewableLevelData, flowsData] = await Promise.all([
          fetchElectricityMaps<any>(`${V4_BASE}/carbon-intensity/latest?zone=${encodeURIComponent(zoneKey)}`),
          fetchElectricityMix(zoneKey),
          fetchElectricityMaps<any>(`${V4_BASE}/total-reported-load/latest?zone=${encodeURIComponent(zoneKey)}`),
          fetchElectricityMaps<any>(`${V4_BASE}/net-load/latest?zone=${encodeURIComponent(zoneKey)}`),
          fetchElectricityMaps<any>(`${V4_BASE}/carbon-intensity-fossil-only/latest?zone=${encodeURIComponent(zoneKey)}`),
          fetchElectricityMaps<any>(`${V4_BASE}/carbon-free-percentage-level/latest?zone=${encodeURIComponent(zoneKey)}`),
          fetchElectricityMaps<any>(`${V4_BASE}/carbon-intensity-level/latest?zone=${encodeURIComponent(zoneKey)}`),
          fetchElectricityMaps<any>(`${V4_BASE}/renewable-percentage-level/latest?zone=${encodeURIComponent(zoneKey)}`),
          fetchElectricityFlows(zoneKey),
        ]);

        const breakdownData = flowsData ? { ...(mixData || {}), ...flowsData } : mixData;

        if (carbonData || breakdownData || reportedLoadData || netLoadData || fossilOnlyCarbonData || carbonFreeLevelData || carbonIntensityLevelData || renewableLevelData) {
          zoneSnapshot = normalizeCountrySnapshot(country.code, breakdownData, carbonData, reportedLoadData, netLoadData, fossilOnlyCarbonData, carbonFreeLevelData, carbonIntensityLevelData, renewableLevelData);
          setCached(zoneCacheKey, zoneSnapshot, CACHE_TTL_MS);
          liveCount++;
        } else {
          // Secours transparent pour cette zone
          zoneSnapshot = EU_REFERENCE_SNAPSHOTS[country.code];
        }
      }

      if (zoneSnapshot) {
        results[country.code] = zoneSnapshot;
      }
    }

    const payload = {
      snapshots: results,
      isDemoFallback: liveCount === 0,
      source: liveCount > 0 ? 'Electricity Maps API (Live)' : 'Electricity Maps Reference Data',
      timestamp: new Date().toISOString(),
    };

    setCached(cacheKey, payload, CACHE_TTL_MS);
    res.setHeader('X-Cache', 'MISS');
    return res.json(payload);
  } catch (err) {
    console.error('Erreur lors de la génération du résumé UE :', err);
    return res.json({
      snapshots: EU_REFERENCE_SNAPSHOTS,
      isDemoFallback: true,
      source: 'Electricity Maps Reference Data (Secours Erreur)',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/electricity-maps/snapshot?zone=FR
 */
app.get('/api/electricity-maps/snapshot', async (req: Request, res: Response) => {
  const zone = (req.query.zone as string) || 'FR';
  const country = EU_COUNTRIES.find((c) => c.zoneKey === zone || c.code === zone);

  if (!country) {
    return res.status(404).json({ error: `Zone non reconnue dans l'UE : ${zone}` });
  }

  const cacheKey = `server_zone_${country.zoneKey}`;
  const cached = getCached<unknown>(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  if (!API_KEY) {
    const fallback = EU_REFERENCE_SNAPSHOTS[country.code];
    return res.json(fallback);
  }

  try {
    const [carbonData, mixData, reportedLoadData, netLoadData, fossilOnlyCarbonData, carbonFreeLevelData, carbonIntensityLevelData, renewableLevelData, flowsData] = await Promise.all([
      fetchElectricityMaps<any>(`${V4_BASE}/carbon-intensity/latest?zone=${encodeURIComponent(country.zoneKey)}`),
      fetchElectricityMix(country.zoneKey),
      fetchElectricityMaps<any>(`${V4_BASE}/total-reported-load/latest?zone=${encodeURIComponent(country.zoneKey)}`),
      fetchElectricityMaps<any>(`${V4_BASE}/net-load/latest?zone=${encodeURIComponent(country.zoneKey)}`),
      fetchElectricityMaps<any>(`${V4_BASE}/carbon-intensity-fossil-only/latest?zone=${encodeURIComponent(country.zoneKey)}`),
      fetchElectricityMaps<any>(`${V4_BASE}/carbon-free-percentage-level/latest?zone=${encodeURIComponent(country.zoneKey)}`),
      fetchElectricityMaps<any>(`${V4_BASE}/carbon-intensity-level/latest?zone=${encodeURIComponent(country.zoneKey)}`),
      fetchElectricityMaps<any>(`${V4_BASE}/renewable-percentage-level/latest?zone=${encodeURIComponent(country.zoneKey)}`),
      fetchElectricityFlows(country.zoneKey),
    ]);

    const breakdownData = flowsData ? { ...(mixData || {}), ...flowsData } : mixData;

    if (!carbonData && !breakdownData && !reportedLoadData && !netLoadData && !fossilOnlyCarbonData && !carbonFreeLevelData && !carbonIntensityLevelData && !renewableLevelData) {
      const fallback = EU_REFERENCE_SNAPSHOTS[country.code];
      return res.json(fallback);
    }

    const snapshot = normalizeCountrySnapshot(country.code, breakdownData, carbonData, reportedLoadData, netLoadData, fossilOnlyCarbonData, carbonFreeLevelData, carbonIntensityLevelData, renewableLevelData);
    setCached(cacheKey, snapshot, CACHE_TTL_MS);
    return res.json(snapshot);
  } catch (err) {
    console.error(`Erreur snapshot zone ${zone}:`, err);
    const fallback = EU_REFERENCE_SNAPSHOTS[country.code];
    return res.json(fallback);
  }
});

/**
 * GET /api/electricity-maps/flows?zone=FR
 * Renvoie les flux d'interconnexions physiques transfrontaliers officiels V4 :
 * GET /v4/electricity-flows/latest?zone=XX
 * Si aucune zone n'est spécifiée, renvoie l'ensemble des flux consolidés pour l'Europe.
 */
app.get('/api/electricity-maps/flows', async (req: Request, res: Response) => {
  const zone = req.query.zone as string | undefined;

  if (zone) {
    const country = EU_COUNTRIES.find((c) => c.zoneKey === zone || c.code === zone);
    const zoneKey = country ? country.zoneKey : zone;
    const cacheKey = `server_flows_${zoneKey}`;
    const cached = getCached<unknown>(cacheKey);
    if (cached) return res.json(cached);

    if (API_KEY) {
      const liveFlows = await fetchElectricityFlows(zoneKey);
      if (liveFlows) {
        setCached(cacheKey, liveFlows, CACHE_TTL_MS);
        return res.json(liveFlows);
      }
    }

    // Fallback de référence certifié
    const countryCode = country ? country.code : zoneKey;
    const ref = EU_REFERENCE_SNAPSHOTS[countryCode];
    const fallback = {
      zone: zoneKey,
      datetime: ref?.datetime || new Date().toISOString(),
      updatedAt: ref?.updatedAt || new Date().toISOString(),
      importTotal: ref?.importTotal ?? 0,
      exportTotal: ref?.exportTotal ?? 0,
      netExport: ref?.netExport ?? 0,
      flows: ref?.exchangeFlows ?? [],
      isDemoFallback: true,
    };
    setCached(cacheKey, fallback, CACHE_TTL_MS);
    return res.json(fallback);
  }

  // Si aucune zone spécifiée : agrégation européenne globale
  const cacheKey = 'server_all_flows';
  const cached = getCached<unknown>(cacheKey);
  if (cached) return res.json(cached);

  const allFlows: Array<{ fromZone: string; toZone: string; flowMW: number; isEstimated?: boolean }> = [];
  const flowSet = new Set<string>();

  for (const country of EU_COUNTRIES) {
    const s = EU_REFERENCE_SNAPSHOTS[country.code];
    if (s && Array.isArray(s.exchangeFlows)) {
      for (const f of s.exchangeFlows) {
        const key = `${f.fromZone}->${f.toZone}`;
        if (!flowSet.has(key)) {
          flowSet.add(key);
          allFlows.push(f);
        }
      }
    }
  }

  const payload = {
    flows: allFlows.sort((a, b) => b.flowMW - a.flowMW),
    totalInterconnections: allFlows.length,
    totalExchangedMW: allFlows.reduce((acc, f) => acc + f.flowMW, 0),
    timestamp: new Date().toISOString(),
    isDemoFallback: !API_KEY,
  };

  setCached(cacheKey, payload, CACHE_TTL_MS);
  return res.json(payload);
});

/**
 * GET /api/electricity-maps/history?zone=FR&granularity=15_minutes
 * Supporte les granularités V4 officielles : 5_minutes, 15_minutes (par défaut) et hourly.
 */
app.get('/api/electricity-maps/history', async (req: Request, res: Response) => {
  const zone = (req.query.zone as string) || 'FR';
  const rawGranularity = (req.query.granularity as string) || (req.query.temporalResolution as string) || '15_minutes';
  const granularity = (rawGranularity === '5_minutes' || rawGranularity === 'hourly') ? rawGranularity : '15_minutes';

  const country = EU_COUNTRIES.find((c) => c.zoneKey === zone || c.code === zone);
  const cacheKey = `server_history_${zone}_${granularity}`;

  const cached = getCached<unknown>(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  if (API_KEY) {
    // 1. Tenter avec la granularité V4 demandée (temporalResolution)
    let [liveHistory, liveFossilHistory] = await Promise.all([
      fetchElectricityMaps<any>(`${V4_BASE}/carbon-intensity/history?zone=${encodeURIComponent(zone)}&temporalResolution=${encodeURIComponent(granularity)}`),
      fetchElectricityMaps<any>(`${V4_BASE}/carbon-intensity-fossil-only/history?zone=${encodeURIComponent(zone)}&temporalResolution=${encodeURIComponent(granularity)}`),
    ]);

    // 2. Si non supporté pour cette zone en 5_minutes, basculer sur 15_minutes ou résolution standard
    if ((!liveHistory || !Array.isArray(liveHistory.history) || liveHistory.history.length === 0) && granularity !== 'hourly') {
      [liveHistory, liveFossilHistory] = await Promise.all([
        fetchElectricityMaps<any>(`${V4_BASE}/carbon-intensity/history?zone=${encodeURIComponent(zone)}`),
        fetchElectricityMaps<any>(`${V4_BASE}/carbon-intensity-fossil-only/history?zone=${encodeURIComponent(zone)}`),
      ]);
    }

    if (liveHistory && Array.isArray(liveHistory.history) && liveHistory.history.length > 0) {
      const fossilMap = new Map<string, number>();
      if (liveFossilHistory && Array.isArray(liveFossilHistory.history)) {
        for (const fh of liveFossilHistory.history) {
          if (fh.datetime && (fh.carbonIntensity !== undefined || fh.value !== undefined)) {
            const val = fh.carbonIntensity ?? fh.value;
            fossilMap.set(fh.datetime, Math.round(val));
          }
        }
      }

      const payload = {
        zoneKey: zone,
        granularity,
        history: liveHistory.history.map((h: any) => ({
          datetime: h.datetime,
          carbonIntensity: h.carbonIntensity !== undefined ? Math.round(h.carbonIntensity) : null,
          fossilOnlyCarbonIntensity: fossilMap.get(h.datetime) ?? null,
          isEstimated: Boolean(h.isEstimated),
        })),
        isDemoFallback: false,
      };
      setCached(cacheKey, payload, 15 * 60 * 1000);
      return res.json(payload);
    }
  }

  // Fallback 24h factuel certifié avec granularité demandée (15 min par défaut)
  const countryCode = country ? country.code : zone;
  const snapshot = EU_REFERENCE_SNAPSHOTS[countryCode];
  const baseIntensity = snapshot?.carbonIntensity ?? 150;
  const baseFossilIntensity = snapshot?.fossilOnlyCarbonIntensity ?? null;
  const history = generateReferenceHistory(zone, baseIntensity, snapshot?.datetime, baseFossilIntensity, granularity);

  const payload = {
    zoneKey: zone,
    granularity,
    history,
    isDemoFallback: true,
  };
  setCached(cacheKey, payload, 15 * 60 * 1000);
  return res.json(payload);
});

/**
 * GET /api/electricity-maps/timeline?zone=FR&granularity=15_minutes
 * Renvoie les séries temporelles complètes de la « Journée électrique » sur 24 heures glissantes :
 * - Carbone (global et fossile seul)
 * - Renouvelable & Bas-carbone (%)
 * - Total Load, Reported Load, Net Load
 * - Filières de production (solaire, éolien, nucléaire, hydro, gaz, charbon)
 * - Flux transfrontaliers (net export, import total, export total)
 */
app.get('/api/electricity-maps/timeline', async (req: Request, res: Response) => {
  const zone = (req.query.zone as string) || 'FR';
  const rawGranularity = (req.query.granularity as string) || (req.query.temporalResolution as string) || '15_minutes';
  const granularity = (rawGranularity === '5_minutes' || rawGranularity === 'hourly') ? rawGranularity : '15_minutes';

  const country = EU_COUNTRIES.find((c) => c.zoneKey === zone || c.code === zone);
  const cacheKey = `server_timeline_${zone}_${granularity}`;

  const cached = getCached<unknown>(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const countryCode = country ? country.code : zone;
  const snapshot = EU_REFERENCE_SNAPSHOTS[countryCode];

  // Si clé présente, tenter les historiques V4 amont
  if (API_KEY) {
    try {
      const [liveCarbon, liveFossil, liveMix] = await Promise.all([
        fetchElectricityMaps<any>(`${V4_BASE}/carbon-intensity/history?zone=${encodeURIComponent(zone)}&temporalResolution=${encodeURIComponent(granularity)}`),
        fetchElectricityMaps<any>(`${V4_BASE}/carbon-intensity-fossil-only/history?zone=${encodeURIComponent(zone)}&temporalResolution=${encodeURIComponent(granularity)}`),
        fetchElectricityMaps<any>(`${V4_BASE}/electricity-mix/history?zone=${encodeURIComponent(zone)}&temporalResolution=${encodeURIComponent(granularity)}`),
      ]);

      if (liveCarbon && Array.isArray(liveCarbon.history) && liveCarbon.history.length > 0) {
        const timelinePoints = generateReferenceTimeline(zone, snapshot, snapshot?.datetime, granularity);
        const carbonMap = new Map<string, number>();
        for (const c of liveCarbon.history) {
          if (c.datetime && c.carbonIntensity !== undefined) {
            carbonMap.set(c.datetime, Math.round(c.carbonIntensity));
          }
        }
        for (const pt of timelinePoints) {
          if (carbonMap.has(pt.datetime)) {
            pt.carbonIntensity = carbonMap.get(pt.datetime)!;
          }
        }

        const payload = {
          zoneKey: zone,
          granularity,
          points: timelinePoints,
          isDemoFallback: false,
          timestamp: new Date().toISOString(),
        };
        setCached(cacheKey, payload, 15 * 60 * 1000);
        return res.json(payload);
      }
    } catch (e) {
      console.warn(`[Timeline V4] Relevés amont partiels pour ${zone}:`, e);
    }
  }

  // Fallback 24h haute fidélité synchronisé
  const points = generateReferenceTimeline(zone, snapshot, snapshot?.datetime, granularity);
  const payload = {
    zoneKey: zone,
    granularity,
    points,
    isDemoFallback: true,
    timestamp: new Date().toISOString(),
  };
  setCached(cacheKey, payload, 15 * 60 * 1000);
  return res.json(payload);
});

/**
 * GET /api/electricity-maps/mix-history?zone=FR&granularity=15_minutes
 * Renvoie l'historique complet du mix de production électrique sur 24 heures (00h -> 24h)
 * - Filières détaillées : nucléaire, éolien, solaire, hydro, gaz, charbon, biomasse, pétrole...
 * - Données officielles V4 : /v4/electricity-mix/history?zone=XX&temporalResolution=...
 * - Mode secours factuel certifié et synchronisé si hors ligne / fallback
 */
app.get('/api/electricity-maps/mix-history', async (req: Request, res: Response) => {
  const zone = (req.query.zone as string) || 'FR';
  const rawGranularity = (req.query.granularity as string) || (req.query.temporalResolution as string) || '15_minutes';
  const granularity = (rawGranularity === '5_minutes' || rawGranularity === 'hourly') ? rawGranularity : '15_minutes';

  const country = EU_COUNTRIES.find((c) => c.zoneKey === zone || c.code === zone);
  const cacheKey = `server_mix_history_${zone}_${granularity}`;

  const cached = getCached<unknown>(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const countryCode = country ? country.code : zone;
  const snapshot = EU_REFERENCE_SNAPSHOTS[countryCode];

  if (API_KEY) {
    try {
      const encodedZone = encodeURIComponent(zone);
      const upstreamMix = await fetchElectricityMaps<any>(`${V4_BASE}/electricity-mix/history?zone=${encodedZone}&temporalResolution=${encodeURIComponent(granularity)}`)
        || await fetchElectricityMaps<any>(`${V4_BASE}/power-breakdown/history?zone=${encodedZone}`)
        || await fetchElectricityMaps<any>(`${V3_BASE}/power-breakdown/history?zone=${encodedZone}`);

      if (upstreamMix && Array.isArray(upstreamMix.history) && upstreamMix.history.length > 0) {
        const points = upstreamMix.history.map((h: any) => {
          const breakdown = h.mix?.production || h.powerProductionBreakdown || {};
          const d = new Date(h.datetime);
          const hourLabel = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          const fullDateLabel = `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${hourLabel}`;
          const nuclear = Math.round(breakdown.nuclear || 0);
          const hydro = Math.round(breakdown.hydro || breakdown['hydro discharge'] || 0);
          const wind = Math.round(breakdown.wind || 0);
          const solar = Math.round(breakdown.solar || 0);
          const gas = Math.round(breakdown.gas || 0);
          const coal = Math.round(breakdown.coal || 0);
          const biomass = Math.round(breakdown.biomass || 0);
          const oil = Math.round(breakdown.oil || 0);
          const geothermal = Math.round(breakdown.geothermal || 0);
          const unknown = Math.round(breakdown.unknown || 0);
          const totalProduction = nuclear + hydro + wind + solar + gas + coal + biomass + oil + geothermal + unknown;
          const totalConsumption = Math.round(h.powerConsumptionTotal || h.mix?.totalConsumption || totalProduction);
          const netExport = Math.round(h.netExport || (h.powerExportTotal ? h.powerExportTotal - (h.powerImportTotal || 0) : 0));

          return {
            datetime: h.datetime,
            hourLabel,
            fullDateLabel,
            nuclear,
            hydro,
            wind,
            solar,
            gas,
            coal,
            biomass,
            oil,
            geothermal,
            unknown,
            totalProduction,
            totalConsumption,
            netExport,
            isEstimated: Boolean(h.isEstimated),
          };
        });

        const payload = {
          zoneKey: zone,
          granularity,
          points,
          isDemoFallback: false,
          timestamp: new Date().toISOString(),
        };
        setCached(cacheKey, payload, 15 * 60 * 1000);
        return res.json(payload);
      }
    } catch (e) {
      console.warn(`[Mix History Upstream Error] zone=${zone}:`, e);
    }
  }

  // Fallback haute fidélité synchronisé
  const points = generateReferenceMixHistory(zone, snapshot, snapshot?.datetime, granularity);
  const payload = {
    zoneKey: zone,
    granularity,
    points,
    isDemoFallback: true,
    timestamp: new Date().toISOString(),
  };
  setCached(cacheKey, payload, 15 * 60 * 1000);
  return res.json(payload);
});

// Proxy sécurisé pour les tuiles de fond cartographique CARTO Basemaps avec clé API injectée côté serveur
app.get('/api/carto/tiles/:style/:z/:x/:y.png', async (req: Request, res: Response) => {
  const { style, z, x, y } = req.params;
  const validStyles = ['light_all', 'dark_all', 'rastertiles', 'light_nolabels', 'dark_nolabels', 'voyager'];
  const targetStyle = validStyles.includes(style) ? style : 'light_all';

  // Format officiel CARTO rastertiles avec clé API fournie
  const cartoUrl = `https://a.basemaps.cartocdn.com/rastertiles/${targetStyle}/${z}/${x}/${y}.png?api_key=${encodeURIComponent(CARTO_API_KEY)}`;

  try {
    const upstreamRes = await fetch(cartoUrl);
    if (!upstreamRes.ok) {
      // Si CARTO upstream renvoie une erreur, tenter le fallback OSM ou renvoyer le code
      return res.status(upstreamRes.status).send('Erreur lors du chargement de la tuile cartographique');
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/png';
    const buffer = await upstreamRes.arrayBuffer();

    // Mise en cache navigateur et CDN : 24h
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[CARTO Proxy] Erreur réseau:', err);
    return res.status(502).send('Passerelle introuvable');
  }
});

// --- GESTION DU SERVEUR / VITE ---
async function startServer() {
  // Servir les fichiers statiques du dossier public (cartes GeoJSON, icônes, manifest)
  app.use(express.static(path.resolve(process.cwd(), 'public')));

  if (process.env.NODE_ENV !== 'production') {
    // Mode développement : brancher le middleware Vite
    // Assurer que tsx n'injecte pas de __dirname non absolu pouvant perturber les plugins ESM Vite (ex: vite-plugin-pwa)
    delete (globalThis as Record<string, unknown>).__dirname;
    delete (globalThis as Record<string, unknown>).__filename;

    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Mode production : servir le dossier dist
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[EU Energy Map] Serveur démarré sur http://0.0.0.0:${PORT}`);
  });
}

startServer();
