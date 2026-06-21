import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppBar } from '../components/AppBar';
import { Crest, Dot, ProbBar } from '../components/atoms';
import { Seo } from '../components/Seo';
import { api, type LiveCall, type LiveCallKind, type LiveState } from '../lib/api';

const KIND_COLOR: Record<LiveCallKind, string> = {
  value: 'var(--edge)',
  shift: 'var(--info)',
  risk: 'var(--loss)',
  momentum: 'var(--warn)',
};
const KIND_LABEL: Record<LiveCallKind, string> = {
  value: 'Value',
  shift: 'Mudança',
  risk: 'Risco',
  momentum: 'Momentum',
};

export function LiveMatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const id = matchId ? Number(matchId) : null;

  // Modo simulação até o feed in-play estar online. Permite pilotar
  // minuto/placar pelos sliders pra avaliar como o modelo reage.
  const [simEnabled, setSimEnabled] = useState(true);
  const [minute, setMinute] = useState(35);
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);

  const sim = useMemo(
    () => simEnabled ? { minute, home: homeGoals, away: awayGoals } : undefined,
    [simEnabled, minute, homeGoals, awayGoals],
  );

  const q = useQuery({
    queryKey: ['live-match', id, sim?.minute, sim?.home, sim?.away, simEnabled],
    queryFn: () => (id ? api.liveMatch(id, sim) : Promise.reject(new Error('no id'))),
    enabled: !!id,
    refetchInterval: simEnabled ? false : 30_000,
    retry: false,
  });

  // Acumula calls localmente entre ticks para construir a timeline.
  const [history, setHistory] = useState<LiveCall[]>([]);
  useEffect(() => {
    if (!q.data) return;
    setHistory((prev) => {
      const seen = new Set(prev.map((c) => c.id));
      const fresh = q.data!.calls.filter((c) => !seen.has(c.id));
      if (fresh.length === 0) return prev;
      return [...fresh, ...prev].slice(0, 60);
    });
  }, [q.data]);

  // Reset history quando mudar o jogo
  useEffect(() => { setHistory([]); }, [id]);

  if (q.isLoading) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <AppBar />
        <div style={{ padding: 64, color: 'var(--muted)', textAlign: 'center' }}>Carregando análise…</div>
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <AppBar />
        <div style={{ padding: 64, color: 'var(--loss)', textAlign: 'center' }}>
          Não foi possível carregar essa partida.
        </div>
      </div>
    );
  }

  const data = q.data;
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Seo
        title={`Ao vivo · ${data.home_team} × ${data.away_team}`}
        description={`Análise ao vivo do modelo Jonas Goat para ${data.home_team} × ${data.away_team}, com calls e mercados in-play.`}
        path={`/partida-ao-vivo/${data.match_id}`}
        noindex
      />
      <AppBar />

      <Header data={data} />

      <SimulationToggle
        enabled={simEnabled}
        onToggle={setSimEnabled}
        minute={minute} setMinute={setMinute}
        homeGoals={homeGoals} setHomeGoals={setHomeGoals}
        awayGoals={awayGoals} setAwayGoals={setAwayGoals}
        homeName={data.home_team}
        awayName={data.away_team}
      />

      <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ProbabilityShift data={data} />
          <InPlayMarkets data={data} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <CallsFeed calls={history.length > 0 ? history : data.calls} />
          <PreVsNow data={data} />
        </div>
      </div>
    </div>
  );
}

function Header({ data }: Readonly<{ data: LiveState }>) {
  const statusLabel = (() => {
    switch (data.status) {
      case 'pre': return 'pré-jogo';
      case 'live': return 'ao vivo';
      case 'ht': return 'intervalo';
      case 'ft': return 'fim';
    }
  })();
  return (
    <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--line)', display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 24, alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center', textAlign: 'right' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>{data.home_team}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{data.league}</div>
        </div>
        <Crest team={data.home_team} size={48} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: data.status === 'live' ? 'oklch(0.68 0.16 25 / 0.12)' : 'var(--bg-2)', border: data.status === 'live' ? '1px solid oklch(0.68 0.16 25 / 0.4)' : '1px solid var(--line)', fontSize: 10, fontFamily: 'var(--mono)', color: data.status === 'live' ? 'var(--loss)' : 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {data.status === 'live' && <Dot pulse />}
          {statusLabel} · {data.minute}'
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 44, fontWeight: 500, marginTop: 8 }}>
          {data.home_goals} <span style={{ color: 'var(--muted)' }}>×</span> {data.away_goals}
        </div>
        <Link to={`/predictions/${data.match_id}`} style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'underline' }}>ver previsão pré-jogo</Link>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Crest team={data.away_team} size={48} />
        <div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>{data.away_team}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{data.league}</div>
        </div>
      </div>
    </div>
  );
}

function SimulationToggle({
  enabled, onToggle, minute, setMinute, homeGoals, setHomeGoals, awayGoals, setAwayGoals,
  homeName, awayName,
}: Readonly<{
  enabled: boolean; onToggle: (v: boolean) => void;
  minute: number; setMinute: (n: number) => void;
  homeGoals: number; setHomeGoals: (n: number) => void;
  awayGoals: number; setAwayGoals: (n: number) => void;
  homeName: string; awayName: string;
}>) {
  return (
    <div style={{ padding: '12px 32px', borderBottom: '1px solid var(--line)', background: enabled ? 'oklch(0.82 0.15 80 / 0.04)' : 'transparent', display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--text-2)', flexWrap: 'wrap' }}>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
        <span style={{ color: enabled ? 'var(--warn)' : 'var(--text-2)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10 }}>
          Modo simulação
        </span>
      </label>
      {enabled && (
        <>
          <span style={{ color: 'var(--muted)', fontSize: 11 }}>
            Pilote o estado da partida — feed in-play real chega na próxima fase.
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>min</span>
            <input type="range" min={0} max={95} value={minute} onChange={(e) => setMinute(Number(e.target.value))} style={{ width: 140 }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, width: 30 }}>{minute}'</span>
          </div>
          <GoalStepper label={homeName} value={homeGoals} onChange={setHomeGoals} />
          <GoalStepper label={awayName} value={awayGoals} onChange={setAwayGoals} />
        </>
      )}
    </div>
  );
}

function GoalStepper({ label, value, onChange }: Readonly<{ label: string; value: number; onChange: (n: number) => void }>) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <button type="button" className="btn" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => onChange(Math.max(0, value - 1))}>−</button>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 13, width: 18, textAlign: 'center' }}>{value}</span>
      <button type="button" className="btn" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => onChange(Math.min(9, value + 1))}>+</button>
    </div>
  );
}

function ProbabilityShift({ data }: Readonly<{ data: LiveState }>) {
  const rows: Array<{ label: string; pre: number; now: number }> = [
    { label: data.home_team, pre: data.pre.prob_home, now: data.now.prob_home },
    { label: 'Empate', pre: data.pre.prob_draw, now: data.now.prob_draw },
    { label: data.away_team, pre: data.pre.prob_away, now: data.now.prob_away },
  ];
  return (
    <div className="surface" style={{ padding: 24 }}>
      <div className="t-eyebrow" style={{ marginBottom: 8 }}>Probabilidades · pré-jogo vs ao vivo</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
        O modelo recalcula a chance de cada resultado a partir do placar atual e do tempo restante.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 80px 80px 80px', gap: 12, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        <span>Mercado</span><span>Distribuição agora</span>
        <span style={{ textAlign: 'right' }}>Pré</span>
        <span style={{ textAlign: 'right' }}>Agora</span>
        <span style={{ textAlign: 'right' }}>Δ</span>
      </div>
      {rows.map((r) => {
        const delta = (r.now - r.pre) * 100;
        let color = 'var(--muted)';
        if (delta > 1) color = 'var(--edge)';
        else if (delta < -1) color = 'var(--loss)';
        return (
          <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 80px 80px 80px', gap: 12, padding: '10px 0', borderTop: '1px solid var(--line)', alignItems: 'center', fontSize: 13 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
            <ProbBar home={r.now * 100} draw={0} away={(1 - r.now) * 100} height={8} />
            <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', color: 'var(--muted)' }}>{(r.pre * 100).toFixed(0)}%</span>
            <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', fontWeight: 500 }}>{(r.now * 100).toFixed(0)}%</span>
            <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', color, fontWeight: 600 }}>
              {delta > 0 ? '+' : ''}{delta.toFixed(0)}pp
            </span>
          </div>
        );
      })}
    </div>
  );
}

function InPlayMarkets({ data }: Readonly<{ data: LiveState }>) {
  const total = data.home_goals + data.away_goals;
  const rows = [
    { name: 'Próximo gol · mandante', prob: data.now.next_goal_home, fairOdd: 1 / Math.max(0.05, data.now.next_goal_home) },
    { name: 'Próximo gol · visitante', prob: data.now.next_goal_away, fairOdd: 1 / Math.max(0.05, data.now.next_goal_away) },
    { name: 'Sem mais gols na partida', prob: data.now.no_more_goals, fairOdd: 1 / Math.max(0.05, data.now.no_more_goals) },
    { name: `Over 2.5 final (atual: ${total})`, prob: data.now.over_2_5, fairOdd: 1 / Math.max(0.05, data.now.over_2_5) },
    { name: 'Ambas marcam (final)', prob: data.now.btts_yes, fairOdd: 1 / Math.max(0.05, data.now.btts_yes) },
  ];
  return (
    <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', fontSize: 14, fontWeight: 500 }}>
        Mercados ao vivo
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 100px', gap: 12, padding: '10px 20px', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        <span>Mercado</span>
        <span style={{ textAlign: 'right' }}>Prob</span>
        <span style={{ textAlign: 'right' }}>Odd justa</span>
      </div>
      {rows.map((r) => (
        <div key={r.name} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 100px', gap: 12, padding: '12px 20px', borderTop: '1px solid var(--line)', fontSize: 13, alignItems: 'center' }}>
          <span>{r.name}</span>
          <span style={{ fontFamily: 'var(--mono)', textAlign: 'right' }}>{(r.prob * 100).toFixed(0)}%</span>
          <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', fontWeight: 500 }}>{r.fairOdd.toFixed(2)}</span>
        </div>
      ))}
      <div style={{ padding: '10px 20px', borderTop: '1px solid var(--line)', fontSize: 11, color: 'var(--muted)' }}>
        Odds justas · sem margem de bookmaker. Compare com a casa pra detectar value.
      </div>
    </div>
  );
}

function CallsFeed({ calls }: Readonly<{ calls: LiveCall[] }>) {
  return (
    <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Calls do modelo</div>
        <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {calls.length} no histórico
        </span>
      </div>
      {calls.length === 0 && (
        <div style={{ padding: 32, color: 'var(--muted)', textAlign: 'center', fontSize: 13 }}>
          Aguardando movimentação… Calls aparecem aqui conforme o modelo detectar shifts ou value.
        </div>
      )}
      <div style={{ maxHeight: 480, overflowY: 'auto' }}>
        {calls.map((c) => (
          <div key={c.id} style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <span style={{ color: KIND_COLOR[c.kind], fontWeight: 600 }}>{KIND_LABEL[c.kind]}</span>
              <span>·</span>
              <span>{c.minute}'</span>
              <span>·</span>
              <span>{c.market}</span>
              {c.odds_hint != null && (
                <span style={{ marginLeft: 'auto', color: 'var(--text)' }}>odd ~{c.odds_hint.toFixed(2)}</span>
              )}
            </div>
            <div style={{ color: 'var(--text)', lineHeight: 1.5 }}>{c.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreVsNow({ data }: Readonly<{ data: LiveState }>) {
  return (
    <div className="surface" style={{ padding: 20 }}>
      <div className="t-eyebrow" style={{ marginBottom: 12 }}>Como o modelo trabalha ao vivo</div>
      <ul style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, paddingLeft: 18, margin: 0 }}>
        <li>Probabilidades pré-jogo são o ponto de partida.</li>
        <li>Cada minuto sem gol diminui a janela de simulação.</li>
        <li>Vantagem no placar empurra a probabilidade do líder.</li>
        <li>Calls são emitidas só quando há mudança ≥ 15pp ou padrão tático.</li>
      </ul>
      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
        Versão 1: Markov simples · v2 (em breve): xG ao vivo + cartões + escanteios.
      </div>
    </div>
  );
}
