import { describe, it, expect } from 'vitest';
import { generateReferenceMixHistory, EU_REFERENCE_SNAPSHOTS } from '../data/referenceData';
import { MixHistoryPoint } from '../types/energy';

describe('Historique du Mix Électrique (24h)', () => {
  it('génère un historique du mix avec 97 points sur 24h à la granularité 15 minutes (défaut)', () => {
    const snapshot = EU_REFERENCE_SNAPSHOTS['FR'];
    const points: MixHistoryPoint[] = generateReferenceMixHistory('FR', snapshot, '2024-03-24T12:00:00Z', '15_minutes');

    expect(points).toHaveLength(97);

    // Vérifie le point de midi (index 48)
    const midPoint = points[48];
    expect(midPoint).toBeDefined();
    expect(midPoint.hourLabel).toMatch(/^\d{2}:\d{2}$/);
    expect(midPoint.totalProduction).toBeGreaterThan(1000);
  });

  it('reflète fidèlement le socle nucléaire en ruban stable (France)', () => {
    const snapshot = EU_REFERENCE_SNAPSHOTS['FR'];
    const points = generateReferenceMixHistory('FR', snapshot, '2024-03-24T12:00:00Z', 'hourly');

    expect(points.length).toBe(25);
    const nuclearValues = points.map((p) => p.nuclear);

    // Toutes les valeurs nucléaires doivent être positives et stables (ruban de base)
    const minNuclear = Math.min(...nuclearValues);
    const maxNuclear = Math.max(...nuclearValues);

    expect(minNuclear).toBeGreaterThan(20000);
    expect(maxNuclear).toBeLessThan(60000);
    // Variation maximale sous 5%
    expect((maxNuclear - minNuclear) / minNuclear).toBeLessThan(0.05);
  });

  it('modélise fidèlement la cloche solaire de midi et la nuit nulle', () => {
    const snapshot = EU_REFERENCE_SNAPSHOTS['FR'];
    const points = generateReferenceMixHistory('FR', snapshot, '2024-03-24T12:00:00Z', 'hourly');

    // Nuit vers 02h UTC -> 0 MW
    const night = points.find((p) => new Date(p.datetime).getUTCHours() === 2);
    expect(night?.solar).toBe(0);

    // Midi vers 13h UTC -> pic solaire
    const noon = points.find((p) => new Date(p.datetime).getUTCHours() === 13);
    expect(noon?.solar).toBeGreaterThan(1000);
  });

  it('intègre les profils éolien, hydro, gaz, charbon et biomasse', () => {
    const snapshot = EU_REFERENCE_SNAPSHOTS['DE'];
    const points = generateReferenceMixHistory('DE', snapshot, '2024-03-24T12:00:00Z', 'hourly');

    for (const p of points) {
      expect(p.wind).toBeGreaterThanOrEqual(0);
      expect(p.hydro).toBeGreaterThanOrEqual(0);
      expect(p.gas).toBeGreaterThanOrEqual(0);
      expect(p.coal).toBeGreaterThanOrEqual(0);
      expect(p.biomass).toBeGreaterThanOrEqual(0);
      expect(p.totalProduction).toBe(
        p.nuclear + p.hydro + p.wind + p.solar + p.gas + p.coal + p.biomass + p.oil + p.geothermal + p.unknown
      );
    }
  });

  it('supporte les granularités 5 minutes (289 points) et 1 heure (25 points)', () => {
    const pts5 = generateReferenceMixHistory('FR', null, '2024-03-24T12:00:00Z', '5_minutes');
    expect(pts5).toHaveLength(289);

    const ptsHourly = generateReferenceMixHistory('FR', null, '2024-03-24T12:00:00Z', 'hourly');
    expect(ptsHourly).toHaveLength(25);
  });
});
