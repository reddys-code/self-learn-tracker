import { motion } from 'framer-motion';
import { SectionHeader } from './SectionHeader';

export function SprintGrid({ sprints }) {
  return (
    <section className="section container" id="sprints">
      <SectionHeader
        eyebrow="SYSTEM DESIGN SPRINTS"
        title="High-value design drills in the final phase"
        description="The last phase shifts from implementation into design storytelling. These sprint prompts force practice around requirements, NFRs, trade-offs, resilience, security, and stakeholder communication."
      />

      <div className="cards-2 sprint-grid">
        {sprints.map((sprint, index) => (
          <motion.article
            className="sprint-card"
            key={sprint.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, delay: index * 0.04 }}
          >
            <h4>{sprint.title}</h4>
            <p>{sprint.description}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
