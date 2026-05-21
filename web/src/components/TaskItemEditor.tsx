import { useState } from 'react';
import { Card, Switch, Button, Popconfirm, Input, Collapse, message, Space } from 'antd';
import { DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons';
import Addon from './Addon';
import RemoteFieldsEditor from './RemoteFieldsEditor';
import RateLimitFields from './RateLimitFields';
import JellyfinFields from './JellyfinFields';
import { syncTask } from '../api';
import type { RemoteConfig, RateLimitConfig, JellyfinConfig, RawTaskConfig } from '../types';

interface Props {
  task: RawTaskConfig;
  index: number;
  isNew?: boolean;
  defaults?: { remote?: RemoteConfig; cron?: string; rateLimit?: RateLimitConfig; jellyfin?: JellyfinConfig };
  onChange: (task: RawTaskConfig) => void;
  onDelete: () => void;
}

export default function TaskItemEditor({ task, index, isNew, defaults, onChange, onDelete }: Props) {
  const [syncing, setSyncing] = useState(false);
  const panelStyle: React.CSSProperties = { marginBottom: 8 };

  async function handleSync() {
    setSyncing(true);
    try {
      await syncTask(task.key!);
      message.success(`"${task.name}" sync started`);
    } catch (err) {
      message.error('Sync failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card
      size="small"
      title={
        isNew ? (
          <Input
            style={{ width: 200 }}
            placeholder={`Task ${index + 1}`}
            value={task.name}
            onChange={(e) => onChange({ ...task, name: e.target.value })}
          />
        ) : (
          <span style={{ fontWeight: 500 }}>{task.name || `Task ${index + 1}`}</span>
        )
      }
      extra={
        <>
          <Button
            size="small"
            icon={<ThunderboltOutlined />}
            loading={syncing}
            onClick={handleSync}
            disabled={isNew}
            style={{ marginRight: 8 }}
          >
            Sync
          </Button>
          <span style={{ marginRight: 12 }}>
            Enabled{' '}
            <Switch
              size="small"
              checked={task.enabled !== false}
              onChange={(v) => onChange({ ...task, enabled: v })}
            />
          </span>
          <Popconfirm title="Delete this task?" onConfirm={onDelete}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </>
      }
      style={{ marginBottom: 12 }}
    >
      <Collapse
        size="small"
        items={[
          {
            key: 'remote',
            label: 'Remote',
            style: panelStyle,
            children: (
              <RemoteFieldsEditor
                value={task.remote}
                defaults={defaults?.remote}
                onChange={(v) => onChange({ ...task, remote: v })}
              />
            ),
          },
          {
            key: 'local',
            label: 'Local',
            style: panelStyle,
            children: (
              <Space.Compact style={{ width: '100%' }}>
                <Addon label="Path" />
                <Input
                  required
                  placeholder="./data/task-name"
                  value={task.local.path}
                  onChange={(e) =>
                    onChange({
                      ...task,
                      local: { path: e.target.value },
                    })
                  }
                />
              </Space.Compact>
            ),
          },
          {
            key: 'schedule',
            label: 'Schedule',
            style: panelStyle,
            children: (
              <>
                <Space.Compact style={{ width: '100%' }}>
                  <Addon label="Cron" />
                  <Input
                    placeholder={defaults?.cron || ''}
                    value={task.cron}
                    onChange={(e) => onChange({ ...task, cron: e.target.value || undefined })}
                  />
                </Space.Compact>
                <div style={{ marginTop: 8 }}>
                  <div style={{ marginBottom: 4, color: '#888', fontSize: 12 }}>
                    Rate Limit
                  </div>
                  <RateLimitFields
                    value={task.rateLimit}
                    inherited={defaults?.rateLimit}
                    onChange={(v) => onChange({ ...task, rateLimit: v })}
                  />
                </div>
              </>
            ),
          },
          {
            key: 'jellyfin',
            label: 'Jellyfin',
            style: panelStyle,
            children: (
              <JellyfinFields
                value={task.jellyfin}
                inherited={defaults?.jellyfin}
                onChange={(v) =>
                  onChange({
                    ...task,
                    jellyfin: v.url || v.token || v.enabled !== undefined ? (v as JellyfinConfig) : undefined,
                  })
                }
              />
            ),
          },
        ]}
      />
    </Card>
  );
}
