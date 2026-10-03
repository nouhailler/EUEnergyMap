import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CrossBorderFlow, CountryElectricitySnapshot } from '../../types/energy';
import { ALL_GRID_NODES, getGridNode } from '../../data/gridTopology';
import { EU_COUNTRIES } from '../../data/euCountries';
import { RotateCcw, Zap, Filter, Eye, Layers } from 'lucide-react';

interface FlowsMapProps {
  flows: CrossBorderFlow[];
  snapshots: Record<string, CountryElectricitySnapshot>;
  selectedCountry: string;
  onSelectCountry: (countryCode: string) => void;
  isAnimated: boolean;
  minFlowMW: number;
}

export const FlowsMap: React.FC<FlowsMapProps> = ({
  flows,
  snapshots,
  selectedCountry,
  onSelectCountry,
  isAnimated,
  minFlowMW,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const flowLayersRef = useRef<L.LayerGroup | null>(null);
  const nodeMarkersRef = useRef<L.LayerGroup | null>(null);
  const [selectedFlowDetail, setSelectedFlowDetail] = useState<CrossBorderFlow | null>(null);

  // Filtrage des flux selon le pays sélectionné et le seuil minimum
  const displayedFlows = useMemo(() => {
    return flows.filter((f) => {
      if (f.flowMW < minFlowMW) return false;
      if (selectedCountry === 'ALL') return true;
      return f.fromZone === selectedCountry || f.toZone === selectedCountry;
    });
  }, [flows, selectedCountry, minFlowMW]);

  // Initialisation de la carte Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

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

    // Emprise géographique de l'Europe
    const europeBounds = L.latLngBounds(
      L.latLng(34.0, -12.0),
      L.latLng(67.0, 32.0),
    );

    const map = L.map(mapContainerRef.current, {
      center: [50.5, 12.0],
      zoom: 4,
      minZoom: 3,
      maxZoom: 7,
      maxBounds: L.latLngBounds(L.latLng(28.0, -25.0), L.latLng(72.0, 45.0)),
      maxBoundsViscosity: 0.85,
      zoomControl: false,
      attributionControl: false,
    });

    map.fitBounds(europeBounds, { padding: [20, 20] });
    L.control.zoom({ position: 'topleft' }).addTo(map);

    // Fond de carte sombre et moderne CARTO Dark All (via proxy sécurisé avec fallback automatique OpenStreetMap)
    const tileLayer = L.tileLayer('/api/carto/tiles/dark_all/{z}/{x}/{y}.png', {
      subdomains: 'abc',
      maxZoom: 18,
      opacity: 0.95,
    });
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

    // Groupes de couches pour les flux et les nœuds
    const flowGroup = L.layerGroup().addTo(map);
    const nodeGroup = L.layerGroup().addTo(map);

    flowLayersRef.current = flowGroup;
    nodeMarkersRef.current = nodeGroup;
    mapInstanceRef.current = map;

    return () => {
      try {
        map.remove();
      } catch (e) {
        // Ignorer
      }
      mapInstanceRef.current = null;
    };
  }, []);

  // Recadrage lorsque la sélection de pays change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selectedCountry !== 'ALL') {
      const node = getGridNode(selectedCountry);
      if (node && node.lat && node.lng) {
        map.flyTo([node.lat, node.lng], 5.2, { duration: 1.2 });
      }
    } else {
      const europeBounds = L.latLngBounds(
        L.latLng(35.0, -10.0),
        L.latLng(65.0, 30.0),
      );
      map.flyToBounds(europeBounds, { duration: 1.2, padding: [20, 20] });
    }
  }, [selectedCountry]);

  // Tracé des lignes de flux et badges volumétriques
  useEffect(() => {
    const map = mapInstanceRef.current;
    const flowGroup = flowLayersRef.current;
    const nodeGroup = nodeMarkersRef.current;
    if (!map || !flowGroup || !nodeGroup) return;

    flowGroup.clearLayers();
    nodeGroup.clearLayers();

    // 1. Ensemble des nœuds uniques participant aux flux affichés
    const activeNodes = new Set<string>();
    for (const f of displayedFlows) {
      activeNodes.add(f.fromZone);
      activeNodes.add(f.toZone);
    }
    if (selectedCountry !== 'ALL') {
      activeNodes.add(selectedCountry);
    }

    // 2. Tracé de chaque flux sous forme de vecteur courbe orienté
    displayedFlows.forEach((flow, idx) => {
      const fromNode = getGridNode(flow.fromZone);
      const toNode = getGridNode(flow.toZone);

      if (!fromNode || !toNode) return;

      const p1: [number, number] = [fromNode.lat, fromNode.lng];
      const p2: [number, number] = [toNode.lat, toNode.lng];

      // Calcul d'un point médian courbé pour éviter la superposition des flux bidirectionnels
      const midLat = (p1[0] + p2[0]) / 2;
      const midLng = (p1[1] + p2[1]) / 2;

      // Décalage perpendiculaire proportionnel à la distance
      const dLat = p2[0] - p1[0];
      const dLng = p2[1] - p1[1];
      const norm = Math.sqrt(dLat * dLat + dLng * dLng) || 1;

      // Courbure douce (offset de 0.8 degré)
      const curveFactor = 0.55;
      const ctrlLat = midLat - (dLng / norm) * curveFactor;
      const ctrlLng = midLng + (dLat / norm) * curveFactor;

      // Échantillonnage de la courbe de Bézier quadratique (12 segments pour un rendu ultra fluide)
      const curvePoints: [number, number][] = [];
      const steps = 12;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const lat = (1 - t) * (1 - t) * p1[0] + 2 * (1 - t) * t * ctrlLat + t * t * p2[0];
        const lng = (1 - t) * (1 - t) * p1[1] + 2 * (1 - t) * t * ctrlLng + t * t * p2[1];
        curvePoints.push([lat, lng]);
      }

      // Épaisseur proportionnelle au volume en MW
      const weight = Math.min(7.5, Math.max(2, (flow.flowMW / 3000) * 7.5));
      const volumeGW = (flow.flowMW / 1000).toFixed(2);

      // Couleurs : cyan électrique pour les exports normaux, vert émeraude pour gros flux
      const isMajor = flow.flowMW >= 1500;
      const lineColor = isMajor ? '#38bdf8' : '#0ea5e9';

      // Ligne de lueur (halo lumineux)
      const glowPolyline = L.polyline(curvePoints, {
        color: lineColor,
        weight: weight + 4,
        opacity: 0.25,
        interactive: false,
      });
      flowGroup.addLayer(glowPolyline);

      // Ligne principale animée
      const animClass = isAnimated ? 'animated-flow-line' : '';
      const mainPolyline = L.polyline(curvePoints, {
        color: lineColor,
        weight,
        opacity: 0.9,
        className: animClass,
      });

      // Infobulle détaillée au survol
      const tooltipContent = `
        <div class="p-2 text-xs font-sans text-slate-800 dark:text-slate-100 min-w-[200px]">
          <div class="flex items-center justify-between font-bold border-b border-slate-200 dark:border-slate-700 pb-1 mb-1.5">
            <span>Interconnexion THT</span>
            <span class="text-sky-600 font-mono">${volumeGW} GW</span>
          </div>
          <div class="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span>Origine (Export) :</span>
            <span class="font-semibold">${fromNode.flag} ${fromNode.nameFr}</span>
          </div>
          <div class="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span>Destination (Import) :</span>
            <span class="font-semibold">${toNode.flag} ${toNode.nameFr}</span>
          </div>
          <div class="flex items-center justify-between text-slate-600 dark:text-slate-300 mt-1 pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px]">
            <span>Puissance instantanée :</span>
            <span class="font-mono font-bold">${flow.flowMW.toLocaleString('fr-FR')} MW</span>
          </div>
        </div>
      `;
      mainPolyline.bindTooltip(tooltipContent, {
        sticky: true,
        className: 'leaflet-custom-tooltip shadow-xl rounded-xl border border-slate-700 bg-slate-900/95 text-white',
      });

      mainPolyline.on('click', () => {
        setSelectedFlowDetail(flow);
      });

      flowGroup.addLayer(mainPolyline);

      // Badge volumétrique au milieu de la courbe
      const midPoint = curvePoints[Math.floor(curvePoints.length / 2)];
      const badgeHtml = `
        <div class="flow-pill-badge cursor-pointer select-none transition-transform hover:scale-110">
          <div class="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-900/90 text-sky-400 border border-sky-500/50 shadow-md backdrop-blur-xs font-mono text-[10px] font-bold">
            <span>${volumeGW} GW</span>
            <span class="text-[9px] text-sky-300">→</span>
          </div>
        </div>
      `;

      const badgeIcon = L.divIcon({
        className: 'custom-flow-badge-icon',
        html: badgeHtml,
        iconSize: [60, 20],
        iconAnchor: [30, 10],
      });

      const badgeMarker = L.marker(midPoint, {
        icon: badgeIcon,
        interactive: true,
      });

      badgeMarker.on('click', () => {
        setSelectedFlowDetail(flow);
      });

      flowGroup.addLayer(badgeMarker);
    });

    // 3. Nœuds des pays sur la carte
    activeNodes.forEach((code) => {
      const node = getGridNode(code);
      if (!node || !node.lat || !node.lng) return;

      const snapshot = snapshots[code];
      const net = snapshot?.netExport ?? null;
      const isExporter = (net ?? 0) >= 0;
      const isSelected = selectedCountry === code;

      const nodeHtml = `
        <div class="country-node-hub cursor-pointer transition-all duration-200 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110'}">
          <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 border-2 ${
            isSelected
              ? 'border-sky-400 ring-4 ring-sky-500/30'
              : isExporter
              ? 'border-emerald-500/80 hover:border-emerald-400'
              : 'border-amber-500/80 hover:border-amber-400'
          } shadow-lg text-sm select-none">
            <span>${node.flag}</span>
            ${
              net !== null
                ? `<div class="absolute -bottom-2 -right-1 px-1 py-0.2 rounded-xs text-[8px] font-bold font-mono ${
                    isExporter ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-amber-950 text-amber-300 border border-amber-700'
                  }">
                    ${isExporter ? '+' : ''}${(net / 1000).toFixed(1)}
                  </div>`
                : ''
            }
          </div>
        </div>
      `;

      const nodeIcon = L.divIcon({
        className: 'custom-node-icon',
        html: nodeHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([node.lat, node.lng], {
        icon: nodeIcon,
        interactive: true,
        zIndexOffset: isSelected ? 1000 : 100,
      });

      marker.bindTooltip(
        `<div class="p-1 text-xs font-sans font-semibold">
           <div>${node.flag} ${node.nameFr} (${code})</div>
           ${net !== null ? `<div class="text-[10px] text-slate-300 mt-0.5">Solde : <strong>${isExporter ? '+' : ''}${(net / 1000).toFixed(2)} GW</strong></div>` : ''}
           <div class="text-[9px] text-sky-400 mt-1">Cliquer pour centrer les flux</div>
         </div>`,
        { className: 'leaflet-custom-tooltip shadow-md rounded-lg bg-slate-900 border border-slate-700 text-white' }
      );

      marker.on('click', () => {
        onSelectCountry(code);
      });

      nodeGroup.addLayer(marker);
    });
  }, [displayedFlows, snapshots, selectedCountry, isAnimated, onSelectCountry]);

  const resetView = () => {
    onSelectCountry('ALL');
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 shadow-lg bg-slate-950">
      {/* Conteneur DOM Leaflet */}
      <div
        ref={mapContainerRef}
        className="w-full h-[520px] sm:h-[580px] bg-slate-950 focus:outline-none"
      />

      {/* Style CSS injecté pour les flux animés Leaflet */}
      <style>{`
        @keyframes leafletFlowPulse {
          to {
            stroke-dashoffset: -40;
          }
        }
        .animated-flow-line {
          stroke-dasharray: 8 12;
          animation: leafletFlowPulse 1.5s linear infinite;
        }
      `}</style>

      {/* Barre de contrôle flottante en haut à droite */}
      <div className="absolute top-4 right-4 z-400 flex items-center gap-2">
        {selectedCountry !== 'ALL' && (
          <button
            onClick={resetView}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-xs font-semibold text-white border border-slate-700 shadow-md backdrop-blur-md transition cursor-pointer"
            title="Réinitialiser l'emprise européenne"
          >
            <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
            <span>Vue Europe ({displayedFlows.length} flux)</span>
          </button>
        )}

        <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 text-xs font-medium text-slate-200 border border-slate-700 shadow-md backdrop-blur-md flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>{displayedFlows.length} liaisons actives</span>
        </div>
      </div>

      {/* Légende interactive au bas de la carte */}
      <div className="absolute bottom-4 left-4 z-400 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-white shadow-lg backdrop-blur-md max-w-sm hidden sm:block text-xs space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-sky-400">
          <Zap className="w-4 h-4 text-sky-400" />
          <span>Réseau Synchrone ENTSO-E</span>
        </div>
        <div className="text-[11px] text-slate-300">
          Lignes THT avec électrons animés indiquant le sens physique du courant. Épaisseur proportionnelle au volume en MW.
        </div>
        <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Exportateur net
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Importateur net
          </span>
        </div>
      </div>

      {/* Modale d'inspection de flux sélectionné */}
      {selectedFlowDetail && (
        <div className="absolute inset-x-4 bottom-4 z-500 max-w-md mx-auto p-4 rounded-2xl bg-slate-900/95 border border-sky-500/50 shadow-2xl backdrop-blur-xl text-white">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wide">
              Liaison Interconnectée
            </span>
            <button
              onClick={() => setSelectedFlowDetail(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center justify-between mt-3 py-2 px-3 rounded-xl bg-slate-800/80 border border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-xl">{getGridNode(selectedFlowDetail.fromZone).flag}</span>
              <div>
                <div className="text-xs font-bold">{getGridNode(selectedFlowDetail.fromZone).nameFr}</div>
                <div className="text-[10px] text-slate-400">Expéditeur (Export)</div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-sm font-black text-sky-400">
                {(selectedFlowDetail.flowMW / 1000).toFixed(2)} GW
              </span>
              <span className="text-[10px] text-slate-400">
                ({selectedFlowDetail.flowMW.toLocaleString('fr-FR')} MW)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div>
                <div className="text-xs font-bold text-right">{getGridNode(selectedFlowDetail.toZone).nameFr}</div>
                <div className="text-[10px] text-slate-400 text-right">Destinataire (Import)</div>
              </div>
              <span className="text-xl">{getGridNode(selectedFlowDetail.toZone).flag}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 text-xs">
            <button
              onClick={() => {
                onSelectCountry(selectedFlowDetail.fromZone);
                setSelectedFlowDetail(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer font-medium"
            >
              Voir {getGridNode(selectedFlowDetail.fromZone).nameFr}
            </button>
            <button
              onClick={() => {
                onSelectCountry(selectedFlowDetail.toZone);
                setSelectedFlowDetail(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold transition cursor-pointer"
            >
              Voir {getGridNode(selectedFlowDetail.toZone).nameFr}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
