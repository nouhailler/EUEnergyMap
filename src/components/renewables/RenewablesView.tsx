import React, { useState } from 'react';
import { Leaf, Sun, Wind, Droplets, TreePine, ArrowUpDown } from 'lucide-react';
import { CountryElectricitySnapshot } from '../../types/energy';
import { EU_COUNTRIES } from '../../data/euCountries';
import { UnitFormattedValue } from '../common/UnitFormattedValue';

interface RenewablesViewProps {
  snapshots: Record<string, CountryElectricitySnapshot>;
  onSelectCountry: (countryCode: string) => void;
}

export const RenewablesView: React.FC<RenewablesViewProps> = ({
  snapshots,
  onSelectCountry,
}) => {
  const [sortAsc, setSortAsc] = useState(false);

  // Cumul européen par filière renouvelable
  let totalSolarMW = 0;
  let totalWindMW = 0;
  let totalHydroMW = 0;
  let totalBiomassMW = 0;
  let totalGeothermalMW = 0;

  for (const s of Object.values(snapshots || {})) {
    if (!s?.productionBreakdown) continue;
    totalSolarMW += s.productionBreakdown.solar ?? 0;
    totalWindMW += s.productionBreakdown.wind ?? 0;
    totalHydroMW += s.productionBreakdown.hydro ?? 0;
    totalBiomassMW += s.productionBreakdown.biomass ?? 0;
    totalGeothermalMW += s.productionBreakdown.geothermal ?? 0;
  }

  const grandTotalRenewableMW =
    totalSolarMW + totalWindMW + totalHydroMW + totalBiomassMW + totalGeothermalMW;

  const sortedCountries = [...EU_COUNTRIES].sort((a, b) => {
    const renA = snapshots[a.code]?.renewablePercentage ?? -1;
    const renB = snapshots[b.code]?.renewablePercentage ?? -1;
    return sortAsc ? renA - renB : renB - renA;
  });

  return (
    <div className="space-y-6">
      {/* En-tête Renouvelables */}
      <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Leaf className="w-5 h-5 text-emerald-500" />
          <span>Observatoire des Énergies Renouvelables Européennes</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Suivi instantané de la production électrique issue des sources naturelles renouvelables (flux solaire, vents, cycles hydrauliques et biomasse durable) dans les 27 pays membres.
        </p>
      </div>

      {/* Cartes filières renouvelables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Éolien */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Éolien (Terrestre & Mer)</span>
            <Wind className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            <UnitFormattedValue value={totalWindMW} unit="GW" />
          </div>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {grandTotalRenewableMW > 0 ? `${Math.round((totalWindMW / grandTotalRenewableMW) * 100)}% du renouvelable` : ''}
          </span>
        </div>

        {/* Solaire */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Solaire Photovoltaïque</span>
            <Sun className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            <UnitFormattedValue value={totalSolarMW} unit="GW" />
          </div>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {grandTotalRenewableMW > 0 ? `${Math.round((totalSolarMW / grandTotalRenewableMW) * 100)}% du renouvelable` : ''}
          </span>
        </div>

        {/* Hydraulique */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Hydraulique (Lacs & Fleuves)</span>
            <Droplets className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            <UnitFormattedValue value={totalHydroMW} unit="GW" />
          </div>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {grandTotalRenewableMW > 0 ? `${Math.round((totalHydroMW / grandTotalRenewableMW) * 100)}% du renouvelable` : ''}
          </span>
        </div>

        {/* Biomasse & Géothermie */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Biomasse & Géothermie</span>
            <TreePine className="w-4 h-4 text-lime-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            <UnitFormattedValue value={totalBiomassMW + totalGeothermalMW} unit="GW" />
          </div>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {grandTotalRenewableMW > 0 ? `${Math.round(((totalBiomassMW + totalGeothermalMW) / grandTotalRenewableMW) * 100)}% du renouvelable` : ''}
          </span>
        </div>
      </div>

      {/* Tableau triable des pays */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Répartition par Pays
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tri contrôlé par l'utilisateur. Cliquez sur l'en-tête pour inverser l'ordre.
            </p>
          </div>

          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span>{sortAsc ? 'Part croissante' : 'Part décroissante'}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-semibold">
                <th scope="col" className="py-3 px-4">Pays</th>
                <th scope="col" className="py-3 px-3 text-right">Part Renouvelable</th>
                <th scope="col" className="py-3 px-3 text-right">Éolien</th>
                <th scope="col" className="py-3 px-3 text-right">Solaire</th>
                <th scope="col" className="py-3 px-3 text-right">Hydraulique</th>
                <th scope="col" className="py-3 px-3 text-right">Biomasse</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedCountries.map((c) => {
                const s = snapshots[c.code];
                return (
                  <tr
                    key={c.code}
                    onClick={() => onSelectCountry(c.code)}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition cursor-pointer"
                  >
                    <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span>{c.flag}</span>
                        <span>{c.nameFr}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      <UnitFormattedValue value={s?.renewablePercentage} unit="%" />
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">
                      <UnitFormattedValue value={s?.productionBreakdown.wind} unit="autoPower" />
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">
                      <UnitFormattedValue value={s?.productionBreakdown.solar} unit="autoPower" />
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">
                      <UnitFormattedValue value={s?.productionBreakdown.hydro} unit="autoPower" />
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">
                      <UnitFormattedValue value={s?.productionBreakdown.biomass} unit="autoPower" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
