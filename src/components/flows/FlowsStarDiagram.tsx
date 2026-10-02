import React, { useMemo } from 'react';
import { ArrowRight, ArrowLeft, Zap, ExternalLink, Activity } from 'lucide-react';
import { CrossBorderFlow, CountryElectricitySnapshot } from '../../types/energy';
import { ALL_GRID_NODES, getGridNode } from '../../data/gridTopology';
import { EU_COUNTRIES } from '../../data/euCountries';

interface FlowsStarDiagramProps {
  selectedCountry: string;
  onSelectCountry: (countryCode: string) => void;
  snapshots: Record<string, CountryElectricitySnapshot>;
  isAnimated: boolean;
}

export const FlowsStarDiagram: React.FC<FlowsStarDiagramProps> = ({
  selectedCountry,
  onSelectCountry,
  snapshots,
  isAnimated,
}) => {
  const centerNode = getGridNode(selectedCountry);
  const centerSnapshot = snapshots[selectedCountry];

  // Extraction de tous les flux entrants et sortants pour ce pays
  const { outboundFlows, inboundFlows, connectedNeighbors } = useMemo(() => {
    const outbound: CrossBorderFlow[] = [];
    const inbound: CrossBorderFlow[] = [];
    const neighborMap = new Map<string, { outMW: number; inMW: number }>();

    for (const snap of Object.values(snapshots || {})) {
      if (!snap || !Array.isArray(snap.exchangeFlows)) continue;
      for (const flow of snap.exchangeFlows) {
        if (!flow || !flow.flowMW) continue;

        if (flow.fromZone === selectedCountry) {
          outbound.push(flow);
          const current = neighborMap.get(flow.toZone) || { outMW: 0, inMW: 0 };
          current.outMW += flow.flowMW;
          neighborMap.set(flow.toZone, current);
        } else if (flow.toZone === selectedCountry) {
          inbound.push(flow);
          const current = neighborMap.get(flow.fromZone) || { outMW: 0, inMW: 0 };
          current.inMW += flow.flowMW;
          neighborMap.set(flow.fromZone, current);
        }
      }
    }

    // Récupérer la liste des pays voisins connectés
    const neighborsList = Array.from(neighborMap.entries()).map(([code, flows]) => {
      const node = getGridNode(code);
      const net = flows.outMW - flows.inMW; // Positif si le centre exporte vers le voisin
      return {
        code,
        node,
        outMW: flows.outMW,
        inMW: flows.inMW,
        netMW: net,
      };
    });

    // Trier les voisins par volume total d'échanges
    neighborsList.sort((a, b) => (b.outMW + b.inMW) - (a.outMW + a.inMW));

    return {
      outboundFlows: outbound,
      inboundFlows: inbound,
      connectedNeighbors: neighborsList,
    };
  }, [selectedCountry, snapshots]);

  const totalExportMW = outboundFlows.reduce((acc, f) => acc + f.flowMW, 0);
  const totalImportMW = inboundFlows.reduce((acc, f) => acc + f.flowMW, 0);
  const netBalanceMW = totalExportMW - totalImportMW;

  // Configuration du cercle en étoile
  const width = 800;
  const height = 560;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 220;

  // Calcul des coordonnées polaires des voisins
  const positionedNeighbors = useMemo(() => {
    const total = connectedNeighbors.length;
    if (total === 0) return [];

    return connectedNeighbors.map((item, index) => {
      // Débuter au sommet (-PI/2) et répartir uniformément
      const angle = (index * (2 * Math.PI) / total) - (Math.PI / 2);
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return {
        ...item,
        x,
        y,
        angle,
      };
    });
  }, [connectedNeighbors, centerX, centerY, radius]);

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-700/80 shadow-lg p-5 overflow-hidden text-white relative">
      {/* En-tête du diagramme */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{centerNode.flag}</span>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Carrefour Électrique : {centerNode.nameFr} ({centerNode.code})</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {connectedNeighbors.length} {connectedNeighbors.length > 1 ? 'interconnexions' : 'interconnexion'}
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Diagramme synoptique des flux transfrontaliers instantanés et répartition des puissances sur les lignes THT.
          </p>
        </div>

        {/* Indicateurs de solde net */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-right">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Solde Net</div>
            <div className={`text-sm font-black ${netBalanceMW >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {netBalanceMW >= 0 ? '+' : ''}{(netBalanceMW / 1000).toFixed(2)} GW
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-right">
            <div className="text-[10px] text-emerald-400 uppercase font-semibold">Total Export</div>
            <div className="text-sm font-bold text-emerald-400">
              {(totalExportMW / 1000).toFixed(2)} GW
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-800/40 text-right">
            <div className="text-[10px] text-amber-400 uppercase font-semibold">Total Import</div>
            <div className="text-sm font-bold text-amber-400">
              {(totalImportMW / 1000).toFixed(2)} GW
            </div>
          </div>
        </div>
      </div>

      {/* Zone graphique SVG interactive */}
      <div className="w-full flex justify-center py-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-3xl h-auto select-none"
          style={{ minWidth: '600px' }}
        >
          <defs>
            {/* Dégradés pour les lignes */}
            <linearGradient id="exportGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="importGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
            </linearGradient>

            {/* Filtre de lueur électrique */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Marqueur de flèche export */}
            <marker
              id="arrow-export"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#06b6d4" />
            </marker>

            {/* Marqueur de flèche import */}
            <marker
              id="arrow-import"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
            </marker>

            <style>
              {`
                @keyframes pulseEnergy {
                  0% { stroke-dashoffset: 40; }
                  100% { stroke-dashoffset: 0; }
                }
                .flow-animated-line {
                  stroke-dasharray: 8 10;
                  animation: pulseEnergy 1.4s linear infinite;
                }
              `}
            </style>
          </defs>

          {/* Cercles de fond du réseau */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={radius * 0.55}
            fill="none"
            stroke="#1e293b"
            strokeWidth="1"
            strokeDasharray="2 4"
            opacity="0.6"
          />

          {/* Lignes de flux d'interconnexion */}
          {positionedNeighbors.map((neighbor) => {
            const isExporterToNeighbor = neighbor.netMW >= 0;
            const volumeMW = Math.abs(neighbor.netMW);
            const volumeGW = (volumeMW / 1000).toFixed(2);

            // Épaisseur proportionnelle au flux
            const strokeWidth = Math.min(8, Math.max(2.5, (volumeMW / 3000) * 8));

            // Calcul du point médian pour le badge de volume
            const midX = (centerX + neighbor.x) / 2;
            const midY = (centerY + neighbor.y) / 2;

            return (
              <g key={neighbor.code} className="transition-opacity duration-300">
                {/* Ligne de fond lumineuse */}
                <line
                  x1={isExporterToNeighbor ? centerX : neighbor.x}
                  y1={isExporterToNeighbor ? centerY : neighbor.y}
                  x2={isExporterToNeighbor ? neighbor.x : centerX}
                  y2={isExporterToNeighbor ? neighbor.y : centerY}
                  stroke={isExporterToNeighbor ? '#06b6d4' : '#f59e0b'}
                  strokeWidth={strokeWidth}
                  strokeOpacity="0.4"
                  filter="url(#glow)"
                />

                {/* Ligne principale avec flèche directionnelle */}
                <line
                  x1={isExporterToNeighbor ? centerX : neighbor.x}
                  y1={isExporterToNeighbor ? centerY : neighbor.y}
                  x2={isExporterToNeighbor ? neighbor.x : centerX}
                  y2={isExporterToNeighbor ? neighbor.y : centerY}
                  stroke={isExporterToNeighbor ? '#22d3ee' : '#fbbf24'}
                  strokeWidth={strokeWidth}
                  markerEnd={isExporterToNeighbor ? 'url(#arrow-export)' : 'url(#arrow-import)'}
                  className={isAnimated ? 'flow-animated-line' : ''}
                />

                {/* Badge de volume sur le trajet */}
                <g
                  transform={`translate(${midX}, ${midY})`}
                  className="cursor-pointer"
                  onClick={() => onSelectCountry(neighbor.code)}
                >
                  <rect
                    x="-42"
                    y="-13"
                    width="84"
                    height="26"
                    rx="13"
                    fill="#0f172a"
                    stroke={isExporterToNeighbor ? '#06b6d4' : '#f59e0b'}
                    strokeWidth="1.5"
                    className="shadow-md"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="bold"
                    className="font-mono select-none"
                  >
                    {isExporterToNeighbor ? '→ ' : '← '}
                    {volumeGW} GW
                  </text>
                </g>
              </g>
            );
          })}

          {/* Nœuds satellites (Pays partenaires) */}
          {positionedNeighbors.map((neighbor) => {
            const isExporterToNeighbor = neighbor.netMW >= 0;
            return (
              <g
                key={`node-${neighbor.code}`}
                transform={`translate(${neighbor.x}, ${neighbor.y})`}
                className="cursor-pointer group"
                onClick={() => onSelectCountry(neighbor.code)}
              >
                {/* Halo interactif au survol */}
                <circle
                  r="34"
                  fill="transparent"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                />

                {/* Nœud principal */}
                <circle
                  r="28"
                  fill="#1e293b"
                  stroke={isExporterToNeighbor ? '#10b981' : '#f59e0b'}
                  strokeWidth="2.5"
                  className="group-hover:scale-110 transition-transform duration-200"
                />

                {/* Drapeau & Code ISO */}
                <text x="0" y="-4" textAnchor="middle" fontSize="16">
                  {neighbor.node.flag}
                </text>
                <text
                  x="0"
                  y="14"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="bold"
                  className="font-mono"
                >
                  {neighbor.code}
                </text>

                {/* Étiquette pays sous le nœud */}
                <text
                  x="0"
                  y="42"
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10"
                  fontWeight="500"
                  className="group-hover:fill-sky-300 transition-colors"
                >
                  {neighbor.node.nameFr}
                </text>
              </g>
            );
          })}

          {/* Nœud central (Pays sélectionné) */}
          <g
            transform={`translate(${centerX}, ${centerY})`}
            className="cursor-default"
          >
            {/* Anneau pulsant */}
            <circle
              r="48"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeDasharray="6 6"
              className={isAnimated ? 'flow-animated-line' : ''}
              opacity="0.8"
            />

            {/* Cercle central */}
            <circle
              r="40"
              fill="#0f172a"
              stroke="#38bdf8"
              strokeWidth="3.5"
              filter="url(#glow)"
            />

            {/* Drapeau et Code du pays central */}
            <text x="0" y="-8" textAnchor="middle" fontSize="22">
              {centerNode.flag}
            </text>
            <text
              x="0"
              y="16"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="14"
              fontWeight="900"
              className="font-mono"
            >
              {centerNode.code}
            </text>
          </g>
        </svg>
      </div>

      {/* Guide de lecture synthétique */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 pt-3 border-t border-slate-800 text-xs">
        <div className="flex items-center gap-2.5 text-slate-300">
          <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 border border-cyan-200" />
          <span>
            <strong>Flux vert / cyan (→)</strong> : Puissance exportée depuis {centerNode.nameFr} vers le partenaire.
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-slate-300">
          <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-amber-200" />
          <span>
            <strong>Flux jaune / orange (←)</strong> : Puissance importée par {centerNode.nameFr} depuis le partenaire.
          </span>
        </div>
      </div>
    </div>
  );
};
