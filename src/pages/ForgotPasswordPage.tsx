import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/atoms';
import { Seo } from '../components/Seo';
import { api } from '../lib/api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError((err as Error).message || 'Não foi possível enviar o email. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', placeItems: 'center', padding: 24 }}>
      <Seo title="Esqueci minha senha" description="Recupere o acesso à sua conta Jonas Goat." path="/esqueci-senha" noindex />
      <div className="surface" style={{ padding: 40, width: '100%', maxWidth: 420 }}>
        <Logo size={20} />
        {sent ? (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 500, marginTop: 32, marginBottom: 8, letterSpacing: '-0.02em' }}>
              Verifique seu email
            </h1>
            <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              Se houver uma conta associada a <strong style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{email}</strong>,
              enviamos um link para redefinir a senha. O link expira em 30 minutos.
            </p>
            <Link to="/login" className="btn btn-edge" style={{ textDecoration: 'none', justifyContent: 'center', display: 'flex' }}>
              Voltar para o login
            </Link>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 500, marginTop: 32, marginBottom: 8, letterSpacing: '-0.02em' }}>
              Esqueci minha senha
            </h1>
            <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 24 }}>
              Informe o email da sua conta e enviaremos um link para criar uma nova senha.
            </p>
            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="t-eyebrow">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="voce@email.com"
                  autoComplete="email"
                />
              </label>

              {error && (
                <div style={{ padding: 10, borderRadius: 6, background: 'oklch(0.68 0.16 25 / 0.1)', border: '1px solid oklch(0.68 0.16 25 / 0.3)', color: 'var(--loss)', fontSize: 12 }}>
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-edge" disabled={loading} style={{ justifyContent: 'center', marginTop: 8 }}>
                {loading ? 'Enviando…' : 'Enviar link de recuperação'}
              </button>
            </form>

            <hr className="hl" style={{ margin: '24px 0' }} />
            <div style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center' }}>
              Lembrou a senha? <Link to="/login" style={{ color: 'var(--edge)' }}>Voltar para o login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
