import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { buildThemeTokens, DEFAULT_CUSTOM_THEME, PRESET_THEMES, THEME_STORAGE_KEY } from '../theme/themeConfig';
import { ensureAccessibleTextColor, normalizeHexColor } from '../theme/themeUtils';

const ThemeContext = createContext(null);

function getSystemTheme() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredTheme() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return {
      themeName: ['light', 'dark', 'custom', 'system'].includes(parsed?.themeName) ? parsed.themeName : 'system',
      customTheme: {
        primary: normalizeHexColor(parsed?.customTheme?.primary, DEFAULT_CUSTOM_THEME.primary),
        background: normalizeHexColor(parsed?.customTheme?.background, DEFAULT_CUSTOM_THEME.background),
        text: normalizeHexColor(parsed?.customTheme?.text, DEFAULT_CUSTOM_THEME.text),
      },
    };
  } catch {
    return null;
  }
}

function applyTokens(tokens, resolvedTheme) {
  const root = document.documentElement;
  Object.entries(tokens).forEach(([token, value]) => {
    root.style.setProperty(token, value);
  });

  root.setAttribute('data-theme', resolvedTheme);
  root.style.colorScheme = resolvedTheme === 'light' ? 'light' : 'dark';
}

export function ThemeProvider({ children }) {
  const stored = readStoredTheme();
  const [themeName, setThemeName] = useState(stored?.themeName || 'system');
  const [customTheme, setCustomTheme] = useState(stored?.customTheme || DEFAULT_CUSTOM_THEME);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setSystemTheme(event.matches ? 'dark' : 'light');
    query.addEventListener('change', onChange);

    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme = themeName === 'system' ? systemTheme : themeName;

  const tokens = useMemo(() => {
    return buildThemeTokens(resolvedTheme === 'custom' ? 'custom' : resolvedTheme, customTheme);
  }, [customTheme, resolvedTheme]);

  useEffect(() => {
    applyTokens(tokens, resolvedTheme);
  }, [tokens, resolvedTheme]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const safeCustomTheme = {
      primary: normalizeHexColor(customTheme.primary, DEFAULT_CUSTOM_THEME.primary),
      background: normalizeHexColor(customTheme.background, DEFAULT_CUSTOM_THEME.background),
      text: ensureAccessibleTextColor(customTheme.background, customTheme.text),
    };

    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({
      themeName,
      customTheme: safeCustomTheme,
    }));
  }, [customTheme, themeName]);

  const updateCustomTheme = (nextColors) => {
    setCustomTheme((current) => {
      const merged = {
        ...current,
        ...nextColors,
      };

      const safeBackground = normalizeHexColor(merged.background, DEFAULT_CUSTOM_THEME.background);

      return {
        primary: normalizeHexColor(merged.primary, DEFAULT_CUSTOM_THEME.primary),
        background: safeBackground,
        text: ensureAccessibleTextColor(safeBackground, merged.text),
      };
    });

    if (themeName !== 'custom') {
      setThemeName('custom');
    }
  };

  const value = useMemo(() => ({
    customTheme,
    predefinedThemes: Object.keys(PRESET_THEMES),
    resolvedTheme,
    setThemeName,
    themeName,
    updateCustomTheme,
  }), [customTheme, resolvedTheme, themeName]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return context;
}
