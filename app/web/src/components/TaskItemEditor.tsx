import { useState } from 'react';
import { Card, Switch, Button, Popconfirm, Input, Collapse, message, Space } from 'antd';
import { DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons';
import Addon from './Addon';
import RemoteFieldsEditor from './RemoteFieldsEditor';
import RateLimitFields from './RateLimitFields';
import { syncTask } from '../api';
import type { RemoteConfig, RateLimitConfig, RawTaskConfig } from '../types';

interface Props {
  task: RawTaskConfig;
  index: number;
  defaults?: { remote?: RemoteConfig; cron?: string; rateLimit?: RateLimitConfig };
  onChange: (task: RawTaskConfig) => void;
  onDelete: () => void;
}

export default function TaskItemEditor({ task, index, defaults, onChange, onDelete }: Props) {
  const [syncing, setSyncing] = useState(false);
  const panelStyle: React.CSSProperties = { marginBottom: 8 };

  async function handleSync() {
    setSyncing(true);
    try {
      await syncTask(task.name);
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
        <Input
          style={{ width: 200 }}
          placeholder={`Task ${index + 1}`}
          value={task.name}
          onChange={(e) => onChange({ ...task, name: e.target.value })}
        />
      }
      extra={
        <>
          <Button
            size="small"
            icon={<ThunderboltOutlined />}
            loading={syncing}
            onClick={handleSync}
            disabled={!task.name || task.enabled === false}
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
        ]}
      />
    </Card>
  );
}
