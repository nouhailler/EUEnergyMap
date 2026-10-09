import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  Scale,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Compass,
  ArrowRight,
  Zap,
  BarChart3,
  ShieldCheck,
  Globe2,
  Leaf,
  Flame,
  ArrowRightLeft,
} from 'lucide-react';
import {
  SCREEN_ONBOARDING_DATA,
  ScreenOnboardingInfo,
  ScreenOnboardingStep,
} from '../../data/screenOnboardingData';

interface ScreenOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreenId: string;
  onNavigateScreen?: (screenId: string) => void;
  onOpenLegal?: () => void;
}

export const ScreenOnboardingModal: React.FC<ScreenOnboardingModalProps> = ({
  isOpen,
  onClose,
  currentScreenId,
  onNavigateScreen,
  onOpenLegal,
}) => {
  const [selectedScreenId, setSelectedScreenId] = useState<string>(currentScreenId || 'dashboard');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Synchroniser avec l'écran actuel dès l'ouverture
  useEffect(() => {
    if (isOpen) {
      setSelectedScreenId(currentScreenId || 'dashboard');
      setCurrentStepIndex(0);
    }
  }, [isOpen, currentScreenId]);

  // Fermeture via touche Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeScreenData: ScreenOnboardingInfo =
    SCREEN_ONBOARDING_DATA[selectedScreenId] || SCREEN_ONBOARDING_DATA['dashboard'];

  const steps = activeScreenData.steps || [];
  const activeStep: ScreenOnboardingStep | undefined = steps[currentStepIndex] || steps[0];
  const MainIcon = activeScreenData.mainIcon;

  const allScreenTabs = [
    { id: 'dashboard', label: 'Europe & Carte', icon: Globe2 },
    { id: 'country', label: 'Fiche Pays', icon: Compass },
    { id: 'compare', label: 'Comparateur', icon: BarChart3 },
    { id: 'carbon', label: 'Carbone', icon: Flame },
    { id: 'renewables', label: 'Renouvelables', icon: Leaf },
    { id: 'flows', label: 'Flux & Échanges', icon: ArrowRightLeft },
    { id: 'timeline', label: 'Chronologie 24h', icon: Sparkles },
  ];

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleTabChange = (screenId: string) => {
    setSelectedScreenId(screenId);
    setCurrentStepIndex(0);
  };

  const handleGoToScreen = () => {
    if (onNavigateScreen && selectedScreenId !== currentScreenId) {
      onNavigateScreen(selectedScreenId);
    }
    onClose();
  };

  const renderStepIcon = (iconName: ScreenOnboardingStep['iconName']) => {
    switch (iconName) {
      case 'zap':
        return <Zap className="w-5 h-5 text-amber-500" />;
      case 'chart':
        return <BarChart3 className="w-5 h-5 text-sky-500" />;
      case 'shield':
        return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
      case 'compass':
        return <Compass className="w-5 h-5 text-indigo-500" />;
      case 'globe':
        return <Globe2 className="w-5 h-5 text-blue-500" />;
      case 'leaf':
        return <Leaf className="w-5 h-5 text-emerald-500" />;
      case 'flame':
        return <Flame className="w-5 h-5 text-rose-500" />;
      case 'arrows':
        return <ArrowRightLeft className="w-5 h-5 text-cyan-500" />;
      case 'sparkles':
      default:
        return <Sparkles className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="screen-onboarding-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* En-tête de la modale */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20 shrink-0">
              <MainIcon className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  {activeScreenData.badge}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Guide contextuel
                </span>
              </div>
              <h2
                id="screen-onboarding-modal-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5"
              >
                {activeScreenData.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Fermer le guide"
            aria-label="Fermer le guide d'écran"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barre d'onglets pour naviguer entre les différents écrans */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/50 p-1.5 gap-1 shrink-0 overflow-x-auto no-scrollbar">
          {allScreenTabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = selectedScreenId === tab.id;
            const isCurrentScreen = currentScreenId === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {isCurrentScreen && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5" title="Écran actif" />
                )}
              </button>
            );
          })}
        </div>

        {/* Corps défilable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-700 dark:text-slate-300 text-sm flex-1">
          {/* Objectif principal de l'écran */}
          <div className="p-3.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/60 text-xs">
            <span className="font-bold text-sky-900 dark:text-sky-200 block mb-0.5">
              🎯 Objectif de cet écran :
            </span>
            <p className="text-sky-950/90 dark:text-sky-200/90 leading-relaxed">
              {activeScreenData.objective}
            </p>
          </div>

          {/* Stepper / Indicateur d'étape */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Repère clé {currentStepIndex + 1} sur {steps.length}
            </span>
            <div className="flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentStepIndex
                      ? 'w-6 bg-sky-600 dark:bg-sky-400'
                      : 'w-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'
                  }`}
                  aria-label={`Aller au repère ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Carte du repère clé actif */}
          {activeStep && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700/80 flex items-center justify-center shrink-0 mt-0.5">
                  {renderStepIcon(activeStep.iconName)}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono">
                    ÉTAPE 0{currentStepIndex + 1}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {activeStep.title}
                  </h3>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeStep.description}
              </p>

              {activeStep.highlightText && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 flex items-start gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {activeStep.highlightText}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Astuce et Transparence */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Astuce d'utilisation</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-950/90 dark:text-amber-200/90">
                {activeScreenData.proTip}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                <Scale className="w-3.5 h-3.5 text-sky-500" />
                <span>Transparence & Données</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                {activeScreenData.methodologyNote}
              </p>
            </div>
          </div>
        </div>

        {/* Pied de page et Boutons d'action */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            {onOpenLegal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenLegal();
                }}
                className="text-xs text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 transition cursor-pointer flex items-center gap-1"
              >
                <Scale className="w-3.5 h-3.5 text-amber-500" />
                <span>Mentions légales & sources</span>
              </button>
            )}

            {selectedScreenId !== currentScreenId && onNavigateScreen && (
              <button
                onClick={handleGoToScreen}
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Accéder à cette vue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className="px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Précédent</span>
            </button>

            {currentStepIndex < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1"
              >
                <span>Suivant</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Compris !</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
