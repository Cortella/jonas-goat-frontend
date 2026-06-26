import { useState } from 'react';

// Tour guiado da Carteira — explica a funcionalidade na 1ª vez (mascote Jonas).
// Reabrível pelo botão "Como funciona". Marcar como visto fica a cargo de quem
// usa (BankrollPage chama api.markOnboarded ao fechar na 1ª vez).

interface Step { icon: string; title: string; body: string }

const STEPS: Step[] = [
  {
    icon: '🐐',
    title: 'Bem-vindo à sua Carteira',
    body: 'Aqui você gerencia sua banca de verdade: registra suas apostas, acompanha o ROI e vê a evolução do seu bankroll ao longo do tempo.',
  },
  {
    icon: '🏦',
    title: 'Várias carteiras, uma visão',
    body: 'Crie uma carteira para cada site/conta (ex.: "Bet365", "Betano — conta João"). A carteira Principal soma todas, e o extrato mostra de qual carteira veio cada lançamento.',
  },
  {
    icon: '🎯',
    title: 'Registre suas apostas',
    body: 'Escolha o jogo (ou registre direto na tela da partida), informe a odd que a casa te deu e o valor apostado. Se o mercado não estiver na lista, é só digitar o seu.',
  },
  {
    icon: '✅',
    title: 'Liquide e sincronize',
    body: 'Quando o jogo acabar, marque Green, Red ou Push — a banca atualiza sozinha. Use “Lançamento” para depositar, sacar ou ajustar o saldo quando precisar sincronizar com o valor real.',
  },
];

export function WalletTour({ onClose }: Readonly<{ onClose: () => void }>) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} className="surface" style={panel}>
        <div style={{ fontSize: 56, textAlign: 'center', marginBottom: 8 }} aria-hidden>{step.icon}</div>
        <h2 style={{ fontSize: 22, fontWeight: 600, textAlign: 'center', margin: '0 0 10px' }}>{step.title}</h2>
        <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6, textAlign: 'center', margin: '0 0 20px' }}>{step.body}</p>

        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
          {STEPS.map((s, idx) => (
            <span
              key={s.title}
              style={{ width: idx === i ? 20 : 8, height: 8, borderRadius: 999, background: idx === i ? 'var(--edge)' : 'var(--line)', transition: 'width .15s' }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Pular</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {i > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setI(i - 1)}>Voltar</button>}
            <button className="btn btn-edge btn-sm" style={{ fontWeight: 700 }} onClick={() => (last ? onClose() : setI(i + 1))}>
              {last ? 'Começar' : 'Próximo'}
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
