import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { EU_COUNTRIES } from './src/data/euCountries.ts';
import { EU_REFERENCE_SNAPSHOTS, generateReferenceHistory } from './src/data/referenceData.ts';
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
        // Appels aux endpoints officiels V4/V3
        const [carbonData, breakdownData] = await Promise.all([
          fetchElectricityMaps<any>(`${V4_BASE}/carbon-intensity/latest?zone=${encodeURIComponent(zoneKey)}`),
          fetchElectricityMaps<any>(`${V3_BASE}/power-breakdown/latest?zone=${encodeURIComponent(zoneKey)}`),
        ]);

        if (carbonData || breakdownData) {
          zoneSnapshot = normalizeCountrySnapshot(country.code, breakdownData, carbonData);
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
    const [carbonData, breakdownData] = await Promise.all([
      fetchElectricityMaps<any>(`${V4_BASE}/carbon-intensity/latest?zone=${encodeURIComponent(country.zoneKey)}`),
      fetchElectricityMaps<any>(`${V3_BASE}/power-breakdown/latest?zone=${encodeURIComponent(country.zoneKey)}`),
    ]);

    if (!carbonData && !breakdownData) {
      const fallback = EU_REFERENCE_SNAPSHOTS[country.code];
      return res.json(fallback);
    }

    const snapshot = normalizeCountrySnapshot(country.code, breakdownData, carbonData);
    setCached(cacheKey, snapshot, CACHE_TTL_MS);
    return res.json(snapshot);
  } catch (err) {
    console.error(`Erreur snapshot zone ${zone}:`, err);
    const fallback = EU_REFERENCE_SNAPSHOTS[country.code];
    return res.json(fallback);
  }
});

/**
 * GET /api/electricity-maps/history?zone=FR
 */
app.get('/api/electricity-maps/history', async (req: Request, res: Response) => {
  const zone = (req.query.zone as string) || 'FR';
  const country = EU_COUNTRIES.find((c) => c.zoneKey === zone || c.code === zone);
  const cacheKey = `server_history_${zone}`;

  const cached = getCached<unknown>(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  if (API_KEY) {
    const liveHistory = await fetchElectricityMaps<any>(`${V4_BASE}/carbon-intensity/history?zone=${encodeURIComponent(zone)}`);
    if (liveHistory && Array.isArray(liveHistory.history)) {
      const payload = {
        zoneKey: zone,
        history: liveHistory.history.map((h: any) => ({
          datetime: h.datetime,
          carbonIntensity: h.carbonIntensity !== undefined ? Math.round(h.carbonIntensity) : null,
          isEstimated: Boolean(h.isEstimated),
        })),
        isDemoFallback: false,
      };
      setCached(cacheKey, payload, 15 * 60 * 1000);
      return res.json(payload);
    }
  }

  // Fallback 24h cohérent
  const countryCode = country ? country.code : zone;
  const snapshot = EU_REFERENCE_SNAPSHOTS[countryCode];
  const baseIntensity = snapshot?.carbonIntensity ?? 150;
  const history = generateReferenceHistory(zone, baseIntensity);

  const payload = {
    zoneKey: zone,
    history,
    isDemoFallback: true,
  };
  setCached(cacheKey, payload, 15 * 60 * 1000);
  return res.json(payload);
});

// --- GESTION DU SERVEUR / VITE ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Mode développement : brancher le middleware Vite
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Mode production : servir le dossier dist
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[EU Energy Map] Serveur démarré sur http://0.0.0.0:${PORT}`);
  });
}

startServer();
