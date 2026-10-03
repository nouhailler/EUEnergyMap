import { describe, it, expect } from 'vitest';
import { EU_REFERENCE_SNAPSHOTS, getLastKnownObservation } from '../data/referenceData';
import { emapsClient } from '../services/electricityMaps/client';

describe('Historique des flux transfrontaliers (/v4/electricity-flows/history)', () => {
  it('respecte la règle « Zéro donnée inventée » : ne fabrique aucune courbe artificielle de flux', async () => {
    const res = await emapsClient.getZoneFlowsHistory('FR', '15_minutes');
    expect(res.zoneKey).toBe('FR');
    expect(Array.isArray(res.interconnectors)).toBe(true);
    expect(res.interconnectors.length).toBeGreaterThan(0);

    if (res.isUnavailable) {
      expect(res.points).toHaveLength(0);
      expect(res.message).toContain('indisponible');
      expect(res.lastKnown).toBeDefined();
    } else {
      expect(res.points.length).toBeGreaterThan(0);
    }
  });

  it('fournit les interconnexions réelles depuis la topologie physique du réseau (France)', () => {
    const snapshot = EU_REFERENCE_SNAPSHOTS['FR'];
    const lastKnown = getLastKnownObservation(snapshot);
    const flows = lastKnown?.exchangeFlows || [];

    expect(flows.length).toBeGreaterThan(0);
    const peerZones = flows.map((f) => (f.fromZone === 'FR' ? f.toZone : f.fromZone));
    expect(peerZones).toContain('DE');
    expect(peerZones).toContain('GB');
  });

  it('conserve les flux physiques certifiés réels (positifs ou négatifs)', () => {
    const snapshot = EU_REFERENCE_SNAPSHOTS['FR'];
    const lastKnown = getLastKnownObservation(snapshot);
    const flows = lastKnown?.exchangeFlows || [];

    for (const f of flows) {
      expect(typeof f.flowMW).toBe('number');
      expect(f.fromZone).toBeDefined();
      expect(f.toZone).toBeDefined();
    }
  });
});
