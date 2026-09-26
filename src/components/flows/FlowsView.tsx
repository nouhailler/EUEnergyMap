import React, { useState } from 'react';
import { ArrowRightLeft, ArrowRight, ArrowDownLeft, ArrowUpRight, Filter } from 'lucide-react';
import { CountryElectricitySnapshot, CrossBorderFlow } from '../../types/energy';
import { EU_COUNTRIES } from '../../data/euCountries';
import { UnitFormattedValue } from '../common/UnitFormattedValue';

interface FlowsViewProps {
  snapshots: Record<string, CountryElectricitySnapshot>;
  onSelectCountry: (countryCode: string) => void;
}

export const FlowsView: React.FC<FlowsViewProps> = ({ snapshots, onSelectCountry }) => {
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>('ALL');

  // Collecte et dédoublonnage de l'ensemble des flux transfrontaliers
  const allFlows: CrossBorderFlow[] = [];
  const flowKeys = new Set<string>();

  for (const s of Object.values(snapshots)) {
    for (const f of s.exchangeFlows) {
      const key = `${f.fromZone}->${f.toZone}`;
      if (!flowKeys.has(key)) {
        flowKeys.add(key);
        allFlows.push(f);
      }
    }
  }

  // Tri par volume décroissant
  const sortedFlows = allFlows.sort((a, b) => b.flowMW - a.flowMW);

  const filteredFlows = sortedFlows.filter((f) => {
    if (selectedCountryFilter === 'ALL') return true;
    return f.fromZone === selectedCountryFilter || f.toZone === selectedCountryFilter;
  });

  // Calcul des exportateurs et importateurs nets
  const countryBalances = EU_COUNTRIES.map((c) => {
    const s = snapshots[c.code];
    return {
      country: c,
      netExport: s?.netExport ?? null,
      importTotal: s?.importTotal ?? null,
      exportTotal: s?.exportTotal ?? null,
    };
  }).filter((x) => x.netExport !== null);

  const netExporters = countryBalances
    .filter((b) => (b.netExport ?? 0) > 0)
    .sort((a, b) => (b.netExport ?? 0) - (a.netExport ?? 0));

  const netImporters = countryBalances
    .filter((b) => (b.netExport ?? 0) < 0)
    .sort((a, b) => (a.netExport ?? 0) - (b.netExport ?? 0));

  return (
    <div className="space-y-6">
      {/* En-tête des flux */}
      <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-sky-600" />
          <span>Flux & Interconnexions Transfrontalières Européennes</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Le réseau électrique européen est le plus grand réseau interconnecté au monde (réseau synchrone ENTSO-E). Les électrons circulent en continu selon les différences de production, de demande et les mécanismes de couplage de marché.
        </p>
      </div>

      {/* Résumé des soldes nets : Exportateurs vs Importateurs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Exportateurs nets */}
        <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            <span>Principaux Exportateurs Nets</span>
            <span className="text-[10px] text-slate-400 font-normal ml-auto">(Production &gt; Consommation)</span>
          </h3>

          <div className="space-y-2">
            {netExporters.slice(0, 5).map((item) => (
              <div
                key={item.country.code}
                onClick={() => onSelectCountry(item.country.code)}
                className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-xs hover:bg-emerald-100/50 transition cursor-pointer"
              >
                <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                  <span>{item.country.flag}</span>
                  <span>{item.country.nameFr}</span>
                </div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  +{( (item.netExport ?? 0) / 1000 ).toFixed(1)} GW
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Importateurs nets */}
        <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
            <ArrowDownLeft className="w-4 h-4 text-amber-600" />
            <span>Principaux Importateurs Nets</span>
            <span className="text-[10px] text-slate-400 font-normal ml-auto">(Consommation &gt; Production)</span>
          </h3>

          <div className="space-y-2">
            {netImporters.slice(0, 5).map((item) => (
              <div
                key={item.country.code}
                onClick={() => onSelectCountry(item.country.code)}
                className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 text-xs hover:bg-amber-100/50 transition cursor-pointer"
              >
                <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                  <span>{item.country.flag}</span>
                  <span>{item.country.nameFr}</span>
                </div>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {( (item.netExport ?? 0) / 1000 ).toFixed(1)} GW
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Visualisation et Tableau des Échanges Bilatéraux */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Échanges Bilatéraux Transfrontaliers
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Volumes instantanés transportés sur les lignes à haute tension interconnectées.
            </p>
          </div>

          {/* Filtre par pays */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCountryFilter}
              onChange={(e) => setSelectedCountryFilter(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 font-medium cursor-pointer shadow-2xs"
            >
              <option value="ALL">Tous les pays ({allFlows.length} liaisons)</option>
              {EU_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.nameFr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tableau des flux */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-semibold">
                <th scope="col" className="py-3 px-4">Zone Expéditrice (Export)</th>
                <th scope="col" className="py-3 px-3 text-center">Direction</th>
                <th scope="col" className="py-3 px-4">Zone Réceptrice (Import)</th>
                <th scope="col" className="py-3 px-4 text-right">Volume Échangé</th>
                <th scope="col" className="py-3 px-4">Représentation Graphique</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredFlows.map((flow, idx) => {
                const maxFlow = sortedFlows[0]?.flowMW || 3000;
                const percent = Math.min(100, Math.max(5, (flow.flowMW / maxFlow) * 100));

                return (
                  <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition">
                    <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                      <button
                        onClick={() => onSelectCountry(flow.fromZone)}
                        className="hover:text-sky-600 transition underline decoration-dotted cursor-pointer"
                      >
                        {flow.fromZone}
                      </button>
                    </td>

                    <td className="py-2.5 px-3 text-center text-sky-600">
                      <ArrowRight className="w-4 h-4 mx-auto inline" />
                    </td>

                    <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                      <button
                        onClick={() => onSelectCountry(flow.toZone)}
                        className="hover:text-sky-600 transition underline decoration-dotted cursor-pointer"
                      >
                        {flow.toZone}
                      </button>
                    </td>

                    <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {(flow.flowMW / 1000).toFixed(2)} GW
                      <span className="text-slate-400 font-normal text-[10px] ml-1">
                        ({flow.flowMW} MW)
                      </span>
                    </td>

                    <td className="py-2.5 px-4 w-1/3">
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                        <div
                          style={{ width: `${percent}%` }}
                          className="bg-sky-500 h-full rounded-full"
                          title={`${(flow.flowMW / 1000).toFixed(2)} GW`}
                        />
                      </div>
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
