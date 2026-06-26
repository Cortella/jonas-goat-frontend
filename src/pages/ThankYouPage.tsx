import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/atoms';
import { Seo } from '../components/Seo';
import { api, type Order } from '../lib/api';
import { money } from '../lib/money';
import { trackPurchase } from '../lib/analytics';

// Página de agradecimento exibida após o pagamento confirmado. É o destino de
// conversão que o Google Ads mede: ao carregar com um pedido pago, dispara o
// evento de compra (GA4 + conversão do Ads), deduplicado pelo id do pedido.

function alreadyFired(orderId: number): boolean {
  try {
    return localStorage.getItem(`jg_conv_${orderId}`) === '1';
  } catch {
    return false;
  }
}
function markFired(orderId: number): void {
  try {
    localStorage.setItem(`jg_conv_${orderId}`, '1');
  } catch {
    /* ignore */
  }
}

export function ThankYouPage() {
  const [params] = useSearchParams();
  const orderId = Number(params.get('order'));
  const [order, setOrder] = useState<Order | null>(null);
  const fired = useRef(false);

  // Busca o pedido para confirmar o pagamento e ter o valor da conversão.
  useEffect(() => {
    if (!orderId) return;
    api.getOrder(orderId).then(setOrder).catch(() => {});
  }, [orderId]);

  // Dispara a conversão uma única vez, quando o pedido estiver pago.
  useEffect(() => {
    if (!order || fired.current) return;
    if (order.status !== 'paid') return;
    fired.current = true;
    if (!alreadyFired(order.id)) {
      trackPurchase({
        transactionId: order.id,
        value: order.amount_brl,
        currency: 'BRL',
        plan: order.plan,
        cycle: order.billing_cycle,
      });
      markFired(order.id);
    }
  }, [order]);

  const isPlan = order?.kind === 'plan';

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Seo title="Obrigado pela assinatura" description="Pagamento confirmado." path="/obrigado" noindex />
      <div style={{ borderBottom: '1px solid var(--line)', padding: '14px 24px' }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Logo size={16} />
        </Link>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '64px 24px 80px', textAlign: 'center' }}>
        <div
          style={{
            width: 72, height: 72, margin: '0 auto 20px', borderRadius: 999,
            background: 'var(--edge-soft)', border: '1px solid var(--edge)',
            display: 'grid', placeItems: 'center', fontSize: 36,
          }}
        >
          🐐
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Obrigado pela assinatura!
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: 15, margin: '0 0 4px', lineHeight: 1.5 }}>
          {isPlan && order?.plan
            ? `Seu plano ${order.plan} está ativo. Bem-vindo ao Jonas Goat.`
            : 'Pagamento confirmado. Tudo certo com a sua compra.'}
        </p>
        {order && order.amount_brl > 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 28px', fontFamily: 'var(--mono)' }}>
            Pedido #{order.id} · {money(order.amount_brl)}
          </p>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 }}>
          <Link className="btn btn-edge" to="/copa-2026" style={{ padding: '12px 24px', fontWeight: 700 }}>
            Ir para a Copa 2026 →
          </Link>
          <Link className="btn btn-ghost" to="/predictions" style={{ padding: '12px 24px' }}>
            Ver previsões
          </Link>
        </div>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--line)', fontSize: 13, color: 'var(--text-2)' }}>
          Enviamos a confirmação para o seu email. Precisa de ajuda?{' '}
          <Link to="/suporte" style={{ color: 'var(--edge)' }}>Fale com o suporte</Link>.
        </div>
      </div>
    </div>
  );
}
