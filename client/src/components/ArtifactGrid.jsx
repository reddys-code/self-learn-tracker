import { motion } from 'framer-motion';
import { SectionHeader } from './SectionHeader';

export function ArtifactGrid({ artifacts }) {
  return (
    <section className="section alt container" id="artifacts">
      <SectionHeader
        eyebrow="PORTFOLIO ARTIFACTS"
        title="Proof that turns study into an interview story"
        description="The capstone is not one file. It is a stack of architecture assets that prove judgment: requirements, trade-off notes, ADRs, diagrams, security posture, SLOs, cost narrative, and presentation material."
      />

      <div className="artifact-grid">
        {artifacts.map((artifact, index) => (
          <motion.article
            className="artifact-card"
            key={`${artifact.week}-${artifact.day}-${artifact.title}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.4, delay: (index % 3) * 0.04 }}
          >
            <div className="artifact-top">
              <span>{artifact.week}</span>
              <span>{artifact.day}</span>
            </div>
            <h4>{artifact.title}</h4>
            <p>{artifact.description}</p>
            <div className="artifact-dep">{artifact.dependency}</div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
