/**
 * Bookmaker affiliate registry.
 *
 * Mantém o nome canônico (como vem do feed de odds) → display + slug usado
 * na URL de redirecionamento `/api/bookmaker/go?book=<slug>`. A URL real de
 * afiliado fica no backend (ENV) — frontend só conhece o slug, evitando
 * vazar parceiros via inspeção do bundle.
 */

export interface BookmakerInfo {
  /** Slug enviado ao backend (estável, sem espaços, lowercase). */
  slug: string;
  /** Nome de exibição na UI. */
  display: string;
  /** Marca como afiliado para mostrar disclosure adequado. */
  affiliate: boolean;
}

const REGISTRY: Record<string, BookmakerInfo> = {
  Bet365:      { slug: 'bet365',      display: 'Bet365',      affiliate: true },
  Betano:      { slug: 'betano',      display: 'Betano',      affiliate: true },
  Betfair:     { slug: 'betfair',     display: 'Betfair',     affiliate: true },
  KTO:         { slug: 'kto',         display: 'KTO',         affiliate: true },
  Pinnacle:    { slug: 'pinnacle',    display: 'Pinnacle',    affiliate: true },
  Sportingbet: { slug: 'sportingbet', display: 'Sportingbet', affiliate: true },
  Superbet:    { slug: 'superbet',    display: 'Superbet',    affiliate: true },
  Betsson:     { slug: 'betsson',     display: 'Betsson',     affiliate: true },
  Bwin:        { slug: 'bwin',        display: 'Bwin',        affiliate: true },
  Stake:       { slug: 'stake',       display: 'Stake',       affiliate: true },
};

export function bookmakerInfo(name: string): BookmakerInfo {
  return (
    REGISTRY[name] ?? {
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      display: name,
      affiliate: false,
    }
  );
}

export interface BookmakerLinkParams {
  book: string;
  matchId?: number;
  side?: 'home' | 'draw' | 'away' | 'best';
  source?: 'comparator' | 'predictions';
}

export function bookmakerLink({ book, matchId, side, source = 'comparator' }: BookmakerLinkParams): string {
  const info = bookmakerInfo(book);
  const params = new URLSearchParams({ book: info.slug, source });
  if (matchId != null) params.set('match', String(matchId));
  if (side) params.set('side', side);
  return `/api/bookmaker/go?${params.toString()}`;
}
