import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, CircleDot, Gauge, PauseCircle } from 'lucide-react';
import { SectionHeader } from './SectionHeader';

const statusConfig = [
  { key: 'complete', label: 'Completed days', icon: CheckCircle2 },
  { key: 'in-progress', label: 'In progress', icon: CircleDot },
  { key: 'blocked', label: 'Blocked', icon: AlertTriangle },
  { key: 'not-started', label: 'Not started', icon: PauseCircle },
];

export function DashboardPanel({ summary }) {
  if (!summary) return null;

  return (
    <section className="section container" id="dashboard">
      <SectionHeader
        eyebrow="TRACKING DASHBOARD"
        title="See momentum week by week"
        description="This MERN version adds persistent progress tracking, notes, and evidence links for every day so the roadmap becomes something you can actively run, not just read."
      />

      <div className="dashboard-grid">
        <motion.article
          className="summary-panel"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
        >
          <div className="summary-top">
            <div>
              <span className="eyebrow soft">ROADMAP STATUS</span>
              <h3>{summary.completionPct}% complete</h3>
              <p>{summary.totalDays} total guided days. Latest saved update: {summary.latestUpdatedDay ? `Day ${summary.latestUpdatedDay}` : 'none yet'}.</p>
            </div>
            <div className="completion-ring">
              <Gauge size={22} />
              <strong>{summary.completionPct}%</strong>
            </div>
          </div>

          <div className="status-grid">
            {statusConfig.map(({ key, label, icon: Icon }) => (
              <div className="status-card" key={key}>
                <div className={`status-icon status-${key}`}><Icon size={18} /></div>
                <strong>{summary.statusCounts?.[key] || 0}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </motion.article>

        <motion.article
          className="phase-progress-panel"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, delay: 0.05 }}
        >
          <h3>Phase completion</h3>
          <div className="phase-progress-list">
            {summary.phaseProgress?.map((phase) => (
              <div className="phase-progress-item" key={phase.phaseLabel}>
                <div className="phase-progress-head">
                  <span>{phase.phaseLabel}</span>
                  <strong>{phase.complete}/{phase.totalDays}</strong>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${phase.percent}%` }} />
                </div>
                <small>{phase.percent}% complete</small>
              </div>
            ))}
          </div>
        </motion.article>
      </div>
    </section>
  );
}
