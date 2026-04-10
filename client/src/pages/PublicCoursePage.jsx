import { useEffect, useState } from 'react';
import { ArrowLeft, Download, Loader2, RefreshCcw } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { WeekExplorer } from '../components/WeekExplorer';
import { apiClient, withApiOrigin } from '../api/client';

function StatTiles({ stats = [] }) {
  if (!stats.length) return null;
  return (
    <div className="metric-grid public-stats-grid">
      {stats.map((stat) => (
        <div className="metric-card" key={`${stat.label}-${stat.value}`}>
          <strong>{stat.value}</strong>
          <span>{stat.label}</span>
        </div>
      ))}
    </div>
  );
}

function SimpleListBlock({ title, items = [] }) {
  if (!items.length) return null;
  return (
    <section className="panel-card brochure-block">
      <h3>{title}</h3>
      <ul className="bullet-list dark">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}

export function PublicCoursePage() {
  const { courseRef } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCourse = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get(`/public/courses/${courseRef}`);
      setCourse(data);
    } catch (loadError) {
      setError(loadError?.response?.data?.message || loadError.message || 'Failed to load course.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCourse();
  }, [courseRef]);

  return (
    <div className="app-shell">
      <Navbar />
      <section className="section container top-pad">
        <Link className="back-link" to="/">
          <ArrowLeft size={16} /> Back to catalog
        </Link>

        {loading ? (
          <div className="loading-state compact-card">
            <Loader2 size={32} className="spin" />
            <p>Loading brochure…</p>
          </div>
        ) : null}

        {error ? (
          <div className="error-state compact-card">
            <p>{error}</p>
            <button type="button" className="btn primary" onClick={() => void loadCourse()}>
              <RefreshCcw size={16} /> Retry
            </button>
          </div>
        ) : null}

        {course ? (
          <>
            <section className="panel-card brochure-hero-card">
              <div className="brochure-hero-grid">
                <div>
                  <span className="eyebrow">{course.brochure?.eyebrow || 'COURSE BROCHURE'}</span>
                  <h1>{course.brochure?.headline || course.title}</h1>
                  <p>{course.brochure?.lead || course.shortDescription}</p>
                  <div className="hero-chip-row">
                    {(course.brochure?.chips || []).map((chip) => <span key={chip} className="hero-chip">{chip}</span>)}
                  </div>
                  <div className="hero-cta-row">
                    {course.brochure?.pdfUrl ? (
                      <a className="btn primary" href={withApiOrigin(course.brochure.pdfUrl)} target="_blank" rel="noreferrer">
                        <Download size={18} /> Download brochure
                      </a>
                    ) : null}
                    <Link className="btn" to="/login">Login to track progress</Link>
                  </div>
                </div>
                {course.brochure?.heroImageUrl ? <img src={withApiOrigin(course.brochure.heroImageUrl)} alt={course.title} className="brochure-hero-image" /> : null}
              </div>
            </section>

            <StatTiles stats={course.stats} />

            <section className="brochure-grid-two">
              <SimpleListBlock title="Why this course works" items={course.brochure?.differentiators || []} />
              <SimpleListBlock title="Who it is for" items={course.brochure?.audience || []} />
              <SimpleListBlock title="What learners finish with" items={course.brochure?.outcomes || []} />
              <SimpleListBlock title="Delivery cadence" items={course.brochure?.cadence || []} />
            </section>

            {course.downloads?.length ? (
              <section className="panel-card brochure-block" id="downloads">
                <h3>Course downloads</h3>
                <div className="deliverable-strip wrap">
                  {course.downloads.map((item) => (
                    <a className="mini-badge material-badge" key={item.id || item.url} href={withApiOrigin(item.url)} target="_blank" rel="noreferrer">
                      <Download size={14} /> {item.title}
                    </a>
                  ))}
                </div>
              </section>
            ) : null}

            <WeekExplorer
              weeks={course.weeks}
              progressMap={{}}
              readOnly
              title="Curriculum path and day grid"
              description="Browse the live day-by-day curriculum. Learners can update statuses, notes, and evidence after login."
            />
          </>
        ) : null}
      </section>
      <Footer />
    </div>
  );
}
