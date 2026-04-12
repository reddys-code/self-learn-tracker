import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicLandingPage } from './pages/PublicLandingPage';
import { PublicCoursePage } from './pages/PublicCoursePage';
import { LoginPage } from './pages/LoginPage';
import { SetupPage } from './pages/SetupPage';
import { PortalDashboardPage } from './pages/PortalDashboardPage';
import { CourseCatalogPage } from './pages/CourseCatalogPage';
import { CourseTrackerPage } from './pages/CourseTrackerPage';
import { AdminOverviewPage } from './pages/AdminOverviewPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { CourseBuilderPage } from './pages/CourseBuilderPage';
import { ThemeShowcasePage } from './pages/ThemeShowcasePage';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import { PortalLayout } from './components/portal/PortalLayout';
import { ThemeSwitcher } from './components/theme/ThemeSwitcher';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<PublicLandingPage />} />
        <Route path="/courses/:courseRef" element={<PublicCoursePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/theme-demo" element={<ThemeShowcasePage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/portal" element={<PortalLayout />}>
            <Route index element={<PortalDashboardPage />} />
            <Route path="courses" element={<CourseCatalogPage />} />
            <Route path="courses/:courseRef" element={<CourseTrackerPage />} />
            <Route element={<AdminRoute />}>
              <Route path="admin" element={<AdminOverviewPage />} />
              <Route path="admin/courses" element={<CourseBuilderPage />} />
              <Route path="users" element={<UserManagementPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ThemeSwitcher />
    </>
  );
}
