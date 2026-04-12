import { Paintbrush2, ShieldCheck, Sparkles, Zap } from 'lucide-react';

const previewCards = [
  {
    icon: Sparkles,
    title: 'Design Tokens',
    text: 'All key colors come from CSS variables and update instantly in every route.',
  },
  {
    icon: Paintbrush2,
    title: 'Custom Palette',
    text: 'Primary, text, and background are editable in one panel and saved automatically.',
  },
  {
    icon: ShieldCheck,
    title: 'Accessibility',
    text: 'Contrast is checked for custom text color and corrected when needed.',
  },
  {
    icon: Zap,
    title: 'Instant Apply',
    text: 'Theme updates run without page reload, including smooth transitions.',
  },
];

export function ThemeShowcasePage() {
  return (
    <div className="theme-demo-page">
      <div className="container">
        <section className="theme-demo-hero">
          <span className="theme-demo-tag">Theme system showcase</span>
          <h1>Switch appearance live and keep your style across sessions.</h1>
          <p>
            This page demonstrates the new global theming feature backed by design tokens,
            local storage persistence, and an accessible custom palette.
          </p>
        </section>

        <section className="theme-demo-grid" aria-label="Theme feature highlights">
          {previewCards.map(({ icon: Icon, title, text }) => (
            <article key={title} className="theme-demo-card">
              <div className="theme-demo-icon"><Icon size={20} /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
