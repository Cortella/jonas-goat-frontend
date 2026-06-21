import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type AppNotification } from '../lib/api';

const POLL_INTERVAL_MS = 60 * 60 * 1000; // 1 hour, per spec

const SOURCE_TAG: Record<AppNotification['source'], { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'var(--text-2)' },
  commit: { label: 'Atualização', color: 'var(--edge)' },
  system: { label: 'Sistema', color: 'var(--info)' },
};

function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} d`;
}

export function NotificationBell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const q = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications(),
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  const markOne = useMutation({
    mutationFn: (id: number) => api.markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const markAll = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  // Close dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // When user opens the bell, force a refetch — the polling cadence is
  // hourly; this keeps the UI fresh on demand.
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  const unread = q.data?.unread_count ?? 0;
  const items = q.data?.notifications ?? [];
  const hasUrgent = items.some((n) => !n.is_read && n.priority === 'urgent');

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={toggle}
        aria-label="Notificações"
        title="Notificações"
        style={{
          position: 'relative',
          width: 36,
          height: 36,
          borderRadius: 8,
          border: '1px solid var(--line-2)',
          background: open ? 'var(--surface-2)' : 'transparent',
          color: 'var(--text-2)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <BellIcon active={hasUrgent} />
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              borderRadius: 999,
              background: hasUrgent ? 'var(--loss)' : 'var(--edge)',
              color: hasUrgent ? '#fff' : 'var(--edge-ink)',
              fontFamily: 'var(--mono)',
              fontSize: 10,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--bg)',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 380,
            maxHeight: 480,
            overflow: 'hidden',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 10,
            boxShadow: 'var(--shadow-2)',
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500 }}>
              Notificações {unread > 0 ? `(${unread})` : ''}
            </span>
            {unread > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                style={{ fontSize: 11 }}
              >
                Marcar tudo como lido
              </button>
            )}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {q.isLoading && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Carregando…</div>
            )}
            {q.isError && (
              <div style={{ padding: 16, color: 'var(--loss)', fontSize: 12 }}>
                Erro ao carregar.
              </div>
            )}
            {!q.isLoading && !q.isError && items.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                Sem notificações por aqui.
              </div>
            )}
            {items.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onClick={() => {
                  if (!n.is_read) markOne.mutate(n.id);
                  // Notificação de atualização de produto leva pro changelog.
                  if (n.source === 'commit' || n.topics.includes('changelog')) {
                    setOpen(false);
                    navigate('/atualizacoes');
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  onClick,
}: Readonly<{ notification: AppNotification; onClick: () => void }>) {
  const tag = SOURCE_TAG[notification.source] ?? SOURCE_TAG.admin;
  const isUrgent = notification.priority === 'urgent';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        padding: '12px 16px',
        textAlign: 'left',
        borderTop: '1px solid var(--line)',
        background: notification.is_read ? 'transparent' : 'var(--bg-2)',
        border: 'none',
        borderBottom: '1px solid var(--line)',
        cursor: 'pointer',
        color: 'inherit',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        {!notification.is_read && (
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: isUrgent ? 'var(--loss)' : 'var(--edge)',
            }}
          />
        )}
        <span
          className="tag"
          style={{
            fontSize: 9,
            color: isUrgent ? 'var(--loss)' : tag.color,
            borderColor: isUrgent ? 'var(--loss)' : tag.color,
          }}
        >
          {isUrgent ? 'Urgente' : tag.label}
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
          {timeAgo(notification.created_at)}
        </span>
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
        }}
      >
        {notification.body}
      </div>
      {notification.commit_hash && (
        <div
          style={{
            marginTop: 6,
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--muted)',
          }}
        >
          {notification.commit_hash}
        </div>
      )}
    </button>
  );
}

function BellIcon({ active }: Readonly<{ active: boolean }>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      {active && <circle cx="18" cy="6" r="3" fill="var(--loss)" stroke="none" />}
    </svg>
  );
}
