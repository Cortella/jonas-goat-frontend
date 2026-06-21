import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { SectionHeader } from '../components/atoms';
import {
  api,
  type AdminUser,
  type AdminUsersFilters,
  type BoolFilter,
  type Plan,
} from '../lib/api';

const PLAN_LABEL: Record<Plan, string> = { free: 'Free', pro: 'Pro', founders: 'Founders' };

const PLAN_TAG: Record<Plan, { background: string; color: string }> = {
  free: { background: 'var(--surface)', color: 'var(--text-2)' },
  pro: { background: 'var(--edge-soft)', color: 'var(--edge)' },
  founders: { background: 'oklch(0.82 0.15 80 / 0.15)', color: 'var(--warn)' },
};

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function AdminUsersPage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<AdminUsersFilters>({});

  const list = useQuery({
    queryKey: ['admin-users', filters],
    queryFn: () => api.adminUsers(filters),
  });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Parameters<typeof api.adminPatchUser>[1] }) =>
      api.adminPatchUser(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const set = <K extends keyof AdminUsersFilters>(k: K, v: AdminUsersFilters[K]) =>
    setFilters((s) => ({ ...s, [k]: v }));

  return (
    <AdminLayout>
      <SectionHeader
        eyebrow="Usuários"
        title={list.data ? `${list.data.length} contas` : 'Usuários'}
        sub="Busque por email/nome/código de afiliado, filtre por plano, indicador, override de comissão."
      />

      <div className="surface" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12 }}>
          <input
            className="input"
            placeholder="Buscar por email, nome ou código…"
            value={filters.q ?? ''}
            onChange={(e) => set('q', e.target.value)}
          />
          <select
            className="input"
            value={filters.plan ?? ''}
            onChange={(e) => set('plan', e.target.value as Plan | '')}
          >
            <option value="">Todos planos</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="founders">Founders</option>
          </select>
          <select
            className="input"
            value={filters.is_admin ?? ''}
            onChange={(e) => set('is_admin', e.target.value as BoolFilter)}
          >
            <option value="">Admin: todos</option>
            <option value="true">Apenas admins</option>
            <option value="false">Não-admins</option>
          </select>
          <select
            className="input"
            value={filters.has_sponsor ?? ''}
            onChange={(e) => set('has_sponsor', e.target.value as BoolFilter)}
          >
            <option value="">Indicador: todos</option>
            <option value="true">Tem indicador</option>
            <option value="false">Sem indicador</option>
          </select>
          <select
            className="input"
            value={filters.has_override ?? ''}
            onChange={(e) => set('has_override', e.target.value as BoolFilter)}
          >
            <option value="">Comissão: todos</option>
            <option value="true">Com override</option>
            <option value="false">Padrão</option>
          </select>
        </div>
      </div>

      {list.isLoading && <div style={{ padding: 48, color: 'var(--muted)' }}>Carregando…</div>}
      {list.isError && (
        <div className="surface" style={{ padding: 24, color: 'var(--loss)' }}>
          Erro: {String(list.error)}
        </div>
      )}

      {list.data && (
        <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 90px 70px 110px 90px 100px 80px 110px 180px',
              gap: 10,
              padding: '12px 20px',
              fontSize: 11,
              fontFamily: 'var(--mono)',
              color: 'var(--muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              background: 'var(--bg-2)',
            }}
          >
            <span>Email</span>
            <span>Plano</span>
            <span>Admin</span>
            <span>Código</span>
            <span style={{ textAlign: 'right' }}>Aff #</span>
            <span style={{ textAlign: 'right' }}>Ganho</span>
            <span style={{ textAlign: 'right' }}>%</span>
            <span>Indicador</span>
            <span style={{ textAlign: 'right' }}>Ações</span>
          </div>
          {list.data.length === 0 && (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
              Nenhum usuário com esses filtros.
            </div>
          )}
          {list.data.map((u: AdminUser) => (
            <div
              key={u.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 90px 70px 110px 90px 100px 80px 110px 180px',
                gap: 10,
                padding: '14px 20px',
                alignItems: 'center',
                borderTop: '1px solid var(--line)',
                fontSize: 13,
              }}
            >
              <Link
                to={`/admin/usuarios/${u.id}`}
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                <div style={{ fontWeight: 500 }}>{u.email}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{u.name || '—'}</div>
              </Link>
              <span
                className="tag"
                style={{
                  fontSize: 10,
                  justifySelf: 'start',
                  background: PLAN_TAG[u.plan].background,
                  color: PLAN_TAG[u.plan].color,
                }}
              >
                {PLAN_LABEL[u.plan]}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                {u.is_admin ? '✓' : '—'}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-2)' }}>
                {u.affiliate_code}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, textAlign: 'right' }}>
                {u.affiliates_count}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, textAlign: 'right', color: 'var(--edge)' }}>
                {u.total_commissions_brl > 0 ? BRL(u.total_commissions_brl) : '—'}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, textAlign: 'right' }}>
                {u.affiliate_pct_override == null ? '—' : `${u.affiliate_pct_override}%`}
              </span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{u.sponsor_email ?? '—'}</span>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <select
                  value={u.plan}
                  onChange={(e) => patch.mutate({ id: u.id, body: { plan: e.target.value as Plan } })}
                  className="input"
                  style={{ width: 80, fontSize: 11, padding: '4px 6px' }}
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="founders">Founders</option>
                </select>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => patch.mutate({ id: u.id, body: { is_admin: !u.is_admin } })}
                  title={u.is_admin ? 'Remover admin' : 'Promover'}
                >
                  {u.is_admin ? '↓' : '↑'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
