import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { SectionHeader, Stat } from '../components/atoms';
import {
  api,
  type AdminNotification,
  type NotificationPriority,
  type NotificationSource,
  type SendNotificationBody,
} from '../lib/api';

const SOURCE_LABEL: Record<NotificationSource, string> = {
  admin: 'Admin',
  commit: 'Commit',
  system: 'Sistema',
};

const SOURCE_COLOR: Record<NotificationSource, string> = {
  admin: 'var(--text-2)',
  commit: 'var(--edge)',
  system: 'var(--info)',
};

const PRIORITY_COLOR: Record<NotificationPriority, string> = {
  normal: 'var(--text-2)',
  urgent: 'var(--loss)',
};

export function AdminNotificationsPage() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => api.adminListNotifications(),
  });

  const send = useMutation({
    mutationFn: (body: SendNotificationBody) => api.adminSendNotification(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.adminDeleteNotification(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const items = list.data ?? [];
  const totals = items.reduce(
    (acc, n) => {
      acc.total += 1;
      if (n.priority === 'urgent') acc.urgent += 1;
      if (n.source === 'commit') acc.commit += 1;
      acc.reads += n.read_count;
      return acc;
    },
    { total: 0, urgent: 0, commit: 0, reads: 0 },
  );

  return (
    <AdminLayout>
      <SectionHeader
        eyebrow="Comunicação"
        title={`${totals.total} notificações enviadas`}
        sub="Envie comunicados manualmente ou deixe os commits com prefixo Atualizações: dispararem automaticamente."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="surface" style={{ padding: 20 }}>
          <Stat label="Total enviado" value={String(totals.total)} sub="manuais + commits" />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat label="Urgentes" value={String(totals.urgent)} sub="sinalizadas em vermelho" color="var(--loss)" />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat label="Via commit" value={String(totals.commit)} sub="hook post-commit" color="var(--edge)" />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <Stat label="Total de leituras" value={String(totals.reads)} sub="aberturas pelos usuários" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SendForm onSubmit={(body) => send.mutate(body)} pending={send.isPending} error={send.error as Error | null} />

        <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--line)',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Histórico ({items.length})
          </div>
          {list.isLoading && <div style={{ padding: 24, color: 'var(--muted)' }}>Carregando…</div>}
          {!list.isLoading && items.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Nada enviado ainda.
            </div>
          )}
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {items.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onDelete={() => {
                  if (confirm(`Apagar notificação "${n.title}"?`)) remove.mutate(n.id);
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function SendForm({
  onSubmit,
  pending,
  error,
}: Readonly<{
  onSubmit: (body: SendNotificationBody) => void;
  pending: boolean;
  error: Error | null;
}>) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<NotificationPriority>('normal');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    onSubmit({ title: title.trim(), body: body.trim(), priority });
    setTitle('');
    setBody('');
    setPriority('normal');
  };

  return (
    <form onSubmit={submit} className="surface" style={{ padding: 24 }}>
      <div className="t-eyebrow" style={{ marginBottom: 12 }}>Enviar notificação</div>
      <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16 }}>
        Broadcast para todos os usuários. O envio é imediato; o usuário recebe na próxima
        sincronização do sininho (refresh da página, abrir o dropdown, ou polling de 1h).
      </p>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        <span className="t-eyebrow">Título</span>
        <input
          className="input"
          maxLength={200}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Comparador agora suporta Sportingbet"
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        <span className="t-eyebrow">Mensagem</span>
        <textarea
          className="input"
          maxLength={4000}
          required
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Texto que aparecerá no sininho. Aceita várias linhas."
          style={{ fontFamily: 'var(--sans)', resize: 'vertical' }}
        />
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <input
          type="checkbox"
          checked={priority === 'urgent'}
          onChange={(e) => setPriority(e.target.checked ? 'urgent' : 'normal')}
        />
        <span style={{ fontSize: 13 }}>
          Marcar como <strong>urgente</strong> (badge vermelho + ponto vermelho na sineta)
        </span>
      </label>

      {error && (
        <div
          style={{
            padding: 10,
            borderRadius: 6,
            background: 'oklch(0.68 0.16 25 / 0.1)',
            border: '1px solid oklch(0.68 0.16 25 / 0.3)',
            color: 'var(--loss)',
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          {error.message}
        </div>
      )}

      <button type="submit" className="btn btn-edge" disabled={pending}>
        {pending ? 'Enviando…' : 'Enviar para todos'}
      </button>
    </form>
  );
}

function NotificationRow({
  notification,
  onDelete,
}: Readonly<{ notification: AdminNotification; onDelete: () => void }>) {
  const reach =
    notification.total_target > 0
      ? Math.round((notification.read_count / notification.total_target) * 100)
      : 0;
  return (
    <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span
          className="tag"
          style={{
            fontSize: 9,
            color: SOURCE_COLOR[notification.source],
            borderColor: SOURCE_COLOR[notification.source],
          }}
        >
          {SOURCE_LABEL[notification.source]}
        </span>
        <span
          className="tag"
          style={{
            fontSize: 9,
            color: PRIORITY_COLOR[notification.priority as NotificationPriority],
            borderColor: PRIORITY_COLOR[notification.priority as NotificationPriority],
          }}
        >
          {notification.priority}
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
          {notification.created_at.slice(0, 16).replace('T', ' ')}
        </span>
        <button
          type="button"
          onClick={onDelete}
          className="btn btn-ghost btn-sm"
          style={{ fontSize: 11, padding: '4px 6px', color: 'var(--loss)' }}
          aria-label="Apagar"
        >
          ×
        </button>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{notification.title}</div>
      <div
        style={{
          fontSize: 12,
          color: 'var(--text-2)',
          lineHeight: 1.45,
          whiteSpace: 'pre-wrap',
          maxHeight: 80,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: 6,
        }}
      >
        {notification.body}
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
        <span>
          Lido por {notification.read_count}/{notification.total_target} ({reach}%)
        </span>
        {notification.commit_hash && <span>· {notification.commit_hash}</span>}
        {notification.target_user_id && <span>· user #{notification.target_user_id}</span>}
      </div>
    </div>
  );
}
