import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { SectionHeader, Stat } from '../components/atoms';
import { api, type AdminStats } from '../lib/api';

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const PCT = (v: number) => `${(v * 100).toFixed(1)}%`;

export function AdminDashboardPage() {
  const q = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.adminStats() });

  return (
    <AdminLayout>
      <SectionHeader
        eyebrow="Painel de controle"
        title="Visão geral · vendas, usuários e churn."
        sub="Atualiza em tempo real a partir do banco. Útil para acompanhar MRR, signups e renovações."
      />

      {q.isLoading && <div style={{ padding: 48, color: 'var(--muted)' }}>Carregando…</div>}
      {q.isError && (
        <div className="surface" style={{ padding: 24, color: 'var(--loss)' }}>
          Erro: {String(q.error)}
        </div>
      )}
      {q.data && <DashboardBody stats={q.data} />}
    </AdminLayout>
  );
}

function DashboardBody({ stats }: { stats: AdminStats }) {
  const planColors: Record<string, string> = {
    free: 'var(--text-2)',
    pro: 'var(--edge)',
    founders: 'var(--warn)',
  };
  const totalUsers = stats.total_users || 1;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="surface" style={{ padding: 20 }}>
          <Stat label="MRR" value={BRL(stats.mrr_brl)} sub="receita mensal recorrente" color="var(--edge)" />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat label="ARR" value={BRL(stats.arr_brl)} sub="MRR × 12" />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat label="Receita acumulada" value={BRL(stats.gross_revenue_brl)} sub="todas as assinaturas pagas" />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat label="Usuários" value={String(stats.total_users)} sub={`+${stats.new_users_30d} nos últimos 30d`} />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat label="Churn 30d" value={PCT(stats.churn_rate_30d)} sub="cancelados / ativos" color={stats.churn_rate_30d > 0.05 ? 'var(--loss)' : 'var(--text)'} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Plan distribution */}
        <div className="surface" style={{ padding: 24 }}>
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Usuários por plano</div>
          <h3 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 16px' }}>
            {stats.total_users} contas no total
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stats.users_by_plan.map((p) => (
              <div key={p.plan}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ textTransform: 'capitalize' }}>{p.plan}</span>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-2)' }}>
                    {p.n} · {((p.n / totalUsers) * 100).toFixed(1)}%
                  </span>
                </div>
                <div style={{ background: 'var(--bg-2)', height: 8, borderRadius: 999, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(p.n / totalUsers) * 100}%`,
                      background: planColors[p.plan] || 'var(--text-2)',
                      height: '100%',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active subs by plan */}
        <div className="surface" style={{ padding: 24 }}>
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Assinaturas ativas</div>
          <h3 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 16px' }}>
            {stats.active_subscriptions} assinaturas em vigor
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stats.active_subs_by_plan.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>Sem dados ainda.</div>
            )}
            {stats.active_subs_by_plan.map((p) => {
              const price = stats.pricing[p.plan];
              const monthly = price?.monthly ?? 0;
              return (
                <div
                  key={p.plan}
                  style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px', gap: 12, alignItems: 'center', fontSize: 13 }}
                >
                  <span style={{ textTransform: 'capitalize' }}>{p.plan}</span>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-2)' }}>
                    {p.n} × {BRL(monthly)}/mês = {BRL(p.n * monthly)}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', fontWeight: 500 }}>{p.n}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Charts: signups + revenue */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <DailyBars title="Cadastros · 30 dias" data={stats.signups_30d.map((d) => ({ day: d.day, value: d.n }))} format={(v) => String(v)} />
        <DailyBars
          title="Receita · 90 dias"
          data={stats.revenue_90d.map((d) => ({ day: d.day, value: d.total }))}
          format={BRL}
        />
      </div>
    </>
  );
}

function DailyBars({
  title,
  data,
  format,
}: {
  title: string;
  data: Array<{ day: string; value: number }>;
  format: (v: number) => string;
}) {
  const max = data.reduce((m, d) => Math.max(m, d.value), 0) || 1;
  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="surface" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div>
          <div className="t-eyebrow">{title}</div>
          <div style={{ fontSize: 18, fontWeight: 500, marginTop: 4 }}>{format(total)} total</div>
        </div>
      </div>
      {data.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: 12, padding: '24px 0' }}>Sem dados para o período.</div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 160 }}>
          {data.map((d) => (
            <div
              key={d.day}
              title={`${d.day} · ${format(d.value)}`}
              style={{
                flex: 1,
                background: d.value > 0 ? 'var(--edge)' : 'var(--surface-2)',
                opacity: d.value > 0 ? 0.6 + (d.value / max) * 0.4 : 0.3,
                height: `${Math.max(2, (d.value / max) * 100)}%`,
                borderRadius: 2,
                minHeight: 2,
              }}
            />
          ))}
        </div>
      )}
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
        <span>{data[0]?.day || '—'}</span>
        <span>{data[data.length - 1]?.day || '—'}</span>
      </div>
    </div>
  );
}
