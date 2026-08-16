export function calculateRemainingPercentage(mfgDateStr, expDateStr) {
  const mfg = new Date(mfgDateStr).getTime();
  const exp = new Date(expDateStr).getTime();
  const now = new Date().getTime();

  if (isNaN(mfg) || isNaN(exp)) return 0;
  if (now >= exp) return 0;
  if (now <= mfg) return 100;

  const totalDuration = exp - mfg;
  const elapsed = now - mfg;
  const remainingPercent = Math.round(((totalDuration - elapsed) / totalDuration) * 100);
  return Math.max(0, Math.min(100, remainingPercent));
}

export function sortByEarliestExpiry(items) {
  return [...items].sort((a, b) => new Date(a.expDate) - new Date(b.expDate));
}

// Reference bands for Kriti's alert engine (Green -> Blinking Red -> Expired).
// Kept here so alert thresholds stay derived from the same % calculation
// the dashboards use, instead of drifting out of sync.
export function getAlertBand(remainingPercent) {
  if (remainingPercent <= 0) return "expired";
  if (remainingPercent <= 10) return "blinking_red";
  if (remainingPercent <= 25) return "red";
  if (remainingPercent <= 50) return "orange";
  if (remainingPercent <= 75) return "yellow";
  return "green";
}
