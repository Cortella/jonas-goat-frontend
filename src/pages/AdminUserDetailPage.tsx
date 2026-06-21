import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { SectionHeader, Stat } from '../components/atoms';
import { api, type AdminCommission, type AdminUser, type Plan } from '../lib/api';

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });

const PLAN_LABEL: Record<Plan, string> = { free: 'Free', pro: 'Pro', founders: 'Founders' };

const STATUS_COLOR: Record<AdminCommission['status'], string> = {
  pending: 'var(--warn)',
  paid: 'var(--edge)',
  cancelled: 'var(--loss)',
};

export function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);
  const qc = useQueryClient();

  const userQ = useQuery({
    queryKey: ['admin-user', userId],
    queryFn: () => api.adminUserDetail(userId),
    enabled: Number.isFinite(userId),
  });
  const affQ = useQuery({
    queryKey: ['admin-user-aff', userId],
    queryFn: () => api.adminUserAffiliates(userId),
    enabled: Number.isFinite(userId),
  });
  const comQ = useQuery({
    queryKey: ['admin-user-com', userId],
    queryFn: () => api.adminUserCommissions(userId),
    enabled: Number.isFinite(userId),
  });

  const patch = useMutation({
    mutationFn: (body: Parameters<typeof api.adminPatchUser>[1]) =>
      api.adminPatchUser(userId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', userId] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const [override, setOverride] = useState<string>('');
  useEffect(() => {
    if (userQ.data) {
      setOverride(
        userQ.data.affiliate_pct_override == null
          ? ''
          : String(userQ.data.affiliate_pct_override),
      );
    }
  }, [userQ.data]);

  const saveOverride = () => {
    const v = override.trim();
    if (v === '') {
      patch.mutate({ affiliate_pct_override: null });
    } else {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0 && n <= 100) {
        patch.mutate({ affiliate_pct_override: n });
      }
    }
  };

  return (
    <AdminLayout>
      <SectionHeader
        eyebrow="Detalhe do usuário"
        title={userQ.data?.email ?? 'Carregando…'}
        sub={
          userQ.data
            ? `Cadastrado em ${userQ.data.created_at?.slice(0, 10)} · plano ${PLAN_LABEL[userQ.data.plan]}`
            : undefined
        }
        action={
          <Link to="/admin/usuarios" className="btn btn-ghost btn-sm">
            ← Voltar
          </Link>
        }
      />

      {userQ.isError && (
        <div className="surface" style={{ padding: 24, color: 'var(--loss)' }}>
          {String(userQ.error)}
        </div>
      )}

      {userQ.data && (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            <div className="surface" style={{ padding: 20 }}>
              <Stat
                label="Plano"
                value={PLAN_LABEL[userQ.data.plan]}
                sub={userQ.data.is_admin ? 'admin' : 'usuário regular'}
              />
            </div>
            <div className="surface" style={{ padding: 20 }}>
              <Stat
                label="Comissão %"
                value={`${userQ.data.effective_pct}%`}
                sub={
                  userQ.data.affiliate_pct_override != null
                    ? 'customizada'
                    : 'usando padrão'
                }
                color="var(--edge)"
              />
            </div>
            <div className="surface" style={{ padding: 20 }}>
              <Stat
                label="Convidados"
                value={String(userQ.data.affiliates_count)}
                sub={userQ.data.sponsor_email ? `convidado por ${userQ.data.sponsor_email}` : 'sem indicador'}
              />
            </div>
            <div className="surface" style={{ padding: 20 }}>
              <Stat
                label="Total ganho"
                value={BRL(userQ.data.total_commissions_brl)}
                sub="comissões acumuladas"
                color="var(--edge)"
              />
            </div>
          </div>

          {/* Override editor */}
          <div className="surface" style={{ padding: 24, marginBottom: 24 }}>
            <div className="t-eyebrow" style={{ marginBottom: 8 }}>Comissão customizada</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
              Defina uma porcentagem específica para este usuário. Vazio = usar padrão global.
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input
                type="number"
                step={0.1}
                min={0}
                max={100}
                value={override}
                onChange={(e) => setOverride(e.target.value)}
                className="input"
                placeholder={`padrão: ${userQ.data.effective_pct}%`}
                style={{ maxWidth: 160, fontFamily: 'var(--mono)' }}
              />
              <button
                type="button"
                className="btn btn-edge btn-sm"
                onClick={saveOverride}
                disabled={patch.isPending}
              >
                {patch.isPending ? 'Salvando…' : 'Salvar'}
              </button>
              {userQ.data.affiliate_pct_override != null && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setOverride('');
                    patch.mutate({ affiliate_pct_override: null });
                  }}
                >
                  Remover override
                </button>
              )}
            </div>
          </div>

          {/* Affiliates */}
          <div className="surface" style={{ padding: 0, marginBottom: 24, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', fontSize: 13, fontWeight: 500 }}>
              Afiliados deste usuário ({affQ.data?.length ?? 0})
            </div>
            {!affQ.data || affQ.data.length === 0 ? (
              <div style={{ padding: 24, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
                Sem afiliados.
              </div>
            ) : (
              affQ.data.map((u: AdminUser) => (
                <Link
                  key={u.id}
                  to={`/admin/usuarios/${u.id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 100px 120px 140px',
                    gap: 12,
                    padding: '12px 20px',
                    borderTop: '1px solid var(--line)',
                    alignItems: 'center',
                    fontSize: 13,
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{u.email}</span>
                  <span className="tag" style={{ fontSize: 10, justifySelf: 'start', textTransform: 'capitalize' }}>
                    {u.plan}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-2)' }}>
                    {u.active_subscription
                      ? `${BRL(u.active_subscription.amount_brl)}/${u.active_subscription.billing_cycle ?? '—'}`
                      : 'sem cobrança'}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
                    {u.created_at?.slice(0, 10)}
                  </span>
                </Link>
              ))
            )}
          </div>

          {/* Commissions */}
          <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', fontSize: 13, fontWeight: 500 }}>
              Comissões ({comQ.data?.length ?? 0})
            </div>
            {!comQ.data || comQ.data.length === 0 ? (
              <div style={{ padding: 24, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
                Nenhuma comissão registrada.
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 100px 80px 100px 120px 120px',
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
                  <span>Convidado</span>
                  <span style={{ textAlign: 'right' }}>Base</span>
                  <span style={{ textAlign: 'right' }}>%</span>
                  <span style={{ textAlign: 'right' }}>Comissão</span>
                  <span>Status</span>
                  <span>Data</span>
                </div>
                {comQ.data.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 100px 80px 100px 120px 120px',
                      gap: 12,
                      padding: '12px 20px',
                      borderTop: '1px solid var(--line)',
                      alignItems: 'center',
                      fontSize: 13,
                    }}
                  >
                    <span>{c.beneficiary_email}</span>
                    <span style={{ fontFamily: 'var(--mono)', textAlign: 'right' }}>{BRL(c.base_amount_brl)}</span>
                    <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', color: 'var(--text-2)' }}>{c.pct_used}%</span>
                    <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', fontWeight: 600, color: 'var(--edge)' }}>
                      {BRL(c.amount_brl)}
                    </span>
                    <span
                      className="tag"
                      style={{ fontSize: 10, color: STATUS_COLOR[c.status], borderColor: STATUS_COLOR[c.status], justifySelf: 'start' }}
                    >
                      {c.status}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
                      {c.created_at.slice(0, 10)}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
