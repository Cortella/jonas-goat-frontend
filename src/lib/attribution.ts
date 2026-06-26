// Atribuição de marketing: captura gclid (Google Click ID) e UTMs da URL na
// primeira visita e guarda no localStorage. No cadastro, esses valores viajam
// junto para o backend, fechando o ciclo "clique no anúncio → conta criada".
//
// O gclid é o que permite a conversão server-side (Fase 2) amarrar a venda ao
// clique pago mesmo quando o gtag do navegador é bloqueado por ad blocker.

const STORAGE_KEY = 'jg_attribution';
// Janela de atribuição (90 dias) — alinhada ao padrão do Google Ads.
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

export interface Attribution {
  gclid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  /** epoch ms da captura — usado para expirar a atribuição. */
  ts: number;
}

const FIELDS = ['gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

/**
 * Lê os parâmetros da URL atual e, se houver gclid/UTM, persiste. Mantém a
 * primeira atribuição (first-touch): não sobrescreve uma captura ainda válida,
 * para não perder o anúncio original se o usuário voltar por outro caminho.
 */
export function captureAttribution(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const found: Partial<Attribution> = {};
  for (const f of FIELDS) {
    const v = params.get(f);
    if (v) found[f] = v.slice(0, 200);
  }
  if (Object.keys(found).length === 0) return;

  const existing = getAttribution();
  if (existing?.gclid) return; // já temos uma atribuição válida com clique pago

  const record: Attribution = { ...found, ts: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* localStorage indisponível (modo privado) — ignora */
  }
}

/** Atribuição guardada, se ainda dentro da janela de 90 dias. */
export function getAttribution(): Attribution | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const rec = JSON.parse(raw) as Attribution;
    if (!rec.ts || Date.now() - rec.ts > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return rec;
  } catch {
    return null;
  }
}
