import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../components/atoms';
import { Seo } from '../components/Seo';
import { useAuth } from '../lib/auth';
import { api, setToken } from '../lib/api';

// Completa o cadastro de quem entrou com o Google: o Google dá email/nome, mas
// faltam CPF, nascimento e aceite dos termos (exigências legais).
export function GoogleOnboardingPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const location = useLocation() as { state: { email?: string; name?: string | null; pending?: string } | null };
  const st = location.state;

  const [fullName, setFullName] = useState(st?.name ?? '');
  const [cpf, setCpf] = useState('');
  const [birth, setBirth] = useState('');
  const [country, setCountry] = useState('BR');
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!st?.pending) return <Navigate to="/login" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terms) { setError('Você precisa aceitar os termos para continuar.'); return; }
    setLoading(true);
    setError(null);
    try {
      const r = await api.googleComplete({
        pending: st.pending!,
        full_name: fullName.trim(),
        cpf: cpf.trim(),
        birth_date: birth,
        country: country.trim().toUpperCase() || 'BR',
        terms_accepted: true,
      });
      setToken(r.token);
      await refresh();
      navigate('/copa-2026', { replace: true });
    } catch (err) {
      setError((err as Error).message || 'Falha ao concluir o cadastro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', placeItems: 'center', padding: 24 }}>
      <Seo title="Concluir cadastro" description="Jonas Goat" path="/cadastro-google" noindex />
      <div className="surface" style={{ padding: 40, width: '100%', maxWidth: 440 }}>
        <Logo size={20} />
        <h1 style={{ fontSize: 24, fontWeight: 600, marginTop: 24, marginBottom: 6, letterSpacing: '-0.02em' }}>
          Quase lá 🐐
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 20 }}>
          Entrando com o Google como <strong>{st.email}</strong>. Precisamos de alguns dados para liberar sua conta.
        </p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="t-eyebrow">Nome completo</span>
            <input className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome completo" />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="t-eyebrow">CPF (ou documento)</span>
              <input className="input" required value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" inputMode="numeric" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="t-eyebrow">País</span>
              <input className="input" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={2} placeholder="BR" />
            </label>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="t-eyebrow">Data de nascimento</span>
            <input className="input" type="date" required value={birth} onChange={(e) => setBirth(e.target.value)} />
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: 'var(--text-2)' }}>
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} style={{ marginTop: 3 }} />
            <span>Li e aceito os <Link to="/termos" style={{ color: 'var(--edge)' }}>termos de uso</Link> (maior de 18 anos).</span>
          </label>

          {error && (
            <div style={{ padding: 10, borderRadius: 6, background: 'oklch(0.68 0.16 25 / 0.1)', border: '1px solid oklch(0.68 0.16 25 / 0.3)', color: 'var(--loss)', fontSize: 12 }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-edge" disabled={loading} style={{ justifyContent: 'center', marginTop: 8 }}>
            {loading ? 'Criando conta…' : 'Concluir e entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
