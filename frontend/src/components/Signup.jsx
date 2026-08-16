import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerWithEmail, getAuthErrorMessage } from '../../services/authService';

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await registerWithEmail(email.trim(), password, name.trim());
      // Route to phone verification so WhatsApp alerts can be enabled.
      navigate('/verify-phone');
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Create Account</h1>

      <form onSubmit={handleSignup} style={styles.form}>
        <label style={styles.label}>Full Name</label>
        <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />

        <label style={styles.label}>Email</label>
        <input style={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />

        <label style={styles.label}>Password</label>
        <input style={styles.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" />

        <label style={styles.label}>Confirm Password</label>
        <input style={styles.input} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />

        {error && <p style={styles.error}>{error}</p>}

        <button type="submit" disabled={loading} style={styles.primaryButton}>
          {loading ? 'Creating account…' : 'Sign Up'}
        </button>
      </form>

      <p style={styles.footerText}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}

const styles = {
  container: { maxWidth: 380, margin: '60px auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: 'sans-serif' },
  title: { textAlign: 'center', marginBottom: 20 },
  form: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 600, marginTop: '8px' },
  input: { padding: '10px', fontSize: '15px', borderRadius: '6px', border: '1px solid #ccc' },
  error: { color: '#c62828', fontSize: '13px', margin: '4px 0' },
  primaryButton: { marginTop: '14px', padding: '10px', fontSize: '15px', borderRadius: '6px', border: 'none', background: '#1565c0', color: '#fff', cursor: 'pointer' },
  footerText: { textAlign: 'center', fontSize: '13px', marginTop: '20px', color: '#444' }
};
