export interface AppVersionInfo {
  version: string;
  releaseDate: string;
  releaseDateFormatted: string;
  buildId: string;
  buildTimestamp: number;
  channel?: string;
  changelog?: string[];
}

export const CURRENT_APP_VERSION: AppVersionInfo = {
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
};

const LAST_CHECK_KEY = 'eu_energy_last_update_check_v1';
const AUTO_UPDATE_KEY = 'eu_energy_auto_update_enabled_v1';

export async function fetchRemoteVersion(): Promise<AppVersionInfo | null> {
  try {
    // Tenter d'abord /version.json puis /api/system/version
    const urls = [`/version.json?_t=${Date.now()}`, `/api/system/version?_t=${Date.now()}`];
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            Accept: 'application/json',
          },
        });
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('json')) {
            const data = (await res.json()) as AppVersionInfo;
            if (data && data.version) {
              return data;
            }
          }
        }
      } catch {
        // Continuer vers URL de secours
      }
    }
  } catch (err) {
    console.warn('Impossible de récupérer la version distante :', err);
  }
  return null;
}

export function getLastCheckTimestamp(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_CHECK_KEY);
}

export function setLastCheckTimestamp(date: string = new Date().toISOString()): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_CHECK_KEY, date);
}

export function getAutoUpdateSetting(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(AUTO_UPDATE_KEY);
  return stored !== 'false'; // Actif par défaut
}

export function setAutoUpdateSetting(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTO_UPDATE_KEY, enabled ? 'true' : 'false');
}

export async function clearAllCachesAndReload(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // 1. Mettre à jour et désenregistrer les Service Workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.update().catch(() => {});
        await reg.unregister().catch(() => {});
      }
    }

    // 2. Supprimer tous les caches Workbox et API
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }
    }
  } catch (err) {
    console.warn('Erreur lors du nettoyage des caches :', err);
  }

  // 3. Rechargement forcé de la page sans cache
  window.location.reload();
}
