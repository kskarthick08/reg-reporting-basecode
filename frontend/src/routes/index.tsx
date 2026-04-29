import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Loader } from '@/components/Loader';

// Eager load critical pages (LoginPage, DashboardPage)
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';

// Lazy load all other pages for code splitting
const WorkflowPage = lazy(() => import('@/pages/WorkflowPage'));
const DocumentManagementPage = lazy(() => import('@/pages/DocumentManagementPage').then(m => ({ default: m.DocumentManagementPage })));
const GraphRAGPage = lazy(() => import('@/pages/GraphRAGPage').then(m => ({ default: m.GraphRAGPage })));
const ActivityLogsPage = lazy(() => import('@/pages/ActivityLogsPage').then(m => ({ default: m.ActivityLogsPage })));
const UserManagementPage = lazy(() => import('@/pages/UserManagementPage').then(m => ({ default: m.UserManagementPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const UserActivityPage = lazy(() => import('@/pages/UserActivityPage').then(m => ({ default: m.UserActivityPage })));
const LLMConfigPage = lazy(() => import('@/pages/LLMConfigPage').then(m => ({ default: m.LLMConfigPage })));
const DataModelConfigPage = lazy(() => import('@/pages/DataModelConfigPage')); // Already has default export
const StageConfigurationPage = lazy(() => import('@/pages/StageConfigurationPage')); // Already has default export
const ArtifactConfigPage = lazy(() => import('@/pages/ArtifactConfigPage')); // Already has default export
const ReportsPage = lazy(() => import('@/pages/ReportsPage').then(m => ({ default: m.ReportsPage })));

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route
            path="workflow"
            element={
              <Suspense fallback={<Loader />}>
                <WorkflowPage />
              </Suspense>
            }
          />
          <Route
            path="documents"
            element={
              <Suspense fallback={<Loader />}>
                <DocumentManagementPage />
              </Suspense>
            }
          />
          <Route
            path="graph"
            element={
              <Suspense fallback={<Loader />}>
                <GraphRAGPage />
              </Suspense>
            }
          />
          <Route
            path="logs"
            element={
              <Suspense fallback={<Loader />}>
                <ActivityLogsPage />
              </Suspense>
            }
          />
          <Route
            path="users"
            element={
              <Suspense fallback={<Loader />}>
                <UserManagementPage />
              </Suspense>
            }
          />
          <Route
            path="profile"
            element={
              <Suspense fallback={<Loader />}>
                <ProfilePage />
              </Suspense>
            }
          />
          <Route
            path="activity"
            element={
              <Suspense fallback={<Loader />}>
                <UserActivityPage />
              </Suspense>
            }
          />
          <Route
            path="settings"
            element={
              <Suspense fallback={<Loader />}>
                <SettingsPage />
              </Suspense>
            }
          />
          <Route
            path="llm-config"
            element={
              <Suspense fallback={<Loader />}>
                <LLMConfigPage />
              </Suspense>
            }
          />
          <Route
            path="data-models"
            element={
              <Suspense fallback={<Loader />}>
                <DataModelConfigPage />
              </Suspense>
            }
          />
          <Route
            path="stage-config"
            element={
              <Suspense fallback={<Loader />}>
                <StageConfigurationPage />
              </Suspense>
            }
          />
          <Route
            path="artifact-config"
            element={
              <Suspense fallback={<Loader />}>
                <ArtifactConfigPage />
              </Suspense>
            }
          />
          <Route
            path="reports"
            element={
              <Suspense fallback={<Loader />}>
                <ReportsPage />
              </Suspense>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
