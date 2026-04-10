import { useEffect, useState } from 'react';
import { BarChart3, BookCopy, LayoutDashboard, LibraryBig, LogOut, PanelLeftClose, PanelLeftOpen, ShieldCheck, Users } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function NavItem({ to, icon: Icon, label, end = false, isCollapsed = false, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `portal-nav-item ${isActive ? 'active' : ''}`}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon size={18} />
      {!isCollapsed ? <span>{label}</span> : null}
    </NavLink>
  );
}

export function PortalLayout() {
  const { user, isAdmin, logout } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth > 980;
  });

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 980) {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const closeSidebarOnMobile = () => {
    if (window.innerWidth <= 980) {
      setIsSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    closeSidebarOnMobile();
  };

  return (
    <div className={`portal-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <aside className="portal-sidebar" id="portal-sidebar">
        <div className="portal-sidebar-main">
          <div className="portal-brand">
            <div className="portal-brand-main">
              <button
                type="button"
                className="portal-brand-mark portal-brand-restore"
                onClick={() => {
                  if (isSidebarCollapsed) setIsSidebarCollapsed(false);
                }}
                disabled={!isSidebarCollapsed}
                aria-label="Restore sidebar"
                title={isSidebarCollapsed ? 'Restore sidebar' : 'Brand'}
              >
                EP
              </button>
              <div className="portal-brand-copy">
                <strong>Education Portal</strong>
                <p>Course delivery workspace</p>
              </div>
            </div>

            <button
              type="button"
              className="portal-brand-collapse"
              aria-expanded={!isSidebarCollapsed}
              aria-controls="portal-sidebar"
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={() => setIsSidebarCollapsed((current) => !current)}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
          </div>

          <nav className="portal-nav">
            <NavItem to="/portal" end icon={LayoutDashboard} label="Dashboard" isCollapsed={isSidebarCollapsed} onClick={closeSidebarOnMobile} />
            <NavItem to="/portal/courses" icon={LibraryBig} label="My courses" isCollapsed={isSidebarCollapsed} onClick={closeSidebarOnMobile} />
            {isAdmin ? <NavItem to="/portal/admin" icon={BarChart3} label="Admin console" isCollapsed={isSidebarCollapsed} onClick={closeSidebarOnMobile} /> : null}
            {isAdmin ? <NavItem to="/portal/admin/courses" icon={BookCopy} label="Course builder" isCollapsed={isSidebarCollapsed} onClick={closeSidebarOnMobile} /> : null}
            {isAdmin ? <NavItem to="/portal/users" icon={Users} label="User management" isCollapsed={isSidebarCollapsed} onClick={closeSidebarOnMobile} /> : null}
          </nav>
        </div>

        <div className="portal-sidebar-footer">
          <div className="portal-user-card">
            <div className="portal-user-avatar">{user?.name?.slice(0, 1)?.toUpperCase() || 'U'}</div>
            <div className="portal-user-meta">
              <strong>{user?.name}</strong>
              <p>{user?.email}</p>
              <span className={`role-pill ${user?.role === 'admin' ? 'admin' : 'user'}`}>
                {user?.role === 'admin' ? <ShieldCheck size={14} /> : <BookCopy size={14} />}
                {user?.role}
              </span>
            </div>

            <button
              type="button"
              className="portal-user-logout"
              onClick={handleLogout}
              aria-label="Logout"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <button
        type="button"
        className="portal-mobile-toggle"
        onClick={() => setIsSidebarOpen((current) => !current)}
        aria-expanded={isSidebarOpen}
        aria-controls="portal-sidebar"
      >
        <PanelLeftOpen size={17} /> {isSidebarOpen ? 'Hide menu' : 'Show menu'}
      </button>

      <button
        type="button"
        className={`portal-overlay ${isSidebarOpen ? 'show' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
        aria-label="Close sidebar"
      />

      <main className="portal-content">
        <Outlet />
      </main>
    </div>
  );
}
