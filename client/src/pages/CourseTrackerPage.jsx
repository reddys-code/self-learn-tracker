import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, RefreshCcw } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PremiumRoadmapTracker } from '../components/roadmap/PremiumRoadmapTracker';
import { apiClient } from '../api/client';
import { useSocketSync } from '../hooks/useSocketSync';

function mapProgressList(progressList) {
  return progressList.reduce((acc, entry) => {
    acc[entry.dayNumber] = entry;
    return acc;
  }, {});
}

export function CourseTrackerPage() {
  const { courseRef } = useParams();
  const [course, setCourse] = useState(null);
  const [progressMap, setProgressMap] = useState({});
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingDay, setSavingDay] = useState(null);
  const [error, setError] = useState('');

  const loadCourse = async () => {
    setLoading(true);
    setError('');
    try {
      const [courseResponse, progressResponse, summaryResponse] = await Promise.all([
        apiClient.get(`/portal/courses/${courseRef}`),
        apiClient.get(`/portal/courses/${courseRef}/progress`),
        apiClient.get(`/portal/courses/${courseRef}/summary`),
      ]);
      setCourse(courseResponse.data);
      setProgressMap(mapProgressList(progressResponse.data));
      setSummary(summaryResponse.data);
    } catch (loadError) {
      setError(loadError?.response?.data?.message || loadError.message || 'Failed to load course tracker.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCourse();
  }, [courseRef]);

  useSocketSync(Boolean(courseRef), {
    'progress:updated': (payload) => {
      if (!payload?.courseRef || payload.courseRef === courseRef || payload.progress?.courseId === course?.id) {
        void loadCourse();
      }
    },
    'courses:updated': () => void loadCourse(),
  });

  const saveProgress = async (dayNumber, payload) => {
    setSavingDay(dayNumber);
    setError('');
    try {
      const { data } = await apiClient.put(`/portal/courses/${courseRef}/progress/${dayNumber}`, payload);
      setProgressMap((current) => ({ ...current, [dayNumber]: data }));
      const summaryResponse = await apiClient.get(`/portal/courses/${courseRef}/summary`);
      setSummary(summaryResponse.data);
      return { ok: true };
    } catch (saveError) {
      const message = saveError?.response?.data?.message || saveError.message || 'Failed to save progress.';
      setError(message);
      return { ok: false, message };
    } finally {
      setSavingDay(null);
    }
  };

  const completionLabel = useMemo(() => `${summary?.completionPct || 0}% complete`, [summary]);

  if (loading) {
    return (
      <div className="portal-page">
        <div className="fullscreen-center compact">
          <Loader2 className="spin" size={28} />
          <p>Loading tracker...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return <div className="portal-page"><div className="alert-box error">{error || 'Course unavailable.'}</div></div>;
  }

  return (
    <div className="portal-page">
      <div className="page-header-row">
        <div>
          <Link className="back-link inside-portal" to="/portal/courses"><ArrowLeft size={16} /> Back to courses</Link>
          <span className="eyebrow soft">COURSE ROADMAP</span>
          <h1>{course.title}</h1>
          <p>{course.shortDescription}</p>
          <div className="deliverable-strip compact-top">
            <span className="mini-badge">{completionLabel}</span>
            <span className="mini-badge">{course.durationDays} days</span>
            <span className="mini-badge">{course.weeks.length} weeks</span>
          </div>
        </div>
        <button type="button" className="btn" onClick={() => void loadCourse()}>
          <RefreshCcw size={16} /> Refresh
        </button>
      </div>

      {error ? <div className="alert-box error">{error}</div> : null}

      <PremiumRoadmapTracker
        course={course}
        summary={summary}
        progressMap={progressMap}
        onSaveProgress={saveProgress}
        savingDay={savingDay}
        onRefresh={loadCourse}
      />
    </div>
  );
}
