import { motion } from 'framer-motion';
import { SectionHeader } from './SectionHeader';

export function PhaseGrid({ phases }) {
  return (
    <section className="section alt container" id="phases">
      <SectionHeader
        eyebrow="FOUR-PHASE ROADMAP"
        title="The progression from engineer to architect"
        description="The plan is intentionally phased. You begin with core architecture language, move into deployable systems, then into resilience and operating posture, and finish with design-story fluency and capstone presentation."
      />

      <div className="phase-grid">
        {phases.map((phase, index) => (
          <motion.article
            className="phase-card"
            key={phase.id}
            style={{ '--accent': phase.accent }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.42, delay: index * 0.06 }}
          >
            <div className="phase-topline">
              <span className="phase-days">{phase.days}</span>
              <span className="phase-weeks">{phase.weeks}</span>
            </div>
            <h3>{phase.name}</h3>
            <p>{phase.description}</p>
            <div className="phase-stats">
              {phase.metrics.map((metric) => (
                <div key={`${metric.value}-${metric.label}`}>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
            <div className="phase-outcome">{phase.outcome}</div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
