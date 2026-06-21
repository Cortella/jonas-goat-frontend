import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export function EmailConfirmBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sentMsg, setSentMsg] = useState<string | null>(null);

  const resend = useMutation({
    mutationFn: () => api.resendConfirmation(),
    onSuccess: (r) => {
      setSentMsg(r.already ? 'Seu email já está confirmado.' : 'Reenviamos o email de confirmação. Confira sua caixa.');
    },
    onError: (e: Error) => setSentMsg(`Falha: ${e.message}`),
  });

  if (!user) return null;
  if (user.email_confirmed) return null;
  if (dismissed) return null;

  return (
    <div
      role="alert"
      style={{
        background: 'oklch(0.82 0.15 80 / 0.10)',
        borderBottom: '1px solid oklch(0.82 0.15 80 / 0.4)',
        color: 'var(--warn)',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 13,
        position: 'sticky',
        top: 0,
        zIndex: 60,
      }}
    >
      <span aria-hidden style={{ fontSize: 16 }}>📧</span>
      <span style={{ flex: 1 }}>
        {sentMsg ? (
          <span>{sentMsg}</span>
        ) : (
          <>
            Confirme seu email <strong style={{ fontFamily: 'var(--mono)' }}>{user.email}</strong> pra liberar todos os recursos.
          </>
        )}
      </span>
      <button
        type="button"
        onClick={() => resend.mutate()}
        disabled={resend.isPending}
        className="btn btn-sm"
        style={{ fontSize: 12, padding: '4px 10px' }}
      >
        {resend.isPending ? 'Enviando…' : 'Reenviar email'}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dispensar"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16, padding: '0 4px' }}
      >
        ×
      </button>
    </div>
  );
}
