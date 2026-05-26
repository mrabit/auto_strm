import { useState, useMemo, useCallback } from 'react';
import { Button, Radio, Spin, Empty, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useConfigState } from '../hooks/useConfigState';
import { saveConfig } from '../api';
import StatsDashboard from '../components/StatsDashboard';
import TaskListView from '../components/TaskListView';
import TaskEditModal from '../components/TaskEditModal';
import type { RawTaskConfig } from '../types';

let tmpId = 0;

function emptyTask(): RawTaskConfig {
  return {
    key: `__tmp__:${++tmpId}`,
    name: '',
    enabled: false,
    remote: {},
    local: { path: '' },
  };
}

function isNewTask(task: RawTaskConfig): boolean {
  return !task.key || task.key.startsWith('__tmp__:');
}

export default function TaskManagementPage() {
  const { config, loading, update, toggleEnabled, reload } = useConfigState();
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const persist = useCallback(
    async (tasks: RawTaskConfig[]) => {
      if (!config) return;
      const next = { ...config, tasks };
      update({ tasks });
      setSaving(true);
      try {
        await saveConfig(next);
        await reload();
      } catch (err) {
        message.error('保存失败: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setSaving(false);
      }
    },
    [config, update, reload],
  );

  const filteredTasks = useMemo(() => {
    if (!config) return [];
    if (filterStatus === 'all') return config.tasks;
    if (filterStatus === 'enabled') return config.tasks.filter((t) => t.enabled !== false);
    return config.tasks.filter((t) => t.enabled === false);
  }, [config?.tasks, filterStatus]);

  const stats = useMemo(() => {
    if (!config) return { total: 0, enabled: 0, disabled: 0 };
    const tasks = config.tasks;
    return {
      total: tasks.length,
      enabled: tasks.filter((t) => t.enabled !== false).length,
      disabled: tasks.filter((t) => t.enabled === false).length,
    };
  }, [config?.tasks]);

  const handleSync = useCallback(async (key: string) => {
    try {
      const res = await fetch(`/api/tasks/${key}/sync`, { method: 'POST' });
      if (res.ok) {
        message.success('Sync triggered');
      } else {
        message.error('Sync failed');
      }
    } catch {
      message.error('Sync failed');
    }
  }, []);

  const handleDelete = useCallback((index: number) => {
    if (!config) return;
    persist(config.tasks.filter((_, i) => i !== index));
  }, [config, persist]);

  const handleSaveTask = useCallback((task: RawTaskConfig) => {
    if (!config) return;
    if (editingIndex === null) {
      persist([...config.tasks, task]);
    } else {
      persist(config.tasks.map((t, i) => (i === editingIndex ? task : t)));
    }
    setEditingIndex(null);
  }, [config, editingIndex, persist]);

  const handleAddTask = useCallback(() => {
    if (!config) return;
    update({ tasks: [...config.tasks, emptyTask()] });
  }, [config, update]);

  if (loading || !config) {
    return <Spin style={{ display: 'block', margin: '40px auto' }} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>任务管理</h2>
      </div>

      <StatsDashboard stats={stats} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Radio.Group value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <Radio.Button value="all">全部 ({stats.total})</Radio.Button>
          <Radio.Button value="enabled">已启用 ({stats.enabled})</Radio.Button>
          <Radio.Button value="disabled">已禁用 ({stats.disabled})</Radio.Button>
        </Radio.Group>
        <Button icon={<PlusOutlined />} onClick={handleAddTask} loading={saving}>
          添加任务
        </Button>
      </div>

      {filteredTasks.length === 0 ? (
        <Empty description="暂无任务" />
      ) : (
        <TaskListView
          tasks={filteredTasks}
          defaults={{
            remote: config.remote,
            cron: config.cron,
            rateLimit: config.rateLimit,
            jellyfin: config.jellyfin,
          }}
          allTasks={config.tasks}
          lastSyncTimes={config.lastSyncTimes}
          onEdit={(filteredIndex) => {
            const task = filteredTasks[filteredIndex];
            const realIndex = config.tasks.indexOf(task);
            setEditingIndex(realIndex);
          }}
          onDelete={(filteredIndex) => {
            const task = filteredTasks[filteredIndex];
            const realIndex = config.tasks.indexOf(task);
            handleDelete(realIndex);
          }}
          onToggleEnabled={(filteredIndex, enabled) => {
            const task = filteredTasks[filteredIndex];
            const realIndex = config.tasks.indexOf(task);
            toggleEnabled(realIndex, enabled);
          }}
          onSync={handleSync}
        />
      )}

      <TaskEditModal
        open={editingIndex !== null}
        task={editingIndex !== null ? config.tasks[editingIndex] : null}
        index={editingIndex}
        defaults={{
          remote: config.remote,
          cron: config.cron,
          rateLimit: config.rateLimit,
          jellyfin: config.jellyfin,
          metaExts: config.metaExts,
          videoExts: config.videoExts,
        }}
        isNew={editingIndex !== null ? isNewTask(config.tasks[editingIndex]) : false}
        onSave={handleSaveTask}
        onCancel={() => setEditingIndex(null)}
      />
    </div>
  );
}
