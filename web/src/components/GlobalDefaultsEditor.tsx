import React from 'react';
import { Input, Space } from 'antd';
import Addon from './Addon';
import RemoteFieldsEditor from './RemoteFieldsEditor';
import RateLimitFields from './RateLimitFields';
import JellyfinFields from './JellyfinFields';
import { cleanJellyfin } from './cleanJellyfin';
import type { ConfigFile } from '../types';

interface Props {
  value?: ConfigFile['remote'];
  cron?: string;
  rateLimit?: ConfigFile['rateLimit'];
  jellyfin?: ConfigFile['jellyfin'];
  metaExts?: string;
  videoExts?: string;
  onChange: (patch: {
    remote?: ConfigFile['remote'];
    cron?: string;
    rateLimit?: ConfigFile['rateLimit'];
    jellyfin?: ConfigFile['jellyfin'];
    metaExts?: string;
    videoExts?: string;
  }) => void;
}

const GlobalDefaultsEditor = React.memo(function GlobalDefaultsEditor({
  value,
  cron,
  rateLimit,
  jellyfin,
  metaExts,
  videoExts,
  onChange,
}: Props) {
  return (
    <div>
      <RemoteFieldsEditor value={value} onChange={(v) => onChange({ remote: v })} hidePath />
      <Space.Compact style={{ width: '100%', marginTop: 8 }}>
        <Addon label="Cron" />
        <Input
          placeholder="0 */6 * * *"
          value={cron}
          onChange={(e) => onChange({ cron: e.target.value || undefined })}
        />
      </Space.Compact>
      <Space.Compact style={{ width: '100%', marginTop: 8 }}>
        <Addon label="Meta Exts" />
        <Input
          placeholder=".nfo,.jpg,.jpeg,.png,..."
          value={metaExts}
          onChange={(e) => onChange({ metaExts: e.target.value || undefined })}
        />
      </Space.Compact>
      <Space.Compact style={{ width: '100%', marginTop: 8 }}>
        <Addon label="Video Exts" />
        <Input
          placeholder=".mkv,.iso,.ts,.mp4,..."
          value={videoExts}
          onChange={(e) => onChange({ videoExts: e.target.value || undefined })}
        />
      </Space.Compact>
      <div style={{ marginTop: 8 }}>
        <div style={{ marginBottom: 4, color: '#888', fontSize: 12 }}>Rate Limit</div>
        <RateLimitFields value={rateLimit} onChange={(v) => onChange({ rateLimit: v })} />
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ marginBottom: 4, color: '#888', fontSize: 12 }}>Jellyfin</div>
        <JellyfinFields
          value={jellyfin}
          onChange={(v) =>
            onChange({
              jellyfin: cleanJellyfin(v),
            })
          }
        />
      </div>
    </div>
  );
});

export default GlobalDefaultsEditor;
