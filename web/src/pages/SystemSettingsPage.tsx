import { useConfigState } from '../hooks/useConfigState';
import GlobalDefaultsEditor from '../components/GlobalDefaultsEditor';
import { Spin } from 'antd';

export default function SystemSettingsPage() {
  const { config, loading, update } = useConfigState();

  if (loading || !config) {
    return <Spin style={{ display: 'block', margin: '40px auto' }} />;
  }

  return (
    <div>
      <h2 style={{ marginBottom: 8, fontSize: 22, fontWeight: 600 }}>系统设置</h2>
      <p style={{ color: '#666', marginBottom: 24 }}>全局默认配置，应用于所有任务。</p>
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
