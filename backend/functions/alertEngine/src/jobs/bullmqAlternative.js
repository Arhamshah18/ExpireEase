/**
 * ExpireEase — Alert Engine
 * src/jobs/bullmqAlternative.js
 *
 * OPTIONAL alternative to recalculateShelfLifeJob.js's Firebase scheduled
 * function, for the scenario where the team's final "Indicative Technology
 * Stack" decision (synopsis 9.2) lands on a plain Node.js/Express backend
 * with PostgreSQL (per Arham's role description) rather than staying on
 * Firebase Functions. Only wire this up INSTEAD OF, not alongside,
 * recalculateShelfLifeJob.js — running both would double-send alerts.
 *
 * Requires Redis (BullMQ's broker) and the `bullmq` package. Reuses the
 * exact same `runRecalculationPass` — the only thing that changes is what
 * triggers it and, if the team also migrates off Firestore, the repository
 * implementations it calls into.
 *
 * Usage (in your Express app's startup file):
 *   const { startRecalculationScheduler } = require('./jobs/bullmqAlternative');
 *   startRecalculationScheduler();
 */

const { Queue, Worker } = require('bullmq');
const { runRecalculationPass } = require('./recalculateShelfLifeJob');

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

const QUEUE_NAME = 'expireease-shelf-life-recalculation';

function startRecalculationScheduler() {
  const queue = new Queue(QUEUE_NAME, { connection });

  // Repeatable job — BullMQ persists this in Redis, so it survives restarts
  // and won't double-schedule if the process reboots.
  queue.add(
    'recalculate',
    {},
    {
      repeat: { every: 15 * 60 * 1000 }, // 15 minutes, matches the Firebase default
      removeOnComplete: true,
      removeOnFail: 50,
    }
  );

  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      return runRecalculationPass();
    },
    { connection }
  );

  worker.on('failed', (job, err) => {
    // eslint-disable-next-line no-console
    console.error(`[alert-engine] recalculation job ${job?.id} failed:`, err);
  });

  return { queue, worker };
}

module.exports = { startRecalculationScheduler };
