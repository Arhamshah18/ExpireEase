require("dotenv").config();

const path = require("path");
const admin = require("firebase-admin");
const app = require("./app");

// Uses the same Firebase project Anurag configured for Auth, so tokens
// issued on the frontend can be verified server-side by middleware/auth.js.
const serviceAccountPath = path.resolve(
  process.cwd(),
  process.env.GOOGLE_APPLICATION_CREDENTIALS || "./service-account.json"
);

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`ExpireEase API listening on port ${PORT}`);
});
