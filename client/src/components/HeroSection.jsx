import { motion } from 'framer-motion';
import { ArrowDown, CalendarRange, Cloud, Code2, Layers3 } from 'lucide-react';

const iconMap = [CalendarRange, Layers3, Cloud, Code2];

export function HeroSection({ hero, stats }) {
  return (
    <section className="hero container" id="top">
      <div className="orb one" />
      <div className="orb two" />
      <div className="orb three" />

      <div className="hero-grid">
        <div>
          <motion.span
            className="eyebrow"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {hero.eyebrow}
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}>
            {hero.title}
          </motion.h1>
          <motion.p className="lead" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            {hero.lead}
          </motion.p>

          <div className="chip-row">
            {hero.chips?.map((chip) => (
              <span className="chip" key={chip}>{chip}</span>
            ))}
          </div>

          <div className="hero-actions">
            <a className="btn primary" href="#roadmap">
              Explore all 120 days <ArrowDown size={16} />
            </a>
            <a className="btn gold" href="#downloads">Get the workbook assets</a>
          </div>

          <div className="stat-grid">
            {stats.slice(0, 4).map((stat, index) => {
              const Icon = iconMap[index] || CalendarRange;
              return (
                <motion.div
                  className="stat-card"
                  key={`${stat.label}-${stat.value}`}
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.15 + index * 0.08 }}
                >
                  <div className="stat-icon"><Icon size={20} /></div>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </motion.div>
              );
            })}
          </div>
        </div>

        <motion.aside
          className="hero-rail"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
        >
          <div className="timeline-column">
            {hero.timeline?.map((item, index) => (
              <article
                className="timeline-card"
                key={`${item.phase}-${item.title}`}
                style={{ '--accent': ['var(--phase1)', 'var(--phase2)', 'var(--phase3)', 'var(--phase4)'][index] }}
              >
                <span>{item.phase}</span>
                <h4>{item.title}</h4>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </motion.aside>
      </div>

      <motion.div
        className="hero-strap"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2>{hero.strapTitle}</h2>
        <p>{hero.strapText}</p>
      </motion.div>
    </section>
  );
}
