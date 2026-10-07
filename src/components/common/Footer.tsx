import React from 'react';
import { Shield, ExternalLink, Globe, Scale, BookOpen } from 'lucide-react';

interface FooterProps {
  onOpenLegal?: () => void;
  onOpenOnboarding?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenLegal, onOpenOnboarding }) => {
  return (
    <footer className="mt-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-10 text-xs text-slate-500 dark:text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div>
            <span className="font-bold text-slate-900 dark:text-white text-sm block">
              EU Energy Map — Observatoire Électrique Européen
            </span>
            <p className="mt-1 text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
              Visualisation cartographique et agrégation physique des 27 réseaux interconnectés de l'Union européenne.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenLegal && (
              <button
                onClick={onOpenLegal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-400 transition font-medium cursor-pointer"
              >
                <Scale className="w-3.5 h-3.5 text-amber-500" />
                <span>Mentions Légales & Non-responsabilité</span>
              </button>
            )}

            {onOpenOnboarding && (
              <button
                onClick={onOpenOnboarding}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 transition font-medium cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                <span>Guide d'accueil</span>
              </button>
            )}

            <a
              href="https://app.electricitymaps.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-100 transition font-semibold"
            >
              <span>Données : app.electricitymaps.com</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[11px] leading-relaxed">
          <div>
            <strong className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-500" />
              Clause de non-responsabilité
            </strong>
            <p>
              L’auteur et éditeur de cette application ne saurait être tenu responsable de la pertinence, l’exactitude ou l’exhaustivité des données affichées. Les flux et mix électriques proviennent de{' '}
              <a
                href="https://app.electricitymaps.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-sky-600 dark:text-sky-400"
              >
                https://app.electricitymaps.com/
              </a>
              .
            </p>
          </div>

          <div>
            <strong className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              Périmètre des 27 pays de l'UE
            </strong>
            <p>
              Agrégation physique en mégawatts (MW) couvrant l’Autriche, la Belgique, la Bulgarie, la Croatie, Chypre, la Tchéquie, le Danemark, l’Estonie, la Finlande, la France, l’Allemagne, la Grèce, la Hongrie, l’Irlande, l’Italie, la Lettonie, la Lituanie, le Luxembourg, Malte, les Pays-Bas, la Pologne, le Portugal, la Roumanie, la Slovaquie, la Slovénie, l’Espagne et la Suède.
            </p>
          </div>

          <div>
            <strong className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-sky-600" />
              Intégrité & Transparence
            </strong>
            <p>
              Zéro donnée inventée : distinction formelle entre horodatage de mesure (`dataTimestamp`), horodatage de synchronisation (`retrievedAt`) et origine de la mesure (`source`).
            </p>
          </div>
        </div>

        <div className="text-center pt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
          © {new Date().getFullYear()} EU Energy Map — Outil informatif indépendant — Données certifiées issues de{' '}
          <a
            href="https://app.electricitymaps.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-600 dark:hover:text-slate-200"
          >
            https://app.electricitymaps.com/
          </a>
          .
        </div>
      </div>
    </footer>
  );
};
