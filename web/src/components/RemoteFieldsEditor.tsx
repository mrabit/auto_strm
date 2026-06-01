import { Input, Space } from 'antd';
import Addon from './Addon';
import type { RemoteConfig } from '../types';

interface Props {
  value?: RemoteConfig;
  defaults?: RemoteConfig;
  onChange?: (value: RemoteConfig) => void;
  showRequired?: boolean;
  hidePath?: boolean;
}

export default function RemoteFieldsEditor({
  value = {},
  defaults,
  onChange,
  showRequired,
  hidePath,
}: Props) {
  function update<K extends keyof RemoteConfig>(key: K, val: RemoteConfig[K]) {
    onChange?.({ ...value, [key]: val === '' ? undefined : val });
  }

  function placeholder(key: Exclude<keyof RemoteConfig, 'syncMetadata'>): string {
    if (showRequired) return '';
    const def = defaults?.[key] ?? '';
    if (key === 'password' && def) return '****';
    return def;
  }

  return (
    <>
      <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
        <Addon label="URL" />
        <Input
          placeholder={placeholder('url')}
          value={value.url}
          onChange={(e) => update('url', e.target.value)}
        />
      </Space.Compact>
      <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
        <Addon label="User" />
        <Input
          placeholder={placeholder('username')}
          value={value.username}
          onChange={(e) => update('username', e.target.value)}
        />
      </Space.Compact>
      <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
        <Addon label="Password" />
        <Input.Password
          placeholder={placeholder('password')}
          value={value.password}
          onChange={(e) => update('password', e.target.value)}
        />
      </Space.Compact>
      {!hidePath && (
        <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
          <Addon label="Path" />
          <Input
            required
            placeholder="/cloud-drive/Media"
            value={value.path}
            onChange={(e) => update('path', e.target.value)}
          />
        </Space.Compact>
      )}
      <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
        <Addon label="Public URL" />
        <Input
          placeholder={defaults?.publicUrl || ''}
          value={value.publicUrl}
          onChange={(e) => update('publicUrl', e.target.value)}
        />
      </Space.Compact>
    </>
  );
}
