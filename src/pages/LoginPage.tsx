import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '../components/atoms';
import { Seo } from '../components/Seo';
import { useAuth } from '../lib/auth';
import { LanguageSelector } from '../components/LanguageSelector';

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state: { from?: string } | null };
  const redirectTo = location.state?.from || '/predictions';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError((err as Error).message || t('auth.login_error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', placeItems: 'center', padding: 24 }}>
      <Seo title={t('auth.login_title')} description="Jonas Goat" path="/login" noindex />
      <LanguageSelector variant="floating" />
      <div className="surface" style={{ padding: 40, width: '100%', maxWidth: 420 }}>
        <Logo size={20} />
        <h1 style={{ fontSize: 28, fontWeight: 500, marginTop: 32, marginBottom: 8, letterSpacing: '-0.02em' }}>
          {t('auth.login_title')}
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 24 }}>
          {t('auth.login_welcome')}
        </p>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="t-eyebrow">{t('auth.login_email')}</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder={t('auth.login_placeholder_email')}
              autoComplete="email"
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="t-eyebrow">{t('auth.login_password')}</span>
            <input
              type="password"
              required
              minLength={1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder={t('auth.login_placeholder_password')}
              autoComplete="current-password"
            />
          </label>

          {error && (
            <div style={{ padding: 10, borderRadius: 6, background: 'oklch(0.68 0.16 25 / 0.1)', border: '1px solid oklch(0.68 0.16 25 / 0.3)', color: 'var(--loss)', fontSize: 12 }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-edge" disabled={loading} style={{ justifyContent: 'center', marginTop: 8 }}>
            {loading ? t('auth.login_loading') : t('auth.login_submit')}
          </button>
        </form>

        <hr className="hl" style={{ margin: '24px 0' }} />
        <div style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center' }}>
          {t('auth.login_no_account')} <Link to="/signup" style={{ color: 'var(--edge)' }}>{t('auth.login_create')}</Link>
        </div>
      </div>
    </div>
  );
}
