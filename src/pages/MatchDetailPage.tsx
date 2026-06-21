import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppBar } from '../components/AppBar';
import { Crest, Dot, ProbBar, Sparkline } from '../components/atoms';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface ModelRow {
  name: string;
  weight: number;
  p: [number, number, number];
  emphasis?: boolean;
}

const MODELS: ModelRow[] = [
  { name: 'Dixon-Coles', weight: 15, p: [44, 28, 28] },
  { name: 'ELO', weight: 30, p: [50, 26, 24] },
  { name: 'Bayesian', weight: 55, p: [46, 25, 29] },
  { name: 'Ensemble', weight: 100, p: [47, 26, 27], emphasis: true },
];

type MarketRow = [string, number, number, number, number, string, string, 'edge' | null];

const MARKETS: MarketRow[] = [
  ['Vitória Leverkusen (2)', 27.0, 3.7, 3.32, 3.45, 'Pinnacle', '+9.1%', 'edge'],
  ['Empate (X)', 26.0, 3.85, 3.6, 3.65, 'Bet365', '−1.4%', null],
  ['Vitória Bayern (1)', 47.0, 2.13, 2.05, 2.1, 'Betano', '−1.5%', null],
  ['Over 1.5 gols', 84.5, 1.18, 1.16, 1.18, 'Pinnacle', '−0.4%', null],
  ['Over 2.5 gols', 64.5, 1.55, 1.5, 1.55, 'Betfair', '+0.0%', null],
  ['Over 3.5 gols', 38.7, 2.58, 2.45, 2.55, 'Bet365', '−1.3%', null],
  ['Ambas marcam (sim)', 61.2, 1.63, 1.58, 1.62, 'Pinnacle', '+0.6%', null],
  ['Resultado + ambas marcam · 2/sim', 18.5, 5.40, 5.10, 5.40, 'Bet365', '+0.0%', 'edge'],
  ['Dupla chance · X2', 53.0, 1.89, 1.78, 1.85, 'Betano', '−1.9%', null],
  ['Handicap asiático · 2 +1.0', 62.0, 1.61, 1.55, 1.60, 'Pinnacle', '−0.2%', null],
  ['Escanteios > 9.5', 73.1, 1.37, 1.30, 1.35, 'Betfair', '−1.4%', null],
  ['Escanteios > 10.5', 58.4, 1.71, 1.62, 1.68, 'KTO', '+1.8%', null],
  ['Cartões > 4.5', 56.0, 1.79, 1.72, 1.78, 'Bet365', '+0.6%', null],
  ['Total chutes ao alvo > 9.5', 64.0, 1.56, 1.50, 1.55, 'Pinnacle', '−0.8%', null],
  ['Wirtz marca (jogador)', 38.0, 2.63, 2.4, 2.55, 'Pinnacle', '+6.4%', 'edge'],
  ['Kane marca (jogador)', 64.0, 1.56, 1.52, 1.55, 'Bet365', '+0.6%', null],
  ['Wirtz dá assistência', 22.0, 4.55, 4.20, 4.40, 'Betano', '−3.2%', null],
  ['Marcador a qualquer momento · Boniface', 41.0, 2.44, 2.30, 2.45, 'Pinnacle', '+0.4%', null],
  ['Tempo do 1º gol < 30min', 49.5, 2.02, 1.90, 2.00, 'Bet365', '−1.0%', null],
];

export function MatchDetailPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const id = matchId ? Number(matchId) : null;

  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['prediction', id],
    queryFn: () => (id ? api.prediction(id) : Promise.reject(new Error('no id'))),
    enabled: !!id,
    retry: false,
  });

  // Acesso à análise completa: planos pagos veem incluso; demais destravam
  // gastando créditos. Anônimos veem o convite para entrar.
  const access = useQuery({
    queryKey: ['pred-access', id],
    queryFn: () => api.predictionAccess(id!),
    enabled: !!id && !!user,
    retry: false,
  });
  const unlock = useMutation({
    mutationFn: () => api.unlockPrediction(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pred-access', id] });
      qc.invalidateQueries({ queryKey: ['credits-me'] });
    },
  });
  const locked = !!id && !!user && access.data ? !access.data.has_access : false;
  const lockedAnon = !!id && !user;
  const gated = locked || lockedAnon;

  const home = q.data?.home_team || 'Bayern de Munique';
  const away = q.data?.away_team || 'Bayer Leverkusen';

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <AppBar />

      <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)' }}>
        <Link to="/predictions" style={{ color: 'inherit', textDecoration: 'none' }}>Previsões</Link>
        <span>›</span>
        <span>{q.data?.league || 'Bundesliga'}</span>
        <span>›</span>
        <span style={{ color: 'var(--text)' }}>{home} × {away}</span>
      </div>

      <div style={{ padding: '32px 32px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 32, alignItems: 'center', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'flex-end', textAlign: 'right' }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 500 }}>{home}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>1º · 73 pts · forma WWDWW</div>
          </div>
          <Crest team={home} size={56} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Sábado · 17:00 · Allianz Arena</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 36, fontWeight: 500, letterSpacing: '0.04em' }}>vs</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '4px 12px', borderRadius: 999, background: 'var(--edge-soft)', border: '1px solid oklch(0.88 0.17 125 / 0.4)' }}>
            <Dot pulse />
            <span style={{ fontSize: 11, color: 'var(--edge)', fontFamily: 'var(--mono)', letterSpacing: '0.06em' }}>VALUE BET DETECTADO</span>
          </div>
          {id != null && (
            <div style={{ marginTop: 10 }}>
              <Link
                to={`/partida-ao-vivo/${id}`}
                className="btn btn-sm"
                style={{ padding: '6px 12px', fontSize: 11, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Dot pulse style={{ background: 'oklch(0.68 0.16 25)' }} />
                Análise ao vivo
              </Link>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Crest team={away} size={56} />
          <div>
            <div style={{ fontSize: 24, fontWeight: 500 }}>{away}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>3º · 64 pts · forma WWLWD</div>
          </div>
        </div>
      </div>

      <div style={{ padding: 32, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="surface" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
              <div>
                <div className="t-eyebrow">Voto do ensemble · resultado 1X2</div>
                <div style={{ fontSize: 16, fontWeight: 500, marginTop: 6 }}>Cada modelo prevê separado, depois agregamos com pesos.</div>
              </div>
              <span className="tag tag-edge">Decisão final · 2 — Leverkusen</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 60px 60px 60px', gap: 12, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              <span>Modelo</span><span>Distribuição</span><span style={{ textAlign: 'right' }}>1</span><span style={{ textAlign: 'right' }}>X</span><span style={{ textAlign: 'right' }}>2</span>
            </div>
            {MODELS.map((m, i) => (
              <div
                key={m.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 1fr 60px 60px 60px',
                  gap: 12,
                  padding: '12px 0',
                  alignItems: 'center',
                  borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                  background: m.emphasis ? 'oklch(0.88 0.17 125 / 0.04)' : 'transparent',
                  marginLeft: m.emphasis ? -12 : 0,
                  marginRight: m.emphasis ? -12 : 0,
                  paddingLeft: m.emphasis ? 12 : 0,
                  paddingRight: m.emphasis ? 12 : 0,
                  borderRadius: m.emphasis ? 6 : 0,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: m.emphasis ? 500 : 400 }}>{m.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>peso {m.weight}%</div>
                </div>
                <ProbBar home={m.p[0]} draw={m.p[1]} away={m.p[2]} height={8} />
                {m.p.map((v, j) => (
                  <span key={j} style={{ fontFamily: 'var(--mono)', fontSize: 13, textAlign: 'right', color: m.emphasis ? 'var(--text)' : 'var(--text-2)', fontWeight: m.emphasis ? 600 : 400 }}>
                    {v}%
                  </span>
                ))}
              </div>
            ))}
          </div>

          <div style={{ position: 'relative' }}>
          {gated && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                textAlign: 'center',
                padding: 24,
                background: 'oklch(0.16 0.006 240 / 0.55)',
                backdropFilter: 'blur(2px)',
                borderRadius: 'var(--r-3)',
              }}
            >
              <div style={{ fontSize: 28 }}>🔒</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>Análise completa bloqueada</div>
              {lockedAnon ? (
                <>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', maxWidth: 320, margin: 0 }}>
                    Entre para destravar todos os mercados, EV e picks deste jogo.
                  </p>
                  <Link to="/login" className="btn btn-edge">Entrar</Link>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', maxWidth: 340, margin: 0 }}>
                    Destrave todos os mercados deste jogo por{' '}
                    <strong>{access.data ? BRL(access.data.cost_brl) : '—'}</strong> em créditos.
                    {access.data && (
                      <> Saldo: <strong>{BRL(access.data.balance_brl)}</strong>.</>
                    )}
                  </p>
                  {access.data && access.data.balance_brl >= access.data.cost_brl ? (
                    <button className="btn btn-edge" onClick={() => unlock.mutate()} disabled={unlock.isPending}>
                      {unlock.isPending ? 'Destravando…' : `Destravar por ${BRL(access.data.cost_brl)}`}
                    </button>
                  ) : (
                    <Link to="/checkout?credits=1" className="btn btn-edge">Carregar créditos</Link>
                  )}
                  {unlock.isError && (
                    <div style={{ fontSize: 12, color: 'var(--loss)' }}>{String(unlock.error)}</div>
                  )}
                </>
              )}
            </div>
          )}
          <div className="surface" style={{ padding: 0, overflow: 'hidden', filter: gated ? 'blur(5px)' : undefined, pointerEvents: gated ? 'none' : undefined }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Mercados disponíveis</div>
              <div style={{ display: 'flex', gap: 4, fontFamily: 'var(--mono)', fontSize: 11 }}>
                {['Todos', 'Resultado', 'Gols', 'Escanteios', 'Cartões', 'Jogadores'].map((t, i) => (
                  <span
                    key={t}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: i === 0 ? 'var(--surface-2)' : 'transparent',
                      color: i === 0 ? 'var(--text)' : 'var(--muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 80px 80px 80px 100px 1fr 80px', gap: 12, padding: '12px 20px', fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <span>Mercado</span>
              <span style={{ textAlign: 'right' }}>Prob</span>
              <span style={{ textAlign: 'right' }}>Justa</span>
              <span style={{ textAlign: 'right' }}>Mkt</span>
              <span style={{ textAlign: 'right' }}>Best</span>
              <span></span>
              <span style={{ textAlign: 'right' }}>EV</span>
            </div>
            {MARKETS.map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '180px 80px 80px 80px 100px 1fr 80px',
                  gap: 12,
                  padding: '12px 20px',
                  borderTop: '1px solid var(--line)',
                  alignItems: 'center',
                  fontSize: 12,
                }}
              >
                <span style={{ fontWeight: r[7] === 'edge' ? 500 : 400 }}>{r[0]}</span>
                <span style={{ fontFamily: 'var(--mono)', textAlign: 'right' }}>{r[1].toFixed(1)}%</span>
                <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', color: 'var(--muted)' }}>{r[2].toFixed(2)}</span>
                <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', color: 'var(--muted)' }}>{r[3].toFixed(2)}</span>
                <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', fontWeight: 500, color: r[7] === 'edge' ? 'var(--edge)' : 'var(--text)' }}>{r[4].toFixed(2)}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{r[5]}</span>
                <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', fontWeight: 600, color: r[7] === 'edge' ? 'var(--edge)' : 'var(--muted)' }}>{r[6]}</span>
              </div>
            ))}
          </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="surface" style={{ padding: 20, border: '1px solid oklch(0.88 0.17 125 / 0.4)' }}>
            <div className="t-eyebrow" style={{ color: 'var(--edge)' }}>Top pick</div>
            <h3 style={{ fontSize: 18, fontWeight: 500, margin: '8px 0 12px' }}>Vitória Leverkusen @ 3.45</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              {(
                [
                  ['EV', '+9.1%', 'var(--edge)'],
                  ['Probabilidade', '27.0%', 'var(--text)'],
                  ['Confiança', 'Alta · 3/3', 'var(--text)'],
                  ['Kelly ½', 'R$ 34,20 · 1.84%', 'var(--text)'],
                  ['Bookmaker', 'Pinnacle', 'var(--text)'],
                ] as Array<[string, string, string]>
              ).map(([l, v, c]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-2)' }}>{l}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, color: c }}>{v}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-edge" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>Registrar aposta</button>
          </div>

          <div className="surface" style={{ padding: 20 }}>
            <div className="t-eyebrow" style={{ marginBottom: 8 }}>Movimento da odd · 2 · 24h</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
              <span className="t-num" style={{ fontSize: 22, fontWeight: 500 }}>3.45</span>
              <span style={{ color: 'var(--edge)', fontFamily: 'var(--mono)', fontSize: 11 }}>+0.25 (+7.8%)</span>
            </div>
            <Sparkline data={[3.2, 3.22, 3.27, 3.3, 3.32, 3.3, 3.34, 3.38, 3.4, 3.43, 3.45]} width={320} height={50} color="oklch(0.88 0.17 125)" fill />
          </div>

          <div className="surface" style={{ padding: 20 }}>
            <div className="t-eyebrow" style={{ marginBottom: 12 }}>H2H · últimos 8</div>
            <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
              <div><div className="t-num" style={{ fontSize: 22, fontWeight: 500 }}>4</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Bayern</div></div>
              <div><div className="t-num" style={{ fontSize: 22, fontWeight: 500, color: 'var(--muted)' }}>2</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Empate</div></div>
              <div><div className="t-num" style={{ fontSize: 22, fontWeight: 500 }}>2</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Leverkusen</div></div>
              <div style={{ marginLeft: 'auto' }}><div className="t-num" style={{ fontSize: 22, fontWeight: 500 }}>3.4</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>gols/jogo</div></div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['B', 'B', 'D', 'L', 'B', 'L', 'D', 'B'].map((r, i) => (
                <span
                  key={i}
                  style={{
                    flex: 1,
                    height: 18,
                    borderRadius: 3,
                    background: r === 'B' ? 'oklch(0.50 0.10 230 / 0.5)' : r === 'D' ? 'var(--surface-2)' : 'oklch(0.50 0.05 30 / 0.4)',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="surface" style={{ padding: 20 }}>
            <div className="t-eyebrow" style={{ marginBottom: 12 }}>Escalações prováveis</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>{home} · 4-2-3-1</div>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', lineHeight: 1.6 }}>
              Neuer · Kimmich Upamecano Kim Davies · Goretzka Pavlović · Sané Müller Olise · Kane
            </div>
            <hr className="hl" style={{ margin: '12px 0' }} />
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>{away} · 3-4-2-1</div>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', lineHeight: 1.6 }}>
              Kovář · Tah Tapsoba Hincapié · Frimpong Xhaka Palacios Grimaldo · Wirtz Hofmann · Boniface
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
