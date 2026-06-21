import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/atoms';
import { Seo } from '../components/Seo';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export function ConfirmEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const { refresh } = useAuth();

  useEffect(() => {
    if (!token) { setState('error'); setMessage('Token ausente.'); return; }
    (async () => {
      try {
        const r = await api.confirmEmail(token);
        setState('ok');
        setMessage(r.email);
        // Atualiza o user em memória pra o banner sumir
        refresh().catch(() => {});
      } catch (e) {
        setState('error');
        setMessage((e as Error).message);
      }
    })();
  }, [token, refresh]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', placeItems: 'center', padding: 24 }}>
      <Seo title="Confirmar email" description="Confirme seu endereço de email no Jonas Goat." path="/confirmar-email" noindex />
      <div className="surface" style={{ padding: 40, width: '100%', maxWidth: 460, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <Logo size={20} />
        </div>
        {state === 'loading' && (
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Confirmando seu email…</p>
        )}
        {state === 'ok' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>Email confirmado</h1>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 24 }}>
              Pronto, <strong style={{ fontFamily: 'var(--mono)' }}>{message}</strong> está confirmado.
            </p>
            <Link to="/predictions" className="btn btn-edge" style={{ textDecoration: 'none' }}>
              Ir para previsões
            </Link>
          </>
        )}
        {state === 'error' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>Não conseguimos confirmar</h1>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 24 }}>{message ?? 'Token inválido ou expirado.'}</p>
            <Link to="/perfil" className="btn" style={{ textDecoration: 'none' }}>
              Reenviar email
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
