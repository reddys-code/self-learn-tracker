import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  BookOpenText,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Download,
  ExternalLink,
  Filter,
  Flame,
  Gauge,
  Layers3,
  Link as LinkIcon,
  Loader2,
  RefreshCcw,
  Search,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { withApiOrigin } from '../../api/client';
import './premium-roadmap.css';

const statusLabel = {
  complete: 'Completed',
  'in-progress': 'In Progress',
  'not-started': 'Not Started',
  blocked: 'Blocked',
};

const statusClass = {
  complete: 'prm-status-complete',
  'in-progress': 'prm-status-in-progress',
  'not-started': 'prm-status-not-started',
  blocked: 'prm-status-blocked',
};

const statusRingColor = {
  complete: 'var(--prm-green)',
  'in-progress': 'var(--prm-blue)',
  'not-started': 'var(--prm-blue)',
  blocked: 'var(--prm-amber)',
};

const defaultStatusPercent = {
  complete: 100,
  'in-progress': 58,
  'not-started': 0,
  blocked: 24,
};

function clampPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function resolvePercent(entry, status = 'not-started') {
  if (entry && Object.prototype.hasOwnProperty.call(entry, 'progressPercent')) {
    return clampPercent(entry.progressPercent);
  }
  return defaultStatusPercent[status] ?? 0;
}

function parseHoursLabel(hours = '') {
  const match = String(hours).match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function healthTone(blockedCount, activeCount) {
  if (blockedCount > 1) return 'Needs attention';
  if (blockedCount === 1) return 'Watchlist';
  if (activeCount > 0) return 'On track';
  return 'Stable';
}

function relativeUpdateLabel(value) {
  if (!value) return 'Not updated yet';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 'Updated recently';
  const diffMs = Date.now() - time;
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Updated just now';
  if (diffHours < 24) return `Updated ${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 8) return `Updated ${diffDays}d ago`;
  return `Updated ${new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function sparklinePoints(values = []) {
  const safe = values.length ? values : [0, 0, 0, 0];
  const max = Math.max(...safe, 10);
  const min = Math.min(...safe, 0);
  const range = max - min || 1;
  const width = 100;
  const height = 44;
  const step = safe.length === 1 ? width : width / (safe.length - 1);
  return safe
    .map((value, index) => {
      const x = Number((index * step).toFixed(2));
      const y = Number((height - 4 - (((value - min) / range) * (height - 8))).toFixed(2));
      return `${x},${y}`;
    })
    .join(' ');
}

function buildTrend(values = []) {
  const safe = values.length ? values : [0, 0, 0, 0];
  const width = 640;
  const height = 220;
  const pad = 24;
  const usableWidth = width - (pad * 2);
  const usableHeight = height - (pad * 2);
  const step = safe.length === 1 ? usableWidth : usableWidth / (safe.length - 1);
  const points = safe.map((value, index) => {
    const x = pad + (step * index);
    const y = height - pad - ((clampPercent(value) / 100) * usableHeight);
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), value };
  });
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - pad} L ${points[0].x} ${height - pad} Z`;
  return { width, height, pad, points, linePath, areaPath };
}

function safeExternalUrl(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return withApiOrigin(value);
}

function inferStatusFromPercent(percent, currentStatus = 'in-progress') {
  const value = clampPercent(percent);
  if (value === 0) return 'not-started';
  if (value >= 100) return 'complete';
  if (currentStatus === 'blocked') return 'blocked';
  return 'in-progress';
}

function buildSearchText(day) {
  return [
    day.dayNumber,
    day.title,
    day.objective,
    day.primaryDeliverable,
    day.dayType,
    day.phaseLabel,
    day.weekTitle,
    ...(day.sections || []).map((section) => `${section.label} ${section.value}`),
    ...(day.materials || []).map((material) => `${material.title} ${material.description || ''}`),
    ...(day.weekDeliverables || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function buildFallbackObjective(day) {
  return day.objective
    || day.primaryDeliverable
    || day.sections?.[0]?.value
    || 'Continue the execution plan, attach evidence, and keep the delivery flow current.';
}

function computeEvidenceState(day) {
  return day.evidenceUrl ? 'Attached' : 'Pending';
}

function toDayId(value) {
  if (value === null || value === undefined) return null;
  return String(value);
}

function flattenCourseDays(course, progressMap = {}) {
  return (course?.weeks || [])
    .flatMap((week) => (week.days || []).map((day) => {
      const progress = progressMap?.[day.dayNumber] || null;
      const status = progress?.status || 'not-started';
      const progressPercent = resolvePercent(progress, status);
      const notes = progress?.notes || '';
      const evidenceUrl = progress?.evidenceUrl || '';
      const score = Math.max(
        0,
        Math.min(
          100,
          Math.round((progressPercent * 0.7) + (notes ? 8 : 0) + (evidenceUrl ? 12 : 0) + (status === 'complete' ? 10 : 0) - (status === 'blocked' ? 8 : 0))
        )
      );

      return {
        ...day,
        phaseLabel: week.phaseLabel || `Week ${week.weekNumber}`,
        weekNumber: week.weekNumber,
        weekTitle: week.title,
        weekDeliverables: week.deliverables || [],
        weekAccent: week.accent || 'var(--prm-blue)',
        focus: buildFallbackObjective(day),
        status,
        progressPercent,
        notes,
        evidenceUrl,
        updatedAt: progress?.updatedAt || '',
        score,
        searchText: buildSearchText({
          ...day,
          phaseLabel: week.phaseLabel || `Week ${week.weekNumber}`,
          weekTitle: week.title,
          weekDeliverables: week.deliverables || [],
        }),
      };
    }))
    .sort((a, b) => Number(a.dayNumber) - Number(b.dayNumber));
}

function MaterialCard({ title, meta, href, icon = null }) {
  const content = (
    <>
      <strong>{title}</strong>
      <div className="prm-material-meta">
        <span>{meta}</span>
        <span>{href ? 'Open' : 'Preview only'} {href ? <ArrowUpRight size={14} /> : null}</span>
      </div>
      {icon ? <span className="prm-material-icon">{icon}</span> : null}
    </>
  );

  if (href) {
    return (
      <a className="prm-material-card" href={href} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }

  return <div className="prm-material-card">{content}</div>;
}

function OverviewTab({ weeklyProgress = [], blockedCount, activeCount, completedCount, totalDays, latestUpdatedDay }) {
  const values = weeklyProgress.map((item) => item.percent);
  const trend = buildTrend(values);
  const labelStep = Math.max(1, Math.ceil((weeklyProgress.length || 1) / 5));

  return (
    <div className="prm-overview-grid">
      <div className="prm-chart-shell">
        <svg viewBox={`0 0 ${trend.width} ${trend.height}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="prmAreaGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="color-mix(in srgb, var(--prm-blue) 48%, transparent)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <linearGradient id="prmLineGrad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="var(--prm-blue)" />
              <stop offset="100%" stopColor="var(--prm-cyan)" />
            </linearGradient>
          </defs>
          <path d={trend.areaPath} fill="url(#prmAreaGrad)" />
          <path d={trend.linePath} fill="none" stroke="url(#prmLineGrad)" strokeWidth="4" strokeLinecap="round" />
          {trend.points.map((point, index) => (
            <g key={`${point.x}-${point.y}`}>
              <circle cx={point.x} cy={point.y} r="4" fill="var(--prm-text)" />
              {index % labelStep === 0 || index === trend.points.length - 1 ? (
                <text x={point.x - 14} y={trend.height - 8} fill="var(--prm-text)" fontSize="12">
                  W{weeklyProgress[index]?.weekNumber || index + 1}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      </div>

      <div className="prm-achievement-column">
        <div className="prm-note-card">
          <strong>Current operating signal</strong>
          {blockedCount
            ? `${blockedCount} blocker${blockedCount === 1 ? '' : 's'} needs intervention before the next delivery wave accelerates.`
            : 'No active blockers. The roadmap is moving with clean execution cadence.'}
        </div>
        <div className="prm-note-card">
          <strong>Most recent checkpoint</strong>
          {latestUpdatedDay ? `Day ${latestUpdatedDay} carries the freshest update in the tracker.` : 'No day has been updated yet.'}
        </div>
        <div className="prm-note-card">
          <strong>Completion posture</strong>
          {`${completedCount} of ${totalDays} days are fully closed and ${activeCount} day${activeCount === 1 ? '' : 's'} are still active.`}
        </div>
      </div>

      <div className="prm-achievement-column">
        {weeklyProgress.slice(0, 5).map((week) => (
          <div className="prm-note-card compact" key={`overview-week-${week.weekNumber}`}>
            <div className="prm-between">
              <strong>Week {week.weekNumber}</strong>
              <span>{week.percent}%</span>
            </div>
            <p>{week.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsTab({ statusCounts, phaseProgress = [], weeklyProgress = [] }) {
  const statusBars = [
    { label: 'Completed', value: statusCounts?.complete || 0 },
    { label: 'In progress', value: statusCounts?.['in-progress'] || 0 },
    { label: 'Blocked', value: statusCounts?.blocked || 0 },
    { label: 'Not started', value: statusCounts?.['not-started'] || 0 },
  ];

  const largestStatus = Math.max(...statusBars.map((item) => item.value), 1);

  return (
    <div className="prm-analytics-grid">
      <div className="prm-bar-stack">
        <div className="prm-subhead">Phase progress</div>
        {phaseProgress.map((item) => (
          <div className="prm-bar-card" key={`phase-${item.phaseLabel}`}>
            <div className="prm-between">
              <strong>{item.phaseLabel}</strong>
              <span>{item.percent}%</span>
            </div>
            <div className="prm-progress-track small">
              <div className="prm-progress-fill" style={{ width: `${item.percent}%` }} />
            </div>
            <small>{item.complete} of {item.totalDays} days completed</small>
          </div>
        ))}
      </div>

      <div className="prm-bar-stack">
        <div className="prm-subhead">Status distribution</div>
        {statusBars.map((item) => {
          const width = Math.max(8, Math.round((item.value / largestStatus) * 100));
          return (
            <div className="prm-bar-card" key={`status-${item.label}`}>
              <div className="prm-between">
                <strong>{item.label}</strong>
                <span>{item.value}</span>
              </div>
              <div className="prm-progress-track small">
                <div className="prm-progress-fill alt" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="prm-bar-stack">
        <div className="prm-subhead">Weekly velocity</div>
        {weeklyProgress.slice(0, 6).map((item) => (
          <div className="prm-bar-card" key={`velocity-${item.weekNumber}`}>
            <div className="prm-between">
              <strong>Week {item.weekNumber}</strong>
              <span>{item.percent}%</span>
            </div>
            <p>{item.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MaterialsTab({ selectedDay, course }) {
  const materialCards = [
    ...(selectedDay?.materials || []).map((item) => ({
      key: `day-material-${item.id || item.url || item.title}`,
      title: item.title,
      meta: item.description || 'Selected day material',
      href: safeExternalUrl(item.url),
      icon: <BookOpenText size={16} />,
    })),
    ...(course?.downloads || []).map((item) => ({
      key: `course-download-${item.id || item.url || item.title}`,
      title: item.title,
      meta: item.description || 'Course download',
      href: safeExternalUrl(item.url),
      icon: <Download size={16} />,
    })),
    ...(course?.brochure?.pdfUrl ? [{
      key: 'course-brochure-pdf',
      title: 'Course brochure PDF',
      meta: 'Program snapshot',
      href: safeExternalUrl(course.brochure.pdfUrl),
      icon: <ExternalLink size={16} />,
    }] : []),
    ...((selectedDay?.weekDeliverables || []).map((item, index) => ({
      key: `week-deliverable-${index}-${item}`,
      title: item,
      meta: `Week ${selectedDay?.weekNumber} deliverable`,
      href: '',
      icon: <Sparkles size={16} />,
    }))),
  ];

  if (!materialCards.length) {
    return (
      <div className="prm-empty-state compact">
        <ShieldAlert size={20} /> No materials are attached to this day or course yet.
      </div>
    );
  }

  return (
    <div className="prm-materials-grid">
      {materialCards.map((item) => (
        <MaterialCard key={item.key} title={item.title} meta={item.meta} href={item.href} icon={item.icon} />
      ))}
    </div>
  );
}

function KpiCard({ label, value, suffix = '', foot, values }) {
  return (
    <article className="prm-kpi-card">
      <div className="prm-small-label">{label}</div>
      <div className="prm-kpi-value">{value}{suffix}</div>
      <div className="prm-kpi-foot">{foot}</div>
      <div className="prm-spark">
        <svg viewBox="0 0 100 44" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id={`spark-${label.replace(/\s+/g, '-').toLowerCase()}`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="var(--prm-blue)" />
              <stop offset="100%" stopColor="var(--prm-cyan)" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke={`url(#spark-${label.replace(/\s+/g, '-').toLowerCase()})`}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={sparklinePoints(values)}
          />
        </svg>
      </div>
    </article>
  );
}

export function PremiumRoadmapTracker({
  course,
  summary,
  progressMap,
  onSaveProgress,
  savingDay,
  onRefresh,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedDayId, setSelectedDayId] = useState(null);
  const [popupDayId, setPopupDayId] = useState(null);
  const [form, setForm] = useState({
    status: 'not-started',
    progressPercent: 0,
    notes: '',
    evidenceUrl: '',
  });
  const [toast, setToast] = useState('');
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const lastFocusedElementRef = useRef(null);

  const days = useMemo(() => flattenCourseDays(course, progressMap), [course, progressMap]);

  const preferredSelectedDayId = useMemo(() => {
    const firstActive = days.find((day) => day.status === 'in-progress');
    const firstBlocked = days.find((day) => day.status === 'blocked');
    const firstIncomplete = days.find((day) => day.status !== 'complete');
    return toDayId(firstActive?.dayNumber)
      || toDayId(firstBlocked?.dayNumber)
      || toDayId(firstIncomplete?.dayNumber)
      || toDayId(days[0]?.dayNumber)
      || null;
  }, [days]);

  useEffect(() => {
    if (!days.length) return;
    if (!selectedDayId || !days.some((day) => toDayId(day.dayNumber) === selectedDayId)) {
      setSelectedDayId(preferredSelectedDayId);
    }
  }, [days, preferredSelectedDayId, selectedDayId]);

  const selectedDay = useMemo(
    () => days.find((day) => toDayId(day.dayNumber) === selectedDayId) || days[0] || null,
    [days, selectedDayId]
  );

  const popupDay = useMemo(
    () => days.find((day) => toDayId(day.dayNumber) === popupDayId) || null,
    [days, popupDayId]
  );

  useEffect(() => {
    if (!selectedDay) return;
    setForm({
      status: selectedDay.status,
      progressPercent: selectedDay.progressPercent,
      notes: selectedDay.notes || '',
      evidenceUrl: selectedDay.evidenceUrl || '',
    });
  }, [selectedDay?.dayNumber, selectedDay?.status, selectedDay?.progressPercent, selectedDay?.notes, selectedDay?.evidenceUrl]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!popupDay) return undefined;

    lastFocusedElementRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      } else if (modalRef.current) {
        modalRef.current.focus();
      }
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      if (lastFocusedElementRef.current && typeof lastFocusedElementRef.current.focus === 'function') {
        lastFocusedElementRef.current.focus();
      }
    };
  }, [popupDay]);

  const handleModalKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setPopupDayId(null);
      return;
    }

    if (event.key !== 'Tab' || !modalRef.current) {
      return;
    }

    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ];

    const focusables = Array.from(modalRef.current.querySelectorAll(focusableSelectors.join(',')))
      .filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');

    if (!focusables.length) {
      event.preventDefault();
      return;
    }

    const firstFocusable = focusables[0];
    const lastFocusable = focusables[focusables.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === firstFocusable) {
      event.preventDefault();
      lastFocusable.focus();
    } else if (!event.shiftKey && activeElement === lastFocusable) {
      event.preventDefault();
      firstFocusable.focus();
    }
  };

  const averageHours = useMemo(() => {
    if (!days.length) return 0;
    const total = days.reduce((sum, day) => sum + parseHoursLabel(day.hours), 0);
    return Number((total / days.length).toFixed(1));
  }, [days]);

  const completedCount = summary?.statusCounts?.complete || days.filter((day) => day.status === 'complete').length;
  const activeCount = summary?.statusCounts?.['in-progress'] || days.filter((day) => day.status === 'in-progress').length;
  const blockedCount = summary?.statusCounts?.blocked || days.filter((day) => day.status === 'blocked').length;
  const notStartedCount = summary?.statusCounts?.['not-started'] || days.filter((day) => day.status === 'not-started').length;
  const evidenceCount = days.filter((day) => day.evidenceUrl).length;
  const averageProgress = days.length ? Math.round(days.reduce((sum, day) => sum + day.progressPercent, 0) / days.length) : 0;
  const readinessScore = days.length ? Math.round(((completedCount / days.length) * 55) + (averageProgress * 0.45)) : 0;
  const progressLine = (summary?.weeklyProgress || []).map((item) => item.percent);
  const phaseLine = (summary?.phaseProgress || []).map((item) => item.percent);
  const distributionLine = [completedCount, activeCount, blockedCount, notStartedCount].map((value) => Math.max(6, value * 8));
  const evidenceLine = days.slice(-8).map((day) => (day.evidenceUrl ? Math.max(day.progressPercent, 16) : Math.round(day.progressPercent * 0.55)));
  const chipValues = course?.brochure?.chips?.length
    ? course.brochure.chips
    : [course?.category, course?.level, `${course?.weeks?.length || 0} weeks`].filter(Boolean);

  const filteredDays = useMemo(() => {
    const query = activeSearch.trim().toLowerCase();
    return days.filter((day) => {
      const matchesSearch = !query || day.searchText.includes(query);
      let matchesFilter = true;
      if (activeFilter === 'active') matchesFilter = day.status === 'in-progress';
      if (activeFilter === 'completed') matchesFilter = day.status === 'complete';
      if (activeFilter === 'blocked') matchesFilter = day.status === 'blocked';
      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, activeSearch, days]);

  const handleStatusChange = (value) => {
    setForm((current) => ({
      ...current,
      status: value,
      progressPercent: defaultStatusPercent[value] ?? current.progressPercent,
    }));
  };

  const handleRangeChange = (value) => {
    setForm((current) => ({
      ...current,
      progressPercent: clampPercent(value),
      status: inferStatusFromPercent(value, current.status),
    }));
  };

  const handleSave = async () => {
    if (!selectedDay || !onSaveProgress) return;
    const payload = {
      status: form.status,
      progressPercent: clampPercent(form.progressPercent),
      notes: form.notes.trim(),
      evidenceUrl: form.evidenceUrl.trim(),
    };
    const result = await onSaveProgress(selectedDay.dayNumber, payload);
    if (result?.ok) {
      setToast(`Day ${selectedDay.dayNumber} updated successfully.`);
    } else {
      setToast(result?.message || 'Unable to save the update.');
    }
  };

  const openDayPopup = (dayNumber) => {
    const id = toDayId(dayNumber);
    setSelectedDayId(id);
    setPopupDayId(id);
  };

  const weeklyProgress = summary?.weeklyProgress || [];
  const phaseProgress = summary?.phaseProgress || [];
  const courseCompletionPct = summary?.completionPct || 0;
  const timelineDays = days;

  return (
    <div className="premium-roadmap-shell">
      <div className="premium-roadmap-bg" aria-hidden="true">
        <div className="prm-orb prm-orb-one" />
        <div className="prm-orb prm-orb-two" />
        <div className="prm-orb prm-orb-three" />
      </div>

      <div className="premium-roadmap-app">
        <section className="prm-hero prm-card">
          <div className="prm-hero-copy">
            <div className="prm-eyebrow">Premium execution cockpit</div>
            <h1>{course?.title || 'Roadmap tracker'}</h1>
            <p>{course?.shortDescription || course?.brochure?.lead || 'A premium tracker experience for day-by-day execution, status reporting, and evidence capture.'}</p>
            <div className="prm-chip-row top-space">
              {chipValues.map((chip) => (
                <span key={chip} className="prm-chip active">{chip}</span>
              ))}
            </div>
            <div className="prm-hero-actions">
              <button type="button" className="prm-btn prm-btn-primary" onClick={() => void onRefresh?.()}>
                <RefreshCcw size={16} /> Refresh course
              </button>
              {course?.brochure?.pdfUrl ? (
                <a className="prm-btn prm-btn-secondary" href={safeExternalUrl(course.brochure.pdfUrl)} target="_blank" rel="noreferrer">
                  <Download size={16} /> Open brochure
                </a>
              ) : null}
            </div>
          </div>

          <div className="prm-hero-meta">
            <div className="prm-hero-stat">
              <div className="prm-small-label">Active course</div>
              <strong>{course?.title || 'Assigned roadmap'}</strong>
              <span>{course?.weeks?.length || 0} weeks · {course?.durationDays || days.length} days</span>
            </div>
            <div className="prm-hero-stat">
              <div className="prm-small-label">Learning intensity</div>
              <strong>{averageHours ? `${averageHours} hrs/day` : 'Flexible'}</strong>
              <span>{completedCount} complete · {activeCount} active</span>
            </div>
            <div className="prm-hero-stat">
              <div className="prm-small-label">Tracker health</div>
              <strong>{healthTone(blockedCount, activeCount)}</strong>
              <span>{blockedCount} blocker{blockedCount === 1 ? '' : 's'} · {evidenceCount} evidence link{evidenceCount === 1 ? '' : 's'}</span>
            </div>
          </div>
        </section>

        <section className="prm-kpi-grid">
          <KpiCard label="Completion" value={averageProgress} suffix="%" foot={`${completedCount} of ${days.length} days closed`} values={progressLine.length ? progressLine : phaseLine} />
          <KpiCard label="Active flow" value={activeCount} foot="currently moving through the tracker" values={phaseLine.length ? phaseLine : distributionLine} />
          <KpiCard label="Readiness" value={readinessScore} foot="delivery confidence based on live progress" values={distributionLine} />
          <KpiCard label="Evidence" value={evidenceCount} foot="days with attached proof or reference links" values={evidenceLine.length ? evidenceLine : progressLine} />
        </section>

        <section className="prm-layout">
          <div className="prm-main-stack">
            <article className="prm-panel prm-card">
              <div className="prm-panel-head">
                <div>
                  <h2 className="prm-title">Program cockpit</h2>
                  <p className="prm-subtitle">A premium overview of delivery pace, weekly momentum, materials, and course health.</p>
                </div>
                <div className="prm-chip-row">
                  {chipValues.map((chip) => (
                    <span key={`cockpit-${chip}`} className="prm-chip">{chip}</span>
                  ))}
                </div>
              </div>

              <div className="prm-progress-card">
                <div className="prm-between">
                  <strong>Roadmap completion</strong>
                  <span>{courseCompletionPct}% complete · {averageProgress}% average progress</span>
                </div>
                <div className="prm-progress-track">
                  <div className="prm-progress-fill" style={{ width: `${averageProgress}%` }} />
                </div>
                <div className="prm-chip-row compact">
                  <span className="prm-chip active">{completedCount} days completed</span>
                  <span className="prm-chip">{activeCount} in progress</span>
                  <span className="prm-chip">{blockedCount} blockers open</span>
                </div>
              </div>

              <div className="prm-tab-row">
                <button type="button" className={`prm-tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
                <button type="button" className={`prm-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>Analytics</button>
                <button type="button" className={`prm-tab-btn ${activeTab === 'materials' ? 'active' : ''}`} onClick={() => setActiveTab('materials')}>Materials</button>
              </div>

              <div className="prm-tab-surface">
                {activeTab === 'overview' ? (
                  <OverviewTab
                    weeklyProgress={weeklyProgress}
                    blockedCount={blockedCount}
                    activeCount={activeCount}
                    completedCount={completedCount}
                    totalDays={days.length}
                    latestUpdatedDay={summary?.latestUpdatedDay}
                  />
                ) : null}
                {activeTab === 'analytics' ? (
                  <AnalyticsTab statusCounts={summary?.statusCounts} phaseProgress={phaseProgress} weeklyProgress={weeklyProgress} />
                ) : null}
                {activeTab === 'materials' ? <MaterialsTab selectedDay={selectedDay} course={course} /> : null}
              </div>
            </article>
          </div>

          <aside className="prm-right-rail prm-right-rail-compact">
            <article className="prm-panel prm-card prm-selected-card">
              <div className="prm-panel-head compact">
                <div>
                  <h2 className="prm-title">Selected day</h2>
                  <p className="prm-subtitle">Live detail panel with richer context and actions.</p>
                </div>
                <span className="prm-phase-badge">{selectedDay?.phaseLabel || 'General'}</span>
              </div>

              {selectedDay ? (
                <>
                  <div className="prm-selected-day">
                    <div className="prm-ring large" style={{ '--value': form.progressPercent, '--ring-color': statusRingColor[form.status] }}>
                      <div className="prm-ring-text">{form.progressPercent}%</div>
                    </div>
                    <div>
                      <div className={`prm-status-pill ${statusClass[form.status]}`}>{statusLabel[form.status]}</div>
                      <h3>{`Day ${selectedDay.dayNumber} · ${selectedDay.title}`}</h3>
                      <p>{selectedDay.focus}</p>
                    </div>
                  </div>

                  <div className="prm-meta-grid">
                    <div className="prm-meta-chip"><strong>Week</strong><span>{selectedDay.weekNumber}</span></div>
                    <div className="prm-meta-chip"><strong>Hours</strong><span>{selectedDay.hours}</span></div>
                    <div className="prm-meta-chip"><strong>Score</strong><span>{selectedDay.score}</span></div>
                    <div className="prm-meta-chip"><strong>Evidence</strong><span>{computeEvidenceState(selectedDay)}</span></div>
                  </div>

                  <div className="prm-action-row">
                    <button type="button" className="prm-btn prm-btn-secondary" onClick={() => setActiveTab('materials')}>
                      <BookOpenText size={15} /> Open materials
                    </button>
                    {selectedDay.evidenceUrl ? (
                      <a className="prm-btn prm-btn-secondary" href={safeExternalUrl(selectedDay.evidenceUrl)} target="_blank" rel="noreferrer">
                        <LinkIcon size={15} /> Open evidence
                      </a>
                    ) : null}
                    <button type="button" className="prm-btn prm-btn-primary" onClick={() => void onRefresh?.()}>
                      <RefreshCcw size={15} /> Sync
                    </button>
                  </div>
                </>
              ) : null}
            </article>

            <article className="prm-panel prm-card">
              <div className="prm-panel-head compact">
                <div>
                  <h2 className="prm-title">Update progress</h2>
                  <p className="prm-subtitle">This panel updates the selected day and refreshes the dashboard instantly.</p>
                </div>
              </div>
              <div className="prm-form-grid">
                <div className="prm-field">
                  <label className="prm-label" htmlFor="prm-status-select">Status</label>
                  <select id="prm-status-select" className="prm-select" value={form.status} onChange={(event) => handleStatusChange(event.target.value)}>
                    <option value="not-started">Not started</option>
                    <option value="in-progress">In progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="complete">Completed</option>
                  </select>
                </div>

                <div className="prm-field">
                  <label className="prm-label" htmlFor="prm-progress-range">Completion</label>
                  <div className="prm-range-row">
                    <span>0%</span>
                    <input
                      id="prm-progress-range"
                      className="prm-range"
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={form.progressPercent}
                      onChange={(event) => handleRangeChange(event.target.value)}
                    />
                    <strong>{form.progressPercent}%</strong>
                  </div>
                </div>

                <div className="prm-field">
                  <label className="prm-label" htmlFor="prm-notes-input">Notes</label>
                  <textarea
                    id="prm-notes-input"
                    className="prm-textarea"
                    rows="4"
                    placeholder="Add what was completed, what changed, and what still needs review."
                    value={form.notes}
                    onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  />
                </div>

                <div className="prm-field">
                  <label className="prm-label" htmlFor="prm-evidence-input">Evidence URL</label>
                  <input
                    id="prm-evidence-input"
                    className="prm-input"
                    type="url"
                    placeholder="Repository, document, or screenshot link"
                    value={form.evidenceUrl}
                    onChange={(event) => setForm((current) => ({ ...current, evidenceUrl: event.target.value }))}
                  />
                </div>

                <button type="button" className="prm-btn prm-btn-primary full-width" onClick={handleSave} disabled={toDayId(savingDay) === toDayId(selectedDay?.dayNumber)}>
                  {toDayId(savingDay) === toDayId(selectedDay?.dayNumber) ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />} Save update
                </button>
              </div>
            </article>

            <article className="prm-panel prm-card">
              <div className="prm-panel-head compact">
                <div>
                  <h2 className="prm-title">Right-rail timeline</h2>
                  <p className="prm-subtitle">A vertical progress spine showing completed work, active effort, and what comes next.</p>
                </div>
              </div>
              <div className="prm-timeline">
                {timelineDays.map((day) => (
                  <button
                    type="button"
                    key={`timeline-${day.dayNumber}`}
                    className={`prm-timeline-item ${day.status} ${toDayId(day.dayNumber) === selectedDayId ? 'active' : ''}`}
                    onClick={() => setSelectedDayId(toDayId(day.dayNumber))}
                  >
                    <strong>{`Day ${day.dayNumber} · ${statusLabel[day.status]}`}</strong>
                    <span>{day.title}<br />{day.phaseLabel} · {relativeUpdateLabel(day.updatedAt)}</span>
                  </button>
                ))}
              </div>
            </article>
          </aside>

          <article className="prm-panel prm-card prm-full-width-grid">
            <div className="prm-toolbar">
              <div>
                <h2 className="prm-title">Interactive day grid</h2>
                <p className="prm-subtitle">Select a day to update status, review evidence, or inspect learning context.</p>
              </div>
              <div className="prm-filter-row">
                <button type="button" className={`prm-filter-btn ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>All</button>
                <button type="button" className={`prm-filter-btn ${activeFilter === 'active' ? 'active' : ''}`} onClick={() => setActiveFilter('active')}>Active</button>
                <button type="button" className={`prm-filter-btn ${activeFilter === 'completed' ? 'active' : ''}`} onClick={() => setActiveFilter('completed')}>Completed</button>
                <button type="button" className={`prm-filter-btn ${activeFilter === 'blocked' ? 'active' : ''}`} onClick={() => setActiveFilter('blocked')}>Blocked</button>
              </div>
            </div>

            <div className="prm-between prm-search-row">
              <label className="prm-search-box">
                <Search size={17} />
                <input
                  className="prm-search-input"
                  type="search"
                  placeholder="Search day, topic, or deliverable"
                  value={activeSearch}
                  onChange={(event) => setActiveSearch(event.target.value)}
                />
              </label>
              <div className="prm-legend">
                <span><i className="complete" />Completed</span>
                <span><i className="active" />In progress</span>
                <span><i className="blocked" />Blocked</span>
              </div>
            </div>

            {filteredDays.length ? (
              <div className="prm-day-grid">
                {filteredDays.map((day) => (
                  <article
                    className={`prm-day-card ${toDayId(day.dayNumber) === selectedDayId ? 'active' : ''}`}
                    key={`grid-day-${day.dayNumber}`}
                    onClick={() => openDayPopup(day.dayNumber)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openDayPopup(day.dayNumber);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="prm-topline">
                      <div className="prm-day-id">Day {day.dayNumber}</div>
                      <div className="prm-ring" style={{ '--value': day.progressPercent, '--ring-color': statusRingColor[day.status] }}>
                        <div className="prm-ring-text">{day.progressPercent}%</div>
                      </div>
                    </div>

                    <div className="prm-between gap-start">
                      <strong>{day.title}</strong>
                      <span className={`prm-status-pill ${statusClass[day.status]}`}>{statusLabel[day.status]}</span>
                    </div>

                    <div className="prm-day-focus">{day.focus}</div>

                    <div className="prm-mini-progress">
                      <span style={{ width: `${day.progressPercent}%`, background: `linear-gradient(90deg, ${statusRingColor[day.status]}, var(--prm-cyan))` }} />
                    </div>

                    <div className="prm-between prm-day-footer">
                      <span>{day.phaseLabel}</span>
                      <span>{relativeUpdateLabel(day.updatedAt)}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="prm-empty-state">
                <Filter size={18} /> No days match the active filter or search.
              </div>
            )}
          </article>
        </section>
      </div>

      {popupDay ? (
        <div className="prm-modal-backdrop" onClick={() => setPopupDayId(null)} role="presentation">
          <div
            className="prm-modal"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="prm-modal-title"
            tabIndex={-1}
            onKeyDown={handleModalKeyDown}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="prm-modal-head">
              <div>
                <div className="prm-small-label">Day deep-dive</div>
                <h3 id="prm-modal-title">{`Day ${popupDay.dayNumber} - ${popupDay.title}`}</h3>
                <p>{popupDay.focus}</p>
              </div>
              <button type="button" ref={closeButtonRef} className="prm-modal-close" onClick={() => setPopupDayId(null)} aria-label="Close details popup">
                <X size={18} />
              </button>
            </div>

            <div className="prm-modal-status-row">
              <span className={`prm-status-pill ${statusClass[popupDay.status]}`}>{statusLabel[popupDay.status]}</span>
              <span className="prm-chip active">{popupDay.progressPercent}% complete</span>
              <span className="prm-chip">{popupDay.phaseLabel}</span>
              <span className="prm-chip">Week {popupDay.weekNumber}</span>
            </div>

            <div className="prm-modal-grid">
              <article className="prm-note-card">
                <strong>Edit progress</strong>
                <div className="prm-form-grid">
                  <div className="prm-field">
                    <label className="prm-label" htmlFor="prm-popup-status-select">Status</label>
                    <select id="prm-popup-status-select" className="prm-select" value={form.status} onChange={(event) => handleStatusChange(event.target.value)}>
                      <option value="not-started">Not started</option>
                      <option value="in-progress">In progress</option>
                      <option value="blocked">Blocked</option>
                      <option value="complete">Completed</option>
                    </select>
                  </div>

                  <div className="prm-field">
                    <label className="prm-label" htmlFor="prm-popup-progress-range">Completion</label>
                    <div className="prm-range-row">
                      <span>0%</span>
                      <input
                        id="prm-popup-progress-range"
                        className="prm-range"
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={form.progressPercent}
                        onChange={(event) => handleRangeChange(event.target.value)}
                      />
                      <strong>{form.progressPercent}%</strong>
                    </div>
                  </div>

                  <div className="prm-field">
                    <label className="prm-label" htmlFor="prm-popup-notes-input">Notes</label>
                    <textarea
                      id="prm-popup-notes-input"
                      className="prm-textarea"
                      rows="4"
                      placeholder="Add what was completed, what changed, and what still needs review."
                      value={form.notes}
                      onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                    />
                  </div>

                  <div className="prm-field">
                    <label className="prm-label" htmlFor="prm-popup-evidence-input">Evidence URL</label>
                    <input
                      id="prm-popup-evidence-input"
                      className="prm-input"
                      type="url"
                      placeholder="Repository, document, or screenshot link"
                      value={form.evidenceUrl}
                      onChange={(event) => setForm((current) => ({ ...current, evidenceUrl: event.target.value }))}
                    />
                  </div>

                  <button type="button" className="prm-btn prm-btn-primary full-width" onClick={() => void handleSave()} disabled={toDayId(savingDay) === toDayId(selectedDay?.dayNumber)}>
                    {toDayId(savingDay) === toDayId(selectedDay?.dayNumber) ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />} Save update
                  </button>
                </div>
              </article>

              <article className="prm-note-card">
                <strong>Execution context</strong>
                <p><strong>Objective:</strong> {popupDay.objective || 'N/A'}</p>
                <p><strong>Primary deliverable:</strong> {popupDay.primaryDeliverable || 'N/A'}</p>
                <p><strong>Day type:</strong> {popupDay.dayType || 'N/A'}</p>
                <p><strong>Hours:</strong> {popupDay.hours || 'N/A'}</p>
                <p><strong>Score:</strong> {popupDay.score}</p>
                <p><strong>Last update:</strong> {relativeUpdateLabel(popupDay.updatedAt)}</p>
              </article>

              <article className="prm-note-card">
                <strong>Progress notes</strong>
                <p>{popupDay.notes ? popupDay.notes : 'No notes added for this day yet.'}</p>
                <strong className="prm-modal-section-label">Evidence</strong>
                {popupDay.evidenceUrl ? (
                  <a href={safeExternalUrl(popupDay.evidenceUrl)} target="_blank" rel="noreferrer" className="prm-modal-link">
                    Open evidence link <ArrowUpRight size={14} />
                  </a>
                ) : (
                  <p>No evidence URL attached.</p>
                )}
              </article>

              <article className="prm-note-card">
                <strong>Sections</strong>
                {popupDay.sections?.length ? (
                  <div className="prm-modal-list">
                    {popupDay.sections.map((section) => (
                      <div className="prm-modal-list-item" key={`${popupDay.dayNumber}-${section.label}-${section.value}`}>
                        <span>{section.label}</span>
                        <strong>{section.value}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No section details for this day.</p>
                )}
              </article>

              <article className="prm-note-card">
                <strong>Materials and deliverables</strong>
                <strong className="prm-modal-section-label">Materials</strong>
                {popupDay.materials?.length ? (
                  <div className="prm-modal-list">
                    {popupDay.materials.map((item) => (
                      <div className="prm-modal-list-item" key={`${popupDay.dayNumber}-${item.id || item.url || item.title}`}>
                        <span>{item.title}</span>
                        {item.url ? (
                          <a href={safeExternalUrl(item.url)} target="_blank" rel="noreferrer" className="prm-modal-link inline">
                            Open <ArrowUpRight size={13} />
                          </a>
                        ) : <strong>Preview only</strong>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No materials linked.</p>
                )}

                <strong className="prm-modal-section-label">Week deliverables</strong>
                {popupDay.weekDeliverables?.length ? (
                  <div className="prm-modal-list">
                    {popupDay.weekDeliverables.map((item, index) => (
                      <div className="prm-modal-list-item" key={`${popupDay.dayNumber}-deliverable-${index}`}>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No week deliverables listed.</p>
                )}
              </article>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`prm-toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}
