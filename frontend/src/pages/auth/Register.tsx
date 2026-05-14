import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError(''); setLoading(true);
    try {
      await register(form.email, form.password, form.name);
      navigate('/');
    } catch (err: any) {
      setError(err.message.replace('Firebase: ', '').replace(/\(auth.*\)/, '').trim());
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)', letterSpacing: -1 }}>
            CMA<span style={{ color: 'var(--accent-green)' }}>Pro</span>
            <span style={{ fontSize: 12, background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: 4, marginLeft: 6, fontWeight: 600, verticalAlign: 'middle' }}>AI</span>
          </div>
        </div>

        <h2 className="auth-title">Create your account</h2>
        <p className="auth-subtitle">Start generating bank-ready reports in minutes</p>

        {error && <div className="alert alert-error mb-4">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label required">Full Name</label>
            <input className="form-input" placeholder="CA Rahul Sharma" value={form.name} onChange={set('name')} required />
          </div>
          <div className="form-group">
            <label className="form-label required">Email Address</label>
            <input type="email" className="form-input" placeholder="ca@firm.com" value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label className="form-label required">Password</label>
            <input type="password" className="form-input" placeholder="Min. 8 characters" value={form.password} onChange={set('password')} required />
          </div>
          <div className="form-group">
            <label className="form-label required">Confirm Password</label>
            <input type="password" className="form-input" placeholder="Repeat password" value={form.confirm} onChange={set('confirm')} required />
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
            {loading ? <><span className="spinner" />Creating account...</> : 'Create Account'}
          </button>
        </form>

        <div className="divider-text">or</div>

        <button onClick={() => loginWithGoogle().then(() => navigate('/'))} className="btn btn-secondary btn-lg w-full">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', marginTop: 20 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
