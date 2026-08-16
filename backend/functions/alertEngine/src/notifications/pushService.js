/**
 * ExpireEase — Alert Engine
 * src/notifications/pushService.js
 *
 * In-app / push notification fallback (Firebase Cloud Messaging), used:
 *   1. ALWAYS alongside a CRITICAL alert, so the card blinks / a bell
 *      notification appears even for users who do have WhatsApp — the
 *      synopsis describes WhatsApp as an *escalation channel*, not a
 *      replacement for the in-app card (Section 6.4: "Card blinks in-app
 *      AND one WhatsApp message is sent").
 *   2. As the ONLY channel when the user has no verified WhatsApp number
 *      on file (Section 6.4: "...the in-app alert still fires").
 */

const admin = require('firebase-admin');

/**
 * @param {object} params
 * @param {string[]} params.fcmTokens
 * @param {string} params.itemName
 * @param {number} params.percentRemaining
 * @param {boolean} params.whatsappFallback — true if this push is standing
 *        in for a missing WhatsApp number, for a slightly different copy.
 * @returns {Promise<{success: boolean, sent: number, failed: number}>}
 */
async function sendCriticalExpiryPush({ fcmTokens, itemName, percentRemaining, whatsappFallback = false }) {
  const tokens = (fcmTokens || []).filter(Boolean);
  if (tokens.length === 0) {
    return { success: false, sent: 0, failed: 0 };
  }

  const pct = Math.max(0, Math.round(percentRemaining));
  const body = whatsappFallback
    ? `"${itemName}" is almost expired (${pct}% left). Add a verified WhatsApp number to get alerts there too.`
    : `"${itemName}" is almost expired — ${pct}% shelf life remaining.`;

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: 'ExpireEase — Critical Alert',
      body,
    },
    data: {
      type: 'CRITICAL_EXPIRY_ALERT',
      itemName,
    },
  });

  return {
    success: response.successCount > 0,
    sent: response.successCount,
    failed: response.failureCount,
  };
}

module.exports = { sendCriticalExpiryPush };
