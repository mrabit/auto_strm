import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import TaskItemEditor from './TaskItemEditor';
import type { RemoteConfig, RateLimitConfig, JellyfinConfig, RawTaskConfig } from '../types';

let tmpId = 0;

function emptyTask(): RawTaskConfig {
  return {
    key: `__tmp__:${++tmpId}`,
    name: '',
    remote: {},
    local: { path: '' },
  };
}

function isNewTask(task: RawTaskConfig): boolean {
  return !task.key || task.key.startsWith('__tmp__:');
}

interface Props {
  tasks: RawTaskConfig[];
  defaults?: {
    remote?: RemoteConfig;
    cron?: string;
    rateLimit?: RateLimitConfig;
    jellyfin?: JellyfinConfig;
  };
  onChange: (tasks: RawTaskConfig[]) => void;
  onToggleEnabled?: (index: number, enabled: boolean) => void;
}

export default function TaskListEditor({ tasks, defaults, onChange, onToggleEnabled }: Props) {
  function updateTask(index: number, task: RawTaskConfig) {
    const next = [...tasks];
    next[index] = task;
    onChange(next);
  }

  function removeTask(index: number) {
    onChange(tasks.filter((_, i) => i !== index));
  }

  function addTask() {
    onChange([...tasks, emptyTask()]);
  }

  return (
    <div>
      {tasks.length === 0 && (
        <div style={{ textAlign: 'center', color: '#888', padding: '24px 0' }}>
          No tasks yet. Click the button below to add one.
        </div>
      )}
      {tasks.map((task, i) => (
        <TaskItemEditor
          key={task.key}
          task={task}
          index={i}
          isNew={isNewTask(task)}
          defaults={defaults}
          onChange={(t) => updateTask(i, t)}
          onDelete={() => removeTask(i)}
          onToggleEnabled={onToggleEnabled}
        />
      ))}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={addTask}
        block
        style={{ marginTop: 8 }}
      >
        Add Task
      </Button>
    </div>
  );
}
