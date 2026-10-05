// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App';
import { EUSummaryCards } from '../components/europe/EUSummaryCards';
import { EUTable } from '../components/europe/EUTable';
import { EUEnergyMap } from '../components/europe/EUEnergyMap';
import { CountryDetailView } from '../components/countries/CountryDetailView';
import { CountryHistorySection } from '../components/countries/CountryHistorySection';
import { EU_REFERENCE_SNAPSHOTS } from '../data/referenceData';

// Polyfill ResizeObserver and matchMedia for jsdom
if (typeof window !== 'undefined') {
  if (!window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  if (!window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as any);
  }
}

// Mock fetch for JSDOM relative urls
if (typeof global.fetch === 'undefined' || global.fetch) {
  const origFetch = global.fetch;
  global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.startsWith('/')) {
      if (url.includes('.geojson')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ type: 'FeatureCollection', features: [] }),
          text: async () => JSON.stringify({ type: 'FeatureCollection', features: [] }),
        } as any;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          snapshots: EU_REFERENCE_SNAPSHOTS,
          isDemoFallback: true,
          timestamp: '2024-03-24T12:00:00.000Z',
          dataTimestamp: '2024-03-24T12:00:00.000Z',
          retrievedAt: new Date().toISOString(),
          source: 'Référence locale',
        }),
        text: async () => JSON.stringify({}),
      } as any;
    }
    return origFetch ? origFetch(input, init) : Promise.reject(new Error('Unknown url: ' + url));
  };
}

describe('Components Render Test', () => {
  it('renders EUSummaryCards with reference snapshots', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    await act(async () => {
      root.render(
        <EUSummaryCards
          averageCarbonIntensity={120}
          totalConsumptionMW={45000}
          averageRenewableShare={55}
          averageFossilFreeShare={70}
          coveredCountriesCount={27}
        />
      );
    });
    expect(div.innerHTML).toContain('120');
    root.unmount();
  });

  it('renders EUTable with reference snapshots', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    await act(async () => {
      root.render(
        <EUTable
          snapshots={EU_REFERENCE_SNAPSHOTS}
          onSelectCountry={() => {}}
        />
      );
    });
    expect(div.innerHTML).toContain('France');
    root.unmount();
  });

  it('renders EUEnergyMap with reference snapshots', async () => {
    const div = document.createElement('div');
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
    root.unmount();
  });

  it('renders App without throwing', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    await act(async () => {
      root.render(<App />);
    });
    expect(div.innerHTML).toContain('EU Energy Map');
    root.unmount();
  });

  it('renders CountryHistorySection with reference snapshot', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    await act(async () => {
      root.render(
        <CountryHistorySection snapshot={EU_REFERENCE_SNAPSHOTS['FR']} />
      );
    });
    root.unmount();
  });

  it('renders CountryDetailView with reference snapshot', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    await act(async () => {
      root.render(
        <CountryDetailView
          snapshot={EU_REFERENCE_SNAPSHOTS['FR']}
          onBack={() => {}}
          onSelectCountry={() => {}}
        />
      );
    });
    expect(div.innerHTML).toContain('France');
    root.unmount();
  });
});
