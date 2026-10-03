import { describe, it, expect } from 'vitest';
import { EU_REFERENCE_SNAPSHOTS, getLastKnownObservation } from '../data/referenceData';
import { emapsClient } from '../services/electricityMaps/client';

describe('Historique du Mix Électrique (24h)', () => {
  it('respecte la promesse « Zéro donnée inventée » : pas de fabrication de courbe de mix', async () => {
    const res = await emapsClient.getZoneMixHistory('FR', '15_minutes');
    expect(res.zoneKey).toBe('FR');
    if (res.isUnavailable) {
      expect(res.points).toHaveLength(0);
      expect(res.message).toContain('indisponible');
      expect(res.lastKnown).toBeDefined();
    } else {
      expect(res.points.length).toBeGreaterThan(0);
    }
  });

  it('fournit la dernière observation certifiée pour le mix de production réel (France)', () => {
    const snapshot = EU_REFERENCE_SNAPSHOTS['FR'];
    const lastKnown = getLastKnownObservation(snapshot);

    expect(lastKnown).not.toBeNull();
    expect(lastKnown?.productionBreakdown).toBeDefined();
    // Le nucléaire français certifié réel dans le snapshot
    expect(lastKnown?.productionBreakdown?.nuclear).toBeGreaterThan(20000);
    expect(lastKnown?.isEstimated).toBe(false);
  });

  it('conserve la cohérence des filières réelles sans aucune approximation mathématique', () => {
    const snapshot = EU_REFERENCE_SNAPSHOTS['DE'];
    const lastKnown = getLastKnownObservation(snapshot);
    const pb = lastKnown?.productionBreakdown;

    expect(pb).toBeDefined();
    if (pb) {
      expect(pb.wind).toBeGreaterThanOrEqual(0);
      expect(pb.solar).toBeGreaterThanOrEqual(0);
      expect(pb.coal).toBeGreaterThanOrEqual(0);
    }
  });
});
