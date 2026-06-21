import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppBar } from '../components/AppBar';
import { Crest, SectionHeader, Stat } from '../components/atoms';
import { request } from '../lib/api';
import { bookmakerInfo, bookmakerLink } from '../lib/bookmakers';

interface ComparatorMatch {
  match_id: number;
  date: string;
  kickoff: string | null;
  league: string;
  home: string;
  away: string;
  books: Array<{ name: string; home: number | null; draw: number | null; away: number | null }>;
  best: { home: number | null; draw: number | null; away: number | null };
}

interface ComparatorResponse {
  date: string;
  league: string | null;
  market: string;
  count: number;
  matches: ComparatorMatch[];
}

const LEAGUES = ['PL', 'PD', 'BL1', 'SA', 'FL1', 'CL', 'WC'] as const;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(iso: string, delta: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function fmt(v: number | null | undefined) {
  return v == null ? '—' : Number(v).toFixed(2);
}

export function ComparatorPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const date = params.get('date') || todayIso();
  const league = params.get('league') || undefined;

  const q = useQuery({
    queryKey: ['comparator', date],
    queryFn: () => request<ComparatorResponse>(`/api/comparator?date=${date}`),
  });

  const allMatches = q.data?.matches ?? [];
  const filtered = useMemo(
    () => (league ? allMatches.filter((m) => m.league === league) : allMatches),
    [allMatches, league],
  );
  const allBooks = collectBookmakers(filtered);

  const kpis = useMemo(() => computeKpis(allMatches), [allMatches]);
  const leagueCounts = useMemo(() => countLeagues(allMatches), [allMatches]);

  const setDate = (d: string) => {
    const next = new URLSearchParams(params);
    next.set('date', d);
    setParams(next);
  };
  const setLeague = (lg: string | null) => {
    const next = new URLSearchParams(params);
    if (lg) next.set('league', lg);
    else next.delete('league');
    setParams(next);
  };

  const isToday = date === todayIso();
  const titleText =
    filtered.length > 0
      ? t('comparator.title', { count: filtered.length, books: allBooks.length })
      : t('comparator.title_zero');

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <AppBar />

      <div style={{ padding: '32px 32px 16px', maxWidth: 1280, margin: '0 auto' }}>
        <SectionHeader
          eyebrow={t('comparator.eyebrow')}
          title={titleText}
          sub={t('comparator.sub')}
          action={
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setDate(shiftDate(date, -1))}
                aria-label={t('comparator.prev_day')}
                title={t('comparator.prev_day')}
                style={{ padding: '7px 10px' }}
              >
                ‹
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setDate(todayIso())}
                disabled={isToday}
                style={{ opacity: isToday ? 0.5 : 1 }}
              >
                {t('comparator.today')}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setDate(shiftDate(date, 1))}
                aria-label={t('comparator.next_day')}
                title={t('comparator.next_day')}
                style={{ padding: '7px 10px' }}
              >
                ›
              </button>
              <input
                className="input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ width: 150, fontSize: 12, marginLeft: 4 }}
              />
            </div>
          }
        />
      </div>

      {/* KPI strip */}
      <div
        style={{
          padding: '0 32px 20px',
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        <div className="surface" style={{ padding: 20 }}>
          <Stat label={t('comparator.kpi_games')} value={String(kpis.games)} />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat label={t('comparator.kpi_books')} value={String(kpis.books)} />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat
            label={t('comparator.kpi_avg_spread')}
            value={kpis.avgSpread > 0 ? `${kpis.avgSpread.toFixed(1)}%` : '—'}
            sub={t('comparator.kpi_avg_spread_sub')}
            color={kpis.avgSpread > 0 ? 'var(--edge)' : undefined}
          />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat
            label={t('comparator.kpi_top_league')}
            value={kpis.topLeague?.code || '—'}
            sub={
              kpis.topLeague
                ? t('comparator.kpi_top_league_sub', { count: kpis.topLeague.count })
                : undefined
            }
          />
        </div>
      </div>

      {/* League filter chips */}
      <div
        style={{
          padding: '0 32px 12px',
          display: 'flex',
          gap: 6,
          alignItems: 'center',
          flexWrap: 'wrap',
          maxWidth: 1280,
          margin: '0 auto',
        }}
      >
        <LeagueChip
          active={!league}
          onClick={() => setLeague(null)}
          count={allMatches.length}
        >
          {t('comparator.all_leagues')}
        </LeagueChip>
        {LEAGUES.map((code) => {
          const count = leagueCounts.get(code) ?? 0;
          if (count === 0 && league !== code) return null;
          return (
            <LeagueChip
              key={code}
              active={league === code}
              onClick={() => setLeague(code)}
              count={count}
            >
              <span className="league-mono" style={{ width: 18, height: 18, fontSize: 9 }}>
                {code}
              </span>
              <span>{code}</span>
            </LeagueChip>
          );
        })}
      </div>

      {/* Affiliate disclosure */}
      <p
        style={{
          padding: '0 32px 16px',
          maxWidth: 1280,
          margin: '0 auto',
          fontSize: 11,
          color: 'var(--muted)',
          lineHeight: 1.5,
        }}
      >
        {t('comparator.disclosure')}{' '}
        <Link to="/transparencia#receita" style={{ color: 'var(--edge)' }}>
          {t('comparator.disclosure_link')} →
        </Link>
      </p>

      {q.isLoading && (
        <div style={{ padding: 80, color: 'var(--muted)', textAlign: 'center' }}>
          {t('comparator.loading')}
        </div>
      )}
      {q.isError && (
        <div className="surface" style={{ margin: '0 32px', padding: 24, color: 'var(--loss)', maxWidth: 1280, marginLeft: 'auto', marginRight: 'auto' }}>
          {t('comparator.error', { error: String(q.error) })}
        </div>
      )}
      {q.data && filtered.length === 0 && (
        <div style={{ padding: '0 32px 32px', maxWidth: 1280, margin: '0 auto' }}>
          <div className="surface" style={{ padding: 64, textAlign: 'center' }}>
            <p style={{ fontSize: 48, opacity: 0.4, margin: 0 }}>📊</p>
            <p style={{ color: 'var(--muted)', marginTop: 16, marginBottom: 20 }}>
              {t('comparator.empty', { date })}
            </p>
            <div style={{ display: 'inline-flex', gap: 8 }}>
              {league && (
                <button className="btn btn-ghost btn-sm" onClick={() => setLeague(null)}>
                  {t('comparator.all_leagues')}
                </button>
              )}
              <button
                className="btn btn-solid btn-sm"
                onClick={() => setDate(shiftDate(date, 1))}
              >
                {t('comparator.try_tomorrow')} ›
              </button>
            </div>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div
          className="surface"
          style={{
            margin: '0 32px 32px',
            maxWidth: 1280,
            marginLeft: 'auto',
            marginRight: 'auto',
            overflow: 'hidden',
            padding: 0,
          }}
        >
          <ComparatorHeader books={allBooks} t={t} />
          {filtered.map((m) => (
            <ComparatorRow key={m.match_id} match={m} books={allBooks} />
          ))}
        </div>
      )}
    </div>
  );
}

function LeagueChip({
  active,
  onClick,
  count,
  children,
}: Readonly<{
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}>) {
  return (
    <button
      onClick={onClick}
      className={active ? 'btn btn-sm' : 'btn btn-ghost btn-sm'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        ...(active
          ? {
              background: 'var(--edge-soft)',
              color: 'var(--edge)',
              borderColor: 'oklch(0.88 0.17 125 / 0.4)',
            }
          : {}),
      }}
    >
      {children}
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: active ? 'var(--edge)' : 'var(--muted)',
          opacity: 0.8,
        }}
      >
        {count}
      </span>
    </button>
  );
}

function collectBookmakers(matches: ReadonlyArray<ComparatorMatch>): string[] {
  const set = new Set<string>();
  for (const m of matches) for (const b of m.books) set.add(b.name);
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function countLeagues(matches: ReadonlyArray<ComparatorMatch>): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of matches) m.set(x.league, (m.get(x.league) ?? 0) + 1);
  return m;
}

function computeKpis(matches: ReadonlyArray<ComparatorMatch>) {
  const games = matches.length;
  const books = collectBookmakers(matches).length;

  // Average spread = mean across all sides of (best - worst) / worst.
  let spreadSum = 0;
  let spreadCount = 0;
  for (const m of matches) {
    for (const side of ['home', 'draw', 'away'] as const) {
      const vals = m.books
        .map((b) => b[side])
        .filter((v): v is number => typeof v === 'number');
      if (vals.length < 2) continue;
      const max = Math.max(...vals);
      const min = Math.min(...vals);
      if (min > 0) {
        spreadSum += ((max - min) / min) * 100;
        spreadCount += 1;
      }
    }
  }
  const avgSpread = spreadCount > 0 ? spreadSum / spreadCount : 0;

  const counts = countLeagues(matches);
  let topLeague: { code: string; count: number } | null = null;
  for (const [code, count] of counts) {
    if (!topLeague || count > topLeague.count) topLeague = { code, count };
  }

  return { games, books, avgSpread, topLeague };
}

function ComparatorHeader({
  books,
  t,
}: Readonly<{ books: ReadonlyArray<string>; t: (key: string) => string }>) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `260px 60px 80px repeat(${books.length}, 1fr) 80px`,
        gap: 12,
        background: 'var(--bg-2)',
        padding: '12px 16px',
        fontSize: 11,
        fontFamily: 'var(--mono)',
        color: 'var(--muted)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <span>{t('comparator.col_match')}</span>
      <span>{t('comparator.col_league')}</span>
      <span>{t('comparator.col_market')}</span>
      {books.map((b) => {
        const info = bookmakerInfo(b);
        return (
          <a
            key={b}
            href={bookmakerLink({ book: b, source: 'comparator' })}
            target="_blank"
            rel="noopener noreferrer sponsored"
            style={{
              textAlign: 'center',
              color: 'inherit',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
            title={info.display}
          >
            <span>{b}</span>
            <span aria-hidden style={{ fontSize: 8, opacity: 0.6 }}>↗</span>
          </a>
        );
      })}
      <span style={{ textAlign: 'right' }}>{t('comparator.col_best')}</span>
    </div>
  );
}

interface RowSide {
  label: string;
  pick: 'home' | 'draw' | 'away';
}

const SIDES: RowSide[] = [
  { label: '1', pick: 'home' },
  { label: 'X', pick: 'draw' },
  { label: '2', pick: 'away' },
];

function ComparatorRow({
  match,
  books,
}: Readonly<{ match: ComparatorMatch; books: ReadonlyArray<string> }>) {
  const byBook = new Map(match.books.map((b) => [b.name, b] as const));

  return (
    <div className="comparator-match" style={{ borderBottom: '1px solid var(--line)' }}>
      {SIDES.map((side, idx) => {
        const best = match.best[side.pick];
        return (
          <div
            key={side.pick}
            style={{
              display: 'grid',
              gridTemplateColumns: `260px 60px 80px repeat(${books.length}, 1fr) 80px`,
              gap: 12,
              padding: '10px 16px',
              alignItems: 'center',
              borderTop: idx === 0 ? 'none' : '1px dashed var(--line)',
            }}
          >
            {idx === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <Crest team={match.home} size={20} />
                <Crest team={match.away} size={20} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {match.home} · {match.away}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                    {match.kickoff
                      ? new Date(match.kickoff).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </div>
                </div>
              </div>
            ) : (
              <span />
            )}
            {idx === 0 ? (
              <span className="league-mono">{match.league}</span>
            ) : (
              <span />
            )}
            <span className="tag" style={{ fontSize: 11, justifySelf: 'start' }}>
              {side.label}
            </span>
            {books.map((bookName) => {
              const b = byBook.get(bookName);
              const v = b?.[side.pick];
              const isBest = v != null && best != null && Math.abs(v - best) < 1e-6;
              let cellColor: string = 'var(--text)';
              if (isBest) cellColor = 'var(--edge)';
              else if (v == null) cellColor = 'var(--muted)';
              const cellContent = (
                <span
                  style={{
                    display: 'block',
                    padding: '6px 0',
                    margin: '0 2px',
                    borderRadius: 4,
                    background: isBest ? 'var(--edge-soft)' : 'transparent',
                    border: isBest ? '1px solid oklch(0.88 0.17 125 / 0.4)' : '1px solid transparent',
                    fontFamily: 'var(--mono)',
                    fontSize: 12,
                    fontWeight: isBest ? 600 : 400,
                    color: cellColor,
                    fontVariantNumeric: 'tabular-nums',
                    textAlign: 'center',
                  }}
                >
                  {fmt(v)}
                </span>
              );
              if (v == null) {
                return (
                  <div key={bookName}>{cellContent}</div>
                );
              }
              return (
                <a
                  key={bookName}
                  className="odds-cell"
                  href={bookmakerLink({ book: bookName, matchId: match.match_id, side: side.pick, source: 'comparator' })}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  style={{ textDecoration: 'none', display: 'block', borderRadius: 4 }}
                >
                  {cellContent}
                </a>
              );
            })}
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontWeight: 600,
                color: 'var(--edge)',
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {fmt(best)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
