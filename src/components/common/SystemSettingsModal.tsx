import React, { useState } from 'react';
import {
  X,
  Settings,
  RefreshCw,
  Zap,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  Laptop,
  Download,
  Database,
  Radio,
  Trash2,
  Sparkles,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { useSystemUpdate } from '../../hooks/useSystemUpdate';
import { useTheme, ThemeMode } from '../../hooks/useTheme';
import { PWAInstallButton } from './PWAInstallButton';
import { AppLogo } from './AppLogo';

interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLegal?: () => void;
  dataSource?: string | null;
  dataTimestamp?: string | null;
  isDemoFallback?: boolean;
}

export const SystemSettingsModal: React.FC<SystemSettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenLegal,
  dataSource,
  dataTimestamp,
  isDemoFallback = false,
}) => {
  const {
    currentVersion,
    lastCheckDate,
    isChecking,
    isUpdating,
    autoUpdateEnabled,
    toggleAutoUpdate,
    updateStatus,
    statusMessage,
    checkForUpdates,
    forceUpdate,
  } = useSystemUpdate();

  const { theme, setTheme } = useTheme();
  const [showConfirmForce, setShowConfirmForce] = useState(false);

  if (!isOpen) return null;

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'Jamais vérifié';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const themeOptions: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: 'Clair', icon: Sun },
    { id: 'dark', label: 'Sombre', icon: Moon },
    { id: 'system', label: 'Système', icon: Laptop },
  ];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-settings-title"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* En-tête */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <AppLogo size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="system-settings-title"
                  className="text-base sm:text-lg font-bold text-slate-900 dark:text-white"
                >
                  Paramètres Système
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold">
                  v{currentVersion.version}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gestion des versions, mises à jour automatiques et affichage
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Fermer les paramètres"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps défilable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-300 flex-1">
          {/* 1. SECTION MISES À JOUR & VERSIONING */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-sky-500" />
                <span>Version & Mises à jour logicielles</span>
              </h3>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Canal Stable</span>
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 space-y-3.5">
              {/* Informations temporelles : Date de sortie & Date de dernière vérification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-200 dark:border-slate-700/80">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Date de sortie</span>
                    <strong className="text-slate-900 dark:text-white text-xs block">
                      {currentVersion.releaseDateFormatted}
                    </strong>
                    <span className="text-[10px] text-slate-400 font-mono">Build : {currentVersion.buildId}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Dernière vérification</span>
                    <strong className="text-slate-900 dark:text-white text-xs block">
                      {formatDate(lastCheckDate)}
                    </strong>
                    <span className="text-[10px] text-slate-400">Vérifié automatiquement</span>
                  </div>
                </div>
              </div>

              {/* Message de statut / feedback */}
              {statusMessage && (
                <div
                  className={`p-2.5 rounded-xl flex items-center gap-2 text-xs ${
                    updateStatus === 'auto-updated' || updateStatus === 'up-to-date'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : updateStatus === 'error'
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      : 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                  }`}
                >
                  {isChecking ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
                  ) : updateStatus === 'up-to-date' || updateStatus === 'auto-updated' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* Boutons d'action : Vérifier les mises à jour & Forcer la mise à jour */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  onClick={() => checkForUpdates(true)}
                  disabled={isChecking || isUpdating}
                  className="w-full sm:w-1/2 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold text-xs transition cursor-pointer shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>{isChecking ? 'Vérification...' : 'Vérifier les mises à jour'}</span>
                </button>

                <button
                  onClick={() => setShowConfirmForce(true)}
                  disabled={isUpdating}
                  className="w-full sm:w-1/2 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer"
                  title="Purge le cache local et recharge la dernière version absolue"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Forcer la mise à jour</span>
                </button>
              </div>

              {/* Confirmation de force update */}
              {showConfirmForce && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Forcer le rafraîchissement complet ?</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Cette action va vider le cache temporaire de l'application (PWA & données), réinitialiser les service workers et recharger la page avec les fichiers les plus récents.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={forceUpdate}
                      disabled={isUpdating}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{isUpdating ? 'Nettoyage...' : 'Confirmer et forcer'}</span>
                    </button>
                    <button
                      onClick={() => setShowConfirmForce(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 text-xs transition cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* Option de mise à jour automatique en arrière-plan */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <label htmlFor="auto-update-toggle" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer block">
                    Mises à jour automatiques en arrière-plan
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Vérifie toutes les 15 minutes en tâche de fond et applique silencieusement les nouvelles versions.
                  </p>
                </div>

                <button
                  type="button"
                  id="auto-update-toggle"
                  onClick={toggleAutoUpdate}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                    autoUpdateEnabled ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-pressed={autoUpdateEnabled}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      autoUpdateEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* 2. SECTION THÈME (CLAIR / SOMBRE / SYSTÈME) */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Apparence & Thème d'affichage</span>
            </h3>

            <div className="grid grid-cols-3 gap-2.5">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setTheme(opt.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition cursor-pointer gap-2 ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 shadow-xs font-bold ring-1 ring-sky-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
                    <span className="text-xs">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3. SECTION INSTALLATION APPLICATION (PWA) */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>Installation sur Mobile & Ordinateur (PWA)</span>
            </h3>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                EU Energy Map est une Progressive Web App (PWA). Vous pouvez l'ajouter directement sur l'écran d'accueil de votre téléphone ou dans la barre d'applications de votre ordinateur pour un lancement rapide et un fonctionnement hors-ligne.
              </p>
              <PWAInstallButton variant="menu" />
            </div>
          </section>

          {/* 4. SECTION SOURCE & TRANSPARENCE */}
          <section className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-sky-500" />
                <span>Source active : {dataSource || (isDemoFallback ? 'Référence certifiée' : 'API Live')}</span>
              </span>
              {onOpenLegal && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenLegal();
                  }}
                  className="hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 cursor-pointer"
                >
                  <Scale className="w-3.5 h-3.5 text-amber-500" />
                  <span>Mentions Légales</span>
                </button>
              )}
            </div>
          </section>
        </div>

        {/* Pied de page */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            EU Energy Map • Licence Libre
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
