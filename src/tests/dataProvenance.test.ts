import { describe, it, expect } from 'vitest';
import { formatDataDateTime } from '../components/common/DataProvenanceBanner';
import { EU_REFERENCE_SNAPSHOTS, getLastKnownObservation } from '../data/referenceData';
import { emapsClient } from '../services/electricityMaps/client';

describe('Distinction stricte dataTimestamp vs retrievedAt & Source factuelle', () => {
  it('formate fidèlement les dates au format certifié (ex: "24 mars 2024 — 12:00")', () => {
    const formattedData = formatDataDateTime('2024-03-24T12:00:00.000Z', true);
    expect(formattedData).toBe('24 mars 2024 — 12:00');

    const formattedRetrieved = formatDataDateTime('2026-09-28T17:15:00.000Z', true);
    expect(formattedRetrieved).toBe('28 septembre 2026 — 17:15');
  });

  it('ne confond pas la date de mesure (2024) avec la date de récupération (2026)', () => {
    const snapshotFR = EU_REFERENCE_SNAPSHOTS['FR'];
    const lastKnown = getLastKnownObservation(snapshotFR);

    expect(lastKnown).not.toBeNull();
    // dataTimestamp correspond au relevé certifié de mars 2024
    expect(lastKnown?.dataTimestamp).toBe('2024-03-24T12:00:00.000Z');
    // retrievedAt est un horodatage récent
    expect(lastKnown?.retrievedAt).toBeDefined();
    expect(lastKnown?.source).toBe('Référence locale');

    // La date de la donnée NE DOIT PAS être l'année de récupération courante (ex: 2026)
    expect(lastKnown?.dataTimestamp?.startsWith('2024')).toBe(true);
  });

  it('les fallbacks d’historique retournent explicitement dataTimestamp, retrievedAt et source Référence locale', async () => {
    const history = await emapsClient.getZoneHistory('FR');
    expect(history.isUnavailable).toBe(true);
    expect(history.dataTimestamp).toBe('2024-03-24T12:00:00.000Z');
    expect(history.retrievedAt).toBeDefined();
    expect(history.source).toBe('Référence locale');
  });

  it('la timeline et le mix d’une zone distinguent bien dataTimestamp de retrievedAt', async () => {
    const timeline = await emapsClient.getZoneTimeline('FR');
    expect(timeline.isUnavailable).toBe(true);
    expect(timeline.dataTimestamp).toBe('2024-03-24T12:00:00.000Z');
    expect(timeline.retrievedAt).toBeDefined();
    expect(timeline.source).toBe('Référence locale');

    const mix = await emapsClient.getZoneMixHistory('FR');
    expect(mix.isUnavailable).toBe(true);
    expect(mix.dataTimestamp).toBe('2024-03-24T12:00:00.000Z');
    expect(mix.retrievedAt).toBeDefined();
    expect(mix.source).toBe('Référence locale');

    const flows = await emapsClient.getZoneFlowsHistory('FR');
    expect(flows.isUnavailable).toBe(true);
    expect(flows.dataTimestamp).toBe('2024-03-24T12:00:00.000Z');
    expect(flows.retrievedAt).toBeDefined();
    expect(flows.source).toBe('Référence locale');
  });
});
