import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { SectionHeader, Stat } from '../components/atoms';
import { api, type AdminCommission, type CommissionStatus } from '../lib/api';

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });

const STATUS_LABEL: Record<CommissionStatus, string> = {
  pending: 'Pendente',
  paid: 'Paga',
  cancelled: 'Cancelada',
};

const STATUS_COLOR: Record<CommissionStatus, string> = {
  pending: 'var(--warn)',
  paid: 'var(--edge)',
  cancelled: 'var(--loss)',
};

export function AdminCommissionsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<CommissionStatus | ''>('');

  const list = useQuery({
    queryKey: ['admin-commissions', filter],
    queryFn: () => api.adminListCommissions(filter ? { status: filter } : {}),
  });

  const patch = useMutation({
    mutationFn: ({ id, status }: { id: number; status: CommissionStatus }) =>
      api.adminPatchCommission(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-commissions'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const totals = (list.data ?? []).reduce(
    (acc, c) => {
      acc.count += 1;
      acc.gross += c.amount_brl;
      if (c.status === 'paid') acc.paid += c.amount_brl;
      if (c.status === 'pending') acc.pending += c.amount_brl;
      return acc;
    },
    { count: 0, gross: 0, paid: 0, pending: 0 },
  );

  return (
    <AdminLayout>
      <SectionHeader
        eyebrow="Comissões"
        title={`${totals.count} comissões registradas`}
        sub="Cada comissão é gerada quando um afiliado é cobrado em um plano pago. Quem distribui o pagamento é o gateway externo."
        action={
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as CommissionStatus | '')}
            className="input"
            style={{ width: 160, fontSize: 12 }}
          >
            <option value="">Todos status</option>
            <option value="pending">Pendentes</option>
            <option value="paid">Pagas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="surface" style={{ padding: 20 }}>
          <Stat label="A pagar" value={BRL(totals.pending)} sub="comissões pendentes" color="var(--warn)" />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat label="Pago" value={BRL(totals.paid)} sub="comissões já liquidadas" color="var(--edge)" />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat label="Total bruto" value={BRL(totals.gross)} sub="incluindo todos os status" />
        </div>
      </div>

      {list.isLoading && (
        <div style={{ padding: 48, color: 'var(--muted)', textAlign: 'center' }}>Carregando…</div>
      )}
      {list.isError && (
        <div className="surface" style={{ padding: 24, color: 'var(--loss)' }}>
          Erro: {String(list.error)}
        </div>
      )}

      {list.data && list.data.length === 0 && (
        <div className="surface" style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          Nenhuma comissão{filter ? ` com status "${filter}"` : ''}.
        </div>
      )}

      {list.data && list.data.length > 0 && (
        <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 100px 80px 100px 120px 100px 140px',
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
            <span>Afiliado</span>
            <span>Convidado</span>
            <span style={{ textAlign: 'right' }}>Base</span>
            <span style={{ textAlign: 'right' }}>%</span>
            <span style={{ textAlign: 'right' }}>Comissão</span>
            <span>Status</span>
            <span>Data</span>
            <span style={{ textAlign: 'right' }}>Ações</span>
          </div>
          {list.data.map((c: AdminCommission) => (
            <div
              key={c.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 100px 80px 100px 120px 100px 140px',
                gap: 12,
                padding: '12px 20px',
                borderTop: '1px solid var(--line)',
                alignItems: 'center',
                fontSize: 13,
              }}
            >
              <Link
                to={`/admin/usuarios/${c.affiliate_user_id}`}
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                <div style={{ fontWeight: 500 }}>{c.affiliate_email}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.affiliate_name || '—'}</div>
              </Link>
              <Link
                to={`/admin/usuarios/${c.beneficiary_user_id}`}
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                <div style={{ fontWeight: 500 }}>{c.beneficiary_email}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.beneficiary_name || '—'}</div>
              </Link>
              <span style={{ fontFamily: 'var(--mono)', textAlign: 'right' }}>{BRL(c.base_amount_brl)}</span>
              <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', color: 'var(--text-2)' }}>{c.pct_used}%</span>
              <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', fontWeight: 600, color: 'var(--edge)' }}>
                {BRL(c.amount_brl)}
              </span>
              <span
                className="tag"
                style={{
                  fontSize: 10,
                  color: STATUS_COLOR[c.status],
                  borderColor: STATUS_COLOR[c.status],
                  justifySelf: 'start',
                }}
              >
                {STATUS_LABEL[c.status]}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
                {c.created_at.slice(0, 10)}
              </span>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                {c.status === 'pending' && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => patch.mutate({ id: c.id, status: 'paid' })}
                  >
                    Marcar paga
                  </button>
                )}
                {c.status !== 'cancelled' && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => patch.mutate({ id: c.id, status: 'cancelled' })}
                    style={{ color: 'var(--loss)' }}
                  >
                    Cancelar
                  </button>
                )}
                {c.status === 'cancelled' && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => patch.mutate({ id: c.id, status: 'pending' })}
                  >
                    Reabrir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
