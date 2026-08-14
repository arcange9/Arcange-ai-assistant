import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { Theme } from '../types';

export function useTheme() {
  const { theme, setTheme } = useSettingsStore();

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (targetTheme: Theme) => {
      if (targetTheme === 'dark') {
        root.classList.add('dark');
      } else if (targetTheme === 'light') {
        root.classList.remove('dark');
      } else if (targetTheme === 'system') {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };

    applyTheme(theme);

    // System theme listener
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        if (e.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  };
}
