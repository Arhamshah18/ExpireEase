/**
 * ExpireEase — Alert Engine
 * src/alertStageClassifier.js
 *
 * Pure function: % shelf life remaining -> one of the 7 exclusive stages.
 */

const { ALERT_BANDS, ALERT_STAGES } = require('./config/alertThresholds');

/**
 * @param {number} percentRemaining — signed; may be negative for expired items.
 * @returns {string} one of ALERT_STAGES
 */
function classifyAlertStage(percentRemaining) {
  if (typeof percentRemaining !== 'number' || Number.isNaN(percentRemaining)) {
    throw new Error('classifyAlertStage: percentRemaining must be a number');
  }

  const band = ALERT_BANDS.find(
    (b) => percentRemaining > b.min && percentRemaining <= b.max
  );

  // Exhaustive by construction (bands span -Infinity..Infinity), so this
  // should be unreachable — but fail loudly rather than silently defaulting
  // an item's urgency to GREEN if the config is ever edited badly.
  if (!band) {
    throw new Error(
      `classifyAlertStage: no band matched percentRemaining=${percentRemaining}`
    );
  }

  return band.stage;
}

module.exports = { classifyAlertStage, ALERT_STAGES };
