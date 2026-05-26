import { Button, Spin } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useConfigState } from '../hooks/useConfigState';
import GlobalDefaultsEditor from '../components/GlobalDefaultsEditor';

export default function SystemSettingsPage() {
  const { config, loading, update, dirty, saving, save } = useConfigState();

  if (loading || !config) {
    return <Spin style={{ display: 'block', margin: '40px auto' }} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>系统设置</h2>
          <p style={{ color: '#666', margin: '4px 0 0' }}>全局默认配置，应用于所有任务。</p>
        </div>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={save}
          loading={saving}
          disabled={!dirty}
        >
          保存
        </Button>
      </div>
      <GlobalDefaultsEditor
        value={config.remote}
        cron={config.cron}
        rateLimit={config.rateLimit}
        jellyfin={config.jellyfin}
        metaExts={config.metaExts}
        videoExts={config.videoExts}
        onChange={(patch) => update(patch)}
      />
    </div>
  );
}
