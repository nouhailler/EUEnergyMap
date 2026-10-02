export interface GridNodeInfo {
  code: string;
  nameFr: string;
  flag: string;
  isEU: boolean;
  lat: number;
  lng: number;
  // Position pour le diagramme synoptique 2D (canvas SVG viewBox 0 0 1000 850)
  svgCoord: { x: number; y: number };
}

export const ALL_GRID_NODES: Record<string, GridNodeInfo> = {
  // --- 27 Pays Membres de l'Union Européenne ---
  AT: { code: 'AT', nameFr: 'Autriche', flag: '🇦🇹', isEU: true, lat: 47.5162, lng: 14.5501, svgCoord: { x: 520, y: 530 } },
  BE: { code: 'BE', nameFr: 'Belgique', flag: '🇧🇪', isEU: true, lat: 50.5039, lng: 4.4699, svgCoord: { x: 380, y: 440 } },
  BG: { code: 'BG', nameFr: 'Bulgarie', flag: '🇧🇬', isEU: true, lat: 42.7339, lng: 25.4858, svgCoord: { x: 670, y: 690 } },
  HR: { code: 'HR', nameFr: 'Croatie', flag: '🇭🇷', isEU: true, lat: 45.1000, lng: 15.2000, svgCoord: { x: 530, y: 610 } },
  CY: { code: 'CY', nameFr: 'Chypre', flag: '🇨🇾', isEU: true, lat: 35.1264, lng: 33.4299, svgCoord: { x: 840, y: 830 } },
  CZ: { code: 'CZ', nameFr: 'Tchéquie', flag: '🇨🇿', isEU: true, lat: 49.8175, lng: 15.4730, svgCoord: { x: 520, y: 470 } },
  DK: { code: 'DK', nameFr: 'Danemark', flag: '🇩🇰', isEU: true, lat: 56.2639, lng: 9.5018, svgCoord: { x: 440, y: 310 } },
  EE: { code: 'EE', nameFr: 'Estonie', flag: '🇪🇪', isEU: true, lat: 58.5953, lng: 25.0136, svgCoord: { x: 650, y: 240 } },
  FI: { code: 'FI', nameFr: 'Finlande', flag: '🇫🇮', isEU: true, lat: 61.9241, lng: 25.7482, svgCoord: { x: 630, y: 150 } },
  FR: { code: 'FR', nameFr: 'France', flag: '🇫🇷', isEU: true, lat: 46.6034, lng: 2.2137, svgCoord: { x: 320, y: 530 } },
  DE: { code: 'DE', nameFr: 'Allemagne', flag: '🇩🇪', isEU: true, lat: 51.1657, lng: 10.4515, svgCoord: { x: 450, y: 430 } },
  GR: { code: 'GR', nameFr: 'Grèce', flag: '🇬🇷', isEU: true, lat: 39.0742, lng: 21.8243, svgCoord: { x: 640, y: 760 } },
  HU: { code: 'HU', nameFr: 'Hongrie', flag: '🇭🇺', isEU: true, lat: 47.1625, lng: 19.5033, svgCoord: { x: 580, y: 550 } },
  IE: { code: 'IE', nameFr: 'Irlande', flag: '🇮🇪', isEU: true, lat: 53.4129, lng: -8.2439, svgCoord: { x: 210, y: 390 } },
  IT: { code: 'IT', nameFr: 'Italie', flag: '🇮🇹', isEU: true, lat: 41.8719, lng: 12.5674, svgCoord: { x: 480, y: 660 } },
  LV: { code: 'LV', nameFr: 'Lettonie', flag: '🇱🇻', isEU: true, lat: 56.8796, lng: 24.6032, svgCoord: { x: 640, y: 290 } },
  LT: { code: 'LT', nameFr: 'Lituanie', flag: '🇱🇹', isEU: true, lat: 55.1694, lng: 23.8813, svgCoord: { x: 630, y: 340 } },
  LU: { code: 'LU', nameFr: 'Luxembourg', flag: '🇱🇺', isEU: true, lat: 49.8153, lng: 6.1296, svgCoord: { x: 405, y: 465 } },
  MT: { code: 'MT', nameFr: 'Malte', flag: '🇲🇹', isEU: true, lat: 35.9375, lng: 14.3754, svgCoord: { x: 490, y: 810 } },
  NL: { code: 'NL', nameFr: 'Pays-Bas', flag: '🇳🇱', isEU: true, lat: 52.1326, lng: 5.2913, svgCoord: { x: 400, y: 390 } },
  PL: { code: 'PL', nameFr: 'Pologne', flag: '🇵🇱', isEU: true, lat: 51.9194, lng: 19.1451, svgCoord: { x: 580, y: 410 } },
  PT: { code: 'PT', nameFr: 'Portugal', flag: '🇵🇹', isEU: true, lat: 39.3999, lng: -8.2245, svgCoord: { x: 170, y: 690 } },
  RO: { code: 'RO', nameFr: 'Roumanie', flag: '🇷🇴', isEU: true, lat: 45.9432, lng: 24.9668, svgCoord: { x: 670, y: 600 } },
  SK: { code: 'SK', nameFr: 'Slovaquie', flag: '🇸🇰', isEU: true, lat: 48.6690, lng: 19.6990, svgCoord: { x: 570, y: 505 } },
  SI: { code: 'SI', nameFr: 'Slovénie', flag: '🇸🇮', isEU: true, lat: 46.1512, lng: 14.9955, svgCoord: { x: 495, y: 575 } },
  ES: { code: 'ES', nameFr: 'Espagne', flag: '🇪🇸', isEU: true, lat: 40.4637, lng: -3.7492, svgCoord: { x: 230, y: 690 } },
  SE: { code: 'SE', nameFr: 'Suède', flag: '🇸🇪', isEU: true, lat: 60.1282, lng: 18.6435, svgCoord: { x: 520, y: 220 } },

  // --- Pays tiers interconnectés au réseau synchrone européen ---
  GB: { code: 'GB', nameFr: 'Royaume-Uni', flag: '🇬🇧', isEU: false, lat: 52.5000, lng: -1.5000, svgCoord: { x: 280, y: 380 } },
  CH: { code: 'CH', nameFr: 'Suisse', flag: '🇨🇭', isEU: false, lat: 46.8182, lng: 8.2275, svgCoord: { x: 430, y: 565 } },
  NO: { code: 'NO', nameFr: 'Norvège', flag: '🇳🇴', isEU: false, lat: 60.4720, lng: 8.4689, svgCoord: { x: 440, y: 170 } },
  BA: { code: 'BA', nameFr: 'Bosnie-Herzégovine', flag: '🇧🇦', isEU: false, lat: 43.9159, lng: 17.6791, svgCoord: { x: 550, y: 645 } },
  RS: { code: 'RS', nameFr: 'Serbie', flag: '🇷🇸', isEU: false, lat: 44.0165, lng: 21.0059, svgCoord: { x: 615, y: 640 } },
  ME: { code: 'ME', nameFr: 'Monténégro', flag: '🇲🇪', isEU: false, lat: 42.7087, lng: 19.3744, svgCoord: { x: 580, y: 675 } },
  MK: { code: 'MK', nameFr: 'Macédoine du Nord', flag: '🇲🇰', isEU: false, lat: 41.6086, lng: 21.7453, svgCoord: { x: 630, y: 710 } },
  AL: { code: 'AL', nameFr: 'Albanie', flag: '🇦🇱', isEU: false, lat: 41.1533, lng: 20.1683, svgCoord: { x: 595, y: 720 } },
  TR: { code: 'TR', nameFr: 'Turquie', flag: '🇹🇷', isEU: false, lat: 41.0082, lng: 28.9784, svgCoord: { x: 790, y: 730 } },
  UA: { code: 'UA', nameFr: 'Ukraine', flag: '🇺🇦', isEU: false, lat: 49.0000, lng: 31.0000, svgCoord: { x: 740, y: 470 } },
  MD: { code: 'MD', nameFr: 'Moldavie', flag: '🇲🇩', isEU: false, lat: 47.0105, lng: 28.8638, svgCoord: { x: 730, y: 550 } },
  MA: { code: 'MA', nameFr: 'Maroc', flag: '🇲🇦', isEU: false, lat: 34.0209, lng: -6.8416, svgCoord: { x: 190, y: 800 } },
};

export function getGridNode(code: string): GridNodeInfo {
  const normalized = code.toUpperCase().trim();
  if (ALL_GRID_NODES[normalized]) {
    return ALL_GRID_NODES[normalized];
  }
  // Fallback si zone non reconnue
  return {
    code: normalized,
    nameFr: normalized,
    flag: '🌐',
    isEU: false,
    lat: 50.0,
    lng: 10.0,
    svgCoord: { x: 500, y: 500 },
  };
}
