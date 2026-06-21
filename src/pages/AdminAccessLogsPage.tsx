import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { SectionHeader, Stat } from '../components/atoms';
import { Flag } from '../components/Flag';
import { api, type AccessAction } from '../lib/api';

const ACTION_LABEL: Record<AccessAction, string> = {
  signup: 'Cadastro',
  login: 'Login',
  logout: 'Logout',
};

const ACTION_COLOR: Record<AccessAction, string> = {
  signup: 'var(--edge)',
  login: 'var(--info)',
  logout: 'var(--muted)',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
}

export function AdminAccessLogsPage() {
  const [action, setAction] = useState<AccessAction | ''>('');
  const [q, setQ] = useState('');

  const list = useQuery({
    queryKey: ['admin-access-logs', action, q],
    queryFn: () =>
      api.adminAccessLogs({
        action: (action || undefined) as AccessAction | undefined,
        q: q || undefined,
      }),
  });

  return (
    <AdminLayout>
      <SectionHeader
        eyebrow="Campanhas"
        title="Acessos"
        sub="Quem entrou pela primeira vez (signup), quem voltou (login) e de onde estão vindo. Útil pra acompanhar tráfego pago."
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              placeholder="Buscar email, IP ou user-agent…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ width: 260, fontSize: 12 }}
            />
            <select
              className="input"
              value={action}
              onChange={(e) => setAction(e.target.value as AccessAction | '')}
              style={{ width: 140, fontSize: 12 }}
            >
              <option value="">Todas ações</option>
              <option value="signup">Cadastros</option>
              <option value="login">Logins</option>
              <option value="logout">Logouts</option>
            </select>
          </div>
        }
      />

      {list.isLoading && (
        <div style={{ padding: 48, color: 'var(--muted)', textAlign: 'center' }}>Carregando…</div>
      )}
      {list.isError && (
        <div className="surface" style={{ padding: 24, color: 'var(--loss)' }}>
          Erro: {String(list.error)}
        </div>
      )}

      {list.data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            <div className="surface" style={{ padding: 20 }}>
              <Stat
                label="Cadastros 24h"
                value={String(list.data.stats.last_24h_signups)}
                sub="novos usuários no último dia"
                color="var(--edge)"
              />
            </div>
            <div className="surface" style={{ padding: 20 }}>
              <Stat
                label="Logins 24h"
                value={String(list.data.stats.last_24h_logins)}
                sub="autenticações no último dia"
                color="var(--info)"
              />
            </div>
            <div className="surface" style={{ padding: 20 }}>
              <Stat
                label="Usuários únicos 24h"
                value={String(list.data.stats.last_24h_unique_users)}
                sub="contas ativas no período"
              />
            </div>
          </div>

          {/* Timeline mini chart — 14 dias, signup + login */}
          <Timeline timeline={list.data.timeline} />

          {/* Recent log table */}
          <div className="surface" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', fontSize: 13, fontWeight: 500 }}>
              Eventos recentes ({list.data.logs.length})
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 1fr 100px 70px 140px 1fr 90px',
                gap: 12,
                padding: '12px 20px',
                fontSize: 11,
                fontFamily: 'var(--mono)',
                color: 'var(--muted)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: 'var(--bg-2)',
              }}
            >
              <span>Ação</span>
              <span>Email</span>
              <span>IP</span>
              <span>País</span>
              <span>Origem</span>
              <span>User-Agent</span>
              <span style={{ textAlign: 'right' }}>Quando</span>
            </div>
            {list.data.logs.length === 0 && (
              <div style={{ padding: 32, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
                Nenhum evento.
              </div>
            )}
            {list.data.logs.map((l) => (
              <div
                key={l.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 1fr 100px 70px 140px 1fr 90px',
                  gap: 12,
                  padding: '12px 20px',
                  borderTop: '1px solid var(--line)',
                  alignItems: 'center',
                  fontSize: 12,
                }}
              >
                <span
                  className="tag"
                  style={{
                    fontSize: 10,
                    color: ACTION_COLOR[l.action],
                    borderColor: ACTION_COLOR[l.action],
                    justifySelf: 'start',
                  }}
                >
                  {ACTION_LABEL[l.action]}
                </span>
                <span>
                  <div style={{ fontWeight: 500 }}>{l.email ?? '—'}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{l.user_name ?? ''}</div>
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-2)' }}>
                  {l.ip ?? '—'}
                </span>
                <span><Flag code={l.country_code} /></span>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--text-2)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={l.referer ?? ''}
                >
                  {l.referer ? new URL(l.referer, 'https://x').hostname : 'direto'}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--muted)',
                    fontFamily: 'var(--mono)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={l.user_agent ?? ''}
                >
                  {summarizeUA(l.user_agent)}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    color: 'var(--muted)',
                    textAlign: 'right',
                  }}
                  title={l.created_at}
                >
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

function Timeline({
  timeline,
}: Readonly<{ timeline: Array<{ day: string; action: AccessAction; n: number }> }>) {
  // Pivot to one bar per day with stacked signup/login.
  const days = Array.from(new Set(timeline.map((t) => t.day))).sort();
  const data = days.map((day) => {
    const signups = timeline.find((t) => t.day === day && t.action === 'signup')?.n ?? 0;
    const logins = timeline.find((t) => t.day === day && t.action === 'login')?.n ?? 0;
    return { day, signups, logins };
  });
  const max = Math.max(1, ...data.map((d) => d.signups + d.logins));

  return (
    <div className="surface" style={{ padding: 24 }}>
      <div className="t-eyebrow" style={{ marginBottom: 8 }}>Atividade · 14 dias</div>
      {data.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: 13, padding: '24px 0' }}>
          Sem dados ainda. Faça login/signup para popular.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140 }}>
            {data.map((d) => {
              const sH = (d.signups / max) * 100;
              const lH = (d.logins / max) * 100;
              return (
                <div
                  key={d.day}
                  title={`${d.day} · ${d.signups} signups · ${d.logins} logins`}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    gap: 1,
                    minHeight: 4,
                  }}
                >
                  <div style={{ background: 'var(--info)', height: `${lH}%`, borderRadius: '0 0 2px 2px' }} />
                  <div style={{ background: 'var(--edge)', height: `${sH}%`, borderRadius: '2px 2px 0 0' }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
            <span>{data[0]?.day}</span>
            <span>{data.at(-1)?.day}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: 'var(--text-2)' }}>
            <span>
              <span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--edge)', borderRadius: 2, marginRight: 6 }} />
              Cadastros
            </span>
            <span>
              <span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--info)', borderRadius: 2, marginRight: 6 }} />
              Logins
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function summarizeUA(ua: string | null): string {
  if (!ua) return '—';
  // Pick out a short browser/os hint without pulling in a UA library.
  const browser = /(Chrome|Firefox|Safari|Edge|OPR)\/(\d+)/.exec(ua);
  const os = /(Windows NT|Mac OS X|Linux|Android|iPhone|iPad)/.exec(ua);
  const parts: string[] = [];
  if (browser) parts.push(`${browser[1]} ${browser[2]}`);
  if (os) parts.push(os[1]);
  return parts.length > 0 ? parts.join(' · ') : ua.slice(0, 40);
}
