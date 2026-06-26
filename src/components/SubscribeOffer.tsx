import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

// Oferta flutuante "Vire Founder" — canto inferior esquerdo, para quem ainda
// não assina (visitante ou plano free). Some quando vira pro/founders.
// Ao FECHAR (X), é dispensada de vez (lembrada no localStorage) para não ficar
// insistindo com o usuário. Canto esquerdo pra não colidir com o SupportBubble.

const HIDDEN_PATHS = new Set(['/checkout', '/precos', '/login', '/signup']);
const DISMISS_KEY = 'jg_offer_dismissed';

export function SubscribeOffer() {
  const { user } = useAuth();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  // Já é assinante pagante, já fechou, ou está numa tela de conversão → nada.
  if (user && user.plan !== 'free') return null;
  if (dismissed) return null;
  if (HIDDEN_PATHS.has(location.pathname)) return null;

  // Visitante deslogado não consegue ir ao checkout (rota protegida): manda
  // pro cadastro, que já encaminha pra escolha de plano.
  const to = user ? '/checkout?plan=founders&cycle=lifetime' : '/signup';

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setDismissed(true);
  };

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
          3 anos de acesso total + grupo VIP no WhatsApp.
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
        onClick={dismiss}
        aria-label="Fechar oferta"
        title="Fechar"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16, padding: '0 2px', alignSelf: 'flex-start' }}
      >
        ×
      </button>
    </div>
  );
}
