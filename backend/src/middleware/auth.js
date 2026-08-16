// Auth middleware — validates the session/ID token issued by Anurag's
// Firebase Auth (email/password, Google Sign-In, phone verification) flow.
// Owner: Arham Shah (Backend/Database & Integration Lead)

const admin = require("firebase-admin");

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email || null };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { requireAuth };
