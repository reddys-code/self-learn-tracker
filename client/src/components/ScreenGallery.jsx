import { motion } from 'framer-motion';
import { SectionHeader } from './SectionHeader';
import { withApiOrigin } from '../api/client';

export function ScreenGallery({ screens }) {
  return (
    <section className="section alt container" id="screens">
      <SectionHeader
        eyebrow="TRACKER WORKBOOK PREVIEWS"
        title="The operational side of the roadmap"
        description="The workbook and brochure are packaged with the app. This screen gallery shows the execution assets that complement the interactive MERN experience."
      />

      <div className="screen-grid">
        {screens.map((screen, index) => (
          <motion.article
            className="screen-card"
            key={screen.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.42, delay: index * 0.06 }}
          >
            <img src={withApiOrigin(screen.image)} alt={screen.title} loading="lazy" />
            <div className="screen-copy">
              <h4>{screen.title}</h4>
              <p>{screen.description}</p>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
