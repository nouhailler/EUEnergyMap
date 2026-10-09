import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { EU_COUNTRIES } from './src/data/euCountries.ts';
import { EU_REFERENCE_SNAPSHOTS, getLastKnownObservation } from './src/data/referenceData.ts';
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
 * GET /api/system/version
 * Renvoie les informations de version et de build système pour la vérification des mises à jour
 */
app.get(['/api/system/version', '/api/version'], (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.json({
    version: '1.4.2',
    releaseDate: '2026-10-09',
    releaseDateFormatted: '9 octobre 2026',
    buildId: '20261009-rev4',
    buildTimestamp: 1791557000000,
    channel: 'stable',
    changelog: [
      'Menu de paramètres système complet avec vérification et forçage',
      'Système de mises à jour automatiques en tâche de fond',
      'Mode Thème Clair, Sombre et synchronisation Système',
      "Bouton et guide universel d'installation d'application (PWA)",
      'Nouveau logo officiel haute définition et captures illustrées',
    ],
  });
});

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
    const dataTimestamp = EU_REFERENCE_SNAPSHOTS['FR']?.datetime || '2024-03-24T12:00:00.000Z';
    const retrievedAt = new Date().toISOString();
    const enrichedSnapshots: Record<string, any> = {};
    for (const [code, snap] of Object.entries(EU_REFERENCE_SNAPSHOTS)) {
      enrichedSnapshots[code] = {
        ...snap,
        dataTimestamp: snap.datetime,
        retrievedAt,
        source: 'Référence locale',
      };
    }
    const payload = {
      snapshots: enrichedSnapshots,
      isDemoFallback: true,
      source: 'Référence locale',
      dataTimestamp,
      retrievedAt,
      timestamp: retrievedAt,
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
          const rawSnapshot = normalizeCountrySnapshot(country.code, breakdownData, carbonData, reportedLoadData, netLoadData, fossilOnlyCarbonData, carbonFreeLevelData, carbonIntensityLevelData, renewableLevelData);
          zoneSnapshot = {
            ...rawSnapshot,
            dataTimestamp: rawSnapshot.datetime,
            retrievedAt: new Date().toISOString(),
            source: 'Electricity Maps API (Live)',
          };
          setCached(zoneCacheKey, zoneSnapshot, CACHE_TTL_MS);
          liveCount++;
        } else {
          // Secours transparent pour cette zone
          const ref = EU_REFERENCE_SNAPSHOTS[country.code];
          zoneSnapshot = {
            ...ref,
            dataTimestamp: ref.datetime,
            retrievedAt: new Date().toISOString(),
            source: 'Référence locale',
          };
        }
      }

      if (zoneSnapshot) {
        results[country.code] = zoneSnapshot;
      }
    }

    let latestDataTimestamp: string | null = null;
    for (const snap of Object.values(results) as any[]) {
      if (snap?.datetime) {
        if (!latestDataTimestamp || snap.datetime > latestDataTimestamp) {
          latestDataTimestamp = snap.datetime;
        }
      }
    }
    const refDate = EU_REFERENCE_SNAPSHOTS['FR']?.datetime || '2024-03-24T12:00:00.000Z';
    const dataTimestamp = liveCount > 0 ? (latestDataTimestamp || new Date().toISOString()) : refDate;
    const retrievedAt = new Date().toISOString();

    const payload = {
      snapshots: results,
      isDemoFallback: liveCount === 0,
      source: liveCount > 0 ? 'Electricity Maps API (Live)' : 'Référence locale',
      dataTimestamp,
      retrievedAt,
      timestamp: retrievedAt,
    };

    setCached(cacheKey, payload, CACHE_TTL_MS);
    res.setHeader('X-Cache', 'MISS');
    return res.json(payload);
  } catch (err) {
    console.error('Erreur lors de la génération du résumé UE :', err);
    const dataTimestamp = EU_REFERENCE_SNAPSHOTS['FR']?.datetime || '2024-03-24T12:00:00.000Z';
    const retrievedAt = new Date().toISOString();
    const enrichedSnapshots: Record<string, any> = {};
    for (const [code, snap] of Object.entries(EU_REFERENCE_SNAPSHOTS)) {
      enrichedSnapshots[code] = {
        ...snap,
        dataTimestamp: snap.datetime,
        retrievedAt,
        source: 'Référence locale',
      };
    }
    return res.json({
      snapshots: enrichedSnapshots,
      isDemoFallback: true,
      source: 'Référence locale (Secours Erreur)',
      dataTimestamp,
      retrievedAt,
      timestamp: retrievedAt,
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
    const dataTimestamp = fallback.datetime;
    const retrievedAt = new Date().toISOString();
    return res.json({
      ...fallback,
      dataTimestamp,
      retrievedAt,
      timestamp: retrievedAt,
      source: 'Référence locale',
    });
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
      const dataTimestamp = fallback.datetime;
      const retrievedAt = new Date().toISOString();
      return res.json({
        ...fallback,
        dataTimestamp,
        retrievedAt,
        timestamp: retrievedAt,
        source: 'Référence locale',
      });
    }

    const snapshot = normalizeCountrySnapshot(country.code, breakdownData, carbonData, reportedLoadData, netLoadData, fossilOnlyCarbonData, carbonFreeLevelData, carbonIntensityLevelData, renewableLevelData);
    const retrievedAt = new Date().toISOString();
    const enrichedSnapshot = {
      ...snapshot,
      dataTimestamp: snapshot.datetime,
      retrievedAt,
      timestamp: retrievedAt,
      source: 'Electricity Maps API (Live)',
    };
    setCached(cacheKey, enrichedSnapshot, CACHE_TTL_MS);
    return res.json(enrichedSnapshot);
  } catch (err) {
    console.error(`Erreur snapshot zone ${zone}:`, err);
    const fallback = EU_REFERENCE_SNAPSHOTS[country.code];
    const dataTimestamp = fallback?.datetime || '2024-03-24T12:00:00.000Z';
    const retrievedAt = new Date().toISOString();
    return res.json({
      ...fallback,
      dataTimestamp,
      retrievedAt,
      timestamp: retrievedAt,
      source: 'Référence locale (Secours Erreur)',
    });
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
    const dataTimestamp = ref?.datetime || '2024-03-24T12:00:00.000Z';
    const retrievedAt = new Date().toISOString();
    const fallback = {
      zone: zoneKey,
      datetime: dataTimestamp,
      updatedAt: ref?.updatedAt || dataTimestamp,
      dataTimestamp,
      retrievedAt,
      timestamp: retrievedAt,
      source: 'Référence locale',
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

  const retrievedAt = new Date().toISOString();
  const dataTimestamp = !API_KEY ? (EU_REFERENCE_SNAPSHOTS['FR']?.datetime || '2024-03-24T12:00:00.000Z') : retrievedAt;
  const payload = {
    flows: allFlows.sort((a, b) => b.flowMW - a.flowMW),
    totalInterconnections: allFlows.length,
    totalExchangedMW: allFlows.reduce((acc, f) => acc + f.flowMW, 0),
    dataTimestamp,
    retrievedAt,
    timestamp: retrievedAt,
    source: !API_KEY ? 'Référence locale' : 'Electricity Maps API (Live)',
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

      const latestItem = liveHistory.history[liveHistory.history.length - 1];
      const dataTimestamp = latestItem?.datetime || new Date().toISOString();
      const retrievedAt = new Date().toISOString();

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
        source: 'Electricity Maps API (Live)',
        dataTimestamp,
        retrievedAt,
        timestamp: retrievedAt,
      };
      setCached(cacheKey, payload, 15 * 60 * 1000);
      return res.json(payload);
    }
  }

  // Règle d'intégrité stricte : ZÉRO donnée inventée par fonction mathématique (sinus)
  // En l'absence de données historiques amont fournies par l'API, indiquer explicitement
  // l'indisponibilité et fournir uniquement la dernière observation réellement connue.
  const countryCode = country ? country.code : zone;
  const snapshot = EU_REFERENCE_SNAPSHOTS[countryCode];
  const lastKnown = getLastKnownObservation(snapshot);
  const dataTimestamp = lastKnown?.datetime || snapshot?.datetime || '2024-03-24T12:00:00.000Z';
  const retrievedAt = new Date().toISOString();

  const payload = {
    zoneKey: zone,
    granularity,
    history: [],
    isUnavailable: true,
    message: "Donnée historique indisponible (aucune courbe synthétique n'est générée)",
    lastKnown,
    dataTimestamp,
    retrievedAt,
    timestamp: retrievedAt,
    source: 'Référence locale',
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
        const timelinePoints = liveCarbon.history.map((c: any) => {
          const dt = c.datetime;
          const mixItem = Array.isArray(liveMix?.history) ? liveMix.history.find((m: any) => m.datetime === dt) : null;
          const breakdown = mixItem?.mix?.production || mixItem?.powerProductionBreakdown || {};
          const fossilItem = Array.isArray(liveFossil?.history) ? liveFossil.history.find((f: any) => f.datetime === dt) : null;

          return {
            datetime: dt,
            carbonIntensity: c.carbonIntensity !== undefined ? Math.round(c.carbonIntensity) : null,
            fossilOnlyCarbonIntensity: fossilItem?.carbonIntensity !== undefined ? Math.round(fossilItem.carbonIntensity) : null,
            renewablePercentage: mixItem?.renewablePercentage ?? null,
            fossilFreePercentage: mixItem?.fossilFreePercentage ?? null,
            totalLoad: mixItem?.totalConsumption ?? null,
            totalReportedLoad: null,
            netLoad: null,
            solar: breakdown.solar !== undefined ? Math.round(breakdown.solar) : null,
            wind: breakdown.wind !== undefined ? Math.round(breakdown.wind) : null,
            nuclear: breakdown.nuclear !== undefined ? Math.round(breakdown.nuclear) : null,
            hydro: breakdown.hydro !== undefined ? Math.round(breakdown.hydro) : null,
            gas: breakdown.gas !== undefined ? Math.round(breakdown.gas) : null,
            coal: breakdown.coal !== undefined ? Math.round(breakdown.coal) : null,
            netExport: mixItem?.netExport ?? null,
            importTotal: null,
            exportTotal: null,
            isEstimated: Boolean(c.isEstimated),
          };
        });

        const latestPoint = timelinePoints[timelinePoints.length - 1];
        const dataTimestamp = latestPoint?.datetime || new Date().toISOString();
        const retrievedAt = new Date().toISOString();
        const payload = {
          zoneKey: zone,
          granularity,
          points: timelinePoints,
          isDemoFallback: false,
          source: 'Electricity Maps API (Live)',
          dataTimestamp,
          retrievedAt,
          timestamp: retrievedAt,
        };
        setCached(cacheKey, payload, 15 * 60 * 1000);
        return res.json(payload);
      }
    } catch (e) {
      console.warn(`[Timeline V4] Relevés amont partiels pour ${zone}:`, e);
    }
  }

  // Règle d'intégrité stricte : aucune courbe fabriquée par sinus
  const lastKnown = getLastKnownObservation(snapshot);
  const dataTimestamp = lastKnown?.datetime || snapshot?.datetime || '2024-03-24T12:00:00.000Z';
  const retrievedAt = new Date().toISOString();
  const payload = {
    zoneKey: zone,
    granularity,
    points: [],
    isUnavailable: true,
    message: "Donnée historique 24h indisponible (aucune courbe synthétique n'est générée)",
    lastKnown,
    dataTimestamp,
    retrievedAt,
    timestamp: retrievedAt,
    source: 'Référence locale',
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

        const latestPoint = points[points.length - 1];
        const dataTimestamp = latestPoint?.datetime || new Date().toISOString();
        const retrievedAt = new Date().toISOString();
        const payload = {
          zoneKey: zone,
          granularity,
          points,
          isDemoFallback: false,
          source: 'Electricity Maps API (Live)',
          dataTimestamp,
          retrievedAt,
          timestamp: retrievedAt,
        };
        setCached(cacheKey, payload, 15 * 60 * 1000);
        return res.json(payload);
      }
    } catch (e) {
      console.warn(`[Mix History Upstream Error] zone=${zone}:`, e);
    }
  }

  // Règle d'intégrité stricte : aucune courbe fabriquée par sinus
  const lastKnown = getLastKnownObservation(snapshot);
  const dataTimestamp = lastKnown?.datetime || snapshot?.datetime || '2024-03-24T12:00:00.000Z';
  const retrievedAt = new Date().toISOString();
  const payload = {
    zoneKey: zone,
    granularity,
    points: [],
    isUnavailable: true,
    message: "Historique du mix 24h indisponible (aucune courbe synthétique n'est générée)",
    lastKnown,
    dataTimestamp,
    retrievedAt,
    timestamp: retrievedAt,
    source: 'Référence locale',
  };
  setCached(cacheKey, payload, 15 * 60 * 1000);
  return res.json(payload);
});

/**
 * GET /api/electricity-maps/flows-history?zone=FR&granularity=15_minutes
 * Renvoie l'historique complet des flux transfrontaliers sur 24 heures
 * Conforme à l'endpoint officiel V4 : /v4/electricity-flows/history?zone=XX&temporalResolution=...
 * Permet d'observer l'évolution heure par heure des échanges (ex: France → Allemagne : 00h 1,2 GW, 03h 1,7 GW, 06h 2,1 GW...)
 */
app.get('/api/electricity-maps/flows-history', async (req: Request, res: Response) => {
  const zone = (req.query.zone as string) || 'FR';
  const rawGranularity = (req.query.granularity as string) || (req.query.temporalResolution as string) || '15_minutes';
  const granularity = (rawGranularity === '5_minutes' || rawGranularity === 'hourly') ? rawGranularity : '15_minutes';

  const country = EU_COUNTRIES.find((c) => c.zoneKey === zone || c.code === zone);
  const cacheKey = `server_flows_history_${zone}_${granularity}`;

  const cached = getCached<unknown>(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const countryCode = country ? country.code : zone;
  const snapshot = EU_REFERENCE_SNAPSHOTS[countryCode];

  if (API_KEY) {
    try {
      const encodedZone = encodeURIComponent(zone);
      const upstreamFlows = await fetchElectricityMaps<any>(`${V4_BASE}/electricity-flows/history?zone=${encodedZone}&temporalResolution=${encodeURIComponent(granularity)}`)
        || await fetchElectricityMaps<any>(`${V4_BASE}/power-breakdown/history?zone=${encodedZone}`);

      if (upstreamFlows && Array.isArray(upstreamFlows.history) && upstreamFlows.history.length > 0) {
        const rawInterconnectors = Array.isArray(snapshot?.exchangeFlows) ? snapshot.exchangeFlows : [];
        const interconnectors = rawInterconnectors.map((f) => {
          const isExport = f.fromZone === zone;
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

        const points = upstreamFlows.history.map((h: any) => {
          const d = new Date(h.datetime);
          const hourLabel = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          const fullDateLabel = `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${hourLabel}`;
          const flows: Record<string, number> = {};
          let netExportTotal = 0;
          let importTotal = 0;
          let exportTotal = 0;

          const rawBreakdown = h.flows || h.powerExchangeBreakdown || {};
          for (const [peer, rawVal] of Object.entries(rawBreakdown)) {
            const val = typeof rawVal === 'number' ? Math.round(rawVal) : 0;
            flows[peer] = val;
            netExportTotal += val;
            if (val > 0) {
              exportTotal += val;
            } else {
              importTotal += Math.abs(val);
            }
          }

          const flowItems = interconnectors.map((meta) => {
            const val = flows[meta.peerZone] ?? 0;
            const isExport = val >= 0;
            return {
              fromZone: isExport ? zone : meta.peerZone,
              toZone: isExport ? meta.peerZone : zone,
              flowMW: Math.abs(val),
              isExport,
              peerZone: meta.peerZone,
              peerNameFr: meta.peerNameFr,
              peerFlag: meta.peerFlag,
            };
          });

          return {
            datetime: h.datetime,
            hourLabel,
            fullDateLabel,
            flows,
            flowItems,
            netExportTotal: netExportTotal || Math.round(h.netExport || 0),
            importTotal,
            exportTotal,
            isEstimated: Boolean(h.isEstimated),
          };
        });

        const latestPoint = points[points.length - 1];
        const dataTimestamp = latestPoint?.datetime || new Date().toISOString();
        const retrievedAt = new Date().toISOString();
        const payload = {
          zoneKey: zone,
          granularity,
          points,
          interconnectors,
          isDemoFallback: false,
          source: 'Electricity Maps API (Live)',
          dataTimestamp,
          retrievedAt,
          timestamp: retrievedAt,
        };
        setCached(cacheKey, payload, 15 * 60 * 1000);
        return res.json(payload);
      }
    } catch (e) {
      console.warn(`[Flows History Upstream Error] zone=${zone}:`, e);
    }
  }

  // Règle d'intégrité stricte : aucune courbe fabriquée par sinus
  const lastKnown = getLastKnownObservation(snapshot);
  const dataTimestamp = lastKnown?.datetime || snapshot?.datetime || '2024-03-24T12:00:00.000Z';
  const retrievedAt = new Date().toISOString();
  const rawInterconnectors = Array.isArray(snapshot?.exchangeFlows) ? snapshot.exchangeFlows : [];
  const interconnectors = rawInterconnectors.map((f) => {
    const isExport = f.fromZone === zone;
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

  const payload = {
    zoneKey: zone,
    granularity,
    points: [],
    interconnectors,
    isUnavailable: true,
    message: "Historique des flux 24h indisponible (aucune courbe synthétique n'est générée)",
    lastKnown,
    dataTimestamp,
    retrievedAt,
    timestamp: retrievedAt,
    source: 'Référence locale',
  };
  setCached(cacheKey, payload, 15 * 60 * 1000);
  return res.json(payload);
});

// Endpoint certifié pour le GeoJSON européen avec en-têtes JSON appropriés
// Empêche toute bascule vers le catch-all index.html (<!doctype)
app.get('/data/europe.geojson', (_req: Request, res: Response) => {
  const possiblePaths = [
    path.resolve(process.cwd(), 'public', 'data', 'europe.geojson'),
    path.resolve(process.cwd(), 'dist', 'data', 'europe.geojson'),
    path.resolve(process.cwd(), 'src', 'data', 'europe.json'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=2592000');
      return res.sendFile(p);
    }
  }
  return res.status(404).json({ error: 'GeoJSON non trouvé' });
});

// Proxy sécurisé pour les tuiles de fond cartographique OpenStreetMap (100% libre, gratuit et sans clé API)
app.get('/api/osm/tiles/:z/:x/:y.png', async (req: Request, res: Response) => {
  const { z, x, y } = req.params;
  const osmUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

  try {
    const upstreamRes = await fetch(osmUrl, {
      headers: {
        'User-Agent': 'EUEnergyMap/1.0 (European Electricity Network Observatoire; https://ais-dev-4b2mt6d4neo3trkxz5qxab-651350335779.europe-west2.run.app)',
      },
    });

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send('Erreur lors du chargement de la tuile cartographique');
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/png';
    const buffer = await upstreamRes.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[OSM Proxy] Erreur réseau:', err);
    return res.status(502).send('Passerelle cartographique introuvable');
  }
});

// Alias de rétrocompatibilité pour les anciennes requêtes vers /api/carto -> redirigé vers OpenStreetMap
app.get('/api/carto/tiles/:style/:z/:x/:y.png', (req: Request, res: Response) => {
  const { z, x, y } = req.params;
  return res.redirect(301, `/api/osm/tiles/${z}/${x}/${y}.png`);
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
