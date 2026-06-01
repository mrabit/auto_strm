import { useState, useEffect } from 'react';
import { Layout } from 'antd';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import useResponsive from '../hooks/useResponsive';

const { Content } = Layout;

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { isMobile } = useResponsive();
  const location = useLocation();

  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [isMobile, location.pathname]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {isMobile && !collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 9,
          }}
        />
      )}
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout
        style={{ marginLeft: isMobile ? 0 : collapsed ? 80 : 220, transition: 'margin-left 0.2s' }}
      >
        <Content
          style={{
            padding: 24,
            background: '#f1f5f9',
            minHeight: '100vh',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
