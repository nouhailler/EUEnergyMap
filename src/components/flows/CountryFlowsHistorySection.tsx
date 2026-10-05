import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowRightLeft,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  RefreshCw,
  TrendingUp,
  Activity,
  Layers,
  SlidersHorizontal,
  Info,
  Calendar,
  Zap,
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
  FlowHistoryPoint,
  FlowsHistoryData,
  InterconnectorMeta,
  GRANULARITY_OPTIONS,
} from '../../types/energy';
import { emapsClient } from '../../services/electricityMaps/client';
import { DataProvenanceBanner } from '../common/DataProvenanceBanner';

interface CountryFlowsHistorySectionProps {
  snapshot: CountryElectricitySnapshot;
  onSelectCountry?: (countryCode: string) => void;
  onNavigate?: (view: string, param?: string) => void;
}

export const CountryFlowsHistorySection: React.FC<CountryFlowsHistorySectionProps> = ({
  snapshot,
  onSelectCountry,
  onNavigate,
}) => {
  const [granularity, setGranularity] = useState<TemporalGranularity>('15_minutes');
  const [flowsData, setFlowsData] = useState<FlowsHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedPeer, setSelectedPeer] = useState<string>('DE'); // Par défaut DE si dispo
  const [viewMode, setViewMode] = useState<'single' | 'all' | 'table'>('table');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const fetchFlowsHistory = async () => {
    setIsLoading(true);
    try {
      const data = await emapsClient.getZoneFlowsHistory(snapshot.zoneKey, granularity);
      setFlowsData(data);
      // Sélectionner le premier interconnexion disponible si DE n'existe pas
      if (data.interconnectors && data.interconnectors.length > 0) {
        const hasDE = data.interconnectors.some((i) => i.peerZone === 'DE');
        if (!hasDE && selectedPeer === 'DE') {
          setSelectedPeer(data.interconnectors[0].peerZone);
        }
      }
    } catch (err) {
      console.warn('[CountryFlowsHistorySection] Erreur chargement historique flux :', err);
      setFlowsData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFlowsHistory();
  }, [snapshot.zoneKey, granularity]);

  const interconnectors = flowsData?.interconnectors || [];
  const points = flowsData?.points || [];

  const activeInterconnector = useMemo(() => {
    return interconnectors.find((i) => i.peerZone === selectedPeer) || interconnectors[0];
  }, [interconnectors, selectedPeer]);

  // Points clés toutes les 3 heures (00h, 03h, 06h, 09h, 12h, 15h, 18h, 21h, 24h)
  const sampledKeyHours = useMemo(() => {
    if (!points.length) return [];
    const targetHours = [0, 3, 6, 9, 12, 15, 18, 21, 24];
    const results: Array<{
      hourLabel: string;
      rawDatetime: string;
      flowGW: string;
      flowMW: number;
      isExport: boolean;
      netExportTotalGW: string;
    }> = [];

    const peerKey = activeInterconnector?.peerZone || 'DE';

    targetHours.forEach((th) => {
      // Trouver le point le plus proche
      let closestPt = points[0];
      let minDiff = 999999999;
      points.forEach((pt) => {
        const d = new Date(pt.datetime);
        const h = d.getUTCHours() + d.getUTCMinutes() / 60;
        const target = th === 24 ? 24 : th;
        const diff = Math.abs(h - target);
        if (diff < minDiff) {
          minDiff = diff;
          closestPt = pt;
        }
      });

      if (closestPt) {
        const flowVal = closestPt.flows[peerKey] ?? 0;
        const isExport = flowVal >= 0;
        const absMW = Math.abs(flowVal);
        const flowGW = (absMW / 1000).toLocaleString('fr-FR', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });

        const hourStr = `${th.toString().padStart(2, '0')}h`;
        results.push({
          hourLabel: hourStr,
          rawDatetime: closestPt.datetime,
          flowGW: `${flowGW} GW`,
          flowMW: absMW,
          isExport,
          netExportTotalGW: (closestPt.netExportTotal / 1000).toFixed(1),
        });
      }
    });

    return results;
  }, [points, activeInterconnector]);

  // Données pour le graphique Recharts
  const chartData = useMemo(() => {
    const peerKey = activeInterconnector?.peerZone;
    return points.map((p, index) => {
      const flowVal = peerKey ? (p.flows[peerKey] ?? 0) : 0;
      const isExport = flowVal >= 0;
      const flowGW = Math.round((Math.abs(flowVal) / 1000) * 100) / 100;
      const signedGW = Math.round((flowVal / 1000) * 100) / 100;

      // Données de chaque interconnexion pour le mode "Tous les flux"
      const peerFlowsGW: Record<string, number> = {};
      interconnectors.forEach((i) => {
        const val = p.flows[i.peerZone] ?? 0;
        peerFlowsGW[`flow_${i.peerZone}`] = Math.round((val / 1000) * 100) / 100;
      });

      return {
        index,
        datetime: p.datetime,
        hourLabel: p.hourLabel,
        fullDateLabel: p.fullDateLabel,
        flowMW: Math.abs(flowVal),
        flowGW,
        signedGW,
        isExport,
        netExportTotalGW: Math.round((p.netExportTotal / 1000) * 100) / 100,
        importTotalGW: Math.round((p.importTotal / 1000) * 100) / 100,
        exportTotalGW: Math.round((p.exportTotal / 1000) * 100) / 100,
        ...peerFlowsGW,
        rawPoint: p,
      };
    });
  }, [points, activeInterconnector, interconnectors]);

  // Scrubber index
  const inspectedIndex = hoveredIndex !== null
    ? hoveredIndex
    : chartData.length > 0
    ? chartData.length - 1
    : null;

  const inspectedPoint = inspectedIndex !== null && chartData[inspectedIndex]
    ? chartData[inspectedIndex]
    : null;

  // Métriques de synthèse sur 24h pour la liaison sélectionnée
  const stats = useMemo(() => {
    if (!chartData.length || !activeInterconnector) return null;
    const peerKey = activeInterconnector.peerZone;
    const values = points.map((p) => p.flows[peerKey] ?? 0);
    const absValues = values.map((v) => Math.abs(v));
    const avgMW = Math.round(absValues.reduce((a, b) => a + b, 0) / absValues.length);
    const maxMW = Math.max(...absValues);
    const minMW = Math.min(...absValues);

    const exportPoints = values.filter((v) => v > 0).length;
    const majorityExport = exportPoints >= values.length / 2;

    // Énergie totale échangée sur 24h en GWh (somme puissance MW * dt heures)
    const dtHours = granularity === '5_minutes' ? 5 / 60 : granularity === '15_minutes' ? 15 / 60 : 1;
    const totalGWh = Math.round((absValues.reduce((a, b) => a + b, 0) * dtHours) / 1000);

    return {
      avgGW: (avgMW / 1000).toFixed(2),
      maxGW: (maxMW / 1000).toFixed(2),
      minGW: (minMW / 1000).toFixed(2),
      totalGWh,
      majorityExport,
    };
  }, [chartData, points, activeInterconnector, granularity]);

  return (
    <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-5">
      {/* En-tête de section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <ArrowRightLeft className="w-5 h-5" />
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Historique des Flux Transfrontaliers (24 heures)</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                {snapshot.flagEmoji} {snapshot.countryNameFr}
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Relevés officiels d'échanges physiques transfrontaliers heure par heure sur les 24 dernières heures (données API V4{' '}
            <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono text-[10px] text-sky-600 dark:text-sky-300">
              /v4/electricity-flows/history
            </code>
            ).
          </p>
        </div>

        {/* Commandes : Granularité & Mode d'affichage */}
        <div className="flex flex-wrap items-center gap-2.5">
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
                        ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-300 shadow-xs'
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

          {/* Bascule Mode : Vue Tableau 24h / Courbe Ligne / Tous les flux */}
          <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Tableau heure par heure (00h, 03h, 06h...)"
            >
              Tableau 24h
            </button>
            <button
              onClick={() => setViewMode('single')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                viewMode === 'single'
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Graphique continu de la liaison sélectionnée"
            >
              Graphique
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Graphique multi-liaisons superposées"
            >
              Toutes liaisons
            </button>
          </div>

          <button
            onClick={fetchFlowsHistory}
            disabled={isLoading}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer shadow-xs"
            title="Rafraîchir l'historique des flux"
            aria-label="Rafraîchir l'historique des flux"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sélecteur de liaison transfrontalière */}
      {interconnectors.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Liaison :
          </span>
          {interconnectors.map((inter) => {
            const isSelected = selectedPeer === inter.peerZone;
            return (
              <button
                key={inter.peerZone}
                onClick={() => setSelectedPeer(inter.peerZone)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  isSelected
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{inter.peerFlag}</span>
                <span>{inter.label}</span>
                <span className="font-mono text-[10px] opacity-80">({inter.peerZone})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Cartes de synthèse de la liaison sélectionnée ou message d'indisponibilité */}
      {points.length === 0 ? (
        <div className="p-6 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Historique des flux 24h indisponible
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-lg mx-auto">
              Conformément à la règle <strong>« Zéro donnée inventée »</strong>, aucune courbe artificielle n'est simulée. Seuls les flux physiques instantanés certifiés avec chaque pays voisin sont restitués.
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <DataProvenanceBanner
              dataTimestamp={snapshot.dataTimestamp || snapshot.datetime}
              retrievedAt={snapshot.retrievedAt || snapshot.updatedAt}
              source={snapshot.source}
              variant="inline"
            />
          </div>
        </div>
      ) : (
        <>
          {stats && activeInterconnector && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block">Sens dominant 24h</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                  {stats.majorityExport ? (
                    <>
                      <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Exportateur net</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownLeft className="w-4 h-4 text-amber-500" />
                      <span className="text-amber-600 dark:text-amber-400">Importateur net</span>
                    </>
                  )}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block">Moyenne 24h</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                  {stats.avgGW} GW
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block">Pic de transit (Max)</span>
                <span className="text-sm font-bold text-sky-600 dark:text-sky-400 font-mono mt-0.5 block">
                  {stats.maxGW} GW
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block">Énergie échangée (24h)</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                  {stats.totalGWh.toLocaleString('fr-FR')} GWh
                </span>
              </div>
            </div>
          )}

          {/* 1. VUE TABLEAU RECHERCHÉE PAR L'UTILISATEUR */}
          {viewMode === 'table' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {snapshot.flagEmoji} → {activeInterconnector?.peerFlag}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {activeInterconnector?.label || `${snapshot.countryNameFr} → Voisin`}
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Relevés 24h ({points.length} points interpolés à {granularity === '5_minutes' ? '5 min' : granularity === '15_minutes' ? '15 min' : '1 heure'})
                </span>
              </div>

              {/* Grille des heures clés demandée */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
                {sampledKeyHours.map((sh, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 hover:border-sky-400 dark:hover:border-sky-500 transition space-y-1"
                  >
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span className="font-bold">{sh.hourLabel}</span>
                      <span className={sh.isExport ? 'text-emerald-500' : 'text-amber-500'}>
                        {sh.isExport ? '→' : '←'}
                      </span>
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                      {sh.flowGW}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {sh.flowMW.toLocaleString('fr-FR')} MW
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* 2. GRAPHIQUE CONTINU RECHARTS */}
      <div className="h-72 sm:h-80 w-full pt-1">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-700">
            <Clock className="w-8 h-8 text-sky-500 animate-spin mb-2" />
            <p className="text-xs text-slate-500 font-medium">Chargement de l'historique des flux 24h...</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-900/40 p-6 text-center space-y-2">
            <p className="text-xs text-slate-400 italic">Aucun historique de flux disponible pour cette frontière.</p>
            <DataProvenanceBanner
              dataTimestamp={snapshot.dataTimestamp || snapshot.datetime}
              retrievedAt={snapshot.retrievedAt || snapshot.updatedAt}
              source={snapshot.source}
              variant="inline"
            />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={240}>
            {viewMode === 'all' ? (
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
                  axisLine={{ stroke: '#94a3b8', strokeOpacity: 0.3 }}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  unit=" GW"
                  dx={-4}
                />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 min-w-[200px]">
                        <div className="font-bold text-slate-900 dark:text-white pb-1 border-b border-slate-100 dark:border-slate-800">
                          {label}
                        </div>
                        {payload.map((entry, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[11px]">
                            <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                              <span>●</span>
                              <span>{entry.name}</span>
                            </span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {Number(entry.value).toFixed(2)} GW
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                {interconnectors.map((inter, i) => {
                  const colors = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
                  const color = colors[i % colors.length];
                  return (
                    <Line
                      key={inter.peerZone}
                      type="monotone"
                      dataKey={`flow_${inter.peerZone}`}
                      name={`${inter.peerFlag} ${inter.label}`}
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                    />
                  );
                })}
              </LineChart>
            ) : (
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
                <defs>
                  <linearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
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
                  axisLine={{ stroke: '#94a3b8', strokeOpacity: 0.3 }}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  unit=" GW"
                  dx={-4}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0]?.payload;
                    return (
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 min-w-[200px]">
                        <div className="font-bold text-slate-900 dark:text-white pb-1 border-b border-slate-100 dark:border-slate-800">
                          {p?.fullDateLabel || label}
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500">Liaison :</span>
                          <span className="font-bold text-sky-600 dark:text-sky-400">
                            {activeInterconnector?.label}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500">Puissance :</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {p?.flowGW} GW ({p?.flowMW?.toLocaleString('fr-FR')} MW)
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500">Sens :</span>
                          <span className={p?.isExport ? 'text-emerald-500 font-semibold' : 'text-amber-500 font-semibold'}>
                            {p?.isExport ? '→ Exportation' : '← Importation'}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="flowGW"
                  name={activeInterconnector?.label || 'Flux (GW)'}
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#flowGrad)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Curseur Scrubber interactif 24h */}
      {inspectedPoint && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
            <span className="font-bold text-slate-900 dark:text-white">
              Instant inspecté : {inspectedPoint.fullDateLabel}
            </span>
          </div>

          <div className="flex items-center gap-4 flex-wrap font-mono text-[11px]">
            <div>
              <span className="text-slate-400 mr-1">{activeInterconnector?.label} :</span>
              <span className="font-bold text-sky-600 dark:text-sky-400">
                {inspectedPoint.flowGW} GW
              </span>
            </div>
            <div>
              <span className="text-slate-400 mr-1">Bilan global zone :</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {inspectedPoint.netExportTotalGW > 0 ? '+' : ''}{inspectedPoint.netExportTotalGW} GW
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
