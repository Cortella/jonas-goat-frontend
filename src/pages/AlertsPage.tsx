import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppBar } from '../components/AppBar';
import { SectionHeader } from '../components/atoms';
import { api, type AlertChannel, type AlertRule } from '../lib/api';

export function AlertsPage() {
  const qc = useQueryClient();
  const rulesQ = useQuery({ queryKey: ['alert-rules'], queryFn: () => api.listRules() });
  const channelsQ = useQuery({ queryKey: ['alert-channels'], queryFn: () => api.listChannels() });

  const toggleStatus = useMutation({
    mutationFn: ({ rule, status }: { rule: AlertRule; status: AlertRule['status'] }) =>
      api.updateRule(rule.id, { ...rule, status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alert-rules'] }),
  });

  const removeRule = useMutation({
    mutationFn: (id: number) => api.deleteRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alert-rules'] }),
  });

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <AppBar />

      <div style={{ padding: '32px 32px 16px', maxWidth: 1280, margin: '0 auto' }}>
        <SectionHeader
          eyebrow="Alertas e canais"
          title="Receba só o que importa, no canal que você usa."
          sub="Configure regras com EV mínimo, mercados, ligas e times. Cada canal pode ter regras diferentes."
        />
      </div>

      <div style={{ padding: '0 32px 32px', display: 'grid', gridTemplateColumns: '1fr 460px', gap: 24, maxWidth: 1280, margin: '0 auto' }}>
        <div className="surface" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Regras ativas</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                {rulesQ.data
                  ? `${rulesQ.data.length} regras · ${rulesQ.data.reduce((a, r) => a + r.sent_count, 0)} alertas enviados`
                  : '—'}
              </div>
            </div>
            <button className="btn btn-edge btn-sm">+ Nova regra</button>
          </div>

          {rulesQ.isLoading && (
            <div style={{ padding: 32, color: 'var(--muted)' }}>Carregando regras…</div>
          )}
          {rulesQ.isError && (
            <div style={{ padding: 24, color: 'var(--loss)' }}>{String(rulesQ.error)}</div>
          )}
          {rulesQ.data?.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Nenhuma regra criada ainda. Clique em <b>+ Nova regra</b> para começar.
            </div>
          )}
          {rulesQ.data?.map((r) => {
            const hitRate = r.sent_count > 0 ? r.hit_count / r.sent_count : 0;
            return (
              <div
                key={r.id}
                style={{
                  padding: '18px 20px',
                  borderTop: '1px solid var(--line)',
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 220px 140px 80px',
                  gap: 16,
                  alignItems: 'center',
                }}
              >
                <button
                  type="button"
                  aria-label="toggle status"
                  onClick={() =>
                    toggleStatus.mutate({ rule: r, status: r.status === 'on' ? 'paused' : 'on' })
                  }
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: 999,
                    position: 'relative',
                    cursor: 'pointer',
                    background: r.status === 'on' ? 'var(--edge)' : 'var(--surface-2)',
                    border: `1px solid ${r.status === 'on' ? 'var(--edge)' : 'var(--line-2)'}`,
                    opacity: r.status === 'draft' ? 0.4 : 1,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 1,
                      left: r.status === 'on' ? 17 : 1,
                      width: 16,
                      height: 16,
                      borderRadius: 999,
                      background: r.status === 'on' ? 'var(--edge-ink)' : 'var(--text-2)',
                      transition: 'left 120ms',
                    }}
                  />
                </button>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {r.name}
                    {r.status === 'paused' && <span className="tag tag-warn" style={{ marginLeft: 8, fontSize: 10 }}>pausada</span>}
                    {r.status === 'draft' && <span className="tag" style={{ marginLeft: 8, fontSize: 10 }}>rascunho</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, fontFamily: 'var(--mono)' }}>
                    EV ≥ {r.min_ev_pct}% · {r.leagues.join(',') || 'todas ligas'} ·{' '}
                    {r.markets.join(',') || 'todos mercados'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {r.channels.map((c) => (
                    <span key={c} className="tag" style={{ fontSize: 10 }}>{c}</span>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  <div>{r.sent_count} enviados</div>
                  <div style={{ color: 'var(--edge)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                    {r.sent_count > 0 ? `${(hitRate * 100).toFixed(0)}% acerto` : '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      if (confirm(`Apagar regra "${r.name}"?`)) removeRule.mutate(r.id);
                    }}
                    style={{ padding: '6px 8px', color: 'var(--loss)' }}
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="surface-2" style={{ padding: 24 }}>
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Pré-visualização · Telegram</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
            Como o alerta vai chegar.
          </div>

          <div
            style={{
              background: 'oklch(0.20 0.012 240)',
              borderRadius: 18,
              padding: 16,
              border: '1px solid var(--line)',
              fontFamily: 'var(--sans)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottom: '1px solid var(--line)', marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 999, background: 'oklch(0.50 0.10 230)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600 }}>JG</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Jonas Goat · alertas</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>bot oficial · agora</div>
              </div>
            </div>

            <div style={{ background: 'oklch(0.24 0.012 240)', borderRadius: 12, padding: 14, fontSize: 13, lineHeight: 1.55, borderLeft: '2px solid var(--edge)' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--edge)', letterSpacing: '0.04em', marginBottom: 8 }}>▲ EV +9.1% · CONFIANÇA ALTA</div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Bayern de Munique vs Bayer Leverkusen</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Bundesliga · sábado, 17:00</div>

              {(
                [
                  ['Mercado', 'Vitória Leverkusen (2)', false],
                  ['Nossa probabilidade', '27.0%', false],
                  ['Melhor odd', '3.45 · Pinnacle', true],
                  ['Stake Kelly ½', 'R$ 36,80 (1.84%)', false],
                ] as Array<[string, string, boolean]>
              ).map(([l, v, hl]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-2)' }}>{l}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, color: hl ? 'var(--edge)' : undefined }}>{v}</span>
                </div>
              ))}

              <hr className="hl" style={{ margin: '12px 0' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-edge btn-sm" style={{ flex: 1, justifyContent: 'center' }}>Ver detalhes</button>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }}>Registrar aposta</button>
              </div>
            </div>

            <div style={{ marginTop: 12, fontSize: 10, color: 'var(--muted)', textAlign: 'center' }}>
              Aposte com responsabilidade. +18 · www.jonasgoat.com/responsavel
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <div className="t-eyebrow" style={{ marginBottom: 12 }}>Canais conectados</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {channelsQ.isLoading && (
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>Carregando…</div>
              )}
              {channelsQ.data?.length === 0 && (
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                  Nenhum canal conectado.
                </div>
              )}
              {channelsQ.data?.map((c: AlertChannel) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    background: 'var(--surface)',
                    borderRadius: 6,
                    border: '1px solid var(--line)',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: c.enabled ? 'var(--edge)' : 'var(--line-2)',
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1, textTransform: 'capitalize' }}>
                    {c.kind}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                    {c.handle}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
