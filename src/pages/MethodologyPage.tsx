import { Link } from 'react-router-dom';
import { Logo } from '../components/atoms';
import { Seo } from '../components/Seo';

/**
 * Página PÚBLICA de metodologia — explica como as previsões são geradas.
 * Linkada a partir da landing (visitante não-autenticado). Diferente da
 * página de Transparência (in-app, com AppBar e dados de desempenho).
 */
export function MethodologyPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Seo
        title="Metodologia"
        description="Como o Jonas Goat gera as previsões: três modelos estatísticos (Dixon-Coles, ELO e regressão Bayesiana) em ensemble, conversão de probabilidade em value bet (EV) e calibração honesta. Não é palpite — é matemática aplicada."
        path="/metodologia"
      />

      {/* Top bar pública simples */}
      <div
        style={{
          padding: '18px 48px', borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', gap: 16,
        }}
      >
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Logo size={20} />
        </Link>
        <div style={{ flex: 1 }} />
        <Link to="/" style={{ fontSize: 13, color: 'var(--text-2)' }}>← Voltar</Link>
      </div>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 32px 96px' }}>
        <div className="t-eyebrow" style={{ marginBottom: 12 }}>Como funciona</div>
        <h1 style={{ fontSize: 36, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 12 }}>
          Metodologia
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
          Não é palpite, não é &quot;feeling&quot;. Cada probabilidade que você vê é a saída de modelos
          estatísticos rodando sobre dados reais — os mesmos métodos usados por sindicatos
          profissionais de apostas. Abaixo, exatamente como chegamos a cada número.
        </p>

        <Section title="1. Três modelos, um ensemble">
          Em vez de confiar num único método, combinamos três modelos complementares. Cada um
          enxerga o jogo por um ângulo; a média ponderada deles é mais robusta que qualquer um sozinho.
          <ul>
            <li>
              <strong>Dixon-Coles</strong> (Poisson bivariado com correção de placares baixos e
              decaimento temporal): modela <strong>gols esperados</strong> de cada lado. É de onde
              saem todos os mercados de gol — 1X2, Over/Under, ambas marcam, handicap, placar exato.
            </li>
            <li>
              <strong>ELO / FIFA-ELO</strong>: mede a <strong>força relativa</strong> de cada time/seleção,
              atualizada jogo a jogo conforme os resultados (com peso por importância da partida e
              mando de campo). É o pilar das previsões de seleção na Copa.
            </li>
            <li>
              <strong>Regressão Bayesiana</strong>: incorpora <strong>incerteza e forma recente</strong>,
              evitando excesso de confiança quando a amostra é pequena.
            </li>
          </ul>
          O <strong>ensemble</strong> pondera as três saídas numa única probabilidade calibrada por mercado.
        </Section>

        <Section title="2. De probabilidade a value bet">
          Ter a probabilidade certa não basta — o que importa é compará-la com o preço (a odd) da casa.
          Uma aposta só vale a pena quando a nossa probabilidade é <strong>maior</strong> que a
          probabilidade implícita na odd. Em uma linha:
          <div
            style={{
              margin: '14px 0', padding: '14px 16px', borderRadius: 10,
              background: 'var(--bg-2)', border: '1px solid var(--line)',
              fontFamily: 'var(--mono)', fontSize: 14,
            }}
          >
            EV = probabilidade_do_modelo × odd − 1
          </div>
          Se o <strong>EV (valor esperado)</strong> é positivo, há valor — a longo prazo, apostar ali é
          matematicamente favorável. É isso que chamamos de <strong>value bet</strong>: não é
          &quot;quem vai ganhar&quot;, é &quot;onde o preço da casa está errado&quot;.
        </Section>

        <Section title="3. Calibração — e honestidade">
          Um modelo é bom quando é <strong>calibrado</strong>: dos jogos a que ele dá 60% de chance,
          ~60% realmente acontecem. Medimos isso continuamente (Brier score, ECE) e mostramos os erros,
          não só os acertos.
          <ul>
            <li>Erros são <strong>esperados</strong> — nenhum modelo acerta sempre.</li>
            <li>O EV positivo se realiza no <strong>longo prazo</strong> (≥ 500 apostas), nunca em
              sequências curtas. Uma semana ruim não significa modelo errado.</li>
            <li>Resultados passados <strong>não garantem</strong> resultados futuros. Não prometemos lucro —
              quem promete lucro garantido em apostas está mentindo.</li>
          </ul>
        </Section>

        <Section title="4. Os dados">
          Os modelos são treinados sobre <strong>resultados históricos</strong> de milhares de partidas,
          <strong> odds de fechamento</strong> de várias casas (o preço mais eficiente do mercado) e
          estatísticas avançadas como <strong>xG</strong> (expected goals). Tudo é determinístico: o
          mesmo cálculo roda igual para todos os usuários e para todas as casas.
        </Section>

        <div
          style={{
            marginTop: 40, padding: 24, borderRadius: 12,
            background: 'var(--edge-soft)', border: '1px solid oklch(0.88 0.17 125 / 0.4)',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 8px' }}>Veja os modelos em ação</h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 16px' }}>
            Probabilidades, mercados e value bets dos jogos de hoje.
          </p>
          <Link to="/precos" className="btn btn-edge" style={{ textDecoration: 'none' }}>
            Ver os planos
          </Link>
        </div>

        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 24, textAlign: 'center' }}>
          +18 · aposta envolve risco de perda total · previsões probabilísticas, sem garantia de retorno.
        </p>
      </main>
    </div>
  );
}

function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em', marginBottom: 12 }}>{title}</h2>
      <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }} className="terms-prose">
        {children}
      </div>
    </section>
  );
}
