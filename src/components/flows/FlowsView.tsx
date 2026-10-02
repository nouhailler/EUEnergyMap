import React, { useState, useMemo } from 'react';
import {
  ArrowRightLeft,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Map as MapIcon,
  Network,
  Zap,
  Play,
  Pause,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { CountryElectricitySnapshot, CrossBorderFlow } from '../../types/energy';
import { EU_COUNTRIES } from '../../data/euCountries';
import { ALL_GRID_NODES, getGridNode } from '../../data/gridTopology';
import { FlowsMap } from './FlowsMap';
import { FlowsStarDiagram } from './FlowsStarDiagram';

interface FlowsViewProps {
  snapshots: Record<string, CountryElectricitySnapshot>;
  onSelectCountry: (countryCode: string) => void;
}

type VisualizationMode = 'map' | 'star';
type DirectionFilter = 'ALL' | 'EXPORT' | 'IMPORT';

export const FlowsView: React.FC<FlowsViewProps> = ({ snapshots, onSelectCountry }) => {
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>('ALL');
  const [visMode, setVisMode] = useState<VisualizationMode>('map');
  const [isAnimated, setIsAnimated] = useState<boolean>(true);
  const [minFlowThreshold, setMinFlowThreshold] = useState<number>(0);
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('ALL');

  // Collecte et dédoublonnage de l'ensemble des flux transfrontaliers européens
  const allFlows: CrossBorderFlow[] = useMemo(() => {
    const list: CrossBorderFlow[] = [];
    const flowKeys = new Set<string>();

    for (const s of Object.values(snapshots || {})) {
      if (!s || !Array.isArray(s.exchangeFlows)) continue;
      for (const f of s.exchangeFlows) {
        if (!f || !f.flowMW) continue;
        const key = `${f.fromZone}->${f.toZone}`;
        if (!flowKeys.has(key)) {
          flowKeys.add(key);
          list.push(f);
        }
      }
    }

    return list.sort((a, b) => b.flowMW - a.flowMW);
  }, [snapshots]);

  // Filtrage des flux pour le tableau et les indicateurs
  const filteredFlows = useMemo(() => {
    return allFlows.filter((f) => {
      // Filtre par seuil de volume
      if (f.flowMW < minFlowThreshold) return false;

      // Filtre par pays
      if (selectedCountryFilter !== 'ALL') {
        if (directionFilter === 'EXPORT' && f.fromZone !== selectedCountryFilter) return false;
        if (directionFilter === 'IMPORT' && f.toZone !== selectedCountryFilter) return false;
        if (directionFilter === 'ALL' && f.fromZone !== selectedCountryFilter && f.toZone !== selectedCountryFilter) {
          return false;
        }
      }

      return true;
    });
  }, [allFlows, selectedCountryFilter, minFlowThreshold, directionFilter]);

  // Volume total instantané échangé en Europe
  const totalExchangedEuropeMW = useMemo(() => {
    return allFlows.reduce((acc, f) => acc + f.flowMW, 0);
  }, [allFlows]);

  // Calcul des exportateurs et importateurs nets
  const countryBalances = useMemo(() => {
    return EU_COUNTRIES.map((c) => {
      const s = snapshots[c.code];
      return {
        country: c,
        netExport: s?.netExport ?? null,
        importTotal: s?.importTotal ?? null,
        exportTotal: s?.exportTotal ?? null,
      };
    }).filter((x) => x.netExport !== null);
  }, [snapshots]);

  const netExporters = useMemo(() => {
    return countryBalances
      .filter((b) => (b.netExport ?? 0) > 0)
      .sort((a, b) => (b.netExport ?? 0) - (a.netExport ?? 0));
  }, [countryBalances]);

  const netImporters = useMemo(() => {
    return countryBalances
      .filter((b) => (b.netExport ?? 0) < 0)
      .sort((a, b) => (a.netExport ?? 0) - (b.netExport ?? 0));
  }, [countryBalances]);

  // Basculer sur un pays spécifique pour la vue en étoile
  const handleCountryPick = (code: string) => {
    setSelectedCountryFilter(code);
  };

  return (
    <div className="space-y-6">
      {/* En-tête des flux */}
      <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
              <ArrowRightLeft className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Carte & Flux des Interconnexions Électriques Européennes
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-3xl leading-relaxed">
            Visualisation temps réel du réseau synchrone ENTSO-E. Les électrons circulent en continu selon les différences de production, de demande et les couplages de marché, avec indication physique de direction, d'épaisseur et de puissance transportée.
          </p>
        </div>

        {/* Indicateur global de volume */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-right">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
              Puissance Échangée (UE)
            </div>
            <div className="text-base font-black text-sky-600 dark:text-sky-400">
              {(totalExchangedEuropeMW / 1000).toFixed(1)} GW
            </div>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-right">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
              Lignes Actives
            </div>
            <div className="text-base font-black text-slate-800 dark:text-slate-100">
              {allFlows.length}
            </div>
          </div>
        </div>
      </div>

      {/* Barre de commandes et de visualisation */}
      <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Sélecteur de mode de visualisation */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setVisMode('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              visMode === 'map'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Carte Géographique Européenne</span>
          </button>
          <button
            onClick={() => {
              setVisMode('star');
              if (selectedCountryFilter === 'ALL') {
                setSelectedCountryFilter('FR'); // Par défaut France pour le diagramme synoptique
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              visMode === 'star'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Diagramme Synoptique en Étoile</span>
          </button>
        </div>

        {/* Filtres interactifs */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filtre par pays */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCountryFilter}
              onChange={(e) => setSelectedCountryFilter(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-medium cursor-pointer"
            >
              <option value="ALL">Europe entière ({allFlows.length} liaisons)</option>
              {EU_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.nameFr}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre par seuil de puissance */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={minFlowThreshold}
              onChange={(e) => setMinFlowThreshold(Number(e.target.value))}
              className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-medium cursor-pointer"
            >
              <option value={0}>Tous volumes (&gt; 0 MW)</option>
              <option value={500}>Significatifs (&gt; 500 MW)</option>
              <option value={1000}>Majeurs (&gt; 1,0 GW)</option>
              <option value={2000}>Corridors stratégiques (&gt; 2,0 GW)</option>
            </select>
          </div>

          {/* Toggle Animation */}
          <button
            onClick={() => setIsAnimated(!isAnimated)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              isAnimated
                ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300 border-sky-300 dark:border-sky-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
            }`}
            title="Activer ou mettre en pause l'animation des flux d'électrons"
          >
            {isAnimated ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isAnimated ? 'Flux animés' : 'Flux statiques'}</span>
          </button>
        </div>
      </div>

      {/* Rendu principal selon le mode sélectionné */}
      {visMode === 'map' ? (
        <FlowsMap
          flows={allFlows}
          snapshots={snapshots}
          selectedCountry={selectedCountryFilter}
          onSelectCountry={handleCountryPick}
          isAnimated={isAnimated}
          minFlowMW={minFlowThreshold}
        />
      ) : (
        <FlowsStarDiagram
          selectedCountry={selectedCountryFilter === 'ALL' ? 'FR' : selectedCountryFilter}
          onSelectCountry={handleCountryPick}
          snapshots={snapshots}
          isAnimated={isAnimated}
        />
      )}

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
                onClick={() => {
                  setSelectedCountryFilter(item.country.code);
                  onSelectCountry(item.country.code);
                }}
                className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-xs hover:bg-emerald-100/60 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5 font-medium text-slate-800 dark:text-slate-200">
                  <span className="text-base">{item.country.flag}</span>
                  <div>
                    <div className="font-semibold">{item.country.nameFr}</div>
                    <div className="text-[10px] text-slate-400">Export : {((item.exportTotal ?? 0) / 1000).toFixed(1)} GW</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                    +{((item.netExport ?? 0) / 1000).toFixed(1)} GW
                  </span>
                </div>
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
                onClick={() => {
                  setSelectedCountryFilter(item.country.code);
                  onSelectCountry(item.country.code);
                }}
                className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 text-xs hover:bg-amber-100/60 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5 font-medium text-slate-800 dark:text-slate-200">
                  <span className="text-base">{item.country.flag}</span>
                  <div>
                    <div className="font-semibold">{item.country.nameFr}</div>
                    <div className="text-[10px] text-slate-400">Import : {((item.importTotal ?? 0) / 1000).toFixed(1)} GW</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-amber-600 dark:text-amber-400 font-mono text-sm">
                    {((item.netExport ?? 0) / 1000).toFixed(1)} GW
                  </span>
                </div>
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
              Détail des Échanges Bilatéraux Transfrontaliers
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Volumes instantanés transportés sur les lignes à très haute tension (THT).
            </p>
          </div>

          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {filteredFlows.length} liaisons affichées
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
                <th scope="col" className="py-3 px-4">Capacité / Échelle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredFlows.map((flow, idx) => {
                const maxFlow = allFlows[0]?.flowMW || 3000;
                const percent = Math.min(100, Math.max(5, (flow.flowMW / maxFlow) * 100));
                const fromNode = getGridNode(flow.fromZone);
                const toNode = getGridNode(flow.toZone);

                return (
                  <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition">
                    <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                      <button
                        onClick={() => {
                          setSelectedCountryFilter(flow.fromZone);
                          onSelectCountry(flow.fromZone);
                        }}
                        className="flex items-center gap-1.5 hover:text-sky-600 transition cursor-pointer"
                      >
                        <span>{fromNode.flag}</span>
                        <span>{fromNode.nameFr}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({flow.fromZone})</span>
                      </button>
                    </td>

                    <td className="py-2.5 px-3 text-center text-sky-600">
                      <ArrowRight className="w-4 h-4 mx-auto inline" />
                    </td>

                    <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                      <button
                        onClick={() => {
                          setSelectedCountryFilter(flow.toZone);
                          onSelectCountry(flow.toZone);
                        }}
                        className="flex items-center gap-1.5 hover:text-sky-600 transition cursor-pointer"
                      >
                        <span>{toNode.flag}</span>
                        <span>{toNode.nameFr}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({flow.toZone})</span>
                      </button>
                    </td>

                    <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap font-mono">
                      {(flow.flowMW / 1000).toFixed(2)} GW
                      <span className="text-slate-400 font-normal text-[10px] ml-1">
                        ({flow.flowMW.toLocaleString('fr-FR')} MW)
                      </span>
                    </td>

                    <td className="py-2.5 px-4 w-1/3">
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          style={{ width: `${percent}%` }}
                          className={`h-full rounded-full transition-all duration-300 ${
                            flow.flowMW >= 1500 ? 'bg-sky-500' : 'bg-cyan-500'
                          }`}
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

      {/* Note technique sur le couplage physique et commercial */}
      <div className="bg-sky-50/50 dark:bg-sky-950/20 p-4 rounded-xl border border-sky-100 dark:border-sky-900/40 text-xs text-sky-900 dark:text-sky-300 flex items-start gap-3">
        <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">
            Couplage physique ENTSO-E et algorithme Euphemia
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
            Les flux affichés représentent la puissance physique transitant sur les lignes transfrontalières à l'instant de mesure. L'algorithme européen de couplage des marchés (Euphemia) optimise le transit de l'électricité des zones à coût marginal bas (ex: fort renouvelable ou nucléaire) vers les zones à coût marginal élevé, dans la limite des capacités d'interconnexion disponibles (NTC - Net Transfer Capacity).
          </p>
        </div>
      </div>
    </div>
  );
};
