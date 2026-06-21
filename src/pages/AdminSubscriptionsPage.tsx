import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { SectionHeader } from '../components/atoms';
import {
  api,
  type AdminSub,
  type BillingCycle,
  type Plan,
  type SubStatus,
} from '../lib/api';

const STATUS_LABEL: Record<SubStatus, string> = {
  active: 'Ativa',
  cancelled: 'Cancelada',
  expired: 'Expirada',
  trialing: 'Trial',
};

const STATUS_COLOR: Record<SubStatus, string> = {
  active: 'var(--edge)',
  cancelled: 'var(--loss)',
  expired: 'var(--muted)',
  trialing: 'var(--warn)',
};

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function AdminSubscriptionsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<SubStatus | ''>('');
  const [planFilter, setPlanFilter] = useState<Plan | ''>('');
  const [showForm, setShowForm] = useState(false);

  const list = useQuery({
    queryKey: ['admin-subs', statusFilter, planFilter],
    queryFn: () =>
      api.adminListSubs({
        status: statusFilter || undefined,
        plan: planFilter || undefined,
      }),
  });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Parameters<typeof api.adminPatchSub>[1] }) =>
      api.adminPatchSub(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-subs'] }),
  });

  const del = useMutation({
    mutationFn: (id: number) => api.adminDeleteSub(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-subs'] }),
  });

  return (
    <AdminLayout>
      <SectionHeader
        eyebrow="Assinaturas"
        title={list.data ? `${list.data.length} assinaturas` : 'Assinaturas'}
        sub="Histórico completo. Cancele, prorrogue ou crie manualmente (grant)."
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SubStatus | '')}
              className="input"
              style={{ width: 140, fontSize: 12 }}
            >
              <option value="">Todos status</option>
              <option value="active">Ativa</option>
              <option value="cancelled">Cancelada</option>
              <option value="expired">Expirada</option>
              <option value="trialing">Trial</option>
            </select>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value as Plan | '')}
              className="input"
              style={{ width: 140, fontSize: 12 }}
            >
              <option value="">Todos planos</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="founders">Founders</option>
            </select>
            <button className="btn btn-edge btn-sm" onClick={() => setShowForm((s) => !s)}>
              {showForm ? 'Fechar' : '+ Nova assinatura'}
            </button>
          </div>
        }
      />

      {showForm && (
        <CreateSubForm
          onCreated={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ['admin-subs'] });
            qc.invalidateQueries({ queryKey: ['admin-stats'] });
          }}
        />
      )}

      {list.isLoading && <div style={{ padding: 48, color: 'var(--muted)' }}>Carregando…</div>}
      {list.isError && (
        <div className="surface" style={{ padding: 24, color: 'var(--loss)' }}>
          Erro: {String(list.error)}
        </div>
      )}

      {list.data && (
        <div className="surface" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 90px 100px 100px 100px 140px 200px',
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
            <span>Usuário</span>
            <span>Plano</span>
            <span>Status</span>
            <span>Ciclo</span>
            <span style={{ textAlign: 'right' }}>Valor</span>
            <span>Período</span>
            <span style={{ textAlign: 'right' }}>Ações</span>
          </div>
          {list.data.map((s: AdminSub) => (
            <div
              key={s.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 90px 100px 100px 100px 140px 200px',
                gap: 12,
                padding: '14px 20px',
                alignItems: 'center',
                borderTop: '1px solid var(--line)',
                fontSize: 13,
              }}
            >
              <div>
                <div style={{ fontWeight: 500 }}>{s.user_email}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  #{s.id} · {s.user_name || '—'}
                </div>
              </div>
              <span style={{ textTransform: 'capitalize', fontSize: 12 }}>{s.plan}</span>
              <span
                className="tag"
                style={{
                  fontSize: 10,
                  color: STATUS_COLOR[s.status],
                  borderColor: STATUS_COLOR[s.status],
                }}
              >
                {STATUS_LABEL[s.status]}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.billing_cycle ?? '—'}</span>
              <span style={{ fontFamily: 'var(--mono)', textAlign: 'right' }}>
                {BRL(s.amount_brl)}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
                {s.period_start.slice(0, 10)} → {s.period_end?.slice(0, 10) || '∞'}
              </span>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                {s.status === 'active' && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => patch.mutate({ id: s.id, body: { status: 'cancelled' } })}
                  >
                    Cancelar
                  </button>
                )}
                {s.status !== 'active' && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => patch.mutate({ id: s.id, body: { status: 'active' } })}
                  >
                    Reativar
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    if (confirm(`Apagar assinatura #${s.id}?`)) del.mutate(s.id);
                  }}
                  style={{ color: 'var(--loss)' }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

function CreateSubForm({ onCreated }: { onCreated: () => void }) {
  const [userId, setUserId] = useState('');
  const [plan, setPlan] = useState<Plan>('pro');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [amount, setAmount] = useState('49');
  const [periodEnd, setPeriodEnd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.adminCreateSub({
        user_id: Number(userId),
        plan,
        billing_cycle: cycle,
        amount_brl: Number(amount) || 0,
        period_end: periodEnd || null,
        payment_method: 'manual',
      });
      onCreated();
    } catch (e2) {
      setError((e2 as Error).message || 'Falha ao criar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="surface" style={{ padding: 20, marginTop: 16, marginBottom: 8 }}>
      <div className="t-eyebrow" style={{ marginBottom: 12 }}>Nova assinatura (admin grant)</div>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 120px 140px 120px 1fr auto', gap: 12, alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="t-eyebrow">User ID</span>
          <input className="input" value={userId} onChange={(e) => setUserId(e.target.value)} required type="number" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="t-eyebrow">Plano</span>
          <select className="input" value={plan} onChange={(e) => setPlan(e.target.value as Plan)}>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="founders">Founders</option>
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="t-eyebrow">Ciclo</span>
          <select className="input" value={cycle} onChange={(e) => setCycle(e.target.value as BillingCycle)}>
            <option value="monthly">monthly</option>
            <option value="yearly">yearly</option>
            <option value="lifetime">lifetime</option>
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="t-eyebrow">Valor (R$)</span>
          <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="t-eyebrow">Fim do período</span>
          <input className="input" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} type="date" />
        </label>
        <button type="submit" className="btn btn-edge btn-sm" disabled={saving}>
          {saving ? 'Salvando…' : 'Criar'}
        </button>
      </div>
      {error && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--loss)' }}>{error}</div>
      )}
    </form>
  );
}
