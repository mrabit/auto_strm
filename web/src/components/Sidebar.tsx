import { Layout, Menu, Button } from 'antd';
import {
  UnorderedListOutlined,
  FileTextOutlined,
  SettingOutlined,
  RocketOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import useResponsive from '../hooks/useResponsive';

const { Sider } = Layout;

interface Props {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

const menuItems = [
  { key: '/', icon: <UnorderedListOutlined />, label: <Link to="/">任务管理</Link> },
  { key: '/logs', icon: <FileTextOutlined />, label: <Link to="/logs">日志查看</Link> },
  { key: '/settings', icon: <SettingOutlined />, label: <Link to="/settings">系统设置</Link> },
];

export default function Sidebar({ collapsed, onCollapse }: Props) {
  const location = useLocation();
  const { isMobile } = useResponsive();

  const selectedKey = menuItems.find((item) => item.key !== '/' && location.pathname.startsWith(item.key))?.key || '/';

  return (
    <>
      {isMobile && collapsed && (
        <Button
          type="text"
          icon={<MenuOutlined style={{ fontSize: 20, color: '#333' }} />}
          onClick={() => onCollapse(false)}
          style={{
            position: 'fixed',
            top: 12,
            left: 12,
            zIndex: 11,
            width: 40,
            height: 40,
            background: '#fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            borderRadius: 8,
          }}
        />
      )}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={onCollapse}
        width={220}
        breakpoint="md"
        collapsedWidth={isMobile ? 0 : 80}
        trigger={null}
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 24px',
            color: '#fff',
            fontSize: collapsed ? 20 : 18,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <RocketOutlined style={{ fontSize: 24, marginRight: collapsed ? 0 : 10 }} />
          {!collapsed && 'Auto STRM'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={() => {
            if (isMobile) onCollapse(true);
          }}
          style={{ background: 'transparent', borderRight: 0 }}
        />
      </Sider>
    </>
  );
}
