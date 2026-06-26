import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppBar } from '../components/AppBar';
import { SectionHeader, Stat } from '../components/atoms';
import { api, type BankrollEntry, type BankrollSummary, type Bet } from '../lib/api';
import { money as BRL } from '../lib/money';

const PCT = (v: number) => `${(v * 100).toFixed(1)}%`;
const todayIso = () => new Date().toISOString().slice(0, 10);

interface BankrollPoint {
  date: string;
  value: number;
}

/** Evolução da banca: começa em 0 e aplica, em ordem, os lançamentos (depósito,
 *  saque, ajuste) e os resultados das apostas liquidadas. */
function buildSeries(bets: Bet[], entries: BankrollEntry[]): BankrollPoint[] {
  type Ev = { t: string; fn: (acc: number) => number; label: string };
  const evs: Ev[] = [];
  for (const b of bets) {
    if (b.settled_at && b.payout != null) {
      evs.push({ t: b.settled_at, fn: (a) => a + (Number(b.payout) || 0), label: b.settled_at.slice(0, 10) });
    }
  }
  for (const e of entries) {
    if (e.kind === 'deposit') evs.push({ t: e.created_at, fn: (a) => a + e.amount, label: e.created_at.slice(0, 10) });
    else if (e.kind === 'withdraw') evs.push({ t: e.created_at, fn: (a) => a - e.amount, label: e.created_at.slice(0, 10) });
    else evs.push({ t: e.created_at, fn: () => e.amount, label: e.created_at.slice(0, 10) });
  }
  evs.sort((a, b) => a.t.localeCompare(b.t));
  const points: BankrollPoint[] = [{ date: 'início', value: 0 }];
  let acc = 0;
  for (const ev of evs) {
    acc = Math.round(ev.fn(acc) * 100) / 100;
    points.push({ date: ev.label, value: acc });
  }
  return points;
}

export function BankrollPage() {
  const qc = useQueryClient();
  const summaryQ = useQuery({ queryKey: ['bankroll-summary'], queryFn: () => api.bankrollSummary() });
  const betsQ = useQuery({ queryKey: ['bankroll-bets'], queryFn: () => api.listBets(200) });
  const entriesQ = useQuery({ queryKey: ['bankroll-entries'], queryFn: () => api.listBankrollEntries(200) });
  const [betOpen, setBetOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['bankroll-summary'] });
    qc.invalidateQueries({ queryKey: ['bankroll-bets'] });
    qc.invalidateQueries({ queryKey: ['bankroll-entries'] });
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <AppBar />
      <div style={{ padding: '32px 32px 16px', maxWidth: 1280, margin: '0 auto' }}>
        <SectionHeader
          eyebrow="Bankroll pessoal"
          title="Sua banca, suas apostas, sua progressão."
          sub="Registre apostas com a odd que a casa te deu, acompanhe a evolução da banca e use lançamentos para sincronizar o saldo."
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEntryOpen(true)}>+ Lançamento</button>
              <button className="btn btn-edge btn-sm" onClick={() => setBetOpen(true)}>+ Registrar aposta</button>
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
        <BankrollBody
          summary={summaryQ.data}
          bets={betsQ.data}
          entries={entriesQ.data ?? []}
          onChanged={refresh}
        />
      )}

      {betOpen && <BetModal onClose={() => setBetOpen(false)} onSaved={() => { setBetOpen(false); refresh(); }} />}
      {entryOpen && <EntryModal onClose={() => setEntryOpen(false)} onSaved={() => { setEntryOpen(false); refresh(); }} />}
    </div>
  );
}

function BankrollBody({
  summary,
  bets,
  entries,
  onChanged,
}: Readonly<{ summary: BankrollSummary; bets: Bet[]; entries: BankrollEntry[]; onChanged: () => void }>) {
  const series = buildSeries(bets, entries);
  const w = 760;
  const h = 220;
  const min = Math.min(0, ...series.map((p) => p.value));
  const max = Math.max(...series.map((p) => p.value), 1);
  const range = max - min || 1;
  const pts =
    series.length > 1
      ? series
          .map((p, i) => `${(i / (series.length - 1)) * w},${h - ((p.value - min) / range) * h * 0.92 - 8}`)
          .join(' ')
      : `0,${h / 2} ${w},${h / 2}`;
  const areaPts = `0,${h} ${pts} ${w},${h}`;

  const settle = useMutation({
    mutationFn: (v: { id: number; result: 'win' | 'loss' | 'push' }) => api.settleBet(v.id, { result: v.result }),
    onSuccess: onChanged,
  });
  const removeBet = useMutation({
    mutationFn: (id: number) => api.deleteBet(id),
    onSuccess: onChanged,
  });

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

  const winRate = summary.settled > 0 ? summary.wins / summary.settled : 0;
  const profit = summary.bankroll_current - summary.bankroll_initial;
  const profitPct = summary.bankroll_initial > 0 ? profit / summary.bankroll_initial : 0;
  const openBets = bets.filter((b) => !b.result);

  return (
    <>
      <div style={{ padding: '0 32px 16px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, maxWidth: 1280, margin: '0 auto' }}>
        <div className="surface" style={{ padding: 20 }}>
          <Stat
            label="Bankroll atual"
            value={BRL(summary.bankroll_current)}
            sub={summary.bankroll_initial > 0 ? `${profit >= 0 ? '+' : ''}${PCT(profitPct)} desde início` : 'defina sua banca'}
            color={profit >= 0 ? 'var(--edge)' : 'var(--loss)'}
          />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat label="ROI" value={summary.settled > 0 ? PCT(summary.roi) : '—'} sub={`${BRL(summary.total_payout)} de lucro`} color={summary.roi > 0 ? 'var(--win)' : 'var(--loss)'} />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat label="Apostas registradas" value={String(summary.total_bets)} sub={`${summary.wins} W · ${summary.losses} L · ${summary.pushes} push · ${summary.open} em aberto`} />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat label="Win rate" value={summary.settled > 0 ? PCT(winRate) : '—'} sub={`${summary.settled} liquidadas`} />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat label="Stake média" value={summary.settled > 0 ? BRL(summary.total_staked / summary.settled) : '—'} sub={`${BRL(summary.total_staked)} em stakes`} />
        </div>
      </div>

      <div style={{ padding: '0 32px 32px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, maxWidth: 1280, margin: '0 auto' }}>
        <div className="surface" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div className="t-eyebrow">Evolução da banca</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginTop: 6 }}>
                <span className="t-num" style={{ fontSize: 28, fontWeight: 500 }}>{BRL(summary.bankroll_current)}</span>
                <span style={{ color: profit >= 0 ? 'var(--edge)' : 'var(--loss)', fontFamily: 'var(--mono)', fontSize: 13 }}>
                  {profit >= 0 ? '+' : ''}{BRL(profit)}
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
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
            <span>{series[0]?.date}</span>
            <span>{series.at(-1)?.date}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="surface" style={{ padding: 24 }}>
            <div className="t-eyebrow" style={{ marginBottom: 12 }}>Apostas em aberto</div>
            {openBets.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 12, padding: '12px 0' }}>Nenhuma aposta em aberto.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {openBets.slice(0, 8).map((b) => (
                  <div key={b.id} style={{ padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 8, border: '1px solid var(--line)', fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>{b.home_team ?? '—'} · {b.away_team ?? '—'}</span>
                      <span className="tag" style={{ fontSize: 10 }}>{b.market}</span>
                    </div>
                    <div style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11, marginBottom: 8 }}>
                      {b.bookmaker ?? '—'} @ {Number(b.odd).toFixed(2)} · stake {BRL(Number(b.stake))}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" style={{ flex: 1, color: 'var(--win)' }} disabled={settle.isPending} onClick={() => settle.mutate({ id: b.id, result: 'win' })}>Green</button>
                      <button className="btn btn-ghost btn-sm" style={{ flex: 1, color: 'var(--loss)' }} disabled={settle.isPending} onClick={() => settle.mutate({ id: b.id, result: 'loss' })}>Red</button>
                      <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} disabled={settle.isPending} onClick={() => settle.mutate({ id: b.id, result: 'push' })}>Push</button>
                      <button className="btn btn-ghost btn-sm" title="Apagar" disabled={removeBet.isPending} onClick={() => removeBet.mutate(b.id)}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="surface" style={{ padding: 24 }}>
            <div className="t-eyebrow" style={{ marginBottom: 12 }}>Lançamentos</div>
            {entries.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 12, padding: '12px 0' }}>
                Nenhum lançamento. Use “+ Lançamento” para registrar um depósito, saque ou ajustar o saldo.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {entries.slice(0, 8).map((e) => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                    <span>{ENTRY_LABEL[e.kind]}{e.note ? ` · ${e.note}` : ''}</span>
                    <span style={{ fontFamily: 'var(--mono)', color: e.kind === 'withdraw' ? 'var(--loss)' : 'var(--text)' }}>
                      {e.kind === 'withdraw' ? '−' : e.kind === 'deposit' ? '+' : ''}{BRL(e.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 32px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, maxWidth: 1280, margin: '0 auto' }}>
        <RoiTable title="ROI por liga" rows={byKey('league')} />
        <RoiTable title="ROI por mercado" rows={byKey('market')} />
        <RoiTable title="ROI por bookmaker" rows={byKey('bookmaker')} />
      </div>
    </>
  );
}

const ENTRY_LABEL: Record<BankrollEntry['kind'], string> = {
  deposit: 'Depósito',
  withdraw: 'Saque',
  adjust: 'Ajuste de saldo',
};

// ─── Modal de registrar aposta ──────────────────────────────────────────────
function BetModal({ onClose, onSaved }: Readonly<{ onClose: () => void; onSaved: () => void }>) {
  const [date, setDate] = useState(todayIso());
  const matchesQ = useQuery({ queryKey: ['bet-matches', date], queryFn: () => api.predictions({ date }) });
  const matches = matchesQ.data?.predictions ?? [];

  const [pick, setPick] = useState(''); // '' (escolha), id, ou 'manual'
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [league, setLeague] = useState('');
  const [market, setMarket] = useState('Resultado (1X2)');
  const [bookmaker, setBookmaker] = useState('');
  const [odd, setOdd] = useState('');
  const [stake, setStake] = useState('');
  const [notes, setNotes] = useState('');
  const manual = pick === 'manual';

  function choose(v: string) {
    setPick(v);
    if (v && v !== 'manual') {
      const m = matches.find((x) => String(x.match_id) === v);
      if (m) { setHome(m.home_team); setAway(m.away_team); setLeague(m.league); }
    }
  }

  const create = useMutation({
    mutationFn: () =>
      api.createBet({
        match_id: manual || !pick ? null : Number(pick),
        league: league.trim() || null,
        home_team: home.trim() || null,
        away_team: away.trim() || null,
        market: market.trim(),
        bookmaker: bookmaker.trim() || null,
        odd: Number(odd),
        stake: Number(stake),
        expected_value: null,
        kelly_fraction: null,
        notes: notes.trim() || null,
      }),
    onSuccess: onSaved,
  });

  const hasGame = manual ? !!(home.trim() && away.trim()) : !!pick;
  const valid = !!market.trim() && Number(odd) > 1 && Number(stake) > 0 && hasGame;

  return (
    <Modal title="Registrar aposta" onClose={onClose}>
      <Field label="Jogo">
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} style={{ marginBottom: 8 }} />
        <select className="input" value={pick} onChange={(e) => choose(e.target.value)}>
          <option value="">{matchesQ.isLoading ? 'Carregando jogos…' : 'Escolha um jogo'}</option>
          {matches.map((m) => (
            <option key={m.match_id} value={String(m.match_id)}>
              {m.kickoff?.slice(11, 16) ? `${m.kickoff.slice(11, 16)} · ` : ''}{m.home_team} × {m.away_team} ({m.league})
            </option>
          ))}
          <option value="manual">Outro jogo (digitar)</option>
        </select>
      </Field>
      {manual && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="Mandante"><input className="input" value={home} onChange={(e) => setHome(e.target.value)} /></Field>
          <Field label="Visitante"><input className="input" value={away} onChange={(e) => setAway(e.target.value)} /></Field>
          <Field label="Liga"><input className="input" value={league} onChange={(e) => setLeague(e.target.value)} placeholder="opcional" /></Field>
        </div>
      )}
      <Field label="Mercado"><input className="input" value={market} onChange={(e) => setMarket(e.target.value)} placeholder="Ex.: Over 2.5, Casa, BTTS…" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Field label="Casa / bookmaker"><input className="input" value={bookmaker} onChange={(e) => setBookmaker(e.target.value)} placeholder="opcional" /></Field>
        <Field label="Odd da casa"><input className="input" type="number" step="0.01" value={odd} onChange={(e) => setOdd(e.target.value)} placeholder="1.95" /></Field>
      </div>
      <Field label="Stake (valor apostado)"><input className="input" type="number" step="0.01" value={stake} onChange={(e) => setStake(e.target.value)} placeholder="50" /></Field>
      <Field label="Notas"><input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="opcional" /></Field>

      {create.isError && <div style={{ fontSize: 12, color: 'var(--loss)', marginTop: 8 }}>{String(create.error)}</div>}
      <button className="btn btn-edge" style={{ width: '100%', marginTop: 16, fontWeight: 700 }} disabled={!valid || create.isPending} onClick={() => create.mutate()}>
        {create.isPending ? 'Salvando…' : 'Registrar aposta'}
      </button>
    </Modal>
  );
}

// ─── Modal de lançamento manual ─────────────────────────────────────────────
function EntryModal({ onClose, onSaved }: Readonly<{ onClose: () => void; onSaved: () => void }>) {
  const [kind, setKind] = useState<BankrollEntry['kind']>('deposit');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const create = useMutation({
    mutationFn: () => api.createBankrollEntry({ kind, amount: Number(amount), note: note.trim() || null }),
    onSuccess: onSaved,
  });
  const valid = Number(amount) >= (kind === 'adjust' ? 0 : 0.01);

  return (
    <Modal title="Lançamento na banca" onClose={onClose}>
      <Field label="Tipo">
        <select className="input" value={kind} onChange={(e) => setKind(e.target.value as BankrollEntry['kind'])}>
          <option value="deposit">Depósito (entrou caixa)</option>
          <option value="withdraw">Saque (retirou lucro)</option>
          <option value="adjust">Ajustar saldo (sincronizar)</option>
        </select>
      </Field>
      <Field label={kind === 'adjust' ? 'Novo saldo da banca' : 'Valor'}>
        <input className="input" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={kind === 'adjust' ? 'saldo real hoje' : '100'} />
      </Field>
      <Field label="Nota"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="opcional" /></Field>
      <p style={{ fontSize: 11, color: 'var(--muted)', margin: '8px 0 0' }}>
        Use “Ajustar saldo” quando o valor real da sua banca não bater com o do sistema — ele passa a valer o número informado.
      </p>

      {create.isError && <div style={{ fontSize: 12, color: 'var(--loss)', marginTop: 8 }}>{String(create.error)}</div>}
      <button className="btn btn-edge" style={{ width: '100%', marginTop: 16, fontWeight: 700 }} disabled={!valid || create.isPending} onClick={() => create.mutate()}>
        {create.isPending ? 'Salvando…' : 'Lançar'}
      </button>
    </Modal>
  );
}

function Modal({ title, onClose, children }: Readonly<{ title: string; onClose: () => void; children: React.ReactNode }>) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div onClick={(e) => e.stopPropagation()} className="surface" style={{ width: '100%', maxWidth: 460, padding: 24, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{title}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Fechar">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <span className="t-eyebrow" style={{ display: 'block', marginBottom: 4 }}>{label}</span>
      {children}
    </label>
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
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', fontSize: 13, fontWeight: 500 }}>{title}</div>
      {rows.length === 0 ? (
        <div style={{ padding: 24, color: 'var(--muted)', fontSize: 12 }}>Sem dados liquidados.</div>
      ) : (
        rows.map((r, i) => {
          let cls: 'win' | 'loss' | 'mute' = 'mute';
          if (r.roi > 0) cls = 'win';
          else if (r.roi < 0) cls = 'loss';
          const color: Record<typeof cls, string> = { win: 'var(--edge)', loss: 'var(--loss)', mute: 'var(--muted)' };
          return (
            <div
              key={r.key}
              style={{ display: 'grid', gridTemplateColumns: '1fr 36px 36px 36px 70px', gap: 12, padding: '10px 16px', borderTop: i === 0 ? 'none' : '1px solid var(--line)', alignItems: 'center', fontSize: 12 }}
            >
              <span style={{ textTransform: 'capitalize' }}>{r.key}</span>
              <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', color: 'var(--muted)' }}>{r.count}</span>
              <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', color: 'var(--win)' }}>{r.w}W</span>
              <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', color: 'var(--loss)' }}>{r.l}L</span>
              <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', fontWeight: 500, color: color[cls] }}>{(r.roi * 100).toFixed(1)}%</span>
            </div>
          );
        })
      )}
    </div>
  );
}
