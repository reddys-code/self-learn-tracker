import { useEffect, useState } from 'react';
import { Loader2, RefreshCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { useSocketSync } from '../hooks/useSocketSync';
import { CourseCard } from '../components/course/CourseCard';

export function CourseCatalogPage() {
  const { isAdmin, user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCourses = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/portal/courses');
      setCourses(data);
    } catch (loadError) {
      setError(loadError?.response?.data?.message || loadError.message || 'Failed to load your courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCourses();
  }, []);

  useSocketSync(Boolean(user), {
    'progress:updated': () => void loadCourses(),
    'courses:updated': () => void loadCourses(),
  });

  if (loading) {
    return (
      <div className="portal-page">
        <div className="fullscreen-center compact">
          <Loader2 className="spin" size={28} />
          <p>Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-page">
      <div className="page-header-row">
        <div>
          <span className="eyebrow soft">COURSE LIBRARY</span>
          <h1>{isAdmin ? 'All courses in the portal' : 'Courses available to you'}</h1>
          <p>
            Open a course brochure, review downloads, and jump into the day-by-day tracker. {isAdmin ? 'Admins can also open the builder to edit and publish.' : ''}
          </p>
        </div>
        <button type="button" className="btn" onClick={() => void loadCourses()}>
          <RefreshCcw size={16} /> Refresh
        </button>
      </div>

      {error ? <div className="alert-box error">{error}</div> : null}

      <div className="course-card-grid">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            actionLabel="Open tracker"
            actionTo={`/portal/courses/${course.slug}`}
            showEdit={isAdmin}
            editTo={`/portal/admin/courses?course=${course.slug}`}
          />
        ))}
      </div>
    </div>
  );
}
