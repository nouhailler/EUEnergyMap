export interface ZoneDefinition {
  zoneKey: string;
  countryCode: string;
  zoneName: string;
  hasFlows: boolean;
  hasDirectHistory: boolean;
  isSubzone: boolean;
  parentCountryCode?: string;
}

export const ELECTRICITY_ZONES: Record<string, ZoneDefinition> = {
  AT: { zoneKey: 'AT', countryCode: 'AT', zoneName: 'Autriche', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  BE: { zoneKey: 'BE', countryCode: 'BE', zoneName: 'Belgique', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  BG: { zoneKey: 'BG', countryCode: 'BG', zoneName: 'Bulgarie', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  HR: { zoneKey: 'HR', countryCode: 'HR', zoneName: 'Croatie', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  CY: { zoneKey: 'CY', countryCode: 'CY', zoneName: 'Chypre (Réseau Isolé)', hasFlows: false, hasDirectHistory: true, isSubzone: false },
  CZ: { zoneKey: 'CZ', countryCode: 'CZ', zoneName: 'Tchéquie', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  DK: { zoneKey: 'DK', countryCode: 'DK', zoneName: 'Danemark (Agrégé)', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  'DK-DK1': { zoneKey: 'DK-DK1', countryCode: 'DK', zoneName: 'Danemark Ouest (Jutland)', hasFlows: true, hasDirectHistory: true, isSubzone: true, parentCountryCode: 'DK' },
  'DK-DK2': { zoneKey: 'DK-DK2', countryCode: 'DK', zoneName: 'Danemark Est (Seeland)', hasFlows: true, hasDirectHistory: true, isSubzone: true, parentCountryCode: 'DK' },
  EE: { zoneKey: 'EE', countryCode: 'EE', zoneName: 'Estonie', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  FI: { zoneKey: 'FI', countryCode: 'FI', zoneName: 'Finlande', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  FR: { zoneKey: 'FR', countryCode: 'FR', zoneName: 'France', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  DE: { zoneKey: 'DE', countryCode: 'DE', zoneName: 'Allemagne', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  GR: { zoneKey: 'GR', countryCode: 'GR', zoneName: 'Grèce', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  HU: { zoneKey: 'HU', countryCode: 'HU', zoneName: 'Hongrie', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  IE: { zoneKey: 'IE', countryCode: 'IE', zoneName: 'Irlande', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  IT: { zoneKey: 'IT', countryCode: 'IT', zoneName: 'Italie (Agrégé)', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  LV: { zoneKey: 'LV', countryCode: 'LV', zoneName: 'Lettonie', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  LT: { zoneKey: 'LT', countryCode: 'LT', zoneName: 'Lituanie', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  LU: { zoneKey: 'LU', countryCode: 'LU', zoneName: 'Luxembourg', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  MT: { zoneKey: 'MT', countryCode: 'MT', zoneName: 'Malte', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  NL: { zoneKey: 'NL', countryCode: 'NL', zoneName: 'Pays-Bas', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  PL: { zoneKey: 'PL', countryCode: 'PL', zoneName: 'Pologne', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  PT: { zoneKey: 'PT', countryCode: 'PT', zoneName: 'Portugal', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  RO: { zoneKey: 'RO', countryCode: 'RO', zoneName: 'Roumanie', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  SK: { zoneKey: 'SK', countryCode: 'SK', zoneName: 'Slovaquie', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  SI: { zoneKey: 'SI', countryCode: 'SI', zoneName: 'Slovénie', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  ES: { zoneKey: 'ES', countryCode: 'ES', zoneName: 'Espagne', hasFlows: true, hasDirectHistory: true, isSubzone: false },
  SE: { zoneKey: 'SE', countryCode: 'SE', zoneName: 'Suède (Agrégé)', hasFlows: true, hasDirectHistory: true, isSubzone: false },
};
