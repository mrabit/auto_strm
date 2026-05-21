import { Collapse, Input, Space } from 'antd';
import Addon from './Addon';
import RemoteFieldsEditor from './RemoteFieldsEditor';
import RateLimitFields from './RateLimitFields';
import type { ConfigFile } from '../types';

interface Props {
  value?: ConfigFile['remote'];
  cron?: string;
  rateLimit?: ConfigFile['rateLimit'];
  onChange: (patch: { remote?: ConfigFile['remote']; cron?: string; rateLimit?: ConfigFile['rateLimit'] }) => void;
}

export default function GlobalDefaultsEditor({ value, cron, rateLimit, onChange }: Props) {
  const items = [
    {
      key: 'defaults',
      label: 'Global Defaults',
      children: (
        <>
          <RemoteFieldsEditor
            value={value}
            onChange={(v) => onChange({ remote: v })}
            hidePath
          />
          <Space.Compact style={{ width: '100%', marginTop: 8 }}>
            <Addon label="Cron" />
            <Input
              placeholder="0 */6 * * *"
              value={cron}
              onChange={(e) => onChange({ cron: e.target.value || undefined })}
            />
          </Space.Compact>
          <div style={{ marginTop: 8 }}>
            <div style={{ marginBottom: 4, color: '#888', fontSize: 12 }}>Rate Limit</div>
            <RateLimitFields
              value={rateLimit}
              onChange={(v) => onChange({ rateLimit: v })}
            />
          </div>
        </>
      ),
    },
  ];

  return <Collapse items={items} defaultActiveKey={['defaults']} style={{ marginBottom: 16 }} />;
}
