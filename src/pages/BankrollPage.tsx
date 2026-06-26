import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppBar } from '../components/AppBar';
import { SectionHeader, Stat } from '../components/atoms';
import { api, type BankrollEntry, type BankrollSummary, type BankrollWallet, type Bet } from '../lib/api';
import { money as BRL } from '../lib/money';
import { PlaceBetModal } from '../components/PlaceBetModal';
import { WalletTour } from '../components/WalletTour';

const PCT = (v: number) => `${(v * 100).toFixed(1)}%`;

interface BankrollPoint { date: string; value: number }

/** Evolução: começa em 0 e aplica, em ordem, lançamentos e apostas liquidadas. */
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
  for (const ev of evs) { acc = Math.round(ev.fn(acc) * 100) / 100; points.push({ date: ev.label, value: acc }); }
  return points;
}

export function BankrollPage() {
  const qc = useQueryClient();
  const [wallet, setWallet] = useState('all'); // 'all' = carteira principal (agregada)
  const [betOpen, setBetOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);

  const [tourOpen, setTourOpen] = useState(false);
  const prefsQ = useQuery({ queryKey: ['preferences'], queryFn: () => api.getPreferences() });
  const mark = useMutation({ mutationFn: () => api.markOnboarded(), onSuccess: () => qc.invalidateQueries({ queryKey: ['preferences'] }) });
  // Tour guiado na 1ª vez (flag onboarded).
  useEffect(() => {
    if (prefsQ.data && !prefsQ.data.onboarded) setTourOpen(true);
  }, [prefsQ.data]);
  const closeTour = () => {
    setTourOpen(false);
    if (prefsQ.data && !prefsQ.data.onboarded) mark.mutate();
  };

  const walletsQ = useQuery({ queryKey: ['bankroll-wallets'], queryFn: () => api.listWallets() });
  const summaryQ = useQuery({ queryKey: ['bankroll-summary', wallet], queryFn: () => api.bankrollSummary(wallet) });
  const betsQ = useQuery({ queryKey: ['bankroll-bets', wallet], queryFn: () => api.listBets(wallet) });
  const entriesQ = useQuery({ queryKey: ['bankroll-entries', wallet], queryFn: () => api.listBankrollEntries(wallet) });

  const wallets = walletsQ.data ?? [];
  const viewingAll = wallet === 'all';
  const defaultWalletId = viewingAll ? wallets[0]?.id : Number(wallet);

  const refresh = () => {
    for (const k of ['bankroll-wallets', 'bankroll-summary', 'bankroll-bets', 'bankroll-entries']) {
      qc.invalidateQueries({ queryKey: [k] });
    }
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <AppBar />
      <div style={{ padding: '32px 32px 8px', maxWidth: 1280, margin: '0 auto' }}>
        <SectionHeader
          eyebrow="Bankroll pessoal"
          title="Sua banca, suas apostas, sua progressão."
          sub="Crie uma carteira por site/conta e registre apostas com a odd que a casa te deu. A carteira principal soma todas."
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setTourOpen(true)}>Como funciona</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEntryOpen(true)} disabled={!defaultWalletId}>+ Lançamento</button>
              <button className="btn btn-edge btn-sm" onClick={() => setBetOpen(true)} disabled={!defaultWalletId}>+ Registrar aposta</button>
            </div>
          }
        />
      </div>

      {/* Seletor de carteiras */}
      <div style={{ padding: '0 32px 16px', maxWidth: 1280, margin: '0 auto', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <WalletChip active={viewingAll} onClick={() => setWallet('all')}>🏦 Principal</WalletChip>
        {wallets.map((w) => (
          <WalletChip key={w.id} active={wallet === String(w.id)} onClick={() => setWallet(String(w.id))}>
            {w.name} · {BRL(w.bankroll_current)}
          </WalletChip>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={() => setWalletOpen(true)}>+ Nova carteira</button>
      </div>

      {summaryQ.isLoading && <div style={{ padding: 48, color: 'var(--muted)', textAlign: 'center' }}>Carregando…</div>}
      {summaryQ.isError && (
        <div className="surface" style={{ margin: 32, padding: 24, color: 'var(--loss)' }}>Erro: {String(summaryQ.error)}</div>
      )}
      {summaryQ.data && betsQ.data && (
        <BankrollBody
          summary={summaryQ.data}
          bets={betsQ.data}
          entries={entriesQ.data ?? []}
          wallets={wallets}
          viewingAll={viewingAll}
          onChanged={refresh}
          onPickWallet={setWallet}
        />
      )}

      {betOpen && (
        <PlaceBetModal onClose={() => setBetOpen(false)} onSaved={() => { setBetOpen(false); refresh(); }} />
      )}
      {entryOpen && defaultWalletId && (
        <EntryModal wallets={wallets} defaultWalletId={defaultWalletId} onClose={() => setEntryOpen(false)} onSaved={() => { setEntryOpen(false); refresh(); }} />
      )}
      {walletOpen && <WalletModal onClose={() => setWalletOpen(false)} onSaved={() => { setWalletOpen(false); refresh(); }} />}
      {tourOpen && <WalletTour onClose={closeTour} />}
    </div>
  );
}

function WalletChip({ active, onClick, children }: Readonly<{ active: boolean; onClick: () => void; children: React.ReactNode }>) {
  return (
    <button
      onClick={onClick}
      className={active ? 'btn btn-sm' : 'btn btn-ghost btn-sm'}
      style={active ? { background: 'var(--edge-soft)', color: 'var(--edge)', borderColor: 'oklch(0.88 0.17 125 / 0.4)' } : undefined}
    >
      {children}
    </button>
  );
}

function BankrollBody({
  summary, bets, entries, wallets, viewingAll, onChanged, onPickWallet,
}: Readonly<{
  summary: BankrollSummary; bets: Bet[]; entries: BankrollEntry[]; wallets: BankrollWallet[];
  viewingAll: boolean; onChanged: () => void; onPickWallet: (w: string) => void;
}>) {
  const series = buildSeries(bets, entries);
  const w = 760;
  const h = 220;
  const min = Math.min(0, ...series.map((p) => p.value));
  const max = Math.max(...series.map((p) => p.value), 1);
  const range = max - min || 1;
  const pts = series.length > 1
    ? series.map((p, i) => `${(i / (series.length - 1)) * w},${h - ((p.value - min) / range) * h * 0.92 - 8}`).join(' ')
    : `0,${h / 2} ${w},${h / 2}`;
  const areaPts = `0,${h} ${pts} ${w},${h}`;

  const settle = useMutation({
    mutationFn: (v: { id: number; result: 'win' | 'loss' | 'push' }) => api.settleBet(v.id, { result: v.result }),
    onSuccess: onChanged,
  });
  const removeBet = useMutation({ mutationFn: (id: number) => api.deleteBet(id), onSuccess: onChanged });

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
    return Array.from(map.entries()).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.staked - a.staked);
  };

  const winRate = summary.settled > 0 ? summary.wins / summary.settled : 0;
  const profit = summary.bankroll_current - summary.bankroll_initial;
  const profitPct = summary.bankroll_initial > 0 ? profit / summary.bankroll_initial : 0;
  const openBets = bets.filter((b) => !b.result);

  return (
    <>
      <div style={{ padding: '0 32px 16px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, maxWidth: 1280, margin: '0 auto' }}>
        <div className="surface" style={{ padding: 20 }}>
          <Stat label="Bankroll atual" value={BRL(summary.bankroll_current)} sub={summary.bankroll_initial > 0 ? `${profit >= 0 ? '+' : ''}${PCT(profitPct)} desde início` : 'defina sua banca'} color={profit >= 0 ? 'var(--edge)' : 'var(--loss)'} />
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
          <div className="t-eyebrow">Evolução da banca {viewingAll ? '(todas as carteiras)' : ''}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, margin: '6px 0 16px' }}>
            <span className="t-num" style={{ fontSize: 28, fontWeight: 500 }}>{BRL(summary.bankroll_current)}</span>
            <span style={{ color: profit >= 0 ? 'var(--edge)' : 'var(--loss)', fontFamily: 'var(--mono)', fontSize: 13 }}>{profit >= 0 ? '+' : ''}{BRL(profit)}</span>
          </div>
          <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (<line key={v} x1="0" x2={w} y1={h * v} y2={h * v} stroke="var(--line)" strokeDasharray="3 5" />))}
            <polygon points={areaPts} fill="oklch(0.88 0.17 125 / 0.12)" />
            <polyline points={pts} fill="none" stroke="oklch(0.88 0.17 125)" strokeWidth="2" />
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
            <span>{series[0]?.date}</span><span>{series.at(-1)?.date}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {viewingAll && wallets.length > 0 && (
            <div className="surface" style={{ padding: 24 }}>
              <div className="t-eyebrow" style={{ marginBottom: 12 }}>Carteiras</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {wallets.map((wl) => (
                  <button key={wl.id} onClick={() => onPickWallet(String(wl.id))} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '8px 10px', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontWeight: 500 }}>{wl.name}</span>
                    <span style={{ fontFamily: 'var(--mono)' }}>{BRL(wl.bankroll_current)}{wl.open_bets ? ` · ${wl.open_bets} aberta(s)` : ''}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
                      {viewingAll && b.wallet_name ? `${b.wallet_name} · ` : ''}{b.bookmaker ?? '—'} @ {Number(b.odd).toFixed(2)} · stake {BRL(Number(b.stake))}
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
            <div className="t-eyebrow" style={{ marginBottom: 12 }}>Extrato de lançamentos</div>
            {entries.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 12, padding: '12px 0' }}>
                Nenhum lançamento. Use “+ Lançamento” para depósito, saque ou ajustar o saldo.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {entries.slice(0, 10).map((e) => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                    <span>{ENTRY_LABEL[e.kind]}{viewingAll && e.wallet_name ? ` · ${e.wallet_name}` : ''}{e.note ? ` · ${e.note}` : ''}</span>
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
  deposit: 'Depósito', withdraw: 'Saque', adjust: 'Ajuste de saldo',
};

function WalletSelect({ wallets, value, onChange }: Readonly<{ wallets: BankrollWallet[]; value: number; onChange: (id: number) => void }>) {
  return (
    <Field label="Carteira">
      <select className="input" value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {wallets.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
      </select>
    </Field>
  );
}

// ─── Modal de lançamento manual ─────────────────────────────────────────────
function EntryModal({ wallets, defaultWalletId, onClose, onSaved }: Readonly<{ wallets: BankrollWallet[]; defaultWalletId: number; onClose: () => void; onSaved: () => void }>) {
  const [walletId, setWalletId] = useState(defaultWalletId);
  const [kind, setKind] = useState<BankrollEntry['kind']>('deposit');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const create = useMutation({
    mutationFn: () => api.createBankrollEntry({ wallet_id: walletId, kind, amount: Number(amount), note: note.trim() || null }),
    onSuccess: onSaved,
  });
  const valid = Number(amount) >= (kind === 'adjust' ? 0 : 0.01);

  return (
    <Modal title="Lançamento na banca" onClose={onClose}>
      <WalletSelect wallets={wallets} value={walletId} onChange={setWalletId} />
      <Field label="Tipo">
        <select className="input" value={kind} onChange={(e) => setKind(e.target.value as BankrollEntry['kind'])}>
          <option value="deposit">Depósito (entrou caixa)</option>
          <option value="withdraw">Saque (retirou lucro)</option>
          <option value="adjust">Ajustar saldo (sincronizar)</option>
        </select>
      </Field>
      <Field label={kind === 'adjust' ? 'Novo saldo da carteira' : 'Valor'}>
        <input className="input" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={kind === 'adjust' ? 'saldo real hoje' : '100'} />
      </Field>
      <Field label="Nota"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="opcional" /></Field>
      <p style={{ fontSize: 11, color: 'var(--muted)', margin: '8px 0 0' }}>
        Use “Ajustar saldo” quando o valor real da carteira não bater com o do sistema.
      </p>

      {create.isError && <div style={{ fontSize: 12, color: 'var(--loss)', marginTop: 8 }}>{String(create.error)}</div>}
      <button className="btn btn-edge" style={{ width: '100%', marginTop: 16, fontWeight: 700 }} disabled={!valid || create.isPending} onClick={() => create.mutate()}>
        {create.isPending ? 'Salvando…' : 'Lançar'}
      </button>
    </Modal>
  );
}

// ─── Modal de nova carteira ─────────────────────────────────────────────────
function WalletModal({ onClose, onSaved }: Readonly<{ onClose: () => void; onSaved: () => void }>) {
  const [name, setName] = useState('');
  const create = useMutation({ mutationFn: () => api.createWallet(name.trim()), onSuccess: onSaved });
  return (
    <Modal title="Nova carteira" onClose={onClose}>
      <Field label="Nome da carteira">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Bet365 — conta João" />
      </Field>
      <p style={{ fontSize: 11, color: 'var(--muted)', margin: '4px 0 0' }}>
        Dica: use o nome do site/conta. Assim você distingue cada carteira no extrato da principal.
      </p>
      {create.isError && <div style={{ fontSize: 12, color: 'var(--loss)', marginTop: 8 }}>{String(create.error)}</div>}
      <button className="btn btn-edge" style={{ width: '100%', marginTop: 16, fontWeight: 700 }} disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
        {create.isPending ? 'Criando…' : 'Criar carteira'}
      </button>
    </Modal>
  );
}

function Modal({ title, onClose, children }: Readonly<{ title: string; onClose: () => void; children: React.ReactNode }>) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
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

function RoiTable({ title, rows }: Readonly<{ title: string; rows: Array<{ key: string; count: number; w: number; l: number; roi: number; staked: number }> }>) {
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
            <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '1fr 36px 36px 36px 70px', gap: 12, padding: '10px 16px', borderTop: i === 0 ? 'none' : '1px solid var(--line)', alignItems: 'center', fontSize: 12 }}>
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
