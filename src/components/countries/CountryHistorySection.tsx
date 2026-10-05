import React, { useEffect, useState, useMemo } from 'react';
import {
  History,
  TrendingDown,
  TrendingUp,
  Minus,
  RefreshCw,
  Info,
  Clock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import { CarbonHistoryPoint, CountryElectricitySnapshot, TemporalGranularity, GRANULARITY_OPTIONS } from '../../types/energy';
import { emapsClient } from '../../services/electricityMaps/client';
import { DataProvenanceBanner } from '../common/DataProvenanceBanner';

interface CountryHistorySectionProps {
  snapshot: CountryElectricitySnapshot;
  onNavigate?: (view: string, param?: string) => void;
}

interface ChartDataPoint {
  rawDatetime: string;
  hourLabel: string;
  fullDateLabel: string;
  carbonIntensity: number;
  fossilOnlyCarbonIntensity: number | null;
  isEstimated: boolean;
}

export const CountryHistorySection: React.FC<CountryHistorySectionProps> = ({ snapshot, onNavigate }) => {
  const [history, setHistory] = useState<CarbonHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [granularity, setGranularity] = useState<TemporalGranularity>('15_minutes');
  const [showAverageLine, setShowAverageLine] = useState<boolean>(true);
  const [historyMode, setHistoryMode] = useState<'total' | 'fossil' | 'compare'>('compare');
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await emapsClient.getZoneHistory(
        snapshot.zoneKey,
        snapshot.carbonIntensity ?? 150,
        snapshot.datetime,
        granularity
      );
      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch (err) {
      console.error('Erreur chargement historique :', err);
      setError('Impossible de charger les données historiques');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [snapshot.zoneKey, snapshot.datetime, snapshot.carbonIntensity, granularity]);

  // Préparation et formatage des données pour Recharts
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!history.length) return [];

    return history
      .filter((pt) => pt.carbonIntensity !== null)
      .map((pt) => {
        const dateObj = new Date(pt.datetime);
        const hourLabel = dateObj.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const fullDateLabel = `${dateObj.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
        })} à ${hourLabel}`;

        return {
          rawDatetime: pt.datetime,
          hourLabel,
          fullDateLabel,
          carbonIntensity: Math.round(pt.carbonIntensity as number),
          fossilOnlyCarbonIntensity: pt.fossilOnlyCarbonIntensity != null ? Math.round(pt.fossilOnlyCarbonIntensity) : null,
          isEstimated: Boolean(pt.isEstimated),
        };
      });
  }, [history]);

  // Statistiques calculées sur les dernières 24h
  const stats = useMemo(() => {
    if (!chartData.length) return null;

    const values = chartData.map((d) => d.carbonIntensity);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / values.length);

    let minPoint = chartData[0];
    let maxPoint = chartData[0];

    chartData.forEach((d) => {
      if (d.carbonIntensity < minPoint.carbonIntensity) minPoint = d;
      if (d.carbonIntensity > maxPoint.carbonIntensity) maxPoint = d;
    });

    const firstVal = chartData[0].carbonIntensity;
    const lastVal = chartData[chartData.length - 1].carbonIntensity;
    const diff = lastVal - firstVal;
    const diffPercent = firstVal > 0 ? Math.round((diff / firstVal) * 100) : 0;

    const fossilPoints = chartData.filter((d) => d.fossilOnlyCarbonIntensity != null).map((d) => d.fossilOnlyCarbonIntensity as number);
    const fossilAvg = fossilPoints.length > 0 ? Math.round(fossilPoints.reduce((a, b) => a + b, 0) / fossilPoints.length) : null;

    return {
      average: avg,
      min: minPoint.carbonIntensity,
      minHour: minPoint.hourLabel,
      max: maxPoint.carbonIntensity,
      maxHour: maxPoint.hourLabel,
      diff,
      diffPercent,
      fossilAverage: fossilAvg,
    };
  }, [chartData]);

  // Couleur de courbe dynamique selon le niveau moyen d'intensité
  const lineColor = useMemo(() => {
    const avg = stats?.average ?? snapshot.carbonIntensity ?? 120;
    if (avg <= 75) return '#059669'; // Émeraude vif
    if (avg <= 150) return '#0284c7'; // Bleu ciel soutenu
    if (avg <= 250) return '#d97706'; // Ambre orangé
    return '#e11d48'; // Rose / Rouge
  }, [stats?.average, snapshot.carbonIntensity]);

  return (
    <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-5">
      {/* En-tête de section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Historique de l'Intensité Carbone (24h)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Évolution de l'empreinte carbone pour {snapshot.countryNameFr} ({snapshot.zoneKey}) au pas de {granularity === '5_minutes' ? '5 minutes' : granularity === '15_minutes' ? '15 minutes' : '1 heure'}
          </p>
        </div>

        {/* Contrôles d'affichage */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sélecteur de mode de série */}
          <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-700/80 text-xs">
            <button
              onClick={() => setHistoryMode('total')}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                historyMode === 'total'
                  ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Mix total
            </button>
            <button
              onClick={() => setHistoryMode('fossil')}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                historyMode === 'fossil'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Fossile seul
            </button>
            <button
              onClick={() => setHistoryMode('compare')}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                historyMode === 'compare'
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Comparaison (2 courbes)
            </button>
          </div>

          <button
            onClick={() => setShowAverageLine((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
              showAverageLine
                ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            Ligne moyenne
          </button>

          <button
            onClick={() => {
              if (onNavigate) {
                onNavigate('timeline', snapshot.zoneKey || snapshot.countryCode);
              } else {
                window.location.hash = 'timeline';
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 text-xs font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900 transition cursor-pointer shadow-xs"
            title="Ouvrir la Journée électrique complète avec les 10 signaux physiques V4 pour ce pays"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>📈 Journée électrique</span>
          </button>

          <button
            onClick={fetchHistory}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-50 cursor-pointer"
            title="Rafraîchir les données historiques"
            aria-label="Rafraîchir l'historique"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Barre de sélection de la Granularité Temporelle V4 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span>Granularité temporelle V4</span>
              <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-mono">
                {chartData.length} points
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Résolution native fournie par l'API Electricity Maps / ENTSO-E
            </div>
          </div>
        </div>

        {/* Sélecteur radio / boutons 5 min / 15 min (défaut) / 1 heure */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {GRANULARITY_OPTIONS.map((opt) => {
            const isSelected = granularity === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setGranularity(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
                title={opt.description}
              >
                <span className={`w-2.5 h-2.5 rounded-full flex items-center justify-center border ${
                  isSelected ? 'border-white bg-white' : 'border-slate-400'
                }`}>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />}
                </span>
                <span>{opt.label}</span>
                {opt.value === '15_minutes' && (
                  <span className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase tracking-wider ${
                    isSelected ? 'bg-sky-700 text-sky-100' : 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                  }`}>
                    Défaut
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cartes de statistiques rapides 24h */}
      {stats && !isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Mix total (Moyenne 24h)</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
                {stats.average}
              </span>
              <span className="text-[10px] text-slate-400">gCO₂/kWh</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Ensemble du mix</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Fossile seul (Moyenne 24h)</span>
            <div className="mt-1 flex items-baseline gap-1">
              {stats.fossilAverage != null ? (
                <>
                  <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
                    {stats.fossilAverage}
                  </span>
                  <span className="text-[10px] text-slate-400">gCO₂/kWh</span>
                </>
              ) : (
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  0 g (100% décarboné)
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Thermique actif</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Extrêmes Mix (24h)</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {stats.min} g
              </span>
              <span className="text-[10px] text-slate-400">/</span>
              <span className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">
                {stats.max} g
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Min à {stats.minHour} • Max à {stats.maxHour}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Variation Mix sur 24h</span>
            <div className="mt-1 flex items-center gap-1.5">
              {stats.diff < 0 ? (
                <>
                  <TrendingDown className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {stats.diff} g ({stats.diffPercent}%)
                  </span>
                </>
              ) : stats.diff > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-base font-bold font-mono text-amber-600 dark:text-amber-400">
                    +{stats.diff} g (+{stats.diffPercent}%)
                  </span>
                </>
              ) : (
                <>
                  <Minus className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-base font-bold font-mono text-slate-500">
                    Stable (0%)
                  </span>
                </>
              )}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Tendance court terme</span>
          </div>
        </div>
      )}

      {/* Zone du graphique Recharts */}
      <div className="w-full">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-700 animate-pulse">
            <History className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2 animate-spin" />
            <p className="text-xs text-slate-400">Chargement de la série chronologique 24h...</p>
          </div>
        ) : error ? (
          <div className="h-48 flex flex-col items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 p-4 text-center">
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>
            <button
              onClick={fetchHistory}
              className="mt-2 px-3 py-1 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer"
            >
              Réessayer
            </button>
          </div>
        ) : chartData.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Donnée historique 24h indisponible
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-lg mx-auto">
                Conformément à la règle <strong>« Zéro donnée inventée »</strong>, aucune courbe artificielle n'est simulée par fonction mathématique. Seule la dernière observation certifiée réellement connue est affichée.
              </p>
            </div>
            {snapshot.carbonIntensity !== null && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono">
                <span className="text-slate-400">Dernier relevé certifié :</span>
                <span className="font-bold text-slate-900 dark:text-white">{snapshot.carbonIntensity} gCO₂eq/kWh</span>
              </div>
            )}
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
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={240}>
              <LineChart
                data={chartData}
                margin={{ top: 12, right: 16, left: -14, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#cbd5e1"
                  strokeOpacity={0.4}
                />

                <XAxis
                  dataKey="hourLabel"
                  tickLine={false}
                  axisLine={{ stroke: '#94a3b8', strokeOpacity: 0.3 }}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  dy={6}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  unit="g"
                  dx={-4}
                  domain={['auto', 'auto']}
                />

                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload as ChartDataPoint;
                    const diffAvg = stats ? item.carbonIntensity - stats.average : 0;

                    return (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-lg text-xs space-y-2 z-50">
                        <p className="font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1">
                          {item.fullDateLabel}
                        </p>

                        {/* Intensité totale mix */}
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full inline-block bg-rose-500 shrink-0" />
                            <span>Mix total :</span>
                          </span>
                          <span className="font-bold font-mono text-slate-900 dark:text-white">
                            {item.carbonIntensity} gCO₂/kWh
                          </span>
                        </div>

                        {/* Intensité fossile seule */}
                        {item.fossilOnlyCarbonIntensity != null && (
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full inline-block bg-amber-500 shrink-0" />
                              <span>Fossile seul :</span>
                            </span>
                            <span className="font-bold font-mono text-amber-600 dark:text-amber-400">
                              {item.fossilOnlyCarbonIntensity} gCO₂/kWh
                            </span>
                          </div>
                        )}

                        {stats && (
                          <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400 pt-0.5 border-t border-slate-100 dark:border-slate-800">
                            <span>Écart moy. mix :</span>
                            <span
                              className={`font-mono font-medium ${
                                diffAvg <= 0 ? 'text-emerald-500' : 'text-amber-500'
                              }`}
                            >
                              {diffAvg > 0 ? `+${diffAvg}` : diffAvg} g
                            </span>
                          </div>
                        )}

                        <div className="text-[10px] text-slate-400 pt-0.5">
                          {item.isEstimated ? 'Données modélisées' : 'Relevés officiels Electricity Maps V4'}
                        </div>
                      </div>
                    );
                  }}
                />

                <Legend
                  verticalAlign="top"
                  height={32}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, paddingBottom: 6 }}
                />

                {showAverageLine && stats && (historyMode === 'total' || historyMode === 'compare') && (
                  <ReferenceLine
                    y={stats.average}
                    stroke="#e11d48"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Moy. Mix (${stats.average} g)`,
                      fill: '#e11d48',
                      position: 'top',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                )}

                {(historyMode === 'total' || historyMode === 'compare') && (
                  <Line
                    type="monotone"
                    dataKey="carbonIntensity"
                    name="Intensité carbone (mix total)"
                    stroke="#e11d48"
                    strokeWidth={2.5}
                    dot={{ r: 2, fill: '#e11d48', strokeWidth: 0 }}
                    activeDot={{
                      r: 5,
                      fill: '#e11d48',
                      stroke: '#ffffff',
                      strokeWidth: 2,
                    }}
                    isAnimationActive={true}
                  />
                )}

                {(historyMode === 'fossil' || historyMode === 'compare') && (
                  <Line
                    type="monotone"
                    dataKey="fossilOnlyCarbonIntensity"
                    name="Intensité carbone fossile"
                    stroke="#d97706"
                    strokeWidth={2.5}
                    strokeDasharray={historyMode === 'compare' ? '5 5' : undefined}
                    dot={{ r: 2, fill: '#d97706', strokeWidth: 0 }}
                    activeDot={{
                      r: 5,
                      fill: '#d97706',
                      stroke: '#ffffff',
                      strokeWidth: 2,
                    }}
                    isAnimationActive={true}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Note contextuelle et pédagogique */}
      <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 pt-1 bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
        <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="leading-relaxed">
            <strong>Intensité carbone totale : ensemble du mix.</strong> Relevée via <code className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">/v4/carbon-intensity/latest</code> &amp; <code className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">/history</code>.
          </p>
          <p className="leading-relaxed">
            <strong>Intensité carbone fossile : uniquement la production fossile.</strong> Relevée via <code className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">/v4/carbon-intensity-fossil-only/latest</code> &amp; <code className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">/history</code>.
          </p>
          <p className="leading-relaxed">
            <strong>Disponibilité de la granularité temporelle :</strong> Le pas <strong>15 minutes</strong> (96 points/24h) constitue la référence officielle du marché synchrone européen (règlement européen CACM / ENTSO-E). Le pas <strong>5 minutes</strong> (288 points/24h) est accessible sur les zones à forte dynamique ou télémesures temps réel, tandis que le pas <strong>1 heure</strong> (24 points) correspond aux séries historiques Day-Ahead.
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
            L'écart visuel entre les deux courbes illustre l'effet de dilution permis par la production décarbonée (nucléaire et renouvelables).
          </p>
        </div>
      </div>
    </div>
  );
};
