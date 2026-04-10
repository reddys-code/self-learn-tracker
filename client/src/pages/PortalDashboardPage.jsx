import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleDot, Gauge, Loader2, PauseCircle, RefreshCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { useSocketSync } from '../hooks/useSocketSync';
import { MetricCard } from '../components/portal/MetricCard';
import { UserProgressCharts } from '../components/charts/UserProgressCharts';
import { RecentActivityFeed } from '../components/portal/RecentActivityFeed';
import { CourseCard } from '../components/course/CourseCard';

export function PortalDashboardPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOverview = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/portal/overview');
      setOverview(data);
      if (data.courses?.length) {
        const stillExists = data.courses.some((course) => course.id === selectedCourseId);
        if (!selectedCourseId || !stillExists) {
          setSelectedCourseId(data.courses[0].id);
        }
      } else {
        setSelectedCourseId('');
      }
    } catch (loadError) {
      setError(loadError?.response?.data?.message || loadError.message || 'Failed to load learner dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  useSocketSync(Boolean(user), {
    'progress:updated': () => void loadOverview(),
    'courses:updated': () => void loadOverview(),
  });

  const selectedCourse = useMemo(() => {
    if (!overview?.courses?.length) return null;
    return overview.courses.find((course) => course.id === selectedCourseId) || overview.courses[0];
  }, [overview, selectedCourseId]);

  if (loading) {
    return (
      <div className="portal-page">
        <div className="fullscreen-center compact">
          <Loader2 className="spin" size={28} />
          <p>Loading your learning dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-page">
      <div className="page-header-row">
        <div>
          <span className="eyebrow soft">LEARNER DASHBOARD</span>
          <h1>{user?.name?.split(' ')[0] || 'Learner'} dashboard</h1>
          <p>Track every assigned course, update daily statuses, and keep evidence attached so admin dashboards stay current in real time.</p>
        </div>
        <button type="button" className="btn" onClick={() => void loadOverview()}>
          <RefreshCcw size={16} /> Refresh
        </button>
      </div>

      {error ? <div className="alert-box error">{error}</div> : null}

      <div className="metric-grid">
        <MetricCard label="Assigned courses" value={overview?.courses?.length || 0} hint="Visible in your portal" icon={Gauge} accent="blue" />
        <MetricCard label="Overall completion" value={`${overview?.overallCompletionPct || 0}%`} hint="Across all course days" icon={CheckCircle2} accent="green" />
        <MetricCard label="In progress" value={overview?.aggregateStatusCounts?.['in-progress'] || 0} hint="Currently active" icon={CircleDot} accent="teal" />
        <MetricCard label="Blocked" value={overview?.aggregateStatusCounts?.blocked || 0} hint="Needs intervention" icon={AlertTriangle} accent="gold" />
        <MetricCard label="Not started" value={overview?.aggregateStatusCounts?.['not-started'] || 0} hint="Remaining runway" icon={PauseCircle} accent="violet" />
      </div>

      {overview?.courses?.length ? (
        <section className="panel-card selector-card">
          <div className="panel-head compact">
            <div>
              <span className="eyebrow soft">COURSE SNAPSHOT</span>
              <h3>Inspect one course</h3>
            </div>
            <select value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)}>
              {overview.courses.map((course) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </div>
          <UserProgressCharts summary={selectedCourse?.summary} />
        </section>
      ) : null}

      <RecentActivityFeed items={overview?.recentActivity || []} title="Your latest activity" />

      <section className="course-section-stack">
        <div className="panel-head compact">
          <div>
            <span className="eyebrow soft">MY COURSES</span>
            <h3>Open a course and update the day grid</h3>
          </div>
        </div>
        <div className="course-card-grid">
          {(overview?.courses || []).map((course) => (
            <CourseCard key={course.id} course={course} actionLabel="Open tracker" actionTo={`/portal/courses/${course.slug}`} />
          ))}
        </div>
      </section>
    </div>
  );
}
