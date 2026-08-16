import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOtp, confirmOtp, getAuthErrorMessage } from '../../services/authService';
import { auth } from '../../services/firebase';

// Two-step flow: request OTP -> confirm code.
// On success this flips users/{uid}.phoneVerified to true, which is the
// flag Kriti's alert engine checks before sending WhatsApp messages.
export default function PhoneVerification() {
  const navigate = useNavigate();
  const [step, setStep] = useState('phone'); // 'phone' | 'code'
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');

    const e164 = normalizeToE164(phone);
    if (!e164) {
      setError('Enter a valid phone number including country code, e.g. +919876543210.');
      return;
    }

    setLoading(true);
    try {
      const result = await sendOtp(e164);
      setConfirmationResult(result);
      setStep('code');
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCode = async (e) => {
    e.preventDefault();
    setError('');

    if (!code.trim()) {
      setError('Enter the 6-digit code sent to your phone.');
      return;
    }

    setLoading(true);
    try {
      await confirmOtp(confirmationResult, code.trim(), auth.currentUser.uid);
      navigate('/mode-selection');
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Allowed: alerts fall back to in-app only until the user verifies later
    // from their profile screen. Nothing here blocks app access.
    navigate('/mode-selection');
  };

  return (
    <div style={styles.container}>
      <div id="recaptcha-container" />

      <h1 style={styles.title}>Verify Your Phone</h1>
      <p style={styles.subtitle}>
        Needed to send you WhatsApp expiry alerts. You can skip this and add it later.
      </p>

      {step === 'phone' && (
        <form onSubmit={handleSendOtp} style={styles.form}>
          <label style={styles.label}>Phone Number</label>
          <input
            style={styles.input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.primaryButton}>
            {loading ? 'Sending code…' : 'Send Code'}
          </button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={handleConfirmCode} style={styles.form}>
          <label style={styles.label}>6-Digit Code</label>
          <input
            style={styles.input}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            inputMode="numeric"
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.primaryButton}>
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </form>
      )}

      <button type="button" onClick={handleSkip} style={styles.linkButton}>
        Skip for now
      </button>
    </div>
  );
}

function normalizeToE164(raw) {
  const trimmed = raw.trim().replace(/[\s-]/g, '');
  return /^\+[1-9]\d{7,14}$/.test(trimmed) ? trimmed : null;
}

const styles = {
  container: { maxWidth: 380, margin: '60px auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: 'sans-serif' },
  title: { textAlign: 'center', marginBottom: 4 },
  subtitle: { textAlign: 'center', color: '#666', fontSize: '13px', marginTop: 0, marginBottom: 20 },
  form: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 600, marginTop: '8px' },
  input: { padding: '10px', fontSize: '15px', borderRadius: '6px', border: '1px solid #ccc' },
  error: { color: '#c62828', fontSize: '13px', margin: '4px 0' },
  primaryButton: { marginTop: '14px', padding: '10px', fontSize: '15px', borderRadius: '6px', border: 'none', background: '#1565c0', color: '#fff', cursor: 'pointer' },
  linkButton: { background: 'none', border: 'none', color: '#1565c0', fontSize: '13px', cursor: 'pointer', marginTop: '16px', padding: 0, textAlign: 'center' }
};
