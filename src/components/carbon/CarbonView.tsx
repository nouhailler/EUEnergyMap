import React, { useState, useEffect } from 'react';
import { Flame, Clock, ShieldCheck, AlertCircle, Info, TrendingUp, ArrowRight } from 'lucide-react';
import { CountryElectricitySnapshot, CarbonHistoryPoint, TemporalGranularity, GRANULARITY_OPTIONS } from '../../types/energy';
import { EU_COUNTRIES } from '../../data/euCountries';
import { emapsClient } from '../../services/electricityMaps/client';
import { UnitFormattedValue } from '../common/UnitFormattedValue';

interface CarbonViewProps {
  snapshots: Record<string, CountryElectricitySnapshot>;
  onSelectCountry: (countryCode: string) => void;
  onNavigate?: (view: string, param?: string) => void;
}

export const CarbonView: React.FC<CarbonViewProps> = ({ snapshots, onSelectCountry, onNavigate }) => {
  const [selectedZone, setSelectedZone] = useState('FR');
  const [granularity, setGranularity] = useState<TemporalGranularity>('15_minutes');
  const [history, setHistory] = useState<CarbonHistoryPoint[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingHistory(true);
    emapsClient
      .getZoneHistory(selectedZone, undefined, undefined, granularity)
      .then((data) => {
        if (isMounted) {
          setHistory(Array.isArray(data?.history) ? data.history : []);
          setIsLoadingHistory(false);
        }
      })
      .catch((err) => {
        console.warn('Erreur historique zone', err);
        if (isMounted) {
          setHistory([]);
          setIsLoadingHistory(false);
        }
      });

  return () => {
    isMounted = false;
  };
}, [selectedZone, granularity]);

  const activeSnapshot = snapshots[selectedZone];
  const activeCountry = EU_COUNTRIES.find((c) => c.code === selectedZone);

  const safeHistory = Array.isArray(history) ? history : [];

  // Maximum pour calibrer le graphique SVG d'historique
  const maxIntensity = Math.max(100, ...safeHistory.map((p) => p.carbonIntensity ?? 0));

  return (
    <div className="space-y-6">
      {/* En-tête de la vue Carbone */}
      <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Flame className="w-5 h-5 text-rose-500" />
          <span>Observatoire de l'Intensité Carbone</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
          L'intensité carbone mesure les émissions de gaz à effet de serre (en grammes d'équivalent CO₂) générées pour produire chaque kilowattheure (kWh) d'électricité. Les calculs intègrent l'ensemble du cycle de vie des installations énergétiques.
        </p>
      </div>

      {/* Passerelle vers la Timeline Multi-Signaux : Journée électrique */}
      <div className="bg-gradient-to-r from-sky-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-lg border border-sky-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
              <TrendingUp className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
              Nouvelle Timeline Multi-Signaux
            </span>
          </div>
          <h3 className="text-sm font-bold text-white">
            📈 Explorer la « Journée électrique » complète sur 24 heures
          </h3>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Ne vous limitez pas au carbone seul : accédez à la timeline interactive synchronisée sur 24h avec les <strong>10 signaux physiques</strong> (Carbone, Renouvelable, Bas-carbone, Total Load, Reported Load, Net Load, Solaire, Éolien, Nucléaire, Flux).
          </p>
        </div>
        {onNavigate && (
          <button
            onClick={() => onNavigate('timeline', selectedZone)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-md shrink-0 self-start md:self-auto"
          >
            <span>Ouvrir Journée électrique</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Graphique d'historique 24h & Sélecteur de zone */}
      <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>Évolution sur 24 heures glissantes</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Historique officiel fourni par l'API Electricity Maps.
            </p>
          </div>

          {/* Sélecteur de pays pour l'historique */}
          <div className="flex items-center gap-2">
            <label htmlFor="history-zone" className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Pays sélectionné :
            </label>
            <select
              id="history-zone"
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs"
            >
              {EU_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.nameFr} ({snapshots[c.code]?.carbonIntensity ?? '—'} g)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Barre de sélection de la Granularité Temporelle V4 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Granularité temporelle V4 :
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              ({safeHistory.length} relevés sur 24h)
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {GRANULARITY_OPTIONS.map((opt) => {
              const isSelected = granularity === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setGranularity(opt.value)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                    isSelected
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                  title={opt.description}
                >
                  <span className={`w-2 h-2 rounded-full border ${isSelected ? 'bg-white border-white' : 'border-slate-400'}`} />
                  <span>{opt.label}</span>
                  {opt.value === '15_minutes' && (
                    <span className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                      isSelected ? 'bg-rose-700 text-rose-100' : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                    }`}>
                      Défaut
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Graphique SVG 24h */}
        <div className="bg-slate-50/70 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          {isLoadingHistory ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">
              Chargement des relevés...
            </div>
          ) : safeHistory.length > 0 ? (
            <div className="space-y-3">
              <div className="h-48 w-full flex items-end gap-0.5 sm:gap-1 pt-6 pb-2">
                {safeHistory.map((pt, idx) => {
                  const val = pt.carbonIntensity ?? 0;
                  const heightPercent = Math.min(100, Math.max(8, (val / maxIntensity) * 100));
                  const dateObj = new Date(pt.datetime);
                  const timeLabel = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                  const hourLabel = dateObj.getUTCHours();

                  // Couleur selon intensité
                  let barColor = 'bg-emerald-500';
                  if (val > 300) barColor = 'bg-rose-500';
                  else if (val > 150) barColor = 'bg-amber-500';

                  // Afficher l'étiquette heure régulièrement
                  const showLabel = safeHistory.length <= 30
                    ? idx % 4 === 0
                    : safeHistory.length <= 100
                    ? idx % 12 === 0
                    : idx % 36 === 0;

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center h-full justify-end group relative"
                    >
                      {/* Tooltip au survol d'une barre */}
                      <div className="absolute -top-9 z-10 hidden group-hover:block bg-slate-900 text-white text-[10px] py-1 px-2 rounded-md shadow-lg whitespace-nowrap pointer-events-none">
                        {val} gCO₂eq/kWh à {timeLabel}
                      </div>

                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full max-w-[12px] rounded-t-xs transition-all duration-200 hover:brightness-125 ${barColor}`}
                      />

                      {showLabel && (
                        <span className="text-[9px] text-slate-400 mt-1 select-none font-mono">
                          {hourLabel}h
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-2 font-mono">
                <span>Il y a 24h</span>
                <span>Max : {maxIntensity} gCO₂eq/kWh</span>
                <span>Relevé actuel ({granularity === '5_minutes' ? '5 min' : granularity === '15_minutes' ? '15 min' : '1h'})</span>
              </div>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Donnée historique 24h indisponible
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-lg mx-auto">
                  Conformément à la règle <strong>« Zéro donnée inventée »</strong>, aucune courbe artificielle n'est simulée par fonction mathématique. Seule la dernière observation réelle certifiée est conservée.
                </p>
              </div>
              {activeSnapshot?.carbonIntensity !== null && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono">
                  <span className="text-slate-400">Dernier relevé réel certifié :</span>
                  <span className="font-bold text-slate-900 dark:text-white">{activeSnapshot?.carbonIntensity} gCO₂eq/kWh</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Note pédagogique sur l'historique étendu */}
        <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 rounded-xl text-xs text-sky-800 dark:text-sky-300 flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            <strong>Note sur les périodes temporelles :</strong> L'accès API gratuit / standard permet de consulter les dernières 24 heures glissantes. L'historique étendu (7 jours, 30 jours, 1 an) requiert l'accès au plan payant Electricity Maps. Conformément aux engagements de probité de l'application, aucune donnée historique n'est simulée.
          </p>
        </div>
      </div>

      {/* Section didactique : Analyse de cycle de vie (ACV) vs Direct */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Cycle de vie (LCA) vs Émissions directes</span>
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
            Electricity Maps applique la méthodologie internationale de l'Analyse du Cycle de Vie (ACV / LCA). Cela signifie que même l'éolien, le solaire ou le nucléaire ont une intensité carbone supérieure à zéro (ex: ~12 g/kWh pour le nucléaire et l'éolien, ~45 g/kWh pour le solaire) car elle comptabilise :
          </p>
          <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside">
            <li>L'extraction des matières premières (béton, acier, métaux rares, silicium) ;</li>
            <li>La fabrication des équipements et le transport ;</li>
            <li>La construction, la maintenance et enfin le démantèlement.</li>
          </ul>
        </div>

        <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span>Bas-carbone vs Renouvelable</span>
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Il est essentiel de ne pas confondre ces deux grandeurs :
          </p>
          <div className="mt-2 space-y-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
              <strong className="text-emerald-700 dark:text-emerald-400 block font-semibold">Électricité Renouvelable</strong>
              <span>Énergie solaire, éolienne, hydraulique, biomasse et géothermie.</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
              <strong className="text-indigo-700 dark:text-indigo-400 block font-semibold">Électricité Bas-Carbone (Fossil-Free)</strong>
              <span>Englobe l'intégralité des renouvelables <strong>ET</strong> l'énergie nucléaire, toutes deux exemptes de combustion fossile lors de la production.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
