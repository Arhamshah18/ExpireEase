import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginWithEmail, loginWithGoogle, resetPassword, getAuthErrorMessage } from '../../services/authService';

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setResetSent(false);

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      await loginWithEmail(email.trim(), password);
      navigate('/mode-selection');
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setResetSent(false);
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/mode-selection');
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setResetSent(false);

    if (!email.trim()) {
      setError('Enter your email above first, then tap "Forgot password".');
      return;
    }

    try {
      await resetPassword(email.trim());
      setResetSent(true);
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
    }
  };

  return (
    <div style={styles.container}>
      {/* Required for phone-auth reCAPTCHA elsewhere in the auth flow;
          harmless to keep mounted here too if Login is the app's entry screen. */}
      <div id="recaptcha-container" />

      <h1 style={styles.title}>ExpireEase</h1>
      <p style={styles.subtitle}>Log in to your account</p>

      <form onSubmit={handleEmailLogin} style={styles.form}>
        <label style={styles.label} htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={styles.input}
          autoComplete="email"
        />

        <label style={styles.label} htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={styles.input}
          autoComplete="current-password"
        />

        {error && <p style={styles.error}>{error}</p>}
        {resetSent && (
          <p style={styles.success}>Password reset email sent — check your inbox.</p>
        )}

        <button type="submit" disabled={loading} style={styles.primaryButton}>
          {loading ? 'Logging in…' : 'Log In'}
        </button>

        <button type="button" onClick={handleForgotPassword} style={styles.linkButton}>
          Forgot password?
        </button>
      </form>

      <div style={styles.divider}>
        <span>or</span>
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        style={styles.googleButton}
      >
        Continue with Google
      </button>

      <p style={styles.footerText}>
        Don't have an account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 380,
    margin: '60px auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontFamily: 'sans-serif'
  },
  title: { textAlign: 'center', marginBottom: 0 },
  subtitle: { textAlign: 'center', color: '#666', marginTop: 0, marginBottom: 20 },
  form: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 600, marginTop: '8px' },
  input: {
    padding: '10px',
    fontSize: '15px',
    borderRadius: '6px',
    border: '1px solid #ccc'
  },
  error: { color: '#c62828', fontSize: '13px', margin: '4px 0' },
  success: { color: '#2e7d32', fontSize: '13px', margin: '4px 0' },
  primaryButton: {
    marginTop: '14px',
    padding: '10px',
    fontSize: '15px',
    borderRadius: '6px',
    border: 'none',
    background: '#1565c0',
    color: '#fff',
    cursor: 'pointer'
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#1565c0',
    fontSize: '13px',
    cursor: 'pointer',
    marginTop: '6px',
    alignSelf: 'flex-start',
    padding: 0
  },
  divider: { textAlign: 'center', color: '#999', margin: '20px 0', fontSize: '13px' },
  googleButton: {
    padding: '10px',
    fontSize: '15px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    background: '#fff',
    cursor: 'pointer'
  },
  footerText: { textAlign: 'center', fontSize: '13px', marginTop: '20px', color: '#444' }
};
