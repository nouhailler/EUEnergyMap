import { CountryElectricitySnapshot } from '../../types/energy';

interface CacheEntry<T> {
  data: T;
  cachedAt: number; // timestamp ms
  expiresAt: number; // timestamp ms
}

const STORAGE_PREFIX = 'eu_energy_map_';
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

class ClientCache {
  private memoryCache = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    // 1. Vérification cache mémoire
    const mem = this.memoryCache.get(key);
    const now = Date.now();
    if (mem && mem.expiresAt > now) {
      return mem.data as T;
    }

    // 2. Vérification localStorage
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + key);
      if (stored) {
        const parsed: CacheEntry<T> = JSON.parse(stored);
        if (parsed.expiresAt > now) {
          // Restaurer dans le cache mémoire
          this.memoryCache.set(key, parsed);
          return parsed.data;
        }
      }
    } catch {
      // Ignorer si localStorage est inaccessible
    }

    return null;
  }

  /**
   * Récupère la dernière donnée connue, même si elle a expiré (pour le mode hors ligne)
   */
  getStale<T>(key: string): { data: T; cachedAt: number } | null {
    const mem = this.memoryCache.get(key);
    if (mem) {
      return { data: mem.data as T, cachedAt: mem.cachedAt };
    }
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + key);
      if (stored) {
        const parsed: CacheEntry<T> = JSON.parse(stored);
        return { data: parsed.data, cachedAt: parsed.cachedAt };
      }
    } catch {
      // ignore
    }
    return null;
  }

  set<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      cachedAt: now,
      expiresAt: now + ttlMs,
    };

    this.memoryCache.set(key, entry);

    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
    } catch {
      // Quota localStorage dépassé ou navigation privée stricte
    }
  }

  clear(): void {
    this.memoryCache.clear();
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  }
}

export const clientCache = new ClientCache();
