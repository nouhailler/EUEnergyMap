import React, { useState } from 'react';
import {
  Activity,
  Layers,
  Flame,
  Leaf,
  ArrowRightLeft,
  RotateCw,
  Globe2,
  Menu,
  TrendingUp,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { HamburgerMenu } from './HamburgerMenu';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
  secondsUntilRefresh: number;
  onManualRefresh: () => void;
  isRefreshing: boolean;
  isDemoFallback: boolean;
  lastUpdated: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  secondsUntilRefresh,
  onManualRefresh,
  isRefreshing,
  isDemoFallback,
  lastUpdated,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const navLinks = [
    { id: 'dashboard', label: 'Europe & Carte', icon: Globe2 },
    { id: 'timeline', label: '📈 Journée électrique', icon: TrendingUp },
    { id: 'compare', label: 'Comparer', icon: Layers },
    { id: 'carbon', label: 'Carbone', icon: Flame },
    { id: 'renewables', label: 'Renouvelables', icon: Leaf },
    { id: 'flows', label: 'Flux & Échanges', icon: ArrowRightLeft },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Titre */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('dashboard')}
                className="flex items-center gap-2.5 text-left group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20 group-hover:scale-105 transition">
                  <Activity className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                    EU Energy Map
                    <span className="text-[10px] font-semibold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 rounded">
                      27 UE
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block -mt-0.5">
                    Tableau de bord factuel de l'électricité
                  </span>
                </div>
              </button>
            </div>

            {/* Navigation desktop rapide */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Navigation principale">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = currentView === link.id;
                return (
                  <button
                    key={link.id}
                    onClick={() => onNavigate(link.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
                    <span>{link.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Actions & Statut & Bouton Hamburger */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mode status badge */}
              <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <span
                  className={`w-2 h-2 rounded-full ${isDemoFallback ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}
                />
                <span>{isDemoFallback ? 'Réf. Factuelle' : 'API Temps Réel'}</span>
              </div>

              {/* Timer et Rafraîchissement */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-lg px-2.5 py-1">
                <span className="hidden md:inline text-[11px]">Actualisation :</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
                  {formatTime(secondsUntilRefresh)}
                </span>
                <button
                  onClick={onManualRefresh}
                  disabled={isRefreshing}
                  className="ml-1 text-slate-500 hover:text-sky-600 transition disabled:opacity-50 cursor-pointer p-0.5"
                  title="Actualiser maintenant"
                  aria-label="Actualiser les données"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`} />
                </button>
              </div>

              {/* Bouton PWA Install */}
              <PWAInstallButton />

              {/* Bouton Hamburger Menu avec fonctionnalités classées par catégorie */}
              <button
                onClick={() => setIsMenuOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                aria-label="Ouvrir le menu des fonctionnalités"
                title="Menu des fonctionnalités par catégorie"
              >
                <Menu className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="hidden sm:inline">Menu</span>
              </button>
            </div>
          </div>

          {/* Navigation mobile compacte (scroll horizontal) */}
          <div className="lg:hidden flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 py-1.5 gap-2">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = currentView === link.id;
                return (
                  <button
                    key={link.id}
                    onClick={() => onNavigate(link.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                      isActive
                        ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{link.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Raccourci menu dans barre mobile */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="sm:hidden p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-xs font-semibold flex items-center gap-1 shrink-0"
              aria-label="Toutes les catégories"
            >
              <Menu className="w-3.5 h-3.5" />
              <span>Tout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tiroir coulissant du menu hamburger avec catégories */}
      <HamburgerMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        currentView={currentView}
        onNavigate={onNavigate}
        isDemoFallback={isDemoFallback}
        lastUpdated={lastUpdated}
        secondsUntilRefresh={secondsUntilRefresh}
        onManualRefresh={onManualRefresh}
        isRefreshing={isRefreshing}
      />
    </>
  );
};
