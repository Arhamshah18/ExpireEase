/**
 * ExpireEase — Alert Engine
 * src/config/alertThresholds.js
 *
 * Single source of truth for the 7-stage alert band model, taken directly
 * from the project synopsis (Section 6.4 — Alert Stage Bands).
 *
 * Bands are EXCLUSIVE and NON-OVERLAPPING: every % value maps to exactly
 * one stage. Do not edit the numeric cut points without also updating the
 * synopsis / QA edge-case table — Arham's edge-case tests assert against
 * these exact boundaries.
 *
 *   % Shelf Life Remaining        Stage
 *   > 50                          GREEN
 *   > 30  and <= 50               PINK
 *   > 25  and <= 30               YELLOW
 *   > 15  and <= 25               ORANGE
 *   > 10  and <= 15               RED
 *   > 0   and <= 10               CRITICAL   (blinking red, WhatsApp send-once)
 *   <= 0  (expired)               EXPIRED    (terminal, alerts stop)
 */

const ALERT_STAGES = Object.freeze({
  GREEN: 'GREEN',
  PINK: 'PINK',
  YELLOW: 'YELLOW',
  ORANGE: 'ORANGE',
  RED: 'RED',
  CRITICAL: 'CRITICAL',
  EXPIRED: 'EXPIRED',
});

// Ordered worst-to-best is used by the state machine to detect "did we just
// cross INTO this band" vs "did we jump past it between two recalculation
// ticks" (e.g. an item recalculated only once a day could skip straight
// from GREEN to CRITICAL — the state machine treats that as a crossing too).
const STAGE_ORDER = [
  ALERT_STAGES.EXPIRED,
  ALERT_STAGES.CRITICAL,
  ALERT_STAGES.RED,
  ALERT_STAGES.ORANGE,
  ALERT_STAGES.YELLOW,
  ALERT_STAGES.PINK,
  ALERT_STAGES.GREEN,
];

/**
 * Ordered bands, evaluated top to bottom. `min` is exclusive, `max` is
 * inclusive — matching the ">" / "<=" wording in the synopsis exactly.
 */
const ALERT_BANDS = [
  { stage: ALERT_STAGES.GREEN, min: 50, max: Infinity },
  { stage: ALERT_STAGES.PINK, min: 30, max: 50 },
  { stage: ALERT_STAGES.YELLOW, min: 25, max: 30 },
  { stage: ALERT_STAGES.ORANGE, min: 15, max: 25 },
  { stage: ALERT_STAGES.RED, min: 10, max: 15 },
  { stage: ALERT_STAGES.CRITICAL, min: 0, max: 10 },
  { stage: ALERT_STAGES.EXPIRED, min: -Infinity, max: 0 },
];

// The single stage that triggers the one-time WhatsApp escalation.
const WHATSAPP_TRIGGER_STAGE = ALERT_STAGES.CRITICAL;

// Stages at/after which no further recalculation-driven alerts should fire.
const TERMINAL_STAGES = new Set([ALERT_STAGES.EXPIRED]);

module.exports = {
  ALERT_STAGES,
  ALERT_BANDS,
  STAGE_ORDER,
  WHATSAPP_TRIGGER_STAGE,
  TERMINAL_STAGES,
};
