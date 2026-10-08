import {
  Globe2,
  Layers,
  Flame,
  Leaf,
  ArrowRightLeft,
  TrendingUp,
  MapPin,
  Zap,
  BarChart3,
  ShieldCheck,
  Compass,
  Sparkles,
} from 'lucide-react';

export interface ScreenOnboardingStep {
  id: string;
  title: string;
  description: string;
  highlightText?: string;
  iconName: 'zap' | 'chart' | 'shield' | 'compass' | 'globe' | 'sparkles' | 'leaf' | 'flame' | 'arrows';
}

export interface ScreenOnboardingInfo {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  objective: string;
  mainIcon: typeof Globe2;
  colorScheme: 'sky' | 'emerald' | 'rose' | 'amber' | 'indigo' | 'purple' | 'cyan';
  steps: ScreenOnboardingStep[];
  proTip: string;
  methodologyNote: string;
}

export const SCREEN_ONBOARDING_DATA: Record<string, ScreenOnboardingInfo> = {
  dashboard: {
    id: 'dashboard',
    title: "Guide de la Vue d'Ensemble & Carte",
    subtitle: 'Observatoire unifié des 27 réseaux électriques interconnectés de l’Union européenne',
    badge: 'Europe & Carte UE-27',
    objective: "Surveiller en direct l'intensité carbone, la production d'électricité et le mix énergétique des 27 États membres.",
    mainIcon: Globe2,
    colorScheme: 'sky',
    steps: [
      {
        id: 'map-interaction',
        title: 'Carte interactive & Colorimétrie dynamique',
        description:
          "Basculez entre intensité carbone (gCO₂eq/kWh), part renouvelable (%) et part bas-carbone (%). Les teintes reflètent instantanément l'empreinte environnementale de chaque pays.",
        highlightText: 'Vert = décarboné, Brun/Gris = forte empreinte fossile.',
        iconName: 'compass',
      },
      {
        id: 'eu-synthesis',
        title: 'Synthèse européenne rigoureuse en mégawatts (MW)',
        description:
          "Les totaux et pourcentages européens sont calculés en sommant la puissance physique réelle (MW) de chaque filière et pondérés par la charge réelle, évitant les biais de simple moyenne arithmétique.",
        highlightText: 'Moyenne pondérée en MW selon les principes de l’agrégation physique.',
        iconName: 'zap',
      },
      {
        id: 'country-drilldown',
        title: 'Exploration instantanée par pays',
        description:
          "Cliquez sur un pays sur la carte ou dans le tableau de classement pour ouvrir sa fiche détaillée complète (mix de production, solde import/export, historiques 24h).",
        highlightText: 'Accès en 1 clic à la fiche de chaque État membre.',
        iconName: 'globe',
      },
    ],
    proTip: 'Cliquez sur les en-têtes du tableau pour trier les 27 pays par ordre d’intensité carbone, de production solaire ou éolienne.',
    methodologyNote: 'Données issues des gestionnaires de réseaux de transport (TSO / ENTSO-E) et agrégées par Electricity Maps.',
  },

  country: {
    id: 'country',
    title: 'Guide de la Fiche Pays Détaillée',
    subtitle: 'Diagnostic approfondi du système électrique national d’un État membre',
    badge: 'Fiche Pays',
    objective: 'Analyser en détail la production par filière, le profil d’émissions et la dépendance aux échanges frontaliers.',
    mainIcon: MapPin,
    colorScheme: 'indigo',
    steps: [
      {
        id: 'breakdown',
        title: 'Mix de production par filière (MW & %)',
        description:
          'Visualisez la part exacte de chaque technologie : nucléaire, éolien terrestre/en mer, solaire photovoltaïque, hydraulique, gaz, charbon et biomasse.',
        highlightText: 'Basculez entre production locale et consommation territoriale.',
        iconName: 'chart',
      },
      {
        id: 'carbon-intensity',
        title: 'Intensité carbone en cycle de vie (ACV)',
        description:
          'Mesurée en gCO₂eq/kWh, elle englobe les émissions directes de combustion et l’analyse du cycle de vie complet de l’infrastructure selon le standard IPCC.',
        highlightText: 'Intensité totale vs intensité de la composante fossile.',
        iconName: 'flame',
      },
      {
        id: 'cross-border',
        title: 'Solde des échanges transfrontaliers',
        description:
          'Identifiez si le pays est exportateur net (injecte de l’électricité chez ses voisins) ou importateur net (sécurise sa demande via le réseau européen).',
        highlightText: 'Puissance nette échangée en MW avec chaque pays limitrophe.',
        iconName: 'arrows',
      },
    ],
    proTip: 'Utilisez le sélecteur supérieur pour basculer rapidement vers un autre pays ou explorer l’historique temporel sur 24 heures en bas de page.',
    methodologyNote: 'Les facteurs d’émissions intègrent la traçabilité des flux (flow tracing) pour calculer le carbone des imports.',
  },

  compare: {
    id: 'compare',
    title: 'Guide du Comparateur Multi-Pays',
    subtitle: 'Mise en perspective simultanée des systèmes électriques de 2 à 4 pays de l’UE',
    badge: 'Comparateur',
    objective: 'Comparer côte à côte les mix technologiques, la part renouvelable et les performances carbone de plusieurs États membres.',
    mainIcon: Layers,
    colorScheme: 'purple',
    steps: [
      {
        id: 'selection',
        title: 'Sélection personnalisée des pays',
        description:
          'Ajoutez ou retirez des pays membres pour contraster des modèles électriques variés (ex. France nucléaire, Allemagne renouvelable/gaz, Suède hydro/nucléaire).',
        highlightText: 'Jusqu’à 4 pays comparés simultanément.',
        iconName: 'compass',
      },
      {
        id: 'aligned-metrics',
        title: 'Indicateurs alignés au même instant',
        description:
          'Comparez la charge totale (Total Load), la charge nette (Net Load), l’intensité carbone officielle et la production filière par filière.',
        highlightText: 'Unités uniformisées en GW et gCO₂eq/kWh pour une lecture directe.',
        iconName: 'chart',
      },
      {
        id: 'solidarity-contrast',
        title: 'Contrastes de décarbonation et solidarité',
        description:
          'Observez comment les interconnexions transfrontalières permettent d’équilibrer les disparités météorologiques et les besoins industriels.',
        highlightText: 'Évaluation factuelle sans biais idéologique.',
        iconName: 'shield',
      },
    ],
    proTip: 'Cliquez sur le nom d’un pays dans les colonnes pour naviguer directement vers sa fiche détaillée.',
    methodologyNote: 'Toutes les données comparées proviennent de la même fenêtre temporelle certifiée.',
  },

  carbon: {
    id: 'carbon',
    title: 'Guide de l’Observatoire Carbone',
    subtitle: 'Surveillance de l’empreinte gaz à effet de serre de l’électricité en Europe',
    badge: 'Observatoire Carbone',
    objective: 'Identifier les pays les plus décarbonés, les sources d’émissions fossiles et les impacts des pointes de demande.',
    mainIcon: Flame,
    colorScheme: 'rose',
    steps: [
      {
        id: 'footprint',
        title: 'Intensité carbone de la consommation (gCO₂eq/kWh)',
        description:
          'Indique le volume de gaz à effet de serre émis pour fournir un kilowattheure consommé, incluant les importations d’électricité.',
        highlightText: 'Comptabilité carbone basée sur la consommation réelle.',
        iconName: 'flame',
      },
      {
        id: 'rankings',
        title: 'Classement en direct des 27 pays',
        description:
          'Repérez les réseaux les plus vertueux (Suède, France, Finlande) et ceux encore dépendants du charbon, de la lignite ou du gaz fossile.',
        highlightText: 'Visualisation des écarts d’un facteur 1 à 15 selon les mix.',
        iconName: 'chart',
      },
      {
        id: 'peaking-impact',
        title: 'Impact des centrales d’ajustement',
        description:
          'Analysez comment l’intensité carbone grimpe lors des pointes de consommation du matin et du soir par recours aux centrales d’appoint.',
        highlightText: 'Rôle clé de la flexibilité et de la gestion de la demande.',
        iconName: 'zap',
      },
    ],
    proTip: 'Sélectionnez un pays dans le menu déroulant pour observer la courbe d’intensité carbone sur 24 heures avec granularité paramétrable.',
    methodologyNote: 'Facteurs d’émissions conformes aux lignes directrices du GIEC (méthode de cycle de vie LCA).',
  },

  renewables: {
    id: 'renewables',
    title: 'Guide de l’Observatoire des Renouvelables',
    subtitle: 'Production en direct de l’éolien, du solaire, de l’hydraulique et de la biomasse',
    badge: 'Énergies Renouvelables',
    objective: 'Mesurer la part instantanée des énergies naturelles renouvelables et suivre la météo énergétique européenne.',
    mainIcon: Leaf,
    colorScheme: 'emerald',
    steps: [
      {
        id: 'weather-power',
        title: 'Météo énergétique en temps réel',
        description:
          'Suivez la réactivité du réseau électrique face au vent (onshore et offshore) et à la course du soleil à l’échelle continentale.',
        highlightText: 'Puissance agrégée en mégawatts (MW) pour l’ensemble de l’Union.',
        iconName: 'leaf',
      },
      {
        id: 'renewable-vs-carbonfree',
        title: 'Renouvelable vs Bas-Carbone',
        description:
          'Distinguez la part purement renouvelable (soleil, vent, eau, biomasse) de la part totale décarbonée (qui inclut aussi le nucléaire sans émissions directes).',
        highlightText: 'Deux indicateurs complémentaires pour la transition énergétique.',
        iconName: 'shield',
      },
      {
        id: 'country-rates',
        title: 'Pénétration par État membre',
        description:
          'Triez et comparez le taux de renouvelables de chaque pays pour mesurer l’avancée vers les objectifs européens REPowerEU.',
        highlightText: 'Taux de pénétration instantané de 0 % à 100 % selon les conditions.',
        iconName: 'chart',
      },
    ],
    proTip: 'Inversez l’ordre de tri du tableau pour identifier aussi bien les champions verts que les pays disposant d’un potentiel d’accélération.',
    methodologyNote: 'Production brute injectée sur les réseaux de transport et distribution haute et moyenne tension.',
  },

  flows: {
    id: 'flows',
    title: 'Guide des Flux & Interconnexions Transfrontalières',
    subtitle: 'Cartographie des échanges physiques d’électricité et de la solidarité européenne',
    badge: 'Flux & Interconnexions',
    objective: 'Comprendre comment l’électricité circule physiquement entre les pays européens via les lignes haute tension.',
    mainIcon: ArrowRightLeft,
    colorScheme: 'cyan',
    steps: [
      {
        id: 'grid-lines',
        title: 'Interconnexions transfrontalières en mégawatts (MW)',
        description:
          'Chaque liaison affiche le sens physique du courant (pays exportateur vers pays importateur) et la puissance instantanée transmise.',
        highlightText: 'Animation des particules proportionnelle au débit de puissance.',
        iconName: 'arrows',
      },
      {
        id: 'solidarity',
        title: 'Marché couplé et solidarité énergétique',
        description:
          'L’électricité s’écoule des zones à coût marginal et émissions faibles vers les zones en déficit, optimisant le système européen.',
        highlightText: 'Réduction du besoin de surdimensionner les parcs nationaux.',
        iconName: 'zap',
      },
      {
        id: 'flow-tracing',
        title: 'Traçabilité du contenu carbone',
        description:
          'En important de l’énergie, un pays importe une fraction du contenu carbone du pays producteur selon l’algorithme de Flow Tracing.',
        highlightText: 'Comptabilisation transparente des émissions importées.',
        iconName: 'compass',
      },
    ],
    proTip: 'Passez de la vue Carte à la vue Diagramme en étoile pour analyser les partenaires frontaliers d’un pays spécifique.',
    methodologyNote: 'Données issues de la plateforme de transparence ENTSO-E et des centres de conduite régionaux (RCC).',
  },

  timeline: {
    id: 'timeline',
    title: 'Guide de la Chronologie 24 Heures',
    subtitle: 'Analyse des cycles journaliers de charge, de production et d’intensité carbone',
    badge: 'Chronologie 24h & Duck Curve',
    objective: 'Observer les dynamiques temporelles heure par heure pour comprendre le fonctionnement quotidien d’un réseau électrique.',
    mainIcon: TrendingUp,
    colorScheme: 'amber',
    steps: [
      {
        id: 'daily-load',
        title: 'Rythme circadien de la demande (Total Load)',
        description:
          'Visualisez le creux de la nuit (3h-5h), la pointe matinale (8h-9h) et la pointe vespérale (19h-20h) liée aux activités des ménages et de l’industrie.',
        highlightText: 'Puissance appelée mesurée au pas quart-horaire ou horaire.',
        iconName: 'chart',
      },
      {
        id: 'duck-curve',
        title: 'La « Courbe du canard » & Charge nette (Net Load)',
        description:
          'L’injection massive de solaire à midi fait chuter la charge nette résiduelle (Total Load - Solaire - Éolien), créant un profil caractéristique en forme de canard.',
        highlightText: 'Illustration des besoins de flexibilité et de stockage.',
        iconName: 'zap',
      },
      {
        id: 'dual-comparison',
        title: 'Superposition de deux indicateurs',
        description:
          'Superposez par exemple l’intensité carbone et la production éolienne ou solaire pour constater la corrélation directe sur les émissions.',
        highlightText: 'Analyse causale des variations d’émissions de CO₂.',
        iconName: 'compass',
      },
    ],
    proTip: 'Survolez la courbe avec votre curseur pour lire les valeurs précises à chaque heure ou basculez la granularité temporelle.',
    methodologyNote: 'Historiques reconstitués à partir des séries chronologiques publiées par les gestionnaires de réseaux.',
  },
};
