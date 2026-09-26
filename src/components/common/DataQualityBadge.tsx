import React from 'react';
import { DataQualityStatus } from '../../types/energy';

interface DataQualityBadgeProps {
  status: DataQualityStatus;
  isEstimated?: boolean;
  estimationMethod?: string | null;
  className?: string;
  showText?: boolean;
}

export const DataQualityBadge: React.FC<DataQualityBadgeProps> = ({
  status,
  isEstimated,
  estimationMethod,
  className = '',
  showText = true,
}) => {
  // Détermination effective
  const actualStatus: DataQualityStatus = isEstimated ? 'estimated' : status;

  let colorClass = 'bg-emerald-500';
  let badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let label = 'Mesurée';
  let title = 'Cette donnée est directement mesurée et validée par le gestionnaire de réseau.';

  if (actualStatus === 'estimated') {
    colorClass = 'bg-amber-500';
    badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
    label = 'Estimée';
    title = estimationMethod
      ? `Cette donnée est une estimation fournie par Electricity Maps (${estimationMethod}).`
      : 'Cette donnée est une estimation fournie par Electricity Maps.';
  } else if (actualStatus === 'stale') {
    colorClass = 'bg-sky-500';
    badgeBg = 'bg-sky-50 text-sky-700 border-sky-200';
    label = 'Différée';
    title = 'Dernière valeur validée en cache, en attente du prochain relevé.';
  } else if (actualStatus === 'unavailable') {
    colorClass = 'bg-slate-400';
    badgeBg = 'bg-slate-50 text-slate-600 border-slate-200';
    label = 'Indisponible';
    title = 'Donnée absente ou non communiquée par le réseau.';
  }

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${badgeBg} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colorClass}`} aria-hidden="true" />
      {showText && <span>{label}</span>}
    </span>
  );
};
