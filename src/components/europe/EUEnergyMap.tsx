import React, { useState } from 'react';
import {
  CountryElectricitySnapshot,
  IndicatorMode,
  ProductionSourceKey,
} from '../../types/energy';
import { EU_COUNTRIES, EUCountryConfig } from '../../data/euCountries';
import { PRODUCTION_SOURCES } from '../../data/sourcesMeta';
import { UnitFormattedValue } from '../common/UnitFormattedValue';
import { DataQualityBadge } from '../common/DataQualityBadge';

interface EUEnergyMapProps {
  snapshots: Record<string, CountryElectricitySnapshot>;
  selectedIndicator: IndicatorMode;
  onSelectIndicator: (indicator: IndicatorMode) => void;
  onSelectCountry: (countryCode: string) => void;
}

export const EUEnergyMap: React.FC<EUEnergyMapProps> = ({
  snapshots,
  selectedIndicator,
  onSelectIndicator,
  onSelectCountry,
}) => {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Calcul de la source principale de production pour un snapshot
  const getPrimarySource = (snapshot?: CountryElectricitySnapshot): { key: ProductionSourceKey; label: string; color: string } => {
    if (!snapshot || !snapshot.productionBreakdown) {
      return { key: 'unknown', label: 'Indisponible', color: '#94a3b8' };
    }
    let maxKey: ProductionSourceKey = 'unknown';
    let maxVal = -1;
    for (const [key, val] of Object.entries(snapshot.productionBreakdown)) {
      if (val !== null && val > maxVal) {
        maxVal = val;
        maxKey = key as ProductionSourceKey;
      }
    }
    const meta = PRODUCTION_SOURCES[maxKey];
    return {
      key: maxKey,
      label: meta ? meta.labelFr : 'Autre',
      color: meta ? meta.color : '#94a3b8',
    };
  };

  // Détermination de la couleur d'un pays selon l'indicateur sélectionné
  const getCountryFill = (countryCode: string): string => {
    const s = snapshots[countryCode];
    if (!s) return '#cbd5e1';

    if (selectedIndicator === 'carbonIntensity') {
      const ci = s.carbonIntensity;
      if (ci === null) return '#cbd5e1';
      if (ci <= 50) return '#10b981'; // Vert vif (< 50g)
      if (ci <= 100) return '#34d399'; // Vert doux (50-100g)
      if (ci <= 200) return '#fbbf24'; // Jaune (100-200g)
      if (ci <= 350) return '#f97316'; // Orange (200-350g)
      if (ci <= 500) return '#ef4444'; // Rouge (350-500g)
      return '#991b1b'; // Rouge foncé (> 500g)
    }

    if (selectedIndicator === 'renewableShare') {
      const ren = s.renewablePercentage;
      if (ren === null) return '#cbd5e1';
      if (ren >= 80) return '#059669';
      if (ren >= 60) return '#10b981';
      if (ren >= 40) return '#34d399';
      if (ren >= 20) return '#a7f3d0';
      return '#e2e8f0';
    }

    if (selectedIndicator === 'carbonFreeShare') {
      const cf = s.fossilFreePercentage;
      if (cf === null) return '#cbd5e1';
      if (cf >= 85) return '#4f46e5';
      if (cf >= 70) return '#6366f1';
      if (cf >= 50) return '#818cf8';
      if (cf >= 30) return '#c7d2fe';
      return '#e2e8f0';
    }

    if (selectedIndicator === 'totalLoad') {
      const load = s.totalConsumption;
      if (load === null) return '#cbd5e1';
      if (load >= 40000) return '#0284c7';
      if (load >= 20000) return '#0ea5e9';
      if (load >= 8000) return '#38bdf8';
      if (load >= 2000) return '#7dd3fc';
      return '#bae6fd';
    }

    if (selectedIndicator === 'primarySource') {
      return getPrimarySource(s).color;
    }

    return '#94a3b8';
  };

  const hoveredSnapshot = hoveredCountry ? snapshots[hoveredCountry] : null;
  const hoveredCountryConfig = hoveredCountry ? EU_COUNTRIES.find((c) => c.code === hoveredCountry) : null;

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs p-4 sm:p-6">
      {/* En-tête de la carte & Sélecteur d'indicateur */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/60">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Carte de l'Union Européenne</span>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              (27 pays membres)
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Survolez ou cliquez sur un pays pour consulter les détails électriques.
          </p>
        </div>

        {/* Sélecteur d'indicateur */}
        <div className="flex items-center gap-2">
          <label htmlFor="indicator-select" className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Indicateur :
          </label>
          <select
            id="indicator-select"
            value={selectedIndicator}
            onChange={(e) => onSelectIndicator(e.target.value as IndicatorMode)}
            className="text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer shadow-2xs"
          >
            <option value="carbonIntensity">Intensité carbone (gCO₂eq/kWh)</option>
            <option value="renewableShare">Part renouvelable (%)</option>
            <option value="carbonFreeShare">Part bas-carbone (%)</option>
            <option value="totalLoad">Charge consommée (GW)</option>
            <option value="primarySource">Source principale de production</option>
          </select>
        </div>
      </div>

      {/* Surface de la carte SVG */}
      <div className="relative mt-4 bg-slate-50/70 dark:bg-slate-900/50 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 flex items-center justify-center min-h-[460px]">
        <svg
          viewBox="100 80 820 820"
          className="w-full h-auto max-h-[560px] select-none"
          role="img"
          aria-label="Carte des 27 pays de l'Union européenne"
        >
          <defs>
            {/* Lignes d'interconnexion / flux décoratives douces */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-slate-800" />
            </pattern>
          </defs>

          <rect x="100" y="80" width="820" height="820" fill="url(#grid)" opacity="0.6" />

          {/* Tracé des liaisons électriques entre pays voisins */}
          <g className="interconnections stroke-slate-300 dark:stroke-slate-700 stroke-1 stroke-dasharray-[2,2] opacity-60">
            {EU_COUNTRIES.map((c1) =>
              c1.neighbors.map((nCode) => {
                const c2 = EU_COUNTRIES.find((x) => x.code === nCode);
                if (!c2 || c1.code > c2.code) return null; // Tracer une seule fois
                return (
                  <line
                    key={`${c1.code}-${c2.code}`}
                    x1={c1.mapCoord.x}
                    y1={c1.mapCoord.y}
                    x2={c2.mapCoord.x}
                    y2={c2.mapCoord.y}
                  />
                );
              }),
            )}
          </g>

          {/* Bulles et Polygones interactifs pour chaque pays */}
          {EU_COUNTRIES.map((country: EUCountryConfig) => {
            const isHovered = hoveredCountry === country.code;
            const fill = getCountryFill(country.code);
            const snapshot = snapshots[country.code];

            return (
              <g
                key={country.code}
                role="button"
                tabIndex={0}
                aria-label={`${country.nameFr}, ${snapshot?.carbonIntensity ?? 'N/A'} gCO2eq/kWh`}
                onClick={() => onSelectCountry(country.code)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectCountry(country.code);
                  }
                }}
                onMouseEnter={(e) => {
                  setHoveredCountry(country.code);
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
                }}
                onMouseLeave={() => setHoveredCountry(null)}
                className="cursor-pointer transition-transform duration-150 focus:outline-hidden group"
              >
                {/* Anneau de focus et de survol */}
                {isHovered && (
                  <circle
                    cx={country.mapCoord.x}
                    cy={country.mapCoord.y}
                    r={34}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth={3}
                    className="animate-pulse"
                  />
                )}

                {/* Cercle pays */}
                <circle
                  cx={country.mapCoord.x}
                  cy={country.mapCoord.y}
                  r={isHovered ? 28 : 24}
                  fill={fill}
                  stroke="#ffffff"
                  strokeWidth={2}
                  className="transition-all duration-200 shadow-lg drop-shadow-sm group-hover:filter group-hover:brightness-110"
                />

                {/* Code ISO au centre */}
                <text
                  x={country.mapCoord.x}
                  y={country.mapCoord.y - 3}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-white font-bold text-[11px] pointer-events-none drop-shadow-sm select-none"
                >
                  {country.code}
                </text>

                {/* Petite valeur numérique sous le code */}
                <text
                  x={country.mapCoord.x}
                  y={country.mapCoord.y + 9}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-white font-medium text-[9px] pointer-events-none select-none opacity-95"
                >
                  {selectedIndicator === 'carbonIntensity' && (snapshot?.carbonIntensity !== null ? `${snapshot?.carbonIntensity}g` : '—')}
                  {selectedIndicator === 'renewableShare' && (snapshot?.renewablePercentage !== null ? `${snapshot?.renewablePercentage}%` : '—')}
                  {selectedIndicator === 'carbonFreeShare' && (snapshot?.fossilFreePercentage !== null ? `${snapshot?.fossilFreePercentage}%` : '—')}
                  {selectedIndicator === 'totalLoad' && (snapshot?.totalConsumption !== null ? `${Math.round((snapshot?.totalConsumption ?? 0) / 1000)}GW` : '—')}
                  {selectedIndicator === 'primarySource' && (snapshot ? getPrimarySource(snapshot).label.slice(0, 4) : '—')}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip flottant au survol */}
        {hoveredCountry && hoveredCountryConfig && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900/95 text-white p-3 rounded-xl shadow-2xl border border-slate-700 max-w-xs text-xs backdrop-blur-md transition-all duration-150 animate-in fade-in zoom-in-95"
            style={{
              top: Math.max(16, hoveredCountryConfig.mapCoord.y - 120),
              left: Math.min(600, Math.max(20, hoveredCountryConfig.mapCoord.x - 100)),
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-700/80 pb-1.5 mb-2">
              <span className="font-bold text-sm flex items-center gap-1.5">
                <span>{hoveredCountryConfig.flag}</span>
                <span>{hoveredCountryConfig.nameFr}</span>
              </span>
              {hoveredSnapshot && (
                <DataQualityBadge
                  status={hoveredSnapshot.dataSourceQuality}
                  isEstimated={hoveredSnapshot.isEstimated}
                  estimationMethod={hoveredSnapshot.estimationMethod}
                  showText={true}
                />
              )}
            </div>

            {hoveredSnapshot ? (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Intensité carbone :</span>
                  <UnitFormattedValue
                    value={hoveredSnapshot.carbonIntensity}
                    unit="gCO2eq/kWh"
                    className="text-white font-semibold"
                  />
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Bas-carbone (sans fossile) :</span>
                  <UnitFormattedValue
                    value={hoveredSnapshot.fossilFreePercentage}
                    unit="%"
                    className="text-indigo-300 font-semibold"
                  />
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Renouvelable :</span>
                  <UnitFormattedValue
                    value={hoveredSnapshot.renewablePercentage}
                    unit="%"
                    className="text-emerald-300 font-semibold"
                  />
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Charge consommée :</span>
                  <UnitFormattedValue
                    value={hoveredSnapshot.totalConsumption}
                    unit="GW"
                    className="text-sky-300 font-semibold"
                  />
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Source principale :</span>
                  <span className="font-semibold text-amber-300">
                    {getPrimarySource(hoveredSnapshot).label}
                  </span>
                </div>
                <div className="pt-1.5 mt-1 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
                  <span>Relevé :</span>
                  <span>{new Date(hoveredSnapshot.datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 italic">Données en cours de synchronisation...</p>
            )}

            <div className="mt-2 text-center text-[10px] text-sky-400 font-medium">
              Cliquez pour ouvrir la fiche pays complète →
            </div>
          </div>
        )}
      </div>

      {/* Légende didactique sous la carte */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-medium text-slate-600 dark:text-slate-400">
          Échelle :
        </span>

        {selectedIndicator === 'carbonIntensity' && (
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> &lt; 50g (Très faible)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> 50 - 100g (Faible)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> 100 - 200g (Moyen)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> 200 - 350g (Élevé)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-700 inline-block" /> &gt; 350g (Très élevé)
            </span>
          </div>
        )}

        {selectedIndicator === 'renewableShare' && (
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-emerald-700 inline-block" /> &gt; 80%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> 60 - 80%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-emerald-300 inline-block" /> 40 - 60%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-emerald-100 border border-slate-300 inline-block" /> &lt; 20%
            </span>
          </div>
        )}

        {selectedIndicator === 'carbonFreeShare' && (
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-indigo-700 inline-block" /> &gt; 85%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" /> 70 - 85%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-indigo-300 inline-block" /> 50 - 70%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-slate-200 inline-block" /> &lt; 30%
            </span>
          </div>
        )}

        {selectedIndicator === 'totalLoad' && (
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-sky-700 inline-block" /> &gt; 40 GW
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-sky-500 inline-block" /> 20 - 40 GW
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-sky-300 inline-block" /> 8 - 20 GW
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-sky-100 border border-slate-300 inline-block" /> &lt; 8 GW
            </span>
          </div>
        )}

        {selectedIndicator === 'primarySource' && (
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-indigo-400 inline-block" /> Nucléaire
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-sky-400 inline-block" /> Hydro
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> Éolien
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> Solaire
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-orange-400 inline-block" /> Gaz
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-zinc-600 inline-block" /> Charbon
            </span>
          </div>
        )}

        <div className="text-[11px] text-slate-400">
          Source : Electricity Maps (généré à partir des données ENTSO-E)
        </div>
      </div>
    </div>
  );
};
