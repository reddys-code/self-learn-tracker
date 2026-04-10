import { useState } from 'react';
import { Loader2, LockKeyhole, Rocket } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { isAuthenticated, needsSetup, login, setAuthError, authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/portal" replace />;
  }

  if (needsSetup) {
    return <Navigate to="/setup" replace />;
  }

  const redirectTo = location.state?.from || '/portal';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setAuthError('');
    try {
      await login(form);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setAuthError(error?.response?.data?.message || error.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">EP</span>
          <div>
            <strong>Education Portal</strong>
            <p>Login to update daily progress, downloads, and admin charts.</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-copy">
            <span className="eyebrow soft">SECURE LOGIN</span>
            <h1>Welcome back</h1>
            <p>Track assigned courses, update each day grid, and let admins monitor progress in real time.</p>
          </div>

          <label>
            <span>Email</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              required
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            />
          </label>

          {authError ? <p className="form-message error">{authError}</p> : null}

          <button type="submit" className="btn primary auth-submit" disabled={submitting}>
            {submitting ? <Loader2 size={18} className="spin" /> : <LockKeyhole size={18} />} Login
          </button>
        </form>

        <div className="auth-footer-links">
          <Link to="/">Back to catalog</Link>
          <Link to="/setup"><Rocket size={14} /> First-time admin setup</Link>
        </div>
      </div>
    </div>
  );
}
