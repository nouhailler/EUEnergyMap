import React from 'react';
import { Shield, ExternalLink, Heart, Globe } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-10 text-xs text-slate-500 dark:text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div>
            <span className="font-bold text-slate-900 dark:text-white text-sm block">
              EU Energy Map — Tableau de Bord Pédagogique Européen
            </span>
            <p className="mt-1 text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
              Application web progressive (PWA) d'exploration factuelle de la transition électrique des 27 États membres de l'Union européenne.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://app.electricitymaps.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-sky-600 transition font-medium"
            >
              <span>Data provided by Electricity Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[11px] leading-relaxed">
          <div>
            <strong className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-sky-600" />
              Intégrité & Règle d'or des données
            </strong>
            <p>
              Aucun chiffre fictif n'est généré. Lorsque l'API ne fournit pas une grandeur, elle est explicitement indiquée comme "Donnée indisponible" (jamais 0%). Les données estimées portent un badge distinctif.
            </p>
          </div>

          <div>
            <strong className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              Périmètre des 27 pays de l'UE
            </strong>
            <p>
              Couvre l'Autriche, la Belgique, la Bulgarie, la Croatie, Chypre, la Tchéquie, le Danemark, l'Estonie, la Finlande, la France, l'Allemagne, la Grèce, la Hongrie, l'Irlande, l'Italie, la Lettonie, la Lituanie, le Luxembourg, Malte, les Pays-Bas, la Pologne, le Portugal, la Roumanie, la Slovaquie, la Slovénie, l'Espagne et la Suède.
            </p>
          </div>

          <div>
            <strong className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              Architecture PWA & Hors-Ligne
            </strong>
            <p>
              Fonctionne en mode déconnecté grâce au cache applicatif. Les clés API sont conservées sur le serveur proxy Node.js et ne sont jamais exposées dans le bundle navigateur.
            </p>
          </div>
        </div>

        <div className="text-center pt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
          © {new Date().getFullYear()} EU Energy Map — Outil pédagogique factuel indépendant — Données officielles ENTSO-E / Electricity Maps.
        </div>
      </div>
    </footer>
  );
};
