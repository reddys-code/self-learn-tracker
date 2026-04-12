import { Palette, SunMoon } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { THEME_OPTIONS } from '../../theme/themeConfig';

function ThemeColorInput({ label, value, onChange, id }) {
  return (
    <label className="theme-picker-color" htmlFor={id}>
      <span>{label}</span>
      <div className="theme-picker-color-row">
        <input id={id} type="color" value={value} onChange={onChange} />
        <code>{value}</code>
      </div>
    </label>
  );
}

export function ThemeSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { customTheme, resolvedTheme, setThemeName, themeName, updateCustomTheme } = useTheme();

  return (
    <section className="theme-picker" aria-label="Theme picker">
      <button
        type="button"
        className="theme-picker-toggle"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-controls="theme-picker-panel"
      >
        <Palette size={18} /> Theme
      </button>

      <div id="theme-picker-panel" className={`theme-picker-panel ${isOpen ? 'open' : ''}`}>
        <header className="theme-picker-header">
          <h3><SunMoon size={16} /> Appearance</h3>
          <p>
            Active mode: <strong>{themeName}</strong> ({resolvedTheme})
          </p>
        </header>

        <label className="theme-picker-field" htmlFor="theme-select">
          <span>Preset</span>
          <select id="theme-select" value={themeName} onChange={(event) => setThemeName(event.target.value)}>
            {THEME_OPTIONS.map((themeOption) => (
              <option value={themeOption.value} key={themeOption.value}>
                {themeOption.label}
              </option>
            ))}
          </select>
        </label>

        <div className="theme-picker-divider" />

        <p className="theme-picker-subtitle">Custom palette</p>
        <ThemeColorInput
          id="theme-primary"
          label="Primary color"
          value={customTheme.primary}
          onChange={(event) => updateCustomTheme({ primary: event.target.value })}
        />
        <ThemeColorInput
          id="theme-background"
          label="Background color"
          value={customTheme.background}
          onChange={(event) => updateCustomTheme({ background: event.target.value })}
        />
        <ThemeColorInput
          id="theme-text"
          label="Text color"
          value={customTheme.text}
          onChange={(event) => updateCustomTheme({ text: event.target.value })}
        />

        <p className="theme-picker-footnote">
          Custom mode auto-adjusts text color when contrast is below WCAG AA.
        </p>
      </div>
    </section>
  );
}
