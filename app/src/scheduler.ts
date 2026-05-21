import { CronJob } from 'cron';
import type { TaskConfig } from './config';

export interface SchedulerHandle {
  stop: () => void;
  update: (tasks: TaskConfig[]) => void;
}

export function start(
  tasks: TaskConfig[],
  runTask: (task: TaskConfig) => Promise<void>,
): SchedulerHandle {
  let jobs: { job: CronJob; name: string }[] = [];
  let knownNames = new Set<string>();

  function applyJobs(newTasks: TaskConfig[], fireAll: boolean) {
    for (const { job } of jobs) job.stop();

    const nextJobs: { job: CronJob; name: string }[] = [];

    for (const task of newTasks) {
      if (fireAll || !knownNames.has(task.name)) {
        runTask(task);
      }
      const job = new CronJob(task.cron, () => runTask(task));
      job.start();
      nextJobs.push({ job, name: task.name });
    }

    jobs = nextJobs;
    knownNames = new Set(newTasks.map((t) => t.name));
  }

  applyJobs(tasks, true);

  return {
    stop: () => jobs.forEach(({ job }) => job.stop()),
    update: (newTasks: TaskConfig[]) => applyJobs(newTasks, false),
  };
}
