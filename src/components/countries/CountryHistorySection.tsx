import React, { useEffect, useState, useMemo } from 'react';
import {
  History,
  TrendingDown,
  TrendingUp,
  Minus,
  RefreshCw,
  Info,
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
} from 'recharts';
import { CarbonHistoryPoint, CountryElectricitySnapshot } from '../../types/energy';
import { emapsClient } from '../../services/electricityMaps/client';

interface CountryHistorySectionProps {
  snapshot: CountryElectricitySnapshot;
}

interface ChartDataPoint {
  rawDatetime: string;
  hourLabel: string;
  fullDateLabel: string;
  carbonIntensity: number;
  isEstimated: boolean;
}

export const CountryHistorySection: React.FC<CountryHistorySectionProps> = ({ snapshot }) => {
  const [history, setHistory] = useState<CarbonHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAverageLine, setShowAverageLine] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await emapsClient.getZoneHistory(
        snapshot.zoneKey,
        snapshot.carbonIntensity ?? 150,
        snapshot.datetime
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
  }, [snapshot.zoneKey, snapshot.datetime, snapshot.carbonIntensity]);

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

    return {
      average: avg,
      min: minPoint.carbonIntensity,
      minHour: minPoint.hourLabel,
      max: maxPoint.carbonIntensity,
      maxHour: maxPoint.hourLabel,
      diff,
      diffPercent,
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
            Évolution heure par heure de l'empreinte carbone pour {snapshot.countryNameFr} ({snapshot.zoneKey})
          </p>
        </div>

        {/* Contrôles d'affichage */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAverageLine((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
              showAverageLine
                ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            Ligne moyenne (24h)
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

      {/* Cartes de statistiques rapides 24h */}
      {stats && !isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Moyenne 24h</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                {stats.average}
              </span>
              <span className="text-[10px] text-slate-400">gCO₂/kWh</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Minimum (24h)</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {stats.min}
              </span>
              <span className="text-[10px] text-slate-400">g à {stats.minHour}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Maximum (24h)</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
                {stats.max}
              </span>
              <span className="text-[10px] text-slate-400">g à {stats.maxHour}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Variation sur 24h</span>
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
          <div className="h-48 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-400 italic">
            Aucun historique 24h disponible pour cette zone.
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
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-lg text-xs space-y-1.5 z-50">
                        <p className="font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1">
                          {item.fullDateLabel}
                        </p>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block"
                              style={{ backgroundColor: lineColor }}
                            />
                            Intensité :
                          </span>
                          <span className="font-bold font-mono text-slate-900 dark:text-white">
                            {item.carbonIntensity} gCO₂/kWh
                          </span>
                        </div>

                        {stats && (
                          <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
                            <span>Écart à la moyenne :</span>
                            <span
                              className={`font-mono font-medium ${
                                diffAvg <= 0 ? 'text-emerald-500' : 'text-amber-500'
                              }`}
                            >
                              {diffAvg > 0 ? `+${diffAvg}` : diffAvg} g
                            </span>
                          </div>
                        )}

                        <div className="text-[10px] text-slate-400 pt-0.5 border-t border-slate-100 dark:border-slate-800">
                          {item.isEstimated ? 'Modélisé (estimé)' : 'Mesure vérifiée'}
                        </div>
                      </div>
                    );
                  }}
                />

                {showAverageLine && stats && (
                  <ReferenceLine
                    y={stats.average}
                    stroke="#0284c7"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Moy. 24h (${stats.average} g)`,
                      fill: '#0284c7',
                      position: 'top',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                )}

                <Line
                  type="monotone"
                  dataKey="carbonIntensity"
                  name="Intensité carbone"
                  stroke={lineColor}
                  strokeWidth={2.5}
                  dot={{ r: 2, fill: lineColor, strokeWidth: 0 }}
                  activeDot={{
                    r: 5,
                    fill: lineColor,
                    stroke: '#ffffff',
                    strokeWidth: 2,
                  }}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Note contextuelle et pédagogique */}
      <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
        <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Les fluctuations observées sur 24 heures reflètent l'alternance jour/nuit (production solaire de mi-journée), le profil des vents, ainsi que les pointes de consommation du matin (07h-09h) et du soir (18h-21h) mobilisant des unités d'appoint.
        </p>
      </div>
    </div>
  );
};
