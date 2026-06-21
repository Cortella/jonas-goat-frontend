import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Logo } from '../components/atoms';
import { Seo } from '../components/Seo';
import { useAuth } from '../lib/auth';
import {
  api,
  type BillingCycle,
  type CheckoutConfig,
  type CreditPackage,
  type Order,
  type PaymentMethod,
  type Plan,
} from '../lib/api';

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: 'Pix',
  pix_recurring: 'Pix recorrente',
  card: 'Cartão de crédito',
};

const CYCLE_LABEL: Record<BillingCycle, string> = {
  monthly: 'Mensal',
  yearly: 'Anual',
  lifetime: 'Vitalício',
};

type Step = 'select' | 'identity' | 'payment' | 'pay';

export function CheckoutPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const cfg = useQuery({ queryKey: ['checkout-config'], queryFn: api.checkoutConfig });

  // Modo: plano ou créditos (via query string).
  const initialKind = params.get('credits') ? 'credits' : 'plan';
  const [kind, setKind] = useState<'plan' | 'credits'>(initialKind);
  const [plan, setPlan] = useState<Plan>((params.get('plan') as Plan) || 'pro');
  const [cycle, setCycle] = useState<BillingCycle>((params.get('cycle') as BillingCycle) || 'monthly');
  const [packageId, setPackageId] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [useWallet, setUseWallet] = useState(false);
  const [document, setDocument] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');

  const [step, setStep] = useState<Step>('select');
  const [order, setOrder] = useState<Order | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = cfg.data;

  // Default do pacote de créditos quando carregar a config.
  useEffect(() => {
    if (config && kind === 'credits' && !packageId && config.credit_packages[0]) {
      setPackageId(config.credit_packages[0].id);
    }
  }, [config, kind, packageId]);

  // Ajusta método se incompatível (créditos não aceitam pix recorrente).
  useEffect(() => {
    if (kind === 'credits' && method === 'pix_recurring') setMethod('pix');
    if (kind === 'plan' && cycle === 'lifetime' && method === 'pix_recurring') setMethod('pix');
  }, [kind, cycle, method]);

  if (!config) {
    return (
      <Shell>
        <div style={{ padding: 64, textAlign: 'center', color: 'var(--muted)' }}>
          {cfg.isError ? 'Não foi possível carregar o checkout.' : 'Carregando…'}
        </div>
      </Shell>
    );
  }

  const selectedPackage: CreditPackage | undefined =
    kind === 'credits' ? config.credit_packages.find((p) => p.id === packageId) : undefined;

  // Preço-base e prévia de descontos (espelho do backend, só para exibir).
  const base =
    kind === 'plan'
      ? config.plans.find((p) => p.plan === plan)?.cycles.find((c) => c.cycle === cycle)?.price_brl ?? 0
      : selectedPackage?.price_brl ?? 0;

  const discounts: Array<{ label: string; value: number }> = [];
  if (kind === 'plan') {
    if (method === 'pix_recurring' && config.pix_recurring_discount_pct > 0) {
      discounts.push({
        label: `Pix recorrente −${config.pix_recurring_discount_pct}%`,
        value: round2((base * config.pix_recurring_discount_pct) / 100),
      });
    }
    if (config.referral_eligible && config.referral_discount_pct > 0) {
      discounts.push({
        label: `Indicação −${config.referral_discount_pct}%`,
        value: round2((base * config.referral_discount_pct) / 100),
      });
    }
  }
  const totalDiscount = Math.min(round2(discounts.reduce((a, d) => a + d.value, 0)), base);
  const afterDiscount = round2(base - totalDiscount);
  const walletApplied =
    kind === 'plan' && useWallet ? Math.min(config.wallet_balance_brl, afterDiscount) : 0;
  const amount = round2(afterDiscount - walletApplied);
  const creditsReceived = selectedPackage
    ? round2(selectedPackage.price_brl + selectedPackage.bonus_brl)
    : 0;

  const submit = async () => {
    setError(null);
    setCreating(true);
    try {
      const o = await api.createOrder({
        kind,
        plan: kind === 'plan' ? plan : undefined,
        billing_cycle: kind === 'plan' ? cycle : undefined,
        package_id: kind === 'credits' ? packageId : undefined,
        payment_method: method,
        document_number: document.replace(/\D/g, ''),
        use_wallet: kind === 'plan' ? useWallet : false,
        card:
          method === 'card'
            ? { holder: cardHolder, last4: cardNumber.replace(/\D/g, '').slice(-4) }
            : undefined,
      });
      // Gateway hospedado (ex.: Stripe Checkout): redireciona para a página
      // segura do provedor. A confirmação volta pelo webhook.
      if (o.checkout_url && o.status !== 'paid') {
        window.location.href = o.checkout_url;
        return;
      }
      setOrder(o);
      setStep('pay');
    } catch (e) {
      setError((e as Error).message || 'Falha ao criar pedido');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Shell>
      <Seo title="Checkout" description="Finalize sua compra" path="/checkout" noindex />
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '32px 24px 80px' }}>
        <Steps current={step} />

        {step === 'select' && (
          <div className="surface" style={{ padding: 28 }}>
            <SectionTitle title={kind === 'plan' ? 'Escolha seu plano' : 'Carregar créditos'} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <Toggle on={kind === 'plan'} onClick={() => setKind('plan')}>Planos</Toggle>
              <Toggle on={kind === 'credits'} onClick={() => setKind('credits')}>Créditos</Toggle>
            </div>

            {kind === 'plan' ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {config.plans.map((p) => (
                    <button
                      key={p.plan}
                      onClick={() => {
                        setPlan(p.plan);
                        const cycles = p.cycles.map((c) => c.cycle);
                        if (!cycles.includes(cycle)) setCycle(cycles[0]);
                      }}
                      className="surface"
                      style={{
                        textAlign: 'left',
                        padding: 18,
                        cursor: 'pointer',
                        background: plan === p.plan ? 'var(--edge-soft)' : 'var(--bg-2)',
                        border: `1px solid ${plan === p.plan ? 'var(--edge)' : 'var(--line)'}`,
                      }}
                    >
                      <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{p.plan}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                        a partir de {BRL(Math.min(...p.cycles.map((c) => c.price_brl)))}
                      </div>
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {config.plans
                    .find((p) => p.plan === plan)
                    ?.cycles.map((c) => (
                      <Toggle key={c.cycle} on={cycle === c.cycle} onClick={() => setCycle(c.cycle)}>
                        {CYCLE_LABEL[c.cycle]} · {BRL(c.price_brl)}
                      </Toggle>
                    ))}
                </div>
              </>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {config.credit_packages.map((pk) => (
                  <button
                    key={pk.id}
                    onClick={() => setPackageId(pk.id)}
                    className="surface"
                    style={{
                      textAlign: 'left',
                      padding: 18,
                      cursor: 'pointer',
                      background: packageId === pk.id ? 'var(--edge-soft)' : 'var(--bg-2)',
                      border: `1px solid ${packageId === pk.id ? 'var(--edge)' : 'var(--line)'}`,
                    }}
                  >
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 600 }}>
                      {BRL(pk.price_brl + pk.bonus_brl)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                      paga {BRL(pk.price_brl)}
                      {pk.bonus_brl > 0 && (
                        <span style={{ color: 'var(--edge)' }}> · +{BRL(pk.bonus_brl)} bônus</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>
              {kind === 'credits'
                ? `Créditos servem para destravar previsões (${BRL(config.prediction_unlock_cost_brl)} cada) e abater em planos.`
                : 'Pague no Pix, Pix recorrente (com desconto) ou cartão.'}
            </div>

            <FooterNav
              right={
                <button
                  className="btn btn-edge"
                  onClick={() => setStep('identity')}
                  disabled={base <= 0}
                >
                  Continuar
                </button>
              }
            />
          </div>
        )}

        {step === 'identity' && (
          <div className="surface" style={{ padding: 28 }}>
            <SectionTitle
              title="Confirme sua identidade"
              sub="Por segurança, confirme o número do seu CPF antes de pagar."
            />
            {config.identity.has_cpf && (
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
                CPF do cadastro: <strong style={{ fontFamily: 'var(--mono)' }}>{config.identity.cpf_masked}</strong>
              </div>
            )}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 320 }}>
              <span className="t-eyebrow">CPF</span>
              <input
                className="input"
                value={document}
                onChange={(e) => setDocument(maskCpf(e.target.value))}
                placeholder="000.000.000-00"
                inputMode="numeric"
              />
            </label>
            <FooterNav
              left={<button className="btn btn-ghost" onClick={() => setStep('select')}>Voltar</button>}
              right={
                <button
                  className="btn btn-edge"
                  onClick={() => setStep('payment')}
                  disabled={document.replace(/\D/g, '').length !== 11}
                >
                  Continuar
                </button>
              }
            />
          </div>
        )}

        {step === 'payment' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
            <div className="surface" style={{ padding: 28 }}>
              <SectionTitle title="Forma de pagamento" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {config.payment_methods
                  .filter((m) => !(kind === 'credits' && m === 'pix_recurring'))
                  .filter((m) => !(kind === 'plan' && cycle === 'lifetime' && m === 'pix_recurring'))
                  .map((m) => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className="surface"
                      style={{
                        textAlign: 'left',
                        padding: '14px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: method === m ? 'var(--edge-soft)' : 'var(--bg-2)',
                        border: `1px solid ${method === m ? 'var(--edge)' : 'var(--line)'}`,
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{METHOD_LABEL[m]}</span>
                      {m === 'pix_recurring' && config.pix_recurring_discount_pct > 0 && (
                        <span className="tag tag-edge" style={{ fontSize: 10 }}>
                          −{config.pix_recurring_discount_pct}%
                        </span>
                      )}
                    </button>
                  ))}
              </div>

              {method === 'card' && (
                <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="t-eyebrow">Nome no cartão</span>
                    <input className="input" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="t-eyebrow">Número do cartão</span>
                    <input
                      className="input"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="0000 0000 0000 0000"
                      inputMode="numeric"
                    />
                  </label>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    Ambiente de demonstração — não insira dados reais.
                  </div>
                </div>
              )}

              {kind === 'plan' && config.wallet_balance_brl > 0 && (
                <label style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                  <input type="checkbox" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} />
                  Usar saldo de créditos ({BRL(config.wallet_balance_brl)})
                </label>
              )}
            </div>

            <OrderSummary
              kind={kind}
              plan={plan}
              cycle={cycle}
              method={method}
              base={base}
              discounts={discounts}
              walletApplied={walletApplied}
              amount={amount}
              creditsReceived={creditsReceived}
              footer={
                <>
                  {error && <div style={{ fontSize: 12, color: 'var(--loss)', marginBottom: 8 }}>{error}</div>}
                  <button className="btn btn-edge" style={{ width: '100%' }} onClick={submit} disabled={creating}>
                    {creating ? 'Processando…' : amount > 0 ? `Pagar ${BRL(amount)}` : 'Finalizar'}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ width: '100%', marginTop: 8 }}
                    onClick={() => setStep('identity')}
                  >
                    Voltar
                  </button>
                </>
              }
            />
          </div>
        )}

        {step === 'pay' && order && (
          <PayStep order={order} gateway={config.gateway} onDone={async () => { await refresh(); navigate('/perfil'); }} />
        )}
      </div>
    </Shell>
  );
}

// ─── Etapa de pagamento (Pix QR / polling / sucesso) ────────────────────────
function PayStep({ order, gateway, onDone }: { order: Order; gateway: string; onDone: () => void }) {
  const [current, setCurrent] = useState<Order>(order);
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const isPaid = current.status === 'paid';
  const isPix = current.payment_method === 'pix' || current.payment_method === 'pix_recurring';

  // Polling do status enquanto aguarda pagamento.
  useEffect(() => {
    if (isPaid || current.status === 'failed' || current.status === 'cancelled') return;
    const t = setInterval(async () => {
      try {
        const fresh = await api.getOrder(current.id);
        setCurrent(fresh);
      } catch {
        /* ignore */
      }
    }, 3000);
    return () => clearInterval(t);
  }, [current.id, current.status, isPaid]);

  if (isPaid) {
    return (
      <div className="surface" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 44 }}>✅</div>
        <h2 style={{ margin: '12px 0 4px', fontWeight: 600 }}>Pagamento confirmado</h2>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
          {current.kind === 'plan'
            ? `Plano ${current.plan} ativado.`
            : `Créditos adicionados à sua carteira.`}
        </p>
        <button className="btn btn-edge" style={{ marginTop: 20 }} onClick={onDone}>
          Continuar
        </button>
      </div>
    );
  }

  if (current.status === 'failed' || current.status === 'cancelled') {
    return (
      <div className="surface" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 44 }}>⚠️</div>
        <h2 style={{ margin: '12px 0 4px', fontWeight: 600 }}>Pagamento não concluído</h2>
        <Link to="/checkout" className="btn btn-ghost" style={{ marginTop: 16 }}>Tentar de novo</Link>
      </div>
    );
  }

  return (
    <div className="surface" style={{ padding: 32, maxWidth: 460, margin: '0 auto', textAlign: 'center' }}>
      <SectionTitle title={isPix ? 'Pague com Pix' : 'Processando pagamento'} />
      {isPix && current.pix_qr_image && (
        <img
          src={current.pix_qr_image}
          alt="QR Code Pix"
          style={{ width: 220, height: 220, margin: '0 auto', borderRadius: 12, background: '#fff', padding: 8 }}
        />
      )}
      {isPix && current.pix_qr_code && (
        <div style={{ marginTop: 16 }}>
          <div className="t-eyebrow" style={{ marginBottom: 6 }}>Pix copia e cola</div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              wordBreak: 'break-all',
              background: 'var(--bg-2)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: 10,
            }}
          >
            {current.pix_qr_code}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 8 }}
            onClick={() => {
              navigator.clipboard?.writeText(current.pix_qr_code || '');
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? 'Copiado!' : 'Copiar código'}
          </button>
        </div>
      )}
      <div style={{ marginTop: 18, fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <span className="dot dot-pulse" /> Aguardando confirmação do pagamento…
      </div>

      {gateway === 'mock' && (
        <button
          className="btn btn-edge btn-sm"
          style={{ marginTop: 16 }}
          disabled={simulating}
          onClick={async () => {
            setSimulating(true);
            try {
              const fresh = await api.simulateOrderPaid(current.id);
              setCurrent(fresh);
            } finally {
              setSimulating(false);
            }
          }}
        >
          {simulating ? '…' : '🧪 Simular pagamento (preview)'}
        </button>
      )}
    </div>
  );
}

// ─── Resumo lateral do pedido ───────────────────────────────────────────────
function OrderSummary(props: {
  kind: 'plan' | 'credits';
  plan: Plan;
  cycle: BillingCycle;
  method: PaymentMethod;
  base: number;
  discounts: Array<{ label: string; value: number }>;
  walletApplied: number;
  amount: number;
  creditsReceived: number;
  footer: React.ReactNode;
}) {
  const { kind, plan, cycle, base, discounts, walletApplied, amount, creditsReceived, footer } = props;
  return (
    <div className="surface" style={{ padding: 20, position: 'sticky', top: 24 }}>
      <div className="t-eyebrow" style={{ marginBottom: 12 }}>Resumo</div>
      <Row
        label={kind === 'plan' ? `Plano ${plan} · ${CYCLE_LABEL[cycle]}` : 'Recarga de créditos'}
        value={BRL(base)}
      />
      {discounts.map((d) => (
        <Row key={d.label} label={d.label} value={`− ${BRL(d.value)}`} color="var(--edge)" />
      ))}
      {walletApplied > 0 && <Row label="Saldo de créditos" value={`− ${BRL(walletApplied)}`} color="var(--edge)" />}
      {kind === 'credits' && (
        <Row label="Créditos recebidos" value={BRL(creditsReceived)} color="var(--edge)" />
      )}
      <hr className="hl" style={{ margin: '12px 0' }} />
      <Row label="Total a pagar" value={BRL(amount)} bold />
      <div style={{ marginTop: 16 }}>{footer}</div>
    </div>
  );
}

// ─── Pequenos componentes de layout ─────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ borderBottom: '1px solid var(--line)', padding: '14px 24px' }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Logo size={16} />
        </Link>
      </div>
      {children}
    </div>
  );
}

function Steps({ current }: { current: Step }) {
  const order: Step[] = ['select', 'identity', 'payment', 'pay'];
  const labels: Record<Step, string> = {
    select: 'Plano',
    identity: 'Identidade',
    payment: 'Pagamento',
    pay: 'Confirmação',
  };
  const idx = order.indexOf(current);
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
      {order.map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 12,
              padding: '4px 12px',
              borderRadius: 999,
              background: i <= idx ? 'var(--edge-soft)' : 'var(--bg-2)',
              border: `1px solid ${i <= idx ? 'var(--edge)' : 'var(--line)'}`,
              color: i <= idx ? 'var(--edge)' : 'var(--muted)',
              fontWeight: i === idx ? 600 : 400,
            }}
          >
            {i + 1}. {labels[s]}
          </span>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h2 style={{ margin: 0, fontWeight: 600, fontSize: 20 }}>{title}</h2>
      {sub && <p style={{ margin: '6px 0 0', color: 'var(--text-2)', fontSize: 13 }}>{sub}</p>}
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: 999,
        fontSize: 13,
        cursor: 'pointer',
        background: on ? 'var(--surface-2)' : 'transparent',
        border: `1px solid ${on ? 'var(--edge)' : 'var(--line)'}`,
        color: on ? 'var(--text)' : 'var(--text-2)',
        fontWeight: on ? 600 : 400,
      }}
    >
      {children}
    </button>
  );
}

function FooterNav({ left, right }: { left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

function Row({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: bold ? 15 : 13, padding: '4px 0' }}>
      <span style={{ color: 'var(--text-2)', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ fontFamily: 'var(--mono)', color: color || 'var(--text)', fontWeight: bold ? 600 : 400 }}>
        {value}
      </span>
    </div>
  );
}

function maskCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
