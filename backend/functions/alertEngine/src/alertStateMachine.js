/**
 * ExpireEase — Alert Engine
 * src/alertStateMachine.js
 *
 * Decides, for a single item on a single recalculation tick, what should
 * happen given its previous persisted stage and its newly computed stage.
 *
 * This is deliberately a pure decision function (no I/O) so it's trivial to
 * unit test against the ambiguity table Arham owns (Section 7 of the
 * synopsis): "Repeated WhatsApp spam" -> "exactly one message per item per
 * threshold crossing, enforced by a persisted flag."
 *
 * Persisted per item (see repositories/itemsRepository.js for the Firestore
 * shape):
 *   - alertStage        : string  — last-known stage, one of ALERT_STAGES
 *   - criticalAlertSent  : boolean — true once the CRITICAL escalation has
 *                                    been dispatched for this item, ever.
 *
 * Rules encoded here (all straight from synopsis Section 6.4):
 *   1. Stage is recomputed every tick regardless of whether anything fires.
 *   2. The WhatsApp/in-app escalation fires the FIRST time an item crosses
 *      INTO the CRITICAL band (<=10%, >0%) — never again after that, even
 *      if the item bounces (which it structurally can't, since expiry only
 *      moves forward in time — but the flag protects against clock skew,
 *      re-runs, or a recalculation job retry).
 *   3. Once EXPIRED, the item is terminal: no further alerts of any kind,
 *      regardless of alertSent history. The caller is expected to also move
 *      the item to the Expired/Wasted bucket (Section 6.5/6.6) — that's an
 *      inventory-module concern, not this engine's, so it's only signalled
 *      via `shouldMoveToExpiredBucket`.
 *   4. An item can skip straight from e.g. GREEN to CRITICAL between two
 *      recalculation ticks (long interval, or item added already low). This
 *      still counts as "crossing into CRITICAL" and still fires exactly
 *      once — determined by comparing stage order, not by requiring the
 *      previous tick to have been RED.
 */

const { ALERT_STAGES, WHATSAPP_TRIGGER_STAGE, TERMINAL_STAGES, STAGE_ORDER } =
  require('./config/alertThresholds');

/**
 * @param {object} input
 * @param {string|null} input.previousStage — null for a never-before-evaluated item.
 * @param {string} input.newStage — output of classifyAlertStage for this tick.
 * @param {boolean} input.criticalAlertSent — persisted flag from the item doc.
 * @returns {{
 *   newStage: string,
 *   crossedIntoCritical: boolean,
 *   shouldDispatchCriticalAlert: boolean,
 *   shouldMoveToExpiredBucket: boolean,
 *   isTerminal: boolean,
 * }}
 */
function evaluateTransition({ previousStage, newStage, criticalAlertSent }) {
  const isTerminal = TERMINAL_STAGES.has(newStage);

  // Was the item already at/past CRITICAL before this tick? Comparing by
  // stage severity (not just !== ) handles the "skipped a band" case.
  const wasAtOrPastCritical =
    previousStage != null &&
    STAGE_ORDER.indexOf(previousStage) <= STAGE_ORDER.indexOf(WHATSAPP_TRIGGER_STAGE);

  const isAtOrPastCritical =
    STAGE_ORDER.indexOf(newStage) <= STAGE_ORDER.indexOf(WHATSAPP_TRIGGER_STAGE);

  const crossedIntoCritical =
    isAtOrPastCritical && !wasAtOrPastCritical && newStage !== ALERT_STAGES.EXPIRED;
  // ^ guards the edge case where an item is entered already expired (mfg/exp
  // both in the past, e.g. backfilled data) — it should go straight to
  // EXPIRED without first firing a CRITICAL WhatsApp alert for an item the
  // user never had a chance to act on.

  const shouldDispatchCriticalAlert = crossedIntoCritical && !criticalAlertSent;

  return {
    newStage,
    crossedIntoCritical,
    shouldDispatchCriticalAlert,
    shouldMoveToExpiredBucket: newStage === ALERT_STAGES.EXPIRED,
    isTerminal,
  };
}

module.exports = { evaluateTransition };
