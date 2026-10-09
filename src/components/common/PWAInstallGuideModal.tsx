import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Monitor,
  Download,
  Share,
  PlusSquare,
  CheckCircle2,
  ExternalLink,
  Laptop,
} from 'lucide-react';

interface PWAInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNativeInstall?: () => void;
  isInstallable?: boolean;
}

export const PWAInstallGuideModal: React.FC<PWAInstallGuideModalProps> = ({
  isOpen,
  onClose,
  onNativeInstall,
  isInstallable = false,
}) => {
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>('android');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* En-tête */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20 shrink-0">
              <Download className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2
                id="pwa-install-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white"
              >
                Installer l'application
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Accès direct depuis votre écran d'accueil sans passer par un store
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bouton direct si installable par l'API du navigateur */}
        {isInstallable && onNativeInstall && (
          <div className="p-4 bg-sky-50 dark:bg-sky-950/50 border-b border-sky-100 dark:border-sky-900/60 flex items-center justify-between gap-3">
            <div className="text-xs text-sky-950 dark:text-sky-200">
              <span className="font-semibold block">Installation en 1 clic possible !</span>
              <span>Votre navigateur supporte l'installation immédiate.</span>
            </div>
            <button
              onClick={() => {
                onNativeInstall();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Installer maintenant</span>
            </button>
          </div>
        )}

        {/* Onglets selon l'appareil */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/50 p-1.5 gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'android'
                ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
            <span>Android / Chrome</span>
          </button>

          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-sky-500" />
            <span>iPhone / iPad (Safari)</span>
          </button>

          <button
            onClick={() => setActiveTab('desktop')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'desktop'
                ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Laptop className="w-3.5 h-3.5 text-indigo-500" />
            <span>Ordinateur (PC / Mac)</span>
          </button>
        </div>

        {/* Instructions par appareil */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          {activeTab === 'android' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">Ouvrez le menu du navigateur</strong>
                  <span>Touchez les trois petits points verticaux <strong>(⋮)</strong> en haut à droite de Chrome ou de votre navigateur Android.</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">Sélectionnez « Installer l'application »</strong>
                  <span>(Ou « Ajouter à l'écran d'accueil » selon votre version d'Android).</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">Confirmez l'ajout</strong>
                  <span>L'icône EU Energy Map apparaîtra parmi vos applications avec lancement plein écran et mode hors-ligne.</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">Touchez le bouton « Partager »</strong>
                  <span>Dans la barre inférieure de Safari sur iPhone (ou en haut sur iPad), touchez le bouton <strong>Partager</strong> (icône de carré avec une flèche vers le haut <Share className="inline w-3 h-3 text-sky-500" />).</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">Faites défiler vers le bas</strong>
                  <span>Choisissez l'option <strong>« Sur l'écran d'accueil »</strong> (icône carrée avec un <PlusSquare className="inline w-3 h-3 text-sky-500" />).</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">Touchez « Ajouter »</strong>
                  <span>L'application s'ajoute à votre écran d'accueil avec son icône dédiée, sans bandeau d'URL Safari.</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'desktop' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">Dans Chrome ou Microsoft Edge</strong>
                  <span>Regardez à l'extrémité droite de la barre d'adresse : cliquez sur l'icône d'ordinateur avec flèche ou « Installer EU Energy Map ».</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">Ou via le menu du navigateur</strong>
                  <span>Cliquez sur <strong>Menu (⋮)</strong> &gt; <strong>« Enregistrer et partager »</strong> &gt; <strong>« Installer EU Energy Map »</strong>.</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">Lancement en application autonome</strong>
                  <span>L'application se lance dans sa propre fenêtre séparée, accessible depuis votre dock ou menu démarrer.</span>
                </div>
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Aucun téléchargement lourd ni mise à jour manuelle requise : l'application reste toujours synchronisée.</span>
          </div>
        </div>

        {/* Pied de page */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex items-center justify-end">
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
