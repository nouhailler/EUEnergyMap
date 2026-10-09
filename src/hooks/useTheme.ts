import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'eu_energy_theme_mode_v1';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    }
    return 'system';
  });

  const applyTheme = useCallback((targetTheme: ThemeMode) => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const isDark =
      targetTheme === 'dark' ||
      (targetTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.colorScheme = 'light';
    }

    // Mise à jour de la couleur de statut meta
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#0f172a' : '#0284c7');
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    // Écouter les changements système si le thème est configuré sur 'system'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [theme, applyTheme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isDarkMode =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDarkMode,
  };
}
