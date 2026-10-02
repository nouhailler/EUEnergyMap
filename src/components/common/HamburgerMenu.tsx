import React, { useState, useEffect, useRef } from 'react';
import {
  Globe2,
  Layers,
  Flame,
  Leaf,
  ArrowRightLeft,
  X,
  ChevronRight,
  Activity,
  RotateCw,
  Info,
  Download,
  ExternalLink,
  Search,
  CheckCircle2,
  Database,
  Radio,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import { EU_COUNTRIES } from '../../data/euCountries';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface CategoryItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badge?: string;
}

interface CategoryGroup {
  id: string;
  title: string;
  description: string;
  items: CategoryItem[];
}

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
  isDemoFallback: boolean;
  lastUpdated: string | null;
  secondsUntilRefresh: number;
  onManualRefresh: () => void;
  isRefreshing: boolean;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  isOpen,
  onClose,
  currentView,
  onNavigate,
  isDemoFallback,
  lastUpdated,
  secondsUntilRefresh,
  onManualRefresh,
  isRefreshing,
}) => {
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const { isInstallable, install } = usePWAInstall();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Fermeture par la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleLinkClick = (view: string, param?: string) => {
    onNavigate(view, param);
    onClose();
  };

  const filteredCountries = EU_COUNTRIES.filter(
    (c) =>
      c.nameFr.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.nameEn.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Définition des catégories et fonctionnalités
  const categories: CategoryGroup[] = [
    {
      id: 'cartography',
      title: 'Vue Globale & Cartographie',
      description: 'Vision consolidée des 27 réseaux électriques européens',
      items: [
        {
          id: 'dashboard',
          title: 'Carte & Synthèse de l’UE',
          subtitle: 'Cartographie interactive, intensité carbone et tableau des 27 pays',
          icon: Globe2,
          color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60',
          badge: 'Principal',
        },
        {
          id: 'timeline',
          title: '📈 Journée Électrique (Timeline 24h)',
          subtitle: 'Courbes continues des 10 signaux V4 (carbone, charge, net load, mix)',
          icon: TrendingUp,
          color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60',
          badge: 'Nouveau',
        },
      ],
    },
    {
      id: 'thematics',
      title: 'Analyses Thématiques & Climat',
      description: 'Facteurs de décarbonation et dynamiques énergétiques',
      items: [
        {
          id: 'carbon',
          title: 'Intensité Carbone & Émissions',
          subtitle: 'Classement en gCO₂eq/kWh, alertes fossiles et seuils de propreté',
          icon: Flame,
          color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60',
        },
        {
          id: 'renewables',
          title: 'Énergies Renouvelables & Décarbonées',
          subtitle: 'Parts du solaire, éolien, hydraulique, nucléaire et biomasse',
          icon: Leaf,
          color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
        },
        {
          id: 'flows',
          title: 'Flux & Interconnexions Réseau',
          subtitle: 'Soldes imports/exports transfrontaliers et dépendance physique',
          icon: ArrowRightLeft,
          color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
        },
      ],
    },
    {
      id: 'tools',
      title: 'Outils d’Analyse & Comparaison',
      description: 'Exploration granulaire par pays et benchmarking',
      items: [
        {
          id: 'compare',
          title: 'Comparateur Multi-Pays',
          subtitle: 'Mise en regard simultanée de 2 à 4 pays de l’UE',
          icon: Layers,
          color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
        },
      ],
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Arrière-plan semi-transparent avec flou */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-fadeIn"
        aria-hidden="true"
      />

      {/* Panneau latéral coulissant (Drawer) */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          ref={drawerRef}
          className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-hidden animate-slideLeft"
          role="dialog"
          aria-modal="true"
          aria-label="Menu principal des fonctionnalités"
        >
          {/* En-tête du menu */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20">
                <Activity className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Fonctionnalités UE
                  <span className="text-[10px] font-semibold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 rounded">
                    27 Pays
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Navigation classée par catégorie
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Corps défilable contenant les catégories */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
            {/* Barre de statut rapide */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isDemoFallback ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
                  }`}
                />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {isDemoFallback ? 'Référence Factuelle' : 'Données API Réseau'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Prochaine mise à jour : {formatTime(secondsUntilRefresh)}
                  </div>
                </div>
              </div>
              <button
                onClick={onManualRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950 hover:bg-sky-100 dark:hover:bg-sky-900 transition cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Actualiser</span>
              </button>
            </div>

            {/* Catégories de fonctionnalités */}
            {categories.map((category) => (
              <div key={category.id} className="space-y-2.5">
                <div className="flex items-baseline justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {category.title}
                  </h3>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {category.items.length} {category.items.length > 1 ? 'modules' : 'module'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleLinkClick(item.id)}
                        className={`w-full text-left p-3 rounded-xl transition flex items-start gap-3.5 group cursor-pointer border ${
                          isActive
                            ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800/80 shadow-xs'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent hover:border-slate-200 dark:hover:border-slate-700/60'
                        }`}
                      >
                        <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${item.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-sm font-semibold truncate ${
                                isActive
                                  ? 'text-sky-900 dark:text-sky-200'
                                  : 'text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400'
                              }`}
                            >
                              {item.title}
                            </span>
                            {item.badge && (
                              <span className="text-[10px] font-semibold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 px-1.5 py-0.2 rounded shrink-0">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 mt-2 shrink-0 transition ${
                            isActive
                              ? 'text-sky-600 dark:text-sky-400 translate-x-0.5'
                              : 'text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Section Sélection Rapide des 27 Pays */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Exploration par Pays (27 UE)
                </h3>
                <button
                  onClick={() => setShowCountrySelector(!showCountrySelector)}
                  className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                >
                  {showCountrySelector ? 'Masquer' : 'Afficher la liste'}
                </button>
              </div>

              {/* Barre de recherche pays */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un pays (ex: France, DE, Espagne)..."
                  value={countrySearch}
                  onChange={(e) => {
                    setCountrySearch(e.target.value);
                    if (!showCountrySelector) setShowCountrySelector(true);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                />
              </div>

              {showCountrySelector && (
                <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto p-1 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                  {filteredCountries.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => handleLinkClick('country', c.code)}
                      className="flex items-center gap-2 p-1.5 rounded-lg text-left text-xs hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition cursor-pointer"
                    >
                      <span className="text-base shrink-0">{c.flag}</span>
                      <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                        {c.nameFr}
                      </span>
                    </button>
                  ))}
                  {filteredCountries.length === 0 && (
                    <div className="col-span-2 py-3 text-center text-xs text-slate-500">
                      Aucun pays trouvé
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PWA & Installation si disponible */}
            {isInstallable && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-950/40 dark:to-indigo-950/40 border border-sky-100 dark:border-sky-900/60">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      Installer l'application
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      Accédez au tableau de bord hors-ligne directement depuis votre écran d’accueil.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      install();
                      onClose();
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition shrink-0 cursor-pointer"
                  >
                    Installer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pied de menu avec attribution factuelle */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 text-xs text-slate-500 dark:text-slate-400 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                <span>Source : Electricity Maps API & ENTSO-E</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">v1.2</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Données factuelles relatives aux 27 pays membres de l'UE calculées selon les normes GIEC.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
