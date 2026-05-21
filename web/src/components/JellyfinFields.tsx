import { Input, Space } from 'antd';
import Addon from './Addon';
import type { JellyfinConfig } from '../types';

interface Props {
  value?: Partial<JellyfinConfig>;
  inherited?: Partial<JellyfinConfig>;
  onChange?: (value: Partial<JellyfinConfig>) => void;
}

export default function JellyfinFields({ value = {}, inherited, onChange }: Props) {
  function update(key: keyof JellyfinConfig, val: string) {
    onChange?.({ ...value, [key]: val || undefined });
  }

  return (
    <>
      <Space.Compact style={{ width: '100%' }}>
        <Addon label="URL" />
        <Input
          placeholder={inherited?.url || 'http://jellyfin:8096'}
          value={value.url}
          onChange={(e) => update('url', e.target.value)}
        />
      </Space.Compact>
      <Space.Compact style={{ width: '100%', marginTop: 8 }}>
        <Addon label="Token" />
        <Input.Password
          placeholder={inherited?.token ? '****' : ''}
          value={value.token}
          onChange={(e) => update('token', e.target.value)}
        />
      </Space.Compact>
    </>
  );
}
