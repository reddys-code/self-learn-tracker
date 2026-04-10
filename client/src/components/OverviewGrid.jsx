import { motion } from 'framer-motion';
import { SectionHeader } from './SectionHeader';

export function OverviewGrid({ cards }) {
  return (
    <section className="section container" id="overview">
      <SectionHeader
        eyebrow="PROGRAM OVERVIEW"
        title="What this curriculum is engineered to do"
        description="The roadmap blends architecture theory, shipping experience, platform thinking, and visible portfolio proof. Each week ends with something concrete you can show or defend."
      />

      <div className="cards-2 overview-grid">
        {cards.map((card, index) => (
          <motion.article
            className="info-card"
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
          >
            <h3>{card.title}</h3>
            <ul>
              {card.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
