import { motion } from 'framer-motion';
import { SectionHeader } from './SectionHeader';

export function CheckpointStrip({ checkpoints }) {
  return (
    <section className="section container" id="checkpoints">
      <SectionHeader
        eyebrow="MILESTONE GATES"
        title="Readiness checkpoints that matter"
        description="These checkpoints tell you whether the roadmap is actually moving you toward Solution Architect readiness. They make the path measurable instead of vague."
      />

      <div className="cards-4 checkpoint-grid">
        {checkpoints.map((checkpoint, index) => (
          <motion.article
            className="checkpoint-card"
            key={checkpoint.day}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
          >
            <span className="checkpoint-day">{checkpoint.day}</span>
            <h4>{checkpoint.title}</h4>
            <p>{checkpoint.description}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
