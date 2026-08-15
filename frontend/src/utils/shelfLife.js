// src/utils/shelfLife.js

// Calculates remaining shelf life percentage (0% to 100%)
export function calculateRemainingPercentage(mfgDateStr, expDateStr) {
  const mfg = new Date(mfgDateStr).getTime();
  const exp = new Date(expDateStr).getTime();
  const now = new Date().getTime();

  if (now >= exp) return 0;
  if (now <= mfg) return 100;

  const totalDuration = exp - mfg;
  const elapsed = now - mfg;
  
  const remainingPercent = Math.round(((totalDuration - elapsed) / totalDuration) * 100);
  return Math.max(0, Math.min(100, remainingPercent));
}

// Sorts an array of items by earliest expiry date (FEFO rule)
export function sortByEarliestExpiry(items) {
  return [...items].sort((a, b) => new Date(a.expDate) - new Date(b.expDate));
}
