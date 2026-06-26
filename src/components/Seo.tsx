import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { HREFLANG, OG_LOCALE, SUPPORTED_LANGUAGES } from '../lib/i18n';

interface Props {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article';
  /** Set true for routes admin/auth — those shouldn't appear on Google. */
  noindex?: boolean;
  /** Optional JSON-LD schema.org object — rendered as a script tag. */
  schema?: Record<string, unknown>;
}

const DEFAULT_DOMAIN = 'https://www.jonasgoat.com';

export function Seo({ title, description, path, image, type = 'website', noindex, schema }: Readonly<Props>) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'pt';
  const url = path ? `${DEFAULT_DOMAIN}${path}` : DEFAULT_DOMAIN;
  const langUrl = (code: string) => `${url}${url.includes('?') ? '&' : '?'}lng=${code}`;
  const fullTitle = title.includes('Jonas Goat') ? title : `${title} · Jonas Goat`;
  const desc = description ?? '';
  const img = image ?? `${DEFAULT_DOMAIN}/logo.png`;

  return (
    <Helmet>
      <html lang={lang} />
      <title>{fullTitle}</title>
      {desc && <meta name="description" content={desc} />}
      <link rel="canonical" href={url} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large" />
      )}
      {/* hreflang: diz ao Google que a página existe em vários idiomas (URLs ?lng=). */}
      {!noindex && SUPPORTED_LANGUAGES.map((l) => (
        <link key={l.code} rel="alternate" hrefLang={HREFLANG[l.code] ?? l.code} href={langUrl(l.code)} />
      ))}
      {!noindex && <link rel="alternate" hrefLang="x-default" href={url} />}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      {desc && <meta property="og:description" content={desc} />}
      <meta property="og:image" content={img} />
      <meta property="og:locale" content={OG_LOCALE[lang] ?? 'pt_BR'} />
      {SUPPORTED_LANGUAGES.filter((l) => l.code !== lang).map((l) => (
        <meta key={l.code} property="og:locale:alternate" content={OG_LOCALE[l.code] ?? l.code} />
      ))}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {desc && <meta name="twitter:description" content={desc} />}
      <meta name="twitter:image" content={img} />
      {schema && (
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      )}
    </Helmet>
  );
}
