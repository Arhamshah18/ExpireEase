const admin = require("firebase-admin");
const app = require("./app");

// Uses the same Firebase project Anurag configured for Auth, so tokens
// issued on the frontend can be verified server-side by middleware/auth.js.
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`ExpireEase API listening on port ${PORT}`);
});
