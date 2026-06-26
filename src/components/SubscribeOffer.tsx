import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

// Oferta flutuante "Vire Founder" — fica fixa no canto inferior esquerdo em
// TODA tela para quem ainda não assina (visitante ou plano free). Um clique
// leva direto ao checkout de Founder (campanha de 100 vagas). Some assim que o
// usuário vira pro/founders.
// Canto esquerdo pra não colidir com o SupportBubble (canto direito).

// Telas onde a oferta seria redundante (a própria página já é a conversão).
const HIDDEN_PATHS = new Set(['/checkout', '/precos', '/login', '/signup']);

export function SubscribeOffer() {
  const { user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Já é assinante pagante → nada a oferecer.
  if (user && user.plan !== 'free') return null;
  if (HIDDEN_PATHS.has(location.pathname)) return null;

  // Visitante deslogado não consegue ir ao checkout (rota protegida): manda
  // pro cadastro, que já encaminha pra escolha de plano.
  const to = user ? '/checkout?plan=founders&cycle=lifetime' : '/signup';

  if (collapsed) {
    return (
      <Link
        to={to}
        aria-label="Vire Founder"
        style={{
          position: 'fixed', left: 24, bottom: 24, zIndex: 100,
          background: 'var(--edge)', color: 'oklch(0.16 0.006 240)',
          borderRadius: 999, width: 48, height: 48,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          textDecoration: 'none', fontSize: 22,
          boxShadow: '0 4px 12px oklch(0 0 0 / 0.3)',
        }}
        title="Vire Founder · 100 vagas"
      >
        🐐
      </Link>
    );
  }

  return (
    <div
      style={{
        position: 'fixed', left: 24, bottom: 24, zIndex: 100,
        maxWidth: 'calc(100vw - 48px)',
        background: 'var(--bg-2)',
        border: '1px solid var(--edge)',
        borderRadius: 12,
        boxShadow: '0 8px 24px oklch(0 0 0 / 0.35)',
        padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}
    >
      <span aria-hidden style={{ fontSize: 22 }}>🐐</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <strong style={{ fontSize: 13, color: 'var(--text)' }}>Vire Founder · só 100 vagas</strong>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          5 anos de acesso total + grupo VIP no WhatsApp.
        </span>
      </div>
      <Link
        to={to}
        className="btn btn-edge btn-sm"
        style={{ textDecoration: 'none', whiteSpace: 'nowrap', fontSize: 12 }}
      >
        Garantir vaga
      </Link>
      <button
        type="button"
        onClick={() => setCollapsed(true)}
        aria-label="Minimizar oferta"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16, padding: '0 2px', alignSelf: 'flex-start' }}
      >
        ×
      </button>
    </div>
  );
}
