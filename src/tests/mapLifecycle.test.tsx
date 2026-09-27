// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import fs from 'fs';
import { EUEnergyMap } from '../components/europe/EUEnergyMap';
import { EU_REFERENCE_SNAPSHOTS } from '../data/referenceData';

describe('EUEnergyMap Full Lifecycle Test', () => {
  it('mounts, fetches geojson, creates map, renders layers without error', async () => {
    const geojsonData = JSON.parse(fs.readFileSync('public/data/europe.geojson', 'utf8'));

    // Mock fetch for /data/europe.geojson
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/data/europe.geojson') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(geojsonData),
        });
      }
      return Promise.reject(new Error('Unknown url: ' + url));
    });

    const div = document.createElement('div');
    // Provide non-zero dimensions
    Object.defineProperty(div, 'clientWidth', { value: 1024, configurable: true });
    Object.defineProperty(div, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(div);

    const root = createRoot(div);

    await act(async () => {
      root.render(
        <EUEnergyMap
          snapshots={EU_REFERENCE_SNAPSHOTS}
          selectedIndicator="carbonIntensity"
          onSelectIndicator={() => {}}
          onSelectCountry={() => {}}
        />
      );
    });

    // Wait for the async geojson fetch and effects
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    // Change indicator to renewableShare
    await act(async () => {
      root.render(
        <EUEnergyMap
          snapshots={EU_REFERENCE_SNAPSHOTS}
          selectedIndicator="renewableShare"
          onSelectIndicator={() => {}}
          onSelectCountry={() => {}}
        />
      );
    });

    // Change indicator to primarySource
    await act(async () => {
      root.render(
        <EUEnergyMap
          snapshots={EU_REFERENCE_SNAPSHOTS}
          selectedIndicator="primarySource"
          onSelectIndicator={() => {}}
          onSelectCountry={() => {}}
        />
      );
    });

    // Change indicator to totalLoad
    await act(async () => {
      root.render(
        <EUEnergyMap
          snapshots={EU_REFERENCE_SNAPSHOTS}
          selectedIndicator="totalLoad"
          onSelectIndicator={() => {}}
          onSelectCountry={() => {}}
        />
      );
    });

    // Unmount
    await act(async () => {
      root.unmount();
    });
  });
});
