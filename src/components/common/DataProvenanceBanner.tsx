import React from 'react';
import { Database, Calendar, Clock } from 'lucide-react';

/**
 * Formate un horodatage ISO selon le format certifié demandé :
 * ex: "24 mars 2024 — 12:00"
 */
export function formatDataDateTime(isoString?: string | null, forceUtc = false): string {
  if (!isoString) return 'Non renseigné';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    // Use UTC for reference/data timestamps so that 12:00 UTC displays consistently as 12:00
    const options: Intl.DateTimeFormatOptions = forceUtc ? { timeZone: 'UTC' } : {};

    const day = d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...options,
    });

    const time = d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    });

    return `${day} — ${time}`;
  } catch {
    return isoString;
  }
}

export interface DataProvenanceBannerProps {
  dataTimestamp?: string | null;
  retrievedAt?: string | null;
  source?: string | null;
  variant?: 'inline' | 'card' | 'panel' | 'compact';
  className?: string;
}

export const DataProvenanceBanner: React.FC<DataProvenanceBannerProps> = ({
  dataTimestamp,
  retrievedAt,
  source = 'Référence locale',
  variant = 'inline',
  className = '',
}) => {
  const isReference = !source || source.toLowerCase().includes('référence') || source.toLowerCase().includes('reference');
  const sourceLabel = source || 'Référence locale';

  if (variant === 'card' || variant === 'panel') {
    return (
      <div
        className={`p-4 rounded-xl border transition-all ${
          isReference
            ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
            : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
        } ${className}`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
          {/* 1. Donnée */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Donnée</span>
            </div>
            <div className="font-bold text-slate-900 dark:text-slate-100 font-mono text-sm">
              {formatDataDateTime(dataTimestamp, true)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Date & heure effectives de mesure
            </div>
          </div>

          {/* 2. Récupérée */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Récupérée</span>
            </div>
            <div className="font-bold text-slate-900 dark:text-slate-100 font-mono text-sm">
              {formatDataDateTime(retrievedAt, false)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Synchronisation par l'application
            </div>
          </div>

          {/* 3. Source */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Database className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Source</span>
            </div>
            <div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                  isReference
                    ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                    : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                }`}
              >
                {sourceLabel}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {isReference ? 'Relevé factuel certifié ENTSO-E' : 'API Electricity Maps en temps réel'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Variant inline / compact
  return (
    <div className={`flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1.5 text-xs ${className}`}>
      <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
        <span className="font-semibold text-slate-800 dark:text-slate-200">Donnée :</span>
        <span className="font-mono text-slate-900 dark:text-slate-100 font-medium">
          {formatDataDateTime(dataTimestamp, true)}
        </span>
      </span>

      <span className="text-slate-300 dark:text-slate-700 hidden sm:inline" aria-hidden="true">•</span>

      <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
        <span className="font-semibold text-slate-800 dark:text-slate-200">Récupérée :</span>
        <span className="font-mono text-slate-900 dark:text-slate-100 font-medium">
          {formatDataDateTime(retrievedAt, false)}
        </span>
      </span>

      <span className="text-slate-300 dark:text-slate-700 hidden sm:inline" aria-hidden="true">•</span>

      <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
        <span className="font-semibold text-slate-800 dark:text-slate-200">Source :</span>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md font-medium text-[11px] ${
            isReference
              ? 'bg-amber-100/90 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
              : 'bg-emerald-100/90 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
          }`}
        >
          {sourceLabel}
        </span>
      </span>
    </div>
  );
};
