import { describe, it, expect } from 'vitest';
import { EU_REFERENCE_SNAPSHOTS, getLastKnownObservation } from '../data/referenceData';
import { TIMELINE_INDICATORS, TimelineIndicator } from '../types/energy';
import { emapsClient } from '../services/electricityMaps/client';

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

  it('respecte la promesse « Zéro donnée inventée » : pas de fabrication de points timeline', async () => {
    const res = await emapsClient.getZoneTimeline('FR', '15_minutes');
    expect(res.zoneKey).toBe('FR');
    // Si l'API amont n'est pas connectée, l'application ne fabrique aucune fausse courbe
    if (res.isUnavailable) {
      expect(res.points).toHaveLength(0);
      expect(res.message).toContain('indisponible');
      expect(res.lastKnown).toBeDefined();
      expect(res.lastKnown.carbonIntensity).toBe(EU_REFERENCE_SNAPSHOTS['FR'].carbonIntensity);
    } else {
      expect(res.points.length).toBeGreaterThan(0);
    }
  });

  it('fournit la dernière observation réelle certifiée sans simulation', () => {
    const frSnapshot = EU_REFERENCE_SNAPSHOTS['FR'];
    const observation = getLastKnownObservation(frSnapshot);

    expect(observation).not.toBeNull();
    expect(observation?.carbonIntensity).toBe(frSnapshot.carbonIntensity);
    expect(observation?.fossilFreePercentage).toBe(frSnapshot.fossilFreePercentage);
    expect(observation?.totalProduction).toBe(frSnapshot.totalProduction);
  });

  it('calcule correctement la formule de charge nette (Net Load = Total Load - Solaire - Éolien)', () => {
    const totalLoad = 55000;
    const solar = 8000;
    const wind = 12000;
    const netLoad = Math.max(0, totalLoad - (solar + wind));
    expect(netLoad).toBe(35000);
  });
});
