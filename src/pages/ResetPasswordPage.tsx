import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/atoms';
import { Seo } from '../components/Seo';
import { api } from '../lib/api';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { setError('Link inválido — token ausente.'); return; }
    if (password.length < 8) { setError('A senha precisa ter ao menos 8 caracteres.'); return; }
    if (password !== confirm) { setError('As senhas não coincidem.'); return; }
    setLoading(true);
    setError(null);
    try {
      await api.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setError((err as Error).message || 'Não foi possível redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', placeItems: 'center', padding: 24 }}>
      <Seo title="Redefinir senha" description="Defina uma nova senha para sua conta Jonas Goat." path="/redefinir-senha" noindex />
      <div className="surface" style={{ padding: 40, width: '100%', maxWidth: 420 }}>
        <Logo size={20} />

        {!token ? (
          <>
            <div style={{ fontSize: 48, marginTop: 24, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>Link inválido</h1>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 24 }}>
              Este link de redefinição está incompleto. Solicite um novo.
            </p>
            <Link to="/esqueci-senha" className="btn btn-edge" style={{ textDecoration: 'none', justifyContent: 'center', display: 'flex' }}>
              Pedir novo link
            </Link>
          </>
        ) : done ? (
          <>
            <div style={{ fontSize: 48, marginTop: 24, marginBottom: 16 }}>✅</div>
            <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>Senha redefinida</h1>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 24 }}>
              Sua senha foi atualizada. Redirecionando para o login…
            </p>
            <Link to="/login" className="btn btn-edge" style={{ textDecoration: 'none', justifyContent: 'center', display: 'flex' }}>
              Ir para o login
            </Link>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 500, marginTop: 32, marginBottom: 8, letterSpacing: '-0.02em' }}>
              Criar nova senha
            </h1>
            <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 24 }}>
              Escolha uma nova senha para sua conta. Use ao menos 8 caracteres.
            </p>
            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="t-eyebrow">Nova senha</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="t-eyebrow">Confirmar nova senha</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </label>

              {error && (
                <div style={{ padding: 10, borderRadius: 6, background: 'oklch(0.68 0.16 25 / 0.1)', border: '1px solid oklch(0.68 0.16 25 / 0.3)', color: 'var(--loss)', fontSize: 12 }}>
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-edge" disabled={loading} style={{ justifyContent: 'center', marginTop: 8 }}>
                {loading ? 'Salvando…' : 'Redefinir senha'}
              </button>
            </form>

            <hr className="hl" style={{ margin: '24px 0' }} />
            <div style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center' }}>
              <Link to="/login" style={{ color: 'var(--edge)' }}>Voltar para o login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
