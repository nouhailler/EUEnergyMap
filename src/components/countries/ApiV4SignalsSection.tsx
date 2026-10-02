import React, { useState, useMemo } from 'react';
import {
  Layers,
  Activity,
  Flame,
  Zap,
  Gauge,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Globe2,
  Sliders,
  FileCode2,
} from 'lucide-react';
import { CountryElectricitySnapshot, SignalLevel, ApiV4SignalItem } from '../../types/energy';
import { extract13Signals } from '../../services/electricityMaps/normalizers';

interface ApiV4SignalsSectionProps {
  snapshot: CountryElectricitySnapshot;
}

type FilterCategory = 'all' | 'carbon' | 'load' | 'mix_flows' | 'levels';

export const ApiV4SignalsSection: React.FC<ApiV4SignalsSectionProps> = ({ snapshot }) => {
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [showDocumentation, setShowDocumentation] = useState<boolean>(false);

  // Extraction certifiée des 13 signaux officiels V4
  const signals: ApiV4SignalItem[] = useMemo(() => {
    return extract13Signals(snapshot);
  }, [snapshot]);

  // Filtrage par catégorie
  const filteredSignals = useMemo(() => {
    if (selectedCategory === 'all') return signals;
    return signals.filter((s) => s.category === selectedCategory);
  }, [signals, selectedCategory]);

  // Rendu de badge de niveau qualitatif
  const renderLevelBadge = (level?: SignalLevel | null, signalKey?: string) => {
    if (!level) return <span className="text-xs text-slate-400 font-mono">—</span>;

    if (signalKey === 'carbon_free_level' || signalKey === 'renewable_level') {
      const isHigh = level === 'high' || level === 'very-high';
      const isMedium = level === 'medium';

      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border tracking-wide ${
            isHigh
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : isMedium
              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
          }`}
        >
          <span>{isHigh ? '🟢' : isMedium ? '🟡' : '🔴'}</span>
          <span className="font-mono uppercase font-extrabold">
            {isHigh ? 'HIGH' : isMedium ? 'MODERATE' : 'LOW'}
          </span>
          <span className="text-[10px] font-normal opacity-85">
            ({level === 'very-high' ? 'Très élevé' : level === 'high' ? 'Élevé' : level === 'medium' ? 'Modéré' : 'Faible'})
          </span>
        </span>
      );
    }

    const styles: Record<SignalLevel, { bg: string; text: string; label: string }> = {
      'very-low': {
        bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
        text: 'text-emerald-600 dark:text-emerald-400',
        label: 'Très faible',
      },
      low: {
        bg: 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300',
        text: 'text-sky-600 dark:text-sky-400',
        label: 'Faible',
      },
      medium: {
        bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
        text: 'text-amber-600 dark:text-amber-400',
        label: 'Moyen',
      },
      high: {
        bg: 'bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300',
        text: 'text-orange-600 dark:text-orange-400',
        label: 'Élevé',
      },
      'very-high': {
        bg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300',
        text: 'text-rose-600 dark:text-rose-400',
        label: 'Très élevé',
      },
    };

    const style = styles[level];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${style.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.text} bg-current`} />
        {style.label}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs p-5 sm:p-6 space-y-6">
      {/* En-tête de section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/80">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Les 13 Signaux Officiels de l'API Electricity Maps (V4)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Exploitation intégrale des 13 signaux indépendants exposés par la spécification API V4 : métriques de charge, intensité carbone directe et fossile, ventilation par filière et paliers qualitatifs certifiés.
          </p>
        </div>

        {/* Bouton d'aide & documentation des endpoints */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowDocumentation(!showDocumentation)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/70 text-xs font-medium text-slate-700 dark:text-slate-200 transition cursor-pointer"
          >
            <FileCode2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Spécification & Endpoints V4</span>
            {showDocumentation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Accordéon documentaire de l'API V4 */}
      {showDocumentation && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 text-xs space-y-3 animate-in fade-in duration-150">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <p className="text-slate-600 dark:text-slate-300">
              Contrairement aux versions antérieures qui agrégeaient les données dans un seul payload, l'API V4 fournit désormais des endpoints granulaires dédiés pour chaque signal, facilitant la surveillance temps-réel et les calculs spécifiques (charges nettes, intensité des seules centrales thermiques, etc.).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">Charges & Réseau</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Total load, Total reported load, Net load</span>
              <code className="text-[10px] text-sky-600 dark:text-sky-400 block mt-1">/v4/total-load/latest</code>
            </div>

            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">Émissions Carbone</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Carbon intensity, Fossil-only intensity</span>
              <code className="text-[10px] text-sky-600 dark:text-sky-400 block mt-1">/v4/fossil-only-carbon-intensity/latest</code>
            </div>

            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">Paliers Qualitatifs</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Carbon-free, Carbon intensity & Renewable level</span>
              <code className="text-[10px] text-sky-600 dark:text-sky-400 block mt-1">/v4/*-level/latest</code>
            </div>
          </div>
        </div>
      )}

      {/* Barre de filtre par catégorie */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Tous les signaux (13)
        </button>

        <button
          onClick={() => setSelectedCategory('carbon')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            selectedCategory === 'carbon'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-rose-500" />
          <span>Carbone & Énergies (4)</span>
        </button>

        <button
          onClick={() => setSelectedCategory('load')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            selectedCategory === 'load'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Charges & Réseau (3)</span>
        </button>

        <button
          onClick={() => setSelectedCategory('mix_flows')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            selectedCategory === 'mix_flows'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-indigo-500" />
          <span>Mix & Flux (3)</span>
        </button>

        <button
          onClick={() => setSelectedCategory('levels')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            selectedCategory === 'levels'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Gauge className="w-3.5 h-3.5 text-emerald-500" />
          <span>Paliers Qualitatifs (3)</span>
        </button>
      </div>

      {/* Grille des 13 signaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredSignals.map((sig, idx) => {
          const isLevel = sig.category === 'levels';
          return (
            <div
              key={sig.key}
              className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 transition flex flex-col justify-between space-y-3"
            >
              {/* Entête du signal */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {sig.nameFr}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
                    {sig.nameEn}
                  </span>
                </div>

                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 shrink-0">
                  V4 API
                </span>
              </div>

              {/* Valeur principale */}
              <div className="pt-1">
                {isLevel ? (
                  <div className="flex items-center gap-2">
                    {renderLevelBadge(sig.level, sig.key)}
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                      {sig.formattedValue}
                    </span>
                  </div>
                )}
              </div>

              {/* Description & Endpoint V4 */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] space-y-1.5">
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  {sig.descriptionFr}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono pt-1">
                  <span>Endpoint :</span>
                  <code className="text-sky-600 dark:text-sky-400">{sig.apiEndpointV4}</code>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
