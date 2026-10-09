import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showBadge?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className = '',
  size = 'md',
  showText = false,
  showBadge = false,
}) => {
  const sizeMap = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-16 h-16',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`${sizeMap[size]} rounded-xl overflow-hidden shadow-md shadow-sky-600/20 shrink-0 relative bg-gradient-to-tr from-sky-600 to-indigo-700 flex items-center justify-center`}
      >
        <img
          src="/logo.svg"
          alt="EU Energy Map Logo"
          className="w-full h-full object-cover"
          loading="eager"
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              EU Energy Map
            </span>
            {showBadge && (
              <span className="text-[10px] font-semibold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                27 UE
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 -mt-0.5">
            Tableau de bord factuel de l'électricité
          </span>
        </div>
      )}
    </div>
  );
};
