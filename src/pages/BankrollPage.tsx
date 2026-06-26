import { useQuery } from '@tanstack/react-query';
import { AppBar } from '../components/AppBar';
import { SectionHeader, Stat } from '../components/atoms';
import { api, type BankrollSummary, type Bet } from '../lib/api';
import { money as BRL } from '../lib/money';

const PCT = (v: number) => `${(v * 100).toFixed(1)}%`;

interface BankrollPoint {
  date: string;
  value: number;
}

/** Build a bankroll evolution series from settled bets, in order. */
function buildSeries(initial: number, bets: Bet[]): BankrollPoint[] {
  const settled = bets
    .filter((b) => b.settled_at && b.payout != null)
    .sort((a, b) => (a.settled_at ?? '').localeCompare(b.settled_at ?? ''));
  const points: BankrollPoint[] = [{ date: 'inicial', value: initial }];
  let acc = initial;
  for (const b of settled) {
    acc += Number(b.payout) || 0;
    points.push({ date: (b.settled_at ?? '').slice(0, 10), value: acc });
  }
  return points;
}

export function BankrollPage() {
  const summaryQ = useQuery({
    queryKey: ['bankroll-summary'],
    queryFn: () => api.bankrollSummary(),
  });
  const betsQ = useQuery({ queryKey: ['bankroll-bets'], queryFn: () => api.listBets(200) });

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <AppBar />
      <div style={{ padding: '32px 32px 16px', maxWidth: 1280, margin: '0 auto' }}>
        <SectionHeader
          eyebrow="Bankroll pessoal"
          title="Sua banca, suas apostas, sua progressão."
          sub="Registra apostas reais, calcula stake Kelly por jogo e mostra ROI por liga, mercado e modelo."
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm">Importar CSV</button>
              <button className="btn btn-edge btn-sm">+ Registrar aposta</button>
            </div>
          }
        />
      </div>

      {summaryQ.isLoading && (
        <div style={{ padding: 48, color: 'var(--muted)', textAlign: 'center' }}>Carregando…</div>
      )}
      {summaryQ.isError && (
        <div className="surface" style={{ margin: 32, padding: 24, color: 'var(--loss)' }}>
          Erro: {String(summaryQ.error)}
        </div>
      )}
      {summaryQ.data && betsQ.data && (
        <BankrollBody summary={summaryQ.data} bets={betsQ.data} />
      )}
    </div>
  );
}

function BankrollBody({ summary, bets }: Readonly<{ summary: BankrollSummary; bets: Bet[] }>) {
  const series = buildSeries(summary.bankroll_initial, bets);
  const w = 760;
  const h = 220;
  const min = Math.min(...series.map((p) => p.value));
  const max = Math.max(...series.map((p) => p.value));
  const range = max - min || 1;
  const pts =
    series.length > 1
      ? series
          .map((p, i) => `${(i / (series.length - 1)) * w},${h - ((p.value - min) / range) * h * 0.92 - 8}`)
          .join(' ')
      : `0,${h / 2} ${w},${h / 2}`;
  const areaPts = `0,${h} ${pts} ${w},${h}`;
  const baselineY = h - ((summary.bankroll_initial - min) / range) * h * 0.92 - 8;

  // Aggregate ROI tables from bets.
  const byKey = (key: keyof Bet) => {
    const map = new Map<string, { count: number; w: number; l: number; roi: number; staked: number; payout: number }>();
    for (const b of bets) {
      if (!b.result) continue;
      const k = String(b[key] ?? '—');
      const e = map.get(k) ?? { count: 0, w: 0, l: 0, roi: 0, staked: 0, payout: 0 };
      e.count += 1;
      if (b.result === 'win') e.w += 1;
      else if (b.result === 'loss') e.l += 1;
      e.staked += Number(b.stake) || 0;
      e.payout += Number(b.payout) || 0;
      e.roi = e.staked > 0 ? e.payout / e.staked : 0;
      map.set(k, e);
    }
    return Array.from(map.entries())
      .map(([k, v]) => ({ key: k, ...v }))
      .sort((a, b) => b.staked - a.staked);
  };

  const byLeague = byKey('league');
  const byMarket = byKey('market');
  const byBookmaker = byKey('bookmaker');

  const winRate = summary.settled > 0 ? summary.wins / summary.settled : 0;
  const profit = summary.bankroll_current - summary.bankroll_initial;
  const profitPct = summary.bankroll_initial > 0 ? profit / summary.bankroll_initial : 0;

  return (
    <>
      <div style={{ padding: '0 32px 16px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, maxWidth: 1280, margin: '0 auto' }}>
        <div className="surface" style={{ padding: 20 }}>
          <Stat
            label="Bankroll atual"
            value={BRL(summary.bankroll_current)}
            sub={`${profit >= 0 ? '+' : ''}${PCT(profitPct)} desde início`}
            color={profit >= 0 ? 'var(--edge)' : 'var(--loss)'}
          />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat
            label="ROI"
            value={PCT(summary.roi)}
            sub={`${BRL(summary.total_payout)} de lucro`}
            color={summary.roi > 0 ? 'var(--win)' : 'var(--loss)'}
          />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat
            label="Apostas registradas"
            value={String(summary.total_bets)}
            sub={`${summary.wins} W · ${summary.losses} L · ${summary.pushes} push · ${summary.open} em aberto`}
          />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat
            label="Win rate"
            value={summary.settled > 0 ? PCT(winRate) : '—'}
            sub={`${summary.settled} settled`}
          />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat
            label="Stake média"
            value={summary.settled > 0 ? BRL(summary.total_staked / summary.settled) : '—'}
            sub={`${BRL(summary.total_staked)} em stakes`}
          />
        </div>
      </div>

      <div style={{ padding: '0 32px 32px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, maxWidth: 1280, margin: '0 auto' }}>
        <div className="surface" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div className="t-eyebrow">Evolução</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginTop: 6 }}>
                <span className="t-num" style={{ fontSize: 28, fontWeight: 500 }}>
                  {BRL(summary.bankroll_current)}
                </span>
                <span style={{ color: profit >= 0 ? 'var(--edge)' : 'var(--loss)', fontFamily: 'var(--mono)', fontSize: 13 }}>
                  {profit >= 0 ? '+' : ''}
                  {BRL(profit)} · {profit >= 0 ? '+' : ''}
                  {PCT(profitPct)}
                </span>
              </div>
            </div>
          </div>
          <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <line key={v} x1="0" x2={w} y1={h * v} y2={h * v} stroke="var(--line)" strokeDasharray="3 5" />
            ))}
            <polygon points={areaPts} fill="oklch(0.88 0.17 125 / 0.12)" />
            <polyline points={pts} fill="none" stroke="oklch(0.88 0.17 125)" strokeWidth="2" />
            <line x1="0" y1={baselineY} x2={w} y2={baselineY} stroke="var(--line-2)" strokeDasharray="2 4" />
            <text
              x={w - 2}
              y={baselineY - 4}
              textAnchor="end"
              fontFamily="var(--mono)"
              fontSize="10"
              fill="var(--muted)"
            >
              inicial · {BRL(summary.bankroll_initial)}
            </text>
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
            <span>{series[0]?.date}</span>
            <span>{series.at(-1)?.date}</span>
          </div>
        </div>

        <div className="surface" style={{ padding: 24 }}>
          <div className="t-eyebrow" style={{ marginBottom: 12 }}>Apostas em aberto</div>
          {bets.filter((b) => !b.result).length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 12, padding: '12px 0' }}>
              Nenhuma aposta em aberto.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bets
                .filter((b) => !b.result)
                .slice(0, 6)
                .map((b) => (
                  <div
                    key={b.id}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--bg-2)',
                      borderRadius: 8,
                      border: '1px solid var(--line)',
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>
                        {b.home_team} · {b.away_team}
                      </span>
                      <span className="tag" style={{ fontSize: 10 }}>{b.market}</span>
                    </div>
                    <div style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11 }}>
                      {b.bookmaker ?? '—'} @ {Number(b.odd).toFixed(2)} · stake {BRL(Number(b.stake))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '0 32px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, maxWidth: 1280, margin: '0 auto' }}>
        <RoiTable title="ROI por liga" rows={byLeague} />
        <RoiTable title="ROI por mercado" rows={byMarket} />
        <RoiTable title="ROI por bookmaker" rows={byBookmaker} />
      </div>
    </>
  );
}

function RoiTable({
  title,
  rows,
}: Readonly<{
  title: string;
  rows: Array<{ key: string; count: number; w: number; l: number; roi: number; staked: number }>;
}>) {
  return (
    <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', fontSize: 13, fontWeight: 500 }}>
        {title}
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: 24, color: 'var(--muted)', fontSize: 12 }}>Sem dados settled.</div>
      ) : (
        rows.map((r, i) => {
          let cls: 'win' | 'loss' | 'mute' = 'mute';
          if (r.roi > 0) cls = 'win';
          else if (r.roi < 0) cls = 'loss';
          const color: Record<typeof cls, string> = {
            win: 'var(--edge)',
            loss: 'var(--loss)',
            mute: 'var(--muted)',
          };
          return (
            <div
              key={r.key}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 36px 36px 36px 70px',
                gap: 12,
                padding: '10px 16px',
                borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                alignItems: 'center',
                fontSize: 12,
              }}
            >
              <span style={{ textTransform: 'capitalize' }}>{r.key}</span>
              <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', color: 'var(--muted)' }}>{r.count}</span>
              <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', color: 'var(--win)' }}>{r.w}W</span>
              <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', color: 'var(--loss)' }}>{r.l}L</span>
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  textAlign: 'right',
                  fontWeight: 500,
                  color: color[cls],
                }}
              >
                {(r.roi * 100).toFixed(1)}%
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
