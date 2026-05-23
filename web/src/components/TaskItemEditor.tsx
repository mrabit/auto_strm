import { useState } from 'react';
import { Card, Switch, Button, Popconfirm, Input, Collapse, message, Space } from 'antd';
import { DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons';
import Addon from './Addon';
import RemoteFieldsEditor from './RemoteFieldsEditor';
import RateLimitFields from './RateLimitFields';
import JellyfinFields from './JellyfinFields';
import { syncTask } from '../api';
import { cleanJellyfin } from './cleanJellyfin';
import type { RemoteConfig, RateLimitConfig, JellyfinConfig, RawTaskConfig } from '../types';

interface Props {
  task: RawTaskConfig;
  index: number;
  isNew?: boolean;
  defaults?: {
    remote?: RemoteConfig;
    cron?: string;
    rateLimit?: RateLimitConfig;
    jellyfin?: JellyfinConfig;
  };
  onChange: (task: RawTaskConfig) => void;
  onDelete: () => void;
  onToggleEnabled?: (index: number, enabled: boolean) => void;
}

export default function TaskItemEditor({
  task,
  index,
  isNew,
  defaults,
  onChange,
  onDelete,
  onToggleEnabled,
}: Props) {
  const [syncing, setSyncing] = useState(false);

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
              disabled={isNew}
              checked={task.enabled !== false}
              onChange={(v) => {
                onChange({ ...task, enabled: v });
                onToggleEnabled?.(index, v);
              }}
            />
          </span>
          <Popconfirm title="Delete this task?" onConfirm={onDelete}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </>
      }
      style={{ marginBottom: 12 }}
    >
      {task.enabled !== false && (
        <Collapse size="small" style={{ marginBottom: 8 }}>
          <Collapse.Panel header="Remote" key="remote" style={{ marginBottom: 8 }}>
            <RemoteFieldsEditor
              value={task.remote}
              defaults={defaults?.remote}
              onChange={(v) => onChange({ ...task, remote: v })}
            />
          </Collapse.Panel>
          <Collapse.Panel header="Local" key="local" style={{ marginBottom: 8 }}>
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
          </Collapse.Panel>
          <Collapse.Panel header="Schedule" key="schedule" style={{ marginBottom: 8 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Addon label="Cron" />
              <Input
                placeholder={defaults?.cron || ''}
                value={task.cron}
                onChange={(e) => onChange({ ...task, cron: e.target.value || undefined })}
              />
            </Space.Compact>
            <div style={{ marginTop: 8 }}>
              <div style={{ marginBottom: 4, color: '#888', fontSize: 12 }}>Rate Limit</div>
              <RateLimitFields
                value={task.rateLimit}
                inherited={defaults?.rateLimit}
                onChange={(v) => onChange({ ...task, rateLimit: v })}
              />
            </div>
          </Collapse.Panel>
          <Collapse.Panel header="Jellyfin" key="jellyfin" style={{ marginBottom: 8 }}>
            <JellyfinFields
              value={task.jellyfin}
              inherited={defaults?.jellyfin}
              onChange={(v) =>
                onChange({
                  ...task,
                  jellyfin: cleanJellyfin(v),
                })
              }
            />
          </Collapse.Panel>
        </Collapse>
      )}
    </Card>
  );
}
