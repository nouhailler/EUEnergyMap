// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import L from 'leaflet';
import { EU_REFERENCE_SNAPSHOTS } from '../data/referenceData';

describe('Leaflet GeoJSON Parsing', () => {
  it('parses public/data/europe.geojson without error', () => {
    const geojsonData = JSON.parse(fs.readFileSync('public/data/europe.geojson', 'utf8'));
    expect(geojsonData.features).toBeDefined();

    const div = document.createElement('div');
    div.style.width = '800px';
    div.style.height = '600px';
    document.body.appendChild(div);

    const map = L.map(div).setView([50, 10], 4);

    expect(() => {
      const layer = L.geoJSON(geojsonData, {
        style: () => ({ color: '#ff0000' }),
        onEachFeature: (feature, layer) => {
          layer.bindTooltip('Test');
        },
      });
      layer.addTo(map);
    }).not.toThrow();
  });
});
