import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Scale,
  FileText,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  Zap,
  Globe,
  Database,
  Info,
} from 'lucide-react';

export const ONBOARDING_STORAGE_KEY = 'eu_energy_onboarding_accepted_v1';
export const ONBOARDING_TIMESTAMP_KEY = 'eu_energy_onboarding_accepted_at';

interface OnboardingLegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStep?: number;
}

export const OnboardingLegalModal: React.FC<OnboardingLegalModalProps> = ({
  isOpen,
  onClose,
  initialStep = 0,
}) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(initialStep);
      // Vérifier si l'utilisateur avait déjà validé auparavant
      const alreadyAccepted = localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
      if (alreadyAccepted) {
        setHasAcknowledged(true);
      }
    }
  }, [isOpen, initialStep]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        // Permettre de fermer si déjà accepté
        if (localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true') {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAcceptAndClose = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    localStorage.setItem(ONBOARDING_TIMESTAMP_KEY, new Date().toISOString());
    onClose();
  };

  const steps = [
    {
      id: 'welcome',
      title: 'Bienvenue sur EU Energy Map',
      subtitle: 'Observatoire interactif des 27 réseaux électriques de l’Union européenne',
      icon: Globe,
    },
    {
      id: 'provenance',
      title: 'Origine des données & Méthodologie',
      subtitle: 'Sources officielles et agrégation physique en mégawatts (MW)',
      icon: Database,
    },
    {
      id: 'disclaimer',
      title: 'Mentions Légales & Non-Responsabilité',
      subtitle: 'Limitation expresse de responsabilité et conditions de consultation',
      icon: Scale,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* En-tête de la modale */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2
                id="onboarding-modal-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white"
              >
                Guide d'accueil & Mentions Légales
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span>Étape {currentStep + 1} sur {steps.length}</span>
                <span aria-hidden="true">·</span>
                <span>{steps[currentStep].title}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              // Si déjà accepté, on peut fermer directement
              if (localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true') {
                onClose();
              } else {
                // Si premier passage, aller à l'étape des mentions légales pour confirmation
                setCurrentStep(2);
              }
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Fermer ou passer"
            aria-label="Fermer la boîte de dialogue"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barre d'étapes / Onglets de navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/40 p-1.5 gap-1 shrink-0 overflow-x-auto">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isActive = currentStep === idx;
            return (
              <button
                key={s.id}
                onClick={() => setCurrentStep(idx)}
                className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
                <span className="truncate">{s.title.split('&')[0].trim()}</span>
              </button>
            );
          })}
        </div>

        {/* Corps défilable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-700 dark:text-slate-300 text-sm leading-relaxed flex-1">
          {/* Étape 1 : Bienvenue & Périmètre */}
          {currentStep === 0 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/60">
                <h3 className="text-sm font-bold text-sky-900 dark:text-sky-200 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                  Cartographie & Signaux Réseau des 27 pays de l'Union européenne
                </h3>
                <p className="mt-1.5 text-xs text-sky-950/80 dark:text-sky-200/80 leading-relaxed">
                  Cette application permet d’explorer la transition énergétique européenne à travers une cartographie interactive OpenStreetMap libre, le suivi de l’intensité carbone en temps réel (gCO₂eq/kWh), la répartition de la production par filière, les parts d'énergies renouvelables et bas-carbone, ainsi que les échanges d'électricité transfrontaliers.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Agrégation physique rigoureuse</span>
                  </div>
                  <p className="mt-1 text-slate-500 dark:text-slate-400 leading-relaxed">
                    Les parts européennes sont calculées sur les mégawatts (MW) cumulés et non par simple moyenne de pourcentages.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Zéro donnée inventée</span>
                  </div>
                  <p className="mt-1 text-slate-500 dark:text-slate-400 leading-relaxed">
                    Aucune interpolation fictive ni extrapolation artificielle : distinction nette entre date de mesure et date de synchronisation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Étape 2 : Origine des données & Partenariat */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 space-y-2">
                <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  Provenance des données : Electricity Maps
                </h3>
                <p className="text-xs text-amber-950/80 dark:text-amber-200/80 leading-relaxed">
                  L’ensemble des mesures électriques, intensités carbone, mix de production et flux physiques présentés dans cette interface proviennent directement de la plateforme :
                </p>
                <div className="pt-1">
                  <a
                    href="https://app.electricitymaps.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/80 text-sky-600 dark:text-sky-400 font-semibold text-xs hover:underline shadow-xs"
                  >
                    <span>https://app.electricitymaps.com/</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </a>
                </div>
              </div>

              <div className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
                <p>
                  <strong>Sources primaires sous-jacentes :</strong> Les données collectées par Electricity Maps émanent des gestionnaires de réseaux de transport (TSO / GRT) des pays membres de l'Union européenne, de la plateforme <em>ENTSO-E Transparency</em>, ainsi que de modèles d'émissions basés sur les méthodologies d'analyse de cycle de vie (ACV) du GIEC.
                </p>
                <p>
                  En cas d'indisponibilité temporaire du réseau ou d'absence de clé API en environnement local, l'application utilise un jeu de référence factuel certifié conservé en cache applicatif afin de maintenir une expérience fluide.
                </p>
              </div>
            </div>
          )}

          {/* Étape 3 : Mentions Légales & Non-Responsabilité */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60">
                <h3 className="text-sm font-bold text-rose-950 dark:text-rose-200 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  Clause de non-responsabilité (Disclaimer légal)
                </h3>
                <p className="mt-1.5 text-xs text-rose-950/80 dark:text-rose-200/80 leading-relaxed font-medium">
                  Veuillez lire attentivement la limitation de responsabilité suivante avant de poursuivre l'utilisation de l'application :
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs space-y-3">
                <div className="space-y-1.5">
                  <strong className="text-slate-900 dark:text-white block font-semibold">
                    1. Absence de garantie sur la pertinence et l'exactitude des données
                  </strong>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    <strong>L'auteur et éditeur de cette application décline expressément toute responsabilité quant à la pertinence, l'exactitude, l'exhaustivité, la fiabilité, la fraîcheur ou la continuité des données affichées.</strong> Les données sont restituées à titre purement informatif, éducatif et documentaire, sans aucune garantie expresse ou tacite.
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                  <strong className="text-slate-900 dark:text-white block font-semibold">
                    2. Attribution de la source
                  </strong>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Les données proviennent de la plateforme publique{' '}
                    <a
                      href="https://app.electricitymaps.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 dark:text-sky-400 underline font-medium"
                    >
                      https://app.electricitymaps.com/
                    </a>
                    . L'auteur de la présente application n'est ni affilié commercialement, ni mandaté par Electricity Maps ou par les gestionnaires de réseau (TSO / ENTSO-E). Pour toute donnée opposable, officielle ou décisionnelle, veuillez vous référer directement aux publications officielles des gestionnaires de réseaux nationaux.
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                  <strong className="text-slate-900 dark:text-white block font-semibold">
                    3. Exclusion de responsabilité pour l'usage fait des données
                  </strong>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    L'utilisation des informations et visualisations présentées relève de la seule et entière responsabilité de l'utilisateur. En aucun cas l'auteur ne saurait être tenu responsable d'un quelconque dommage direct, indirect, financier, décisionnel ou opérationnel résultant de l'accès à l'application ou de l'interprétation des données.
                  </p>
                </div>
              </div>

              {/* Case de confirmation explicite */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/30 cursor-pointer transition select-none">
                <input
                  type="checkbox"
                  checked={hasAcknowledged}
                  onChange={(e) => setHasAcknowledged(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer shrink-0"
                />
                <span className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                  J’ai pris connaissance des mentions légales et je reconnais expressément que l’auteur n’est pas responsable de la pertinence des données, lesquelles proviennent de{' '}
                  <span className="font-semibold text-sky-700 dark:text-sky-300">
                    https://app.electricitymaps.com/
                  </span>
                  .
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Pied de la modale avec boutons de navigation */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer flex-1 sm:flex-initial"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Précédent</span>
              </button>
            )}

            {currentStep < steps.length - 1 && (
              <button
                onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition cursor-pointer flex-1 sm:flex-initial"
              >
                <span>Suivant</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="w-full sm:w-auto flex items-center justify-end">
            <button
              onClick={handleAcceptAndClose}
              disabled={!hasAcknowledged && currentStep === 2}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                currentStep === 2 && !hasAcknowledged
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {currentStep === 2
                  ? 'J’ai compris & Accéder à l’application'
                  : 'Continuer vers les Mentions Légales'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
