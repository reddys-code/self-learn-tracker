import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function SetupPage() {
  const { isAuthenticated, needsSetup, bootstrapAdmin, setAuthError, authError } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/portal/admin" replace />;
  }

  if (!needsSetup) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setAuthError('');
    try {
      await bootstrapAdmin(form);
      navigate('/portal/admin', { replace: true });
    } catch (error) {
      setAuthError(error?.response?.data?.message || error.message || 'Setup failed.');
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
            <strong>Initialize admin access</strong>
            <p>Create the first administrator for the education portal.</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-copy">
            <span className="eyebrow soft">FIRST-RUN SETUP</span>
            <h1>Create the first admin</h1>
            <p>This account unlocks the admin dashboard, user management, and real-time progress monitoring.</p>
          </div>

          <label>
            <span>Full name</span>
            <input
              type="text"
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
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
              minLength={8}
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            />
          </label>

          {authError ? <p className="form-message error">{authError}</p> : null}

          <button type="submit" className="btn primary auth-submit" disabled={submitting}>
            {submitting ? <Loader2 size={18} className="spin" /> : <ShieldCheck size={18} />} Create admin
          </button>
        </form>

        <div className="auth-footer-links">
          <Link to="/">Back to catalog</Link>
        </div>
      </div>
    </div>
  );
}
