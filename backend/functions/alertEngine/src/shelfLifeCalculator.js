/**
 * ExpireEase — Alert Engine
 * src/shelfLifeCalculator.js
 *
 * % Shelf Life Remaining = [ (Expiry Date − Current Date) / (Expiry Date −
 * Manufacturing Date) ] × 100          (synopsis, Section 6.3)
 *
 * NOTE: This is intentionally the same formula Member 1 owns in
 * `src/utils/shelfLife.js` (calculateRemainingPercentage). It's re-implemented
 * here, standalone, so the alert engine has no runtime dependency on the
 * frontend utils folder — the recalculation job runs server-side/in a Cloud
 * Function, not in the client bundle. If the team prefers a single shared
 * package later, extract both into a `shared/` workspace and re-export.
 *
 * Unlike Member 1's version (which clamps 0–100 for UI display), this one
 * does NOT clamp the lower bound — the alert engine needs the true signed
 * value so it can tell "just expired" apart from "expired a while ago"
 * when deciding whether an item should move to the terminal EXPIRED stage.
 */

/**
 * @param {Date|string|number} mfgDate
 * @param {Date|string|number} expDate
 * @param {Date} [now] — injectable for testing; defaults to current time.
 * @returns {number} percentage remaining, can go negative once expired.
 * @throws {Error} if dates are invalid or mfgDate is not strictly before expDate.
 */
function calculateShelfLifePercentage(mfgDate, expDate, now = new Date()) {
  const mfg = new Date(mfgDate).getTime();
  const exp = new Date(expDate).getTime();
  const current = now.getTime();

  if (Number.isNaN(mfg) || Number.isNaN(exp)) {
    throw new Error('calculateShelfLifePercentage: invalid mfgDate/expDate');
  }
  if (mfg >= exp) {
    // Same invariant Anurag's validation.js enforces at entry time. If this
    // ever fires here, bad data got in some other way (e.g. a manual DB
    // edit) — fail loudly instead of silently returning a nonsense %.
    throw new Error('calculateShelfLifePercentage: mfgDate must be before expDate');
  }

  const totalDuration = exp - mfg;
  const remaining = exp - current;

  return (remaining / totalDuration) * 100;
}

module.exports = { calculateShelfLifePercentage };
