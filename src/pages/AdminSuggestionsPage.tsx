import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { SectionHeader, Stat } from '../components/atoms';
import { api, type SuggestionStatus } from '../lib/api';

const FILTERS: { key: SuggestionStatus | 'all'; label: string }[] = [
  { key: 'new', label: 'Novas' },
  { key: 'reviewed', label: 'Lidas' },
  { key: 'archived', label: 'Arquivadas' },
  { key: 'all', label: 'Todas' },
];

const STATUS_COLOR: Record<SuggestionStatus, string> = {
  new: 'var(--warn)',
  reviewed: 'var(--win)',
  archived: 'var(--muted)',
};

const STATUS_LABEL: Record<SuggestionStatus, string> = {
  new: 'Nova',
  reviewed: 'Lida',
  archived: 'Arquivada',
};

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function subDuration(days: number | null): string {
  if (days == null) return 'sem assinatura ativa';
  if (days < 1) return 'assina hoje';
  if (days < 30) return `assinante há ${days} ${days === 1 ? 'dia' : 'dias'}`;
  const months = Math.floor(days / 30);
  return `assinante há ${months} ${months === 1 ? 'mês' : 'meses'}`;
}

export function AdminSuggestionsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<SuggestionStatus | 'all'>('new');

  const list = useQuery({
    queryKey: ['admin-suggestions', filter],
    queryFn: () => api.adminListSuggestions(filter === 'all' ? undefined : filter),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: SuggestionStatus }) =>
      api.adminSetSuggestionStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-suggestions'] }),
  });

  const items = list.data ?? [];
  const isNew = items.filter((s) => s.status === 'new').length;

  return (
    <AdminLayout>
      <SectionHeader
        eyebrow="Voz do usuário"
        title="Sugestões"
        sub="Tudo que os usuários enviaram sobre como melhorar a plataforma — com plano, tempo de assinatura e banca média de quem mandou."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24, maxWidth: 420 }}>
        <div className="surface" style={{ padding: 20 }}>
          <Stat label="Nesta visão" value={String(items.length)} />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat label="Não lidas" value={String(isNew)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`btn btn-sm ${filter === f.key ? 'btn-edge' : 'btn-ghost'}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {list.isLoading && <p style={{ color: 'var(--text-2)', fontSize: 13 }}>Carregando…</p>}
      {!list.isLoading && items.length === 0 && (
        <p style={{ color: 'var(--text-2)', fontSize: 13 }}>Nenhuma sugestão nesta visão.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((s) => (
          <article key={s.id} className="surface" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 13 }}>{s.author}</strong>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.email}</span>
              <span className="tag tag-edge" style={{ fontSize: 10, textTransform: 'uppercase' }}>{s.plan}</span>
              <span style={{ fontSize: 11, color: STATUS_COLOR[s.status], marginLeft: 'auto' }}>
                {STATUS_LABEL[s.status]}
              </span>
            </div>

            <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.55, margin: 0 }}>"{s.message}"</p>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-2)' }}>
              <span>⏳ {subDuration(s.subscription_days)}</span>
              <span>💰 banca {s.bankroll_brl != null ? BRL(s.bankroll_brl) : '—'}</span>
              <span>🗓️ {new Date(s.created_at).toLocaleDateString('pt-BR')}</span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {s.status !== 'reviewed' && (
                <button
                  className="btn btn-edge btn-sm"
                  disabled={setStatus.isPending}
                  onClick={() => setStatus.mutate({ id: s.id, status: 'reviewed' })}
                >
                  Marcar como lida
                </button>
              )}
              {s.status !== 'archived' && (
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={setStatus.isPending}
                  onClick={() => setStatus.mutate({ id: s.id, status: 'archived' })}
                >
                  Arquivar
                </button>
              )}
              {s.status !== 'new' && (
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={setStatus.isPending}
                  onClick={() => setStatus.mutate({ id: s.id, status: 'new' })}
                >
                  Reabrir
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </AdminLayout>
  );
}
