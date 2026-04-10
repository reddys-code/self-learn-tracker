import { motion } from 'framer-motion';
import { Download, FileSpreadsheet, FileText, Presentation } from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { withApiOrigin } from '../api/client';

const iconByType = {
  xlsx: FileSpreadsheet,
  pdf: FileText,
  pptx: Presentation,
};

export function DownloadsPanel({ downloads }) {
  return (
    <section className="section container" id="downloads">
      <SectionHeader
        eyebrow="DOWNLOAD CENTER"
        title="Static assets bundled with the app"
        description="Use the web application for live tracking, then download the original workbook and brochure assets whenever you need offline review, print-friendly material, or editable design files."
      />

      <div className="download-grid">
        {downloads.map((item, index) => {
          const Icon = iconByType[item.type] || FileText;
          return (
            <motion.article
              className="download-card"
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.42, delay: index * 0.05 }}
            >
              <div className="download-icon"><Icon size={24} /></div>
              <h4>{item.label}</h4>
              <p>{item.description}</p>
              <a className="btn primary" href={withApiOrigin(item.url)} download>
                <Download size={16} /> Download {item.type.toUpperCase()}
              </a>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
