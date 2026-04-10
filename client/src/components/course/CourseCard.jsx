import { ArrowRight, BookOpenCheck, Download, Edit3, Layers3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { withApiOrigin } from '../../api/client';

export function CourseCard({ course, actionLabel = 'Open course', actionTo = '#', showEdit = false, editTo = '#', footerContent = null }) {
  return (
    <article className="panel-card course-card-item">
      <div className="course-card-top">
        <div>
          <span className="eyebrow soft">{course.category || 'Course'} · {course.level || 'Level'}</span>
          <h3>{course.title}</h3>
          <p>{course.shortDescription}</p>
        </div>
        {course.brochure?.heroImageUrl ? <img src={withApiOrigin(course.brochure.heroImageUrl)} alt={course.title} className="course-card-image" /> : null}
      </div>

      <div className="course-card-meta">
        <span className="mini-badge"><Layers3 size={14} /> {course.weekCount || course.weeks?.length || 0} weeks</span>
        <span className="mini-badge"><BookOpenCheck size={14} /> {course.durationDays || 0} days</span>
        <span className={`mini-badge status-pill ${course.status || 'published'}`}>{course.status || 'published'}</span>
      </div>

      {course.brochure?.chips?.length ? (
        <div className="deliverable-strip compact-top">
          {course.brochure.chips.slice(0, 5).map((chip) => <span key={chip} className="mini-badge">{chip}</span>)}
        </div>
      ) : null}

      {course.summary ? (
        <div className="course-progress-strip">
          <div>
            <strong>{course.summary.completionPct}%</strong>
            <span>completion</span>
          </div>
          <div>
            <strong>{course.summary.statusCounts?.complete || 0}</strong>
            <span>complete</span>
          </div>
          <div>
            <strong>{course.summary.statusCounts?.['in-progress'] || 0}</strong>
            <span>active</span>
          </div>
        </div>
      ) : null}

      {footerContent}

      <div className="course-card-actions">
        <Link className="btn small primary" to={actionTo}>
          <ArrowRight size={16} /> {actionLabel}
        </Link>
        {course.brochure?.pdfUrl ? (
          <a className="btn small" href={withApiOrigin(course.brochure.pdfUrl)} target="_blank" rel="noreferrer">
            <Download size={16} /> Brochure
          </a>
        ) : null}
        {showEdit ? (
          <Link className="btn small" to={editTo}>
            <Edit3 size={16} /> Edit
          </Link>
        ) : null}
      </div>
    </article>
  );
}
