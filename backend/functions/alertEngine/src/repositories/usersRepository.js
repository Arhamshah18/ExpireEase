/**
 * ExpireEase — Alert Engine
 * src/repositories/usersRepository.js
 *
 * Read-only lookups the alert engine needs from the `users` collection.
 * User creation/mobile-verification itself belongs to Anurag's auth module
 * (Section 6.1: "Mobile number is captured and must be verified before any
 * WhatsApp alert can be sent") — this module only reads what that flow wrote.
 *
 * Expected fields on `users/{userId}`:
 *   whatsappNumber      : string|null  — E.164 format, e.g. "+919812345678"
 *   whatsappVerified     : boolean
 *   fcmTokens           : string[]     — for the in-app/push fallback
 */

const admin = require('firebase-admin');

const db = () => admin.firestore();

async function getNotificationProfile(userId) {
  const snap = await db().collection('users').doc(userId).get();

  if (!snap.exists) {
    return { whatsappNumber: null, whatsappVerified: false, fcmTokens: [] };
  }

  const data = snap.data();
  return {
    whatsappNumber: data.whatsappNumber ?? null,
    whatsappVerified: Boolean(data.whatsappVerified),
    fcmTokens: Array.isArray(data.fcmTokens) ? data.fcmTokens : [],
  };
}

/**
 * Sets a flag prompting the user, in-app, to add/verify a WhatsApp number —
 * used when a CRITICAL alert had to fall back to push-only because no
 * verified number was on file (synopsis 6.4: "...the user is prompted to
 * add one").
 */
async function flagWhatsappPrompt(userId) {
  await db().collection('users').doc(userId).set(
    { promptAddWhatsapp: true },
    { merge: true }
  );
}

module.exports = { getNotificationProfile, flagWhatsappPrompt };
