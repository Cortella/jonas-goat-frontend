import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { SectionHeader, Stat } from '../components/atoms';
import { api, type AdminOrder, type OrderStatus } from '../lib/api';

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pendente',
  awaiting_payment: 'Aguardando',
  paid: 'Pago',
  failed: 'Falhou',
  cancelled: 'Cancelado',
  refunded: 'Estornado',
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: 'var(--muted)',
  awaiting_payment: 'var(--warn)',
  paid: 'var(--edge)',
  failed: 'var(--loss)',
  cancelled: 'var(--muted)',
  refunded: 'var(--info)',
};

const METHOD_LABEL: Record<string, string> = {
  pix: 'Pix',
  pix_recurring: 'Pix recorrente',
  card: 'Cartão',
};

export function AdminOrdersPage() {
  const [tab, setTab] = useState<'orders' | 'credits'>('orders');
  return (
    <AdminLayout>
      <SectionHeader
        eyebrow="Checkout"
        title="Pedidos e créditos"
        sub="Pedidos do checkout, confirmação manual e carteiras de crédito."
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={tab === 'orders' ? 'btn btn-edge btn-sm' : 'btn btn-ghost btn-sm'} onClick={() => setTab('orders')}>
              Pedidos
            </button>
            <button className={tab === 'credits' ? 'btn btn-edge btn-sm' : 'btn btn-ghost btn-sm'} onClick={() => setTab('credits')}>
              Créditos
            </button>
          </div>
        }
      />
      {tab === 'orders' ? <OrdersTab /> : <CreditsTab />}
    </AdminLayout>
  );
}

function OrdersTab() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState('');
  const list = useQuery({
    queryKey: ['admin-orders', status, kind],
    queryFn: () => api.adminListOrders({ status: status || undefined, kind: kind || undefined }),
  });

  const patch = useMutation({
    mutationFn: ({ id, s }: { id: number; s: OrderStatus }) => api.adminPatchOrder(id, { status: s }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  return (
    <>
      {list.data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
          <div className="surface" style={{ padding: 16 }}>
            <Stat label="Pedidos pagos" value={list.data.stats.paid_count} />
          </div>
          <div className="surface" style={{ padding: 16 }}>
            <Stat label="Receita (pedidos)" value={BRL(list.data.stats.paid_total_brl)} color="var(--edge)" />
          </div>
          <div className="surface" style={{ padding: 16 }}>
            <Stat label="Aguardando" value={list.data.stats.pending_count} color="var(--warn)" />
          </div>
          <div className="surface" style={{ padding: 16 }}>
            <Stat label="Créditos emitidos" value={BRL(list.data.stats.credits_issued_brl)} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select className="input" style={{ width: 160, fontSize: 12 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos status</option>
          {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <select className="input" style={{ width: 140, fontSize: 12 }} value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">Todos tipos</option>
          <option value="plan">Plano</option>
          <option value="credits">Créditos</option>
        </select>
      </div>

      {list.isLoading && <div style={{ padding: 32, color: 'var(--muted)' }}>Carregando…</div>}
      {list.data && (
        <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 90px 110px 110px 100px 220px',
              gap: 12,
              padding: '12px 18px',
              fontSize: 11,
              fontFamily: 'var(--mono)',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              background: 'var(--bg-2)',
            }}
          >
            <span>Cliente</span>
            <span>Tipo</span>
            <span>Método</span>
            <span>Status</span>
            <span style={{ textAlign: 'right' }}>Valor</span>
            <span style={{ textAlign: 'right' }}>Ações</span>
          </div>
          {list.data.orders.map((o: AdminOrder) => (
            <div
              key={o.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 90px 110px 110px 100px 220px',
                gap: 12,
                padding: '14px 18px',
                alignItems: 'center',
                borderTop: '1px solid var(--line)',
                fontSize: 13,
              }}
            >
              <div>
                <div style={{ fontWeight: 500 }}>{o.user_email}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  #{o.id} · {o.plan ? `plano ${o.plan}` : 'créditos'}
                  {o.discount_reason ? ` · ${o.discount_reason}` : ''}
                </div>
              </div>
              <span style={{ fontSize: 12, textTransform: 'capitalize' }}>{o.kind === 'plan' ? 'Plano' : 'Créditos'}</span>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{METHOD_LABEL[o.payment_method] ?? o.payment_method}</span>
              <span className="tag" style={{ fontSize: 10, color: STATUS_COLOR[o.status], borderColor: STATUS_COLOR[o.status] }}>
                {STATUS_LABEL[o.status]}
              </span>
              <span style={{ fontFamily: 'var(--mono)', textAlign: 'right' }}>{BRL(o.amount_brl)}</span>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {(o.status === 'awaiting_payment' || o.status === 'pending') && (
                  <button className="btn btn-ghost btn-sm" onClick={() => patch.mutate({ id: o.id, s: 'paid' })}>
                    Confirmar
                  </button>
                )}
                {(o.status === 'awaiting_payment' || o.status === 'pending') && (
                  <button className="btn btn-ghost btn-sm" onClick={() => patch.mutate({ id: o.id, s: 'cancelled' })}>
                    Cancelar
                  </button>
                )}
                {o.status === 'paid' && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--loss)' }}
                    onClick={() => { if (confirm(`Estornar pedido #${o.id}?`)) patch.mutate({ id: o.id, s: 'refunded' }); }}
                  >
                    Estornar
                  </button>
                )}
              </div>
            </div>
          ))}
          {list.data.orders.length === 0 && (
            <div style={{ padding: 24, color: 'var(--muted)', borderTop: '1px solid var(--line)' }}>Nenhum pedido.</div>
          )}
        </div>
      )}
    </>
  );
}

function CreditsTab() {
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ['admin-credits'], queryFn: api.adminCredits });
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const adjust = useMutation({
    mutationFn: () => api.adminAdjustCredits({ user_id: Number(userId), amount_brl: Number(amount), reason }),
    onSuccess: (r) => {
      setMsg(`Saldo atualizado: ${BRL(r.balance_brl)}`);
      setUserId(''); setAmount(''); setReason('');
      qc.invalidateQueries({ queryKey: ['admin-credits'] });
    },
    onError: (e) => setMsg((e as Error).message),
  });

  return (
    <>
      {data.data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 16 }}>
          <div className="surface" style={{ padding: 16 }}>
            <Stat label="Saldo em circulação" value={BRL(data.data.total_outstanding_brl)} />
          </div>
          <div className="surface" style={{ padding: 16 }}>
            <Stat label="Carteiras com saldo" value={data.data.wallets_with_balance} />
          </div>
        </div>
      )}

      <form
        className="surface"
        style={{ padding: 20, marginBottom: 16 }}
        onSubmit={(e) => { e.preventDefault(); setMsg(null); adjust.mutate(); }}
      >
        <div className="t-eyebrow" style={{ marginBottom: 12 }}>Ajuste manual de saldo</div>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 140px 1fr auto', gap: 12, alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="t-eyebrow">User ID</span>
            <input className="input" type="number" value={userId} onChange={(e) => setUserId(e.target.value)} required />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="t-eyebrow">Valor (R$, ±)</span>
            <input className="input" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="t-eyebrow">Motivo</span>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} required />
          </label>
          <button type="submit" className="btn btn-edge btn-sm" disabled={adjust.isPending}>
            {adjust.isPending ? '…' : 'Aplicar'}
          </button>
        </div>
        {msg && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-2)' }}>{msg}</div>}
      </form>

      {data.data && (
        <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', textTransform: 'uppercase', background: 'var(--bg-2)' }}>
            Movimentos recentes
          </div>
          {data.data.recent_transactions.map((t) => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid var(--line)', fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 500 }}>{t.email}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.reason || t.kind} · {new Date(t.created_at).toLocaleString('pt-BR')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--mono)', color: t.amount_brl >= 0 ? 'var(--edge)' : 'var(--loss)' }}>
                  {t.amount_brl >= 0 ? '+' : ''}{BRL(t.amount_brl)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>saldo {BRL(t.balance_after)}</div>
              </div>
            </div>
          ))}
          {data.data.recent_transactions.length === 0 && (
            <div style={{ padding: 24, color: 'var(--muted)', borderTop: '1px solid var(--line)' }}>Sem movimentos.</div>
          )}
        </div>
      )}
    </>
  );
}
