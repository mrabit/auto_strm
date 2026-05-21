import { useState, useCallback } from 'react';
import { Layout, Button, Space, message } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import ConfigPage from './pages/ConfigPage';

const { Header, Content } = Layout;

export default function App() {
  const [dirty, setDirty] = useState(false);
  const [saveTrigger, setSaveTrigger] = useState(0);

  const handleSave = useCallback(() => {
    if (!dirty) {
      message.info('No changes to save');
      return;
    }
    setSaveTrigger((n) => n + 1);
  }, [dirty]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#001529',
          padding: '0 24px',
        }}
      >
        <h1 style={{ color: '#fff', margin: 0, fontSize: 20 }}>Auto STRM</h1>
        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
          >
            Save
          </Button>
        </Space>
      </Header>
      <Content style={{ padding: 24, background: '#f5f5f5' }}>
        <ConfigPage
          onDirtyChange={setDirty}
          triggerSave={saveTrigger}
          onSaveDone={() => setSaveTrigger(0)}
        />
      </Content>
    </Layout>
  );
}
