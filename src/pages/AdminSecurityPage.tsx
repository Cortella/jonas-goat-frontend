import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { SectionHeader, Stat } from '../components/atoms';
import { api, type SecurityConfig, type SecurityConfigPatch, type SecurityEvent, type SecuritySeverity } from '../lib/api';

const SEV_COLOR: Record<SecuritySeverity, string> = {
  critical: 'oklch(0.62 0.22 25)',
  high: 'var(--loss)',
  medium: 'var(--warn)',
  low: 'var(--muted)',
};

const KIND_LABEL: Record<string, string> = {
  rate_limited: 'Rate limit estourado',
  brute_force: 'Brute force',
  suspicious_signup: 'Signup suspeito',
  failed_login_burst: 'Burst de login',
  attachment_blocked: 'Anexo bloqueado',
  admin_action_alert: 'Ação admin sensível',
};

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60_000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

export function AdminSecurityPage() {
  const [filter, setFilter] = useState<'all' | 'unresolved'>('unresolved');

  const list = useQuery({
    queryKey: ['admin-security', filter],
    queryFn: () => api.adminSecurity({ resolved: filter === 'unresolved' ? 'false' : undefined }),
    refetchInterval: 15_000,
  });

  return (
    <AdminLayout>
      <SectionHeader
        eyebrow="Defesa"
        title="Segurança"
        sub="Eventos de defesa em camadas: rate limit, brute force, anexos bloqueados, signups suspeitos. Configure thresholds e veja o que está acontecendo agora."
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setFilter('unresolved')}
              className="tag"
              style={{
                padding: '6px 12px', cursor: 'pointer',
                background: filter === 'unresolved' ? 'var(--surface-2)' : 'transparent',
                color: filter === 'unresolved' ? 'var(--text)' : 'var(--text-2)',
                fontSize: 12,
              }}
            >
              Não resolvidos
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="tag"
              style={{
                padding: '6px 12px', cursor: 'pointer',
                background: filter === 'all' ? 'var(--surface-2)' : 'transparent',
                color: filter === 'all' ? 'var(--text)' : 'var(--text-2)',
                fontSize: 12,
              }}
            >
              Todos
            </button>
          </div>
        }
      />

      {list.isLoading && <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>Carregando…</div>}

      {list.data && (
        <>
          <Stats stats={list.data.stats} />
          <ConfigEditor config={list.data.config} />
          <EventsList events={list.data.events} />
        </>
      )}
    </AdminLayout>
  );
}

function Stats({ stats }: Readonly<{ stats: NonNullable<ReturnType<typeof api.adminSecurity> extends Promise<infer T> ? T : never>['stats'] }>) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
      <div className="surface" style={{ padding: 20 }}>
        <Stat label="Eventos 24h" value={String(stats.last_24h.total)} sub="todas as severidades" />
      </div>
      <div className="surface" style={{ padding: 20 }}>
        <Stat label="Críticos 24h" value={String(stats.last_24h.critical)} sub="ação imediata" color={SEV_COLOR.critical} />
      </div>
      <div className="surface" style={{ padding: 20 }}>
        <Stat label="Altos 24h" value={String(stats.last_24h.high)} sub="brute force, signup burst" color={SEV_COLOR.high} />
      </div>
      <div className="surface" style={{ padding: 20 }}>
        <Stat label="Não resolvidos" value={String(stats.unresolved)} sub="aguardando triagem" />
      </div>
    </div>
  );
}

function ConfigEditor({ config }: Readonly<{ config: SecurityConfig }>) {
  const [draft, setDraft] = useState<SecurityConfig>(config);
  const qc = useQueryClient();
  useEffect(() => { setDraft(config); }, [config]);

  const save = useMutation({
    mutationFn: (patch: SecurityConfigPatch) => api.adminSecurityPatchConfig(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-security'] }),
  });

  const onSave = () => {
    const patch: SecurityConfigPatch = {
      rate_limit: draft.rate_limits,
      detect: draft.detect,
      alerts: draft.alerts,
    };
    save.mutate(patch);
  };

  const dirty = JSON.stringify(draft) !== JSON.stringify(config);

  return (
    <div className="surface" style={{ padding: 24, marginBottom: 16 }}>
      <div className="t-eyebrow" style={{ marginBottom: 8 }}>Configuração</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Rate limits</div>
          <NumberField
            label="Login · por minuto" value={draft.rate_limits.auth_login_per_min}
            onChange={(v) => setDraft({ ...draft, rate_limits: { ...draft.rate_limits, auth_login_per_min: v } })}
          />
          <NumberField
            label="Signup · por hora" value={draft.rate_limits.auth_signup_per_hour}
            onChange={(v) => setDraft({ ...draft, rate_limits: { ...draft.rate_limits, auth_signup_per_hour: v } })}
          />
          <NumberField
            label="Mensagens de suporte · por minuto" value={draft.rate_limits.support_msg_per_min}
            onChange={(v) => setDraft({ ...draft, rate_limits: { ...draft.rate_limits, support_msg_per_min: v } })}
          />
          <NumberField
            label="Global · por minuto" value={draft.rate_limits.global_per_min}
            onChange={(v) => setDraft({ ...draft, rate_limits: { ...draft.rate_limits, global_per_min: v } })}
          />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Detecção de ataques</div>
          <NumberField
            label="Janela brute force (min)" value={draft.detect.brute_force_window_min}
            onChange={(v) => setDraft({ ...draft, detect: { ...draft.detect, brute_force_window_min: v } })}
          />
          <NumberField
            label="Threshold de falhas" value={draft.detect.brute_force_threshold}
            onChange={(v) => setDraft({ ...draft, detect: { ...draft.detect, brute_force_threshold: v } })}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 12 }}>
            <input
              type="checkbox" checked={draft.alerts.notify_admins_on_critical}
              onChange={(e) => setDraft({ ...draft, alerts: { notify_admins_on_critical: e.target.checked } })}
            />
            Notificar admins em eventos críticos
          </label>
        </div>
      </div>
      <button type="button" className="btn btn-edge" onClick={onSave} disabled={!dirty || save.isPending}>
        {save.isPending ? 'Salvando…' : 'Salvar configuração'}
      </button>
      {save.isSuccess && !dirty && (
        <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--edge)' }}>Salvo · cache invalidado</span>
      )}
    </div>
  );
}

function NumberField({ label, value, onChange }: Readonly<{ label: string; value: number; onChange: (v: number) => void }>) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>
      <input
        type="number" min={1}
        className="input" value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: 90, fontFamily: 'var(--mono)', fontSize: 12 }}
      />
    </label>
  );
}

function EventsList({ events }: Readonly<{ events: SecurityEvent[] }>) {
  const qc = useQueryClient();
  const resolve = useMutation({
    mutationFn: (id: number) => api.adminSecurityResolve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-security'] }),
  });

  return (
    <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', fontSize: 13, fontWeight: 500 }}>
        Eventos ({events.length})
      </div>
      {events.length === 0 && (
        <div style={{ padding: 32, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
          Sem eventos no filtro atual. ✨
        </div>
      )}
      {events.map((e) => (
        <div
          key={e.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '90px 1fr 110px 100px 100px',
            gap: 12,
            padding: '12px 20px',
            borderTop: '1px solid var(--line)',
            alignItems: 'center',
            fontSize: 12,
            opacity: e.resolved_at ? 0.6 : 1,
          }}
        >
          <span
            className="tag"
            style={{
              fontSize: 9, color: SEV_COLOR[e.severity], borderColor: SEV_COLOR[e.severity],
              justifySelf: 'start', textTransform: 'uppercase', letterSpacing: '0.06em',
            }}
          >
            {e.severity}
          </span>
          <span>
            <div style={{ color: 'var(--text)' }}>{e.summary}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
              {KIND_LABEL[e.kind] ?? e.kind} {e.target ? `· ${e.target}` : ''}
            </div>
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-2)' }}>{e.ip ?? '—'}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', textAlign: 'right' }} title={e.created_at}>
            {timeAgo(e.created_at)}
          </span>
          <span style={{ textAlign: 'right' }}>
            {e.resolved_at ? (
              <span style={{ fontSize: 10, color: 'var(--edge)' }}>resolvido</span>
            ) : (
              <button type="button" className="btn btn-sm" onClick={() => resolve.mutate(e.id)} style={{ fontSize: 10, padding: '2px 8px' }}>
                Resolver
              </button>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
