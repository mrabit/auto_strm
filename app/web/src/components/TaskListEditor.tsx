import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import TaskItemEditor from './TaskItemEditor';
import type { RemoteConfig, RateLimitConfig, RawTaskConfig } from '../types';

function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function emptyTask(): RawTaskConfig {
  return {
    name: '',
    remote: {},
    local: { path: '' },
    _key: uid(),
  };
}

interface Props {
  tasks: RawTaskConfig[];
  defaults?: { remote?: RemoteConfig; cron?: string; rateLimit?: RateLimitConfig };
  onChange: (tasks: RawTaskConfig[]) => void;
}

export default function TaskListEditor({ tasks, defaults, onChange }: Props) {
  // ensure each task has a stable _key for React
  const tasksWithKeys = tasks.map((t) => (t._key ? t : { ...t, _key: uid() }));

  function updateTask(index: number, task: RawTaskConfig) {
    const next = [...tasksWithKeys];
    next[index] = task;
    onChange(next);
  }

  function removeTask(index: number) {
    onChange(tasksWithKeys.filter((_, i) => i !== index));
  }

  function addTask() {
    onChange([...tasksWithKeys, emptyTask()]);
  }

  return (
    <div>
      {tasksWithKeys.map((task, i) => (
        <TaskItemEditor
          key={task._key}
          task={task}
          index={i}
          defaults={defaults}
          onChange={(t) => updateTask(i, t)}
          onDelete={() => removeTask(i)}
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
