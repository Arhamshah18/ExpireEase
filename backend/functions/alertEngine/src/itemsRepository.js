/**
 * ExpireEase — Alert Engine
 * src/repositories/itemsRepository.js
 *
 * Firestore data-access layer, scoped to exactly the fields the alert engine
 * owns on the `inventory` item documents. Uses `firebase-admin` (server-side
 * SDK) since this runs inside a scheduled Cloud Function, not the client app
 * — matches Member 3's `src/services/firebase.js` project, but this module
 * intentionally does NOT import that file: that one initializes the CLIENT
 * SDK (`firebase/app`), which can't run in a Cloud Function. See README for
 * the admin-SDK init snippet.
 *
 * Fields this module reads/writes on each `inventory/{itemId}` document:
 *   mfgDate              (existing — written by item-entry module)
 *   expDate              (existing — written by item-entry module)
 *   status               (existing — 'active' | 'expired' | 'wasted' | 'used')
 *   ownerId              (existing — used to look up WhatsApp number)
 *   alertStage           (owned by this module)
 *   criticalAlertSent    (owned by this module)
 *   criticalAlertSentAt  (owned by this module)
 *   lastRecalculatedAt   (owned by this module)
 */

const admin = require('firebase-admin');

const db = () => admin.firestore();

const INVENTORY_COLLECTION = 'inventory';
const BATCH_PAGE_SIZE = 400; // stays under Firestore's 500-write batch limit

/**
 * Streams every item that still needs alert recalculation — i.e. anything
 * not already in a terminal status. Uses a cursor so a large inventory
 * doesn't have to be loaded into memory in one shot.
 *
 * @returns {AsyncGenerator<Array<{id: string, data: object}>>} pages of items
 */
async function* getActiveItemsInPages() {
  let lastDoc = null;

  for (;;) {
    let query = db()
      .collection(INVENTORY_COLLECTION)
      .where('status', '==', 'active')
      .orderBy('__name__')
      .limit(BATCH_PAGE_SIZE);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) return;

    yield snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.docs.length < BATCH_PAGE_SIZE) return;
  }
}

/**
 * Applies the recalculation result for one item as part of a Firestore
 * batch write (caller supplies the batch so many items can commit together).
 */
function applyRecalculationToBatch(batch, itemId, { newStage, criticalAlertJustSent, movedToExpired }) {
  const ref = db().collection(INVENTORY_COLLECTION).doc(itemId);

  const update = {
    alertStage: newStage,
    lastRecalculatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (criticalAlertJustSent) {
    update.criticalAlertSent = true;
    update.criticalAlertSentAt = admin.firestore.FieldValue.serverTimestamp();
  }

  if (movedToExpired) {
    // Section 6.5/6.6: unused expired items land in the Waste log; that log
    // write is the inventory module's job (Angel's), but flipping status
    // here is what stops this item being picked up on future ticks and is
    // what the household "auto-expired → Waste log" trigger listens for.
    update.status = 'expired';
  }

  batch.update(ref, update);
}

/** Commits a Firestore write batch, used by the job after processing a page. */
async function commitBatch(batch) {
  await batch.commit();
}

function newBatch() {
  return db().batch();
}

module.exports = {
  getActiveItemsInPages,
  applyRecalculationToBatch,
  commitBatch,
  newBatch,
};
