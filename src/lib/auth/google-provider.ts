// Google OAuth provider configuration for client-side use
// This file is dependency-free and imported by client components

export const GOOGLE_PROVIDER = {
  providerId: "grok-google",
  idp: "google",
  label: "Google",
  // Client-side OAuth init parameters
  authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  scopes: ["openid", "profile", "email"],
  // Response type and redirect URI are handled by Better Auth client
  responseType: "code",
  // Will be injected via env vars on deploy
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
  redirectUri: "https://expireease.grok.app/api/auth/oauth2/callback/grok-google",
};