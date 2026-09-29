// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App';
import { EUSummaryCards } from '../components/europe/EUSummaryCards';
import { EUTable } from '../components/europe/EUTable';
import { EUEnergyMap } from '../components/europe/EUEnergyMap';
import { CountryDetailView } from '../components/countries/CountryDetailView';
import { CountryHistorySection } from '../components/countries/CountryHistorySection';
import { EU_REFERENCE_SNAPSHOTS } from '../data/referenceData';

// Polyfill ResizeObserver for Recharts ResponsiveContainer in jsdom
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

describe('Components Render Test', () => {
  it('renders EUSummaryCards with reference snapshots', () => {
    const div = document.createElement('div');
    const root = createRoot(div);
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

  it('renders EUTable with reference snapshots', () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    root.render(
      <EUTable
        snapshots={EU_REFERENCE_SNAPSHOTS}
        onSelectCountry={() => {}}
      />
    );
  });

  it('renders EUEnergyMap with reference snapshots', () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    root.render(
      <EUEnergyMap
        snapshots={EU_REFERENCE_SNAPSHOTS}
        selectedIndicator="carbonIntensity"
        onSelectIndicator={() => {}}
        onSelectCountry={() => {}}
      />
    );
  });

  it('renders App without throwing', () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    root.render(<App />);
  });

  it('renders CountryHistorySection with reference snapshot', () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    root.render(
      <CountryHistorySection snapshot={EU_REFERENCE_SNAPSHOTS['FR']} />
    );
  });

  it('renders CountryDetailView with reference snapshot', () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    root.render(
      <CountryDetailView
        snapshot={EU_REFERENCE_SNAPSHOTS['FR']}
        onBack={() => {}}
        onSelectCountry={() => {}}
      />
    );
  });
});
