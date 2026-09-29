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
import { ApiV4SignalsSection } from './ApiV4SignalsSection';

interface CountryDetailViewProps {
  snapshot: CountryElectricitySnapshot;
  onBack: () => void;
  onSelectCountry: (countryCode: string) => void;
}

export const CountryDetailView: React.FC<CountryDetailViewProps> = ({
  snapshot,
  onBack,
  onSelectCountry,
}) => {
  const [viewMode, setViewMode] = useState<'production' | 'consumption'>('production');
  const [showNetLoadExplainer, setShowNetLoadExplainer] = useState(false);
  const [showLoadExplainer, setShowLoadExplainer] = useState(false);

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
        {/* 1. Intensité Carbone Totale */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Intensité Carbone</span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            <UnitFormattedValue value={snapshot.carbonIntensity} unit="gCO2eq/kWh" />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
            <span>Cycle de vie (LCA)</span>
            {snapshot.carbonIntensityLevel && (
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                Niveau : {snapshot.carbonIntensityLevel}
              </span>
            )}
          </div>
        </div>

        {/* 2. Intensité Carbone Fossile Seule */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs relative">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Intensité Fossile Seule</span>
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
          <span className="text-[10px] text-slate-400 block mt-1">Centrales thermiques actives</span>
        </div>

        {/* 3. Part Bas-Carbone (Carbon-free) */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Part Bas-Carbone</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-indigo-600 dark:text-indigo-400">
            <UnitFormattedValue value={snapshot.fossilFreePercentage} unit="%" />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
            <span>Renouvelable + Nucléaire</span>
            {snapshot.carbonFreeLevel && (
              <span className="font-semibold text-indigo-600 dark:text-indigo-300">
                Niveau : {snapshot.carbonFreeLevel}
              </span>
            )}
          </div>
        </div>

        {/* 4. Part Renouvelable */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Part Renouvelable</span>
            <Leaf className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400">
            <UnitFormattedValue value={snapshot.renewablePercentage} unit="%" />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
            <span>Solaire, éolien, hydro...</span>
            {snapshot.renewableLevel && (
              <span className="font-semibold text-emerald-600 dark:text-emerald-300">
                Niveau : {snapshot.renewableLevel}
              </span>
            )}
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
          <span className="text-[10px] text-slate-400 block mt-1">Charge résiduelle hors ENR</span>
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
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-4 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold">Qu'est-ce que la charge nette (Net Load) ?</strong>
            <p className="mt-0.5 leading-relaxed">
              La charge nette (ou charge résiduelle) correspond à la consommation totale du pays diminuée de la production éolienne et solaire instantanée. Elle représente la puissance exacte qui doit être couverte par les sources d'énergie pilotables (nucléaire, hydraulique, centrales thermiques) ou par les importations transfrontalières.
            </p>
          </div>
        </div>
      )}

      {/* Section Données Historiques (24h) - Graphique Recharts */}
      <CountryHistorySection snapshot={snapshot} />

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
                <span>Mix Électrique Actuel</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Puissance instantanée générée par filière énergétique (Total : {totalSumMW > 0 ? `${(totalSumMW / 1000).toFixed(1)} GW` : '—'}).
              </p>
            </div>

            {/* Bascule Production / Consommation */}
            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => setViewMode('production')}
                className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                  viewMode === 'production'
                    ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Production nationale
              </button>
              <button
                onClick={() => setViewMode('consumption')}
                className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                  viewMode === 'consumption'
                    ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Consommation (Flow-traced)
              </button>
            </div>
          </div>

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
                L'intensité carbone de <strong>{snapshot.carbonIntensity ?? '—'} gCO₂eq/kWh</strong> résulte directement de la répartition des énergies dans le mix actuel :
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
