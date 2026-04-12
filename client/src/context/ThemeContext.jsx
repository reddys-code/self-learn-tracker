import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { buildThemeTokens, DEFAULT_CUSTOM_THEME, PRESET_THEMES, THEME_STORAGE_KEY } from '../theme/themeConfig';
import { ensureAccessibleTextColor, normalizeHexColor } from '../theme/themeUtils';
import { useAuth } from './AuthContext';
import { apiClient } from '../api/client';

const ThemeContext = createContext(null);

function getSystemTheme() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredTheme(storageKey) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
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
  const { user } = useAuth();
  const [themeName, setThemeName] = useState('system');
  const [customTheme, setCustomTheme] = useState(DEFAULT_CUSTOM_THEME);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const lastSyncedPayload = useRef('');

  const storageKey = useMemo(() => {
    const identity = user?.id || user?._id || user?.email || user?.username;
    if (!identity) return THEME_STORAGE_KEY;
    return `${THEME_STORAGE_KEY}:${String(identity).toLowerCase()}`;
  }, [user]);

  useEffect(() => {
    lastSyncedPayload.current = '';
  }, [user?.id]);

  useEffect(() => {
    const serverTheme = user?.themePreference
      ? {
        themeName: ['light', 'dark', 'custom', 'system'].includes(user.themePreference.themeName)
          ? user.themePreference.themeName
          : 'system',
        customTheme: {
          primary: normalizeHexColor(user.themePreference?.customTheme?.primary, DEFAULT_CUSTOM_THEME.primary),
          background: normalizeHexColor(user.themePreference?.customTheme?.background, DEFAULT_CUSTOM_THEME.background),
          text: normalizeHexColor(user.themePreference?.customTheme?.text, DEFAULT_CUSTOM_THEME.text),
        },
      }
      : null;

    const stored = serverTheme
      || readStoredTheme(storageKey)
      || (storageKey !== THEME_STORAGE_KEY ? readStoredTheme(THEME_STORAGE_KEY) : null);

    if (stored) {
      setThemeName(stored.themeName);
      setCustomTheme(stored.customTheme);
      return;
    }

    setThemeName('system');
    setCustomTheme(DEFAULT_CUSTOM_THEME);
  }, [storageKey]);

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

    window.localStorage.setItem(storageKey, JSON.stringify({
      themeName,
      customTheme: safeCustomTheme,
    }));
  }, [customTheme, storageKey, themeName]);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    const payload = {
      themePreference: {
        themeName,
        customTheme: {
          primary: normalizeHexColor(customTheme.primary, DEFAULT_CUSTOM_THEME.primary),
          background: normalizeHexColor(customTheme.background, DEFAULT_CUSTOM_THEME.background),
          text: ensureAccessibleTextColor(customTheme.background, customTheme.text),
        },
      },
    };

    const payloadHash = JSON.stringify(payload);
    if (payloadHash === lastSyncedPayload.current) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void apiClient.patch('/auth/me/theme', payload)
        .then(() => {
          lastSyncedPayload.current = payloadHash;
        })
        .catch(() => {
          // Keep local storage as fallback when backend sync fails.
        });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [customTheme, themeName, user?.id]);

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
