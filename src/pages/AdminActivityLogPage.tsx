import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { SectionHeader, Stat } from '../components/atoms';
import { Flag } from '../components/Flag';
import { api, type ActorRole } from '../lib/api';

const ROLE_COLOR: Record<ActorRole, string> = {
  user: 'var(--info)',
  admin: 'oklch(0.78 0.16 25)',
  system: 'var(--muted)',
};

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60_000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

export function AdminActivityLogPage() {
  const [role, setRole] = useState<ActorRole | ''>('');
  const [action, setAction] = useState('');
  const [q, setQ] = useState('');

  const list = useQuery({
    queryKey: ['admin-activity', role, action, q],
    queryFn: () => api.adminActivityLog({
      role: role || undefined,
      action: action || undefined,
      q: q || undefined,
    }),
    refetchInterval: 15_000,
  });

  return (
    <AdminLayout>
      <SectionHeader
        eyebrow="Auditoria"
        title="Atividade"
        sub="Tudo que muda no sistema vira uma linha aqui — em português, com quem, quando, e a partir de qual IP."
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input" placeholder="Buscar email ou descrição…"
              value={q} onChange={(e) => setQ(e.target.value)}
              style={{ width: 240, fontSize: 12 }}
            />
            <select className="input" value={role} onChange={(e) => setRole(e.target.value as ActorRole | '')} style={{ width: 130, fontSize: 12 }}>
              <option value="">Todos atores</option>
              <option value="user">Usuários</option>
              <option value="admin">Admins</option>
              <option value="system">Sistema</option>
            </select>
            <input
              className="input" placeholder="Ação (ex: user.logged_in)"
              value={action} onChange={(e) => setAction(e.target.value)}
              style={{ width: 200, fontSize: 12, fontFamily: 'var(--mono)' }}
            />
          </div>
        }
      />

      {list.isLoading && <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>Carregando…</div>}
      {list.isError && <div style={{ padding: 24, color: 'var(--loss)' }}>Erro: {String(list.error)}</div>}

      {list.data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            <div className="surface" style={{ padding: 20 }}>
              <Stat label="Eventos 24h" value={String(list.data.stats.last_24h_total)} sub="atividades registradas" />
            </div>
            <div className="surface" style={{ padding: 20 }}>
              <Stat label="Pelos usuários" value={String(list.data.stats.last_24h_users)} sub="ações iniciadas pelo público" color="var(--info)" />
            </div>
            <div className="surface" style={{ padding: 20 }}>
              <Stat label="Pelo time" value={String(list.data.stats.last_24h_admins)} sub="ações administrativas" color="oklch(0.78 0.16 25)" />
            </div>
          </div>

          <div className="surface" style={{ padding: 20, marginBottom: 16 }}>
            <div className="t-eyebrow" style={{ marginBottom: 8 }}>Top ações · 7 dias</div>
            {list.data.top_actions_7d.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>Sem dados ainda.</div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {list.data.top_actions_7d.map((a) => (
                  <button
                    key={a.action} type="button"
                    onClick={() => setAction(a.action)}
                    className="tag"
                    style={{ fontSize: 11, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--mono)' }}
                  >
                    {a.action} <span style={{ color: 'var(--muted)', marginLeft: 6 }}>×{a.n}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', fontSize: 13, fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}>
              <span>Atividades recentes ({list.data.logs.length})</span>
              {(role || action || q) && (
                <button type="button" className="btn btn-sm" onClick={() => { setRole(''); setAction(''); setQ(''); }} style={{ fontSize: 11 }}>
                  Limpar filtros
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 220px 100px 60px 80px', gap: 12, padding: '10px 20px', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--bg-2)' }}>
              <span>Ator</span>
              <span>Atividade</span>
              <span>Ação</span>
              <span>IP</span>
              <span>País</span>
              <span style={{ textAlign: 'right' }}>Quando</span>
            </div>
            {list.data.logs.length === 0 && (
              <div style={{ padding: 32, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
                Nenhuma atividade neste filtro.
              </div>
            )}
            {list.data.logs.map((l) => (
              <div
                key={l.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '70px 1fr 220px 100px 60px 80px',
                  gap: 12,
                  padding: '10px 20px',
                  borderTop: '1px solid var(--line)',
                  alignItems: 'center',
                  fontSize: 12,
                }}
              >
                <span
                  className="tag"
                  style={{
                    fontSize: 9,
                    color: ROLE_COLOR[l.actor_role],
                    borderColor: ROLE_COLOR[l.actor_role],
                    justifySelf: 'start',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {l.actor_role}
                </span>
                <span>
                  <div style={{ color: 'var(--text)' }}>{l.description}</div>
                  {l.user_email && (
                    <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                      {l.user_email}
                    </div>
                  )}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.action_key}>
                  {l.action_key}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
                  {l.ip ?? '—'}
                </span>
                <span><Flag code={l.country_code} /></span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', textAlign: 'right' }} title={l.created_at}>
                  {timeAgo(l.created_at)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
