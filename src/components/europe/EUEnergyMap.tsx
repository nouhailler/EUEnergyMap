import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  CountryElectricitySnapshot,
  IndicatorMode,
  ProductionSourceKey,
} from '../../types/energy';
import { EU_COUNTRIES, EUCountryConfig } from '../../data/euCountries';
import { PRODUCTION_SOURCES } from '../../data/sourcesMeta';
import {
  RotateCcw,
  Search,
  Layers,
  Maximize2,
  Minimize2,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Info,
} from 'lucide-react';

interface EUEnergyMapProps {
  snapshots: Record<string, CountryElectricitySnapshot>;
  selectedIndicator: IndicatorMode;
  onSelectIndicator: (indicator: IndicatorMode) => void;
  onSelectCountry: (countryCode: string) => void;
}

type TileLayerTheme = 'positron' | 'dark' | 'osm' | 'none';

export const EUEnergyMap: React.FC<EUEnergyMapProps> = ({
  snapshots,
  selectedIndicator,
  onSelectIndicator,
  onSelectCountry,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [geojsonData, setGeojsonData] = useState<any | null>(null);
  const [isLoadingGeo, setIsLoadingGeo] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedTileTheme, setSelectedTileTheme] = useState<TileLayerTheme>('positron');
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Indexation rapide des pays UE par code ISO2
  const euCountriesMap = useMemo(() => {
    const map = new Map<string, EUCountryConfig>();
    for (const c of EU_COUNTRIES) {
      map.set(c.code, c);
    }
    return map;
  }, []);

  // Détermination de la source principale de production
  const getPrimarySource = useCallback(
    (snapshot?: CountryElectricitySnapshot): { key: ProductionSourceKey; label: string; color: string } => {
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
    },
    [],
  );

  // Détermination de la couleur selon l'indicateur sélectionné
  const getCountryFill = useCallback(
    (countryCode: string): string => {
      const s = snapshots[countryCode];
      if (!s) return '#94a3b8'; // Gris neutre si en attente de données

      if (selectedIndicator === 'carbonIntensity') {
        const ci = s.carbonIntensity;
        if (ci == null) return '#94a3b8';
        if (ci <= 50) return '#10b981'; // Vert vif (< 50g)
        if (ci <= 100) return '#34d399'; // Vert doux (50-100g)
        if (ci <= 200) return '#fbbf24'; // Jaune ambré (100-200g)
        if (ci <= 350) return '#f97316'; // Orange (200-350g)
        if (ci <= 500) return '#ef4444'; // Rouge vif (350-500g)
        return '#991b1b'; // Rouge foncé / bordeaux (> 500g)
      }

      if (selectedIndicator === 'renewableShare') {
        const ren = s.renewablePercentage;
        if (ren == null) return '#94a3b8';
        if (ren >= 80) return '#047857';
        if (ren >= 60) return '#10b981';
        if (ren >= 40) return '#34d399';
        if (ren >= 20) return '#a7f3d0';
        return '#e2e8f0';
      }

      if (selectedIndicator === 'carbonFreeShare') {
        const cf = s.fossilFreePercentage;
        if (cf == null) return '#94a3b8';
        if (cf >= 85) return '#4338ca';
        if (cf >= 70) return '#6366f1';
        if (cf >= 50) return '#818cf8';
        if (cf >= 30) return '#c7d2fe';
        return '#e2e8f0';
      }

      if (selectedIndicator === 'totalLoad') {
        const load = s.totalConsumption;
        if (load == null) return '#94a3b8';
        if (load >= 45000) return '#0369a1';
        if (load >= 25000) return '#0ea5e9';
        if (load >= 10000) return '#38bdf8';
        if (load >= 3000) return '#7dd3fc';
        return '#bae6fd';
      }

      if (selectedIndicator === 'netLoad') {
        const net = s.netLoad;
        if (net == null) return '#94a3b8';
        if (net >= 35000) return '#b45309';
        if (net >= 20000) return '#d97706';
        if (net >= 8000) return '#f59e0b';
        if (net >= 2500) return '#fbbf24';
        return '#fef3c7';
      }

      if (selectedIndicator === 'fossilOnlyCarbonIntensity') {
        const fci = s.fossilOnlyCarbonIntensity;
        if (fci == null) return '#10b981';
        if (fci >= 800) return '#991b1b';
        if (fci >= 650) return '#ef4444';
        if (fci >= 500) return '#f97316';
        return '#fbbf24';
      }

      if (selectedIndicator === 'primarySource') {
        return getPrimarySource(s).color;
      }

      return '#94a3b8';
    },
    [snapshots, selectedIndicator, getPrimarySource],
  );

  // Texte court pour l'étiquette sur le pays
  const getShortValueText = useCallback(
    (countryCode: string): string => {
      const s = snapshots[countryCode];
      if (!s) return '—';
      if (selectedIndicator === 'carbonIntensity') {
        return s.carbonIntensity != null ? `${s.carbonIntensity}g` : '—';
      }
      if (selectedIndicator === 'fossilOnlyCarbonIntensity') {
        return s.fossilOnlyCarbonIntensity != null ? `${s.fossilOnlyCarbonIntensity}g` : '0g';
      }
      if (selectedIndicator === 'renewableShare') {
        return s.renewablePercentage != null ? `${Math.round(s.renewablePercentage)}%` : '—';
      }
      if (selectedIndicator === 'carbonFreeShare') {
        return s.fossilFreePercentage != null ? `${Math.round(s.fossilFreePercentage)}%` : '—';
      }
      if (selectedIndicator === 'totalLoad') {
        return s.totalConsumption != null ? `${(s.totalConsumption / 1000).toFixed(1)}GW` : '—';
      }
      if (selectedIndicator === 'netLoad') {
        return s.netLoad != null ? `${(s.netLoad / 1000).toFixed(1)}GW` : '—';
      }
      if (selectedIndicator === 'primarySource') {
        return (getPrimarySource(s)?.label || '—').slice(0, 4);
      }
      return '';
    },
    [snapshots, selectedIndicator, getPrimarySource],
  );

  // Chargement asynchrone du GeoJSON européen
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingGeo(true);
    setLoadError(null);

    fetch('/data/europe.geojson')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Échec du chargement du fichier GeoJSON (Code ${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (!isCancelled) {
          setGeojsonData(data);
          setIsLoadingGeo(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('[EUEnergyMap] Erreur de chargement GeoJSON:', err);
          setLoadError(err.message || 'Impossible de charger la carte');
          setIsLoadingGeo(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Initialisation de la carte Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Nettoyer toute instance existante et réinitialiser l'ID Leaflet du conteneur DOM
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (e) {
        // Ignorer si déjà détruit
      }
      mapInstanceRef.current = null;
    }
    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    // Emprise de l'Europe géographique : lat 34 à 71, lon -15 à 35
    const europeBounds = L.latLngBounds(
      L.latLng(33.5, -12.0),
      L.latLng(71.5, 36.0),
    );

    const map = L.map(mapContainerRef.current, {
      center: [52.5, 13.0],
      zoom: 4,
      minZoom: 3,
      maxZoom: 8,
      maxBounds: L.latLngBounds(L.latLng(25.0, -30.0), L.latLng(75.0, 55.0)),
      maxBoundsViscosity: 0.8,
      zoomControl: false,
      attributionControl: false,
    });

    // Ajuster l'affichage pour cadrer l'Europe
    map.fitBounds(europeBounds, { padding: [16, 16] });

    // Ajout des contrôles de zoom en haut à gauche
    L.control.zoom({ position: 'topleft' }).addTo(map);

    // Attribution discrète en bas à droite
    L.control
      .attribution({
        position: 'bottomright',
        prefix: false,
      })
      .addAttribution('© OpenStreetMap, CartoDB, Electricity Maps')
      .addTo(map);

    mapInstanceRef.current = map;

    return () => {
      try {
        map.remove();
      } catch (e) {
        // Ignorer si déjà démonté
      }
      mapInstanceRef.current = null;
      if (mapContainerRef.current && (mapContainerRef.current as any)._leaflet_id) {
        delete (mapContainerRef.current as any)._leaflet_id;
      }
    };
  }, []);

  // Gestion du fond de carte (TileLayer)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    if (selectedTileTheme === 'none') {
      return;
    }

    let tileUrl = '/api/carto/tiles/light_all/{z}/{x}/{y}.png';
    let maxZoom = 19;

    if (selectedTileTheme === 'dark') {
      tileUrl = '/api/carto/tiles/dark_all/{z}/{x}/{y}.png';
    } else if (selectedTileTheme === 'osm') {
      tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }

    const tileLayer = L.tileLayer(tileUrl, {
      subdomains: 'abc',
      maxZoom,
      opacity: 0.9,
    });

    // En cas d'erreur de chargement sur CARTO, repli automatique immédiat sur OpenStreetMap
    tileLayer.on('tileerror', (errorEvent: any) => {
      if (errorEvent?.tile && !errorEvent.tile.dataset?.fallbackTried) {
        errorEvent.tile.dataset = errorEvent.tile.dataset || {};
        errorEvent.tile.dataset.fallbackTried = 'true';
        const coords = errorEvent.coords;
        if (coords) {
          errorEvent.tile.src = `https://tile.openstreetmap.org/${coords.z}/${coords.x}/${coords.y}.png`;
        }
      }
    });

    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;
  }, [selectedTileTheme]);

  // Redimensionnement de la carte lorsque le conteneur change de taille
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [isExpanded]);

  // Rendu et mise à jour de la couche GeoJSON et des étiquettes pays
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !geojsonData) return;

    // Nettoyage de la couche GeoJSON précédente
    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current);
      geojsonLayerRef.current = null;
    }

    // Nettoyage de la couche des marqueurs
    if (markersLayerRef.current) {
      map.removeLayer(markersLayerRef.current);
      markersLayerRef.current = null;
    }

    const markersGroup = L.layerGroup();

    // Style de base pour chaque pays
    const styleFeature = (feature: any) => {
      const iso2 = feature?.properties?.ISO2;
      const isEU = euCountriesMap.has(iso2);

      if (!isEU) {
        // Pays hors UE (Royaume-Uni, Norvège, Suisse, etc.) pour réalisme cartographique
        return {
          fillColor: selectedTileTheme === 'dark' ? '#1e293b' : '#f1f5f9',
          fillOpacity: 0.45,
          color: selectedTileTheme === 'dark' ? '#334155' : '#cbd5e1',
          weight: 0.8,
          dashArray: '2, 3',
        };
      }

      const fillColor = getCountryFill(iso2);

      return {
        fillColor,
        fillOpacity: 0.85,
        color: '#ffffff',
        weight: 1.2,
      };
    };

    // Construction de la couche GeoJSON avec interactivité
    const geoLayer = L.geoJSON(geojsonData, {
      style: styleFeature,
      onEachFeature: (feature, layer) => {
        const iso2 = feature?.properties?.ISO2;
        const euConfig = euCountriesMap.get(iso2);

        if (!euConfig) {
          // Pays hors UE : infobulle contextuelle simple
          const name = feature?.properties?.NAME || iso2;
          layer.bindTooltip(
            `<div class="text-xs font-medium text-slate-700 dark:text-slate-200">
               <span>${name}</span>
               <span class="block text-[10px] text-slate-400">Pays tiers (hors UE 27)</span>
             </div>`,
            { sticky: true, opacity: 0.95, className: 'leaflet-custom-tooltip' },
          );
          return;
        }

        const snapshot = snapshots[iso2];
        const primarySource = getPrimarySource(snapshot);

        // Tooltip riche et réaliste au survol
        const tooltipHtml = `
          <div class="p-2.5 max-w-[240px] text-xs font-sans">
            <div class="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-slate-200 dark:border-slate-700">
              <span class="font-bold text-sm flex items-center gap-1.5 text-slate-900 dark:text-white">
                <span>${euConfig.flag}</span>
                <span>${euConfig.nameFr}</span>
              </span>
              <span class="text-[10px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 px-1.5 py-0.5 rounded">
                ${euConfig.code}
              </span>
            </div>

            <div class="space-y-1 text-slate-700 dark:text-slate-300">
              <div class="flex justify-between items-center">
                <span class="text-slate-500 dark:text-slate-400">Intensité carbone :</span>
                <span class="font-bold ${
                  snapshot?.carbonIntensity != null && (snapshot.carbonIntensity) <= 100
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }">
                  ${snapshot?.carbonIntensity != null ? `${snapshot.carbonIntensity} gCO₂/kWh` : 'Non disponible'}
                </span>
              </div>

              <div class="flex justify-between items-center">
                <span class="text-slate-500 dark:text-slate-400">Renouvelable :</span>
                <span class="font-semibold text-emerald-600 dark:text-emerald-400">
                  ${snapshot?.renewablePercentage != null ? `${Math.round(snapshot.renewablePercentage)}%` : '—'}
                </span>
              </div>

              <div class="flex justify-between items-center">
                <span class="text-slate-500 dark:text-slate-400">Sans fossile :</span>
                <span class="font-semibold text-indigo-600 dark:text-indigo-400">
                  ${snapshot?.fossilFreePercentage != null ? `${Math.round(snapshot.fossilFreePercentage)}%` : '—'}
                </span>
              </div>

              <div class="flex justify-between items-center">
                <span class="text-slate-500 dark:text-slate-400">Consommation :</span>
                <span class="font-semibold text-sky-600 dark:text-sky-400">
                  ${snapshot?.totalConsumption != null ? `${((snapshot.totalConsumption) / 1000).toFixed(1)} GW` : '—'}
                </span>
              </div>

              <div class="flex justify-between items-center">
                <span class="text-slate-500 dark:text-slate-400">Source dominante :</span>
                <span class="font-semibold text-amber-600 dark:text-amber-400">
                  ${primarySource.label}
                </span>
              </div>
            </div>

            <div class="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-sky-600 dark:text-sky-400 font-semibold text-center">
              👉 Cliquer pour ouvrir la fiche détaillée
            </div>
          </div>
        `;

        layer.bindTooltip(tooltipHtml, {
          sticky: true,
          direction: 'auto',
          opacity: 0.98,
          className: 'leaflet-custom-tooltip shadow-xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md',
        });

        // Événements souris
        layer.on({
          mouseover: (e) => {
            const l = e.target;
            l.setStyle({
              weight: 3,
              color: '#0284c7',
              fillOpacity: 0.98,
            });
            l.bringToFront();
          },
          mouseout: (e) => {
            geoLayer.resetStyle(e.target);
          },
          click: () => {
            onSelectCountry(iso2);
          },
        });

        // Marqueur étiquette textuelle au centre géographique du pays
        if (showLabels && feature.properties?.LAT && feature.properties?.LON) {
          const lat = feature.properties.LAT;
          const lon = feature.properties.LON;
          const valueText = getShortValueText(iso2);

          const labelHtml = `
            <div class="country-map-badge group cursor-pointer transition-transform duration-150 hover:scale-110">
              <div class="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/90 dark:bg-slate-900/90 shadow-md border border-slate-200 dark:border-slate-700 backdrop-blur-xs select-none pointer-events-none">
                <span class="text-xs leading-none">${euConfig.flag}</span>
                <span class="font-bold text-[10px] text-slate-800 dark:text-slate-100">${iso2}</span>
                <span class="font-medium text-[9px] text-sky-600 dark:text-sky-400 ml-0.5 border-l border-slate-200 dark:border-slate-700 pl-1">
                  ${valueText}
                </span>
              </div>
            </div>
          `;

          const markerIcon = L.divIcon({
            className: 'custom-leaflet-div-icon',
            html: labelHtml,
            iconSize: [60, 20],
            iconAnchor: [30, 10],
          });

          const marker = L.marker([lat, lon], {
            icon: markerIcon,
            interactive: false,
          });

          markersGroup.addLayer(marker);
        }
      },
    });

    geoLayer.addTo(map);
    geojsonLayerRef.current = geoLayer;

    if (showLabels) {
      markersGroup.addTo(map);
      markersLayerRef.current = markersGroup;
    }
  }, [
    geojsonData,
    snapshots,
    selectedIndicator,
    selectedTileTheme,
    showLabels,
    euCountriesMap,
    getCountryFill,
    getShortValueText,
    getPrimarySource,
    onSelectCountry,
  ]);

  // Recadrer l'Europe
  const handleResetBounds = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const europeBounds = L.latLngBounds(
      L.latLng(34.0, -11.0),
      L.latLng(71.0, 35.0),
    );
    map.flyToBounds(europeBounds, { duration: 0.8, padding: [20, 20] });
  };

  // Zoomer directement sur un pays via le sélecteur
  const handleZoomToCountry = (code: string) => {
    const map = mapInstanceRef.current;
    if (!map || !geojsonData || !Array.isArray(geojsonData.features)) return;

    const feature = geojsonData.features.find((f: any) => f?.properties?.ISO2 === code);
    if (feature && feature.properties?.LAT && feature.properties?.LON) {
      map.flyTo([feature.properties.LAT, feature.properties.LON], 5.5, {
        duration: 0.8,
      });
      onSelectCountry(code);
    }
  };

  const filteredCountries = EU_COUNTRIES.filter(
    (c) =>
      c.nameFr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div
      className={`bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs transition-all duration-300 ${
        isExpanded ? 'p-4 sm:p-6' : 'p-4 sm:p-6'
      }`}
    >
      {/* Barre d'outils supérieure */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/60">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Carte Réaliste de l'Union Européenne</span>
              <span className="text-xs font-semibold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-full">
                27 Pays UE
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cartographie géographique interactive des réseaux électriques. Survolez ou cliquez sur un pays.
          </p>
        </div>

        {/* Contrôles et sélecteurs */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Sélecteur d'indicateur énergétique */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="map-indicator-select" className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Indicateur :
            </label>
            <select
              id="map-indicator-select"
              value={selectedIndicator}
              onChange={(e) => onSelectIndicator(e.target.value as IndicatorMode)}
              className="text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer shadow-2xs"
            >
              <option value="carbonIntensity">Intensité carbone (gCO₂eq/kWh)</option>
              <option value="fossilOnlyCarbonIntensity">Intensité fossile seule (gCO₂eq/kWh)</option>
              <option value="renewableShare">Part renouvelable (%)</option>
              <option value="carbonFreeShare">Part sans fossile (%)</option>
              <option value="totalLoad">Consommation électrique (GW)</option>
              <option value="netLoad">Charge nette résiduelle (GW)</option>
              <option value="primarySource">Source principale de production</option>
            </select>
          </div>

          {/* Sélecteur de style de fond cartographique */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700/80 text-xs">
            <button
              onClick={() => setSelectedTileTheme('positron')}
              className={`px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                selectedTileTheme === 'positron'
                  ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Fond clair détaillé (CartoDB Positron)"
            >
              Clair
            </button>
            <button
              onClick={() => setSelectedTileTheme('dark')}
              className={`px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                selectedTileTheme === 'dark'
                  ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Fond sombre moderne (CartoDB Dark)"
            >
              Sombre
            </button>
            <button
              onClick={() => setSelectedTileTheme('none')}
              className={`px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                selectedTileTheme === 'none'
                  ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Rendu vectoriel pur (sans tuiles externes)"
            >
              Épuré
            </button>
          </div>

          {/* Bascule afficher / masquer les étiquettes */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              showLabels
                ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300'
                : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-700'
            }`}
            title={showLabels ? 'Masquer les pastilles pays' : 'Afficher les pastilles pays'}
          >
            {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Bouton recentrer sur l'Europe */}
          <button
            onClick={handleResetBounds}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Recentrer la carte sur l'ensemble de l'UE"
          >
            <RotateCcw className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span className="hidden sm:inline">Recentrer</span>
          </button>

          {/* Bouton agrandir / réduire */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            title={isExpanded ? 'Réduire la hauteur' : 'Agrandir la carte'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Surface de la carte Leaflet */}
      <div className="relative mt-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 shadow-inner">
        {/* Conteneur DOM Leaflet */}
        <div
          ref={mapContainerRef}
          style={{ height: isExpanded ? '680px' : '520px' }}
          className="w-full relative z-0"
        />

        {/* Écran de chargement du GeoJSON */}
        {isLoadingGeo && (
          <div className="absolute inset-0 z-20 bg-slate-900/40 backdrop-blur-xs flex flex-col items-center justify-center text-white">
            <div className="w-8 h-8 border-3 border-sky-400 border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-xs font-semibold">Chargement des frontières géographiques de l'Europe...</span>
          </div>
        )}

        {/* Message d'erreur de chargement */}
        {loadError && (
          <div className="absolute top-4 left-4 right-4 z-20 p-3 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between">
            <span>{loadError}</span>
            <button
              onClick={() => window.location.reload()}
              className="px-2 py-1 rounded bg-rose-600 text-white font-medium hover:bg-rose-700"
            >
              Recharger
            </button>
          </div>
        )}

        {/* Barre de recherche rapide de pays en overlay sur la carte (en haut à droite) */}
        <div className="absolute top-3 right-3 z-10 hidden sm:block max-w-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Aller à un pays (ex: France, DE)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 focus:w-60 transition-all text-xs pl-8 pr-2.5 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white shadow-md focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
            {searchQuery && (
              <div className="absolute top-full right-0 mt-1 w-60 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1">
                {filteredCountries.slice(0, 6).map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      handleZoomToCountry(c.code);
                      setSearchQuery('');
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">{c.flag}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{c.nameFr}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{c.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mini bandeau d'instructions en bas à gauche de la carte */}
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-sm text-[11px] text-slate-600 dark:text-slate-300">
          <Info className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>Zoom molette / Déplacement au glisser • Clic pays = fiche détaillée</span>
        </div>
      </div>

      {/* Légende didactique sous la carte */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700 dark:text-slate-300">
            Légende :
          </span>

          {selectedIndicator === 'carbonIntensity' && (
            <div className="flex items-center gap-2.5 flex-wrap text-[11px] text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded-xs bg-[#10b981] inline-block shadow-2xs" />
                <span>&lt; 50g (Très bas)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded-xs bg-[#34d399] inline-block shadow-2xs" />
                <span>50 - 100g</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded-xs bg-[#fbbf24] inline-block shadow-2xs" />
                <span>100 - 200g</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded-xs bg-[#f97316] inline-block shadow-2xs" />
                <span>200 - 350g</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded-xs bg-[#ef4444] inline-block shadow-2xs" />
                <span>350 - 500g</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded-xs bg-[#991b1b] inline-block shadow-2xs" />
                <span>&gt; 500g (Élevé)</span>
              </span>
            </div>
          )}

          {selectedIndicator === 'renewableShare' && (
            <div className="flex items-center gap-2.5 flex-wrap text-[11px] text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded-xs bg-[#047857] inline-block shadow-2xs" />
                <span>&gt; 80%</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded-xs bg-[#10b981] inline-block shadow-2xs" />
                <span>60 - 80%</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded-xs bg-[#34d399] inline-block shadow-2xs" />
                <span>40 - 60%</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded-xs bg-[#a7f3d0] inline-block shadow-2xs" />
                <span>20 - 40%</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded-xs bg-[#e2e8f0] border border-slate-300 inline-block shadow-2xs" />
                <span>&lt; 20%</span>
              </span>
            </div>
          )}

          {selectedIndicator === 'carbonFreeShare' && (
            <div className="flex items-center gap-2.5 flex-wrap text-[11px] text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded-xs bg-[#4338ca] inline-block shadow-2xs" />
                <span>&gt; 85%</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded-xs bg-[#6366f1] inline-block shadow-2xs" />
                <span>70 - 85%</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded-xs bg-[#818cf8] inline-block shadow-2xs" />
                <span>50 - 70%</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded-xs bg-[#c7d2fe] inline-block shadow-2xs" />
                <span>30 - 50%</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded-xs bg-[#e2e8f0] inline-block shadow-2xs" />
                <span>&lt; 30%</span>
              </span>
            </div>
          )}

          {selectedIndicator === 'totalLoad' && (
            <div className="flex items-center gap-2.5 flex-wrap text-[11px] text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded-xs bg-[#0369a1] inline-block shadow-2xs" />
                <span>&gt; 45 GW</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded-xs bg-[#0ea5e9] inline-block shadow-2xs" />
                <span>25 - 45 GW</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded-xs bg-[#38bdf8] inline-block shadow-2xs" />
                <span>10 - 25 GW</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded-xs bg-[#7dd3fc] inline-block shadow-2xs" />
                <span>3 - 10 GW</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded-xs bg-[#bae6fd] inline-block shadow-2xs" />
                <span>&lt; 3 GW</span>
              </span>
            </div>
          )}

          {selectedIndicator === 'primarySource' && (
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-[#818cf8] inline-block" /> Nucléaire
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-[#38bdf8] inline-block" /> Hydro
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-[#34d399] inline-block" /> Éolien
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-[#fbbf24] inline-block" /> Solaire
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-[#fb923c] inline-block" /> Gaz
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-[#52525b] inline-block" /> Charbon
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span>Projection géographique réelle WGS84</span>
          <span>•</span>
          <span>Bordures officielles UE</span>
        </div>
      </div>
    </div>
  );
};
