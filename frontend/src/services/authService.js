import { auth, db } from './firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Email / Password
// ---------------------------------------------------------------------------

export async function loginWithEmail(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(email, password, displayName) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(credential.user, { displayName });
  }
  await ensureUserDoc(credential.user);
  return credential;
}

export async function resetPassword(email) {
  return await sendPasswordResetEmail(auth, email);
}

// ---------------------------------------------------------------------------
// Google
// ---------------------------------------------------------------------------

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  await ensureUserDoc(credential.user);
  return credential;
}

// ---------------------------------------------------------------------------
// Phone / OTP verification (used post-signup to unlock WhatsApp alerts)
// ---------------------------------------------------------------------------

let recaptchaVerifier = null;

export function setupRecaptcha(containerId = 'recaptcha-container') {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
  }
  return recaptchaVerifier;
}

// phoneNumber must be E.164 format, e.g. "+919876543210"
export async function sendOtp(phoneNumber) {
  const verifier = setupRecaptcha();
  return await signInWithPhoneNumber(auth, phoneNumber, verifier);
}

export async function confirmOtp(confirmationResult, code, uid) {
  const result = await confirmationResult.confirm(code);
  await setDoc(
    doc(db, 'users', uid),
    { phoneVerified: true, phoneNumber: result.user.phoneNumber },
    { merge: true }
  );
  return result;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export async function logoutUser() {
  return await signOut(auth);
}

// Subscribe once at app root (e.g. in App.jsx) and hold the user in context/state.
// Returns the unsubscribe function.
export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, callback);
}

// ---------------------------------------------------------------------------
// Firestore user doc bootstrap
// ---------------------------------------------------------------------------

async function ensureUserDoc(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email || null,
      displayName: user.displayName || null,
      phoneVerified: false,
      phoneNumber: null,
      createdAt: new Date().toISOString()
    });
  }
}

// ---------------------------------------------------------------------------
// Human-readable error messages for Firebase Auth error codes
// ---------------------------------------------------------------------------

export function getAuthErrorMessage(code) {
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with that email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account already exists with that email.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error — check your connection and try again.';
    case 'auth/invalid-verification-code':
      return 'That OTP code is incorrect.';
    case 'auth/code-expired':
      return 'That OTP code has expired. Request a new one.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
