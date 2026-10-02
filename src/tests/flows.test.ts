import { describe, it, expect } from 'vitest';
import { ALL_GRID_NODES, getGridNode } from '../data/gridTopology';
import { EU_COUNTRIES } from '../data/euCountries';

describe('Cross-Border Electricity Flows & Grid Topology', () => {
  it('contient tous les 27 pays de l\'Union Européenne avec coordonnées GPS', () => {
    for (const country of EU_COUNTRIES) {
      const node = getGridNode(country.code);
      expect(node).toBeDefined();
      expect(node.isEU).toBe(true);
      expect(node.lat).toBeGreaterThan(30);
      expect(node.lat).toBeLessThan(72);
      expect(node.lng).toBeGreaterThan(-15);
      expect(node.lng).toBeLessThan(40);
    }
  });

  it('gère correctement les pays tiers interconnectés (GB, CH, NO, UA, etc.)', () => {
    const gb = getGridNode('GB');
    expect(gb.isEU).toBe(false);
    expect(gb.nameFr).toBe('Royaume-Uni');
    expect(gb.flag).toBe('🇬🇧');

    const ch = getGridNode('CH');
    expect(ch.isEU).toBe(false);
    expect(ch.nameFr).toBe('Suisse');
    expect(ch.flag).toBe('🇨🇭');

    const no = getGridNode('NO');
    expect(no.isEU).toBe(false);
    expect(no.nameFr).toBe('Norvège');
    expect(no.flag).toBe('🇳🇴');
  });

  it('gère élégamment un code inconnu avec un fallback non bloquant', () => {
    const unknown = getGridNode('XX');
    expect(unknown.code).toBe('XX');
    expect(unknown.flag).toBe('🌐');
    expect(unknown.lat).toBe(50);
  });
});
