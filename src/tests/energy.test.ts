import { describe, it, expect } from 'vitest';
import { EU_COUNTRIES, EU_COUNTRY_MAP } from '../data/euCountries';
import { normalizeCountrySnapshot, computeEUSummary } from '../services/electricityMaps/normalizers';
import { PRODUCTION_SOURCES } from '../data/sourcesMeta';

describe('EU Energy Map - Configuration & Modèle', () => {
  it('contient exactement les 27 pays membres de l’Union Européenne', () => {
    expect(EU_COUNTRIES).toHaveLength(27);
    const codes = new Set(EU_COUNTRIES.map((c) => c.code));
    expect(codes.size).toBe(27);

    // Vérification de quelques pays piliers
    expect(codes.has('FR')).toBe(true);
    expect(codes.has('DE')).toBe(true);
    expect(codes.has('IT')).toBe(true);
    expect(codes.has('ES')).toBe(true);
    expect(codes.has('PL')).toBe(true);
    expect(codes.has('SE')).toBe(true);
    expect(codes.has('CY')).toBe(true);
  });

  it('chaque pays dispose d’un nom français, d’un drapeau et d’une zone Electricity Maps', () => {
    for (const c of EU_COUNTRIES) {
      expect(c.nameFr).toBeTruthy();
      expect(c.flag).toBeTruthy();
      expect(c.zoneKey).toBeTruthy();
    }
  });

  it('les métadonnées des sources de production sont exhaustives et typées', () => {
    const keys = Object.keys(PRODUCTION_SOURCES);
    expect(keys).toContain('nuclear');
    expect(keys).toContain('wind');
    expect(keys).toContain('solar');
    expect(keys).toContain('hydro');
    expect(keys).toContain('gas');
    expect(keys).toContain('coal');

    expect(PRODUCTION_SOURCES.nuclear.isRenewable).toBe(false);
    expect(PRODUCTION_SOURCES.nuclear.isCarbonFree).toBe(true);

    expect(PRODUCTION_SOURCES.wind.isRenewable).toBe(true);
    expect(PRODUCTION_SOURCES.wind.isCarbonFree).toBe(true);

    expect(PRODUCTION_SOURCES.gas.isRenewable).toBe(false);
    expect(PRODUCTION_SOURCES.gas.isCarbonFree).toBe(false);
  });
});

describe('Normalisation des données & Règle d’intégrité', () => {
  it('ne convertit JAMAIS null en zéro pour les grandeurs absentes', () => {
    const rawBreakdown = {
      zone: 'FR',
      powerProductionBreakdown: {
        nuclear: 40000,
        solar: null, // absent
        wind: undefined, // absent
        gas: 0, // valeur mesurée à zéro
      },
      powerProductionTotal: 40000,
      powerConsumptionTotal: 45000,
      fossilFreePercentage: 90,
      renewablePercentage: null, // absent
    };

    const snapshot = normalizeCountrySnapshot('FR', rawBreakdown as any, null);

    // solar et wind doivent rester null
    expect(snapshot.productionBreakdown.solar).toBeNull();
    expect(snapshot.productionBreakdown.wind).toBeNull();

    // gas doit rester 0 (car c'est un zéro mesuré)
    expect(snapshot.productionBreakdown.gas).toBe(0);

    // renewablePercentage doit rester null
    expect(snapshot.renewablePercentage).toBeNull();
  });

  it('calcule rigoureusement le solde net d’échanges (export - import)', () => {
    const rawBreakdown = {
      zone: 'FR',
      powerExportTotal: 8000,
      powerImportTotal: 2000,
    };

    const snapshot = normalizeCountrySnapshot('FR', rawBreakdown as any, null);
    expect(snapshot.netExport).toBe(6000); // 8000 - 2000 = +6000 MW (exportateur net)
  });

  it('calcule la charge nette (Total Load - Solaire - Éolien)', () => {
    const rawBreakdown = {
      zone: 'DE',
      powerConsumptionTotal: 50000,
      powerProductionBreakdown: {
        solar: 15000,
        wind: 10000,
      },
    };

    const snapshot = normalizeCountrySnapshot('DE', rawBreakdown as any, null);
    // 50000 - (15000 + 10000) = 25000 MW
    expect(snapshot.netLoad).toBe(25000);
  });

  it('agrège fidèlement les flux d’échanges transfrontaliers', () => {
    const rawBreakdown = {
      zone: 'FR',
      powerExportBreakdown: {
        GB: 2000,
        IT: 1500,
      },
      powerImportBreakdown: {
        DE: 500,
      },
    };

    const snapshot = normalizeCountrySnapshot('FR', rawBreakdown as any, null);
    expect(snapshot.exchangeFlows).toHaveLength(3);
    const gbFlow = snapshot.exchangeFlows.find((f) => f.toZone === 'GB');
    expect(gbFlow?.flowMW).toBe(2000);
  });

  it('calcule la synthèse européenne pondérée par la consommation', () => {
    const rawSnapshots: Record<string, any> = {
      FR: {
        countryCode: 'FR',
        carbonIntensity: 40,
        totalConsumption: 50000,
        totalProduction: 55000,
        renewablePercentage: 25,
        fossilFreePercentage: 90,
      },
      DE: {
        countryCode: 'DE',
        carbonIntensity: 400,
        totalConsumption: 50000,
        totalProduction: 50000,
        renewablePercentage: 55,
        fossilFreePercentage: 55,
      },
    };

    const summary = computeEUSummary(rawSnapshots);
    // Moyenne pondérée = (40 * 50000 + 400 * 50000) / 100000 = 220 gCO2eq/kWh
    expect(summary.averageCarbonIntensity).toBe(220);
    expect(summary.coveredCountriesCount).toBe(2);
  });
});
