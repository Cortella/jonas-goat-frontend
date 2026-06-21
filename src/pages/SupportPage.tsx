import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppBar } from '../components/AppBar';
import { SectionHeader } from '../components/atoms';
import { Seo } from '../components/Seo';
import { ChatPane } from '../components/SupportChat';
import { api, type SupportTicket, type TicketCategory } from '../lib/api';

const CATEGORIES: Array<{ id: TicketCategory; label: string; hint: string }> = [
  { id: 'billing', label: 'Pagamento / cobrança', hint: 'cobrança duplicada, reembolso, alterar plano' },
  { id: 'account', label: 'Minha conta', hint: 'acesso, senha, dados cadastrais' },
  { id: 'technical', label: 'Problema técnico', hint: 'bug, erro de carregamento, dado errado' },
  { id: 'feature', label: 'Sugestão / feedback', hint: 'novas features, melhorias' },
  { id: 'other', label: 'Outro assunto', hint: '' },
];

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  open: { label: 'Aguardando time', color: 'var(--warn)' },
  waiting_user: { label: 'Resposta enviada', color: 'var(--info)' },
  resolved: { label: 'Resolvido', color: 'var(--edge)' },
  closed: { label: 'Fechado', color: 'var(--muted)' },
};

export function SupportPage() {
  const [selected, setSelected] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useQuery({
    queryKey: ['support-mine'],
    queryFn: () => api.supportListMine(),
    refetchInterval: 8_000,
  });

  // Auto-seleciona o primeiro ticket aberto
  useEffect(() => {
    if (selected != null) return;
    const open = list.data?.find((t) => t.status !== 'closed');
    if (open) setSelected(open.id);
  }, [list.data, selected]);

  const showCreate = creating || (list.data && list.data.length === 0);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Seo title="Suporte" description="Abra um ticket de suporte ou converse com nosso time." path="/suporte" noindex />
      <AppBar />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 32px 64px' }}>
        <SectionHeader
          eyebrow="Atendimento"
          title="Suporte"
          sub="Dúvidas sobre cobrança, conta ou modelo? Abra um ticket — respondemos rápido."
          action={
            !showCreate && (
              <button className="btn btn-edge" onClick={() => { setCreating(true); setSelected(null); }}>
                Novo ticket
              </button>
            )
          }
        />

        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, marginTop: 24, minHeight: 480 }}>
          {/* Sidebar */}
          <div className="surface" style={{ padding: 0, overflow: 'hidden', alignSelf: 'flex-start' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Meus tickets ({list.data?.length ?? 0})
            </div>
            {list.isLoading && <div style={{ padding: 24, color: 'var(--muted)', fontSize: 13 }}>Carregando…</div>}
            {list.data?.length === 0 && (
              <div style={{ padding: 24, fontSize: 13, color: 'var(--muted)' }}>
                Nenhum ticket ainda.
              </div>
            )}
            {list.data?.map((t) => {
              const isActive = selected === t.id;
              const meta = STATUS_LABEL[t.status] ?? { label: t.status, color: 'var(--muted)' };
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setSelected(t.id); setCreating(false); }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 16px',
                    borderTop: '1px solid var(--line)',
                    background: isActive ? 'var(--surface-2)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.subject}
                    </span>
                    {(t.unread_count ?? 0) > 0 && (
                      <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--bg)', background: 'var(--edge)', borderRadius: 999, padding: '2px 6px', fontWeight: 600 }}>
                        {t.unread_count}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11 }}>
                    <span style={{ color: meta.color }}>{meta.label}</span>
                    <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{relativeTime(t.last_message_at)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Main */}
          <div>
            {showCreate && <CreateTicketForm onCreated={(id) => { setCreating(false); setSelected(id); }} />}
            {!showCreate && selected != null && (
              <ChatPane ticketId={selected} role="user" />
            )}
            {!showCreate && selected == null && (
              <div className="surface" style={{ padding: 64, textAlign: 'center', color: 'var(--muted)' }}>
                Selecione um ticket à esquerda ou abra um novo.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateTicketForm({ onCreated }: Readonly<{ onCreated: (id: number) => void }>) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('technical');
  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState<{ data_url: string; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: () => api.supportCreate({
      subject, category, body,
      attachment: attachment ?? undefined,
    }),
    onSuccess: ({ ticket }) => {
      qc.invalidateQueries({ queryKey: ['support-mine'] });
      qc.invalidateQueries({ queryKey: ['support-active'] });
      onCreated(ticket.id);
    },
    onError: (e: Error) => setError(e.message),
  });

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > 5 * 1024 * 1024) {
      setError('arquivo maior que 5 MB'); return;
    }
    const data_url = await readDataUrl(file);
    setAttachment({ data_url, filename: file.name });
  };

  return (
    <form
      className="surface"
      style={{ padding: 24 }}
      onSubmit={(e) => { e.preventDefault(); setError(null); mut.mutate(); }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 16 }}>Abrir novo ticket</h2>

      <label style={{ display: 'block', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6, letterSpacing: '0.04em' }}>Assunto</div>
        <input
          required minLength={3} maxLength={160}
          className="input" value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Ex: cobrança duplicada do plano Pro"
        />
      </label>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6, letterSpacing: '0.04em' }}>Categoria</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
          {CATEGORIES.map((c) => {
            const active = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                style={{
                  textAlign: 'left',
                  padding: 12,
                  borderRadius: 8,
                  background: active ? 'var(--edge-soft)' : 'var(--bg-2)',
                  border: active ? '1px solid var(--edge)' : '1px solid var(--line)',
                  color: active ? 'var(--edge)' : 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500 }}>{c.label}</div>
                {c.hint && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{c.hint}</div>}
              </button>
            );
          })}
        </div>
      </div>

      <label style={{ display: 'block', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6, letterSpacing: '0.04em' }}>Descreva o problema</div>
        <textarea
          required minLength={1} maxLength={4000}
          className="input" rows={6} value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Conte o que aconteceu, com o máximo de detalhes possível."
        />
      </label>

      <div style={{ marginBottom: 16 }}>
        <input ref={fileRef} type="file" hidden onChange={onFile} accept="image/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" />
        {attachment ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-2)' }}>📎 {attachment.filename}</span>
            <button type="button" className="btn btn-sm" onClick={() => setAttachment(null)} style={{ fontSize: 11 }}>
              Remover
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()} style={{ fontSize: 12 }}>
            Anexar arquivo (opcional · máx 5 MB)
          </button>
        )}
      </div>

      {error && <div style={{ padding: 10, borderRadius: 6, background: 'oklch(0.68 0.16 25 / 0.1)', color: 'var(--loss)', fontSize: 12, marginBottom: 12 }}>{error}</div>}

      <button type="submit" className="btn btn-edge" disabled={mut.isPending}>
        {mut.isPending ? 'Enviando…' : 'Abrir ticket'}
      </button>
    </form>
  );
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('leitura falhou'));
    r.readAsDataURL(file);
  });
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
