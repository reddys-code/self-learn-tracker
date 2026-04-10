import { useEffect, useState } from 'react';
import { Loader2, RefreshCcw } from 'lucide-react';
import { apiClient } from '../api/client';
import { useSocketSync } from '../hooks/useSocketSync';
import { UserManagementTable } from '../components/portal/UserManagementTable';

export function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyUserId, setBusyUserId] = useState('');
  const [flash, setFlash] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [userResponse, courseResponse] = await Promise.all([
        apiClient.get('/users'),
        apiClient.get('/admin/courses'),
      ]);
      setUsers(userResponse.data);
      setCourses(courseResponse.data);
    } catch (loadError) {
      setError(loadError?.response?.data?.message || loadError.message || 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useSocketSync(true, {
    'users:updated': () => void loadData(),
    'courses:updated': () => void loadData(),
  });

  const createUser = async (payload) => {
    setBusy(true);
    setFlash('');
    try {
      await apiClient.post('/users', payload);
      await loadData();
      return { ok: true };
    } catch (requestError) {
      const message = requestError?.response?.data?.message || requestError.message || 'Failed to create user.';
      setFlash(message);
      return { ok: false, message };
    } finally {
      setBusy(false);
    }
  };

  const updateUser = async (userId, payload) => {
    setBusyUserId(userId);
    setFlash('');
    try {
      await apiClient.patch(`/users/${userId}`, payload);
      await loadData();
      return { ok: true };
    } catch (requestError) {
      const message = requestError?.response?.data?.message || requestError.message || 'Failed to update user.';
      setFlash(message);
      return { ok: false, message };
    } finally {
      setBusyUserId('');
    }
  };

  if (loading) {
    return (
      <div className="portal-page">
        <div className="fullscreen-center compact">
          <Loader2 className="spin" size={28} />
          <p>Loading user management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-page">
      <div className="page-header-row">
        <div>
          <span className="eyebrow soft">ADMIN</span>
          <h1>User management portal</h1>
          <p>Create learner accounts, assign courses, elevate admins, and control access without leaving the app.</p>
        </div>
        <button type="button" className="btn" onClick={() => void loadData()}>
          <RefreshCcw size={16} /> Refresh
        </button>
      </div>

      {error ? <div className="alert-box error">{error}</div> : null}
      {flash ? <div className="alert-box error">{flash}</div> : null}

      <UserManagementTable
        users={users}
        courses={courses}
        onCreateUser={createUser}
        onUpdateUser={updateUser}
        busy={busy}
        busyUserId={busyUserId}
      />
    </div>
  );
}
