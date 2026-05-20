import { CronJob } from 'cron';
import type { TaskConfig } from './config';

export interface SchedulerHandle {
  stop: () => void;
}

export function start(
  tasks: TaskConfig[],
  runTask: (task: TaskConfig) => Promise<void>,
): SchedulerHandle {
  const jobs: CronJob[] = [];

  for (const task of tasks) {
    runTask(task);

    const job = new CronJob(task.cron, () => runTask(task));
    job.start();
    jobs.push(job);
  }

  return {
    stop: () => jobs.forEach((j) => j.stop()),
  };
}
