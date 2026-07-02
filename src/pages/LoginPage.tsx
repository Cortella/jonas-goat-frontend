import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { Logo } from '../components/atoms';
import { Seo } from '../components/Seo';
import { useAuth } from '../lib/auth';
import { api, setToken } from '../lib/api';
import { LanguageSelector } from '../components/LanguageSelector';

const googleEnabled = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

const PROMO = [
  ['📊', 'Carteira de apostas centralizada', 'Junte todas as suas contas (Bet365, Betano…) numa banca só.'],
  ['📈', 'Gestão de banca de verdade', 'Registre apostas com a odd da casa e acompanhe ROI e evolução.'],
  ['🤖', 'Previsões com IA', 'Valor (EV) e confiança em todos os mercados — no Pro.'],
  ['🐐', 'Comece de graça', 'Use a carteira e o registro de apostas sem pagar nada.'],
];

export function LoginPage() {
  const { t } = useTranslation();
  const { login, refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state: { from?: string } | null };
  const redirectTo = location.state?.from || '/copa-2026';

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

  const onGoogle = async (cred: CredentialResponse) => {
    if (!cred.credential) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api.googleAuth(cred.credential);
      if ('needs_onboarding' in r) {
        navigate('/cadastro-google', { state: { email: r.email, name: r.name, pending: r.pending } });
        return;
      }
      setToken(r.token);
      await refresh();
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError((err as Error).message || 'Falha no login com Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>
      <Seo title={t('auth.login_title')} description="Jonas Goat" path="/login" noindex />
      <LanguageSelector variant="floating" />

      {/* Painel promocional (esconde no mobile) */}
      <div
        className="login-promo"
        style={{
          flex: 1,
          padding: '56px 48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 28,
          background: 'linear-gradient(150deg, oklch(0.22 0.04 150), oklch(0.16 0.02 240))',
          borderRight: '1px solid var(--line)',
        }}
      >
        <div>
          <div style={{ fontSize: 64 }} aria-hidden>🐐</div>
          <h2 style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, margin: '12px 0 8px', color: 'oklch(0.98 0 0)' }}>
            Vantagem matemática<br />sobre as casas de apostas.
          </h2>
          <p style={{ fontSize: 15, color: 'oklch(0.85 0.02 150)', maxWidth: 420, lineHeight: 1.6 }}>
            Centralize sua banca, registre suas apostas e deixe a IA do Jonas apontar onde está o valor.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {PROMO.map(([icon, title, sub]) => (
            <div key={title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 24 }} aria-hidden>{icon}</span>
              <div>
                <div style={{ fontWeight: 600, color: 'oklch(0.98 0 0)', fontSize: 14 }}>{title}</div>
                <div style={{ fontSize: 13, color: 'oklch(0.8 0.02 150)' }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Painel do formulário */}
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 24 }}>
        <div className="surface" style={{ padding: 40, width: '100%', maxWidth: 420 }}>
          <Logo size={20} />
          <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 28, marginBottom: 6, letterSpacing: '-0.02em' }}>
            {t('auth.login_title')}
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 24 }}>
            {t('auth.login_welcome')}
          </p>

          {googleEnabled && (
            <>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={onGoogle}
                  onError={() => setError('Falha no login com Google')}
                  text="continue_with"
                  shape="pill"
                  width="340"
                  locale="pt-BR"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0', color: 'var(--muted)', fontSize: 12 }}>
                <span style={{ flex: 1, borderTop: '1px solid var(--line)' }} />
                ou com email
                <span style={{ flex: 1, borderTop: '1px solid var(--line)' }} />
              </div>
            </>
          )}

          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="t-eyebrow">{t('auth.login_email')}</span>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input" placeholder={t('auth.login_placeholder_email')} autoComplete="email"
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="t-eyebrow">{t('auth.login_password')}</span>
              <input
                type="password" required minLength={1} value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input" placeholder={t('auth.login_placeholder_password')} autoComplete="current-password"
              />
            </label>
            <div style={{ textAlign: 'right', marginTop: -4 }}>
              <Link to="/esqueci-senha" style={{ color: 'var(--text-2)', fontSize: 12 }}>Esqueci minha senha</Link>
            </div>

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

      <style>{`@media (max-width: 860px){ .login-promo{ display: none !important; } }`}</style>
    </div>
  );
}
