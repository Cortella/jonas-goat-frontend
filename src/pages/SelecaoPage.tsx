import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { AppBar } from '../components/AppBar';
import { api, type Selecao, type WCMatch } from '../lib/api';

export function SelecaoPage() {
  const { slug = '' } = useParams();
  const q = useQuery({ queryKey: ['wc-selecao', slug], queryFn: () => api.worldCupSelecao(slug) });

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <AppBar />
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '24px 24px 64px' }}>
        <Link to="/copa-2026" style={{ fontSize: 13, color: 'var(--text-2)', textDecoration: 'none' }}>
          ‹ Voltar para a Copa
        </Link>
        {q.isLoading && (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>Carregando…</div>
        )}
        {q.isError && (
          <div className="surface" style={{ padding: 24, marginTop: 16, color: 'var(--loss)' }}>
            Seleção não encontrada.
          </div>
        )}
        {q.data && <SelecaoBody data={q.data} />}
      </div>
    </div>
  );
}

function SelecaoBody({ data }: Readonly<{ data: Selecao }>) {
  const meta = (data.meta ?? {}) as Record<string, unknown>;
  const titulos = (meta.titulos ?? {}) as Record<string, unknown[]>;
  const logo = data.live?.logo ?? null;
  const confed = str(meta.confederacao);
  const tecnico = str(meta.tecnico_2026);
  const ranking = meta.ranking_fifa != null ? String(meta.ranking_fifa) : null;
  const codigo = str(meta.codigo_fifa);

  const chips: Array<{ label: string; n: number }> = [
    { label: 'Mundiais', n: arr(titulos.copa_do_mundo).length },
    { label: 'Continentais', n: arr(titulos.copa_continental).length },
  ].filter((c) => c.n > 0);

  return (
    <>
      {/* Cabeçalho */}
      <div className="surface" style={{ padding: 24, marginTop: 16, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {logo ? (
          <img src={logo} alt={data.nome} width={72} height={72} style={{ objectFit: 'contain', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 72, height: 72, borderRadius: 8, background: 'var(--surface-2)' }} />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ fontSize: 30, fontWeight: 600, margin: 0 }}>{data.nome}</h1>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {confed && <span>{confed}</span>}
            {codigo && <span style={{ fontFamily: 'var(--mono)' }}>{codigo}</span>}
            {ranking && <span>Ranking FIFA: {ranking}º</span>}
            {tecnico && <span>Técnico: {tecnico}</span>}
            {data.live?.group && <span>Grupo {data.live.group}</span>}
          </div>
          {chips.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {chips.map((c) => (
                <span key={c.label} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, background: 'var(--edge-soft)', color: 'var(--edge)', fontWeight: 600 }}>
                  🏆 {c.n} {c.label}
                </span>
              ))}
              {data.live?.eliminated && (
                <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, background: 'oklch(0.68 0.16 25 / 0.14)', color: 'var(--loss)', fontWeight: 700, border: '1px solid oklch(0.68 0.16 25 / 0.35)' }}>
                  Eliminado
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Campanha 2026 ao vivo */}
      {data.live?.standing && (
        <div className="surface" style={{ padding: 24, marginTop: 16 }}>
          <div className="t-eyebrow" style={{ marginBottom: 12 }}>Campanha 2026 — Grupo {data.live.group}</div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13, marginBottom: 16 }}>
            <Kpi label="Posição" value={`${data.live.standing.rank}º`} />
            <Kpi label="Pontos" value={data.live.standing.points} />
            <Kpi label="J" value={data.live.standing.played} />
            <Kpi label="V-E-D" value={`${data.live.standing.win}-${data.live.standing.draw}-${data.live.standing.lose}`} />
            <Kpi label="Saldo" value={data.live.standing.goal_diff > 0 ? `+${data.live.standing.goal_diff}` : data.live.standing.goal_diff} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.live.matches.map((m) => <SelMatch key={m.id} m={m} teamId={data.live!.standing!.team_id} />)}
          </div>
        </div>
      )}

      {/* Conteúdo enciclopédico (.md) */}
      {data.body ? (
        <div className="surface markdown-selecao" style={{ padding: 24, marginTop: 16, lineHeight: 1.6, fontSize: 14, color: 'var(--text)' }}>
          <ReactMarkdown
            components={{
              h1: () => null, // o nome já aparece no cabeçalho
              h2: ({ children }) => <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 24, marginBottom: 8, borderBottom: '1px solid var(--line)', paddingBottom: 6 }}>{children}</h2>,
              h3: ({ children }) => <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 16 }}>{children}</h3>,
              p: ({ children }) => <p style={{ margin: '8px 0', color: 'var(--text-2)' }}>{children}</p>,
              li: ({ children }) => <li style={{ margin: '4px 0', color: 'var(--text-2)' }}>{children}</li>,
              a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--edge)' }}>{children}</a>,
              blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid var(--line-2)', paddingLeft: 12, margin: '12px 0', color: 'var(--muted)', fontSize: 12 }}>{children}</blockquote>,
              strong: ({ children }) => <strong style={{ color: 'var(--text)' }}>{children}</strong>,
            }}
          >
            {data.body}
          </ReactMarkdown>
        </div>
      ) : (
        <div className="surface" style={{ padding: 32, marginTop: 16, textAlign: 'center', color: 'var(--muted)' }}>
          <p style={{ margin: 0 }}>📝 O conteúdo histórico desta seleção ainda está sendo preparado.</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>A campanha 2026 acima já está ao vivo.</p>
        </div>
      )}
    </>
  );
}

function Kpi({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--mono)' }}>{value}</div>
    </div>
  );
}

function SelMatch({ m, teamId }: Readonly<{ m: WCMatch; teamId: number }>) {
  const isHome = m.home.id === teamId;
  const opp = isHome ? m.away : m.home;
  const finished = m.status.phase === 'finished';
  const live = m.status.phase === 'live';
  const score = m.home.goals != null && m.away.goals != null ? `${isHome ? m.home.goals : m.away.goals} : ${isHome ? m.away.goals : m.home.goals}` : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 6, fontSize: 13 }}>
      <span style={{ color: 'var(--muted)', fontSize: 11, width: 56 }}>{isHome ? 'Casa' : 'Fora'}</span>
      <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src={opp.logo} alt={opp.name} width={18} height={18} style={{ objectFit: 'contain' }} />
        {opp.name}
      </span>
      <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: live ? 'var(--loss)' : 'var(--text)' }}>
        {score ?? new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
      </span>
    </div>
  );
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}
function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
