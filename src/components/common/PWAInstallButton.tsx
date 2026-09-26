import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-sky-700 active:scale-95 transition-all cursor-pointer"
        title="Installer l'application sur votre appareil"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Installer l'app</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition cursor-pointer"
          title="Installer sur iPhone ou iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-sky-600" />
          <span>Installer PWA</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-sky-600" />
                Installer sur iPhone ou iPad
              </h3>
              <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  1. Touchez l’icône <strong>Partager</strong> <span className="text-sky-600 font-bold">(carré avec flèche vers le haut)</span> dans la barre d'outils de Safari.
                </p>
                <p>
                  2. Faites défiler vers le bas et sélectionnez <strong>Sur l’écran d’accueil</strong>.
                </p>
                <p>
                  3. Confirmez en touchant <strong>Ajouter</strong> en haut à droite.
                </p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-slate-100 dark:bg-slate-800 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
