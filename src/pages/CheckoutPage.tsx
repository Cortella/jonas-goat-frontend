import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Logo } from '../components/atoms';
import { Seo } from '../components/Seo';
import { useAuth } from '../lib/auth';
import {
  api,
  type BillingCycle,
  type CreditPackage,
  type Order,
  type PaymentMethod,
  type Plan,
} from '../lib/api';
import { money } from '../lib/money';


const METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: 'Pix',
  pix_recurring: 'Pix recorrente',
  card: 'Cartão de crédito',
};

const METHOD_HINT: Record<PaymentMethod, string> = {
  pix: 'Aprovação na hora, sem taxas.',
  pix_recurring: 'Renova sozinho todo período, com desconto.',
  card: 'Visa, Master, Elo, Amex. Renovação automática.',
};

const METHOD_ICON: Record<PaymentMethod, string> = {
  pix: '⚡',
  pix_recurring: '🔁',
  card: '💳',
};

const CYCLE_LABEL: Record<BillingCycle, string> = {
  monthly: 'Mensal',
  yearly: 'Anual',
  lifetime: 'Vitalício',
};

const PLAN_TAGLINE: Partial<Record<Plan, string>> = {
  pro: 'Tudo liberado, previsões ilimitadas',
  founders: 'Preço travado para sempre',
};

// Reforço de valor no resumo — o que a pessoa leva ao assinar.
const PLAN_INCLUDES: Partial<Record<Plan, string[]>> = {
  pro: [
    'Previsões ilimitadas',
    'Todas as ligas + Copa do Mundo 2026',
    'Todos os mercados (1X2, OU, BTTS, escanteios…)',
    'Sugestão de Kelly + bankroll tracker',
    'Alertas no Telegram, email e push',
  ],
  founders: [
    'Tudo do Pro — para sempre',
    'Preço de fundador travado',
    'Todo recurso futuro incluído',
    'Selo de Founder',
  ],
};

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

  // Volta do Stripe hospedado (?status=success|cancel&order=ID). No sucesso,
  // carrega o pedido e deixa o PayStep aguardar a confirmação do webhook e
  // então redirecionar para a Copa. No cancelamento, mostra aviso.
  const returnStatus = params.get('status');
  const returnOrder = params.get('order');
  useEffect(() => {
    if (returnStatus === 'success' && returnOrder) {
      api.getOrder(Number(returnOrder)).then(setOrder).catch(() => {});
    } else if (returnStatus === 'cancel') {
      setError('Pagamento cancelado. Você pode tentar novamente.');
    }
  }, [returnStatus, returnOrder]);

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

  const planObj = config.plans.find((p) => p.plan === plan);

  // Preço-base e prévia de descontos (espelho do backend, só para exibir).
  const base =
    kind === 'plan'
      ? planObj?.cycles.find((c) => c.cycle === cycle)?.price_brl ?? 0
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

  // Stripe hospedado: o cartão é digitado na página segura da Stripe (redirect),
  // então não coletamos número de cartão aqui.
  const stripeHosted = config.gateway === 'stripe';
  const cpfDigits = document.replace(/\D/g, '');
  const cardOk =
    method !== 'card' || stripeHosted || (cardHolder.trim().length > 2 && cardNumber.replace(/\D/g, '').length >= 13);
  const canPay = base > 0 && cpfDigits.length === 11 && cardOk && !creating;

  const availableMethods = config.payment_methods
    .filter((m) => !(kind === 'credits' && m === 'pix_recurring'))
    .filter((m) => !(kind === 'plan' && cycle === 'lifetime' && m === 'pix_recurring'));

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
        document_number: cpfDigits,
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
    } catch (e) {
      setError((e as Error).message || 'Falha ao criar pedido');
    } finally {
      setCreating(false);
    }
  };

  // Depois de pagar, leva pra Copa já logado (refresh reflete o plano novo).
  const finish = async () => {
    await refresh();
    navigate('/copa-2026');
  };

  // ── Tela de pagamento (Pix/QR/processando/sucesso) ──
  if (order) {
    return (
      <Shell>
        <Seo title="Checkout" description="Finalize sua compra" path="/checkout" noindex />
        <div style={{ maxWidth: 920, margin: '0 auto', padding: '32px 24px 80px' }}>
          <PayStep order={order} gateway={config.gateway} onDone={finish} />
        </div>
      </Shell>
    );
  }

  // Economia do anual vs mensal (quando o plano tem os dois ciclos).
  const monthly = planObj?.cycles.find((c) => c.cycle === 'monthly')?.price_brl;
  const yearly = planObj?.cycles.find((c) => c.cycle === 'yearly')?.price_brl;
  const yearlySavePct =
    monthly && yearly && monthly > 0 ? Math.round((1 - yearly / (monthly * 12)) * 100) : 0;

  const includes = kind === 'plan' ? PLAN_INCLUDES[plan] : undefined;

  return (
    <Shell>
      <Seo title="Checkout" description="Finalize sua compra" path="/checkout" noindex />
      <style>{`
        .co-grid { display:grid; grid-template-columns: minmax(0,1fr) 400px; gap:28px; align-items:start; }
        @media (max-width: 900px){ .co-grid{ grid-template-columns:1fr; } .co-summary{ position:static !important; } }
      `}</style>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '36px 20px 100px' }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          Finalize sua assinatura
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: 15, margin: '0 0 28px' }}>
          Menos de 1 minuto. Acesso liberado na hora da confirmação.
        </p>

        <div className="co-grid">
          {/* ─── Coluna do formulário ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 1. Plano */}
            <Card>
              <StepHead n={1} title={kind === 'plan' ? 'Escolha seu plano' : 'Carregar créditos'} />
              <div style={{ display: 'inline-flex', gap: 4, marginBottom: 20, padding: 4, background: 'var(--bg-2)', borderRadius: 999, border: '1px solid var(--line)' }}>
                <Seg on={kind === 'plan'} onClick={() => setKind('plan')}>Planos</Seg>
                <Seg on={kind === 'credits'} onClick={() => setKind('credits')}>Créditos</Seg>
              </div>

              {kind === 'plan' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {config.plans.map((p) => {
                      const from = Math.min(...p.cycles.map((c) => c.price_brl));
                      const popular = p.plan === 'pro';
                      const eternal = p.plan === 'founders';
                      return (
                        <PlanCard
                          key={p.plan}
                          active={plan === p.plan}
                          name={p.plan}
                          from={from}
                          tagline={PLAN_TAGLINE[p.plan]}
                          badge={popular ? 'Mais popular' : eternal ? 'Eterno' : undefined}
                          onClick={() => {
                            setPlan(p.plan);
                            const cycles = p.cycles.map((c) => c.cycle);
                            if (!cycles.includes(cycle)) setCycle(cycles[0]);
                          }}
                        />
                      );
                    })}
                  </div>

                  <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {planObj?.cycles.map((c) => {
                      const save = c.cycle === 'yearly' && yearlySavePct > 0 ? `economize ${yearlySavePct}%` : undefined;
                      return (
                        <CycleChip
                          key={c.cycle}
                          on={cycle === c.cycle}
                          onClick={() => setCycle(c.cycle)}
                          label={CYCLE_LABEL[c.cycle]}
                          price={money(c.price_brl)}
                          save={save}
                        />
                      );
                    })}
                  </div>
                </>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {config.credit_packages.map((pk) => (
                    <Selectable key={pk.id} active={packageId === pk.id} onClick={() => setPackageId(pk.id)}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700 }}>
                        {money(pk.price_brl + pk.bonus_brl)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                        paga {money(pk.price_brl)}
                        {pk.bonus_brl > 0 && (
                          <span style={{ color: 'var(--edge)' }}> · +{money(pk.bonus_brl)} bônus</span>
                        )}
                      </div>
                    </Selectable>
                  ))}
                </div>
              )}
            </Card>

            {/* 2. Identidade */}
            <Card>
              <StepHead n={2} title="Seus dados" sub="Confirme seu CPF para emitir o pagamento." />
              {config.identity.has_cpf && (
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10 }}>
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
            </Card>

            {/* 3. Pagamento */}
            <Card>
              <StepHead n={3} title="Forma de pagamento" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {availableMethods.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    style={{
                      textAlign: 'left',
                      padding: '14px 16px',
                      cursor: 'pointer',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      background: method === m ? 'var(--edge-soft)' : 'var(--bg-2)',
                      border: `1.5px solid ${method === m ? 'var(--edge)' : 'var(--line)'}`,
                      transition: 'border-color .12s, background .12s',
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{METHOD_ICON[m]}</span>
                    <span style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {METHOD_LABEL[m]}
                        {m === 'pix_recurring' && config.pix_recurring_discount_pct > 0 && (
                          <span className="tag tag-edge" style={{ fontSize: 10 }}>
                            −{config.pix_recurring_discount_pct}%
                          </span>
                        )}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{METHOD_HINT[m]}</span>
                    </span>
                    <span
                      aria-hidden
                      style={{
                        width: 18, height: 18, borderRadius: 999, flexShrink: 0,
                        border: `2px solid ${method === m ? 'var(--edge)' : 'var(--line)'}`,
                        background: method === m ? 'var(--edge)' : 'transparent',
                        boxShadow: method === m ? 'inset 0 0 0 3px var(--bg-2)' : 'none',
                      }}
                    />
                  </button>
                ))}
              </div>

              {method === 'card' && stripeHosted && (
                <div
                  style={{
                    marginTop: 14, padding: '12px 14px', borderRadius: 10,
                    background: 'var(--bg-2)', border: '1px solid var(--line)',
                    fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 10,
                  }}
                >
                  <span aria-hidden style={{ fontSize: 18 }}>🔒</span>
                  Você vai concluir o pagamento na página segura da Stripe — é lá que o cartão é digitado.
                </div>
              )}

              {method === 'card' && !stripeHosted && (
                <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="t-eyebrow">Nome no cartão</span>
                    <input className="input" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} placeholder="Como impresso no cartão" />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="t-eyebrow">Número do cartão</span>
                    <input
                      className="input"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(maskCard(e.target.value))}
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
                  Usar saldo de créditos ({money(config.wallet_balance_brl)})
                </label>
              )}
            </Card>
          </div>

          {/* ─── Resumo lateral fixo ─── */}
          <div className="co-summary" style={{ position: 'sticky', top: 24 }}>
            <div
              className="surface"
              style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--edge)' }}
            >
              {/* Cabeçalho com destaque */}
              <div style={{ padding: '16px 22px', background: 'var(--edge-soft)', borderBottom: '1px solid var(--line)' }}>
                <div className="t-eyebrow" style={{ marginBottom: 2 }}>Resumo do pedido</div>
                <strong style={{ fontSize: 15, textTransform: 'capitalize' }}>
                  {kind === 'plan' ? `Jonas Goat ${plan}` : 'Recarga de créditos'}
                </strong>
              </div>

              <div style={{ padding: 22 }}>
                <Row
                  label={kind === 'plan' ? CYCLE_LABEL[cycle] : 'Pacote selecionado'}
                  value={money(base)}
                />
                {discounts.map((d) => (
                  <Row key={d.label} label={d.label} value={`− ${money(d.value)}`} color="var(--edge)" />
                ))}
                {walletApplied > 0 && <Row label="Saldo de créditos" value={`− ${money(walletApplied)}`} color="var(--edge)" />}
                {kind === 'credits' && (
                  <Row label="Créditos recebidos" value={money(creditsReceived)} color="var(--edge)" />
                )}
                <hr className="hl" style={{ margin: '12px 0' }} />
                <Row label="Total" value={money(amount)} bold />

                {error && <div style={{ fontSize: 12, color: 'var(--loss)', marginTop: 12 }}>{error}</div>}

                <button
                  className="btn btn-edge"
                  style={{ width: '100%', marginTop: 16, padding: '14px 0', fontSize: 16, fontWeight: 700 }}
                  onClick={submit}
                  disabled={!canPay}
                >
                  {creating ? 'Processando…' : amount > 0 ? `Pagar ${money(amount)}` : 'Finalizar'}
                </button>

                {!canPay && !creating && cpfDigits.length !== 11 && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>
                    Preencha seu CPF para continuar.
                  </div>
                )}

                {includes && includes.length > 0 && (
                  <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                    <div className="t-eyebrow" style={{ marginBottom: 10 }}>Incluído</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {includes.map((f) => (
                        <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text-2)' }}>
                          <span aria-hidden style={{ color: 'var(--edge)', flexShrink: 0 }}>✓</span> {f}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Trust icon="🔒" text="Pagamento criptografado e 100% seguro" />
                  <Trust icon="↩️" text="7 dias de garantia — cancele quando quiser" />
                  <Trust icon="⚡" text="Acesso liberado na hora da confirmação" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ─── Etapa de pagamento (Pix QR / polling / sucesso) ────────────────────────
function PayStep({ order, gateway, onDone }: { order: Order; gateway: string; onDone: () => void }) {
  const [current, setCurrent] = useState<Order>(order);
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
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

  // Ao confirmar, manda pra Copa automaticamente (já logado).
  useEffect(() => {
    if (!isPaid) return;
    setRedirecting(true);
    const t = setTimeout(() => { onDone(); }, 1400);
    return () => clearTimeout(t);
  }, [isPaid, onDone]);

  if (isPaid) {
    return (
      <div className="surface" style={{ padding: 48, textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <h2 style={{ margin: '14px 0 4px', fontWeight: 700, fontSize: 22 }}>Pagamento confirmado!</h2>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
          {current.kind === 'plan'
            ? `Plano ${current.plan} ativado. Bom proveito! 🐐`
            : `Créditos adicionados à sua carteira.`}
        </p>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>
          {redirecting ? 'Te levando para a Copa 2026…' : ''}
        </p>
        <button className="btn btn-edge" style={{ marginTop: 20, padding: '11px 22px', fontWeight: 700 }} onClick={onDone}>
          Ir para a Copa 2026 →
        </button>
      </div>
    );
  }

  if (current.status === 'failed' || current.status === 'cancelled') {
    return (
      <div className="surface" style={{ padding: 40, textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ fontSize: 44 }}>⚠️</div>
        <h2 style={{ margin: '12px 0 4px', fontWeight: 600 }}>Pagamento não concluído</h2>
        <Link to="/checkout" className="btn btn-ghost" style={{ marginTop: 16 }}>Tentar de novo</Link>
      </div>
    );
  }

  return (
    <div className="surface" style={{ padding: 32, maxWidth: 460, margin: '0 auto', textAlign: 'center' }}>
      <h2 style={{ margin: '0 0 18px', fontWeight: 700, fontSize: 20 }}>
        {isPix ? 'Pague com Pix' : 'Processando pagamento'}
      </h2>
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

// ─── Layout / componentes ───────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ borderBottom: '1px solid var(--line)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Logo size={16} />
        </Link>
        <span style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span aria-hidden>🔒</span> Compra segura
        </span>
      </div>
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="surface" style={{ padding: 24 }}>{children}</div>;
}

function StepHead({ n, title, sub }: { n: number; title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span
        style={{
          flexShrink: 0, width: 26, height: 26, borderRadius: 999,
          background: 'var(--edge-soft)', border: '1px solid var(--edge)', color: 'var(--edge)',
          display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, fontFamily: 'var(--mono)',
        }}
      >
        {n}
      </span>
      <div>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>{title}</h2>
        {sub && <p style={{ margin: '4px 0 0', color: 'var(--text-2)', fontSize: 13 }}>{sub}</p>}
      </div>
    </div>
  );
}

function PlanCard({
  active, name, from, tagline, badge, onClick,
}: {
  active: boolean; name: string; from: number; tagline?: string; badge?: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'relative',
        textAlign: 'left',
        padding: 18,
        cursor: 'pointer',
        borderRadius: 14,
        background: active ? 'var(--edge-soft)' : 'var(--bg-2)',
        border: `1.5px solid ${active ? 'var(--edge)' : 'var(--line)'}`,
        transition: 'border-color .12s, background .12s',
      }}
    >
      {badge && (
        <span
          className="tag tag-edge"
          style={{ position: 'absolute', top: -9, right: 14, fontSize: 10, padding: '2px 8px', fontWeight: 700 }}
        >
          {badge}
        </span>
      )}
      <div style={{ fontWeight: 700, textTransform: 'capitalize', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        {name}
        {active && <span aria-hidden style={{ color: 'var(--edge)', fontSize: 14 }}>✓</span>}
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>a partir de <strong style={{ color: 'var(--text)' }}>{money(from)}</strong></div>
      {tagline && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 8, lineHeight: 1.4 }}>{tagline}</div>}
    </button>
  );
}

function CycleChip({
  on, onClick, label, price, save,
}: {
  on: boolean; onClick: () => void; label: string; price: string; save?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '10px 16px',
        borderRadius: 12,
        cursor: 'pointer',
        textAlign: 'left',
        background: on ? 'var(--edge-soft)' : 'var(--bg-2)',
        border: `1.5px solid ${on ? 'var(--edge)' : 'var(--line)'}`,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
        {label} · <span style={{ fontFamily: 'var(--mono)' }}>{price}</span>
      </div>
      {save && <div style={{ fontSize: 11, color: 'var(--edge)', fontWeight: 600, marginTop: 2 }}>{save}</div>}
    </button>
  );
}

function Selectable({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: 16,
        cursor: 'pointer',
        borderRadius: 12,
        background: active ? 'var(--edge-soft)' : 'var(--bg-2)',
        border: `1.5px solid ${active ? 'var(--edge)' : 'var(--line)'}`,
      }}
    >
      {children}
    </button>
  );
}

function Seg({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '7px 18px',
        borderRadius: 999,
        fontSize: 13,
        cursor: 'pointer',
        border: 'none',
        background: on ? 'var(--edge)' : 'transparent',
        color: on ? 'oklch(0.16 0.006 240)' : 'var(--text-2)',
        fontWeight: on ? 700 : 500,
      }}
    >
      {children}
    </button>
  );
}

function Row({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: bold ? 18 : 13, padding: '5px 0', gap: 12 }}>
      <span style={{ color: 'var(--text-2)', fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontFamily: 'var(--mono)', color: color || 'var(--text)', fontWeight: bold ? 700 : 400, whiteSpace: 'nowrap' }}>
        {value}
      </span>
    </div>
  );
}

function Trust({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-2)' }}>
      <span aria-hidden>{icon}</span> {text}
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

function maskCard(v: string): string {
  return v
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
    .trim();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
