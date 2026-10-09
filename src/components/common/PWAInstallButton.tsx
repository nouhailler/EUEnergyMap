import React, { useState } from 'react';
import { Download, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallGuideModal } from './PWAInstallGuideModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'navbar' | 'menu' | 'card' | 'badge';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'navbar',
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  const handleClick = async () => {
    if (isInstallable) {
      const installed = await install();
      if (!installed) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  if (isInstalled && variant === 'badge') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        <span>Application installée</span>
      </span>
    );
  }

  return (
    <>
      {variant === 'menu' ? (
        <button
          onClick={handleClick}
          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900 border border-sky-200 dark:border-sky-800 transition cursor-pointer text-left ${className}`}
        >
          <span className="flex items-center gap-2">
            <Download className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Installer l'application sur l'appareil</span>
          </span>
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-sky-200/80 dark:bg-sky-900 text-sky-800 dark:text-sky-200">
            PWA
          </span>
        </button>
      ) : variant === 'card' ? (
        <button
          onClick={handleClick}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-sm transition active:scale-95 cursor-pointer ${className}`}
        >
          <Download className="w-4 h-4" />
          <span>Installer l'application</span>
        </button>
      ) : (
        /* Default Navbar */
        <button
          onClick={handleClick}
          className={`inline-flex items-center gap-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 active:scale-95 text-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold shadow-2xs transition cursor-pointer border border-sky-500 ${className}`}
          title="Installer l'application sur votre mobile ou bureau"
          aria-label="Installer l'application sur l'écran d'accueil"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Installer l'app</span>
          <span className="sm:hidden">Installer</span>
        </button>
      )}

      {/* Modale d'aide détaillée pour novice */}
      <PWAInstallGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        onNativeInstall={isInstallable ? install : undefined}
        isInstallable={isInstallable}
      />
    </>
  );
};
