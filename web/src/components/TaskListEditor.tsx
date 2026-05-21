import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import TaskItemEditor from './TaskItemEditor';
import type { RemoteConfig, RateLimitConfig, JellyfinConfig, RawTaskConfig } from '../types';

function emptyTask(): RawTaskConfig {
  return {
    name: '',
    remote: {},
    local: { path: '' },
  };
}

interface Props {
  tasks: RawTaskConfig[];
  defaults?: { remote?: RemoteConfig; cron?: string; rateLimit?: RateLimitConfig; jellyfin?: JellyfinConfig };
  onChange: (tasks: RawTaskConfig[]) => void;
}

export default function TaskListEditor({ tasks, defaults, onChange }: Props) {
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
      {tasks.map((task, i) => (
        <TaskItemEditor
          key={task.key}
          task={task}
          index={i}
          isNew={!task.key}
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
