import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { SectionHeader, Stat } from '../components/atoms';
import { api, type ReviewStatus } from '../lib/api';

const FILTERS: { key: ReviewStatus | 'all'; label: string }[] = [
  { key: 'pending', label: 'Pendentes' },
  { key: 'approved', label: 'Aprovadas' },
  { key: 'rejected', label: 'Rejeitadas' },
  { key: 'all', label: 'Todas' },
];

const STATUS_COLOR: Record<ReviewStatus, string> = {
  pending: 'var(--warn)',
  approved: 'var(--win)',
  rejected: 'var(--loss)',
};

const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
};

function Stars({ value }: Readonly<{ value: number }>) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={14} height={14} viewBox="0 0 24 24" fill={n <= value ? 'var(--warn)' : 'none'} stroke="var(--warn)" strokeWidth="1.5">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

export function AdminReviewsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<ReviewStatus | 'all'>('pending');

  const list = useQuery({
    queryKey: ['admin-reviews', filter],
    queryFn: () => api.adminListReviews(filter === 'all' ? undefined : filter),
  });

  const moderate = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'approve' | 'reject' }) =>
      api.adminModerateReview(id, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-reviews'] });
      qc.invalidateQueries({ queryKey: ['reviews'] });
    },
  });

  const items = list.data ?? [];
  const pending = items.filter((r) => r.status === 'pending').length;

  return (
    <AdminLayout>
      <SectionHeader
        eyebrow="Reputação"
        title="Avaliações"
        sub="Modere as avaliações dos assinantes. Só as aprovadas aparecem na landing e contam no rating do Google."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24, maxWidth: 420 }}>
        <div className="surface" style={{ padding: 20 }}>
          <Stat label="Nesta visão" value={String(items.length)} />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat label="Aguardando moderação" value={String(pending)} />
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
        <p style={{ color: 'var(--text-2)', fontSize: 13 }}>Nenhuma avaliação nesta visão.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((r) => (
          <article key={r.id} className="surface" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Stars value={r.rating} />
              <strong style={{ fontSize: 13 }}>{r.author}</strong>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.email}</span>
              <span style={{ fontSize: 11, color: STATUS_COLOR[r.status], marginLeft: 'auto' }}>
                {STATUS_LABEL[r.status]}
              </span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.55, margin: 0 }}>"{r.comment}"</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {r.status !== 'approved' && (
                <button
                  className="btn btn-edge btn-sm"
                  disabled={moderate.isPending}
                  onClick={() => moderate.mutate({ id: r.id, action: 'approve' })}
                >
                  Aprovar
                </button>
              )}
              {r.status !== 'rejected' && (
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={moderate.isPending}
                  onClick={() => moderate.mutate({ id: r.id, action: 'reject' })}
                >
                  Rejeitar
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </AdminLayout>
  );
}
