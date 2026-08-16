/**
 * ExpireEase — Alert Engine
 * src/notifications/notificationDispatcher.js
 *
 * Single entry point the recalculation job calls when the state machine
 * says a CRITICAL alert should be dispatched. Encodes the exact channel
 * rule from synopsis Section 6.4:
 *
 *   "Exactly one WhatsApp message is sent per item, the first time it
 *    crosses into the <=10% band... if no verified WhatsApp number is on
 *    file, the in-app alert still fires and the user is prompted to add
 *    one."
 *
 * i.e. the in-app/push notification ALWAYS fires on a critical crossing;
 * WhatsApp fires additionally, only when a verified number exists.
 */

const { sendCriticalExpiryAlert } = require('./whatsappService');
const { sendCriticalExpiryPush } = require('./pushService');
const { getNotificationProfile, flagWhatsappPrompt } = require('../repositories/usersRepository');

/**
 * @param {object} params
 * @param {string} params.ownerId
 * @param {string} params.itemName
 * @param {number} params.percentRemaining
 * @returns {Promise<{
 *   pushResult: object,
 *   whatsappResult: object|null,
 *   whatsappSkippedReason: string|null,
 * }>}
 */
async function dispatchCriticalAlert({ ownerId, itemName, percentRemaining }) {
  const profile = await getNotificationProfile(ownerId);
  const hasVerifiedWhatsapp = profile.whatsappVerified && Boolean(profile.whatsappNumber);

  // In-app/push fires unconditionally.
  const pushResult = await sendCriticalExpiryPush({
    fcmTokens: profile.fcmTokens,
    itemName,
    percentRemaining,
    whatsappFallback: !hasVerifiedWhatsapp,
  });

  if (!hasVerifiedWhatsapp) {
    await flagWhatsappPrompt(ownerId);
    return { pushResult, whatsappResult: null, whatsappSkippedReason: 'no_verified_whatsapp' };
  }

  const whatsappResult = await sendCriticalExpiryAlert({
    toWhatsappNumber: profile.whatsappNumber,
    itemName,
    percentRemaining,
  });

  return { pushResult, whatsappResult, whatsappSkippedReason: null };
}

module.exports = { dispatchCriticalAlert };
