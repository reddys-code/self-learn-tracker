import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Gauge, Loader2, RefreshCcw, ShieldCheck, Users } from 'lucide-react';
import { apiClient } from '../api/client';
import { useSocketSync } from '../hooks/useSocketSync';
import { MetricCard } from '../components/portal/MetricCard';
import { AdminProgressCharts } from '../components/charts/AdminProgressCharts';
import { RecentActivityFeed } from '../components/portal/RecentActivityFeed';
import { UserProgressCharts } from '../components/charts/UserProgressCharts';

export function AdminOverviewPage() {
  const [overview, setOverview] = useState(null);
  const [selectedCourseRef, setSelectedCourseRef] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOverview = async (courseRef = selectedCourseRef, resetUserSelection = false) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/admin/overview', { params: courseRef ? { courseRef } : {} });
      setOverview(data);
      const resolvedCourseRef = courseRef || data.selectedCourse?.slug || '';
      setSelectedCourseRef(resolvedCourseRef);
      if ((resetUserSelection || !selectedUserId) && data.users?.length) {
        setSelectedUserId(data.users[0].id);
      }
    } catch (loadError) {
      setError(loadError?.response?.data?.message || loadError.message || 'Failed to load admin overview.');
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetail = async (userId, courseRef = selectedCourseRef) => {
    if (!userId || !courseRef) return;
    try {
      const { data } = await apiClient.get(`/admin/courses/${courseRef}/users/${userId}/progress`);
      setSelectedUserDetail(data);
    } catch (loadError) {
      setError(loadError?.response?.data?.message || loadError.message || 'Failed to load learner detail.');
    }
  };

  useEffect(() => {
    void loadOverview('', true);
  }, []);

  useEffect(() => {
    if (selectedUserId && selectedCourseRef) {
      void loadUserDetail(selectedUserId, selectedCourseRef);
    }
  }, [selectedUserId, selectedCourseRef]);

  useSocketSync(true, {
    'progress:updated': () => {
      void loadOverview(selectedCourseRef);
      if (selectedUserId && selectedCourseRef) {
        void loadUserDetail(selectedUserId, selectedCourseRef);
      }
    },
    'users:updated': () => void loadOverview(selectedCourseRef),
    'courses:updated': () => void loadOverview(selectedCourseRef),
  });

  const selectedUser = useMemo(
    () => overview?.users?.find((user) => user.id === selectedUserId) || null,
    [overview, selectedUserId]
  );

  if (loading) {
    return (
      <div className="portal-page">
        <div className="fullscreen-center compact">
          <Loader2 className="spin" size={28} />
          <p>Loading admin overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-page">
      <div className="page-header-row">
        <div>
          <span className="eyebrow soft">ADMIN CONSOLE</span>
          <h1>Real-time progress command center</h1>
          <p>Filter by course, monitor learner charts live, and drill into an individual learner without leaving the portal.</p>
        </div>
        <button type="button" className="btn" onClick={() => void loadOverview(selectedCourseRef)}>
          <RefreshCcw size={16} /> Refresh
        </button>
      </div>

      {error ? <div className="alert-box error">{error}</div> : null}

      <section className="panel-card selector-card">
        <div className="panel-head compact">
          <div>
            <span className="eyebrow soft">COURSE FILTER</span>
            <h3>Choose a course</h3>
          </div>
          <select value={selectedCourseRef} onChange={(event) => {
            setSelectedCourseRef(event.target.value);
            setSelectedUserId('');
            void loadOverview(event.target.value, true);
          }}>
            {(overview?.courses || []).map((course) => (
              <option key={course.id} value={course.slug}>{course.title} · {course.status}</option>
            ))}
          </select>
        </div>
      </section>

      <div className="metric-grid">
        <MetricCard label="Active learners" value={overview?.activeUsers || 0} hint="Current visible users" icon={Users} accent="blue" />
        <MetricCard label="Admins" value={overview?.adminCount || 0} hint="Portal owners" icon={ShieldCheck} accent="violet" />
        <MetricCard label="Course completion" value={`${overview?.overallCompletionPct || 0}%`} hint="Across active learners" icon={Gauge} accent="green" />
        <MetricCard label="Completed day slots" value={overview?.aggregateStatusCounts?.complete || 0} hint="All complete statuses" icon={CheckCircle2} accent="teal" />
      </div>

      <AdminProgressCharts overview={overview} />
      <RecentActivityFeed items={overview?.recentActivity || []} title="Live learner activity" />

      <section className="panel-card inspector-card">
        <div className="panel-head">
          <div>
            <span className="eyebrow soft">USER INSPECTOR</span>
            <h3>Inspect one learner for the selected course</h3>
          </div>
          <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
            {(overview?.users || []).map((user) => (
              <option key={user.id} value={user.id}>{user.name} ({user.completionPct}%)</option>
            ))}
          </select>
        </div>

        {selectedUser ? (
          <div className="inspector-summary">
            <div className="inspector-meta">
              <strong>{selectedUser.name}</strong>
              <p>{selectedUser.email}</p>
              <span className={`role-pill ${selectedUser.role === 'admin' ? 'admin' : 'user'}`}>{selectedUser.role}</span>
              <small>{selectedUser.isActive ? 'Active' : 'Inactive'} · Last update {selectedUser.lastUpdatedAt ? new Date(selectedUser.lastUpdatedAt).toLocaleString() : '—'}</small>
            </div>
            <div className="metric-grid compact-grid">
              <MetricCard label="Completion" value={`${selectedUser.completionPct}%`} accent="blue" />
              <MetricCard label="Complete" value={selectedUser.completeDays} accent="green" />
              <MetricCard label="Blocked" value={selectedUser.blockedDays} accent="gold" />
            </div>
          </div>
        ) : null}

        <UserProgressCharts summary={selectedUserDetail?.summary} />
      </section>
    </div>
  );
}
