import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock3,
  Download,
  Filter,
  Link as LinkIcon,
  Loader2,
  Lock,
  PencilLine,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { withApiOrigin } from '../api/client';

const defaultProgress = {
  status: 'not-started',
  notes: '',
  evidenceUrl: '',
};

const statusLabel = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  blocked: 'Blocked',
  complete: 'Complete',
};

function MaterialLinks({ materials = [] }) {
  if (!materials.length) return null;
  return (
    <div className="day-materials">
      <label>Materials</label>
      <div className="material-chip-row">
        {materials.map((material) => (
          <a className="mini-badge material-badge" key={material.id || `${material.title}-${material.url}`} href={withApiOrigin(material.url)} target="_blank" rel="noreferrer">
            <Download size={14} /> {material.title}
          </a>
        ))}
      </div>
    </div>
  );
}

function DayCard({ day, progress, onSave, isSaving, readOnly }) {
  const [form, setForm] = useState({
    status: progress?.status || defaultProgress.status,
    notes: progress?.notes || defaultProgress.notes,
    evidenceUrl: progress?.evidenceUrl || defaultProgress.evidenceUrl,
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    setForm({
      status: progress?.status || defaultProgress.status,
      notes: progress?.notes || defaultProgress.notes,
      evidenceUrl: progress?.evidenceUrl || defaultProgress.evidenceUrl,
    });
  }, [progress]);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    if (!onSave) return;
    setMessage('');
    const result = await onSave(day.dayNumber, form);
    setMessage(result.ok ? 'Saved' : (result.message || 'Save failed'));
  };

  const currentStatus = progress?.status || form.status || 'not-started';

  return (
    <article className="day-card generic-day-card">
      <div className="day-card-head">
        <div>
          <span className="day-num">Day {day.dayNumber}</span>
          <div className="day-meta">{day.dayType}</div>
        </div>
        <div className="day-head-right">
          <span className={`status-badge status-${currentStatus}`}>{statusLabel[currentStatus]}</span>
          <span className="hours-pill">{day.hours}</span>
        </div>
      </div>

      <div className="course-day-intro">
        <h4>{day.title}</h4>
        {day.objective ? <p>{day.objective}</p> : null}
      </div>

      <div className="day-grid generic">
        {day.sections?.map((section) => (
          <div key={`${day.dayNumber}-${section.label}`} className={section.value.length > 160 ? 'full' : ''}>
            <label>{section.label}</label>
            <p>{section.value}</p>
          </div>
        ))}
        {day.primaryDeliverable ? (
          <div className="full">
            <label>Primary deliverable</label>
            <p>{day.primaryDeliverable}</p>
          </div>
        ) : null}
      </div>

      <MaterialLinks materials={day.materials || []} />

      {readOnly ? (
        <div className="tracker-readonly">
          <Lock size={15} />
          <span>Login to update status, notes, and evidence for this day.</span>
        </div>
      ) : (
        <details className="tracker-panel">
          <summary>
            <PencilLine size={16} /> Update tracking
          </summary>
          <div className="tracker-fields">
            <label>
              <span>Status</span>
              <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                <option value="not-started">Not started</option>
                <option value="in-progress">In progress</option>
                <option value="blocked">Blocked</option>
                <option value="complete">Complete</option>
              </select>
            </label>
            <label>
              <span>Evidence URL</span>
              <input
                type="url"
                placeholder="https://github.com/... or doc link"
                value={form.evidenceUrl}
                onChange={(event) => updateField('evidenceUrl', event.target.value)}
              />
            </label>
            <label className="full">
              <span>Notes</span>
              <textarea
                rows="4"
                placeholder="What did you finish? What remains? What insight matters here?"
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
              />
            </label>
            <div className="tracker-actions full">
              <button className="btn small primary" type="button" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />} Save day progress
              </button>
              {form.evidenceUrl ? (
                <a className="btn small" href={form.evidenceUrl} target="_blank" rel="noreferrer">
                  <LinkIcon size={16} /> Open evidence
                </a>
              ) : null}
              {message ? <span className="tracker-message">{message}</span> : null}
            </div>
          </div>
        </details>
      )}
    </article>
  );
}

export function WeekExplorer({ weeks = [], progressMap, onSaveProgress, savingDay, readOnly = false, title, description }) {
  const [activePhase, setActivePhase] = useState('all');
  const [search, setSearch] = useState('');

  const phaseOptions = useMemo(() => {
    const map = new Map();
    weeks.forEach((week) => {
      const label = week.phaseLabel || 'General';
      if (!map.has(label)) map.set(label, label);
    });
    return [{ value: 'all', label: 'All phases' }, ...Array.from(map.values()).map((label) => ({ value: label, label }))];
  }, [weeks]);

  const filteredWeeks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return weeks
      .filter((week) => activePhase === 'all' || (week.phaseLabel || 'General') === activePhase)
      .map((week) => ({
        ...week,
        days: query ? week.days.filter((day) => (day.searchText || '').toLowerCase().includes(query)) : week.days,
      }))
      .filter((week) => week.days.length > 0 || !query);
  }, [activePhase, search, weeks]);

  return (
    <section className="section container" id="curriculum">
      <SectionHeader
        eyebrow={readOnly ? 'CURRICULUM EXPLORER' : 'LIVE COURSE TRACKER'}
        title={title || 'Browse every week, every day, every deliverable'}
        description={description || (readOnly
          ? 'Explore the complete curriculum structure, brochure assets, and day-by-day grid. Tracking unlocks after login.'
          : 'Update progress directly from each day card. Admin dashboards, charts, and learner comparisons refresh live after every save.')}
      />

      <div className="toolbar">
        <div className="filter-row">
          {phaseOptions.map((phase) => (
            <button
              key={phase.value}
              type="button"
              className={`filter-btn ${activePhase === phase.value ? 'active' : ''}`}
              onClick={() => setActivePhase(phase.value)}
            >
              <Filter size={16} /> {phase.label}
            </button>
          ))}
        </div>

        <label className="search-box">
          <Search size={18} />
          <input
            className="search-input"
            type="search"
            placeholder="Search concepts, days, patterns, tools..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      {filteredWeeks.length === 0 ? (
        <div className="empty-state">
          <ShieldAlert size={24} /> No matching weeks found. Clear the filter or search a broader term.
        </div>
      ) : null}

      <div className="week-stack">
        {filteredWeeks.map((week, index) => (
          <motion.details
            className="week-card"
            key={`${week.weekNumber}-${week.title}`}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.08 }}
            transition={{ duration: 0.38, delay: index * 0.02 }}
          >
            <summary style={{ '--accent': week.accent || '#2e6ca5' }}>
              <div className="week-summary-left">
                <span className="week-pill">Week {week.weekNumber}</span>
                <div>
                  <h3>{week.title}</h3>
                  <p>{week.summary}</p>
                </div>
              </div>
              <div className="week-summary-right">
                <div className="summary-metric">
                  <strong>{week.days.length}</strong>
                  <div>days</div>
                </div>
                <div className="summary-metric">
                  <strong>{week.deliverables?.length || 0}</strong>
                  <div>deliverables</div>
                </div>
                <span className="summary-toggle"><Clock3 size={16} /> expand</span>
              </div>
            </summary>

            <div className="week-body">
              {week.deliverables?.length ? (
                <div className="week-deliverables">
                  <h4>Weekly proof points</h4>
                  <div className="deliverable-strip">
                    {week.deliverables.map((deliverable) => (
                      <span className="mini-badge" key={deliverable}>{deliverable}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="day-cards">
                {week.days.map((day) => (
                  <DayCard
                    key={day.dayNumber}
                    day={day}
                    progress={progressMap?.[day.dayNumber]}
                    onSave={onSaveProgress}
                    isSaving={savingDay === day.dayNumber}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            </div>
          </motion.details>
        ))}
      </div>
    </section>
  );
}
