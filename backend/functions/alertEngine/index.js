/**
 * ExpireEase — Alert Engine
 * src/index.js
 *
 * Entry point for Kriti's module. Merge these exports into the shared
 * `backend/functions/index.js` alongside the other leads' Cloud Functions
 * (e.g. `exports.recalculateShelfLife = require('./alertEngine').recalculateShelfLife;`).
 *
 * Also re-exports the pure functions (classifier, state machine, calculator)
 * for Arham's integration/edge-case test suite (synopsis Section 7's
 * ambiguity table + Phase 6 "edge-case validation") to import directly,
 * without needing to spin up Firestore or Twilio in tests.
 */

const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp();
}

const { recalculateShelfLife, runRecalculationPass } = require('./jobs/recalculateShelfLifeJob');
const { calculateShelfLifePercentage } = require('./shelfLifeCalculator');
const { classifyAlertStage } = require('./alertStageClassifier');
const { evaluateTransition } = require('./alertStateMachine');
const { ALERT_STAGES, ALERT_BANDS } = require('./config/alertThresholds');

module.exports = {
  // Cloud Function trigger — deploy this.
  recalculateShelfLife,

  // Testable building blocks.
  runRecalculationPass,
  calculateShelfLifePercentage,
  classifyAlertStage,
  evaluateTransition,
  ALERT_STAGES,
  ALERT_BANDS,
};
