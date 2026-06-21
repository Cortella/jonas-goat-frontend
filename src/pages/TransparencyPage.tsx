import { AppBar } from '../components/AppBar';
import { SectionHeader, Stat } from '../components/atoms';

const CALIB: Array<[number, number]> = [
  [10, 11.2], [20, 19.4], [30, 31.8], [40, 38.6], [50, 49.2],
  [60, 60.8], [70, 68.4], [80, 81.6], [90, 88.2],
];

const MONTHLY = [
  { m: 'mai/24', v: 2.1 }, { m: 'jun', v: -1.8 }, { m: 'jul', v: 4.2 },
  { m: 'ago', v: 1.4 }, { m: 'set', v: -0.6 }, { m: 'out', v: 3.8 },
  { m: 'nov', v: 5.1 }, { m: 'dez', v: 2.4 }, { m: 'jan/25', v: -2.4 },
  { m: 'fev', v: 1.8 }, { m: 'mar', v: 4.6 }, { m: 'abr', v: 3.2 },
];

export function TransparencyPage() {
  const sz = 280;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <AppBar />

      <div style={{ padding: '32px 32px 16px', maxWidth: 1280, margin: '0 auto' }}>
        <SectionHeader
          eyebrow="Transparência radical"
          title="Mostramos os erros, não só os acertos."
          sub="Tudo aqui é gerado direto do banco — sem filtro, sem cherry-picking. Atualizado diariamente após o fim das partidas."
        />
      </div>

      <div style={{ padding: '0 32px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, maxWidth: 1280, margin: '0 auto' }}>
        {(
          [
            ['Jogos analisados', '14.382', 'desde mai/2024', 'var(--text)'],
            ['Acerto 1X2', '54.2%', 'baseline aleatório: 33%', 'var(--edge)'],
            ['Brier score', '0.198', 'menor é melhor · perfeito = 0', 'var(--text)'],
            ['ROI ensemble', '+12.4%', 'stake fixa 1u · stake Kelly: +18.6%', 'var(--edge)'],
          ] as Array<[string, string, string, string]>
        ).map(([l, v, s, c], i) => (
          <div key={i} className="surface" style={{ padding: 20 }}>
            <Stat label={l} value={v} sub={s} color={c} />
          </div>
        ))}
      </div>

      <div style={{ padding: '0 32px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 1280, margin: '0 auto' }}>
        <div className="surface" style={{ padding: 28 }}>
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Calibração · 1X2</div>
          <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 500 }}>Quando dizemos 60%, acertamos ~60% das vezes.</h3>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}>
            Cada ponto agrupa ~1.500 previsões. A diagonal é o ideal — pontos próximos = modelo bem calibrado. ECE: 1.4%.
          </p>
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
            <svg width={sz + 40} height={sz + 40} viewBox={`-30 -10 ${sz + 50} ${sz + 40}`}>
              <line x1="0" y1={sz} x2={sz} y2={sz} stroke="var(--line-2)" />
              <line x1="0" y1="0" x2="0" y2={sz} stroke="var(--line-2)" />
              {[0.25, 0.5, 0.75].map((g) => (
                <g key={g}>
                  <line x1={g * sz} y1="0" x2={g * sz} y2={sz} stroke="var(--line)" strokeDasharray="2 4" />
                  <line x1="0" y1={(1 - g) * sz} x2={sz} y2={(1 - g) * sz} stroke="var(--line)" strokeDasharray="2 4" />
                </g>
              ))}
              <line x1="0" y1={sz} x2={sz} y2="0" stroke="var(--line-2)" strokeWidth="1" strokeDasharray="4 4" />
              {CALIB.map(([p, a], i) => {
                const x = (p / 100) * sz;
                const y = sz - (a / 100) * sz;
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="6" fill="oklch(0.88 0.17 125 / 0.18)" />
                    <circle cx={x} cy={y} r="3.5" fill="var(--edge)" />
                  </g>
                );
              })}
              <text x={sz / 2} y={sz + 26} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--muted)">
                Probabilidade prevista (%)
              </text>
              <text x={-22} y={sz / 2} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--muted)" transform={`rotate(-90 -22 ${sz / 2})`}>
                Frequência observada (%)
              </text>
              {[0, 50, 100].map((t) => (
                <g key={t}>
                  <text x={(t / 100) * sz} y={sz + 14} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--muted)">
                    {t}
                  </text>
                  <text x={-6} y={sz - (t / 100) * sz + 3} textAnchor="end" fontFamily="var(--mono)" fontSize="9" fill="var(--muted)">
                    {t}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        <div className="surface" style={{ padding: 28 }}>
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>ROI mensal · 12 meses</div>
          <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 500 }}>9 meses positivos · 3 negativos · −2.4% pior mês.</h3>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}>
            Variância existe. Quem promete só meses verdes está mentindo. Long-tail positivo é como o edge se materializa.
          </p>
          <div style={{ marginTop: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 200, paddingBottom: 24, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1px dashed var(--line-2)' }} />
            <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)', background: 'var(--surface)', padding: '0 4px' }}>
              0%
            </span>
            {MONTHLY.map((mm, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                <div style={{ flex: 1, width: 18, display: 'flex', alignItems: 'flex-end', position: 'relative' }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${Math.abs(mm.v) * 14}px`,
                      background: mm.v >= 0 ? 'var(--edge)' : 'var(--loss)',
                      opacity: 0.88,
                      position: 'absolute',
                      top: mm.v >= 0 ? `${100 - mm.v * 14}px` : `100px`,
                    }}
                  />
                </div>
                <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{mm.m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 32px 32px', maxWidth: 1280, margin: '0 auto' }}>
        <div className="surface" style={{ padding: 28 }}>
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Limitações honestas</div>
          <h3 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 500 }}>
            O que os modelos <span className="t-serif t-italic" style={{ color: 'var(--edge)' }}>não fazem</span> bem.
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
            {(
              [
                ['Jogos com lesão de última hora', 'Se o atacante titular sai 30min antes, nossa probabilidade não reflete. Solução em desenvolvimento (lineup confirmado).'],
                ['Ligas fora do top 5', 'Modelos foram treinados com dados das principais ligas europeias. Brasileirão e libertadores chegam em ago/26.'],
                ['Cup ties e amistosos', 'Motivação irregular distorce o sinal. Mostramos previsão, mas nunca como value bet.'],
                ['Mercados esquisitos', 'Não cobrimos handicaps asiáticos, escanteios por tempo, ou apostas combinadas (parlay).'],
                ['Curtos prazos', 'Edge se realiza em ≥ 500 apostas. Em 30 jogos, sequência negativa não significa que o modelo está errado.'],
                ['Vies de overlay', 'Quando vários usuários apostam no mesmo jogo, a odd cai. Quem aposta primeiro pega o EV maior.'],
              ] as Array<[string, string]>
            ).map(([t, s], i) => (
              <div key={i} style={{ paddingLeft: 16, borderLeft: '1px solid var(--line-2)' }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{t}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Como ganhamos dinheiro (anchored at #receita) ─── */}
      <div id="receita" style={{ padding: '0 32px 32px', maxWidth: 1280, margin: '0 auto' }}>
        <div className="surface" style={{ padding: 28 }}>
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Como ganhamos dinheiro</div>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 500 }}>
            Assinatura primeiro. Afiliação <span className="t-serif t-italic" style={{ color: 'var(--edge)' }}>transparente</span>, nunca silenciosa.
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>1 · Sua assinatura</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>
                É a fonte principal. Mantém os modelos rodando, paga as APIs de odds e o servidor. Sem assinatura, o produto morre.
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>2 · Comissão de afiliado</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>
                Quando você clica numa casa de apostas no <a href="/comparador" style={{ color: 'var(--edge)' }}>comparador</a> e abre conta, podemos receber comissão. Receita complementar — não substitui assinatura.
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>O que <em>não</em> mudamos por causa de afiliação</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>
                Ranking de odds. Probabilidades dos modelos. Cálculo de EV. Identificação de value bets. Tudo é determinístico e roda igual para todas as casas — afiliadas ou não.
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Você sempre sabe</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>
                Todo link de afiliado tem o ícone <span style={{ fontFamily: 'var(--mono)' }}>↗</span>, abre em nova aba e respeita <code style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>rel=&quot;sponsored&quot;</code> (padrão Google). Sem cookies de rastreio cross-site da nossa parte.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
