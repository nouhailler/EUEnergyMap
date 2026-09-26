import { ProductionSourceKey, ProductionSourceMeta } from '../types/energy';

export const PRODUCTION_SOURCES: Record<ProductionSourceKey, ProductionSourceMeta> = {
  nuclear: {
    key: 'nuclear',
    labelFr: 'Nucléaire',
    labelEn: 'Nuclear',
    color: '#818cf8', // Indigo
    isRenewable: false,
    isCarbonFree: true,
    descriptionFr: 'Production thermique d’origine fissile, pilotable et sans émissions directes de CO₂.',
  },
  hydro: {
    key: 'hydro',
    labelFr: 'Hydraulique',
    labelEn: 'Hydro',
    color: '#38bdf8', // Sky
    isRenewable: true,
    isCarbonFree: true,
    descriptionFr: 'Énergie hydraulique (barrages au fil de l’eau, lacs de retenue et pompage-turbinage).',
  },
  wind: {
    key: 'wind',
    labelFr: 'Éolien',
    labelEn: 'Wind',
    color: '#34d399', // Emerald
    isRenewable: true,
    isCarbonFree: true,
    descriptionFr: 'Énergie éolienne terrestre (onshore) et en mer (offshore), tributaire du vent.',
  },
  solar: {
    key: 'solar',
    labelFr: 'Solaire',
    labelEn: 'Solar',
    color: '#facc15', // Yellow
    isRenewable: true,
    isCarbonFree: true,
    descriptionFr: 'Énergie photovoltaïque issue de l’ensoleillement direct et diffus.',
  },
  gas: {
    key: 'gas',
    labelFr: 'Gaz fossile',
    labelEn: 'Gas',
    color: '#fb923c', // Orange
    isRenewable: false,
    isCarbonFree: false,
    descriptionFr: 'Centrales thermiques au gaz naturel (turbines à combustion et cycles combinés gaz).',
  },
  coal: {
    key: 'coal',
    labelFr: 'Charbon & Lignite',
    labelEn: 'Coal',
    color: '#71717a', // Zinc
    isRenewable: false,
    isCarbonFree: false,
    descriptionFr: 'Centrales thermiques à combustible solide fossile (charbon houiller et lignite).',
  },
  oil: {
    key: 'oil',
    labelFr: 'Pétrole & Fioul',
    labelEn: 'Oil',
    color: '#a1a1aa', // Slate
    isRenewable: false,
    isCarbonFree: false,
    descriptionFr: 'Centrales thermiques au fioul lourd ou turbines à combustion au fioul.',
  },
  biomass: {
    key: 'biomass',
    labelFr: 'Biomasse',
    labelEn: 'Biomass',
    color: '#a3e635', // Lime
    isRenewable: true,
    isCarbonFree: true,
    descriptionFr: 'Combustion de matière organique végétale (bois-énergie, biogaz, déchets organiques).',
  },
  geothermal: {
    key: 'geothermal',
    labelFr: 'Géothermie',
    labelEn: 'Geothermal',
    color: '#2dd4bf', // Teal
    isRenewable: true,
    isCarbonFree: true,
    descriptionFr: 'Exploitation de la chaleur interne de la croûte terrestre.',
  },
  unknown: {
    key: 'unknown',
    labelFr: 'Autre / Inconnu',
    labelEn: 'Unknown / Other',
    color: '#94a3b8', // Slate light
    isRenewable: false,
    isCarbonFree: false,
    descriptionFr: 'Production non catégorisée ou flux de compensation de réseau.',
  },
};
