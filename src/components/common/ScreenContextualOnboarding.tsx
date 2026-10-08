import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Lightbulb,
  Scale,
  ShieldCheck,
  Compass,
  Zap,
  BarChart3,
  Globe2,
  Leaf,
  Flame,
  ArrowRightLeft,
  ExternalLink,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { SCREEN_ONBOARDING_DATA, ScreenOnboardingInfo, ScreenOnboardingStep } from '../../data/screenOnboardingData';

interface ScreenContextualOnboardingProps {
  screenId: string;
  onOpenLegal?: () => void;
  className?: string;
  forceOpen?: boolean;
  onToggleOpen?: (isOpen: boolean) => void;
}

const getStorageKey = (screenId: string) => `eu_screen_guide_dismissed_${screenId}_v1`;

export const ScreenContextualOnboarding: React.FC<ScreenContextualOnboardingProps> = ({
  screenId,
  onOpenLegal,
  className = '',
  forceOpen,
  onToggleOpen,
}) => {
  const guideData: ScreenOnboardingInfo | undefined = SCREEN_ONBOARDING_DATA[screenId];

  // État d'ouverture (ouvert par défaut tant que l'utilisateur ne l'a pas explicitement réduit/masqué)
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const isDismissed = localStorage.getItem(getStorageKey(screenId)) === 'true';
      return !isDismissed;
    }
    return true;
  });

  const [dontShowAgain, setDontShowAgain] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(getStorageKey(screenId)) === 'true';
    }
    return false;
  });

  // Gestion du forçage externe (ex: clic dans la Navbar ou le menu)
  useEffect(() => {
    if (forceOpen !== undefined) {
      setIsOpen(forceOpen);
    }
  }, [forceOpen]);

  // Synchronisation lors du changement d'écran
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDismissed = localStorage.getItem(getStorageKey(screenId)) === 'true';
      setIsOpen(!isDismissed);
      setDontShowAgain(isDismissed);
    }
  }, [screenId]);

  if (!guideData) return null;

  const handleClose = () => {
    setIsOpen(false);
    onToggleOpen?.(false);
  };

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    onToggleOpen?.(nextState);
  };

  const handleToggleDontShowAgain = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setDontShowAgain(checked);
    if (checked) {
      localStorage.setItem(getStorageKey(screenId), 'true');
    } else {
      localStorage.removeItem(getStorageKey(screenId));
    }
  };

  const MainIcon = guideData.mainIcon;

  // Rendu de l'icône d'étape
  const renderStepIcon = (iconName: ScreenOnboardingStep['iconName']) => {
    switch (iconName) {
      case 'zap':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'chart':
        return <BarChart3 className="w-4 h-4 text-sky-500" />;
      case 'shield':
        return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
      case 'compass':
        return <Compass className="w-4 h-4 text-indigo-500" />;
      case 'globe':
        return <Globe2 className="w-4 h-4 text-blue-500" />;
      case 'leaf':
        return <Leaf className="w-4 h-4 text-emerald-500" />;
      case 'flame':
        return <Flame className="w-4 h-4 text-rose-500" />;
      case 'arrows':
        return <ArrowRightLeft className="w-4 h-4 text-cyan-500" />;
      case 'sparkles':
      default:
        return <Sparkles className="w-4 h-4 text-amber-500" />;
    }
  };

  // 1. Vue Réduite / Discrète
  if (!isOpen) {
    return (
      <div className={`flex items-center justify-between gap-3 p-2.5 sm:px-4 rounded-xl bg-sky-50/70 dark:bg-slate-800/80 border border-sky-100 dark:border-slate-700/80 shadow-2xs transition-all ${className}`}>
        <button
          onClick={handleToggle}
          className="flex items-center gap-2.5 text-left group cursor-pointer flex-1"
          aria-expanded="false"
          aria-label={`Ouvrir le guide contextuel pour ${guideData.title}`}
        >
          <div className="w-6 h-6 rounded-lg bg-sky-600/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition shrink-0">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 animate-pulse" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
              Guide de l'écran : {guideData.title}
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300">
              3 repères clés
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleToggle}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-slate-700/80 transition cursor-pointer"
          >
            <span>Afficher le guide</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // 2. Vue Dépliée / Complète
  return (
    <section
      aria-label={`Guide d'onboarding : ${guideData.title}`}
      className={`rounded-2xl border border-sky-200/90 dark:border-sky-900/60 bg-gradient-to-br from-white via-sky-50/40 to-indigo-50/30 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-950 shadow-sm overflow-hidden transition-all duration-200 ${className}`}
    >
      {/* En-tête du guide */}
      <div className="p-4 sm:p-5 border-b border-sky-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20 shrink-0 mt-0.5">
            <MainIcon className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                {guideData.badge}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Guide & repères méthodologiques
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
              {guideData.title}
            </h2>
            <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Objectif :</span> {guideData.objective}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            onClick={handleClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Réduire ce guide"
            aria-label="Réduire le guide contextuel"
          >
            <span>Réduire</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Les 3 Étapes / Repères clés */}
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
          {guideData.steps.map((step, idx) => (
            <div
              key={step.id}
              className="flex flex-col justify-between p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs hover:border-sky-300 dark:hover:border-sky-700 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700/80 flex items-center justify-center">
                    {renderStepIcon(step.iconName)}
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 font-mono">
                    0{idx + 1}
                  </span>
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {step.title}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                  {step.description}
                </p>
              </div>

              {step.highlightText && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-start gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {step.highlightText}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bloc Astuce & Méthodologie */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-sky-100 dark:border-slate-800">
          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200">
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-[11px] uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Astuce d'utilisation
              </span>
              <p className="text-[11px] sm:text-xs leading-relaxed mt-0.5 text-amber-900/90 dark:text-amber-200/90">
                {guideData.proTip}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
            <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Transparence & Données
              </span>
              <p className="text-[11px] sm:text-xs leading-relaxed mt-0.5 text-slate-500 dark:text-slate-400">
                {guideData.methodologyNote}
              </p>
            </div>
          </div>
        </div>

        {/* Pied du guide avec action "Ne plus afficher automatiquement" et fermeture */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-sky-100 dark:border-slate-800/80">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-500 dark:text-slate-400 select-none hover:text-slate-700 dark:hover:text-slate-200 transition">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={handleToggleDontShowAgain}
              className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-600 dark:bg-slate-800"
            />
            <span>Garder réduit par défaut sur cet écran</span>
          </label>

          <div className="flex items-center gap-2.5">
            {onOpenLegal && (
              <button
                onClick={onOpenLegal}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition cursor-pointer flex items-center gap-1"
              >
                <Scale className="w-3.5 h-3.5 text-amber-500" />
                <span>Mentions légales & sources</span>
              </button>
            )}

            <button
              onClick={handleClose}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition cursor-pointer"
            >
              Compris ! Réduire le guide
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
