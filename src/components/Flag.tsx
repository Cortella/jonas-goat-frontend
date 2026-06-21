/**
 * Renderiza bandeira de país a partir do código ISO 3166-1 alpha-2.
 * Usa Regional Indicator Symbols Unicode (suportado nativamente em Mac,
 * iOS, Android e Linux). Windows não renderiza colorido em todos os
 * sistemas — fallback pra texto do código fica legível.
 */
const COUNTRY_NAMES: Record<string, string> = {
  BR: 'Brasil', US: 'Estados Unidos', PT: 'Portugal', AR: 'Argentina',
  ES: 'Espanha', DE: 'Alemanha', FR: 'França', GB: 'Reino Unido',
  IT: 'Itália', JP: 'Japão', CN: 'China', RU: 'Rússia',
  MX: 'México', CL: 'Chile', UY: 'Uruguai', PY: 'Paraguai',
  CO: 'Colômbia', PE: 'Peru', CA: 'Canadá', AU: 'Austrália',
};

function flagEmoji(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return '🏳️';
  const A = 0x1f1e6 - 'A'.charCodeAt(0);
  return String.fromCodePoint(code.charCodeAt(0) + A, code.charCodeAt(1) + A);
}

export function Flag({ code, size = 14 }: Readonly<{ code: string | null; size?: number }>) {
  if (!code) return <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>;
  const upper = code.toUpperCase();
  const name = COUNTRY_NAMES[upper] ?? upper;
  return (
    <span
      title={name}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: size }}
    >
      <span aria-hidden style={{ lineHeight: 1 }}>{flagEmoji(upper)}</span>
      <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>{upper}</span>
    </span>
  );
}
