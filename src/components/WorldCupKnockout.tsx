import { useEffect, useMemo, useRef, useState } from 'react';
import type { WCKnockoutRound, WCMatch } from '../lib/api';

/**
 * Chaveamento do mata-mata da Copa no formato clássico da FIFA: os dois lados
 * da chave convergem para a FINAL no centro — metade esquerda flui → e a
 * metade direita flui ← (conectores espelhados). Card por confronto com
 * escudos, placar (ao vivo em destaque), vencedor em negrito e perdedor
 * esmaecido. Clicar em um card abre o modal de análise do jogo.
 *
 * A API devolve os jogos agrupados por rodada (`round` cru da API-Football);
 * aqui normalizamos rótulo/ordem das fases e reordenamos cada rodada para que
 * os dois confrontos que alimentam um jogo da fase seguinte fiquem adjacentes
 * (senão as linhas do chaveamento ligariam confrontos errados). A divisão em
 * lados sai dessa mesma ordenação: primeira metade de cada rodada → lado
 * esquerdo, segunda metade → lado direito.
 */

// ─── Fases ──────────────────────────────────────────────────────────────────

interface RoundDef {
  test: RegExp;
  label: string;
  order: number;
  aside?: boolean; // fora da árvore (3º lugar)
}

const ROUND_DEFS: RoundDef[] = [
  { test: /round of 32|1\/16|32/i, label: '16 avos de final', order: 0 },
  { test: /round of 16|1\/8|8th/i, label: 'Oitavas de final', order: 1 },
  { test: /quarter|1\/4/i, label: 'Quartas de final', order: 2 },
  { test: /semi|1\/2/i, label: 'Semifinais', order: 3 },
  { test: /third|3rd|bronze/i, label: 'Disputa do 3º lugar', order: 4, aside: true },
  { test: /final/i, label: 'Final', order: 5 },
];

function defFor(round: string): RoundDef {
  return (
    ROUND_DEFS.find((d) => d.test.test(round)) ?? { test: /$^/, label: round, order: 9 }
  );
}

/** Nome da fase em português (ex.: "Round of 16" → "Oitavas de final");
 *  rodadas de grupo e valores desconhecidos voltam como estão. */
export function roundLabel(round: string): string {
  if (/group/i.test(round)) return round;
  return defFor(round).label;
}

// ─── Montagem da árvore ─────────────────────────────────────────────────────

interface BracketRoundData {
  key: string;
  label: string;
  order: number;
  matches: WCMatch[];
}

function teamAdvancedTo(m: WCMatch, next: WCMatch): boolean {
  const ids = [next.home.id, next.away.id].filter((id) => id > 0);
  return ids.includes(m.home.id) || ids.includes(m.away.id);
}

/** Reordena uma rodada para que os alimentadores de cada jogo da rodada
 *  seguinte fiquem em posições adjacentes (2k, 2k+1). Confrontos ainda sem
 *  seleção definida ficam na ordem cronológica, preenchendo as vagas. */
function orderFeeders(cur: WCMatch[], next: WCMatch[]): WCMatch[] {
  if (next.length === 0) return cur;
  const used = new Set<number>();
  const buckets = next.map((nm) => {
    const feeders = cur.filter((m) => !used.has(m.id) && teamAdvancedTo(m, nm)).slice(0, 2);
    feeders.forEach((f) => used.add(f.id));
    return feeders;
  });
  const leftovers = cur.filter((m) => !used.has(m.id));
  const out: WCMatch[] = [];
  for (const b of buckets) {
    while (b.length < 2 && leftovers.length > 0) b.push(leftovers.shift()!);
    out.push(...b);
  }
  out.push(...leftovers);
  return out;
}

/** Estrutura fixa da árvore da Copa 2026 (fora a disputa de 3º lugar). */
const EXPECTED_SIZE: Record<number, number> = { 0: 16, 1: 8, 2: 4, 3: 2, 5: 1 };
const ORDER_LABEL: Record<number, string> = {
  0: '16 avos de final',
  1: 'Oitavas de final',
  2: 'Quartas de final',
  3: 'Semifinais',
  5: 'Final',
};

/** Confronto ainda sem fixture na API — vira um card "A definir" na árvore. */
function placeholderMatch(order: number, i: number): WCMatch {
  return {
    id: -(order * 100 + i + 1),
    date: '',
    timestamp: 0,
    round: '',
    group: null,
    status: { short: 'TBD', long: 'A definir', elapsed: null, phase: 'upcoming' },
    home: { id: 0, name: '', logo: '', goals: null },
    away: { id: 0, name: '', logo: '', goals: null },
    penalties: null,
    venue: { name: null, city: null },
  };
}

type WinnerSide = 'home' | 'away';

/** Quem avançou em cada jogo encerrado: pelo placar; empate → pênaltis; sem
 *  placar de pênaltis (jogos antigos) → inferido pela presença da seleção na
 *  fase seguinte. */
function computeWinners(tree: BracketRoundData[], thirdPlace: WCMatch | null): Map<number, WinnerSide> {
  const winners = new Map<number, WinnerSide>();
  const decide = (m: WCMatch): WinnerSide | null => {
    if (m.id <= 0 || m.status.phase !== 'finished') return null;
    const hg = m.home.goals;
    const ag = m.away.goals;
    if (hg != null && ag != null && hg !== ag) return hg > ag ? 'home' : 'away';
    const p = m.penalties;
    if (p && p.home !== p.away) return p.home > p.away ? 'home' : 'away';
    return null;
  };
  tree.forEach((r, i) => {
    const next = tree[i + 1];
    const nextIds = next
      ? new Set(next.matches.flatMap((n) => [n.home.id, n.away.id]).filter((id) => id > 0))
      : null;
    for (const m of r.matches) {
      let w = decide(m);
      if (!w && nextIds && m.id > 0 && m.status.phase === 'finished') {
        if (nextIds.has(m.home.id) && !nextIds.has(m.away.id)) w = 'home';
        else if (nextIds.has(m.away.id) && !nextIds.has(m.home.id)) w = 'away';
      }
      if (w) winners.set(m.id, w);
    }
  });
  if (thirdPlace) {
    const w = decide(thirdPlace);
    if (w) winners.set(thirdPlace.id, w);
  }
  return winners;
}

function buildBracket(rounds: WCKnockoutRound[]): {
  tree: BracketRoundData[];
  thirdPlace: WCMatch | null;
  winners: Map<number, WinnerSide>;
} {
  let thirdPlace: WCMatch | null = null;
  const real = new Map<number, WCMatch[]>();

  for (const r of rounds) {
    const def = defFor(r.round);
    const matches = [...r.matches].sort((a, b) => a.timestamp - b.timestamp);
    if (def.aside) {
      thirdPlace = matches[0] ?? thirdPlace;
      continue;
    }
    if (!(def.order in EXPECTED_SIZE)) continue; // rodada fora da árvore padrão
    real.set(def.order, [...(real.get(def.order) ?? []), ...matches]);
  }
  if (real.size === 0) return { tree: [], thirdPlace, winners: new Map() };

  // Árvore SEMPRE completa até a final (estilo FIFA): fases que a API ainda
  // não criou entram como cards "A definir", nas quantidades oficiais.
  const minOrder = Math.min(...real.keys());
  const tree: BracketRoundData[] = [];
  for (const order of [0, 1, 2, 3, 5]) {
    if (order < minOrder) continue;
    const size = EXPECTED_SIZE[order];
    const matches = (real.get(order) ?? []).slice(0, size);
    while (matches.length < size) matches.push(placeholderMatch(order, matches.length));
    tree.push({ key: ORDER_LABEL[order], label: ORDER_LABEL[order], order, matches });
  }
  thirdPlace ??= placeholderMatch(4, 0);

  for (let i = tree.length - 2; i >= 0; i--) {
    tree[i].matches = orderFeeders(tree[i].matches, tree[i + 1].matches);
  }
  return { tree, thirdPlace, winners: computeWinners(tree, thirdPlace) };
}

// ─── Componentes ────────────────────────────────────────────────────────────

interface BracketColumn {
  key: string;
  label: string;
  matches: WCMatch[];
  dir: 'ltr' | 'rtl';
  /** recebe conector vindo da rodada anterior (lado de fora da chave) */
  hasPrev: boolean;
}

/** Divide cada rodada (já ordenada pelos alimentadores) em lado esquerdo e
 *  direito da chave, no formato FIFA: a final fica no centro e as metades
 *  convergem para ela. */
function splitSides(tree: BracketRoundData[]): {
  left: BracketColumn[];
  right: BracketColumn[];
  final: BracketRoundData | null;
} {
  if (tree.length === 0) return { left: [], right: [], final: null };
  const final = tree[tree.length - 1];
  const side = tree.slice(0, -1);
  const left: BracketColumn[] = [];
  const right: BracketColumn[] = [];
  side.forEach((r, i) => {
    const half = Math.ceil(r.matches.length / 2);
    const l = r.matches.slice(0, half);
    const rr = r.matches.slice(half);
    if (l.length > 0) left.push({ key: `${r.key}-L`, label: r.label, matches: l, dir: 'ltr', hasPrev: i > 0 });
    if (rr.length > 0) right.unshift({ key: `${r.key}-R`, label: r.label, matches: rr, dir: 'rtl', hasPrev: i > 0 });
  });
  return { left, right, final };
}

export function KnockoutBracket({
  rounds,
  onOpen,
}: Readonly<{ rounds: WCKnockoutRound[]; onOpen: (id: number) => void }>) {
  const { tree, thirdPlace, winners } = useMemo(() => buildBracket(rounds), [rounds]);
  const { left, right, final } = useMemo(() => splitSides(tree), [tree]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Abre com a FINAL centralizada (a chave inteira não cabe na viewport).
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [left.length, right.length]);

  if (tree.length === 0 || !final) {
    return (
      <div className="surface" style={{ padding: 56, textAlign: 'center' }}>
        <p style={{ fontSize: 36, margin: 0, opacity: 0.4 }} aria-hidden>🏆</p>
        <p style={{ fontWeight: 600, margin: '12px 0 4px' }}>Mata-mata ainda não definido</p>
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
          O chaveamento aparece aqui assim que os confrontos da fase eliminatória forem confirmados.
        </p>
      </div>
    );
  }

  const hasSides = left.length > 0 || right.length > 0;

  return (
    <div className="kb-scroll" ref={scrollRef}>
      <div className="kb">
        {left.map((c) => (
          <BracketSideColumn key={c.key} col={c} winners={winners} onOpen={onOpen} />
        ))}
        <FinalColumn data={final} thirdPlace={thirdPlace} hasSides={hasSides} winners={winners} onOpen={onOpen} />
        {right.map((c) => (
          <BracketSideColumn key={c.key} col={c} winners={winners} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

function BracketSideColumn({
  col,
  winners,
  onOpen,
}: Readonly<{ col: BracketColumn; winners: Map<number, WinnerSide>; onOpen: (id: number) => void }>) {
  const pairs: WCMatch[][] = [];
  for (let i = 0; i < col.matches.length; i += 2) pairs.push(col.matches.slice(i, i + 2));

  return (
    <div className={`kb-round${col.dir === 'rtl' ? ' kb-round--rtl' : ''}`}>
      <div className="kb-round-head">
        <div className="kb-round-title">{col.label}</div>
        <div className="kb-round-sub">{roundSub(col.matches)}</div>
      </div>
      <div className="kb-col">
        {pairs.map((pair) => (
          <div
            key={pair[0].id}
            className={`kb-pair${pair.length === 2 ? ' kb-pair--join' : ''}`}
          >
            {pair.map((m) => (
              <div key={m.id} className={`kb-slot kb-slot--out${col.hasPrev ? ' kb-slot--in' : ''}`}>
                <BracketCard match={m} winner={winners.get(m.id) ?? null} onOpen={onOpen} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function FinalColumn({
  data,
  thirdPlace,
  hasSides,
  winners,
  onOpen,
}: Readonly<{
  data: BracketRoundData;
  thirdPlace: WCMatch | null;
  hasSides: boolean;
  winners: Map<number, WinnerSide>;
  onOpen: (id: number) => void;
}>) {
  const final = data.matches[0] ?? null;
  return (
    <div className="kb-round kb-round--final">
      <div className="kb-round-head">
        <div className="kb-final-trophy" aria-hidden>🏆</div>
        <div className="kb-round-title kb-round-title--final">{data.label}</div>
        <div className="kb-round-sub">{final ? roundSub([final]) : ''}</div>
      </div>
      <div className="kb-col">
        <div className="kb-pair">
          <div className={`kb-slot${hasSides ? ' kb-slot--in kb-slot--in-r' : ''}`}>
            {final && (
              <BracketCard match={final} winner={winners.get(final.id) ?? null} isFinal onOpen={onOpen} />
            )}
            {/* Absoluto para não deslocar a final do centro do slot — os
                conectores das semis apontam para o meio exato do card. */}
            {thirdPlace && (
              <div style={{ position: 'absolute', top: 'calc(50% + 78px)', left: 0, right: 0 }}>
                <div className="t-eyebrow" style={{ marginBottom: 8, textAlign: 'center' }}>
                  Disputa do 3º lugar
                </div>
                <BracketCard match={thirdPlace} winner={winners.get(thirdPlace.id) ?? null} onOpen={onOpen} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function roundSub(matches: WCMatch[]): string {
  const real = matches.filter((m) => m.id > 0);
  if (real.length === 0) return 'A definir';
  const n = matches.length;
  const dates = real.map((m) => m.date).filter(Boolean).sort();
  const games = `${n} ${n === 1 ? 'jogo' : 'jogos'}`;
  if (dates.length === 0) return games;
  const first = formatDay(dates[0]);
  const last = formatDay(dates[dates.length - 1]);
  return `${games} · ${first === last ? first : `${first} – ${last}`}`;
}

function BracketCard({
  match,
  winner: winnerProp,
  isFinal,
  onOpen,
}: Readonly<{
  match: WCMatch;
  winner?: WinnerSide | null;
  isFinal?: boolean;
  onOpen: (id: number) => void;
}>) {
  const ghost = match.id <= 0; // confronto ainda não definido (placeholder)
  const live = match.status.phase === 'live';
  const finished = match.status.phase === 'finished';
  const winner = winnerProp ?? winnerSide(match);
  const extra =
    match.status.short === 'PEN' ? 'Pênaltis' : match.status.short === 'AET' ? 'Prorrogação' : null;

  let cls = 'kb-card';
  if (live) cls += ' kb-card--live';
  if (isFinal) cls += ' kb-card--final';
  if (ghost) cls += ' kb-card--ghost';

  return (
    <button
      type="button"
      className={cls}
      disabled={ghost}
      onClick={ghost ? undefined : () => onOpen(match.id)}
    >
      <div className="kb-meta">
        {live ? (
          <span style={{ color: 'var(--loss)', fontWeight: 600 }}>
            ● AO VIVO{match.status.elapsed != null ? ` ${match.status.elapsed}'` : ''}
          </span>
        ) : finished ? (
          <span>Encerrado{extra ? ` · ${extra}` : ''}</span>
        ) : (
          <span>{formatKickoff(match.date)}</span>
        )}
        {match.venue.city && !finished && (
          <span className="kb-meta-city">{match.venue.city}</span>
        )}
      </div>
      <TeamLine
        team={match.home}
        pen={match.penalties?.home ?? null}
        winner={winner === 'home'}
        loser={winner === 'away'}
        live={live}
        big={isFinal}
      />
      <TeamLine
        team={match.away}
        pen={match.penalties?.away ?? null}
        winner={winner === 'away'}
        loser={winner === 'home'}
        live={live}
        big={isFinal}
        last
      />
    </button>
  );
}

function TeamLine({
  team,
  pen,
  winner,
  loser,
  live,
  big,
  last,
}: Readonly<{
  team: WCMatch['home'];
  pen: number | null;
  winner: boolean;
  loser: boolean;
  live: boolean;
  big?: boolean;
  last?: boolean;
}>) {
  const tbd = !team.name || team.id <= 0;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: last ? `${big ? 6 : 4}px 12px ${big ? 12 : 10}px` : `${big ? 6 : 4}px 12px`,
        opacity: loser ? 0.45 : 1,
      }}
    >
      {tbd ? (
        <span className="kb-tbd-crest" aria-hidden />
      ) : (
        <TeamLogo name={team.name} logo={team.logo} size={big ? 22 : 18} />
      )}
      <span
        style={{
          flex: 1,
          minWidth: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: big ? 13.5 : 12.5,
          fontWeight: winner ? 650 : 400,
          fontStyle: tbd ? 'italic' : undefined,
          color: tbd ? 'var(--muted)' : undefined,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {tbd ? 'A definir' : team.name}
        </span>
        {winner && (
          <span aria-label="classificado" style={{ color: 'var(--edge)', fontSize: 10, flexShrink: 0 }}>✓</span>
        )}
      </span>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: big ? 15 : 13,
          fontWeight: winner ? 700 : 500,
          fontVariantNumeric: 'tabular-nums',
          color: live ? 'var(--loss)' : team.goals == null ? 'var(--faint)' : undefined,
          flexShrink: 0,
          minWidth: 14,
          textAlign: 'right',
        }}
      >
        {/* Decisão nos pênaltis: "(3) 1", como a FIFA exibe */}
        {pen != null && (
          <span style={{ fontSize: big ? 12 : 10.5, color: 'var(--muted)', fontWeight: 500, marginRight: 4 }}>
            ({pen})
          </span>
        )}
        {team.goals ?? (tbd ? '' : '–')}
      </span>
    </div>
  );
}

/** Vencedor pelo placar; empate encerrado (decisão nos pênaltis) fica neutro,
 *  porque o placar da disputa de pênaltis não vem no payload da lista. */
function winnerSide(m: WCMatch): 'home' | 'away' | null {
  if (m.status.phase !== 'finished') return null;
  const h = m.home.goals;
  const a = m.away.goals;
  if (h == null || a == null || h === a) return null;
  return h > a ? 'home' : 'away';
}

// ─── Utilitários compartilhados da Copa ────────────────────────────────────

/** Logo da seleção via CDN da API-Football; cai para iniciais se falhar. */
export function TeamLogo({ name, logo, size = 22 }: Readonly<{ name: string; logo: string; size?: number }>) {
  const [broken, setBroken] = useState(false);
  if (broken || !logo) {
    const initials = (name || 'XX').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    return (
      <span
        className="crest"
        style={{ width: size, height: size, fontSize: size * 0.38, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, background: 'var(--surface-2)' }}
      >
        {initials}
      </span>
    );
  }
  return (
    <img
      src={logo}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setBroken(true)}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
    />
  );
}

export function formatKickoff(iso: string): string {
  if (!iso) return 'A definir';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatDay(iso: string): string {
  try {
    return new Date(iso)
      .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      .replace(/ de /g, ' ')
      .replace('.', '');
  } catch {
    return iso;
  }
}
