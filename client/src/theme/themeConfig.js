import { createCustomThemeTokens, ensureAccessibleTextColor } from './themeUtils';

export const THEME_STORAGE_KEY = 'education-portal-theme';

export const DEFAULT_CUSTOM_THEME = {
  primary: '#0f766e',
  background: '#111827',
  text: '#f8fafc',
};

export const THEME_OPTIONS = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'Custom', value: 'custom' },
];

export const PRESET_THEMES = {
  light: {
    '--color-primary': '#0f766e',
    '--color-bg': '#f5f7fb',
    '--color-bg-alt': '#e8eef8',
    '--color-surface': '#ffffff',
    '--color-surface-2': '#eef3fb',
    '--color-text': '#0f172a',
    '--color-text-muted': '#475569',
    '--color-border': '#cbd5e1',
    '--focus-ring': '#2dd4bf',

    '--bg': '#e8eef8',
    '--bg-2': '#dce7f7',
    '--panel': '#ffffff',
    '--card': '#ffffff',
    '--ink': '#0f172a',
    '--muted': '#475569',
    '--line': 'rgba(15, 23, 42, 0.16)',
    '--shadow': '0 14px 34px rgba(15, 23, 42, 0.14)',
    '--phase1': '#0b84f3',
    '--phase2': '#0f766e',
    '--phase3': '#d97706',
    '--phase4': '#dc2626',
    '--white': '#0f172a',
  },
  dark: {
    '--color-primary': '#22c55e',
    '--color-bg': '#0b1320',
    '--color-bg-alt': '#101b2f',
    '--color-surface': '#13233a',
    '--color-surface-2': '#172d48',
    '--color-text': '#f8fafc',
    '--color-text-muted': '#c2d2e8',
    '--color-border': '#34475f',
    '--focus-ring': '#4ade80',

    '--bg': '#0d2344',
    '--bg-2': '#102d57',
    '--panel': '#0f1f33',
    '--card': '#f7f9fc',
    '--ink': '#17233a',
    '--muted': '#cad5ea',
    '--line': 'rgba(255, 255, 255, 0.12)',
    '--shadow': '0 18px 45px rgba(8, 16, 36, 0.32)',
    '--phase1': '#2e6ca5',
    '--phase2': '#1aa9a1',
    '--phase3': '#f0b13b',
    '--phase4': '#e64b67',
    '--white': '#ffffff',
  },
};

export function buildThemeTokens(themeName, customTheme = DEFAULT_CUSTOM_THEME) {
  if (themeName === 'custom') {
    return createCustomThemeTokens({
      primary: customTheme.primary,
      background: customTheme.background,
      text: ensureAccessibleTextColor(customTheme.background, customTheme.text),
    });
  }

  return PRESET_THEMES[themeName] || PRESET_THEMES.dark;
}
