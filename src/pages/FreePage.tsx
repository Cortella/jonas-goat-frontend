import { Link } from 'react-router-dom';
import { AppBar } from '../components/AppBar';
import { Seo } from '../components/Seo';
import { useAuth } from '../lib/auth';

const INCLUDED = [
  ['🏦', 'Carteira centralizada', 'Junte todas as suas contas (Bet365, Betano, etc.) numa banca só. Crie uma carteira por site/conta e veja o total na carteira Principal.'],
  ['🎯', 'Registro de apostas', 'Lance cada aposta com a odd que a casa te deu, o mercado e o valor. Se o mercado não estiver na lista, é só digitar.'],
  ['📈', 'Gestão de banca', 'Acompanhe a evolução do bankroll, o ROI geral e o ROI por liga, mercado e casa. Tudo que você precisa pra saber se está no lucro.'],
  ['✅', 'Liquidação e lançamentos', 'Marque Green, Red ou Push e a banca atualiza sozinha. Use lançamentos pra depositar, sacar ou ajustar o saldo quando precisar.'],
  ['🏆', 'Conquistas', 'Desbloqueie troféus conforme usa a plataforma — apostas, sequências de greens, crescimento da banca e mais.'],
  ['🔔', 'Notificações', 'Receba avisos in-app sobre novidades e atualizações da plataforma.'],
];

export function FreePage() {
  const { user } = useAuth();
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <AppBar />
      <Seo
        title="Plano Free — gestão de banca grátis"
        description="No plano Free do Jonas Goat você centraliza sua carteira de apostas (várias casas numa banca só), registra suas apostas com a odd da casa e acompanha ROI e evolução do bankroll — de graça. As previsões com IA são exclusivas do Pro."
        path="/gratis"
      />

      <main style={{ maxWidth: 920, margin: '0 auto', padding: '56px 24px 96px' }}>
        <div className="t-eyebrow" style={{ marginBottom: 12 }}>Plano Free · sem cartão</div>
        <h1 style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 16px', lineHeight: 1.1 }}>
          Gestão de banca de verdade.<br />De graça.
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: 16, lineHeight: 1.6, maxWidth: 660 }}>
          O Free é a sua central de apostas: junte todas as suas contas numa banca só, registre o que você
          aposta e veja, com números, se está ganhando. Sem pagar nada. As <strong>previsões com IA</strong> ficam
          no Pro — o Free é sobre <strong>organizar e entender</strong> a sua própria banca.
        </p>

        <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
          <Link to={user ? '/bankroll' : '/signup'} className="btn btn-edge" style={{ textDecoration: 'none', padding: '12px 22px', fontWeight: 700 }}>
            {user ? 'Abrir minha carteira' : 'Criar conta grátis'}
          </Link>
          <Link to="/precos" className="btn btn-ghost" style={{ textDecoration: 'none', padding: '12px 22px' }}>
            Comparar com o Pro
          </Link>
        </div>

        <section style={{ marginTop: 48 }}>
          <div className="t-eyebrow" style={{ marginBottom: 14 }}>O que você tem de graça</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {INCLUDED.map(([icon, title, desc]) => (
              <div key={title} className="surface" style={{ padding: 18 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }} aria-hidden>{icon}</div>
                <strong style={{ fontSize: 15, display: 'block', marginBottom: 6 }}>{title}</strong>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* O que é exclusivo do Pro */}
        <section
          style={{
            marginTop: 40, padding: 24, borderRadius: 16,
            background: 'var(--edge-soft)', border: '1px solid oklch(0.88 0.17 125 / 0.45)',
          }}
        >
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Quando quiser mais</div>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>
            As previsões com IA são do <span style={{ color: 'var(--edge)' }}>Pro</span>
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 16px', maxWidth: 620 }}>
            No Pro, a IA aponta os jogos com valor (EV) e confiança, em todas as ligas e mercados, com
            previsões ilimitadas, sugestões automáticas e alertas. O Free segue te servindo a carteira e a
            gestão de banca — o Pro adiciona o cérebro por cima.
          </p>
          <Link to="/precos" className="btn btn-edge" style={{ textDecoration: 'none', fontWeight: 700 }}>
            Ver planos
          </Link>
        </section>

        {/* Comparação rápida */}
        <section style={{ marginTop: 40 }}>
          <div className="t-eyebrow" style={{ marginBottom: 12 }}>Free × Pro, resumido</div>
          <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
            {[
              ['Carteira + registro de apostas', true, true],
              ['Gestão de banca (ROI, evolução)', true, true],
              ['Múltiplas carteiras (várias casas)', true, true],
              ['Conquistas', true, true],
              ['Previsões com IA (ilimitadas)', false, true],
              ['Sugestões de jogos (valor/EV)', false, true],
              ['Alertas (Telegram, email, push)', false, true],
            ].map(([label, free, pro], i) => (
              <div
                key={label as string}
                style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px', gap: 8, padding: '12px 16px', alignItems: 'center', fontSize: 13, borderTop: i === 0 ? 'none' : '1px solid var(--line)' }}
              >
                <span>{label}</span>
                <span style={{ textAlign: 'center', color: free ? 'var(--edge)' : 'var(--muted)' }}>{free ? '✓' : '—'}</span>
                <span style={{ textAlign: 'center', color: pro ? 'var(--edge)' : 'var(--muted)' }}>{pro ? '✓' : '—'}</span>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px', gap: 8, padding: '10px 16px', borderTop: '1px solid var(--line)', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <span>Recurso</span><span style={{ textAlign: 'center' }}>Free</span><span style={{ textAlign: 'center' }}>Pro</span>
            </div>
          </div>
        </section>

        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 40, textAlign: 'center' }}>
          +18 · aposta envolve risco de perda total · a gestão de banca não garante lucro.
        </p>
      </main>
    </div>
  );
}
