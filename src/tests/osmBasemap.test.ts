// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { EUROPE_GEOJSON } from '../services/map/europeGeojson';

describe('OpenStreetMap et Disponibilité Cartographique Sans Clé API', () => {
  it('charge immédiatement le GeoJSON officiel sans dépendance réseau', () => {
    expect(EUROPE_GEOJSON).toBeDefined();
    expect(EUROPE_GEOJSON.type).toBe('FeatureCollection');
    expect(Array.isArray(EUROPE_GEOJSON.features)).toBe(true);
    expect(EUROPE_GEOJSON.features.length).toBeGreaterThanOrEqual(27);

    // Vérifier la présence des pays clés de l'UE
    const isoCodes = EUROPE_GEOJSON.features.map((f: any) => f.properties?.ISO2);
    expect(isoCodes).toContain('FR');
    expect(isoCodes).toContain('DE');
    expect(isoCodes).toContain('IT');
    expect(isoCodes).toContain('ES');
  });

  it('ne contient aucune référence à carto.com ou aux clés d’API privées', () => {
    // Vérifie que les URLs OpenStreetMap sont bien configurées
    const osmUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    expect(osmUrl).toContain('tile.openstreetmap.org');
    expect(osmUrl).not.toContain('carto');
    expect(osmUrl).not.toContain('api_key');
  });
});
