/**
 * ExpireEase — Alert Engine
 * src/jobs/recalculateShelfLifeJob.js
 *
 * The background job satisfying synopsis Section 6.3: "This value is
 * recalculated continuously, not just at the moment of entry, so an item's
 * alert stage updates automatically as real time passes."
 *
 * Implemented as a Firebase scheduled Cloud Function (v2, onSchedule) since
 * the project already runs on Firestore/Firebase (see Member 3's
 * services/firebase.js, services/db.js). This keeps the alert engine in the
 * same deploy target as the rest of the backend instead of standing up a
 * separate worker process. A BullMQ-based alternative is provided in
 * `bullmqAlternative.js` for a plain Node/Express + Redis deployment, if the
 * team's "Indicative Technology Stack" decision (synopsis 9.2) lands there
 * instead — both call the exact same `runRecalculationPass` below, so
 * switching schedulers later doesn't touch any alert logic.
 *
 * Schedule: every 15 minutes. This is a judgment call, not a synopsis
 * requirement — the smallest gap between two adjacent bands is 5 percentage
 * points (RED -> CRITICAL, 15%->10%), and for even a short-shelf-life item
 * (e.g. a 3-day-shelf-life perishable), 5% of shelf life is ~3.6 hours, so a
 * 15-minute tick keeps the "just crossed a band" detection tight without
 * hammering Firestore reads on every item, every few minutes. Tune via
 * RECALC_SCHEDULE_CRON if the team wants tighter/looser granularity.
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');

const { calculateShelfLifePercentage } = require('../shelfLifeCalculator');
const { classifyAlertStage } = require('../alertStageClassifier');
const { evaluateTransition } = require('../alertStateMachine');
const { dispatchCriticalAlert } = require('../notifications/notificationDispatcher');
const {
  getActiveItemsInPages,
  applyRecalculationToBatch,
  commitBatch,
  newBatch,
} = require('../repositories/itemsRepository');

/**
 * Core logic, decoupled from the Cloud Functions trigger so it's directly
 * unit-testable and reusable from the BullMQ alternative.
 */
async function runRecalculationPass() {
  const now = new Date();
  const summary = { itemsProcessed: 0, criticalAlertsSent: 0, movedToExpired: 0, errors: 0 };

  for await (const page of getActiveItemsInPages()) {
    const batch = newBatch();
    const dispatchPromises = [];

    for (const { id, data } of page) {
      try {
        const percentRemaining = calculateShelfLifePercentage(data.mfgDate, data.expDate, now);
        const newStage = classifyAlertStage(percentRemaining);

        const transition = evaluateTransition({
          previousStage: data.alertStage ?? null,
          newStage,
          criticalAlertSent: Boolean(data.criticalAlertSent),
        });

        applyRecalculationToBatch(batch, id, {
          newStage: transition.newStage,
          criticalAlertJustSent: transition.shouldDispatchCriticalAlert,
          movedToExpired: transition.shouldMoveToExpiredBucket,
        });

        summary.itemsProcessed += 1;
        if (transition.shouldMoveToExpiredBucket) summary.movedToExpired += 1;

        if (transition.shouldDispatchCriticalAlert) {
          summary.criticalAlertsSent += 1;
          // Fire notification dispatch in parallel with the batch write —
          // it doesn't need to block the Firestore commit, and a delivery
          // failure (handled inside dispatchCriticalAlert) must not stop
          // the flag from being persisted, or we'd resend every tick.
          dispatchPromises.push(
            dispatchCriticalAlert({
              ownerId: data.ownerId,
              itemName: data.name,
              percentRemaining,
            }).catch((err) => {
              logger.error('dispatchCriticalAlert failed', { itemId: id, error: err.message });
            })
          );
        }
      } catch (err) {
        summary.errors += 1;
        logger.error('recalculation failed for item', { itemId: id, error: err.message });
        // Skip this item this tick rather than aborting the whole batch —
        // one malformed item shouldn't block every other item's alerts.
      }
    }

    await commitBatch(batch);
    await Promise.all(dispatchPromises);
  }

  logger.info('shelf-life recalculation pass complete', summary);
  return summary;
}

// Firebase v2 scheduled function entry point — exported for `functions/index.js`.
const recalculateShelfLife = onSchedule(
  {
    schedule: process.env.RECALC_SCHEDULE_CRON || 'every 15 minutes',
    timeZone: 'Asia/Kolkata',
    retryCount: 2,
  },
  async () => {
    await runRecalculationPass();
  }
);

module.exports = { recalculateShelfLife, runRecalculationPass };
