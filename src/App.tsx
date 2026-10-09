import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CountryElectricitySnapshot,
  IndicatorMode,
} from './types/energy';
import { EU_COUNTRIES } from './data/euCountries';
import { computeEUSummary } from './services/electricityMaps/normalizers';
import { emapsClient, EUSummaryResponse } from './services/electricityMaps/client';
import { Navbar } from './components/common/Navbar';
import { EUSummaryCards } from './components/europe/EUSummaryCards';
import { EUEnergyMap } from './components/europe/EUEnergyMap';
import { EUTable } from './components/europe/EUTable';
import { CountryDetailView } from './components/countries/CountryDetailView';
import { CompareView } from './components/compare/CompareView';
import { CarbonView } from './components/carbon/CarbonView';
import { RenewablesView } from './components/renewables/RenewablesView';
import { FlowsView } from './components/flows/FlowsView';
import { DayTimelineView } from './components/timeline/DayTimelineView';
import { Footer } from './components/common/Footer';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { DataProvenanceBanner } from './components/common/DataProvenanceBanner';
import { OnboardingLegalModal, ONBOARDING_STORAGE_KEY } from './components/common/OnboardingLegalModal';
import { ScreenContextualOnboarding } from './components/common/ScreenContextualOnboarding';
import { ScreenOnboardingModal } from './components/common/ScreenOnboardingModal';
import { SystemSettingsModal } from './components/common/SystemSettingsModal';

const POLLING_INTERVAL_SECONDS = 300; // 5 minutes

export default function App() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('FR');
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorMode>('carbonIntensity');

  const [snapshots, setSnapshots] = useState<Record<string, CountryElectricitySnapshot>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDemoFallback, setIsDemoFallback] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [dataTimestamp, setDataTimestamp] = useState<string | null>(null);
  const [retrievedAt, setRetrievedAt] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('Référence locale');

  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState<number>(POLLING_INTERVAL_SECONDS);

  // État de l'onboarding et des mentions légales
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ONBOARDING_STORAGE_KEY) !== 'true';
    }
    return false;
  });
  const [onboardingInitialStep, setOnboardingInitialStep] = useState<number>(0);

  const handleOpenLegal = useCallback(() => {
    setOnboardingInitialStep(2);
    setIsOnboardingOpen(true);
  }, []);

  const handleOpenOnboarding = useCallback(() => {
    setOnboardingInitialStep(0);
    setIsOnboardingOpen(true);
  }, []);

  // Déclenchement de l'onboarding contextuel de l'écran courant (modal dédié)
  const [isScreenGuideOpen, setIsScreenGuideOpen] = useState<boolean>(false);
  const handleOpenScreenGuide = useCallback(() => {
    setIsScreenGuideOpen(true);
  }, []);

  // Déclenchement du menu Paramètres Système
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  // Synchronisation URL -> État
  useEffect(() => {
    const handleUrlChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash.startsWith('country/')) {
        const code = hash.split('/')[1]?.toUpperCase();
        if (code && EU_COUNTRIES.some((c) => c.code === code)) {
          setSelectedCountryCode(code);
          setCurrentView('country');
          return;
        }
      }
      if (['timeline', 'compare', 'carbon', 'renewables', 'flows'].includes(hash)) {
        setCurrentView(hash);
      } else {
        setCurrentView('dashboard');
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Navigation contrôlée
  const handleNavigate = useCallback((view: string, param?: string) => {
    setCurrentView(view);
    if (view === 'country' && param) {
      setSelectedCountryCode(param);
      window.location.hash = `country/${param.toLowerCase()}`;
    } else if (view === 'dashboard') {
      window.location.hash = '';
    } else {
      window.location.hash = view;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSelectCountry = useCallback((code: string) => {
    handleNavigate('country', code);
  }, [handleNavigate]);

  // Chargement des données
  const loadData = useCallback(async (force = false) => {
    try {
      setIsRefreshing(true);
      const res: EUSummaryResponse = await emapsClient.getEUSummary(force);
      setSnapshots(res.snapshots);
      setIsDemoFallback(res.isDemoFallback);
      setLastUpdated(res.retrievedAt || res.timestamp);
      setDataTimestamp(res.dataTimestamp || res.snapshots['FR']?.dataTimestamp || res.snapshots['FR']?.datetime || '2024-03-24T12:00:00.000Z');
      setRetrievedAt(res.retrievedAt || res.timestamp || new Date().toISOString());
      setDataSource(res.source || (res.isDemoFallback ? 'Référence locale' : 'Electricity Maps API (Live)'));
      setSecondsUntilRefresh(POLLING_INTERVAL_SECONDS);
    } catch (err) {
      console.error('Erreur de chargement des données:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Polling automatique respectueux
  useEffect(() => {
    loadData();

    const timer = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          loadData(true);
          return POLLING_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loadData]);

  // Calcul du résumé européen agrégé
  const euSummary = useMemo(() => computeEUSummary(snapshots), [snapshots]);

  const activeCountrySnapshot = snapshots[selectedCountryCode];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Barre de navigation principale */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        secondsUntilRefresh={secondsUntilRefresh}
        onManualRefresh={() => loadData(true)}
        isRefreshing={isRefreshing}
        isDemoFallback={isDemoFallback}
        lastUpdated={lastUpdated}
        dataTimestamp={dataTimestamp}
        retrievedAt={retrievedAt}
        dataSource={dataSource}
        onOpenLegal={handleOpenLegal}
        onOpenOnboarding={handleOpenOnboarding}
        onOpenScreenGuide={handleOpenScreenGuide}
        onOpenSettings={handleOpenSettings}
      />

      {/* Contenu principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <ErrorBoundary>
        {isLoading && Object.keys(snapshots || {}).length === 0 ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 font-medium">
              Synchronisation des réseaux électriques des 27 pays de l'UE...
            </p>
          </div>
        ) : (
          <>
            {/* Vue Dashboard : Carte + Synthèse + Tableau */}
            {currentView === 'dashboard' && (
              <div className="space-y-6">
                {/* Bandeau d'intégrité et de traçabilité certifiée : Donnée vs Récupérée vs Source */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isDemoFallback ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
                      }`}
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        {isDemoFallback ? 'Jeu de données de secours certifié' : 'Données API Réseau en direct'}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block -mt-0.5">
                        Consolidation européenne des 27 réseaux interconnectés
                      </span>
                    </div>
                  </div>
                  <DataProvenanceBanner
                    dataTimestamp={dataTimestamp}
                    retrievedAt={retrievedAt}
                    source={dataSource}
                    variant="inline"
                  />
                </div>

                {/* Guide d'onboarding contextuel : Vue Dashboard & Carte */}
                <ScreenContextualOnboarding
                  screenId="dashboard"
                  onOpenLegal={handleOpenLegal}
                  onOpenGuideModal={handleOpenScreenGuide}
                />

                <EUSummaryCards
                  averageCarbonIntensity={euSummary.averageCarbonIntensity}
                  totalConsumptionMW={euSummary.totalConsumptionMW}
                  totalProductionMW={euSummary.totalProductionMW}
                  totalRenewableProductionMW={euSummary.totalRenewableProductionMW}
                  totalFossilFreeProductionMW={euSummary.totalFossilFreeProductionMW}
                  averageRenewableShare={euSummary.averageRenewableShare}
                  averageFossilFreeShare={euSummary.averageFossilFreeShare}
                  coveredCountriesCount={euSummary.coveredCountriesCount}
                />

                <ErrorBoundary>
                  <EUEnergyMap
                    snapshots={snapshots}
                    selectedIndicator={selectedIndicator}
                    onSelectIndicator={setSelectedIndicator}
                    onSelectCountry={handleSelectCountry}
                  />
                </ErrorBoundary>

                <EUTable
                  snapshots={snapshots}
                  onSelectCountry={handleSelectCountry}
                />
              </div>
            )}

            {/* Vue Fiche Pays */}
            {currentView === 'country' && activeCountrySnapshot && (
              <div className="space-y-6">
                {/* Guide d'onboarding contextuel : Fiche Pays */}
                <ScreenContextualOnboarding
                  screenId="country"
                  onOpenLegal={handleOpenLegal}
                  onOpenGuideModal={handleOpenScreenGuide}
                />
                <CountryDetailView
                  snapshot={activeCountrySnapshot}
                  onBack={() => handleNavigate('dashboard')}
                  onSelectCountry={handleSelectCountry}
                  onNavigate={handleNavigate}
                />
              </div>
            )}

            {/* Vue Comparateur */}
            {currentView === 'compare' && (
              <div className="space-y-6">
                {/* Guide d'onboarding contextuel : Comparateur */}
                <ScreenContextualOnboarding
                  screenId="compare"
                  onOpenLegal={handleOpenLegal}
                  onOpenGuideModal={handleOpenScreenGuide}
                />
                <CompareView
                  snapshots={snapshots}
                  onSelectCountry={handleSelectCountry}
                />
              </div>
            )}

            {/* Vue Focus Carbone */}
            {currentView === 'carbon' && (
              <div className="space-y-6">
                {/* Guide d'onboarding contextuel : Observatoire Carbone */}
                <ScreenContextualOnboarding
                  screenId="carbon"
                  onOpenLegal={handleOpenLegal}
                  onOpenGuideModal={handleOpenScreenGuide}
                />
                <CarbonView
                  snapshots={snapshots}
                  onSelectCountry={handleSelectCountry}
                  onNavigate={handleNavigate}
                />
              </div>
            )}

            {/* Vue Focus Renouvelables */}
            {currentView === 'renewables' && (
              <div className="space-y-6">
                {/* Guide d'onboarding contextuel : Renouvelables */}
                <ScreenContextualOnboarding
                  screenId="renewables"
                  onOpenLegal={handleOpenLegal}
                  onOpenGuideModal={handleOpenScreenGuide}
                />
                <RenewablesView
                  snapshots={snapshots}
                  onSelectCountry={handleSelectCountry}
                />
              </div>
            )}

            {/* Vue Flux & Interconnexions */}
            {currentView === 'flows' && (
              <div className="space-y-6">
                {/* Guide d'onboarding contextuel : Flux & Interconnexions */}
                <ScreenContextualOnboarding
                  screenId="flows"
                  onOpenLegal={handleOpenLegal}
                  onOpenGuideModal={handleOpenScreenGuide}
                />
                <FlowsView
                  snapshots={snapshots}
                  onSelectCountry={handleSelectCountry}
                />
              </div>
            )}

            {/* Vue Journée Électrique (Timeline 24h) */}
            {currentView === 'timeline' && (
              <div className="space-y-6">
                {/* Guide d'onboarding contextuel : Chronologie 24h */}
                <ScreenContextualOnboarding
                  screenId="timeline"
                  onOpenLegal={handleOpenLegal}
                  onOpenGuideModal={handleOpenScreenGuide}
                />
                <DayTimelineView
                  snapshots={snapshots}
                  selectedCountryCode={selectedCountryCode}
                  onSelectCountry={handleSelectCountry}
                  onNavigate={handleNavigate}
                />
              </div>
            )}
          </>
        )}
        </ErrorBoundary>
      </main>

      {/* Indicateur PWA Hors-Ligne */}
      <OfflineIndicator />

      {/* Pied de page & Attribution Electricity Maps */}
      <Footer
        onOpenLegal={handleOpenLegal}
        onOpenOnboarding={handleOpenOnboarding}
        onOpenScreenGuide={handleOpenScreenGuide}
      />

      {/* Modale d'accueil et Mentions Légales */}
      <OnboardingLegalModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        initialStep={onboardingInitialStep}
      />

      {/* Modale d'Onboarding Contextuel par Écran */}
      <ScreenOnboardingModal
        isOpen={isScreenGuideOpen}
        onClose={() => setIsScreenGuideOpen(false)}
        currentScreenId={currentView}
        onNavigateScreen={handleNavigate}
        onOpenLegal={handleOpenLegal}
      />

      {/* Modale des Paramètres Système (Mises à jour, Thème, Version) */}
      <SystemSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenLegal={handleOpenLegal}
        dataSource={dataSource}
        dataTimestamp={dataTimestamp}
        isDemoFallback={isDemoFallback}
      />
    </div>
  );
}
