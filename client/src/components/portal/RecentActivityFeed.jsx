import { Clock3, Link as LinkIcon } from 'lucide-react';

const statusMap = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  blocked: 'Blocked',
  complete: 'Complete',
};

export function RecentActivityFeed({ items = [], title = 'Recent activity' }) {
  return (
    <section className="panel-card">
      <div className="panel-head">
        <div>
          <span className="eyebrow soft">LIVE FEED</span>
          <h3>{title}</h3>
        </div>
      </div>

      <div className="activity-feed">
        {items.length === 0 ? <p className="soft-text">No live updates yet.</p> : null}
        {items.map((item) => (
          <article className="activity-row" key={`${item.userId}-${item.courseId || 'course'}-${item.dayNumber}-${item.updatedAt}`}>
            <div>
              <strong>{item.userName || 'Learner'}</strong>
              <p>
                {item.courseTitle ? `${item.courseTitle} · ` : ''}
                Day {item.dayNumber} marked as <span className={`status-inline status-${item.status}`}>{statusMap[item.status] || item.status}</span>
              </p>
              {item.notes ? <small>{item.notes}</small> : null}
            </div>
            <div className="activity-meta">
              <span><Clock3 size={14} /> {new Date(item.updatedAt || Date.now()).toLocaleString()}</span>
              {item.evidenceUrl ? (
                <a href={item.evidenceUrl} target="_blank" rel="noreferrer">
                  <LinkIcon size={14} /> Evidence
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
