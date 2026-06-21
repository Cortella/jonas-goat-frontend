/**
 * Componentes compartilhados de chat de suporte.
 *  - ChatPane: usado tanto pelo usuário (/suporte) quanto pelo admin
 *    (/admin/suporte). Difere apenas no endpoint chamado.
 *  - useNewMessageSound: toca um beep curto quando chega mensagem nova
 *    desde a última visualização.
 */
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from './Avatar';
import { useAuth } from '../lib/auth';
import { api, type SenderRole, type SupportMessage, type SupportTicket, type TicketStatus } from '../lib/api';

export type ChatRole = 'user' | 'admin';

export function ChatPane({ ticketId, role, compact }: Readonly<{ ticketId: number; role: ChatRole; compact?: boolean }>) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState<{ data_url: string; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showSurvey, setShowSurvey] = useState(false);

  const detailKey = role === 'user' ? ['support-detail', ticketId] : ['admin-support-detail', ticketId];
  const detail = useQuery({
    queryKey: detailKey,
    queryFn: () => role === 'user' ? api.supportDetail(ticketId) : api.adminSupportDetail(ticketId),
    refetchInterval: 5_000,
  });

  // Beep quando chega nova mensagem (último tick → tick atual).
  const lastSeen = useRef<number>(0);
  useEffect(() => {
    const messages = detail.data?.messages ?? [];
    if (messages.length === 0) {
      lastSeen.current = 0;
      return;
    }
    const lastId = messages[messages.length - 1].id;
    if (lastSeen.current === 0) {
      lastSeen.current = lastId;
      return;
    }
    if (lastId > lastSeen.current) {
      const last = messages[messages.length - 1];
      // Toca som apenas para mensagens da contraparte
      const fromOther = role === 'user' ? last.sender_role !== 'user' : last.sender_role === 'user';
      if (fromOther) playBeep();
      lastSeen.current = lastId;
    }
  }, [detail.data, role]);

  const send = useMutation({
    mutationFn: () => {
      const payload = { body, attachment: attachment ?? undefined };
      return role === 'user'
        ? api.supportSend(ticketId, payload)
        : api.adminSupportSend(ticketId, payload);
    },
    onSuccess: () => {
      setBody('');
      setAttachment(null);
      qc.invalidateQueries({ queryKey: detailKey });
      qc.invalidateQueries({ queryKey: ['support-mine'] });
      qc.invalidateQueries({ queryKey: ['support-active'] });
      qc.invalidateQueries({ queryKey: ['admin-support-list'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const closeMut = useMutation({
    mutationFn: () => api.supportClose(ticketId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: detailKey });
      qc.invalidateQueries({ queryKey: ['support-mine'] });
      qc.invalidateQueries({ queryKey: ['support-active'] });
      setShowSurvey(true);
    },
  });

  const adminPatch = useMutation({
    mutationFn: (patch: { status?: TicketStatus }) => api.adminSupportPatch(ticketId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: detailKey });
      qc.invalidateQueries({ queryKey: ['admin-support-list'] });
    },
  });

  if (detail.isLoading) {
    return <div className="surface" style={{ padding: 32, color: 'var(--muted)' }}>Carregando conversa…</div>;
  }
  if (detail.isError || !detail.data) {
    return <div className="surface" style={{ padding: 32, color: 'var(--loss)' }}>Falha ao carregar.</div>;
  }

  const { ticket, messages } = detail.data;
  const isClosed = ticket.status === 'closed';
  const userInfo = role === 'admin' ? { email: ticket.user_email, name: ticket.user_name } : null;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > 5 * 1024 * 1024) { setError('arquivo > 5 MB'); return; }
    const data_url = await readDataUrl(file);
    setAttachment({ data_url, filename: file.name });
  };

  return (
    <div className="surface" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: compact ? 480 : 640 }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ticket.subject}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 8 }}>
            <StatusBadge status={ticket.status} />
            {userInfo && <span style={{ fontFamily: 'var(--mono)' }}>{userInfo.email}</span>}
          </div>
        </div>
        {role === 'user' && !isClosed && (
          <button type="button" className="btn btn-sm" onClick={() => closeMut.mutate()} style={{ fontSize: 11 }}>
            Fechar
          </button>
        )}
        {role === 'admin' && !isClosed && (
          <>
            <button type="button" className="btn btn-sm" onClick={() => adminPatch.mutate({ status: 'resolved' })} style={{ fontSize: 11 }}>
              Marcar resolvido
            </button>
            <button type="button" className="btn btn-sm" onClick={() => adminPatch.mutate({ status: 'closed' })} style={{ fontSize: 11 }}>
              Fechar
            </button>
          </>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m) => (
          <Bubble key={m.id} m={m} mineRole={role} userAvatar={user} />
        ))}
        {messages.length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 32 }}>
            Sem mensagens ainda.
          </div>
        )}
      </div>

      {/* Composer */}
      {!isClosed && (
        <ChatComposer
          body={body} setBody={setBody}
          attachment={attachment} setAttachment={setAttachment}
          fileRef={fileRef} onFile={onFile}
          error={error} setError={setError}
          onSend={() => send.mutate()}
          isPending={send.isPending}
        />
      )}

      {/* Survey shown after user closes */}
      {role === 'user' && isClosed && !ticket.has_survey && showSurvey && (
        <SurveyForm ticketId={ticket.id} onDone={() => {
          setShowSurvey(false);
          qc.invalidateQueries({ queryKey: detailKey });
          qc.invalidateQueries({ queryKey: ['support-mine'] });
        }} />
      )}
      {role === 'user' && isClosed && !showSurvey && !ticket.has_survey && (
        <div style={{ borderTop: '1px solid var(--line)', padding: 12, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          Ticket fechado.{' '}
          <button type="button" onClick={() => setShowSurvey(true)} style={{ background: 'none', border: 'none', color: 'var(--edge)', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>
            Avaliar atendimento
          </button>
        </div>
      )}
      {role === 'user' && isClosed && ticket.has_survey && (
        <div style={{ borderTop: '1px solid var(--line)', padding: 12, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          Obrigado pela avaliação 🙏
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: Readonly<{ status: TicketStatus }>) {
  const map: Record<TicketStatus, { label: string; color: string }> = {
    open: { label: 'aguardando time', color: 'var(--warn)' },
    waiting_user: { label: 'resposta enviada', color: 'var(--info)' },
    resolved: { label: 'resolvido', color: 'var(--edge)' },
    closed: { label: 'fechado', color: 'var(--muted)' },
  };
  const s = map[status];
  return <span style={{ color: s.color, fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>;
}

function Bubble({ m, mineRole, userAvatar }: Readonly<{ m: SupportMessage; mineRole: ChatRole; userAvatar: ReturnType<typeof useAuth>['user'] }>) {
  const isMine = (mineRole === 'user' && m.sender_role === 'user') || (mineRole === 'admin' && m.sender_role === 'admin');
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
      {!isMine && <SenderAvatar role={m.sender_role} userAvatar={userAvatar} mineRole={mineRole} />}
      <div
        style={{
          maxWidth: '70%',
          padding: '10px 14px',
          borderRadius: 14,
          background: isMine ? 'var(--edge-soft)' : 'var(--bg-2)',
          border: isMine ? '1px solid oklch(0.88 0.17 125 / 0.4)' : '1px solid var(--line)',
          fontSize: 13,
          color: 'var(--text)',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        <div>{m.body}</div>
        {m.attachment_path && <Attachment m={m} />}
        <div style={{ marginTop: 6, fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)', textAlign: isMine ? 'right' : 'left' }}>
          {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      {isMine && <SenderAvatar role={m.sender_role} userAvatar={userAvatar} mineRole={mineRole} />}
    </div>
  );
}

function SenderAvatar({ role, userAvatar, mineRole }: Readonly<{ role: SenderRole; userAvatar: ReturnType<typeof useAuth>['user']; mineRole: ChatRole }>) {
  if (role === 'user' && mineRole === 'user' && userAvatar) {
    return <Avatar user={userAvatar} size={28} />;
  }
  // Admin/system avatar — neutral
  const bg = role === 'admin' ? 'oklch(0.50 0.10 30 / 0.3)' : 'var(--bg-2)';
  const color = role === 'admin' ? 'oklch(0.78 0.16 25)' : 'var(--text-2)';
  const label = role === 'admin' ? 'JG' : (role === 'user' ? 'EU' : '·');
  return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 600, flexShrink: 0 }}>
      {label}
    </div>
  );
}

function Attachment({ m }: Readonly<{ m: SupportMessage }>) {
  if (!m.attachment_path) return null;
  const isImage = m.attachment_mime?.startsWith('image/');
  const isAudio = m.attachment_mime?.startsWith('audio/');
  if (isImage) {
    return (
      <a href={m.attachment_path} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 8 }}>
        <img src={m.attachment_path} alt={m.attachment_filename ?? 'anexo'} style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 6, border: '1px solid var(--line)' }} />
      </a>
    );
  }
  if (isAudio) {
    return <audio src={m.attachment_path} controls style={{ marginTop: 8, width: '100%' }} />;
  }
  return (
    <a href={m.attachment_path} target="_blank" rel="noopener noreferrer" download style={{ display: 'inline-block', marginTop: 8, padding: '6px 10px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6, fontSize: 11, color: 'var(--text)', textDecoration: 'none', fontFamily: 'var(--mono)' }}>
      📎 {m.attachment_filename ?? 'arquivo'}
      {m.attachment_size != null && <span style={{ color: 'var(--muted)', marginLeft: 6 }}>({Math.round(m.attachment_size / 1024)} KB)</span>}
    </a>
  );
}

// ─── ChatComposer (WhatsApp-style) ─────────────────────────────────────
// Composer separado pra encapsular: emoji picker, gravação de áudio,
// preview de anexo. Mantém a API simples — só recebe handlers de send.
interface ComposerAttachment { data_url: string; filename: string }

function ChatComposer({
  body, setBody, attachment, setAttachment, fileRef, onFile, error, setError, onSend, isPending,
}: Readonly<{
  body: string; setBody: (v: string) => void;
  attachment: ComposerAttachment | null;
  setAttachment: (v: ComposerAttachment | null) => void;
  fileRef: React.RefObject<HTMLInputElement>;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error: string | null; setError: (v: string | null) => void;
  onSend: () => void; isPending: boolean;
}>) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recElapsed, setRecElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recIntervalRef = useRef<number | null>(null);

  const insertEmoji = (e: string) => {
    setBody(body + e);
  };

  const startRecording = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('navegador não suporta gravação de áudio');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Tenta webm/opus (Chrome/Firefox) → fallback pro default do browser
      const mimeOptions = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      const mimeType = mimeOptions.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
      const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size === 0) return;
        const reader = new FileReader();
        reader.onload = () => {
          setAttachment({
            data_url: String(reader.result),
            filename: `audio-${new Date().toISOString().slice(0, 19)}.${(rec.mimeType.includes('mp4') ? 'm4a' : 'webm')}`,
          });
        };
        reader.readAsDataURL(blob);
      };
      rec.start();
      setRecording(true);
      setRecElapsed(0);
      recIntervalRef.current = window.setInterval(() => setRecElapsed((s) => s + 1), 1000);
    } catch (err) {
      setError(`microfone: ${(err as Error).message}`);
    }
  };

  const stopRecording = (cancelled = false) => {
    if (recIntervalRef.current != null) {
      clearInterval(recIntervalRef.current);
      recIntervalRef.current = null;
    }
    setRecording(false);
    setRecElapsed(0);
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      if (cancelled) {
        rec.onstop = () => rec.stream.getTracks().forEach((t) => t.stop());
      }
      rec.stop();
    }
  };

  const canSend = !isPending && (body.trim().length > 0 || attachment != null);

  return (
    <form
      style={{ borderTop: '1px solid var(--line)', padding: 10, position: 'relative' }}
      onSubmit={(e) => { e.preventDefault(); if (canSend) onSend(); }}
    >
      {emojiOpen && <EmojiPicker onPick={(e) => { insertEmoji(e); }} onClose={() => setEmojiOpen(false)} />}
      {attachment && (
        <div style={{ fontSize: 11, color: 'var(--text-2)', display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--mono)' }}>📎 {attachment.filename}</span>
          <button type="button" className="btn btn-sm" onClick={() => setAttachment(null)} style={{ fontSize: 10, padding: '2px 6px' }}>×</button>
        </div>
      )}
      {error && <div style={{ fontSize: 11, color: 'var(--loss)', marginBottom: 8 }}>{error}</div>}

      {recording ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" onClick={() => stopRecording(true)} className="btn btn-sm" style={{ padding: '8px 10px', fontSize: 14, color: 'var(--loss)' }} title="Cancelar">🗑</button>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', background: 'oklch(0.68 0.16 25 / 0.1)',
            borderRadius: 999, border: '1px solid oklch(0.68 0.16 25 / 0.3)',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--loss)', animation: 'pulse 1s infinite' }} />
            <span style={{ fontSize: 12, color: 'var(--loss)' }}>Gravando…</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text)' }}>
              {String(Math.floor(recElapsed / 60)).padStart(2, '0')}:{String(recElapsed % 60).padStart(2, '0')}
            </span>
          </div>
          <button type="button" onClick={() => stopRecording(false)} className="btn btn-edge" style={{ padding: '10px 14px', fontSize: 14 }} title="Enviar gravação">✓</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
          <input ref={fileRef} type="file" hidden onChange={onFile} accept="image/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" />
          <button type="button" onClick={() => setEmojiOpen((v) => !v)} className="btn btn-sm" style={{ padding: '8px 10px', fontSize: 16, lineHeight: 1 }} title="Emoji">😊</button>
          <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-sm" style={{ padding: '8px 10px', fontSize: 14 }} title="Anexar">📎</button>
          <textarea
            className="input"
            rows={1}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (canSend) onSend();
              }
            }}
            placeholder="Mensagem"
            style={{
              flex: 1, resize: 'none', fontSize: 14,
              borderRadius: 22, padding: '10px 14px', minHeight: 40, maxHeight: 100,
            }}
            maxLength={4000}
          />
          {body.trim() || attachment ? (
            <button type="submit" className="btn btn-edge" disabled={!canSend} style={{ padding: '10px 14px', fontSize: 14, borderRadius: 22 }}>
              {isPending ? '…' : '➤'}
            </button>
          ) : (
            <button type="button" onClick={startRecording} className="btn btn-sm" style={{ padding: '10px 12px', fontSize: 16, borderRadius: 22 }} title="Gravar áudio">🎤</button>
          )}
        </div>
      )}
    </form>
  );
}

// ─── EmojiPicker (popup compacto, sem dependência externa) ──────────────
const EMOJI_GROUPS: Array<{ label: string; items: string[] }> = [
  { label: 'Sorrisos', items: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐'] },
  { label: 'Gestos', items: ['👍','👎','👌','🤞','✌️','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋','🤚','🖐️','🖖','👋','🤝','👏','🙌','🙏','✍️','💪','🦾','👀','👁️','👄','🧠','👤','👥'] },
  { label: 'Coração', items: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟'] },
  { label: 'Objetos', items: ['🎉','🎊','🎁','🎂','🍰','🎈','🎯','🏆','🥇','🥈','🥉','⚽','🏀','🏈','⚾','🎾','🎱','🏓','📱','💻','⌨️','🖥️','🖨️','📷','🎥','📺','💾','💿','📀','💡','🔋','🔌','💰','💵','💸','💳','📈','📉','📊','📌','📎','✂️','🔧','🔨','⚙️','🔒','🔓','🔑','📅','⏰','⏳','✅','❌','⚠️','❗','❓','💯','🔥','✨','⭐','🌟','💫'] },
];

function EmojiPicker({ onPick, onClose }: Readonly<{ onPick: (e: string) => void; onClose: () => void }>) {
  const [tab, setTab] = useState(0);
  return (
    <div
      style={{
        position: 'absolute', bottom: 'calc(100% - 4px)', left: 8,
        width: 320, maxWidth: 'calc(100vw - 32px)',
        background: 'var(--bg-2)', border: '1px solid var(--line)',
        borderRadius: 12, padding: 8, zIndex: 10,
        boxShadow: '0 8px 24px oklch(0 0 0 / 0.4)',
      }}
    >
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {EMOJI_GROUPS.map((g, i) => (
          <button
            key={g.label} type="button"
            onClick={() => setTab(i)}
            className="tag"
            style={{
              padding: '4px 10px', fontSize: 11, cursor: 'pointer',
              background: tab === i ? 'var(--surface-2)' : 'transparent',
              color: tab === i ? 'var(--text)' : 'var(--text-2)',
            }}
          >
            {g.label}
          </button>
        ))}
        <button type="button" onClick={onClose} className="btn btn-sm" style={{ marginLeft: 'auto', padding: '2px 8px', fontSize: 11 }}>×</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2, maxHeight: 220, overflowY: 'auto' }}>
        {EMOJI_GROUPS[tab].items.map((e) => (
          <button
            key={e} type="button"
            onClick={() => onPick(e)}
            style={{
              padding: 6, fontSize: 20, background: 'transparent', border: 'none',
              cursor: 'pointer', borderRadius: 6, lineHeight: 1,
            }}
            onMouseEnter={(ev) => (ev.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={(ev) => (ev.currentTarget.style.background = 'transparent')}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

function SurveyForm({ ticketId, onDone }: Readonly<{ ticketId: number; onDone: () => void }>) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const mut = useMutation({
    mutationFn: () => api.supportSurvey(ticketId, { score: score!, comment: comment || null }),
    onSuccess: () => onDone(),
  });
  return (
    <form
      style={{ borderTop: '1px solid var(--line)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}
      onSubmit={(e) => { e.preventDefault(); if (score != null) mut.mutate(); }}
    >
      <div style={{ fontSize: 13, fontWeight: 500 }}>Como foi seu atendimento?</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n} type="button"
            onClick={() => setScore(n)}
            style={{
              flex: 1,
              padding: '10px 0',
              fontSize: 18,
              border: score === n ? '1px solid var(--edge)' : '1px solid var(--line)',
              background: score === n ? 'var(--edge-soft)' : 'var(--bg-2)',
              color: score === n ? 'var(--edge)' : 'var(--text-2)',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            {['😞', '😕', '😐', '🙂', '🤩'][n - 1]}
          </button>
        ))}
      </div>
      <textarea
        className="input" rows={2}
        placeholder="Comentário opcional…"
        value={comment} onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
      />
      <button type="submit" className="btn btn-edge" disabled={score == null || mut.isPending}>
        {mut.isPending ? 'Enviando…' : 'Enviar avaliação'}
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

let audioCtx: AudioContext | null = null;
function playBeep() {
  try {
    audioCtx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);
    o.frequency.value = 880;
    o.type = 'sine';
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.18);
    o.start();
    o.stop(audioCtx.currentTime + 0.2);
  } catch {
    /* contexto bloqueado pelo browser — silencioso */
  }
}

// Floating bubble — fica fixo no canto inferior direito quando o usuário tem
// um ticket ativo. Some ao fechar o ticket.
export function SupportBubble() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const active = useQuery({
    queryKey: ['support-active'],
    queryFn: () => api.supportActive(),
    enabled: !!user,
    refetchInterval: 15_000,
  });

  if (!user) return null;
  const t = active.data?.active;
  if (!t) return null;

  const unread = (t as SupportTicket).unread_count ?? 0;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed', right: 24, bottom: 24, zIndex: 100,
            background: 'var(--edge)', color: 'oklch(0.16 0.006 240)',
            border: 'none', borderRadius: 999,
            padding: '12px 16px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px oklch(0 0 0 / 0.3)',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13, fontWeight: 600,
          }}
          title={t.subject}
        >
          <span style={{ fontSize: 18 }}>💬</span>
          Suporte aberto
          {unread > 0 && (
            <span style={{ background: 'var(--bg)', color: 'var(--edge)', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontFamily: 'var(--mono)' }}>
              {unread}
            </span>
          )}
        </button>
      )}
      {open && (
        <div
          style={{
            position: 'fixed', right: 24, bottom: 24, zIndex: 100,
            width: 360, maxWidth: 'calc(100vw - 48px)',
            boxShadow: '0 8px 32px oklch(0 0 0 / 0.4)',
            borderRadius: 12, overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{t.subject}</span>
            <button type="button" onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16 }} aria-label="fechar">×</button>
          </div>
          <ChatPane ticketId={t.id} role="user" compact />
        </div>
      )}
    </>
  );
}
