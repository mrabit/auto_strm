import React, { Suspense } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import AppLayout from './layouts/AppLayout';
import { ConfigStateProvider } from './hooks/useConfigState';

const TaskManagementPage = React.lazy(() => import('./pages/TaskManagementPage'));
const LogViewerPage = React.lazy(() => import('./pages/LogViewerPage'));
const SystemSettingsPage = React.lazy(() => import('./pages/SystemSettingsPage'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Spin size="large" />
    </div>
  );
}

function ConfigRoutes() {
  return (
    <ConfigStateProvider>
      <Outlet />
    </ConfigStateProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route element={<ConfigRoutes />}>
          <Route
            path="/"
            element={
              <Suspense fallback={<PageLoader />}>
                <TaskManagementPage />
              </Suspense>
            }
          />
          <Route
            path="/settings"
            element={
              <Suspense fallback={<PageLoader />}>
                <SystemSettingsPage />
              </Suspense>
            }
          />
        </Route>
        <Route
          path="/logs"
          element={
            <Suspense fallback={<PageLoader />}>
              <LogViewerPage />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}
