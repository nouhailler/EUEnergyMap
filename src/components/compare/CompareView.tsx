import React, { useState } from 'react';
import { Layers, Plus, X, Info } from 'lucide-react';
import { CountryElectricitySnapshot, ProductionSourceKey } from '../../types/energy';
import { EU_COUNTRIES } from '../../data/euCountries';
import { PRODUCTION_SOURCES } from '../../data/sourcesMeta';
import { UnitFormattedValue } from '../common/UnitFormattedValue';
import { DataQualityBadge } from '../common/DataQualityBadge';

interface CompareViewProps {
  snapshots: Record<string, CountryElectricitySnapshot>;
  onSelectCountry: (countryCode: string) => void;
}

export const CompareView: React.FC<CompareViewProps> = ({ snapshots, onSelectCountry }) => {
  // Par défaut : France, Allemagne, Espagne
  const [selectedCodes, setSelectedCodes] = useState<string[]>(['FR', 'DE', 'ES']);

  const addCountry = (code: string) => {
    if (selectedCodes.length < 4 && !selectedCodes.includes(code)) {
      setSelectedCodes([...selectedCodes, code]);
    }
  };

  const removeCountry = (code: string) => {
    if (selectedCodes.length > 2) {
      setSelectedCodes(selectedCodes.filter((c) => c !== code));
    }
  };

  const availableCountries = EU_COUNTRIES.filter((c) => !selectedCodes.includes(c.code));

  const compareRows: {
    label: string;
    description?: string;
    render: (s?: CountryElectricitySnapshot) => React.ReactNode;
  }[] = [
    {
      label: 'Intensité Carbone',
      description: 'Émissions totales en cycle de vie',
      render: (s) => (
        <UnitFormattedValue
          value={s?.carbonIntensity}
          unit="gCO2eq/kWh"
          className="font-bold text-slate-900 dark:text-white"
        />
      ),
    },
    {
      label: 'Part Renouvelable',
      description: 'Éolien, solaire, hydro, biomasse, géothermie',
      render: (s) => (
        <UnitFormattedValue
          value={s?.renewablePercentage}
          unit="%"
          className="font-semibold text-emerald-600 dark:text-emerald-400"
        />
      ),
    },
    {
      label: 'Part Bas-Carbone',
      description: 'Sans fossile (Renouvelable + Fissile)',
      render: (s) => (
        <UnitFormattedValue
          value={s?.fossilFreePercentage}
          unit="%"
          className="font-semibold text-indigo-600 dark:text-indigo-400"
        />
      ),
    },
    {
      label: 'Charge Consommée (Total Load)',
      description: 'Puissance totale appelée par le réseau national',
      render: (s) => (
        <UnitFormattedValue value={s?.totalConsumption} unit="GW" className="font-medium" />
      ),
    },
    {
      label: 'Charge Nette (Net Load)',
      description: 'Charge totale résiduelle après soustraction de l’éolien et du solaire',
      render: (s) => (
        <UnitFormattedValue value={s?.netLoad} unit="GW" className="font-medium text-amber-600 dark:text-amber-400" />
      ),
    },
    {
      label: 'Solde Échanges Net',
      description: 'Export net (+) ou Import net (-)',
      render: (s) => {
        if (!s || s.netExport === null) return <span className="text-slate-400 italic">—</span>;
        return (
          <span className={`font-semibold ${s.netExport >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {s.netExport >= 0 ? `+${(s.netExport / 1000).toFixed(1)} GW` : `${(s.netExport / 1000).toFixed(1)} GW`}
          </span>
        );
      },
    },
    // Détail par filière
    {
      label: 'Nucléaire',
      render: (s) => (
        <UnitFormattedValue
          value={s?.productionBreakdown.nuclear}
          unit="GW"
          className="text-slate-700 dark:text-slate-300"
        />
      ),
    },
    {
      label: 'Éolien',
      render: (s) => (
        <UnitFormattedValue
          value={s?.productionBreakdown.wind}
          unit="GW"
          className="text-slate-700 dark:text-slate-300"
        />
      ),
    },
    {
      label: 'Solaire',
      render: (s) => (
        <UnitFormattedValue
          value={s?.productionBreakdown.solar}
          unit="GW"
          className="text-slate-700 dark:text-slate-300"
        />
      ),
    },
    {
      label: 'Hydraulique',
      render: (s) => (
        <UnitFormattedValue
          value={s?.productionBreakdown.hydro}
          unit="GW"
          className="text-slate-700 dark:text-slate-300"
        />
      ),
    },
    {
      label: 'Gaz fossile',
      render: (s) => (
        <UnitFormattedValue
          value={s?.productionBreakdown.gas}
          unit="GW"
          className="text-slate-700 dark:text-slate-300"
        />
      ),
    },
    {
      label: 'Charbon & Lignite',
      render: (s) => (
        <UnitFormattedValue
          value={s?.productionBreakdown.coal}
          unit="GW"
          className="text-slate-700 dark:text-slate-300"
        />
      ),
    },
    {
      label: 'Biomasse',
      render: (s) => (
        <UnitFormattedValue
          value={s?.productionBreakdown.biomass}
          unit="GW"
          className="text-slate-700 dark:text-slate-300"
        />
      ),
    },
    {
      label: 'Qualité de la donnée',
      render: (s) =>
        s ? (
          <DataQualityBadge
            status={s.dataSourceQuality}
            isEstimated={s.isEstimated}
            estimationMethod={s.estimationMethod}
          />
        ) : (
          <span className="text-slate-400 italic">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête explicatif */}
      <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-600" />
              <span>Comparaison Factuelle Multi-Pays</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Sélectionnez 2 à 4 pays parmi les 27 membres de l'UE. Conformément aux principes déontologiques du projet, cette vue présente des grandeurs physiques et mesurables, sans classement artificiel ni jugement de valeur.
            </p>
          </div>

          {/* Sélecteur d'ajout de pays */}
          {selectedCodes.length < 4 && availableCountries.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="add-country" className="sr-only">Ajouter un pays</label>
              <select
                id="add-country"
                onChange={(e) => {
                  if (e.target.value) {
                    addCountry(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 font-medium cursor-pointer shadow-2xs"
                defaultValue=""
              >
                <option value="" disabled>
                  + Ajouter un pays ({selectedCodes.length}/4)...
                </option>
                {availableCountries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.nameFr}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Tableau comparatif */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th scope="col" className="py-4 px-5 font-semibold w-1/3 min-w-[200px]">
                  Indicateur Factuel
                </th>
                {selectedCodes.map((code) => {
                  const country = EU_COUNTRIES.find((c) => c.code === code);
                  return (
                    <th key={code} scope="col" className="py-4 px-4 text-center min-w-[150px]">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xl" aria-hidden="true">{country?.flag}</span>
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {country?.nameFr}
                        </span>
                        {selectedCodes.length > 2 && (
                          <button
                            onClick={() => removeCountry(code)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition cursor-pointer"
                            title={`Retirer ${country?.nameFr} de la comparaison`}
                            aria-label={`Retirer ${country?.nameFr}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {compareRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition">
                  <td className="py-3 px-5">
                    <span className="font-medium text-slate-800 dark:text-slate-200 block">
                      {row.label}
                    </span>
                    {row.description && (
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {row.description}
                      </span>
                    )}
                  </td>
                  {selectedCodes.map((code) => {
                    const snap = snapshots[code];
                    return (
                      <td key={code} className="py-3 px-4 text-center whitespace-nowrap">
                        {row.render(snap)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
