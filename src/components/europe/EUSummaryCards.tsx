import React from 'react';
import { Flame, Leaf, Zap, ShieldCheck, Info } from 'lucide-react';
import { UnitFormattedValue } from '../common/UnitFormattedValue';

interface EUSummaryCardsProps {
  averageCarbonIntensity: number | null;
  totalConsumptionMW: number | null;
  averageRenewableShare: number | null;
  averageFossilFreeShare: number | null;
  coveredCountriesCount: number;
}

export const EUSummaryCards: React.FC<EUSummaryCardsProps> = ({
  averageCarbonIntensity,
  totalConsumptionMW,
  averageRenewableShare,
  averageFossilFreeShare,
  coveredCountriesCount,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Intensité Carbone */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Intensité Carbone Moyenne
          </span>
          <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
            <Flame className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
          <UnitFormattedValue value={averageCarbonIntensity} unit="gCO2eq/kWh" />
        </div>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Info className="w-3 h-3 text-slate-400 shrink-0" />
          Pondérée par la consommation des 27 pays
        </p>
      </div>

      {/* 2. Part Renouvelable */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Énergies Renouvelables
          </span>
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <Leaf className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          <UnitFormattedValue value={averageRenewableShare} unit="%" />
        </div>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          Éolien, solaire, hydro, biomasse, géothermie
        </p>
      </div>

      {/* 3. Part Bas-Carbone / Sans Fossile */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Électricité Bas-Carbone
          </span>
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
          <UnitFormattedValue value={averageFossilFreeShare} unit="%" />
        </div>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          Renouvelables + Nucléaire (sans fossile)
        </p>
      </div>

      {/* 4. Charge Totale Européenne */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Demande Totale Appelée
          </span>
          <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">
          <UnitFormattedValue value={totalConsumptionMW} unit="GW" />
        </div>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          Couverture : {coveredCountriesCount} / 27 pays membres
        </p>
      </div>
    </div>
  );
};
