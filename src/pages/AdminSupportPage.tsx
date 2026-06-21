import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { SectionHeader } from '../components/atoms';
import { ChatPane } from '../components/SupportChat';
import { api, type SupportTicket, type TicketCategory, type TicketStatus } from '../lib/api';

const CATEGORY_LABEL: Record<string, string> = {
  billing: 'Cobrança',
  account: 'Conta',
  technical: 'Técnico',
  feature: 'Sugestão',
  other: 'Outros',
};

const STATUS_FILTERS: Array<{ id: 'all' | TicketStatus; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'open', label: 'Abertos' },
  { id: 'waiting_user', label: 'Aguardando usuário' },
  { id: 'resolved', label: 'Resolvidos' },
  { id: 'closed', label: 'Fechados' },
];

export function AdminSupportPage() {
  const [filter, setFilter] = useState<'all' | TicketStatus>('open');
  // Janelas de chat abertas (FB-style). Limita a 3 visíveis simultâneas.
  const [windows, setWindows] = useState<number[]>([]);
  const [showInit, setShowInit] = useState(false);

  const list = useQuery({
    queryKey: ['admin-support-list', filter],
    queryFn: () => api.adminSupportList(filter),
    refetchInterval: 5_000,
  });

  const openWindow = (id: number) => {
    setWindows((prev) => prev.includes(id) ? prev : [...prev, id].slice(-3));
  };
  const closeWindow = (id: number) => setWindows((prev) => prev.filter((x) => x !== id));

  return (
    <AdminLayout>
      <SectionHeader
        eyebrow="Atendimento"
        title="Suporte"
        sub="Tickets abertos pelos usuários. Clique para responder em uma janela de chat ao vivo."
        action={
          <button type="button" className="btn btn-edge" onClick={() => setShowInit(true)}>
            Iniciar conversa
          </button>
        }
      />

      {showInit && (
        <InitConversationModal
          onClose={() => setShowInit(false)}
          onCreated={(ticketId) => { setShowInit(false); openWindow(ticketId); }}
        />
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.id}
            onClick={() => setFilter(s.id)}
            className="tag"
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              background: filter === s.id ? 'var(--surface-2)' : 'transparent',
              borderColor: filter === s.id ? 'var(--text)' : 'var(--line)',
              color: filter === s.id ? 'var(--text)' : 'var(--text-2)',
              fontSize: 12,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {list.isLoading && <div style={{ padding: 32, color: 'var(--muted)' }}>Carregando…</div>}

      {list.data && (
        <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', fontSize: 13, fontWeight: 500 }}>
            Tickets ({list.data.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 110px 110px 110px 80px', gap: 12, padding: '10px 20px', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--bg-2)' }}>
            <span>Assunto</span>
            <span>Usuário</span>
            <span>Categoria</span>
            <span>Status</span>
            <span style={{ textAlign: 'right' }}>Últ. msg</span>
            <span style={{ textAlign: 'right' }}></span>
          </div>
          {list.data.length === 0 && (
            <div style={{ padding: 32, color: 'var(--muted)', textAlign: 'center' }}>Sem tickets neste filtro.</div>
          )}
          {list.data.map((t) => (
            <TicketRow key={t.id} t={t} onOpen={() => openWindow(t.id)} />
          ))}
        </div>
      )}

      {/* Janelas de chat estilo FB no canto inferior direito */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          right: 24,
          display: 'flex',
          gap: 12,
          zIndex: 90,
          alignItems: 'flex-end',
          pointerEvents: 'none',
        }}
      >
        {windows.map((id) => (
          <ChatWindow key={id} ticketId={id} onClose={() => closeWindow(id)} />
        ))}
      </div>
    </AdminLayout>
  );
}

function TicketRow({ t, onOpen }: Readonly<{ t: SupportTicket; onOpen: () => void }>) {
  const colors: Record<TicketStatus, string> = {
    open: 'var(--warn)',
    waiting_user: 'var(--info)',
    resolved: 'var(--edge)',
    closed: 'var(--muted)',
  };
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 200px 110px 110px 110px 80px',
        gap: 12,
        padding: '12px 20px',
        borderTop: '1px solid var(--line)',
        alignItems: 'center',
        fontSize: 13,
      }}
    >
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <div style={{ fontWeight: 500 }}>{t.subject}</div>
        {(t.unread_count ?? 0) > 0 && (
          <span style={{ fontSize: 10, color: 'var(--bg)', background: 'var(--edge)', borderRadius: 999, padding: '1px 6px', fontWeight: 600, marginRight: 4 }}>
            {t.unread_count} não lidas
          </span>
        )}
      </div>
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-2)' }}>
        {t.user_name || t.user_email}
      </div>
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
        {CATEGORY_LABEL[t.category] ?? t.category}
      </span>
      <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: colors[t.status], textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {t.status.replace('_', ' ')}
      </span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>
        {relativeTime(t.last_message_at)}
      </span>
      <span style={{ textAlign: 'right' }}>
        <button onClick={onOpen} className="btn btn-sm" style={{ fontSize: 11 }}>Abrir</button>
      </span>
    </div>
  );
}

function ChatWindow({ ticketId, onClose }: Readonly<{ ticketId: number; onClose: () => void }>) {
  const [minimized, setMinimized] = useState(false);
  return (
    <div
      style={{
        width: 340,
        boxShadow: '0 8px 32px oklch(0 0 0 / 0.5)',
        borderRadius: '8px 8px 0 0',
        overflow: 'hidden',
        background: 'var(--bg)',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={() => setMinimized((v) => !v)}
      >
        <span style={{ fontSize: 12, fontWeight: 500 }}>Ticket #{ticketId}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMinimized((v) => !v); }}
            style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14 }}
            aria-label={minimized ? 'expandir' : 'minimizar'}
          >
            {minimized ? '▢' : '_'}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14 }}
            aria-label="fechar"
          >
            ×
          </button>
        </div>
      </div>
      {!minimized && <ChatPane ticketId={ticketId} role="admin" compact />}
    </div>
  );
}

function InitConversationModal({ onClose, onCreated }: Readonly<{ onClose: () => void; onCreated: (ticketId: number) => void }>) {
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<{ id: number; email: string; name: string | null } | null>(null);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('other');
  const [body, setBody] = useState('');
  const qc = useQueryClient();

  const usersQ = useQuery({
    queryKey: ['admin-support-users-search', search],
    queryFn: () => api.adminSupportSearchUsers(search),
    enabled: search.trim().length >= 2,
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: () => api.adminSupportInit({
      user_id: picked!.id,
      subject: subject.trim(),
      category,
      body: body.trim(),
    }),
    onSuccess: ({ ticket }) => {
      qc.invalidateQueries({ queryKey: ['admin-support-list'] });
      onCreated(ticket.id);
    },
  });

  const ready = picked && subject.trim().length >= 3 && body.trim().length > 0;

  return (
    <button
      type="button"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'oklch(0 0 0 / 0.5)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '64px 16px',
        border: 'none', cursor: 'default',
      }}
      aria-label="Fechar modal"
    >
      <div
        role="dialog" aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg)', borderRadius: 12, width: '100%', maxWidth: 540,
          padding: 24, boxShadow: '0 12px 40px oklch(0 0 0 / 0.5)',
          textAlign: 'left', cursor: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>Iniciar conversa com usuário</h2>
          <button type="button" onClick={onClose} className="btn btn-sm" style={{ padding: '4px 10px' }}>×</button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
          A conversa abre como ticket aguardando o usuário. Ele recebe notificação e o balão flutuante aparece pra ele.
        </p>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4 }}>Buscar usuário (email, nome)</div>
          <input
            className="input"
            placeholder="Mín. 2 caracteres"
            value={picked ? `${picked.email}` : search}
            onChange={(e) => { setSearch(e.target.value); setPicked(null); }}
          />
        </label>
        {!picked && search.trim().length >= 2 && (
          <div className="surface" style={{ padding: 0, overflow: 'hidden', marginBottom: 12, maxHeight: 200, overflowY: 'auto' }}>
            {usersQ.isLoading && <div style={{ padding: 12, color: 'var(--muted)', fontSize: 12 }}>Buscando…</div>}
            {usersQ.data?.length === 0 && <div style={{ padding: 12, color: 'var(--muted)', fontSize: 12 }}>Nenhum usuário.</div>}
            {usersQ.data?.map((u) => (
              <button
                key={u.id} type="button"
                onClick={() => { setPicked(u); setSearch(''); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 12px', borderTop: '1px solid var(--line)',
                  background: 'transparent', cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 13 }}>{u.full_name || u.name || u.email.split('@')[0]}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{u.email}</div>
              </button>
            ))}
          </div>
        )}

        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4 }}>Assunto</div>
          <input
            className="input" maxLength={160}
            placeholder="Ex: Atualização sobre seu plano"
            value={subject} onChange={(e) => setSubject(e.target.value)}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4 }}>Categoria</div>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)}>
            <option value="other">Outros</option>
            <option value="billing">Cobrança</option>
            <option value="account">Conta</option>
            <option value="technical">Técnico</option>
            <option value="feature">Sugestão</option>
          </select>
        </label>
        <label style={{ display: 'block', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4 }}>Mensagem inicial</div>
          <textarea
            className="input" rows={4} maxLength={4000}
            placeholder="Olá, aqui é da equipe Jonas Goat…"
            value={body} onChange={(e) => setBody(e.target.value)}
          />
        </label>

        {create.isError && (
          <div style={{ padding: 10, borderRadius: 6, background: 'oklch(0.68 0.16 25 / 0.1)', color: 'var(--loss)', fontSize: 12, marginBottom: 12 }}>
            {String(create.error)}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} className="btn">Cancelar</button>
          <button type="button" onClick={() => create.mutate()} className="btn btn-edge" disabled={!ready || create.isPending}>
            {create.isPending ? 'Enviando…' : 'Iniciar conversa'}
          </button>
        </div>
      </div>
    </button>
  );
}

function relativeTime(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60_000) return 'agora';
  const m = Math.floor(d / 60_000);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
