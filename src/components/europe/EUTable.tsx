import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
} from 'lucide-react';
import { CountryElectricitySnapshot } from '../../types/energy';
import { EU_COUNTRIES } from '../../data/euCountries';
import { UnitFormattedValue } from '../common/UnitFormattedValue';
import { DataQualityBadge } from '../common/DataQualityBadge';

interface EUTableProps {
  snapshots: Record<string, CountryElectricitySnapshot>;
  onSelectCountry: (countryCode: string) => void;
}

type SortField = 'name' | 'carbonIntensity' | 'renewableShare' | 'carbonFreeShare' | 'load' | 'netExport';
type SortOrder = 'asc' | 'desc';

export const EUTable: React.FC<EUTableProps> = ({ snapshots, onSelectCountry }) => {
  const [search, setSearch] = useState('');
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
      } else if (sortField === 'renewableShare') {
        valA = snapA?.renewablePercentage ?? (sortOrder === 'asc' ? 99999 : -99999);
        valB = snapB?.renewablePercentage ?? (sortOrder === 'asc' ? 99999 : -99999);
      } else if (sortField === 'carbonFreeShare') {
        valA = snapA?.fossilFreePercentage ?? (sortOrder === 'asc' ? 99999 : -99999);
        valB = snapB?.fossilFreePercentage ?? (sortOrder === 'asc' ? 99999 : -99999);
      } else if (sortField === 'load') {
        valA = snapA?.totalConsumption ?? (sortOrder === 'asc' ? 99999 : -99999);
        valB = snapB?.totalConsumption ?? (sortOrder === 'asc' ? 99999 : -99999);
      } else if (sortField === 'netExport') {
        valA = snapA?.netExport ?? (sortOrder === 'asc' ? 99999 : -99999);
        valB = snapB?.netExport ?? (sortOrder === 'asc' ? 99999 : -99999);
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

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs overflow-hidden">
      {/* Barre d'outils du tableau */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Tableau des 27 États Membres
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Alternative accessible à la carte avec tri et recherche instantanés.
          </p>
        </div>

        {/* Recherche */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un pays (ex: France, DE)..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Conteneur défilant du tableau */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <th scope="col" className="py-3 px-4">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <span>Pays</span>
                  {renderSortIcon('name')}
                </button>
              </th>
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
                  <span>Charge (Load)</span>
                  {renderSortIcon('load')}
                </button>
              </th>
              <th scope="col" className="py-3 px-3 text-right">
                <button
                  onClick={() => handleSort('netExport')}
                  className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer ml-auto"
                >
                  <span>Solde Échanges</span>
                  {renderSortIcon('netExport')}
                </button>
              </th>
              <th scope="col" className="py-3 px-4 text-center">
                <span>Qualité Donnée</span>
              </th>
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

                  {/* Intensité carbone */}
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

                  {/* Part Renouvelable */}
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <UnitFormattedValue
                      value={s?.renewablePercentage}
                      unit="%"
                      className="text-emerald-700 dark:text-emerald-400 font-semibold"
                    />
                  </td>

                  {/* Part Bas-Carbone */}
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <UnitFormattedValue
                      value={s?.fossilFreePercentage}
                      unit="%"
                      className="text-indigo-700 dark:text-indigo-400 font-semibold"
                    />
                  </td>

                  {/* Charge Totale (GW) */}
                  <td className="py-2.5 px-3 text-right whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                    <UnitFormattedValue value={s?.totalConsumption} unit="GW" />
                  </td>

                  {/* Solde net export / import */}
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
                        title={netExp > 0 ? 'Exportateur net' : 'Importateur net'}
                      >
                        {netExp > 0 ? `+${(netExp / 1000).toFixed(1)} GW` : `${(netExp / 1000).toFixed(1)} GW`}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">—</span>
                    )}
                  </td>

                  {/* Badge de qualité de la donnée */}
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

                  {/* Lien pays */}
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCountry(country.code);
                      }}
                      className="text-slate-400 hover:text-sky-600 p-1 rounded-md transition"
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
