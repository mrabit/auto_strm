import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Spin } from 'antd';
import type { MenuProps } from 'antd';
import { SyncOutlined, FileTextOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';

const SeriesUpdatePage = React.lazy(() => import('./pages/SeriesUpdatePage'));
const LogViewerPage = React.lazy(() => import('./pages/LogViewerPage'));

type MenuItem = Required<MenuProps>['items'][number];

function PageLoader() {
  return (
    <div
      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}
    >
      <Spin size="large" />
    </div>
  );
}

const menuItems: MenuItem[] = [
  { key: '/', icon: <SyncOutlined />, label: <Link to="/">剧集更新</Link> },
  { key: '/logs', icon: <FileTextOutlined />, label: <Link to="/logs">日志</Link> },
];

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout menuItems={menuItems} />}>
        <Route
          path="/"
          element={
            <Suspense fallback={<PageLoader />}>
              <SeriesUpdatePage />
            </Suspense>
          }
        />
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
