import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, RefreshCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { CourseCard } from '../components/course/CourseCard';
import { apiClient } from '../api/client';

const features = [
  'Create and publish unlimited courses from one admin console.',
  'Attach brochure PDFs, downloadable materials, and day-level resources.',
  'Assign courses to learners, collect daily status updates, and track charts live.',
  'Reuse the same module for architecture, cloud, onboarding, or certification tracks.',
];

export function PublicLandingPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCourses = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/public/courses');
      setCourses(data);
    } catch (loadError) {
      setError(loadError?.response?.data?.message || loadError.message || 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCourses();
  }, []);

  const featuredCourse = courses[0] || null;

  return (
    <div className="app-shell">
      <Navbar />

      <section className="hero-shell public-catalog-hero">
        <div className="container hero-grid">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="eyebrow"><Sparkles size={14} /> Reusable education module</span>
            <h1>Post courses, brochures, PDFs, day-grid materials, and live progress — from one portal.</h1>
            <p>
              This portal is now structured as a reusable education engine. Publish multiple programs, assign learners,
              collect daily updates, and give admins real-time dashboards with charts.
            </p>
            <div className="hero-cta-row">
              {featuredCourse ? (
                <Link className="btn primary" to={`/courses/${featuredCourse.slug}`}>
                  <ArrowRight size={18} /> Explore flagship course
                </Link>
              ) : null}
              <Link className="btn" to="/login">
                <ShieldCheck size={18} /> Open portal
              </Link>
            </div>
            <div className="hero-chip-row">
              {features.map((item) => (
                <span className="hero-chip" key={item}><CheckCircle2 size={14} /> {item}</span>
              ))}
            </div>
          </motion.div>

          <motion.div className="panel-card feature-promo-card" initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55, delay: 0.1 }}>
            <span className="eyebrow soft">What this portal gives you</span>
            <h3>Built like a course operations system, not a static brochure</h3>
            <ul className="bullet-list light">
              <li>Course catalog + public brochure pages</li>
              <li>Role-based login, admin console, and user management</li>
              <li>Dynamic day tracker for each course</li>
              <li>Downloadable PDFs and materials on the day grid</li>
              <li>Live charts for learner and admin reporting</li>
            </ul>
          </motion.div>
        </div>
      </section>

      <section className="section container" id="features">
        <div className="section-header">
          <div>
            <span className="eyebrow soft">COURSE CATALOG</span>
            <h2>Publish one course or many</h2>
          </div>
          <p>
            Each course gets its own brochure page, weekly curriculum explorer, downloads, and learner tracker.
            Admins can draft, publish, and update without rebuilding the app.
          </p>
        </div>

        {loading ? (
          <div className="loading-state compact-card">
            <Loader2 size={30} className="spin" />
            <p>Loading published courses…</p>
          </div>
        ) : null}

        {error ? (
          <div className="error-state compact-card">
            <p>{error}</p>
            <button type="button" className="btn primary" onClick={() => void loadCourses()}>
              <RefreshCcw size={16} /> Retry
            </button>
          </div>
        ) : null}

        <div className="course-card-grid">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} actionLabel="View brochure" actionTo={`/courses/${course.slug}`} />
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
