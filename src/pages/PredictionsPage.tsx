import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppBar } from '../components/AppBar';
import { Confidence, Crest, EVChip, ProbBar, SectionHeader, Stat } from '../components/atoms';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Prediction } from '../lib/types';

const LEAGUES = ['PL', 'PD', 'BL1', 'SA', 'FL1', 'CL', 'WC'] as const;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(iso: string, delta: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

const CONF_LEVEL: Record<Prediction['confidence'], 1 | 2 | 3> = {
  low: 1,
  medium: 2,
  high: 3,
};

const GRID_COLS = '60px 1fr 200px 140px 60px 80px';

export function PredictionsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const date = params.get('date') || todayIso();
  const league = params.get('league') || undefined;
  const isPro = !!user && (user.plan === 'pro' || user.plan === 'founders');
  // Datas passadas (jogos já encerrados) são abertas para todos — vitrine
  // pública do modelo. Hoje/futuro segue exclusivo do Pro/Founders.
  const isPastDate = date < todayIso();
  const canSee = isPro || isPastDate;

  const q = useQuery({
    queryKey: ['predictions', date, league],
    queryFn: () => api.predictions({ date, league }),
  });

  // Always fetch a separate "all leagues" snapshot for accurate KPIs and
  // per-league counts in the filter chips.
  const allQ = useQuery({
    queryKey: ['predictions', date, 'all'],
    queryFn: () => api.predictions({ date }),
  });

  const preds: Prediction[] = q.data?.predictions || [];
  const allPreds: Prediction[] = allQ.data?.predictions || [];

  const kpis = useMemo(() => computeKpis(allPreds), [allPreds]);
  const leagueCounts = useMemo(() => countLeagues(allPreds), [allPreds]);

  let sub: string;
  if (preds.length > 0) sub = t('predictions.count_sub', { count: preds.length });
  else if (q.isLoading) sub = t('predictions.loading');
  else sub = t('predictions.no_matches');

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

  // Previsões são exclusivas do Pro/Founders. Free usa só a carteira e o
  // registro de apostas.
  if (!canSee) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <AppBar />
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <h1 style={{ fontSize: 26, fontWeight: 600, margin: '12px 0 8px' }}>
            As previsões são exclusivas do Pro
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: 15, lineHeight: 1.6, margin: '0 0 24px' }}>
            Previsões ilimitadas, EV, todos os mercados e alertas fazem parte do Pro e do Founders.
            No plano Free você já pode usar a <strong>carteira</strong> e <strong>registrar suas apostas</strong>
            {' '}para gerir sua banca.
          </p>
          <div style={{ display: 'inline-flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link
              to={user ? '/checkout?plan=pro&cycle=monthly' : '/signup'}
              className="btn btn-edge"
              style={{ textDecoration: 'none', padding: '12px 22px', fontWeight: 700 }}
            >
              {user ? 'Assinar Pro' : 'Criar conta'}
            </Link>
            <Link to="/bankroll" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
              Ir para a carteira
            </Link>
          </div>
          <p style={{ marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
            Quer ver como o modelo se saiu?{' '}
            <button
              type="button"
              onClick={() => setDate(shiftDate(todayIso(), -1))}
              style={{ background: 'none', border: 'none', padding: 0, color: 'var(--edge)', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}
            >
              Veja as previsões de ontem
            </button>{' '}
            — jogos já encerrados são abertos para todos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <AppBar />

      <div style={{ padding: '32px 32px 16px', maxWidth: 1280, margin: '0 auto' }}>
        <SectionHeader
          eyebrow={t('predictions.eyebrow')}
          title={t('predictions.title', { date })}
          sub={sub}
          action={
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setDate(shiftDate(date, -1))}
                aria-label={t('predictions.prev_day')}
                title={t('predictions.prev_day')}
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
                {t('predictions.today')}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setDate(shiftDate(date, 1))}
                aria-label={t('predictions.next_day')}
                title={t('predictions.next_day')}
                style={{ padding: '7px 10px' }}
              >
                ›
              </button>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
                style={{ fontSize: 12, width: 150, marginLeft: 4 }}
              />
            </div>
          }
        />
      </div>

      {!isPro && (
        <div style={{ padding: '0 32px 16px', maxWidth: 1280, margin: '0 auto' }}>
          <div
            className="surface"
            style={{
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
              flexWrap: 'wrap', fontSize: 13, color: 'var(--text-2)',
              borderColor: 'oklch(0.88 0.17 125 / 0.35)', background: 'var(--edge-soft)',
            }}
          >
            <span aria-hidden>🔓</span>
            <span style={{ flex: 1, minWidth: 200 }}>
              Jogos já encerrados são abertos para todos — veja como o modelo se saiu.
              As previsões de <strong>hoje e dos próximos jogos</strong> são exclusivas do Pro.
            </span>
            <Link to={user ? '/checkout?plan=pro&cycle=monthly' : '/signup'} className="btn btn-edge btn-sm" style={{ textDecoration: 'none' }}>
              Assinar Pro
            </Link>
          </div>
        </div>
      )}

      <GameSuggestions />

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
          <Stat label={t('predictions.kpi_games')} value={String(kpis.games)} />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat
            label={t('predictions.kpi_value_bets')}
            value={String(kpis.valueBets)}
            sub={t('predictions.kpi_value_bets_sub')}
            color={kpis.valueBets > 0 ? 'var(--edge)' : undefined}
          />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat
            label={t('predictions.kpi_avg_ev')}
            value={kpis.valueBets > 0 ? `${kpis.avgEv.toFixed(1)}%` : '—'}
            sub={t('predictions.kpi_avg_ev_sub')}
            color={kpis.avgEv > 0 ? 'var(--edge)' : undefined}
          />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat
            label={t('predictions.kpi_top_league')}
            value={kpis.topLeague?.code || '—'}
            sub={
              kpis.topLeague
                ? t('predictions.kpi_top_league_sub', { count: kpis.topLeague.count })
                : undefined
            }
          />
        </div>
      </div>

      {/* League filter chips */}
      <div
        style={{
          padding: '0 32px 16px',
          display: 'flex',
          gap: 6,
          alignItems: 'center',
          flexWrap: 'wrap',
          maxWidth: 1280,
          margin: '0 auto',
        }}
      >
        <LeagueChip active={!league} onClick={() => setLeague(null)} count={allPreds.length}>
          {t('predictions.all_leagues')}
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

      <div style={{ padding: '0 32px 32px', maxWidth: 1280, margin: '0 auto' }}>
        {q.isLoading && (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--muted)' }}>
            {t('predictions.loading_preds')}
          </div>
        )}
        {q.isError && (
          <div className="surface" style={{ padding: 24, color: 'var(--loss)' }}>
            {t('predictions.error', { error: String(q.error) })}
          </div>
        )}
        {!q.isLoading && !q.isError && preds.length === 0 && (
          <div className="surface" style={{ padding: 64, textAlign: 'center' }}>
            <p style={{ fontSize: 48, opacity: 0.4, margin: 0 }}>🐐</p>
            <p style={{ color: 'var(--muted)', marginTop: 16, marginBottom: 20 }}>
              {league
                ? t('predictions.no_predictions_league', { date, league })
                : t('predictions.no_predictions', { date })}
            </p>
            <div style={{ display: 'inline-flex', gap: 8 }}>
              {league && (
                <button className="btn btn-ghost btn-sm" onClick={() => setLeague(null)}>
                  {t('predictions.all_leagues')}
                </button>
              )}
              <button
                className="btn btn-solid btn-sm"
                onClick={() => setDate(shiftDate(date, 1))}
              >
                {t('predictions.try_tomorrow')} ›
              </button>
            </div>
          </div>
        )}
        {!q.isLoading && !q.isError && preds.length > 0 && <PredictionsList preds={preds} />}
      </div>
    </div>
  );
}

// Sugestões do Jonas (Pro): jogos que valem a pena por EV + confiança. O
// usuário pode ocultar/reativar quando quiser (preferência suggestions_enabled).
function GameSuggestions() {
  const qc = useQueryClient();
  const sugQ = useQuery({ queryKey: ['game-suggestions'], queryFn: () => api.gameSuggestions() });
  const toggle = useMutation({
    mutationFn: (enabled: boolean) => api.setSuggestionsEnabled(enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['game-suggestions'] }),
  });
  if (!sugQ.data) return null;

  if (!sugQ.data.enabled) {
    return (
      <div style={{ padding: '0 32px 12px', maxWidth: 1280, margin: '0 auto' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => toggle.mutate(true)} disabled={toggle.isPending}>
          🐐 Mostrar sugestões do Jonas
        </button>
      </div>
    );
  }
  if (sugQ.data.suggestions.length === 0) return null;

  return (
    <div style={{ padding: '0 32px 16px', maxWidth: 1280, margin: '0 auto' }}>
      <div className="surface" style={{ padding: 16, border: '1px solid oklch(0.88 0.17 125 / 0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div className="t-eyebrow">🐐 Sugestões do Jonas · vale a pena olhar</div>
          <button className="btn btn-ghost btn-sm" onClick={() => toggle.mutate(false)} disabled={toggle.isPending}>Ocultar</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {sugQ.data.suggestions.map((s) => (
            <Link key={s.match_id} to={`/predictions/${s.match_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ padding: 12, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{s.home_team} × {s.away_team}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
                  {s.league}{s.kickoff ? ` · ${s.kickoff.slice(11, 16)}` : ''}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  {s.market && <span className="tag tag-edge" style={{ fontSize: 10 }}>{s.market}</span>}
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--edge)' }}>EV +{(s.ev * 100).toFixed(1)}%</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
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

function computeKpis(preds: ReadonlyArray<Prediction>) {
  const games = preds.length;
  let valueBets = 0;
  let evSum = 0;
  for (const p of preds) {
    const ev = p.value_bets[0]?.ev;
    if (ev != null && ev > 0) {
      valueBets += 1;
      evSum += ev * 100;
    }
  }
  const avgEv = valueBets > 0 ? evSum / valueBets : 0;

  const counts = countLeagues(preds);
  let topLeague: { code: string; count: number } | null = null;
  for (const [code, count] of counts) {
    if (!topLeague || count > topLeague.count) topLeague = { code, count };
  }
  return { games, valueBets, avgEv, topLeague };
}

function countLeagues(preds: ReadonlyArray<Prediction>): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of preds) m.set(p.league, (m.get(p.league) ?? 0) + 1);
  return m;
}

function PredictionsList({ preds }: Readonly<{ preds: Prediction[] }>) {
  const { t } = useTranslation();
  return (
    <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: GRID_COLS,
          gap: 16,
          padding: '12px 16px',
          fontSize: 11,
          fontFamily: 'var(--mono)',
          color: 'var(--muted)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          borderBottom: '1px solid var(--line)',
          background: 'var(--bg-2)',
        }}
      >
        <span>{t('predictions.col_time')}</span>
        <span>{t('predictions.col_match')}</span>
        <span>{t('predictions.col_prob')}</span>
        <span>{t('predictions.col_odds')}</span>
        <span>{t('predictions.col_conf')}</span>
        <span style={{ textAlign: 'right' }}>{t('predictions.col_ev')}</span>
      </div>
      {preds.map((p) => (
        <Link
          key={p.match_id}
          to={`/predictions/${p.match_id}`}
          style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
        >
          <div className="pred-row" style={{ gridTemplateColumns: GRID_COLS, gap: 16 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
              {p.kickoff?.slice(11, 16) || '—'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <span className="league-mono" style={{ width: 22, height: 22, fontSize: 9, flexShrink: 0 }}>
                {p.league}
              </span>
              <Crest team={p.home_team} size={20} />
              <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.home_team}
              </span>
              <span style={{ color: 'var(--faint)', fontSize: 11 }}>vs</span>
              <Crest team={p.away_team} size={20} />
              <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.away_team}
              </span>
            </div>
            <div>
              <ProbBar
                home={(p.ensemble.prob_home ?? 0) * 100}
                draw={(p.ensemble.prob_draw ?? 0) * 100}
                away={(p.ensemble.prob_away ?? 0) * 100}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 4,
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  color: 'var(--muted)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <span>{((p.ensemble.prob_home ?? 0) * 100).toFixed(0)}</span>
                <span>{((p.ensemble.prob_draw ?? 0) * 100).toFixed(0)}</span>
                <span>{((p.ensemble.prob_away ?? 0) * 100).toFixed(0)}</span>
              </div>
            </div>
            <OddsCells
              home={p.odds.odds_home}
              draw={p.odds.odds_draw}
              away={p.odds.odds_away}
            />
            <Confidence level={CONF_LEVEL[p.confidence] ?? 1} />
            <div style={{ textAlign: 'right' }}>
              {p.value_bets[0]?.ev != null && p.value_bets[0].ev > 0 ? (
                <EVChip value={p.value_bets[0].ev * 100} />
              ) : (
                <span style={{ color: 'var(--faint)', fontFamily: 'var(--mono)', fontSize: 11 }}>—</span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function OddsCells({
  home,
  draw,
  away,
}: Readonly<{ home?: number; draw?: number; away?: number }>) {
  const values = [home, draw, away];
  const numeric = values.filter((v): v is number => typeof v === 'number');
  const max = numeric.length > 0 ? Math.max(...numeric) : null;
  return (
    <div style={{ display: 'flex', gap: 4, fontFamily: 'var(--mono)', fontSize: 12 }}>
      {values.map((v, i) => {
        const isBest = max != null && typeof v === 'number' && v === max;
        return (
          <span
            key={i}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '6px 8px',
              background: isBest ? 'var(--edge-soft)' : 'var(--bg-2)',
              border: `1px solid ${isBest ? 'oklch(0.88 0.17 125 / 0.4)' : 'transparent'}`,
              color: isBest ? 'var(--edge)' : 'var(--text)',
              borderRadius: 6,
              fontVariantNumeric: 'tabular-nums',
              fontWeight: isBest ? 500 : 400,
            }}
          >
            {v != null ? v.toFixed(2) : '—'}
          </span>
        );
      })}
    </div>
  );
}
