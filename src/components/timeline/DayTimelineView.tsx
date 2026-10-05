import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Clock,
  Flame,
  Leaf,
  ShieldCheck,
  Zap,
  Activity,
  ArrowRightLeft,
  Sun,
  Wind,
  Atom,
  Radio,
  RefreshCw,
  Info,
  Calendar,
  Layers,
  ChevronRight,
  TrendingDown,
  Minus,
  CheckCircle2,
  Circle,
  SlidersHorizontal,
  Split,
  Eye,
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
  ReferenceLine,
  Legend,
} from 'recharts';
import {
  CountryElectricitySnapshot,
  TemporalGranularity,
  TimelineIndicator,
  TimelineHistoryPoint,
  TIMELINE_INDICATORS,
  GRANULARITY_OPTIONS,
} from '../../types/energy';
import { EU_COUNTRIES } from '../../data/euCountries';
import { EU_REFERENCE_SNAPSHOTS } from '../../data/referenceData';
import { emapsClient } from '../../services/electricityMaps/client';
import { CountryMixHistorySection } from '../countries/CountryMixHistorySection';
import { CountryFlowsHistorySection } from '../flows/CountryFlowsHistorySection';
import { DataProvenanceBanner } from '../common/DataProvenanceBanner';

interface DayTimelineViewProps {
  snapshots: Record<string, CountryElectricitySnapshot>;
  selectedCountryCode: string;
  onSelectCountry: (countryCode: string) => void;
  onNavigate?: (view: string, param?: string) => void;
  initialIndicator?: TimelineIndicator;
}

export const DayTimelineView: React.FC<DayTimelineViewProps> = ({
  snapshots,
  selectedCountryCode,
  onSelectCountry,
  onNavigate,
  initialIndicator,
}) => {
  const [selectedZone, setSelectedZone] = useState<string>(selectedCountryCode || 'FR');
  const [indicator, setIndicator] = useState<TimelineIndicator>(initialIndicator || 'carbonIntensity');
  const [comparisonIndicator, setComparisonIndicator] = useState<TimelineIndicator | 'none'>('none');
  const [granularity, setGranularity] = useState<TemporalGranularity>('15_minutes');
  const [points, setPoints] = useState<TimelineHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [showAverageLine, setShowAverageLine] = useState<boolean>(true);
  const [chartType, setChartType] = useState<'area' | 'line'>('area');
  const [selectorLayout, setSelectorLayout] = useState<'cards' | 'radioList'>('radioList');
  const [timelineMode, setTimelineMode] = useState<'indicator' | 'mix' | 'flows'>('indicator');

  // Synchronisation si le pays sélectionné change depuis l'extérieur
  useEffect(() => {
    if (selectedCountryCode && selectedCountryCode !== selectedZone) {
      setSelectedZone(selectedCountryCode);
    }
  }, [selectedCountryCode]);

  // Chargement des données de la timeline
  const fetchTimeline = async () => {
    setIsLoading(true);
    try {
      const data = await emapsClient.getZoneTimeline(selectedZone, granularity);
      setPoints(Array.isArray(data?.points) ? data.points : []);
    } catch (err) {
      console.warn('[DayTimelineView] Erreur chargement timeline :', err);
      setPoints([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [selectedZone, granularity]);

  const activeCountry = EU_COUNTRIES.find((c) => c.code === selectedZone) || EU_COUNTRIES[0];
  const activeSnapshot = snapshots[selectedZone];
  const currentIndicatorMeta = TIMELINE_INDICATORS.find((i) => i.key === indicator) || TIMELINE_INDICATORS[0];
  const compIndicatorMeta = comparisonIndicator !== 'none'
    ? TIMELINE_INDICATORS.find((i) => i.key === comparisonIndicator) || null
    : null;

  // Extraction de la valeur pour un point et un indicateur donné
  const getIndicatorValue = (pt: TimelineHistoryPoint, ind: TimelineIndicator): number | null => {
    switch (ind) {
      case 'carbonIntensity':
        return pt.carbonIntensity;
      case 'renewable':
        return pt.renewablePercentage;
      case 'carbonFree':
        return pt.fossilFreePercentage;
      case 'totalLoad':
        return pt.totalLoad;
      case 'reportedLoad':
        return pt.totalReportedLoad;
      case 'netLoad':
        return pt.netLoad;
      case 'solar':
        return pt.solar;
      case 'wind':
        return pt.wind;
      case 'nuclear':
        return pt.nuclear;
      case 'flows':
        return pt.netExport;
      default:
        return null;
    }
  };

  // Données formatées pour le graphique
  const chartData = useMemo(() => {
    return points.map((pt, index) => {
      const dateObj = new Date(pt.datetime);
      const hourLabel = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const fullLabel = `${dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${hourLabel}`;
      const value = getIndicatorValue(pt, indicator);
      const compValue = comparisonIndicator !== 'none' ? getIndicatorValue(pt, comparisonIndicator) : null;

      return {
        index,
        rawDatetime: pt.datetime,
        hourLabel,
        fullLabel,
        value,
        compValue,
        pt,
      };
    });
  }, [points, indicator, comparisonIndicator]);

  // Statistiques calculées sur les dernières 24h
  const stats = useMemo(() => {
    const validPoints = chartData.filter((d) => d.value !== null) as Array<{
      value: number;
      hourLabel: string;
      pt: TimelineHistoryPoint;
    }>;
    if (!validPoints.length) return null;

    const values = validPoints.map((d) => d.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / values.length);

    let minItem = validPoints[0];
    let maxItem = validPoints[0];

    validPoints.forEach((d) => {
      if (d.value < minItem.value) minItem = d;
      if (d.value > maxItem.value) maxItem = d;
    });

    const firstVal = validPoints[0].value;
    const lastVal = validPoints[validPoints.length - 1].value;
    const delta = lastVal - firstVal;
    const deltaPercent = firstVal !== 0 ? Math.round((delta / Math.abs(firstVal)) * 100) : 0;

    return {
      current: lastVal,
      average: avg,
      min: minItem.value,
      minHour: minItem.hourLabel,
      max: maxItem.value,
      maxHour: maxItem.hourLabel,
      delta,
      deltaPercent,
      amplitude: maxItem.value - minItem.value,
    };
  }, [chartData]);

  // Point actuellement sélectionné pour l'inspection au scrubber (par défaut le plus récent)
  const inspectedIndex = hoveredPointIndex !== null
    ? hoveredPointIndex
    : chartData.length > 0
    ? chartData.length - 1
    : null;

  const inspectedPoint = inspectedIndex !== null && chartData[inspectedIndex]
    ? chartData[inspectedIndex].pt
    : null;

  // Icône associée à chaque indicateur
  const getIndicatorIcon = (key: TimelineIndicator) => {
    switch (key) {
      case 'carbonIntensity':
        return Flame;
      case 'renewable':
        return Leaf;
      case 'carbonFree':
        return ShieldCheck;
      case 'totalLoad':
        return Activity;
      case 'reportedLoad':
        return Radio;
      case 'netLoad':
        return Zap;
      case 'solar':
        return Sun;
      case 'wind':
        return Wind;
      case 'nuclear':
        return Atom;
      case 'flows':
        return ArrowRightLeft;
      default:
        return TrendingUp;
    }
  };

  // Explication pédagogique contextuelle
  const getPedagogicalNote = (ind: TimelineIndicator) => {
    switch (ind) {
      case 'carbonIntensity':
        return {
          title: 'Intensité carbone (gCO₂eq/kWh)',
          body: "L'intensité carbone mesure les émissions en analyse de cycle de vie (ACV) générées par chaque kilowattheure consommé sur le territoire. Les pointes coïncident souvent avec la mobilisation des centrales thermiques marginales (gaz ou charbon) lors des pics de charge matinales et vespérales.",
        };
      case 'renewable':
        return {
          title: 'Part des énergies renouvelables (%)',
          body: "Totalise la contribution instantanée de l'éolien, du solaire photovoltaïque, de l'hydraulique et de la biomasse rapportée à la demande. Les variations reflètent les régimes de vent et l'ensoleillement diurne.",
        };
      case 'carbonFree':
        return {
          title: 'Part d’électricité bas-carbone (%)',
          body: "Englobe l'intégralité des filières sans émissions directes de gaz à effet de serre : énergies renouvelables + énergie nucléaire. Elle mesure le degré d'indépendance aux combustibles fossiles.",
        };
      case 'totalLoad':
        return {
          title: 'Charge totale du système (Total Load - MW)',
          body: "Puissance électrique totale appelée par l'ensemble des consommateurs (particuliers, tertiaire, industries et pertes réseau). Elle présente un profil diurne caractéristique avec deux pointes journalières.",
        };
      case 'reportedLoad':
        return {
          title: 'Charge déclarée officielle (Reported Load - MW)',
          body: "Valeur de télémétrie mesurée et déclarée au quart d'heure ou à l'heure par le gestionnaire de réseau de transport (TSO : RTE, Amprion, TenneT, Elia, Red Eléctrica). Strictly distinct du Total Load estimé.",
        };
      case 'netLoad':
        return {
          title: 'Charge nette résiduelle (Net Load - MW)',
          body: "La charge nette correspond à la demande totale soustraite de la production solaire et éolienne fatale (Total Load - Solaire - Éolien). Dans les pays à forte pénétration photovoltaïque, elle dessine la fameuse « Courbe du canard » (Duck Curve) avec un creux prononcé en milieu de journée.",
        };
      case 'solar':
        return {
          title: 'Production solaire photovoltaïque (MW)',
          body: "Production instantanée injectée sur le réseau de distribution et de transport. Elle suit fidèlement la courbe en cloche du rayonnement solaire, atteignant son zénith autour de 13h-14h locale.",
        };
      case 'wind':
        return {
          title: 'Production éolienne terrestre & en mer (MW)',
          body: "Puissance combinée des parcs éoliens onshore et offshore. Elle dépend des dépressions météorologiques et présente une forte variabilité synoptique à l'échelle européenne.",
        };
      case 'nuclear':
        return {
          title: 'Production du parc nucléaire (MW)',
          body: "Production continue assurant le socle de base (baseload) du réseau. Les centrales nucléaires fonctionnent généralement à puissance constante avec de fines modulations pour le suivi de charge.",
        };
      case 'flows':
        return {
          title: 'Solde net des flux d’échanges transfrontaliers (MW)',
          body: "Un solde positif (+MW) indique un pays exportateur net qui fournit de l'électricité à ses voisins. Un solde négatif (-MW) signale un pays importateur net qui s'appuie sur le réseau européen interconnecté.",
        };
    }
  };

  const currentPedagogical = getPedagogicalNote(indicator);

  // Valeur instantanée en direct pour chaque indicateur pour l'afficher dans les sélecteurs
  const getLiveIndicatorValue = (ind: TimelineIndicator): { text: string; sub?: string } => {
    if (!activeSnapshot) return { text: '—' };
    switch (ind) {
      case 'carbonIntensity':
        return { text: `${activeSnapshot.carbonIntensity ?? '—'} g` };
      case 'renewable':
        return { text: `${activeSnapshot.renewablePercentage ?? '—'} %` };
      case 'carbonFree':
        return { text: `${activeSnapshot.fossilFreePercentage ?? '—'} %` };
      case 'totalLoad':
        return { text: `${((activeSnapshot.totalConsumption || 0) / 1000).toFixed(1)} GW` };
      case 'reportedLoad':
        return { text: `${((activeSnapshot.reportedLoad || activeSnapshot.totalConsumption || 0) / 1000).toFixed(1)} GW` };
      case 'netLoad':
        return { text: `${((activeSnapshot.netLoad || 0) / 1000).toFixed(1)} GW` };
      case 'solar':
        return { text: `${((activeSnapshot.productionBreakdown?.solar || 0) / 1000).toFixed(1)} GW` };
      case 'wind':
        return { text: `${((activeSnapshot.productionBreakdown?.wind || 0) / 1000).toFixed(1)} GW` };
      case 'nuclear':
        return { text: `${((activeSnapshot.productionBreakdown?.nuclear || 0) / 1000).toFixed(1)} GW` };
      case 'flows':
        return {
          text: `${(activeSnapshot.netExport ?? 0) >= 0 ? '+' : ''}${(((activeSnapshot.netExport ?? 0)) / 1000).toFixed(1)} GW`,
          sub: (activeSnapshot.netExport ?? 0) >= 0 ? 'Export' : 'Import',
        };
      default:
        return { text: '—' };
    }
  };

  const sameUnitForComparison = compIndicatorMeta && compIndicatorMeta.unit === currentIndicatorMeta.unit;

  return (
    <div className="space-y-6">
      {/* En-tête principal de la page */}
      <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>📈 Journée Électrique</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                Timeline 24h V4
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Exploration chronologique continue de l'ensemble des 10 grandeurs physiques et signaux V4 d'Electricity Maps sur les dernières 24 heures glissantes.
          </p>
          <div className="mt-2">
            <DataProvenanceBanner
              dataTimestamp={activeSnapshot?.dataTimestamp || activeSnapshot?.datetime}
              retrievedAt={activeSnapshot?.retrievedAt || activeSnapshot?.updatedAt}
              source={activeSnapshot?.source}
              variant="inline"
            />
          </div>
        </div>

        {/* Sélecteur de pays et bouton rafraîchir */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="timeline-zone-select" className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Pays :
            </label>
            <select
              id="timeline-zone-select"
              value={selectedZone}
              onChange={(e) => {
                setSelectedZone(e.target.value);
                onSelectCountry(e.target.value);
              }}
              className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-bold text-slate-900 dark:text-white cursor-pointer shadow-xs"
            >
              {EU_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.nameFr} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchTimeline}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer shadow-xs"
            title="Rafraîchir les séries temporelles"
            aria-label="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sélecteur de mode de Timeline : 10 Indicateurs vs Mix Électrique vs Flux Transfrontaliers (24h) */}
      <div className="flex flex-col sm:flex-row items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setTimelineMode('indicator')}
          className={`w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
            timelineMode === 'indicator'
              ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 text-sky-500" />
          <span>Courbes par Indicateur (10 signaux V4)</span>
        </button>

        <button
          onClick={() => setTimelineMode('mix')}
          className={`w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
            timelineMode === 'mix'
              ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-500" />
          <span>⚡ Mix Électrique & Rubans 24h</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
            Filières
          </span>
        </button>

        <button
          onClick={() => setTimelineMode('flows')}
          className={`w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
            timelineMode === 'flows'
              ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4 text-teal-500" />
          <span>⇄ Flux Transfrontaliers (24h)</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
            Échanges
          </span>
        </button>
      </div>

      {timelineMode === 'mix' ? (
        <CountryMixHistorySection
          snapshot={activeSnapshot || snapshots[selectedZone] || EU_REFERENCE_SNAPSHOTS[selectedZone] || EU_REFERENCE_SNAPSHOTS['FR']}
          onNavigate={onNavigate}
        />
      ) : timelineMode === 'flows' ? (
        <CountryFlowsHistorySection
          snapshot={activeSnapshot || snapshots[selectedZone] || EU_REFERENCE_SNAPSHOTS[selectedZone] || EU_REFERENCE_SNAPSHOTS['FR']}
          onSelectCountry={(code) => {
            setSelectedZone(code);
            onSelectCountry(code);
          }}
          onNavigate={onNavigate}
        />
      ) : (
        <>
      {/* Bloc Sélecteur : Granularité V4 & Sélecteur d'Indicateur (Les 10 signaux demandés) */}
      <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-4">
        {/* Ligne Granularité */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-500" />
              <span>Granularité temporelle</span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Résolution du signal ({chartData.length} points sur 24h)
            </p>
          </div>

          {/* Boutons radio Granularité : ○ 5 min  ● 15 min  ○ 1 heure */}
          <div className="flex items-center gap-2 flex-wrap" role="radiogroup" aria-label="Granularité temporelle">
            {GRANULARITY_OPTIONS.map((opt) => {
              const isSelected = granularity === opt.value;
              return (
                <button
                  key={opt.value}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setGranularity(opt.value)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50 dark:bg-sky-950/70 border-sky-400 dark:border-sky-600 text-sky-800 dark:text-sky-200 shadow-xs ring-1 ring-sky-400/20'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title={opt.description}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-sky-600 dark:border-sky-400' : 'border-slate-400 dark:border-slate-600'
                    }`}
                  >
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-sky-600 dark:bg-sky-400" />}
                  </span>
                  <span>{opt.label}</span>
                  {opt.value === '15_minutes' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-200 dark:bg-sky-900 text-sky-800 dark:text-sky-200 font-bold">
                      Par défaut
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ligne En-tête Sélecteur d'Indicateur */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-500" />
              <span>Indicateur</span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Sélectionnez la grandeur physique à tracer sur la timeline 24h
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">Affichage sélecteur :</span>
            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => setSelectorLayout('radioList')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                  selectorLayout === 'radioList'
                    ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                ● Liste Radio
              </button>
              <button
                onClick={() => setSelectorLayout('cards')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                  selectorLayout === 'cards'
                    ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Cartes
              </button>
            </div>
          </div>
        </div>

        {/* Mode 1 : Sélecteur Radio Liste (● Indicateur sélectionné / ○ Autres indicateurs) */}
        {selectorLayout === 'radioList' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
            {TIMELINE_INDICATORS.map((ind) => {
              const isSelected = indicator === ind.key;
              const Icon = getIndicatorIcon(ind.key);
              const live = getLiveIndicatorValue(ind.key);

              return (
                <button
                  key={ind.key}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setIndicator(ind.key)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-slate-700 border-slate-900 dark:border-slate-600 shadow-md ring-2 ring-sky-500/20'
                      : 'bg-slate-50/80 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Bouton radio ● ou ○ */}
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'border-sky-400 bg-transparent'
                          : 'border-slate-400 dark:border-slate-500 bg-transparent'
                      }`}
                    >
                      {isSelected ? (
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ind.color }} />
                      ) : null}
                    </span>

                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: isSelected ? '#ffffff' : ind.color }} />
                        <span className="truncate">{ind.label}</span>
                      </div>
                      <span className={`text-[10px] block truncate ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                        {ind.unit}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-1">
                    <span className="text-xs font-mono font-bold" style={{ color: isSelected ? '#ffffff' : ind.color }}>
                      {live.text}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* Mode 2 : Sélecteur Grille de Cartes */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
            {TIMELINE_INDICATORS.map((ind) => {
              const isSelected = indicator === ind.key;
              const Icon = getIndicatorIcon(ind.key);
              const live = getLiveIndicatorValue(ind.key);

              return (
                <button
                  key={ind.key}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setIndicator(ind.key)}
                  className={`flex flex-col p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-slate-700 border-slate-900 dark:border-slate-600 shadow-md ring-2 ring-sky-500/20'
                      : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                      style={{ color: isSelected ? '#ffffff' : ind.color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Radio bullet ● ou ○ */}
                    <span
                      className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-sky-400' : 'border-slate-400'
                      }`}
                    >
                      {isSelected ? (
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ind.color }} />
                      ) : null}
                    </span>
                  </div>

                  <div className="mt-2 min-w-0">
                    <div className="text-xs font-bold truncate">{ind.label}</div>
                    <div className="flex items-center justify-between mt-1 text-[10px]">
                      <span className={isSelected ? 'text-slate-300' : 'text-slate-400'}>{ind.unit}</span>
                      <span className="font-mono font-bold" style={{ color: isSelected ? '#ffffff' : ind.color }}>
                        {live.text}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Option de comparaison multi-signaux */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Split className="w-3.5 h-3.5 text-sky-500" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Superposer un second signal (comparaison directe) :
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={comparisonIndicator}
              onChange={(e) => setComparisonIndicator(e.target.value as TimelineIndicator | 'none')}
              className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
            >
              <option value="none">Aucun (signal unique)</option>
              {TIMELINE_INDICATORS.filter((i) => i.key !== indicator).map((i) => (
                <option key={i.key} value={i.key}>
                  + {i.label} ({i.unit})
                </option>
              ))}
            </select>
            {comparisonIndicator !== 'none' && (
              <button
                onClick={() => setComparisonIndicator('none')}
                className="text-[11px] text-slate-400 hover:text-rose-500 font-medium underline"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cartes de métriques de la série sélectionnée */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Relevé actuel */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Relevé actuel</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black font-mono" style={{ color: currentIndicatorMeta.color }}>
                {indicator === 'flows' && stats.current > 0 ? '+' : ''}
                {stats.current >= 1000 ? stats.current.toLocaleString('fr-FR') : stats.current}
              </span>
              <span className="text-xs text-slate-400 font-semibold">{currentIndicatorMeta.unit}</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Dernier point mesuré</span>
          </div>

          {/* Moyenne 24h */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Moyenne 24h</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">
                {indicator === 'flows' && stats.average > 0 ? '+' : ''}
                {stats.average >= 1000 ? stats.average.toLocaleString('fr-FR') : stats.average}
              </span>
              <span className="text-xs text-slate-400 font-semibold">{currentIndicatorMeta.unit}</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Pondération continue</span>
          </div>

          {/* Pic Max */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Pic Max (24h)</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
                {indicator === 'flows' && stats.max > 0 ? '+' : ''}
                {stats.max >= 1000 ? stats.max.toLocaleString('fr-FR') : stats.max}
              </span>
              <span className="text-xs text-slate-400 font-semibold">{currentIndicatorMeta.unit}</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Atteint à {stats.maxHour}</span>
          </div>

          {/* Creux Min */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Creux Min (24h)</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {indicator === 'flows' && stats.min > 0 ? '+' : ''}
                {stats.min >= 1000 ? stats.min.toLocaleString('fr-FR') : stats.min}
              </span>
              <span className="text-xs text-slate-400 font-semibold">{currentIndicatorMeta.unit}</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Atteint à {stats.minHour}</span>
          </div>

          {/* Variation nette */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Variation (24h)</span>
            <div className="mt-1 flex items-center gap-1.5">
              {stats.delta > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
                    +{stats.delta >= 1000 ? (stats.delta / 1000).toFixed(1) + 'k' : stats.delta}
                  </span>
                </>
              ) : stats.delta < 0 ? (
                <>
                  <TrendingDown className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {stats.delta >= 1000 ? (stats.delta / 1000).toFixed(1) + 'k' : stats.delta}
                  </span>
                </>
              ) : (
                <>
                  <Minus className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xl font-bold font-mono text-slate-500">0</span>
                </>
              )}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Amplitude : {stats.amplitude >= 1000 ? (stats.amplitude / 1000).toFixed(1) + 'k' : stats.amplitude} {currentIndicatorMeta.unit}
            </span>
          </div>
        </div>
      )}

      {/* Zone du Grand Graphique Chronologique */}
      <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: currentIndicatorMeta.color }} />
              <span>Courbe temporelle : {currentIndicatorMeta.label} ({activeCountry.flag} {activeCountry.nameFr})</span>
              {compIndicatorMeta && (
                <span className="text-xs font-normal text-slate-400">
                  vs <strong style={{ color: compIndicatorMeta.color }}>{compIndicatorMeta.label}</strong>
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {currentIndicatorMeta.description} — Pas temporel : <strong>{granularity === '5_minutes' ? '5 minutes' : granularity === '15_minutes' ? '15 minutes (Standard ENTSO-E)' : '1 heure'}</strong> ({chartData.length} points)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAverageLine((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                showAverageLine
                  ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
            >
              Ligne moyenne
            </button>

            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => setChartType('area')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  chartType === 'area'
                    ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Aire
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  chartType === 'line'
                    ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Ligne
              </button>
            </div>
          </div>
        </div>

        {/* Graphique Recharts */}
        <div className="h-80 sm:h-96 w-full pt-2">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-700">
              <Clock className="w-8 h-8 text-sky-500 animate-spin mb-2" />
              <p className="text-xs text-slate-500 font-medium">Synchronisation de la timeline 24h ({granularity})...</p>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Donnée historique 24h indisponible pour cet indicateur
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-lg mx-auto">
                  Conformément à la règle <strong>« Zéro donnée inventée »</strong>, aucune courbe artificielle n'est simulée par fonction sinus. Seule la dernière observation certifiée est enregistrée.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono">
                <span className="text-slate-400">Dernier relevé connu ({currentIndicatorMeta.label}) :</span>
                <span className="font-bold text-slate-900 dark:text-white">{getLiveIndicatorValue(indicator).text}</span>
              </div>
              <div className="pt-2 flex justify-center">
                <DataProvenanceBanner
                  dataTimestamp={activeSnapshot?.dataTimestamp || activeSnapshot?.datetime}
                  retrievedAt={activeSnapshot?.retrievedAt || activeSnapshot?.updatedAt}
                  source={activeSnapshot?.source}
                  variant="inline"
                />
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={280}>
              {chartType === 'area' && comparisonIndicator === 'none' ? (
                <AreaChart
                  data={chartData}
                  margin={{ top: 16, right: 16, left: 0, bottom: 4 }}
                  onMouseMove={(state) => {
                    if (state?.activeTooltipIndex !== undefined && state.activeTooltipIndex !== null) {
                      setHoveredPointIndex(Number(state.activeTooltipIndex));
                    }
                  }}
                  onMouseLeave={() => setHoveredPointIndex(null)}
                >
                  <defs>
                    <linearGradient id="timelineAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={currentIndicatorMeta.color} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={currentIndicatorMeta.color} stopOpacity={0.0} />
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
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    unit={currentIndicatorMeta.unit === '%' ? '%' : ''}
                    domain={indicator === 'flows' ? ['auto', 'auto'] : [0, 'auto']}
                    dx={-6}
                  />

                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload as { fullLabel: string; value: number; pt: TimelineHistoryPoint };
                      return (
                        <div className="p-3 rounded-xl shadow-2xl border border-slate-700 bg-slate-900/95 text-white text-xs font-sans space-y-1.5 min-w-[200px] backdrop-blur-md">
                          <div className="font-bold border-b border-slate-700 pb-1 text-sky-400">
                            {d.fullLabel}
                          </div>
                          <div className="flex justify-between items-center text-sm font-black">
                            <span className="text-slate-300">{currentIndicatorMeta.label} :</span>
                            <span style={{ color: currentIndicatorMeta.color }} className="font-mono">
                              {indicator === 'flows' && d.value > 0 ? '+' : ''}
                              {d.value >= 1000 ? d.value.toLocaleString('fr-FR') : d.value} {currentIndicatorMeta.unit}
                            </span>
                          </div>
                          <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
                            <span>Total Load : <strong>{d.pt.totalLoad?.toLocaleString('fr-FR') ?? '—'} MW</strong></span>
                            <span>Carbone : <strong>{d.pt.carbonIntensity ?? '—'} g</strong></span>
                          </div>
                        </div>
                      );
                    }}
                  />

                  {showAverageLine && stats && (
                    <ReferenceLine
                      y={stats.average}
                      stroke={currentIndicatorMeta.color}
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: `Moy. ${stats.average} ${currentIndicatorMeta.unit}`,
                        fill: currentIndicatorMeta.color,
                        position: 'top',
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    />
                  )}

                  {indicator === 'flows' && (
                    <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />
                  )}

                  <Area
                    type="monotone"
                    dataKey="value"
                    name={currentIndicatorMeta.label}
                    stroke={currentIndicatorMeta.color}
                    strokeWidth={2.5}
                    fill="url(#timelineAreaGradient)"
                    dot={false}
                    activeDot={{ r: 5, fill: currentIndicatorMeta.color, stroke: '#ffffff', strokeWidth: 2 }}
                    isAnimationActive={true}
                  />
                </AreaChart>
              ) : (
                <LineChart
                  data={chartData}
                  margin={{ top: 16, right: 16, left: 0, bottom: 4 }}
                  onMouseMove={(state) => {
                    if (state?.activeTooltipIndex !== undefined && state.activeTooltipIndex !== null) {
                      setHoveredPointIndex(Number(state.activeTooltipIndex));
                    }
                  }}
                  onMouseLeave={() => setHoveredPointIndex(null)}
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
                    yAxisId="left"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    unit={currentIndicatorMeta.unit === '%' ? '%' : ''}
                    domain={indicator === 'flows' ? ['auto', 'auto'] : [0, 'auto']}
                    dx={-6}
                  />

                  {compIndicatorMeta && !sameUnitForComparison && (
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: compIndicatorMeta.color }}
                      unit={compIndicatorMeta.unit === '%' ? '%' : ''}
                      domain={compIndicatorMeta.key === 'flows' ? ['auto', 'auto'] : [0, 'auto']}
                      dx={6}
                    />
                  )}

                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload as { fullLabel: string; value: number; compValue: number | null; pt: TimelineHistoryPoint };
                      return (
                        <div className="p-3 rounded-xl shadow-2xl border border-slate-700 bg-slate-900/95 text-white text-xs font-sans space-y-1.5 min-w-[220px] backdrop-blur-md">
                          <div className="font-bold border-b border-slate-700 pb-1 text-sky-400">
                            {d.fullLabel}
                          </div>
                          <div className="flex justify-between items-center text-sm font-black">
                            <span className="text-slate-300">{currentIndicatorMeta.label} :</span>
                            <span style={{ color: currentIndicatorMeta.color }} className="font-mono">
                              {indicator === 'flows' && d.value > 0 ? '+' : ''}
                              {d.value >= 1000 ? d.value.toLocaleString('fr-FR') : d.value} {currentIndicatorMeta.unit}
                            </span>
                          </div>
                          {compIndicatorMeta && d.compValue !== null && (
                            <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-slate-800">
                              <span className="text-slate-300">{compIndicatorMeta.label} :</span>
                              <span style={{ color: compIndicatorMeta.color }} className="font-mono">
                                {compIndicatorMeta.key === 'flows' && d.compValue > 0 ? '+' : ''}
                                {d.compValue >= 1000 ? d.compValue.toLocaleString('fr-FR') : d.compValue} {compIndicatorMeta.unit}
                              </span>
                            </div>
                          )}
                          <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
                            <span>Total Load : <strong>{d.pt.totalLoad?.toLocaleString('fr-FR') ?? '—'} MW</strong></span>
                            <span>Carbone : <strong>{d.pt.carbonIntensity ?? '—'} g</strong></span>
                          </div>
                        </div>
                      );
                    }}
                  />

                  {showAverageLine && stats && (
                    <ReferenceLine
                      yAxisId="left"
                      y={stats.average}
                      stroke={currentIndicatorMeta.color}
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: `Moy. ${stats.average} ${currentIndicatorMeta.unit}`,
                        fill: currentIndicatorMeta.color,
                        position: 'top',
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    />
                  )}

                  {indicator === 'flows' && (
                    <ReferenceLine yAxisId="left" y={0} stroke="#64748b" strokeWidth={1.5} />
                  )}

                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="value"
                    name={currentIndicatorMeta.label}
                    stroke={currentIndicatorMeta.color}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: currentIndicatorMeta.color, stroke: '#ffffff', strokeWidth: 2 }}
                    isAnimationActive={true}
                  />

                  {compIndicatorMeta && (
                    <Line
                      yAxisId={sameUnitForComparison ? 'left' : 'right'}
                      type="monotone"
                      dataKey="compValue"
                      name={compIndicatorMeta.label}
                      stroke={compIndicatorMeta.color}
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                      activeDot={{ r: 4, fill: compIndicatorMeta.color, stroke: '#ffffff', strokeWidth: 2 }}
                      isAnimationActive={true}
                    />
                  )}
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Scrubber Interactif & Instantané Complet du Réseau à cet instant */}
      {inspectedPoint && (
        <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Instantané Synchronisé du Réseau à cet instant
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(inspectedPoint.datetime).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}{' '}
                  à{' '}
                  <strong className="text-slate-800 dark:text-slate-200 font-mono text-sm">
                    {new Date(inspectedPoint.datetime).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </strong>{' '}
                  (Glisser le curseur ci-dessous pour voyager dans la journée)
                </p>
              </div>
            </div>

            <div className="text-xs font-semibold px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-mono">
              Point {((inspectedIndex ?? 0) + 1)} / {chartData.length}
            </div>
          </div>

          {/* Curseur de navigation temporelle (Timeline Scrubber) */}
          <div className="space-y-1.5">
            <input
              type="range"
              min={0}
              max={chartData.length - 1}
              value={inspectedIndex ?? 0}
              onChange={(e) => setHoveredPointIndex(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>{chartData[0]?.hourLabel ?? 'Il y a 24h'}</span>
              <span>Midi</span>
              <span>{chartData[chartData.length - 1]?.hourLabel ?? 'Maintenant'}</span>
            </div>
          </div>

          {/* Tableau de bord synchronisé des 10 signaux au point inspecté */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
            <div
              onClick={() => setIndicator('carbonIntensity')}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                indicator === 'carbonIntensity'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Intensité carbone</span>
                <span className="text-[10px] font-mono">{indicator === 'carbonIntensity' ? '●' : '○'}</span>
              </div>
              <div className="text-base font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                {inspectedPoint.carbonIntensity ?? '—'} <span className="text-xs font-normal">g</span>
              </div>
            </div>

            <div
              onClick={() => setIndicator('renewable')}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                indicator === 'renewable'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Part renouvelable</span>
                <span className="text-[10px] font-mono">{indicator === 'renewable' ? '●' : '○'}</span>
              </div>
              <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                {inspectedPoint.renewablePercentage ?? '—'}%
              </div>
            </div>

            <div
              onClick={() => setIndicator('carbonFree')}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                indicator === 'carbonFree'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Part bas-carbone</span>
                <span className="text-[10px] font-mono">{indicator === 'carbonFree' ? '●' : '○'}</span>
              </div>
              <div className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                {inspectedPoint.fossilFreePercentage ?? '—'}%
              </div>
            </div>

            <div
              onClick={() => setIndicator('totalLoad')}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                indicator === 'totalLoad'
                  ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Total Load</span>
                <span className="text-[10px] font-mono">{indicator === 'totalLoad' ? '●' : '○'}</span>
              </div>
              <div className="text-base font-bold font-mono text-sky-600 dark:text-sky-400 mt-0.5">
                {((inspectedPoint.totalLoad ?? 0) / 1000).toFixed(1)} <span className="text-xs font-normal">GW</span>
              </div>
            </div>

            <div
              onClick={() => setIndicator('reportedLoad')}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                indicator === 'reportedLoad'
                  ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Reported Load</span>
                <span className="text-[10px] font-mono">{indicator === 'reportedLoad' ? '●' : '○'}</span>
              </div>
              <div className="text-base font-bold font-mono text-teal-600 dark:text-teal-400 mt-0.5">
                {((inspectedPoint.totalReportedLoad ?? inspectedPoint.totalLoad ?? 0) / 1000).toFixed(1)} <span className="text-xs font-normal">GW</span>
              </div>
            </div>

            <div
              onClick={() => setIndicator('netLoad')}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                indicator === 'netLoad'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Net Load</span>
                <span className="text-[10px] font-mono">{indicator === 'netLoad' ? '●' : '○'}</span>
              </div>
              <div className="text-base font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                {((inspectedPoint.netLoad ?? 0) / 1000).toFixed(1)} <span className="text-xs font-normal">GW</span>
              </div>
            </div>

            <div
              onClick={() => setIndicator('solar')}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                indicator === 'solar'
                  ? 'bg-yellow-50 dark:bg-yellow-950/40 border-yellow-300 dark:border-yellow-800'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Solaire</span>
                <span className="text-[10px] font-mono">{indicator === 'solar' ? '●' : '○'}</span>
              </div>
              <div className="text-base font-bold font-mono text-yellow-500 mt-0.5">
                {((inspectedPoint.solar ?? 0) / 1000).toFixed(1)} <span className="text-xs font-normal">GW</span>
              </div>
            </div>

            <div
              onClick={() => setIndicator('wind')}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                indicator === 'wind'
                  ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-300 dark:border-cyan-800'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Éolien</span>
                <span className="text-[10px] font-mono">{indicator === 'wind' ? '●' : '○'}</span>
              </div>
              <div className="text-base font-bold font-mono text-cyan-500 mt-0.5">
                {((inspectedPoint.wind ?? 0) / 1000).toFixed(1)} <span className="text-xs font-normal">GW</span>
              </div>
            </div>

            <div
              onClick={() => setIndicator('nuclear')}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                indicator === 'nuclear'
                  ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-300 dark:border-violet-800'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Nucléaire</span>
                <span className="text-[10px] font-mono">{indicator === 'nuclear' ? '●' : '○'}</span>
              </div>
              <div className="text-base font-bold font-mono text-violet-500 mt-0.5">
                {((inspectedPoint.nuclear ?? 0) / 1000).toFixed(1)} <span className="text-xs font-normal">GW</span>
              </div>
            </div>

            <div
              onClick={() => setIndicator('flows')}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                indicator === 'flows'
                  ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Flux transfrontaliers</span>
                <span className="text-[10px] font-mono">{indicator === 'flows' ? '●' : '○'}</span>
              </div>
              <div className={`text-base font-bold font-mono mt-0.5 ${
                (inspectedPoint.netExport ?? 0) >= 0 ? 'text-emerald-500' : 'text-amber-500'
              }`}>
                {(inspectedPoint.netExport ?? 0) >= 0 ? '+' : ''}
                {(((inspectedPoint.netExport ?? 0)) / 1000).toFixed(2)} GW{' '}
                <span className="text-xs font-normal text-slate-400">
                  ({(inspectedPoint.netExport ?? 0) >= 0 ? 'Export' : 'Import'})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Note Pédagogique Contextuelle */}
      <div className="bg-sky-50/50 dark:bg-sky-950/20 p-4 rounded-2xl border border-sky-100 dark:border-sky-900/40 text-xs text-sky-900 dark:text-sky-300 flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-900 dark:text-white">
            {currentPedagogical.title}
          </p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
            {currentPedagogical.body}
          </p>
          <p className="text-[10px] text-slate-400 pt-1">
            Données modélisées et synchronisées avec les flux réels Electricity Maps V4 et ENTSO-E pour les 27 pays de l'Union Européenne.
          </p>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
