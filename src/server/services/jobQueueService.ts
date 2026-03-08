/**
 * @purpose Background job and scheduler service skeleton
 * @inputs  architect_output/global_services_registry.json (jobQueueService)
 * @outputs scheduleRecurringJob(), enqueueJob(), runWorker() — interface for background tasks
 * @sideEffects Job execution triggers side effects in registered handlers
 * @errors  Job failures logged, not thrown
 *
 * Implementation note: MVP uses simple in-process scheduling.
 * Production: replace with BullMQ + Redis for distributed job processing.
 *
 * Registered jobs (from architecture):
 *   - payment_overdue_check (daily, payment_tracking)
 *   - trial_approaching_reminder (daily, communication)
 *   - class_start_approaching_reminder (daily, communication)
 *   - email_send_worker (continuous, communication)
 *   - session_cleanup (daily, auth_accounts — deferred)
 */

export type JobHandler = () => Promise<void>;

const registeredJobs = new Map<string, { handler: JobHandler; schedule: string }>();

/**
 * @purpose Register a recurring job
 * @inputs  name, schedule (cron-like descriptor), handler function
 * @outputs void
 * @sideEffects Stores handler in registry
 */
export function registerJob(
  name: string,
  schedule: string,
  handler: JobHandler
): void {
  registeredJobs.set(name, { handler, schedule });
}

/**
 * @purpose Execute a named job immediately
 * @inputs  jobName
 * @outputs void
 * @sideEffects Runs the job handler
 * @errors  Logged to stderr, not thrown
 */
export async function runJob(jobName: string): Promise<void> {
  const job = registeredJobs.get(jobName);
  if (!job) {
    console.error(`[JobQueue] Unknown job: ${jobName}`);
    return;
  }
  try {
    await job.handler();
  } catch (err) {
    console.error(`[JobQueue] Job failed: ${jobName}`, err);
  }
}

/**
 * @purpose Get list of registered jobs (for health check / admin)
 * @outputs Array of { name, schedule }
 */
export function listJobs(): Array<{ name: string; schedule: string }> {
  return Array.from(registeredJobs.entries()).map(([name, { schedule }]) => ({
    name,
    schedule,
  }));
}
