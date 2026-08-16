/**
 * ExpireEase — Alert Engine
 * src/notifications/whatsappService.js
 *
 * WhatsApp Business API integration. Uses Twilio's WhatsApp API rather than
 * calling the Meta Cloud API directly — Twilio wraps the WABA approval/
 * template-registration process, which is faster to stand up for a PBL
 * project than raw Meta onboarding. Swap `sendWhatsappMessage`'s
 * implementation for `axios` calls to graph.facebook.com if the team later
 * gets direct Meta WABA access — nothing else in the alert engine needs to
 * change, since every caller only depends on this file's exported function
 * signature.
 *
 * Required env vars (see README):
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_FROM      e.g. "whatsapp:+14155238886" (Twilio sandbox
 *                             number, or your approved WABA number)
 *
 * IMPORTANT: WhatsApp Business API requires pre-approved message templates
 * for any business-initiated message outside a 24h user session window —
 * which a CRITICAL expiry alert always is. `CRITICAL_ALERT_TEMPLATE_SID`
 * must point to a template already approved in the Twilio/Meta console;
 * free-form `body` text will be REJECTED by WhatsApp for a cold outbound
 * message. Register a template along the lines of:
 *   "{{1}} is at {{2}}% shelf life remaining and will expire soon. Open
 *    ExpireEase to take action."
 */

const twilio = require('twilio');

let client = null;
function getClient() {
  if (!client) {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error('whatsappService: missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN');
    }
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return client;
}

/**
 * @param {object} params
 * @param {string} params.toWhatsappNumber — E.164, e.g. "+919812345678"
 * @param {string} params.itemName
 * @param {number} params.percentRemaining — rounded for display
 * @returns {Promise<{success: boolean, providerMessageId?: string, error?: string}>}
 */
async function sendCriticalExpiryAlert({ toWhatsappNumber, itemName, percentRemaining }) {
  const { TWILIO_WHATSAPP_FROM, CRITICAL_ALERT_TEMPLATE_SID } = process.env;

  if (!TWILIO_WHATSAPP_FROM) {
    return { success: false, error: 'TWILIO_WHATSAPP_FROM not configured' };
  }

  try {
    const message = await getClient().messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${toWhatsappNumber}`,
      // Prefer an approved content template (required for business-initiated
      // messages). Fall back to a plain body only for local/sandbox testing.
      ...(CRITICAL_ALERT_TEMPLATE_SID
        ? {
            contentSid: CRITICAL_ALERT_TEMPLATE_SID,
            contentVariables: JSON.stringify({
              1: itemName,
              2: String(Math.max(0, Math.round(percentRemaining))),
            }),
          }
        : {
            body: `ExpireEase: "${itemName}" is at ${Math.max(
              0,
              Math.round(percentRemaining)
            )}% shelf life remaining and will expire soon. Open the app to take action.`,
          }),
    });

    return { success: true, providerMessageId: message.sid };
  } catch (err) {
    // Never throw out of a notification call — a delivery failure must not
    // block the recalculation job for every other item in the batch.
    return { success: false, error: err.message };
  }
}

module.exports = { sendCriticalExpiryAlert };
