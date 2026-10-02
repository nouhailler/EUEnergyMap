import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Clock,
  RefreshCw,
  Info,
  Calendar,
  Zap,
  TrendingUp,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Flame,
  Leaf,
  ShieldCheck,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  CountryElectricitySnapshot,
  TemporalGranularity,
  MixHistoryPoint,
  GRANULARITY_OPTIONS,
  ProductionSourceKey,
} from '../../types/energy';
import { PRODUCTION_SOURCES } from '../../data/sourcesMeta';
import { emapsClient } from '../../services/electricityMaps/client';

interface CountryMixHistorySectionProps {
  snapshot: CountryElectricitySnapshot;
  onNavigate?: (view: string, param?: string) => void;
}

// Configuration des filières à afficher dans l'historique du mix
const MIX_SOURCES_CONFIG: Array<{
  key: ProductionSourceKey;
  label: string;
  emoji: string;
  color: string;
  fillOpacity: number;
  description: string;
}> = [
  {
    key: 'nuclear',
    label: 'Nucléaire',
    emoji: '☢️',
    color: '#818cf8', // Indigo
    fillOpacity: 0.8,
    description: 'Ruban continu stable de base (baseload)',
  },
  {
    key: 'hydro',
    label: 'Hydraulique',
    emoji: '💧',
    color: '#38bdf8', // Sky
    fillOpacity: 0.8,
    description: 'Barrages au fil de l’eau et retenues modulables',
  },
  {
    key: 'wind',
    label: 'Éolien',
    emoji: '💨',
    color: '#34d399', // Emerald
    fillOpacity: 0.8,
    description: 'Production variable selon le régime de vent',
  },
  {
    key: 'solar',
    label: 'Solaire',
    emoji: '☀️',
    color: '#facc15', // Yellow
    fillOpacity: 0.85,
    description: 'Cloche diurne culminant au midi solaire',
  },
  {
    key: 'biomass',
    label: 'Biomasse',
    emoji: '🌱',
    color: '#a3e635', // Lime
    fillOpacity: 0.8,
    description: 'Combustion de matière organique végétale',
  },
  {
    key: 'gas',
    label: 'Gaz fossile',
    emoji: '🔥',
    color: '#fb923c', // Orange
    fillOpacity: 0.8,
    description: 'Centrales thermiques flexibles pour les pointes de charge',
  },
  {
    key: 'coal',
    label: 'Charbon & Lignite',
    emoji: '🪨',
    color: '#71717a', // Zinc
    fillOpacity: 0.8,
    description: 'Centrales thermiques fossiles à haute intensité carbone',
  },
  {
    key: 'oil',
    label: 'Pétrole & Fioul',
    emoji: '🛢️',
    color: '#a1a1aa', // Slate
    fillOpacity: 0.8,
    description: 'Centrales d’extrême pointe au fioul',
  },
];

export const CountryMixHistorySection: React.FC<CountryMixHistorySectionProps> = ({
  snapshot,
  onNavigate,
}) => {
  const [granularity, setGranularity] = useState<TemporalGranularity>('15_minutes');
  const [points, setPoints] = useState<MixHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'stacked' | 'lines' | 'percentage'>('stacked');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [visibleSources, setVisibleSources] = useState<Record<string, boolean>>({
    nuclear: true,
    hydro: true,
    wind: true,
    solar: true,
    biomass: true,
    gas: true,
    coal: true,
    oil: true,
  });

  const fetchMixHistory = async () => {
    setIsLoading(true);
    try {
      const data = await emapsClient.getZoneMixHistory(snapshot.zoneKey, granularity);
      setPoints(Array.isArray(data?.points) ? data.points : []);
    } catch (err) {
      console.warn('[CountryMixHistorySection] Erreur chargement historique mix :', err);
      setPoints([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMixHistory();
  }, [snapshot.zoneKey, granularity]);

  // Filtrer les sources ayant au moins un peu de puissance dans le pays
  const activeSources = useMemo(() => {
    if (!points.length) return MIX_SOURCES_CONFIG;
    return MIX_SOURCES_CONFIG.filter((s) => {
      const hasPower = points.some((p) => {
        const val = (p as any)[s.key];
        return typeof val === 'number' && val > 0;
      });
      return hasPower;
    });
  }, [points]);

  // Basculer la visibilité d'une source
  const toggleSource = (sourceKey: string) => {
    setVisibleSources((prev) => ({
      ...prev,
      [sourceKey]: !prev[sourceKey],
    }));
  };

  // Sélectionner ou isoler une source
  const isolateSource = (sourceKey: string) => {
    const isOnlyThis = Object.entries(visibleSources).every(([k, v]) => (k === sourceKey ? v : !v));
    if (isOnlyThis) {
      // Tout réactiver
      const allTrue: Record<string, boolean> = {};
      MIX_SOURCES_CONFIG.forEach((s) => {
        allTrue[s.key] = true;
      });
      setVisibleSources(allTrue);
    } else {
      // Isoler la source
      const onlyOne: Record<string, boolean> = {};
      MIX_SOURCES_CONFIG.forEach((s) => {
        onlyOne[s.key] = s.key === sourceKey;
      });
      setVisibleSources(onlyOne);
    }
  };

  // Formatage des données pour le graphique Recharts
  const chartData = useMemo(() => {
    return points.map((p, index) => {
      const totalActiveProd = activeSources.reduce((acc, s) => {
        if (!visibleSources[s.key]) return acc;
        const val = (p as any)[s.key] || 0;
        return acc + val;
      }, 0);

      // En mode pourcentage 100%
      const percentages: Record<string, number> = {};
      activeSources.forEach((s) => {
        const val = (p as any)[s.key] || 0;
        percentages[`${s.key}Pct`] = totalActiveProd > 0 ? Math.round((val / totalActiveProd) * 1000) / 10 : 0;
      });

      return {
        index,
        datetime: p.datetime,
        hourLabel: p.hourLabel,
        fullDateLabel: p.fullDateLabel,
        nuclear: visibleSources.nuclear ? p.nuclear : 0,
        hydro: visibleSources.hydro ? p.hydro : 0,
        wind: visibleSources.wind ? p.wind : 0,
        solar: visibleSources.solar ? p.solar : 0,
        biomass: visibleSources.biomass ? p.biomass : 0,
        gas: visibleSources.gas ? p.gas : 0,
        coal: visibleSources.coal ? p.coal : 0,
        oil: visibleSources.oil ? p.oil : 0,
        totalProduction: p.totalProduction,
        totalConsumption: p.totalConsumption,
        ...percentages,
        rawPoint: p,
      };
    });
  }, [points, activeSources, visibleSources]);

  // Index inspecté au scrubber
  const inspectedIndex = hoveredIndex !== null
    ? hoveredIndex
    : chartData.length > 0
    ? chartData.length - 1
    : null;

  const inspectedPoint = inspectedIndex !== null && chartData[inspectedIndex]
    ? chartData[inspectedIndex].rawPoint
    : null;

  // Statistiques moyennes sur 24h
  const stats = useMemo(() => {
    if (!points.length) return null;
    const avgTotal = Math.round(points.reduce((acc, p) => acc + p.totalProduction, 0) / points.length);

    // Calcul de la filière principale
    let dominantKey: ProductionSourceKey = 'nuclear';
    let maxDominantVal = 0;
    activeSources.forEach((s) => {
      const sum = points.reduce((acc, p) => acc + ((p as any)[s.key] || 0), 0);
      if (sum > maxDominantVal) {
        maxDominantVal = sum;
        dominantKey = s.key;
      }
    });

    const dominantMeta = MIX_SOURCES_CONFIG.find((s) => s.key === dominantKey) || MIX_SOURCES_CONFIG[0];

    // Part renouvelable moyenne
    const avgRenewable = Math.round(
      points.reduce((acc, p) => {
        const ren = p.hydro + p.wind + p.solar + p.biomass;
        return acc + (p.totalProduction > 0 ? (ren / p.totalProduction) * 100 : 0);
      }, 0) / points.length
    );

    // Part décarbonée moyenne
    const avgCarbonFree = Math.round(
      points.reduce((acc, p) => {
        const carbonFree = p.nuclear + p.hydro + p.wind + p.solar + p.biomass;
        return acc + (p.totalProduction > 0 ? (carbonFree / p.totalProduction) * 100 : 0);
      }, 0) / points.length
    );

    return {
      avgTotal,
      dominantMeta,
      avgRenewable,
      avgCarbonFree,
    };
  }, [points, activeSources]);

  return (
    <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-5">
      {/* En-tête de section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-5 h-5" />
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Historique du Mix Électrique (24 heures)</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                {snapshot.flagEmoji} {snapshot.countryNameFr}
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Évolution chronologique continue de chaque filière de production d'électricité sur les dernières 24h glissantes (données API V4).
          </p>
        </div>

        {/* Commandes : Granularité & Mode d'affichage */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Sélecteur de Granularité V4 */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <div className="inline-flex text-xs">
              {GRANULARITY_OPTIONS.map((opt) => {
                const isSelected = granularity === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setGranularity(opt.value)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>{isSelected ? '●' : '○'}</span>
                    <span>{opt.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bascule Mode de Graphique : Empilé / Lignes / Pourcentages */}
          <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setViewMode('stacked')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                viewMode === 'stacked'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Graphique empilé en puissance (MW / GW)"
            >
              Empilé (MW)
            </button>
            <button
              onClick={() => setViewMode('lines')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                viewMode === 'lines'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Courbes séparées par filière (nucléaire, éolien, solaire...)"
            >
              Lignes séparées
            </button>
            <button
              onClick={() => setViewMode('percentage')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                viewMode === 'percentage'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Part relative de chaque filière en pourcentage (100%)"
            >
              Parts 100%
            </button>
          </div>

          <button
            onClick={fetchMixHistory}
            disabled={isLoading}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer shadow-xs"
            title="Rafraîchir l'historique du mix"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Résumé schématique horizontal conforme à la vision de l'utilisateur :
          00h -> 06h -> 12h -> 18h -> 24h avec profils physiques */}
      <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-800 pb-1.5">
          <span className="font-bold text-slate-700 dark:text-slate-300">
            {snapshot.flagEmoji} {snapshot.countryNameFr} : Profils physiques observés
          </span>
          <span className="hidden sm:inline">Timeline 24h : 00h ──────── 06h ──────── 12h ──────── 18h ──────── 24h</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
            <span className="text-base shrink-0">☢️</span>
            <div className="min-w-0">
              <div className="font-bold text-indigo-600 dark:text-indigo-400 text-[11px] truncate">
                Nucléaire ─── ruban stable
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                Socle de production continue (base continuous)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
            <span className="text-base shrink-0">💨</span>
            <div className="min-w-0">
              <div className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px] truncate">
                Éolien ╭───╮ météorologique
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                Variations diurnes et passages dépressionnaires
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
            <span className="text-base shrink-0">☀️</span>
            <div className="min-w-0">
              <div className="font-bold text-amber-500 dark:text-amber-400 text-[11px] truncate">
                Solaire ╭───╮ cloche de midi
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                Nul la nuit, pic entre 12h et 14h locale
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de filtres par filière (clic pour afficher/masquer ou double-clic pour isoler) */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
          <SlidersHorizontal className="w-3 h-3" /> Filières :
        </span>
        {activeSources.map((s) => {
          const isVisible = visibleSources[s.key];
          return (
            <button
              key={s.key}
              onClick={() => toggleSource(s.key)}
              onDoubleClick={() => isolateSource(s.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                isVisible
                  ? 'bg-slate-900 text-white dark:bg-slate-700 border-slate-900 dark:border-slate-600 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-900/60 text-slate-400 border-slate-200 dark:border-slate-800 opacity-60'
              }`}
              title={`Cliquer pour activer/masquer. Double-clic pour isoler ${s.label}`}
            >
              <span>{s.emoji}</span>
              <span className="font-bold">{s.label}</span>
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: isVisible ? s.color : '#94a3b8' }}
              />
            </button>
          );
        })}
      </div>

      {/* Zone du Graphique Recharts */}
      <div className="h-80 sm:h-96 w-full pt-1">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-700">
            <Clock className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
            <p className="text-xs text-slate-500 font-medium">Chargement de l'historique du mix électrique 24h...</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-900/40 text-xs text-slate-400 italic">
            Aucun historique de mix disponible pour cette zone.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={280}>
            {viewMode === 'stacked' ? (
              <AreaChart
                data={chartData}
                margin={{ top: 16, right: 16, left: 0, bottom: 4 }}
                onMouseMove={(state) => {
                  if (state?.activeTooltipIndex !== undefined && state.activeTooltipIndex !== null) {
                    setHoveredIndex(Number(state.activeTooltipIndex));
                  }
                }}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.3} />

                <XAxis
                  dataKey="hourLabel"
                  tickLine={false}
                  axisLine={{ stroke: '#94a3b8', strokeOpacity: 0.3 }}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  interval="preserveStartEnd"
                  minTickGap={32}
                  dy={6}
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)} GW` : `${val} MW`)}
                  dx={-6}
                />

                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload as { fullDateLabel: string; rawPoint: MixHistoryPoint };
                    const pt = d.rawPoint;
                    const total = pt.totalProduction;

                    return (
                      <div className="p-3 rounded-xl shadow-2xl border border-slate-700 bg-slate-900/95 text-white text-xs font-sans space-y-2 min-w-[240px] backdrop-blur-md">
                        <div className="font-bold border-b border-slate-700 pb-1 text-indigo-400 flex justify-between items-center">
                          <span>{d.fullDateLabel}</span>
                          <span className="font-mono text-slate-300">
                            Total : <strong>{((total) / 1000).toFixed(1)} GW</strong>
                          </span>
                        </div>

                        <div className="space-y-1 text-[11px]">
                          {activeSources.filter((s) => visibleSources[s.key]).map((s) => {
                            const val = (pt as any)[s.key] || 0;
                            const share = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
                            return (
                              <div key={s.key} className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5 text-slate-300">
                                  <span>{s.emoji}</span>
                                  <span>{s.label} :</span>
                                </span>
                                <span className="font-mono font-bold" style={{ color: s.color }}>
                                  {val >= 1000 ? `${(val / 1000).toFixed(1)} GW` : `${val} MW`}{' '}
                                  <span className="text-[9px] text-slate-400 font-normal">({share}%)</span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }}
                />

                {/* Empilement des aires de production */}
                {activeSources.map((s) => {
                  if (!visibleSources[s.key]) return null;
                  return (
                    <Area
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      stackId="mixStack"
                      name={s.label}
                      stroke={s.color}
                      strokeWidth={1.5}
                      fill={s.color}
                      fillOpacity={s.fillOpacity}
                      isAnimationActive={true}
                    />
                  );
                })}
              </AreaChart>
            ) : viewMode === 'percentage' ? (
              <AreaChart
                data={chartData}
                margin={{ top: 16, right: 16, left: 0, bottom: 4 }}
                onMouseMove={(state) => {
                  if (state?.activeTooltipIndex !== undefined && state.activeTooltipIndex !== null) {
                    setHoveredIndex(Number(state.activeTooltipIndex));
                  }
                }}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.3} />

                <XAxis
                  dataKey="hourLabel"
                  tickLine={false}
                  axisLine={{ stroke: '#94a3b8', strokeOpacity: 0.3 }}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  interval="preserveStartEnd"
                  minTickGap={32}
                  dy={6}
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  unit="%"
                  domain={[0, 100]}
                  dx={-6}
                />

                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload as { fullDateLabel: string; rawPoint: MixHistoryPoint };
                    const pt = d.rawPoint;
                    const total = pt.totalProduction;

                    return (
                      <div className="p-3 rounded-xl shadow-2xl border border-slate-700 bg-slate-900/95 text-white text-xs font-sans space-y-2 min-w-[240px] backdrop-blur-md">
                        <div className="font-bold border-b border-slate-700 pb-1 text-indigo-400">
                          {d.fullDateLabel} (Parts en %)
                        </div>
                        <div className="space-y-1 text-[11px]">
                          {activeSources.filter((s) => visibleSources[s.key]).map((s) => {
                            const val = (pt as any)[s.key] || 0;
                            const share = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
                            return (
                              <div key={s.key} className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5 text-slate-300">
                                  <span>{s.emoji}</span>
                                  <span>{s.label} :</span>
                                </span>
                                <span className="font-mono font-bold" style={{ color: s.color }}>
                                  {share}%{' '}
                                  <span className="text-[9px] text-slate-400 font-normal">
                                    ({val >= 1000 ? `${(val / 1000).toFixed(1)} GW` : `${val} MW`})
                                  </span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }}
                />

                {activeSources.map((s) => {
                  if (!visibleSources[s.key]) return null;
                  return (
                    <Area
                      key={s.key}
                      type="monotone"
                      dataKey={`${s.key}Pct`}
                      stackId="mixPctStack"
                      name={s.label}
                      stroke={s.color}
                      strokeWidth={1.5}
                      fill={s.color}
                      fillOpacity={s.fillOpacity}
                      isAnimationActive={true}
                    />
                  );
                })}
              </AreaChart>
            ) : (
              /* Mode Lignes Multi-Filières */
              <LineChart
                data={chartData}
                margin={{ top: 16, right: 16, left: 0, bottom: 4 }}
                onMouseMove={(state) => {
                  if (state?.activeTooltipIndex !== undefined && state.activeTooltipIndex !== null) {
                    setHoveredIndex(Number(state.activeTooltipIndex));
                  }
                }}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.3} />

                <XAxis
                  dataKey="hourLabel"
                  tickLine={false}
                  axisLine={{ stroke: '#94a3b8', strokeOpacity: 0.3 }}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  interval="preserveStartEnd"
                  minTickGap={32}
                  dy={6}
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)} GW` : `${val} MW`)}
                  dx={-6}
                />

                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload as { fullDateLabel: string; rawPoint: MixHistoryPoint };
                    const pt = d.rawPoint;

                    return (
                      <div className="p-3 rounded-xl shadow-2xl border border-slate-700 bg-slate-900/95 text-white text-xs font-sans space-y-2 min-w-[240px] backdrop-blur-md">
                        <div className="font-bold border-b border-slate-700 pb-1 text-indigo-400">
                          {d.fullDateLabel}
                        </div>
                        <div className="space-y-1 text-[11px]">
                          {activeSources.filter((s) => visibleSources[s.key]).map((s) => {
                            const val = (pt as any)[s.key] || 0;
                            return (
                              <div key={s.key} className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5 text-slate-300">
                                  <span>{s.emoji}</span>
                                  <span>{s.label} :</span>
                                </span>
                                <span className="font-mono font-bold" style={{ color: s.color }}>
                                  {val >= 1000 ? `${(val / 1000).toFixed(1)} GW` : `${val} MW`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }}
                />

                {activeSources.map((s) => {
                  if (!visibleSources[s.key]) return null;
                  return (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.label}
                      stroke={s.color}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: s.color, stroke: '#ffffff', strokeWidth: 2 }}
                      isAnimationActive={true}
                    />
                  );
                })}
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Scrubber temporel & Instantané du mix à l'heure sélectionnée */}
      {inspectedPoint && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Mix instantané à{' '}
                <strong className="text-indigo-600 dark:text-indigo-400 font-mono text-sm">
                  {inspectedPoint.hourLabel}
                </strong>{' '}
                ({new Date(inspectedPoint.datetime).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })})
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold text-slate-500">
              Total Production : {((inspectedPoint.totalProduction) / 1000).toFixed(1)} GW
            </span>
          </div>

          {/* Curseur de navigation 24h */}
          <input
            type="range"
            min={0}
            max={chartData.length - 1}
            value={inspectedIndex ?? 0}
            onChange={(e) => setHoveredIndex(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />

          {/* Barres de décomposition proportionnelle à cet instant */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-1">
            {activeSources.map((s) => {
              const val = (inspectedPoint as any)[s.key] || 0;
              const total = inspectedPoint.totalProduction;
              const share = total > 0 ? Math.round((val / total) * 100) : 0;

              return (
                <div
                  key={s.key}
                  className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="truncate">{s.emoji} {s.label}</span>
                    <span className="font-bold">{share}%</span>
                  </div>
                  <div className="text-xs font-mono font-bold mt-0.5 truncate" style={{ color: s.color }}>
                    {val >= 1000 ? `${(val / 1000).toFixed(1)} GW` : `${val} MW`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cartes de synthèse 24h */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium block">Production Moyenne 24h</span>
            <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {((stats.avgTotal) / 1000).toFixed(1)} <span className="text-xs font-normal">GW</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Puissance injectée</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium block">Filière N°1 du Pays</span>
            <div className="text-base font-bold font-mono mt-0.5 flex items-center gap-1.5" style={{ color: stats.dominantMeta.color }}>
              <span>{stats.dominantMeta.emoji}</span>
              <span>{stats.dominantMeta.label}</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Pilier du mix national</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium block">Part Renouvelable Moyenne</span>
            <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.avgRenewable}%
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Solaire + Éolien + Hydro</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium block">Part Décarbonée Moyenne</span>
            <div className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
              {stats.avgCarbonFree}%
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Renouvelable + Nucléaire</span>
          </div>
        </div>
      )}

      {/* Note Pédagogique */}
      <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-950 dark:text-indigo-200 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px]">
          <strong>Dynamique de dispatch électrique :</strong> Les énergies renouvelables fatales (éolien, solaire) sont injectées en priorité dès leur disponibilité. Le socle nucléaire assure le ruban continu prévisible (baseload). Les barrages hydroélectriques et centrales thermiques d'appoint (gaz) sont modulés pour combler la différence et absorber les pointes de consommation du matin (08h) et du soir (19h-20h).
        </p>
      </div>
    </div>
  );
};
