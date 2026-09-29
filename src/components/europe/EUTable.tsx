import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Flame,
  Zap,
} from 'lucide-react';
import { CountryElectricitySnapshot, SignalLevel } from '../../types/energy';
import { EU_COUNTRIES } from '../../data/euCountries';
import { UnitFormattedValue } from '../common/UnitFormattedValue';
import { DataQualityBadge } from '../common/DataQualityBadge';

interface EUTableProps {
  snapshots: Record<string, CountryElectricitySnapshot>;
  onSelectCountry: (countryCode: string) => void;
}

type TableViewMode = 'standard' | 'v4_carbon' | 'v4_load';

type SortField =
  | 'name'
  | 'carbonIntensity'
  | 'fossilOnlyCarbon'
  | 'renewableShare'
  | 'carbonFreeShare'
  | 'load'
  | 'reportedLoad'
  | 'netLoad'
  | 'production'
  | 'netExport'
  | 'dominantSource';

type SortOrder = 'asc' | 'desc';

export const EUTable: React.FC<EUTableProps> = ({ snapshots, onSelectCountry }) => {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<TableViewMode>('standard');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedCountries = useMemo(() => {
    return EU_COUNTRIES.filter((country) => {
      const q = search.toLowerCase().trim();
      return (
        country.nameFr.toLowerCase().includes(q) ||
        country.nameEn.toLowerCase().includes(q) ||
        country.code.toLowerCase().includes(q)
      );
    }).sort((a, b) => {
      const snapA = snapshots[a.code];
      const snapB = snapshots[b.code];

      let valA: any = null;
      let valB: any = null;

      if (sortField === 'name') {
        valA = a.nameFr;
        valB = b.nameFr;
      } else if (sortField === 'carbonIntensity') {
        valA = snapA?.carbonIntensity ?? (sortOrder === 'asc' ? 99999 : -99999);
        valB = snapB?.carbonIntensity ?? (sortOrder === 'asc' ? 99999 : -99999);
      } else if (sortField === 'fossilOnlyCarbon') {
        valA = snapA?.fossilOnlyCarbonIntensity ?? (sortOrder === 'asc' ? 99999 : -99999);
        valB = snapB?.fossilOnlyCarbonIntensity ?? (sortOrder === 'asc' ? 99999 : -99999);
      } else if (sortField === 'renewableShare') {
        valA = snapA?.renewablePercentage ?? (sortOrder === 'asc' ? 99999 : -99999);
        valB = snapB?.renewablePercentage ?? (sortOrder === 'asc' ? 99999 : -99999);
      } else if (sortField === 'carbonFreeShare') {
        valA = snapA?.fossilFreePercentage ?? (sortOrder === 'asc' ? 99999 : -99999);
        valB = snapB?.fossilFreePercentage ?? (sortOrder === 'asc' ? 99999 : -99999);
      } else if (sortField === 'load') {
        valA = snapA?.totalConsumption ?? (sortOrder === 'asc' ? 99999 : -99999);
        valB = snapB?.totalConsumption ?? (sortOrder === 'asc' ? 99999 : -99999);
      } else if (sortField === 'reportedLoad') {
        valA = (snapA?.reportedLoad ?? snapA?.totalConsumption) ?? (sortOrder === 'asc' ? 99999 : -99999);
        valB = (snapB?.reportedLoad ?? snapB?.totalConsumption) ?? (sortOrder === 'asc' ? 99999 : -99999);
      } else if (sortField === 'netLoad') {
        valA = snapA?.netLoad ?? (sortOrder === 'asc' ? 99999 : -99999);
        valB = snapB?.netLoad ?? (sortOrder === 'asc' ? 99999 : -99999);
      } else if (sortField === 'production') {
        valA = snapA?.totalProduction ?? (sortOrder === 'asc' ? 99999 : -99999);
        valB = snapB?.totalProduction ?? (sortOrder === 'asc' ? 99999 : -99999);
      } else if (sortField === 'netExport') {
        valA = snapA?.netExport ?? (sortOrder === 'asc' ? 99999 : -99999);
        valB = snapB?.netExport ?? (sortOrder === 'asc' ? 99999 : -99999);
      } else if (sortField === 'dominantSource') {
        valA = snapA?.dominantSource?.labelFr ?? '';
        valB = snapB?.dominantSource?.labelFr ?? '';
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [snapshots, search, sortField, sortOrder]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-sky-600 dark:text-sky-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-sky-600 dark:text-sky-400" />
    );
  };

  const renderLevelBadge = (level?: SignalLevel | null) => {
    if (!level) return <span className="text-slate-400 font-mono text-[10px]">—</span>;
    const map: Record<SignalLevel, { label: string; bg: string; text: string }> = {
      'very-low': { label: 'T. faible', bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300' },
      low: { label: 'Faible', bg: 'bg-sky-50 dark:bg-sky-950/60', text: 'text-sky-700 dark:text-sky-300' },
      medium: { label: 'Moyen', bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300' },
      high: { label: 'Élevé', bg: 'bg-orange-50 dark:bg-orange-950/60', text: 'text-orange-700 dark:text-orange-300' },
      'very-high': { label: 'T. élevé', bg: 'bg-rose-50 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300' },
    };
    const c = map[level];
    return (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs overflow-hidden">
      {/* Barre d'outils du tableau */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Tableau Comparatif des 27 États Membres
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Exploration et tri instantané sur les 13 signaux normalisés de l'API Electricity Maps.
          </p>
        </div>

        {/* Contrôles : Sélecteur de vue & Barre de recherche */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Sélecteur d'onglets de vue */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl text-xs">
            <button
              onClick={() => setViewMode('standard')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                viewMode === 'standard'
                  ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Générale
            </button>
            <button
              onClick={() => setViewMode('v4_carbon')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                viewMode === 'v4_carbon'
                  ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>Signaux Carbone</span>
            </button>
            <button
              onClick={() => setViewMode('v4_load')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                viewMode === 'v4_load'
                  ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Charges Réseau</span>
            </button>
          </div>

          {/* Recherche */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrer par pays..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Tableau responsive */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50/70 dark:bg-slate-900/50 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th scope="col" className="py-3 px-4">
                <button
                  onClick={() => handleSort('name')}
                  className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <span>Pays (UE-27)</span>
                  {renderSortIcon('name')}
                </button>
              </th>

              {viewMode === 'standard' && (
                <>
                  <th scope="col" className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleSort('carbonIntensity')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer ml-auto"
                    >
                      <span>Intensité Carbone</span>
                      {renderSortIcon('carbonIntensity')}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleSort('renewableShare')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer ml-auto"
                    >
                      <span>Renouvelable</span>
                      {renderSortIcon('renewableShare')}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleSort('carbonFreeShare')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer ml-auto"
                    >
                      <span>Bas-Carbone</span>
                      {renderSortIcon('carbonFreeShare')}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleSort('load')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer ml-auto"
                    >
                      <span>Charge (Total load)</span>
                      {renderSortIcon('load')}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleSort('netExport')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer ml-auto"
                    >
                      <span>Solde Net</span>
                      {renderSortIcon('netExport')}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3">
                    <button
                      onClick={() => handleSort('dominantSource')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      <span>Source Principale</span>
                      {renderSortIcon('dominantSource')}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-4 text-center">
                    <span>Qualité</span>
                  </th>
                </>
              )}

              {viewMode === 'v4_carbon' && (
                <>
                  <th scope="col" className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleSort('carbonIntensity')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer ml-auto"
                    >
                      <span>Intensité Carbone</span>
                      {renderSortIcon('carbonIntensity')}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3 text-center">
                    <span>Palier Carbone</span>
                  </th>
                  <th scope="col" className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleSort('fossilOnlyCarbon')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer ml-auto"
                    >
                      <span>Fossile Seul</span>
                      {renderSortIcon('fossilOnlyCarbon')}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleSort('carbonFreeShare')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer ml-auto"
                    >
                      <span>Part Sans Fossile</span>
                      {renderSortIcon('carbonFreeShare')}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3 text-center">
                    <span>Palier Décarboné</span>
                  </th>
                  <th scope="col" className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleSort('renewableShare')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer ml-auto"
                    >
                      <span>Renouvelable</span>
                      {renderSortIcon('renewableShare')}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3 text-center">
                    <span>Palier Renouv.</span>
                  </th>
                </>
              )}

              {viewMode === 'v4_load' && (
                <>
                  <th scope="col" className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleSort('load')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer ml-auto"
                      title="Total Load : valeur calculée selon la méthodologie Electricity Maps."
                    >
                      <span>Total Load</span>
                      {renderSortIcon('load')}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleSort('reportedLoad')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer ml-auto"
                      title="Total Reported Load : valeur fournie par le gestionnaire de réseau."
                    >
                      <span>Total Reported Load</span>
                      {renderSortIcon('reportedLoad')}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleSort('netLoad')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer ml-auto"
                    >
                      <span>Net Load (Résiduelle)</span>
                      {renderSortIcon('netLoad')}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleSort('production')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer ml-auto"
                    >
                      <span>Production Totale</span>
                      {renderSortIcon('production')}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleSort('netExport')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer ml-auto"
                    >
                      <span>Solde Flux (MW)</span>
                      {renderSortIcon('netExport')}
                    </button>
                  </th>
                </>
              )}

              <th scope="col" className="py-3 px-3 text-right">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredAndSortedCountries.map((country) => {
              const s = snapshots[country.code];
              const netExp = s?.netExport;

              return (
                <tr
                  key={country.code}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group cursor-pointer"
                  onClick={() => onSelectCountry(country.code)}
                >
                  {/* Nom & Drapeau */}
                  <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-base" aria-hidden="true">
                        {country.flag}
                      </span>
                      <span>{country.nameFr}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({country.code})
                      </span>
                    </div>
                  </td>

                  {/* VUE STANDARD */}
                  {viewMode === 'standard' && (
                    <>
                      <td className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                        <UnitFormattedValue
                          value={s?.carbonIntensity}
                          unit="gCO2eq/kWh"
                          className={
                            s?.carbonIntensity !== null && (s?.carbonIntensity ?? 0) <= 60
                              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                              : s?.carbonIntensity !== null && (s?.carbonIntensity ?? 0) > 300
                              ? 'text-rose-600 dark:text-rose-400 font-bold'
                              : 'text-slate-800 dark:text-slate-200'
                          }
                        />
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <UnitFormattedValue
                          value={s?.renewablePercentage}
                          unit="%"
                          className="text-emerald-700 dark:text-emerald-400 font-semibold"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <UnitFormattedValue
                          value={s?.fossilFreePercentage}
                          unit="%"
                          className="text-indigo-700 dark:text-indigo-400 font-semibold"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                        <UnitFormattedValue value={s?.totalConsumption} unit="GW" />
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {netExp !== null && netExp !== undefined ? (
                          <span
                            className={`font-semibold ${
                              netExp > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : netExp < 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-500'
                            }`}
                          >
                            {netExp > 0 ? `+${(netExp / 1000).toFixed(1)} GW` : `${(netExp / 1000).toFixed(1)} GW`}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                        {s?.dominantSource ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span>{s.dominantSource.labelFr}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({s.dominantSource.percentage}%)
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        {s ? (
                          <DataQualityBadge
                            status={s.dataSourceQuality}
                            isEstimated={s.isEstimated}
                            estimationMethod={s.estimationMethod}
                          />
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">—</span>
                        )}
                      </td>
                    </>
                  )}

                  {/* VUE SIGNAUX CARBONE V4 */}
                  {viewMode === 'v4_carbon' && (
                    <>
                      <td className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                        <UnitFormattedValue
                          value={s?.carbonIntensity}
                          unit="gCO2eq/kWh"
                          className="font-bold text-slate-900 dark:text-white"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {renderLevelBadge(s?.carbonIntensityLevel)}
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono">
                        {s?.fossilOnlyCarbonIntensity != null ? (
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {s.fossilOnlyCarbonIntensity} g
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-[11px]">0 g (Décarboné)</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <UnitFormattedValue
                          value={s?.fossilFreePercentage}
                          unit="%"
                          className="text-indigo-600 dark:text-indigo-400 font-semibold"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {renderLevelBadge(s?.carbonFreeLevel)}
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <UnitFormattedValue
                          value={s?.renewablePercentage}
                          unit="%"
                          className="text-emerald-600 dark:text-emerald-400 font-semibold"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {renderLevelBadge(s?.renewableLevel)}
                      </td>
                    </>
                  )}

                  {/* VUE CHARGES RÉSEAU V4 */}
                  {viewMode === 'v4_load' && (
                    <>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-medium font-mono text-sky-600 dark:text-sky-400">
                        <UnitFormattedValue value={s?.totalConsumption} unit="GW" />
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono text-slate-700 dark:text-slate-300">
                        {s?.reportedLoad ? `${(s.reportedLoad / 1000).toFixed(2)} GW` : '—'}
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-semibold text-amber-600 dark:text-amber-400">
                        <UnitFormattedValue value={s?.netLoad} unit="GW" />
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono text-slate-600 dark:text-slate-400">
                        <UnitFormattedValue value={s?.totalProduction} unit="GW" />
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono">
                        {netExp !== null && netExp !== undefined ? (
                          <span className={netExp >= 0 ? 'text-emerald-600' : 'text-amber-600'}>
                            {netExp >= 0 ? `+${(netExp / 1000).toFixed(2)} GW` : `${(netExp / 1000).toFixed(2)} GW`}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>
                    </>
                  )}

                  {/* Lien pays */}
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCountry(country.code);
                      }}
                      className="text-slate-400 hover:text-sky-600 p-1 rounded-md transition cursor-pointer"
                      aria-label={`Voir détails pour ${country.nameFr}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
