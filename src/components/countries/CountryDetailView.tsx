import React, { useState } from 'react';
import {
  ArrowLeft,
  Flame,
  Leaf,
  ShieldCheck,
  Zap,
  HelpCircle,
  Clock,
  ArrowRightLeft,
  Activity,
  Layers,
  TrendingDown,
  Info,
  Radio,
} from 'lucide-react';
import { CountryElectricitySnapshot, ProductionSourceKey } from '../../types/energy';
import { PRODUCTION_SOURCES } from '../../data/sourcesMeta';
import { UnitFormattedValue } from '../common/UnitFormattedValue';
import { DataQualityBadge } from '../common/DataQualityBadge';
import { CountryHistorySection } from './CountryHistorySection';
import { CountryMixHistorySection } from './CountryMixHistorySection';
import { ApiV4SignalsSection } from './ApiV4SignalsSection';
import { formatCarbonFreeLevelBadge, formatCarbonIntensityLevelBadge, formatRenewableLevelBadge } from '../../services/electricityMaps/normalizers';

interface CountryDetailViewProps {
  snapshot: CountryElectricitySnapshot;
  onBack: () => void;
  onSelectCountry: (countryCode: string) => void;
  onNavigate?: (view: string, param?: string) => void;
}

export const CountryDetailView: React.FC<CountryDetailViewProps> = ({
  snapshot,
  onBack,
  onSelectCountry,
  onNavigate,
}) => {
  const [viewMode, setViewMode] = useState<'production' | 'consumption'>('production');
  const [showNetLoadExplainer, setShowNetLoadExplainer] = useState(false);
  const [showLoadExplainer, setShowLoadExplainer] = useState(false);
  const [showCarbonExplainer, setShowCarbonExplainer] = useState(false);
  const [showCarbonFreeLevelExplainer, setShowCarbonFreeLevelExplainer] = useState(false);
  const [showRenewableLevelExplainer, setShowRenewableLevelExplainer] = useState(false);

  // Décomposition des sources
  const breakdown = (viewMode === 'consumption' && snapshot?.consumptionBreakdown)
    ? snapshot.consumptionBreakdown
    : (snapshot?.productionBreakdown || {});

  // Calcul du total pour les pourcentages de production
  const validSources = Object.entries(breakdown || {})
    .filter(([_, val]) => val !== null && val > 0)
    .map(([key, val]) => ({
      key: key as ProductionSourceKey,
      meta: PRODUCTION_SOURCES[key as ProductionSourceKey],
      powerMW: val as number,
    }))
    .sort((a, b) => b.powerMW - a.powerMW);

  const totalSumMW = validSources.reduce((acc, curr) => acc + curr.powerMW, 0);

  // Contributions pour "Pourquoi ce chiffre ?"
  const majorSources = validSources.map((s) => ({
    ...s,
    sharePercent: totalSumMW > 0 ? Math.round((s.powerMW / totalSumMW) * 100) : 0,
  }));

  const exchangeFlows = Array.isArray(snapshot?.exchangeFlows) ? snapshot.exchangeFlows : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Barre de retour et En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            aria-label="Retour au tableau de bord Europe"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">{snapshot.flagEmoji}</span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {snapshot.countryNameFr}
              </h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                Zone : {snapshot.zoneKey}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Relevé du {new Date(snapshot.datetime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à {new Date(snapshot.datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} UTC
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DataQualityBadge
            status={snapshot.dataSourceQuality}
            isEstimated={snapshot.isEstimated}
            estimationMethod={snapshot.estimationMethod}
          />
        </div>
      </div>

      {/* Cartes d'indicateurs clés - Vue d'ensemble des 9 dimensions principales dont Total Load & Total Reported Load */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* 1. Intensité Carbone Totale & CARBON INTENSITY LEVEL */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs relative">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Intensité carbone</span>
              <button
                onClick={() => setShowCarbonExplainer(!showCarbonExplainer)}
                className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                title="Pédagogie : Intensité carbone totale vs Intensité carbone fossile"
                aria-label="Explication intensité carbone"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>

          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              <UnitFormattedValue value={snapshot.carbonIntensity} unit="gCO2eq/kWh" />
            </div>

            {/* BADGE OFFICIEL : CARBON INTENSITY LEVEL */}
            {snapshot.carbonIntensityLevel && (
              <div
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border tracking-wide shadow-xs ${
                  formatCarbonIntensityLevelBadge(snapshot.carbonIntensityLevel).bg
                } ${formatCarbonIntensityLevelBadge(snapshot.carbonIntensityLevel).color}`}
                title="Niveau relatif officiel Electricity Maps (/v4/carbon-intensity-level/latest) - calculé par rapport à l'historique récent de la zone"
              >
                <span>{formatCarbonIntensityLevelBadge(snapshot.carbonIntensityLevel).dot}</span>
                <span className="font-mono text-[11px] font-extrabold uppercase">
                  {formatCarbonIntensityLevelBadge(snapshot.carbonIntensityLevel).text}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Intensité carbone totale : ensemble du mix.</span>
            <span className="font-medium text-rose-600 dark:text-rose-400">
              vs historique récent
            </span>
          </div>
        </div>

        {/* 2. Intensité Carbone Fossile Seule */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs relative">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Intensité carbone fossile</span>
              <button
                onClick={() => setShowCarbonExplainer(!showCarbonExplainer)}
                className="text-slate-400 hover:text-amber-600 transition cursor-pointer"
                title="Pédagogie : Intensité carbone totale vs Intensité carbone fossile"
                aria-label="Explication intensité carbone fossile"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </span>
            <Flame className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-amber-700 dark:text-amber-400">
            {snapshot.fossilOnlyCarbonIntensity != null ? (
              <UnitFormattedValue value={snapshot.fossilOnlyCarbonIntensity} unit="gCO2eq/kWh" />
            ) : (
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                0 g (Mix 100% décarboné)
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1 leading-snug">
            Intensité carbone fossile : uniquement la production fossile.
          </span>
        </div>

        {/* 3. Part Bas-Carbone & CARBON-FREE LEVEL */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs relative">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Part bas-carbone</span>
              <button
                onClick={() => setShowCarbonFreeLevelExplainer(!showCarbonFreeLevelExplainer)}
                className="text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                title="Pédagogie : Carbon-Free Level (comparé à la moyenne récente de la zone)"
                aria-label="Explication Carbon-Free Level"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>

          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              <UnitFormattedValue value={snapshot.fossilFreePercentage} unit="%" />
            </div>

            {/* BADGE VISIBLE OFFICIEL : CARBON-FREE LEVEL */}
            {snapshot.carbonFreeLevel && (
              <div
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border tracking-wide shadow-xs ${
                  formatCarbonFreeLevelBadge(snapshot.carbonFreeLevel).bg
                } ${formatCarbonFreeLevelBadge(snapshot.carbonFreeLevel).color}`}
                title="Niveau relatif officiel Electricity Maps (/v4/carbon-free-percentage-level/latest)"
              >
                <span>{formatCarbonFreeLevelBadge(snapshot.carbonFreeLevel).dot}</span>
                <span className="font-mono text-[11px] font-extrabold uppercase">
                  {formatCarbonFreeLevelBadge(snapshot.carbonFreeLevel).text}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            <span>CARBON-FREE LEVEL</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              vs moyenne récente
            </span>
          </div>
        </div>

        {/* 4. Part Renouvelable & RENEWABLE LEVEL */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs relative">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Part renouvelable</span>
              <button
                onClick={() => setShowRenewableLevelExplainer(!showRenewableLevelExplainer)}
                className="text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                title="Pédagogie : Valeur Absolue (%) vs Niveau Relatif (/v4/renewable-percentage-level/latest)"
                aria-label="Explication Renewable Level"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </span>
            <Leaf className="w-4 h-4 text-emerald-500" />
          </div>

          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              <UnitFormattedValue value={snapshot.renewablePercentage} unit="%" />
            </div>

            {/* BADGE VISIBLE OFFICIEL : RENEWABLE LEVEL */}
            {snapshot.renewableLevel && (
              <div
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border tracking-wide shadow-xs ${
                  formatRenewableLevelBadge(snapshot.renewableLevel).bg
                } ${formatRenewableLevelBadge(snapshot.renewableLevel).color}`}
                title="Niveau relatif officiel Electricity Maps (/v4/renewable-percentage-level/latest)"
              >
                <span>{formatRenewableLevelBadge(snapshot.renewableLevel).dot}</span>
                <span className="font-mono text-[11px] font-extrabold uppercase">
                  {formatRenewableLevelBadge(snapshot.renewableLevel).text}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            <span>RENEWABLE LEVEL</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              vs moyenne récente
            </span>
          </div>
        </div>

        {/* 5. Total Load */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs relative">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Total Load</span>
              <button
                onClick={() => setShowLoadExplainer(!showLoadExplainer)}
                className="text-slate-400 hover:text-sky-600 transition cursor-pointer"
                title="Explication Total Load vs Total Reported Load"
                aria-label="Explication Total Load"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </span>
            <Zap className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-sky-600 dark:text-sky-400">
            <UnitFormattedValue value={snapshot.totalConsumption} unit="GW" />
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1 leading-snug">
            Total Load : valeur calculée selon la méthodologie Electricity Maps.
          </span>
        </div>

        {/* 6. Total Reported Load */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs relative">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Total Reported Load</span>
              <button
                onClick={() => setShowLoadExplainer(!showLoadExplainer)}
                className="text-slate-400 hover:text-sky-600 transition cursor-pointer"
                title="Explication Total Load vs Total Reported Load"
                aria-label="Explication Total Reported Load"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </span>
            <Radio className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-800 dark:text-slate-200">
            {snapshot.reportedLoad ? (
              <UnitFormattedValue value={snapshot.reportedLoad} unit="GW" />
            ) : (
              <span className="text-slate-400 italic text-base">Non rapporté</span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1 leading-snug">
            Total Reported Load : valeur fournie par le gestionnaire de réseau.
          </span>
        </div>

        {/* 7. Charge Nette (Net Load) */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs relative">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span>Charge Nette</span>
              <button
                onClick={() => setShowNetLoadExplainer(!showNetLoadExplainer)}
                className="text-slate-400 hover:text-sky-600 cursor-pointer"
                title="Explication de la charge nette"
              >
                <HelpCircle className="w-3 h-3" />
              </button>
            </span>
            <TrendingDown className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-amber-600 dark:text-amber-400">
            <UnitFormattedValue value={snapshot.netLoad} unit="GW" />
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1 leading-snug">
            Signal officiel V4 (/v4/net-load/latest)
          </span>
        </div>

        {/* 8. Source Dominante (Electricity Source) */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Source Principale</span>
            <Activity className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
            {snapshot.dominantSource ? snapshot.dominantSource.labelFr : '—'}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1 font-mono">
            {snapshot.dominantSource?.percentage != null
              ? `${snapshot.dominantSource.percentage}% de la production`
              : '—'}
          </span>
        </div>

        {/* 9. Solde Échanges Net */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Solde Net</span>
            <ArrowRightLeft className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2 text-xl font-bold">
            {snapshot.netExport !== null ? (
              <span className={snapshot.netExport >= 0 ? 'text-emerald-600' : 'text-amber-600'}>
                {snapshot.netExport >= 0 ? `+${(snapshot.netExport / 1000).toFixed(1)} GW` : `${(snapshot.netExport / 1000).toFixed(1)} GW`}
              </span>
            ) : (
              <span className="text-slate-400 italic">—</span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {snapshot.netExport !== null && snapshot.netExport >= 0 ? 'Exportateur net' : 'Importateur net'}
          </span>
        </div>
      </div>

      {/* Popover pédagogique pour Intensité Carbone Totale vs Fossile Seule */}
      {showCarbonExplainer && (
        <div className="bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 p-4 rounded-xl text-xs text-rose-900 dark:text-rose-200 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Info className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Pédagogie : Intensité carbone totale vs Intensité carbone fossile</span>
            </div>
            <button
              onClick={() => setShowCarbonExplainer(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-xs"
            >
              ✕ Fermer
            </button>
          </div>
          <p className="leading-relaxed text-slate-700 dark:text-slate-300">
            L'API Electricity Maps V4 sépare méthodologiquement deux signaux d'émissions essentiels :
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="bg-white/90 dark:bg-slate-800/90 p-3 rounded-lg border border-rose-200/80 dark:border-rose-800/60">
              <div className="flex items-center justify-between font-bold text-rose-700 dark:text-rose-400">
                <span>Intensité carbone ({snapshot.carbonIntensity != null ? `${snapshot.carbonIntensity} gCO₂eq/kWh` : '—'})</span>
                <code className="text-[10px] text-slate-500 font-mono">/v4/carbon-intensity/latest</code>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                <strong>Intensité carbone totale : ensemble du mix.</strong> C'est l'empreinte carbone moyenne d'un kilowattheure consommé sur le réseau, toutes sources confondues (nucléaire, éolien, solaire, hydro, biomasse et fossiles). En France, le mix est décarboné à 94%, ce qui dilue massivement les émissions à <strong>42 gCO₂eq/kWh</strong>.
              </p>
            </div>
            <div className="bg-white/90 dark:bg-slate-800/90 p-3 rounded-lg border border-amber-200/80 dark:border-amber-800/60">
              <div className="flex items-center justify-between font-bold text-amber-700 dark:text-amber-400">
                <span>Intensité carbone fossile ({snapshot.fossilOnlyCarbonIntensity != null ? `${snapshot.fossilOnlyCarbonIntensity} gCO₂eq/kWh` : '—'})</span>
                <code className="text-[10px] text-slate-500 font-mono">/v4/carbon-intensity-fossil-only/latest</code>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                <strong>Intensité carbone fossile : uniquement la production fossile.</strong> Elle mesure l'efficacité carbone intrinsèque des seules centrales thermiques (gaz, fioul, charbon) en fonctionnement. En France, les centrales thermiques d'appoint de pointe émettent en moyenne <strong>390 gCO₂eq/kWh</strong> lorsqu'elles tournent.
              </p>
            </div>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1.5 border-t border-rose-200/60 dark:border-rose-800/40 space-y-1">
            <div>
              💡 <em>Intérêt pédagogique :</em> une intensité carbone totale très basse (42 g) ne signifie pas que les turbines thermiques ne polluent pas, mais qu'elles représentent un très faible pourcentage du mix électrique. L'intensité carbone fossile (390 g) permet d'évaluer le rendement des turbines thermiques indépendamment du volume de nucléaire ou d'énergies renouvelables.
            </div>
            <div>
              🎯 <em>Carbon Intensity Level (<code className="font-mono text-[10px] text-rose-700 dark:text-rose-400">/v4/carbon-intensity-level/latest</code>) :</em> Electricity Maps ne calcule pas ce palier sur des seuils universels fixes inventés, mais relativement au comportement historique récent de la zone. Pour la France, 42 gCO₂eq/kWh correspond ainsi au niveau officiel <strong>🟢 LOW</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Popover pédagogique pour CARBON-FREE LEVEL */}
      {showCarbonFreeLevelExplainer && (
        <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-4 rounded-xl text-xs text-emerald-950 dark:text-emerald-200 space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Signal officiel V4 : Carbon-Free Level (<code className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400">/v4/carbon-free-percentage-level/latest</code>)</span>
            </div>
            <button
              onClick={() => setShowCarbonFreeLevelExplainer(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-xs"
            >
              ✕ Fermer
            </button>
          </div>

          <p className="leading-relaxed text-slate-700 dark:text-slate-300">
            <strong>Ce n'est pas un simple seuil arbitraire :</strong> Electricity Maps compare la part bas-carbone instantanée à la <strong>moyenne récente observée pour la zone</strong> (sur les semaines ou mois écoulés). Ce niveau contextualise ainsi la performance en temps réel :
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-slate-700 dark:text-slate-300">
            <div className="bg-white/90 dark:bg-slate-800/90 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-700 dark:text-emerald-400">🟢 HIGH</span>
                {snapshot.countryCode === 'FR' && (
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-semibold">Actuel (FR)</span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                Part bas-carbone nettement au-dessus de la moyenne locale récente. En France (94%), le nucléaire et les renouvelables couvrent la quasi-totalité de la charge.
              </p>
            </div>

            <div className="bg-white/90 dark:bg-slate-800/90 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
              <span className="font-bold text-amber-700 dark:text-amber-400">🟡 MODERATE</span>
              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                Part bas-carbone conforme aux standards moyens récents de la zone (situation nominale pour le réseau national).
              </p>
            </div>

            <div className="bg-white/90 dark:bg-slate-800/90 p-3 rounded-lg border border-rose-200 dark:border-rose-800">
              <span className="font-bold text-rose-700 dark:text-rose-400">🔴 LOW</span>
              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                Sous-performance bas-carbone par rapport aux capacités récentes de la zone (ex: moindre météo éolienne/solaire ou appel thermique exceptionnel).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Popover pédagogique pour RENEWABLE LEVEL (Valeur absolue vs Niveau relatif) */}
      {showRenewableLevelExplainer && (
        <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-4 rounded-xl text-xs text-emerald-950 dark:text-emerald-200 space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Leaf className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Signal officiel V4 : Renewable Percentage Level (<code className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400">/v4/renewable-percentage-level/latest</code>)</span>
            </div>
            <button
              onClick={() => setShowRenewableLevelExplainer(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-xs"
            >
              ✕ Fermer
            </button>
          </div>

          <p className="leading-relaxed text-slate-700 dark:text-slate-300">
            Cette double lecture permet une distinction pédagogique essentielle entre <strong>valeur absolue</strong> et <strong>niveau relatif</strong> :
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-slate-700 dark:text-slate-300">
            <div className="bg-white/90 dark:bg-slate-800/90 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">
                  VALEUR ABSOLUE ({snapshot.renewablePercentage != null ? `${snapshot.renewablePercentage}%` : '—'})
                </span>
                <span className="text-[10px] font-mono text-slate-500">Signal #9</span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                Part physique exacte de l'électricité issue des filières renouvelables (éolien, solaire, hydro, etc.) à l'instant T. En France, 27% du mix provient des renouvelables.
              </p>
            </div>

            <div className="bg-white/90 dark:bg-slate-800/90 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  NIVEAU RELATIF ({snapshot.renewableLevel ? `${formatRenewableLevelBadge(snapshot.renewableLevel).dot} ${formatRenewableLevelBadge(snapshot.renewableLevel).text}` : '—'})
                </span>
                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold">Signal #13</span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                Electricity Maps compare ces 27% à la moyenne historique récente de la zone. Pour un réseau comme la France dominé par le nucléaire, 27% de renouvelables représente un niveau <strong>HIGH</strong> (significativement supérieur au régime habituel de la zone).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Popover pédagogique pour Total Load vs Total Reported Load */}
      {showLoadExplainer && (
        <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 p-4 rounded-xl text-xs text-sky-900 dark:text-sky-200 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Info className="w-4 h-4 text-sky-600 shrink-0" />
              <span>Pourquoi Total Load et Total Reported Load peuvent différer :</span>
            </div>
            <button
              onClick={() => setShowLoadExplainer(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-xs"
            >
              ✕ Fermer
            </button>
          </div>
          <p className="leading-relaxed text-slate-700 dark:text-slate-300">
            Electricity Maps expose deux signaux distincts de charge pour rendre compte fidèlement de la réalité physique et des déclarations administratives :
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="bg-white/90 dark:bg-slate-800/90 p-3 rounded-lg border border-sky-200/80 dark:border-sky-800/60">
              <div className="flex items-center gap-1.5 font-bold text-sky-700 dark:text-sky-400">
                <Zap className="w-3.5 h-3.5" />
                <span>Total Load ({snapshot.totalConsumption ? `${(snapshot.totalConsumption / 1000).toFixed(1)} GW` : '—'})</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                <strong>Valeur calculée selon la méthodologie Electricity Maps.</strong> Elle applique une définition harmonisée sur toute l'Europe (Production totale + Solde net des flux d'importation/exportation physique), intégrant l'ensemble des pertes de transport et la demande globale.
              </p>
            </div>
            <div className="bg-white/90 dark:bg-slate-800/90 p-3 rounded-lg border border-blue-200/80 dark:border-blue-800/60">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <Radio className="w-3.5 h-3.5 text-blue-500" />
                <span>Total Reported Load ({snapshot.reportedLoad ? `${(snapshot.reportedLoad / 1000).toFixed(1)} GW` : '—'})</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                <strong>Valeur fournie par le gestionnaire de réseau</strong> (RTE en France, ENTSO-E pour les TSO européens). Les gestionnaires de réseau appliquent leurs propres règles de reporting nationales (certains excluent l'autoconsommation industrielle, les stations de pompage STEP ou les pertes réseau).
              </p>
            </div>
          </div>
          {snapshot.totalConsumption != null && snapshot.reportedLoad != null && (
            <div className="text-[11px] font-mono text-sky-800 dark:text-sky-300 pt-1">
              Écart mesuré sur {snapshot.countryNameFr} : {snapshot.totalConsumption - snapshot.reportedLoad > 0 ? '+' : ''}{((snapshot.totalConsumption - snapshot.reportedLoad) / 1000).toFixed(1)} GW ({Math.abs(snapshot.totalConsumption - snapshot.reportedLoad).toLocaleString('fr-FR')} MW)
            </div>
          )}
        </div>
      )}

      {/* Popover pédagogique pour la charge nette */}
      {showNetLoadExplainer && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-4 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 animate-in fade-in duration-150">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <strong className="block font-semibold">Signal officiel : Charge nette (Net Load)</strong>
              <code className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">/v4/net-load/latest</code>
            </div>
            <p className="mt-0.5 leading-relaxed text-amber-800 dark:text-amber-300">
              La charge nette est le signal officiel fourni directement par l'API Electricity Maps. Contrairement à une simple soustraction locale approximative, la méthodologie officielle intègre la consommation totale, la production intermittente (éolien + solaire), mais également les cycles de stockage (batteries, pompage-turbinage STEP) et la dynamique des échanges pour refléter la demande résiduelle exacte imposée aux moyens de production pilotables (nucléaire, hydraulique, gaz).
            </p>
          </div>
        </div>
      )}

      {/* Section Données Historiques (24h) - Graphique Recharts */}
      <CountryHistorySection snapshot={snapshot} onNavigate={onNavigate} />

      {/* Section Historique du Mix Électrique (24h) - Filière par filière */}
      <CountryMixHistorySection snapshot={snapshot} onNavigate={onNavigate} />

      {/* Section Complète : Les 13 Signaux Officiels de l'API Electricity Maps V4 */}
      <ApiV4SignalsSection snapshot={snapshot} />

      {/* Section Principale : Mix Électrique et "Pourquoi ce chiffre ?" */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche (2/3) : Composition du Mix Électrique */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600" />
                <span>
                  {viewMode === 'consumption' ? 'Mix de Consommation (Flow-traced)' : 'Mix de Production Nationale'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {viewMode === 'consumption'
                  ? `Mix réel des électrons consommés dans le pays, calculé par Electricity Maps via traçage des flux physiques transfrontaliers (Total : ${totalSumMW > 0 ? `${(totalSumMW / 1000).toFixed(1)} GW` : '—'}).`
                  : `Puissance instantanée injectée sur le réseau par les centrales de production situées sur le territoire (Total : ${totalSumMW > 0 ? `${(totalSumMW / 1000).toFixed(1)} GW` : '—'}).`}
              </p>
            </div>

            {/* Bascule Production / Consommation */}
            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => setViewMode('production')}
                className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                  viewMode === 'production'
                    ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Production nationale
              </button>
              <button
                onClick={() => setViewMode('consumption')}
                className={`px-3 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'consumption'
                    ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Consommation (Flow-traced)</span>
              </button>
            </div>
          </div>

          {/* Bannière explicative Flow-Tracing si mode Consommation */}
          {viewMode === 'consumption' && (
            <div className="bg-sky-50/90 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 p-3 rounded-xl text-xs text-sky-950 dark:text-sky-200 flex items-start gap-2.5 animate-in fade-in duration-150">
              <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Méthodologie officielle Flow-Tracing (Échanges & Pertes intégrés)
                  </span>
                  <span className="font-mono text-[10px] text-sky-700 dark:text-sky-400">/v4/electricity-mix/latest</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  L'API V4 distingue le <strong>mix de production</strong> (parc électrique national) et le <strong>mix de consommation flow-traced</strong>. Ce dernier retrace les électrons importés depuis les pays frontaliers et déduit la part de production nationale exportée, reflétant l'empreinte réelle de l'électricité consommée par les citoyens et l'industrie.
                </p>
              </div>
            </div>
          )}

          {/* Barre proportionnelle horizontale empilée */}
          {validSources.length > 0 && totalSumMW > 0 && (
            <div className="space-y-1.5">
              <div className="w-full h-6 rounded-lg overflow-hidden flex bg-slate-100 dark:bg-slate-900 shadow-inner">
                {validSources.map((item) => {
                  const pct = (item.powerMW / totalSumMW) * 100;
                  return (
                    <div
                      key={item.key}
                      style={{ width: `${pct}%`, backgroundColor: item.meta.color }}
                      title={`${item.meta.labelFr} : ${(item.powerMW / 1000).toFixed(1)} GW (${pct.toFixed(1)}%)`}
                      className="h-full hover:brightness-110 transition-all cursor-pointer"
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* Liste détaillée par source */}
          <div className="space-y-2 pt-2">
            {validSources.map((item) => {
              const pct = totalSumMW > 0 ? (item.powerMW / totalSumMW) * 100 : 0;
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.meta.color }}
                    />
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {item.meta.labelFr}
                      </span>
                      <span className="text-[10px] text-slate-400 block -mt-0.5">
                        {item.meta.isRenewable ? 'Renouvelable' : item.meta.isCarbonFree ? 'Bas-carbone (fissile)' : 'Fossile thermique'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {(item.powerMW / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} GW
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-2">
                      ({pct.toFixed(1)} %)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Colonne droite (1/3) : "Pourquoi ce chiffre ?" & Qualité */}
        <div className="space-y-6">
          {/* Module pédagogique "Pourquoi ce chiffre ?" */}
          <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2 mb-3">
              <Activity className="w-4 h-4 text-amber-500" />
              <span>Pourquoi ce chiffre ?</span>
            </h3>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
              <p>
                L'intensité carbone de <strong>{snapshot.carbonIntensity ?? '—'} gCO₂eq/kWh</strong> résulte de la composition de l'électricité {viewMode === 'consumption' ? 'consommée (Flow-traced, intégrant les échanges)' : 'produite localement'} :
              </p>

              <div className="space-y-1.5 pt-1">
                {majorSources.slice(0, 5).map((s) => (
                  <div key={s.key} className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800 text-[11px]">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.meta.color }} />
                      {s.meta.labelFr}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {s.sharePercent} %
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-slate-400 italic pt-2">
                Facteurs d'émission calculés selon l'analyse du cycle de vie (construction, combustible, exploitation et démantèlement) certifiée par Electricity Maps.
              </p>
            </div>
          </div>

          {/* Module Interconnexions & Flux de voisinage */}
          <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2 mb-3">
              <ArrowRightLeft className="w-4 h-4 text-sky-600" />
              <span>Échanges avec les Voisins</span>
            </h3>

            {exchangeFlows.length > 0 ? (
              <div className="space-y-2">
                {exchangeFlows.map((flow, idx) => {
                  const isExport = flow.fromZone === snapshot.zoneKey;
                  const partner = isExport ? flow.toZone : flow.fromZone;

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-1.5 font-medium">
                        <span className={isExport ? 'text-emerald-600' : 'text-amber-600'}>
                          {isExport ? '→ Export vers' : '← Import depuis'}
                        </span>
                        <button
                          onClick={() => onSelectCountry(partner)}
                          className="font-bold underline decoration-sky-400 hover:text-sky-600 cursor-pointer"
                        >
                          {partner}
                        </button>
                      </div>
                      <span className="font-semibold font-mono">
                        {(flow.flowMW / 1000).toFixed(2)} GW
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Aucun flux transfrontalier actif ou réseau insulaire non raccordé.
              </p>
            )}
          </div>

          {/* Données techniques et qualité */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Code zone :</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{snapshot.zoneKey}</span>
            </div>
            <div className="flex justify-between">
              <span>Mesure :</span>
              <span>{snapshot.isEstimated ? 'Modélisée / Estimée' : 'Directement mesurée'}</span>
            </div>
            {snapshot.estimationMethod && (
              <div className="flex justify-between">
                <span>Méthode :</span>
                <span>{snapshot.estimationMethod}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Dernière synchro :</span>
              <span className="font-mono">
                {new Date(snapshot.updatedAt).toLocaleTimeString('fr-FR')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
