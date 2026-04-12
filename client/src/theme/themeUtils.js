const HEX_COLOR_RE = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function expandHex(hexColor) {
  if (!HEX_COLOR_RE.test(hexColor)) {
    return null;
  }

  const normalized = hexColor.trim().toLowerCase();
  if (normalized.length === 7) {
    return normalized;
  }

  const [r, g, b] = normalized.slice(1);
  return `#${r}${r}${g}${g}${b}${b}`;
}

function toRgb(hexColor) {
  const hex = expandHex(hexColor);
  if (!hex) return null;

  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function toHex({ r, g, b }) {
  const parts = [r, g, b].map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'));
  return `#${parts.join('')}`;
}

function linearize(channel) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function getLuminance(hexColor) {
  const rgb = toRgb(hexColor);
  if (!rgb) return 0;

  return (0.2126 * linearize(rgb.r)) + (0.7152 * linearize(rgb.g)) + (0.0722 * linearize(rgb.b));
}

export function getContrastRatio(firstHex, secondHex) {
  const l1 = getLuminance(firstHex);
  const l2 = getLuminance(secondHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function ensureAccessibleTextColor(backgroundHex, preferredTextHex) {
  const bg = expandHex(backgroundHex) || '#111827';
  const preferred = expandHex(preferredTextHex) || '#f8fafc';
  if (getContrastRatio(bg, preferred) >= 4.5) {
    return preferred;
  }

  const whiteContrast = getContrastRatio(bg, '#ffffff');
  const blackContrast = getContrastRatio(bg, '#111111');
  return whiteContrast >= blackContrast ? '#ffffff' : '#111111';
}

export function blendColors(baseHex, mixHex, weight = 0.5) {
  const base = toRgb(baseHex) || { r: 17, g: 24, b: 39 };
  const mix = toRgb(mixHex) || { r: 255, g: 255, b: 255 };
  const mixWeight = clamp(weight, 0, 1);
  const baseWeight = 1 - mixWeight;

  return toHex({
    r: (base.r * baseWeight) + (mix.r * mixWeight),
    g: (base.g * baseWeight) + (mix.g * mixWeight),
    b: (base.b * baseWeight) + (mix.b * mixWeight),
  });
}

export function normalizeHexColor(hexColor, fallback) {
  return expandHex(hexColor) || fallback;
}

export function createCustomThemeTokens({ primary, background, text }) {
  const safePrimary = normalizeHexColor(primary, '#0f766e');
  const safeBackground = normalizeHexColor(background, '#111827');
  const safeText = ensureAccessibleTextColor(safeBackground, text);

  const surface = blendColors(safeBackground, '#ffffff', 0.08);
  const elevatedSurface = blendColors(safeBackground, '#ffffff', 0.14);
  const border = blendColors(safeText, safeBackground, 0.72);
  const mutedText = blendColors(safeText, safeBackground, 0.35);

  return {
    '--color-primary': safePrimary,
    '--color-bg': safeBackground,
    '--color-bg-alt': blendColors(safeBackground, '#000000', 0.1),
    '--color-surface': surface,
    '--color-surface-2': elevatedSurface,
    '--color-text': safeText,
    '--color-text-muted': mutedText,
    '--color-border': border,
    '--focus-ring': blendColors(safePrimary, '#ffffff', 0.24),

    '--bg': safeBackground,
    '--bg-2': blendColors(safeBackground, '#000000', 0.22),
    '--panel': surface,
    '--card': elevatedSurface,
    '--ink': safeText,
    '--muted': mutedText,
    '--line': `${border}66`,
    '--shadow': '0 14px 36px rgba(5, 9, 20, 0.34)',
    '--phase1': blendColors(safePrimary, '#2563eb', 0.25),
    '--phase2': safePrimary,
    '--phase3': blendColors(safePrimary, '#f59e0b', 0.4),
    '--phase4': blendColors(safePrimary, '#ef4444', 0.45),
    '--white': safeText,
  };
}
