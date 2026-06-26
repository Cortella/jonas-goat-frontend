// Moeda por região: Brasil em BRL, qualquer outro país em USD (a Stripe
// converte para a moeda local no checkout). Fonte: user.country (logado) ou a
// moeda detectada por geoip vinda de /api/public/pricing (visitante).

export type Currency = 'BRL' | 'USD';

export function currencyForCountry(country?: string | null): Currency {
  return (country ?? '').toUpperCase() === 'BR' ? 'BRL' : 'USD';
}

export function formatMoney(value: number, currency: Currency = 'USD'): string {
  const locale = currency === 'BRL' ? 'pt-BR' : 'en-US';
  return value.toLocaleString(locale, { style: 'currency', currency });
}

// Moeda "ativa" do usuário logado — o AuthProvider chama setActiveCurrency com
// base em user.country. Permite que formatadores simples (money) fiquem cientes
// da região sem precisar do contexto de auth em cada componente/sub-componente.
let _active: Currency = 'USD';
export function setActiveCurrency(c: Currency): void {
  _active = c;
}
/** Formata na moeda do usuário (BRL para Brasil, USD para o resto). */
export function money(value: number): string {
  return formatMoney(value, _active);
}
