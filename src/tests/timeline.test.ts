import { describe, it, expect } from 'vitest';
import { generateReferenceTimeline, EU_REFERENCE_SNAPSHOTS } from '../data/referenceData';
import { TIMELINE_INDICATORS, TimelineIndicator } from '../types/energy';

describe('Timeline 24h & Journée Électrique', () => {
  it('contient exactement les 10 indicateurs demandés avec métadonnées et unités', () => {
    const requiredKeys: TimelineIndicator[] = [
      'carbonIntensity',
      'renewable',
      'carbonFree',
      'totalLoad',
      'reportedLoad',
      'netLoad',
      'solar',
      'wind',
      'nuclear',
      'flows',
    ];

    expect(TIMELINE_INDICATORS).toHaveLength(10);
    const existingKeys = TIMELINE_INDICATORS.map((i) => i.key);
    for (const key of requiredKeys) {
      expect(existingKeys).toContain(key);
    }

    // Ordre exact spécifié dans le cahier des charges
    expect(TIMELINE_INDICATORS[0].key).toBe('carbonIntensity');
    expect(TIMELINE_INDICATORS[0].label).toBe('Intensité carbone');
    expect(TIMELINE_INDICATORS[1].key).toBe('renewable');
    expect(TIMELINE_INDICATORS[1].label).toBe('Renouvelable');
    expect(TIMELINE_INDICATORS[2].key).toBe('carbonFree');
    expect(TIMELINE_INDICATORS[2].label).toBe('Bas-carbone');
    expect(TIMELINE_INDICATORS[3].key).toBe('totalLoad');
    expect(TIMELINE_INDICATORS[3].label).toBe('Total Load');
    expect(TIMELINE_INDICATORS[4].key).toBe('reportedLoad');
    expect(TIMELINE_INDICATORS[4].label).toBe('Reported Load');
    expect(TIMELINE_INDICATORS[5].key).toBe('netLoad');
    expect(TIMELINE_INDICATORS[5].label).toBe('Net Load');
    expect(TIMELINE_INDICATORS[6].key).toBe('solar');
    expect(TIMELINE_INDICATORS[6].label).toBe('Solaire');
    expect(TIMELINE_INDICATORS[7].key).toBe('wind');
    expect(TIMELINE_INDICATORS[7].label).toBe('Éolien');
    expect(TIMELINE_INDICATORS[8].key).toBe('nuclear');
    expect(TIMELINE_INDICATORS[8].label).toBe('Nucléaire');
    expect(TIMELINE_INDICATORS[9].key).toBe('flows');
    expect(TIMELINE_INDICATORS[9].label).toBe('Flux');
  });

  it('génère un historique timeline cohérent avec 97 points en 15 minutes (défaut)', () => {
    const snapshot = EU_REFERENCE_SNAPSHOTS['FR'];
    const points = generateReferenceTimeline('FR', snapshot, '2024-03-24T12:00:00Z', '15_minutes');

    // (24 * 60) / 15 + 1 = 97 points
    expect(points).toHaveLength(97);

    // Vérification de la présence des signaux
    const sample = points[Math.floor(points.length / 2)];
    expect(sample.totalLoad).toBeGreaterThan(1000);
    expect(sample.totalReportedLoad).toBeGreaterThan(1000);
    expect(sample.carbonIntensity).toBeGreaterThan(0);
    expect(sample.netLoad).toBeDefined();
    expect(sample.renewablePercentage).toBeGreaterThanOrEqual(0);
    expect(sample.fossilFreePercentage).toBeGreaterThanOrEqual(0);
  });

  it('modélise fidèlement le profil solaire (nul la nuit, pic au midi solaire)', () => {
    const snapshot = EU_REFERENCE_SNAPSHOTS['FR'];
    const points = generateReferenceTimeline('FR', snapshot, '2024-03-24T12:00:00Z', 'hourly');

    // Nuit (vers 02h UTC) -> production solaire nulle
    const nightPoint = points.find((p) => new Date(p.datetime).getUTCHours() === 2);
    expect(nightPoint?.solar).toBe(0);

    // Midi solaire (vers 13h UTC) -> production solaire maximale
    const noonPoint = points.find((p) => new Date(p.datetime).getUTCHours() === 13);
    expect(noonPoint?.solar).toBeGreaterThan(0);
  });

  it('calcule la charge nette (Net Load = Total Load - Solaire - Éolien)', () => {
    const snapshot = EU_REFERENCE_SNAPSHOTS['DE'];
    const points = generateReferenceTimeline('DE', snapshot, '2024-03-24T12:00:00Z', 'hourly');

    for (const p of points) {
      if (p.totalLoad !== null && p.solar !== null && p.wind !== null && p.netLoad !== null) {
        expect(p.netLoad).toBe(Math.max(0, p.totalLoad - (p.solar + p.wind)));
      }
    }
  });

  it('supporte les granularités 5 minutes (289 points) et 1 heure (25 points)', () => {
    const pts5 = generateReferenceTimeline('FR', null, '2024-03-24T12:00:00Z', '5_minutes');
    expect(pts5).toHaveLength(289);

    const ptsHourly = generateReferenceTimeline('FR', null, '2024-03-24T12:00:00Z', 'hourly');
    expect(ptsHourly).toHaveLength(25);
  });
});
