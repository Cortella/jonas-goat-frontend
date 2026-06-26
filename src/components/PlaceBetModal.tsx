import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

const todayIso = () => new Date().toISOString().slice(0, 10);

// Mercados mais comuns; "Outro" libera a digitação para mercados que não
// aparecem nas previsões (escanteios, handicaps, jogador, etc.).
const COMMON_MARKETS = [
  'Casa (1)', 'Empate (X)', 'Fora (2)',
  'Dupla chance 1X', 'Dupla chance X2', 'Dupla chance 12',
  'Over 2.5', 'Under 2.5', 'Ambas marcam: Sim', 'Ambas marcam: Não',
];
const OTHER_MARKET = '__other__';

interface GamePrefill {
  matchId?: number | null;
  home?: string | null;
  away?: string | null;
  league?: string | null;
}

/**
 * Modal de registrar aposta reutilizável. Sem `game`, mostra um seletor de jogo
 * (carteira de apostas). Com `game`, vem prefixado pelo jogo (ex.: a partir da
 * página da partida). O usuário escolhe a carteira, informa a odd e o valor.
 */
export function PlaceBetModal({
  game,
  onClose,
  onSaved,
}: Readonly<{ game?: GamePrefill; onClose: () => void; onSaved?: () => void }>) {
  const walletsQ = useQuery({ queryKey: ['bankroll-wallets'], queryFn: () => api.listWallets() });
  const wallets = walletsQ.data ?? [];

  const fixedGame = !!(game && (game.home || game.away || game.matchId));
  const [walletId, setWalletId] = useState<number | 0>(0);
  const effectiveWallet = walletId || wallets[0]?.id || 0;

  const [date, setDate] = useState(todayIso());
  const matchesQ = useQuery({
    queryKey: ['bet-matches', date],
    queryFn: () => api.predictions({ date }),
    enabled: !fixedGame,
  });
  const matches = matchesQ.data?.predictions ?? [];

  const [pick, setPick] = useState(fixedGame ? 'fixed' : '');
  const [home, setHome] = useState(game?.home ?? '');
  const [away, setAway] = useState(game?.away ?? '');
  const [league, setLeague] = useState(game?.league ?? '');
  const [marketSel, setMarketSel] = useState(COMMON_MARKETS[0]);
  const [marketCustom, setMarketCustom] = useState('');
  const market = marketSel === OTHER_MARKET ? marketCustom : marketSel;
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
    mutationFn: () => api.createBet({
      wallet_id: effectiveWallet,
      match_id: fixedGame ? (game?.matchId ?? null) : (manual || !pick ? null : Number(pick)),
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
    onSuccess: () => onSaved?.(),
  });

  const hasGame = fixedGame || (manual ? !!(home.trim() && away.trim()) : !!pick);
  const valid = !!effectiveWallet && !!market.trim() && Number(odd) > 1 && Number(stake) > 0 && hasGame;

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} className="surface" style={panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Registrar aposta</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Fechar">×</button>
        </div>

        {fixedGame && (
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
            {home || '—'} <span style={{ color: 'var(--muted)' }}>×</span> {away || '—'}
            {league ? <span style={{ color: 'var(--muted)', fontSize: 12 }}> · {league}</span> : null}
          </div>
        )}

        <Field label="Carteira">
          <select className="input" value={effectiveWallet} onChange={(e) => setWalletId(Number(e.target.value))}>
            {wallets.length === 0 && <option value={0}>Carregando…</option>}
            {wallets.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
          </select>
        </Field>

        {!fixedGame && (
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
        )}
        {manual && !fixedGame && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Field label="Mandante"><input className="input" value={home} onChange={(e) => setHome(e.target.value)} /></Field>
            <Field label="Visitante"><input className="input" value={away} onChange={(e) => setAway(e.target.value)} /></Field>
            <Field label="Liga"><input className="input" value={league} onChange={(e) => setLeague(e.target.value)} placeholder="opcional" /></Field>
          </div>
        )}

        <Field label="Mercado">
          <select className="input" value={marketSel} onChange={(e) => setMarketSel(e.target.value)}>
            {COMMON_MARKETS.map((m) => (<option key={m} value={m}>{m}</option>))}
            <option value={OTHER_MARKET}>Outro mercado (digitar)…</option>
          </select>
          {marketSel === OTHER_MARKET && (
            <input className="input" style={{ marginTop: 8 }} value={marketCustom} onChange={(e) => setMarketCustom(e.target.value)} placeholder="Ex.: Escanteios +9.5, Handicap −1, Jogador marca…" />
          )}
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="Casa / bookmaker"><input className="input" value={bookmaker} onChange={(e) => setBookmaker(e.target.value)} placeholder="opcional" /></Field>
          <Field label="Odd da casa"><input className="input" type="number" step="0.01" value={odd} onChange={(e) => setOdd(e.target.value)} placeholder="1.95" /></Field>
        </div>
        <Field label="Stake (valor apostado)"><input className="input" type="number" step="0.01" value={stake} onChange={(e) => setStake(e.target.value)} placeholder="50" /></Field>
        <Field label="Notas"><input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="opcional" /></Field>

        {create.isError && <div style={{ fontSize: 12, color: 'var(--loss)', marginTop: 8 }}>{String(create.error)}</div>}
        {create.isSuccess && <div style={{ fontSize: 12, color: 'var(--win)', marginTop: 8 }}>Aposta registrada! 🎯</div>}
        <button className="btn btn-edge" style={{ width: '100%', marginTop: 16, fontWeight: 700 }} disabled={!valid || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? 'Salvando…' : 'Registrar aposta'}
        </button>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.5)', zIndex: 200,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
};
const panel: React.CSSProperties = { width: '100%', maxWidth: 460, padding: 24, maxHeight: '90vh', overflow: 'auto' };

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <span className="t-eyebrow" style={{ display: 'block', marginBottom: 4 }}>{label}</span>
      {children}
    </label>
  );
}
