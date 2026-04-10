import { motion } from 'framer-motion';

export function MetricCard({ label, value, hint, icon: Icon, accent = 'blue' }) {
  return (
    <motion.article
      className={`metric-card metric-${accent}`}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="metric-icon">{Icon ? <Icon size={18} /> : null}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {hint ? <small>{hint}</small> : null}
      </div>
    </motion.article>
  );
}
