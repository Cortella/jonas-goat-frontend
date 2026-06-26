// Camada única de rastreamento (Google Analytics 4 + Google Ads).
//
// Tudo é guardado por variável de ambiente: enquanto VITE_GA4_ID / VITE_GADS_ID
// não estiverem definidos no .env, nada é carregado e todas as funções viram
// no-op — o app roda igual, sem tags. Quando você criar as contas, basta
// preencher o .env e o rastreamento liga sozinho (sem mudar código).
//
//   VITE_GA4_ID              → ID do GA4, formato G-XXXXXXX
//   VITE_GADS_ID             → ID do Google Ads, formato AW-XXXXXXXXX
//   VITE_GADS_PURCHASE_LABEL → label da conversão de compra (vem do Google Ads
//                              ao criar a "ação de conversão"). Sem ele, a
//                              conversão do Ads não dispara (GA4 ainda registra).

const GA4_ID = import.meta.env.VITE_GA4_ID as string | undefined;
const GADS_ID = import.meta.env.VITE_GADS_ID as string | undefined;
const GADS_PURCHASE_LABEL = import.meta.env.VITE_GADS_PURCHASE_LABEL as string | undefined;

type GtagParams = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let initialized = false;

/** true quando há ao menos um ID configurado (GA4 ou Ads). */
export function analyticsEnabled(): boolean {
  return Boolean(GA4_ID || GADS_ID);
}

/**
 * Injeta o gtag.js uma única vez e configura as contas presentes. Seguro
 * chamar sem IDs (no-op) e seguro chamar mais de uma vez.
 */
export function initAnalytics(): void {
  if (initialized || !analyticsEnabled() || typeof window === 'undefined') return;
  initialized = true;

  window.dataLayer = window.dataLayer || [];
  // gtag empurra os próprios argumentos para o dataLayer (padrão do Google).
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());

  // Desliga page_view automático: a SPA dispara manualmente a cada rota
  // (ver trackPageview), senão só a primeira navegação seria contada.
  if (GA4_ID) window.gtag('config', GA4_ID, { send_page_view: false });
  if (GADS_ID) window.gtag('config', GADS_ID);

  // Carrega o script com o primeiro ID disponível (um só script serve ambas
  // as contas configuradas acima).
  const bootId = GA4_ID || GADS_ID!;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(bootId)}`;
  document.head.appendChild(s);
}

/** Evento genérico do GA4. No-op se o rastreamento estiver desligado. */
export function trackEvent(name: string, params: GtagParams = {}): void {
  if (!initialized) return;
  window.gtag?.('event', name, params);
}

/** Pageview manual (SPA troca de rota sem recarregar a página). */
export function trackPageview(path: string): void {
  if (!initialized || !GA4_ID) return;
  window.gtag?.('event', 'page_view', {
    page_path: path,
    page_location: window.location.origin + path,
  });
}

interface PurchaseInfo {
  transactionId: string | number;
  value: number;
  currency?: string;
  plan?: string | null;
  cycle?: string | null;
}

/**
 * Conversão de compra. Dispara o `purchase` do GA4 e a conversão do Google Ads
 * (esta só quando VITE_GADS_ID + label existem). `transaction_id` é o id do
 * pedido — o Google usa para deduplicar caso o evento chegue mais de uma vez.
 */
export function trackPurchase({ transactionId, value, currency = 'BRL', plan, cycle }: PurchaseInfo): void {
  if (!initialized) return;
  const txId = String(transactionId);

  if (GA4_ID) {
    window.gtag?.('event', 'purchase', {
      transaction_id: txId,
      value,
      currency,
      items: plan ? [{ item_id: plan, item_name: `Jonas Goat ${plan}`, item_category: cycle ?? undefined }] : undefined,
    });
  }

  if (GADS_ID && GADS_PURCHASE_LABEL) {
    window.gtag?.('event', 'conversion', {
      send_to: `${GADS_ID}/${GADS_PURCHASE_LABEL}`,
      transaction_id: txId,
      value,
      currency,
    });
  }
}
