import { useMemo, useState } from 'react';
import { Loader2, PencilLine, PlusCircle, Save } from 'lucide-react';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'user',
  isActive: true,
  assignedCourseIds: [],
};

function CourseChecklist({ courses = [], value = [], onChange }) {
  const active = new Set(value || []);
  const toggle = (courseId) => {
    if (active.has(courseId)) {
      onChange(Array.from(active).filter((id) => id !== courseId));
    } else {
      onChange([...active, courseId]);
    }
  };

  return (
    <div className="course-checklist-grid">
      {courses.map((course) => (
        <label key={course.id} className="course-check-item">
          <input type="checkbox" checked={active.has(course.id)} onChange={() => toggle(course.id)} />
          <span>{course.title}</span>
        </label>
      ))}
    </div>
  );
}

export function UserManagementTable({ users = [], courses = [], onCreateUser, onUpdateUser, busyUserId = '', busy = false }) {
  const [createForm, setCreateForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [editingUserId, setEditingUserId] = useState('');
  const [editForm, setEditForm] = useState({});

  const sortedUsers = useMemo(() => [...users].sort((a, b) => a.name.localeCompare(b.name)), [users]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setMessage('');
    const result = await onCreateUser(createForm);
    if (result.ok) {
      setCreateForm(emptyForm);
      setMessage('User created successfully.');
    } else {
      setMessage(result.message || 'Failed to create user.');
    }
  };

  const startEdit = (user) => {
    setEditingUserId(user.id);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      password: '',
      assignedCourseIds: user.assignedCourseIds || [],
    });
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!editingUserId) return;
    const result = await onUpdateUser(editingUserId, editForm);
    if (result.ok) {
      setEditingUserId('');
      setEditForm({});
      setMessage('User updated successfully.');
    } else {
      setMessage(result.message || 'Failed to update user.');
    }
  };

  return (
    <div className="panel-card user-management-card">
      <div className="panel-head">
        <div>
          <span className="eyebrow soft">ADMIN</span>
          <h3>User management</h3>
        </div>
      </div>

      <form className="stack-form" onSubmit={handleCreate}>
        <div className="user-form-grid">
          <input
            type="text"
            placeholder="Full name"
            value={createForm.name}
            onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
          />
          <input
            type="email"
            placeholder="Email address"
            value={createForm.email}
            onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
          />
          <input
            type="password"
            placeholder="Temporary password"
            value={createForm.password}
            onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
          />
          <select value={createForm.role} onChange={(event) => setCreateForm((current) => ({ ...current, role: event.target.value }))}>
            <option value="user">Learner</option>
            <option value="admin">Admin</option>
          </select>
          <select value={createForm.isActive ? 'true' : 'false'} onChange={(event) => setCreateForm((current) => ({ ...current, isActive: event.target.value === 'true' }))}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <div className="inline-action-cell">
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? <Loader2 size={16} className="spin" /> : <PlusCircle size={16} />} Create user
            </button>
          </div>
        </div>
        <label>
          <span className="soft-text">Assigned courses</span>
          <CourseChecklist
            courses={courses}
            value={createForm.assignedCourseIds}
            onChange={(assignedCourseIds) => setCreateForm((current) => ({ ...current, assignedCourseIds }))}
          />
        </label>
      </form>

      {message ? <p className="soft-text">{message}</p> : null}

      <div className="user-table-wrap">
        <table className="user-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Courses</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((user) => {
              const courseCount = user.assignedCourseIds?.length || 0;
              return (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.isActive ? 'Active' : 'Inactive'}</td>
                  <td>{courseCount || 'All published'}</td>
                  <td>{user.updatedAt ? new Date(user.updatedAt).toLocaleString() : '—'}</td>
                  <td>
                    <button type="button" className="btn tiny" onClick={() => startEdit(user)}>
                      <PencilLine size={14} /> Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingUserId ? (
        <form className="edit-user-panel stack-form" onSubmit={handleUpdate}>
          <h4>Edit user</h4>
          <div className="user-form-grid edit-grid">
            <input
              type="text"
              placeholder="Full name"
              value={editForm.name || ''}
              onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
            />
            <input
              type="email"
              placeholder="Email"
              value={editForm.email || ''}
              onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
            />
            <select value={editForm.role || 'user'} onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value }))}>
              <option value="user">Learner</option>
              <option value="admin">Admin</option>
            </select>
            <select value={editForm.isActive ? 'true' : 'false'} onChange={(event) => setEditForm((current) => ({ ...current, isActive: event.target.value === 'true' }))}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <input
              type="password"
              placeholder="New password (optional)"
              value={editForm.password || ''}
              onChange={(event) => setEditForm((current) => ({ ...current, password: event.target.value }))}
            />
            <div className="edit-actions">
              <button type="submit" className="btn primary" disabled={busyUserId === editingUserId}>
                {busyUserId === editingUserId ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Save changes
              </button>
              <button type="button" className="btn" onClick={() => setEditingUserId('')}>Cancel</button>
            </div>
          </div>
          <label>
            <span className="soft-text">Assigned courses</span>
            <CourseChecklist
              courses={courses}
              value={editForm.assignedCourseIds || []}
              onChange={(assignedCourseIds) => setEditForm((current) => ({ ...current, assignedCourseIds }))}
            />
          </label>
        </form>
      ) : null}
    </div>
  );
}
