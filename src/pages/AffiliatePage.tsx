import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppBar } from '../components/AppBar';
import { SectionHeader, Stat } from '../components/atoms';
import { api, type AffiliateMe, type AffiliateCommission } from '../lib/api';
import { money as BRL } from '../lib/money';

const STATUS_COLOR: Record<AffiliateCommission['status'], string> = {
  pending: 'var(--warn)',
  paid: 'var(--edge)',
  cancelled: 'var(--loss)',
};

const STATUS_LABEL: Record<AffiliateCommission['status'], string> = {
  pending: 'Pendente',
  paid: 'Paga',
  cancelled: 'Cancelada',
};

export function AffiliatePage() {
  const q = useQuery({ queryKey: ['affiliate-me'], queryFn: () => api.affiliateMe() });

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <AppBar />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 32 }}>
        <SectionHeader
          eyebrow="Programa de afiliados"
          title="Convide e ganhe a cada assinatura."
          sub="Compartilhe seu link, acompanhe quem entrou pelo seu convite e veja suas comissões em tempo real. Pagamento direto a cada cobrança do convidado — comissão única, sem múltiplos níveis."
        />

        {q.isLoading && (
          <div style={{ padding: 48, color: 'var(--muted)', textAlign: 'center' }}>Carregando…</div>
        )}
        {q.isError && (
          <div className="surface" style={{ padding: 24, color: 'var(--loss)' }}>
            Erro: {String(q.error)}
          </div>
        )}
        {q.data && <AffiliateBody data={q.data} />}
      </div>
    </div>
  );
}

function AffiliateBody({ data }: Readonly<{ data: AffiliateMe }>) {
  const link = `${window.location.origin}${data.link_path}`;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  if (!data.enabled) {
    return (
      <div className="surface" style={{ padding: 32, textAlign: 'center', marginTop: 24 }}>
        <p style={{ fontSize: 16, marginBottom: 8 }}>Programa de afiliados desativado</p>
        <p style={{ color: 'var(--text-2)', fontSize: 13 }}>
          O administrador desativou o programa temporariamente. Volte mais tarde.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Link card + KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
        <div className="surface" style={{ padding: 24 }}>
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Seu link de afiliado</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 16px',
              background: 'var(--bg-2)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              fontFamily: 'var(--mono)',
              fontSize: 13,
            }}
          >
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-2)' }}>
              {link}
            </span>
            <button
              type="button"
              onClick={copy}
              className="btn btn-edge btn-sm"
              style={{ minWidth: 96, justifyContent: 'center' }}
            >
              {copied ? 'Copiado ✓' : 'Copiar'}
            </button>
          </div>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div className="t-eyebrow">Código</div>
              <div className="t-num" style={{ fontSize: 18, fontWeight: 500, marginTop: 4 }}>
                {data.affiliate_code}
              </div>
            </div>
            <div>
              <div className="t-eyebrow">Sua comissão</div>
              <div
                className="t-num"
                style={{ fontSize: 18, fontWeight: 500, marginTop: 4, color: 'var(--edge)' }}
              >
                {data.my_pct}%
                {data.has_override && (
                  <span className="tag" style={{ fontSize: 9, marginLeft: 6 }}>
                    customizada
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                padrão: {data.default_pct}%
              </div>
            </div>
          </div>
          {data.sponsor && (
            <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-2)', borderRadius: 6, fontSize: 12, color: 'var(--text-2)' }}>
              Convidado por <strong>{data.sponsor.email}</strong>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateRows: 'auto auto auto', gap: 12 }}>
          <div className="surface" style={{ padding: 20 }}>
            <Stat label="Convidados" value={String(data.invited_count)} sub="usuários cadastrados via seu link" />
          </div>
          <div className="surface" style={{ padding: 20 }}>
            <Stat
              label="A receber"
              value={BRL(data.total_pending_brl)}
              sub="comissões pendentes"
              color="var(--warn)"
            />
          </div>
          <div className="surface" style={{ padding: 20 }}>
            <Stat
              label="Recebido"
              value={BRL(data.total_earned_brl)}
              sub="comissões pagas"
              color="var(--edge)"
            />
          </div>
        </div>
      </div>

      {/* Invited list */}
      <div className="surface" style={{ padding: 0, marginTop: 24, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', fontSize: 13, fontWeight: 500 }}>
          Quem entrou pelo seu link
        </div>
        {data.invited.length === 0 ? (
          <div style={{ padding: 32, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
            Você ainda não convidou ninguém. Compartilhe seu link nas redes!
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 140px 140px',
                gap: 12,
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
              <span>Cobrança ativa</span>
              <span>Convite em</span>
            </div>
            {data.invited.map((u) => (
              <div
                key={u.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px 140px 140px',
                  gap: 12,
                  padding: '12px 20px',
                  borderTop: '1px solid var(--line)',
                  alignItems: 'center',
                  fontSize: 13,
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{u.email}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{u.name || '—'}</div>
                </div>
                <span className="tag" style={{ fontSize: 10, justifySelf: 'start', textTransform: 'capitalize' }}>
                  {u.plan}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                  {u.active_amount != null
                    ? `${BRL(u.active_amount)}/${u.active_billing ?? '—'}`
                    : '—'}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
                  {u.created_at?.slice(0, 10)}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Commissions */}
      <div className="surface" style={{ padding: 0, marginTop: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', fontSize: 13, fontWeight: 500 }}>
          Histórico de comissões
        </div>
        {data.recent_commissions.length === 0 ? (
          <div style={{ padding: 32, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
            Sem comissões ainda. Quando seus convidados forem cobrados em planos pagos, suas comissões aparecem aqui.
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 100px 100px 120px 120px',
                gap: 12,
                padding: '12px 20px',
                fontSize: 11,
                fontFamily: 'var(--mono)',
                color: 'var(--muted)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: 'var(--bg-2)',
              }}
            >
              <span>Convidado</span>
              <span style={{ textAlign: 'right' }}>Base</span>
              <span style={{ textAlign: 'right' }}>%</span>
              <span style={{ textAlign: 'right' }}>Comissão</span>
              <span>Status</span>
              <span>Quando</span>
            </div>
            {data.recent_commissions.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px 100px 100px 120px 120px',
                  gap: 12,
                  padding: '12px 20px',
                  borderTop: '1px solid var(--line)',
                  alignItems: 'center',
                  fontSize: 13,
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{c.beneficiary_email}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.beneficiary_name || '—'}</div>
                </div>
                <span style={{ fontFamily: 'var(--mono)', textAlign: 'right' }}>{BRL(c.base_amount_brl)}</span>
                <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', color: 'var(--text-2)' }}>{c.pct_used}%</span>
                <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', fontWeight: 600, color: 'var(--edge)' }}>
                  {BRL(c.amount_brl)}
                </span>
                <span
                  className="tag"
                  style={{
                    fontSize: 10,
                    color: STATUS_COLOR[c.status],
                    borderColor: STATUS_COLOR[c.status],
                    justifySelf: 'start',
                  }}
                >
                  {STATUS_LABEL[c.status]}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
                  {c.paid_at?.slice(0, 10) || c.created_at.slice(0, 10)}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
