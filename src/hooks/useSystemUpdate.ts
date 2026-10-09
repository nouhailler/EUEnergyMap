import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CURRENT_APP_VERSION,
  AppVersionInfo,
  fetchRemoteVersion,
  getLastCheckTimestamp,
  setLastCheckTimestamp,
  getAutoUpdateSetting,
  setAutoUpdateSetting,
  clearAllCachesAndReload,
} from '../services/system/updateService';

const BACKGROUND_CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export function useSystemUpdate() {
  const [currentVersion] = useState<AppVersionInfo>(CURRENT_APP_VERSION);
  const [remoteVersion, setRemoteVersion] = useState<AppVersionInfo | null>(null);
  const [lastCheckDate, setLastCheckDate] = useState<string | null>(getLastCheckTimestamp);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [autoUpdateEnabled, setAutoUpdateState] = useState<boolean>(getAutoUpdateSetting);
  const [updateStatus, setUpdateStatus] = useState<
    'idle' | 'checking' | 'up-to-date' | 'update-available' | 'auto-updated' | 'error'
  >('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const isMountedRef = useRef(true);

  const toggleAutoUpdate = useCallback(() => {
    setAutoUpdateState((prev) => {
      const next = !prev;
      setAutoUpdateSetting(next);
      return next;
    });
  }, []);

  const checkForUpdates = useCallback(
    async (manual = false): Promise<boolean> => {
      if (isChecking) return false;

      setIsChecking(true);
      setUpdateStatus('checking');
      if (manual) {
        setStatusMessage('Recherche d’une nouvelle version en cours...');
      }

      try {
        const remote = await fetchRemoteVersion();
        const nowIso = new Date().toISOString();
        setLastCheckTimestamp(nowIso);
        setLastCheckDate(nowIso);

        // Déclencher aussi la vérification Service Worker natif si disponible
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistration().then((reg) => {
            reg?.update().catch(() => {});
          });
        }

        if (!isMountedRef.current) return false;

        if (remote) {
          setRemoteVersion(remote);

          const hasNewVersion =
            remote.buildId !== currentVersion.buildId || remote.version !== currentVersion.version;

          if (hasNewVersion) {
            if (autoUpdateEnabled) {
              setUpdateStatus('auto-updated');
              setStatusMessage(
                `Nouvelle version ${remote.version} détectée et installée en arrière-plan.`
              );
            } else {
              setUpdateStatus('update-available');
              setStatusMessage(`La version ${remote.version} est disponible.`);
            }
            return true;
          } else {
            setUpdateStatus('up-to-date');
            setStatusMessage(`Votre application est à jour (v${currentVersion.version}).`);
            return false;
          }
        } else {
          // Si le serveur n'a pas répondu spécifiquement, on considère à jour
          setUpdateStatus('up-to-date');
          setStatusMessage(`Votre version locale (v${currentVersion.version}) est active.`);
          return false;
        }
      } catch (err) {
        console.warn('Erreur vérification mise à jour :', err);
        if (isMountedRef.current) {
          setUpdateStatus('error');
          setStatusMessage('Impossible de vérifier les mises à jour (vérifiez votre connexion).');
        }
        return false;
      } finally {
        if (isMountedRef.current) {
          setIsChecking(false);
        }
      }
    },
    [isChecking, currentVersion, autoUpdateEnabled]
  );

  const forceUpdate = useCallback(async () => {
    setIsUpdating(true);
    setStatusMessage('Nettoyage du cache et téléchargement de la dernière version...');
    await clearAllCachesAndReload();
  }, []);

  // Système de vérification automatique en arrière-plan
  useEffect(() => {
    isMountedRef.current = true;

    // Première vérification silencieuse au démarrage si jamais vérifié
    const last = getLastCheckTimestamp();
    const shouldInitialCheck = !last || Date.now() - new Date(last).getTime() > BACKGROUND_CHECK_INTERVAL_MS;
    if (shouldInitialCheck && autoUpdateEnabled) {
      checkForUpdates(false);
    }

    // Intervalle régulier en arrière-plan
    const timer = setInterval(() => {
      if (autoUpdateEnabled && document.visibilityState === 'visible') {
        checkForUpdates(false);
      }
    }, BACKGROUND_CHECK_INTERVAL_MS);

    // Vérification lors du retour sur l'onglet ou du retour en ligne
    const handleVisibilityOrOnline = () => {
      if (autoUpdateEnabled && document.visibilityState === 'visible' && navigator.onLine) {
        const lastTs = getLastCheckTimestamp();
        if (!lastTs || Date.now() - new Date(lastTs).getTime() > 10 * 60 * 1000) {
          checkForUpdates(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrOnline);
    window.addEventListener('online', handleVisibilityOrOnline);

    return () => {
      isMountedRef.current = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityOrOnline);
      window.removeEventListener('online', handleVisibilityOrOnline);
    };
  }, [autoUpdateEnabled, checkForUpdates]);

  return {
    currentVersion,
    remoteVersion,
    lastCheckDate,
    isChecking,
    isUpdating,
    autoUpdateEnabled,
    toggleAutoUpdate,
    updateStatus,
    statusMessage,
    checkForUpdates,
    forceUpdate,
  };
}
