import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

// Tour de boas-vindas do ASSINANTE: dispara 1x quando o usuário vira Pro/Founders
// (flag onboarded_pro), mostrando o que ele liberou. Reaproveita o visual do
// tour da carteira.
interface Step { icon: string; title: string; body: string }

function steps(isFounder: boolean): Step[] {
  return [
    {
      icon: isFounder ? '🐐' : '🎉',
      title: isFounder ? 'Bem-vindo, Founder!' : 'Bem-vindo ao Pro!',
      body: isFounder
        ? 'Você é um dos 100 fundadores — liberou tudo da plataforma. Deixa eu te mostrar o que mudou.'
        : 'Tudo liberado! Deixa eu te mostrar rapidinho o que você acabou de desbloquear.',
    },
    {
      icon: '🔮',
      title: 'Previsões ilimitadas',
      body: 'Acabou o limite. Todas as ligas + Copa do Mundo 2026, em todos os mercados (1X2, gols, escanteios, cartões…), com valor (EV) e confiança.',
    },
    {
      icon: '🐐',
      title: 'Sugestões do Jonas',
      body: 'No topo das Previsões, o sistema te aponta os jogos que valem a pena (maior EV + confiança). Pode ligar/desligar quando quiser.',
    },
    {
      icon: '🔔',
      title: 'Alertas e carteira',
      body: 'Configure alertas (Telegram, email, push) para não perder valor — e sua carteira de apostas continua centralizando tudo.',
    },
  ];
}

export function SubscriberTour() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isPaid = !!user && (user.plan === 'pro' || user.plan === 'founders');

  const prefsQ = useQuery({ queryKey: ['preferences'], queryFn: () => api.getPreferences(), enabled: isPaid });
  const mark = useMutation({ mutationFn: () => api.markProOnboarded(), onSuccess: () => qc.invalidateQueries({ queryKey: ['preferences'] }) });
  const [i, setI] = useState(0);
  const [closed, setClosed] = useState(false);

  if (!isPaid || closed) return null;
  if (!prefsQ.data || prefsQ.data.onboarded_pro) return null;

  const STEPS = steps(user!.plan === 'founders');
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  const close = () => { setClosed(true); mark.mutate(); };
  const onPrimary = () => {
    if (last) { close(); navigate('/predictions'); }
    else setI(i + 1);
  };

  return (
    <div onClick={close} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} className="surface" style={panel}>
        <div style={{ fontSize: 56, textAlign: 'center', marginBottom: 8 }} aria-hidden>{step.icon}</div>
        <h2 style={{ fontSize: 22, fontWeight: 600, textAlign: 'center', margin: '0 0 10px' }}>{step.title}</h2>
        <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6, textAlign: 'center', margin: '0 0 20px' }}>{step.body}</p>

        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
          {STEPS.map((s, idx) => (
            <span key={s.title} style={{ width: idx === i ? 20 : 8, height: 8, borderRadius: 999, background: idx === i ? 'var(--edge)' : 'var(--line)', transition: 'width .15s' }} />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={close}>Pular</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {i > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setI(i - 1)}>Voltar</button>}
            <button className="btn btn-edge btn-sm" style={{ fontWeight: 700 }} onClick={onPrimary}>
              {last ? 'Ir para as previsões' : 'Próximo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.55)', zIndex: 210,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
};
const panel: React.CSSProperties = { width: '100%', maxWidth: 420, padding: 28 };
