/**
 * ExpireEase — Alert Engine
 * test/alertEngine.test.js
 *
 * Run with: npx jest test/alertEngine.test.js
 *
 * Covers the boundary rules from synopsis Section 6.4 and the ambiguities
 * Arham's edge-case table (Section 7) calls out explicitly:
 *   - exclusive/non-overlapping thresholds at every exact cut point
 *   - exactly-once WhatsApp dispatch per item per CRITICAL crossing
 *   - no alert fires when data is entered already expired
 *   - terminal EXPIRED state stops further alerts
 */

const { classifyAlertStage } = require('../src/alertStageClassifier');
const { calculateShelfLifePercentage } = require('../src/shelfLifeCalculator');
const { evaluateTransition } = require('../src/alertStateMachine');
const { ALERT_STAGES } = require('../src/config/alertThresholds');

describe('classifyAlertStage — exact boundary values', () => {
  test.each([
    [100, ALERT_STAGES.GREEN],
    [50.01, ALERT_STAGES.GREEN],
    [50, ALERT_STAGES.PINK], // boundary is inclusive on the lower band
    [30.01, ALERT_STAGES.PINK],
    [30, ALERT_STAGES.YELLOW],
    [25.01, ALERT_STAGES.YELLOW],
    [25, ALERT_STAGES.ORANGE],
    [15.01, ALERT_STAGES.ORANGE],
    [15, ALERT_STAGES.RED],
    [10.01, ALERT_STAGES.RED],
    [10, ALERT_STAGES.CRITICAL],
    [0.01, ALERT_STAGES.CRITICAL],
    [0, ALERT_STAGES.EXPIRED],
    [-5, ALERT_STAGES.EXPIRED],
  ])('%d%% -> %s', (pct, expected) => {
    expect(classifyAlertStage(pct)).toBe(expected);
  });
});

describe('calculateShelfLifePercentage', () => {
  test('50% remaining at the exact midpoint', () => {
    const mfg = new Date('2026-01-01T00:00:00Z');
    const exp = new Date('2026-01-11T00:00:00Z'); // 10-day shelf life
    const now = new Date('2026-01-06T00:00:00Z'); // day 5 of 10
    expect(calculateShelfLifePercentage(mfg, exp, now)).toBeCloseTo(50, 5);
  });

  test('throws when mfgDate is not strictly before expDate', () => {
    expect(() =>
      calculateShelfLifePercentage('2026-01-05', '2026-01-01')
    ).toThrow();
  });

  test('returns a negative value once past expiry (not clamped)', () => {
    const mfg = new Date('2026-01-01T00:00:00Z');
    const exp = new Date('2026-01-11T00:00:00Z');
    const now = new Date('2026-01-12T00:00:00Z'); // 1 day past expiry
    expect(calculateShelfLifePercentage(mfg, exp, now)).toBeLessThan(0);
  });
});

describe('evaluateTransition — send-once + terminal-state rules', () => {
  test('fires exactly once on first crossing into CRITICAL', () => {
    const result = evaluateTransition({
      previousStage: ALERT_STAGES.RED,
      newStage: ALERT_STAGES.CRITICAL,
      criticalAlertSent: false,
    });
    expect(result.shouldDispatchCriticalAlert).toBe(true);
  });

  test('does NOT re-fire on a later tick still in CRITICAL', () => {
    const result = evaluateTransition({
      previousStage: ALERT_STAGES.CRITICAL,
      newStage: ALERT_STAGES.CRITICAL,
      criticalAlertSent: true,
    });
    expect(result.shouldDispatchCriticalAlert).toBe(false);
  });

  test('fires when an item skips straight from GREEN to CRITICAL between ticks', () => {
    const result = evaluateTransition({
      previousStage: ALERT_STAGES.GREEN,
      newStage: ALERT_STAGES.CRITICAL,
      criticalAlertSent: false,
    });
    expect(result.shouldDispatchCriticalAlert).toBe(true);
  });

  test('does NOT fire a CRITICAL alert for data entered already expired', () => {
    const result = evaluateTransition({
      previousStage: null,
      newStage: ALERT_STAGES.EXPIRED,
      criticalAlertSent: false,
    });
    expect(result.shouldDispatchCriticalAlert).toBe(false);
    expect(result.shouldMoveToExpiredBucket).toBe(true);
  });

  test('EXPIRED is terminal — no alert even if the flag was never set', () => {
    const result = evaluateTransition({
      previousStage: ALERT_STAGES.CRITICAL,
      newStage: ALERT_STAGES.EXPIRED,
      criticalAlertSent: false,
    });
    expect(result.shouldDispatchCriticalAlert).toBe(false);
    expect(result.isTerminal).toBe(true);
  });
});
