import TaskListItem from './TaskListItem';
import type { RawTaskConfig } from '../types';

interface Props {
  tasks: RawTaskConfig[];
  lastSyncTimes?: Record<string, string>;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onToggleEnabled: (index: number, enabled: boolean) => void;
  onSync: (key: string) => void;
}

export default function TaskListView({
  tasks,
  lastSyncTimes,
  onEdit,
  onDelete,
  onToggleEnabled,
  onSync,
}: Props) {
  return (
    <div>
      {tasks.map((task, i) => (
        <TaskListItem
          key={task.key || `tmp-${i}`}
          task={task}
          index={i}
          onEdit={() => onEdit(i)}
          onDelete={() => onDelete(i)}
          onToggleEnabled={(enabled) => onToggleEnabled(i, enabled)}
          onSync={() => onSync(task.key!)}
          lastSyncTime={
            task.key && lastSyncTimes?.[task.key] ? new Date(lastSyncTimes[task.key]) : undefined
          }
        />
      ))}
    </div>
  );
}
