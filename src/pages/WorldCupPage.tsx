import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AppBar } from '../components/AppBar';
import { SectionHeader, Stat } from '../components/atoms';
import { KnockoutBracket, TeamLogo, formatKickoff, roundLabel } from '../components/WorldCupKnockout';
import {
  api,
  type WCMatches,
  type WCGroup,
  type WCMatch,
  type WCStanding,
  type WCAnalysis,
  type WCCountry,
} from '../lib/api';

export function WorldCupPage() {
  const q = useQuery({
    queryKey: ['wc-matches'],
    queryFn: () => api.worldCupMatches(),
    refetchInterval: 60_000, // mantém placares ao vivo atualizados
  });
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <AppBar />
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <CountrySidebar />
        <main style={{ flex: 1, minWidth: 0, padding: '24px 28px 64px' }}>
          <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          {q.isLoading && (
            <div style={{ padding: 80, color: 'var(--muted)', textAlign: 'center' }}>
              Carregando jogos da Copa…
            </div>
          )}
          {q.isError && (
            <div className="surface" style={{ padding: 24, color: 'var(--loss)' }}>
              Erro ao carregar: {String(q.error)}
            </div>
          )}
          {q.data && !q.data.has_data && (
            <div className="surface" style={{ padding: 48, textAlign: 'center' }}>
              <p style={{ fontSize: 40, margin: 0, opacity: 0.4 }}>🏆</p>
              <p style={{ color: 'var(--muted)', marginTop: 12 }}>
                Sem jogos para a temporada {q.data.season}. Verifique o plano da API ou a variável WC_SEASON.
              </p>
            </div>
          )}
          {q.data && q.data.has_data && <WorldCupBody data={q.data} onOpen={setOpenId} />}
          </div>
        </main>
      </div>

      {openId != null && <MatchModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

// ─── Menu lateral de seleções ──────────────────────────────────────────────

function CountrySidebar() {
  const q = useQuery({ queryKey: ['wc-countries'], queryFn: () => api.worldCupCountries() });
  const countries = q.data?.countries ?? [];
  const origin = countries.filter((c) => c.is_origin);
  const rest = countries.filter((c) => !c.is_origin);

  return (
    <aside
      style={{
        width: 248,
        flexShrink: 0,
        borderRight: '1px solid var(--line)',
        background: 'var(--bg-2)',
        padding: '20px 10px 32px',
        minHeight: '100%',
      }}
    >
      <div className="t-eyebrow" style={{ padding: '0 10px 12px' }}>
        Seleções{countries.length ? ` · ${countries.length}` : ''}
      </div>

      {q.isLoading && (
        <div style={{ padding: 12, fontSize: 12, color: 'var(--muted)' }}>Carregando…</div>
      )}

      {origin.length > 0 && (
        <>
          <div style={{ padding: '4px 10px 6px', fontSize: 10, color: 'var(--edge)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Seu país
          </div>
          {origin.map((c) => (
            <CountryItem key={c.id} country={c} highlight />
          ))}
          <div style={{ height: 1, background: 'var(--line)', margin: '8px 10px' }} />
        </>
      )}

      {rest.map((c) => (
        <CountryItem key={c.id} country={c} />
      ))}
    </aside>
  );
}

function CountryItem({ country, highlight }: Readonly<{ country: WCCountry; highlight?: boolean }>) {
  const elim = country.eliminated;
  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '8px 10px',
    border: 'none',
    borderRadius: 8,
    background: highlight ? 'var(--edge-soft)' : 'transparent',
    color: 'var(--text)',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: 13,
    textDecoration: 'none',
    opacity: elim ? 0.5 : 1,
  };
  const hoverIn = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.background = highlight ? 'var(--edge-soft)' : 'var(--surface-2)';
  };
  const hoverOut = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.background = highlight ? 'var(--edge-soft)' : 'transparent';
  };
  const inner = (
    <>
      <TeamLogo name={country.name} logo={country.logo} size={20} />
      <span
        style={{
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontWeight: highlight ? 600 : 400,
          textDecoration: elim ? 'line-through' : 'none',
        }}
      >
        {country.name}
      </span>
      {elim && <EliminatedTag />}
    </>
  );

  // Com slug → link para a página da seleção; sem slug → item inerte.
  if (country.slug) {
    return (
      <Link to={`/copa-2026/selecao/${country.slug}`} title={country.name} style={style} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
        {inner}
      </Link>
    );
  }
  return (
    <span title={country.name} style={style}>
      {inner}
    </span>
  );
}

function EliminatedTag() {
  return (
    <span
      style={{
        flexShrink: 0,
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: 'var(--loss)',
        background: 'oklch(0.68 0.16 25 / 0.14)',
        border: '1px solid oklch(0.68 0.16 25 / 0.35)',
        borderRadius: 4,
        padding: '2px 5px',
      }}
    >
      Eliminado
    </span>
  );
}

function WorldCupBody({ data, onOpen }: Readonly<{ data: WCMatches; onOpen: (id: number) => void }>) {
  const groupKeys = useMemo(() => data.groups.map((g) => g.group), [data.groups]);
  const [selected, setSelected] = useState<string | null>(null);
  const visible = selected ? data.groups.filter((g) => g.group === selected) : data.groups;

  // O mata-mata vira a visão padrão assim que existem confrontos eliminatórios.
  const hasKnockout = data.knockout.some((r) => r.matches.length > 0);
  const [view, setView] = useState<'knockout' | 'groups'>(hasKnockout ? 'knockout' : 'groups');
  const knockoutLive = data.knockout.some((r) => r.matches.some((m) => m.status.phase === 'live'));

  return (
    <div>
      <SectionHeader
        eyebrow={`${data.tournament} · Temporada ${data.season}`}
        title={view === 'knockout' ? 'Mata-mata — o caminho até a taça' : 'Todos os jogos, por grupo'}
        sub={
          view === 'knockout'
            ? 'Chaveamento completo da fase eliminatória. Clique em qualquer confronto para abrir a análise do modelo.'
            : 'Classificação ao vivo e calendário completo. Clique em qualquer jogo para abrir a análise.'
        }
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, margin: '20px 0 24px' }}>
        <div className="surface" style={{ padding: 18 }}>
          <Stat label="Jogos" value={String(data.counts.total)} sub="no torneio" />
        </div>
        <div className="surface" style={{ padding: 18 }}>
          <Stat label="Ao vivo" value={String(data.counts.live)} sub="agora" color={data.counts.live > 0 ? 'var(--loss)' : undefined} />
        </div>
        <div className="surface" style={{ padding: 18 }}>
          <Stat label="Encerrados" value={String(data.counts.finished)} sub="finalizados" />
        </div>
        <div className="surface" style={{ padding: 18 }}>
          <Stat label="A jogar" value={String(data.counts.upcoming)} sub="agendados" color="var(--edge)" />
        </div>
      </div>

      {/* Alternador de visão: mata-mata × fase de grupos */}
      <div
        role="tablist"
        aria-label="Fase do torneio"
        style={{
          display: 'inline-flex', gap: 4, padding: 4, marginBottom: 20,
          background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10,
        }}
      >
        <ViewTab active={view === 'knockout'} onClick={() => setView('knockout')}>
          Mata-mata
          {knockoutLive && <span className="dot dot-pulse" style={{ background: 'var(--loss)', marginLeft: 6 }} />}
        </ViewTab>
        <ViewTab active={view === 'groups'} onClick={() => setView('groups')}>
          Fase de grupos
        </ViewTab>
      </div>

      {view === 'knockout' ? (
        <KnockoutBracket rounds={data.knockout} onOpen={onOpen} />
      ) : (
        <>
          {/* Filtro de grupos */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            <Chip active={!selected} onClick={() => setSelected(null)}>Todos</Chip>
            {groupKeys.map((g) => (
              <Chip key={g} active={selected === g} onClick={() => setSelected(g)}>
                Grupo {g}
              </Chip>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {visible.map((g) => (
              <GroupCard key={g.group} group={g} onOpen={onOpen} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ViewTab({ active, onClick, children }: Readonly<{ active: boolean; onClick: () => void; children: React.ReactNode }>) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '8px 16px', borderRadius: 7, border: '1px solid transparent',
        background: active ? 'var(--surface)' : 'transparent',
        borderColor: active ? 'var(--line-2)' : 'transparent',
        boxShadow: active ? 'var(--shadow-1)' : 'none',
        color: active ? 'var(--text)' : 'var(--muted)',
        font: `${active ? 600 : 500} 13px/1 var(--sans)`,
        cursor: 'pointer', transition: '120ms ease',
      }}
    >
      {children}
    </button>
  );
}

function GroupCard({ group, onOpen }: Readonly<{ group: WCGroup; onOpen: (id: number) => void }>) {
  return (
    <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span className="league-mono" style={{ width: 26, height: 26, fontSize: 12 }}>{group.group}</span>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Grupo {group.group}</span>
      </div>

      {/* Classificação */}
      <StandingsTable rows={group.standings} />

      {/* Jogos do grupo */}
      <div style={{ padding: '6px 0' }}>
        <div style={{ padding: '10px 18px 4px', fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Jogos
        </div>
        {group.matches.map((m) => (
          <MatchRow key={m.id} match={m} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

const STAND_GRID = '24px 1fr 34px 34px 34px 34px 44px 44px';

function StandingsTable({ rows }: Readonly<{ rows: WCStanding[] }>) {
  return (
    <div style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: STAND_GRID,
          gap: 8,
          padding: '8px 18px',
          fontSize: 10,
          color: 'var(--muted)',
          fontFamily: 'var(--mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        <span>#</span>
        <span>Seleção</span>
        <span style={{ textAlign: 'center' }}>J</span>
        <span style={{ textAlign: 'center' }}>V</span>
        <span style={{ textAlign: 'center' }}>E</span>
        <span style={{ textAlign: 'center' }}>D</span>
        <span style={{ textAlign: 'center' }}>SG</span>
        <span style={{ textAlign: 'right' }}>Pts</span>
      </div>
      {rows.map((r) => {
        const qualifies = r.rank <= 2;
        return (
          <div
            key={r.team_id}
            style={{
              display: 'grid',
              gridTemplateColumns: STAND_GRID,
              gap: 8,
              padding: '9px 18px',
              alignItems: 'center',
              fontSize: 12,
              fontVariantNumeric: 'tabular-nums',
              borderTop: '1px solid var(--line)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 4,
                  height: 16,
                  borderRadius: 2,
                  background: qualifies ? 'var(--edge)' : 'transparent',
                  display: 'inline-block',
                }}
              />
              <span style={{ color: 'var(--text-2)', fontFamily: 'var(--mono)' }}>{r.rank}</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0, opacity: r.eliminated ? 0.55 : 1 }}>
              <TeamLogo name={r.team} logo={r.logo} size={18} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: qualifies ? 600 : 400, textDecoration: r.eliminated ? 'line-through' : 'none' }}>
                {r.team}
              </span>
              {r.eliminated && <EliminatedTag />}
            </span>
            <span style={{ textAlign: 'center', color: 'var(--text-2)' }}>{r.played}</span>
            <span style={{ textAlign: 'center' }}>{r.win}</span>
            <span style={{ textAlign: 'center' }}>{r.draw}</span>
            <span style={{ textAlign: 'center' }}>{r.lose}</span>
            <span style={{ textAlign: 'center', color: r.goal_diff > 0 ? 'var(--edge)' : r.goal_diff < 0 ? 'var(--loss)' : 'var(--text-2)' }}>
              {r.goal_diff > 0 ? '+' : ''}{r.goal_diff}
            </span>
            <span style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'var(--mono)' }}>{r.points}</span>
          </div>
        );
      })}
    </div>
  );
}

function MatchRow({ match, onOpen }: Readonly<{ match: WCMatch; onOpen: (id: number) => void }>) {
  const live = match.status.phase === 'live';
  const finished = match.status.phase === 'finished';
  return (
    <button
      type="button"
      onClick={() => onOpen(match.id)}
      className="wc-match-row"
      style={{
        display: 'grid',
        gridTemplateColumns: '94px 1fr auto 1fr 16px',
        gap: 10,
        alignItems: 'center',
        width: '100%',
        padding: '10px 18px',
        background: 'transparent',
        border: 'none',
        borderTop: '1px solid var(--line)',
        cursor: 'pointer',
        textAlign: 'left',
        color: 'var(--text)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* status / hora */}
      <span style={{ fontSize: 11, fontFamily: 'var(--mono)' }}>
        {live ? (
          <span style={{ color: 'var(--loss)', fontWeight: 600 }}>
            ● AO VIVO{match.status.elapsed != null ? ` ${match.status.elapsed}'` : ''}
          </span>
        ) : finished ? (
          <span style={{ color: 'var(--muted)' }}>Encerrado</span>
        ) : (
          <span style={{ color: 'var(--text-2)' }}>{formatKickoff(match.date)}</span>
        )}
      </span>

      {/* mandante */}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', minWidth: 0 }}>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: finished && (match.home.goals ?? 0) > (match.away.goals ?? 0) ? 600 : 400 }}>
          {match.home.name}
        </span>
        <TeamLogo name={match.home.name} logo={match.home.logo} size={22} />
      </span>

      {/* placar / x */}
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontWeight: 700,
          fontSize: 14,
          minWidth: 46,
          textAlign: 'center',
          color: live ? 'var(--loss)' : 'var(--text)',
        }}
      >
        {match.home.goals != null && match.away.goals != null
          ? `${match.home.goals} : ${match.away.goals}`
          : 'x'}
      </span>

      {/* visitante */}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <TeamLogo name={match.away.name} logo={match.away.logo} size={22} />
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: finished && (match.away.goals ?? 0) > (match.home.goals ?? 0) ? 600 : 400 }}>
          {match.away.name}
        </span>
      </span>

      <span aria-hidden style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'right' }}>›</span>
    </button>
  );
}

// ─── Modal de análise ──────────────────────────────────────────────────────

function MatchModal({ id, onClose }: Readonly<{ id: number; onClose: () => void }>) {
  const q = useQuery({ queryKey: ['wc-analysis', id], queryFn: () => api.worldCupAnalysis(id) });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'oklch(0 0 0 / 0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '40px 16px', overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="surface"
        style={{ width: '100%', maxWidth: 560, padding: 0, overflow: 'hidden', position: 'relative' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 2,
            width: 30, height: 30, borderRadius: 999,
            background: 'var(--bg-2)', border: '1px solid var(--line)',
            color: 'var(--text-2)', cursor: 'pointer', fontSize: 14,
          }}
        >
          ✕
        </button>

        {q.isLoading && <div style={{ padding: 64, textAlign: 'center', color: 'var(--muted)' }}>Calculando análise…</div>}
        {q.isError && <div style={{ padding: 32, color: 'var(--loss)' }}>Erro: {String(q.error)}</div>}
        {q.data && <ModalBody a={q.data} />}
      </div>
    </div>
  );
}

function ModalBody({ a }: Readonly<{ a: WCAnalysis }>) {
  const m = a.match;
  const finished = m.status.phase === 'finished';
  return (
    <>
      {/* Cabeçalho do jogo */}
      <div style={{ padding: '22px 22px 18px', borderBottom: '1px solid var(--line)', background: 'var(--bg-2)' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
          {m.group ? `Grupo ${m.group} · ` : ''}{roundLabel(m.round)} · {m.venue.city ?? '—'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <TeamLogo name={m.home.name} logo={m.home.logo} size={44} />
            <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'center' }}>{m.home.name}</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            {finished || m.status.phase === 'live' ? (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700 }}>
                {m.home.goals ?? 0} : {m.away.goals ?? 0}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--mono)' }}>{formatKickoff(m.date)}</div>
            )}
            <div style={{ fontSize: 10, color: m.status.phase === 'live' ? 'var(--loss)' : 'var(--muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {m.status.phase === 'live' ? `Ao vivo ${m.status.elapsed ?? ''}'` : m.status.long}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <TeamLogo name={m.away.name} logo={m.away.logo} size={44} />
            <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'center' }}>{m.away.name}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: 22, position: 'relative' }}>
        {a.locked && <LockedOverlay />}
        <div
          aria-hidden={a.locked}
          style={a.locked ? { filter: 'blur(7px)', pointerEvents: 'none', userSelect: 'none' } : undefined}
        >
        {/* Probabilidades 1X2 */}
        <div className="t-eyebrow" style={{ marginBottom: 10 }}>Probabilidades (modelo)</div>
        <ProbBar3 home={a.probs.home} draw={a.probs.draw} away={a.probs.away} homeName={m.home.name} awayName={m.away.name} />

        {/* Grid de métricas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 20 }}>
          <Metric label="Placar provável" value={a.likely_score} />
          <Metric label="Gols esperados" value={`${a.expected_goals.home} – ${a.expected_goals.away}`} />
          <Metric label="Over 2.5" value={`${a.markets.over_2_5}%`} />
          <Metric label="Ambas marcam" value={`${a.markets.btts_yes}%`} />
          <Metric label={`Odd justa ${m.home.name.slice(0, 3).toUpperCase()}`} value={a.strength.home.fair_odds ?? '—'} />
          <Metric label={`Odd justa ${m.away.name.slice(0, 3).toUpperCase()}`} value={a.strength.away.fair_odds ?? '—'} />
        </div>

        {/* Outros mercados do mesmo jogo */}
        <div className="t-eyebrow" style={{ marginTop: 24, marginBottom: 10 }}>Outros mercados (mesmo jogo)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          <MarketRow label="Mais de 1.5 gols" p={a.markets.over_1_5} />
          <MarketRow label="Menos de 1.5 gols" p={a.markets.under_1_5} />
          <MarketRow label="Mais de 2.5 gols" p={a.markets.over_2_5} />
          <MarketRow label="Menos de 2.5 gols" p={a.markets.under_2_5} />
          <MarketRow label="Mais de 3.5 gols" p={a.markets.over_3_5} />
          <MarketRow label="Menos de 3.5 gols" p={a.markets.under_3_5} />
          <MarketRow label="Ambas marcam — Sim" p={a.markets.btts_yes} />
          <MarketRow label="Ambas marcam — Não" p={a.markets.btts_no} />
          <MarketRow label={`${m.home.name} ou empate`} p={a.markets.dc_1x} />
          <MarketRow label={`${m.away.name} ou empate`} p={a.markets.dc_x2} />
          <MarketRow label="Sai do empate (casa ou fora)" p={a.markets.dc_12} />
        </div>
        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
          Probabilidades do modelo + odd justa (1/prob). Se a odd da casa for maior que a justa, há valor.
        </p>

        {/* Palpite de valor */}
        <div
          style={{
            marginTop: 18, padding: '12px 14px', borderRadius: 8,
            background: 'var(--edge-soft)', border: '1px solid oklch(0.88 0.17 125 / 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}
        >
          <span style={{ fontSize: 13 }}>
            <strong style={{ color: 'var(--edge)' }}>Maior probabilidade:</strong> {a.top_pick.market}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--edge)' }}>
            {Math.round(a.top_pick.p * 100)}%
          </span>
        </div>

        {/* Narrativa */}
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginTop: 18 }}>{a.narrative}</p>

        {/* H2H */}
        {a.h2h.total > 0 && (
          <div style={{ marginTop: 18 }}>
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>
              Confrontos recentes · {a.h2h.home_wins}V {a.h2h.draws}E {a.h2h.away_wins}D
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {a.h2h.last.map((h, i) => (
                <div
                  key={`${h.date}-${i}`}
                  style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)', padding: '6px 10px', background: 'var(--bg-2)', borderRadius: 6 }}
                >
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {h.home} {h.score} {h.away}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)', flexShrink: 0, marginLeft: 8 }}>
                    {new Date(h.date).getFullYear()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 18, textAlign: 'center' }}>
          Estimativas do modelo a partir do desempenho real no torneio. Não é recomendação de aposta.
        </p>
        </div>
      </div>
    </>
  );
}

/** Overlay de paywall sobre a análise embaçada (plano grátis/anônimo). */
function LockedOverlay() {
  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 12, padding: 24, textAlign: 'center',
        background: 'linear-gradient(180deg, oklch(0.2 0.02 260 / 0.35), oklch(0.16 0.02 260 / 0.72))',
        backdropFilter: 'blur(1px)',
      }}
    >
      <div style={{ fontSize: 26 }} aria-hidden>🔒</div>
      <strong style={{ fontSize: 16 }}>Análise exclusiva do Pro</strong>
      <p style={{ fontSize: 13, color: 'var(--text-2)', maxWidth: 280, margin: 0, lineHeight: 1.5 }}>
        Probabilidades, mercados (Over/Under, ambas marcam, dupla chance) e palpites de valor são liberados no plano Pro.
      </p>
      <Link to="/precos" className="btn btn-edge btn-sm" style={{ textDecoration: 'none', marginTop: 4 }}>
        Assinar o Pro
      </Link>
    </div>
  );
}

function ProbBar3({
  home, draw, away, homeName, awayName,
}: Readonly<{ home: number; draw: number; away: number; homeName: string; awayName: string }>) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6, fontFamily: 'var(--mono)' }}>
        <span style={{ color: 'var(--edge)', fontWeight: 600 }}>{homeName} {home}%</span>
        <span style={{ color: 'var(--text-2)' }}>Empate {draw}%</span>
        <span style={{ fontWeight: 600 }}>{away}% {awayName}</span>
      </div>
      <div style={{ display: 'flex', height: 12, borderRadius: 999, overflow: 'hidden', background: 'var(--bg-2)' }}>
        <div style={{ width: `${home}%`, background: 'var(--edge)' }} />
        <div style={{ width: `${draw}%`, background: 'var(--surface-2)' }} />
        <div style={{ width: `${away}%`, background: 'oklch(0.68 0.16 25 / 0.7)' }} />
      </div>
    </div>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return (
    <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--mono)' }}>{value}</div>
    </div>
  );
}

/** Linha de mercado: rótulo + probabilidade do modelo + odd justa (1/prob).
 *  `p` é uma porcentagem (0–100), como o backend retorna. */
function MarketRow({ label, p }: Readonly<{ label: string; p: number }>) {
  const fair = p > 0 ? (100 / p).toFixed(2) : '—';
  return (
    <div
      style={{
        background: 'var(--bg-2)', borderRadius: 8, padding: '8px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontFamily: 'var(--mono)', flexShrink: 0 }}>
        <strong style={{ fontSize: 13 }}>{Math.round(p)}%</strong>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>@{fair}</span>
      </span>
    </div>
  );
}

// ─── Utilitários ────────────────────────────────────────────────────────────

function Chip({ active, onClick, children }: Readonly<{ active: boolean; onClick: () => void; children: React.ReactNode }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? 'btn btn-sm' : 'btn btn-ghost btn-sm'}
      style={active ? { background: 'var(--edge-soft)', color: 'var(--edge)', borderColor: 'oklch(0.88 0.17 125 / 0.4)' } : undefined}
    >
      {children}
    </button>
  );
}

