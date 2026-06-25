import { Helmet } from 'react-helmet-async';

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
  const url = path ? `${DEFAULT_DOMAIN}${path}` : DEFAULT_DOMAIN;
  const fullTitle = title.includes('Jonas Goat') ? title : `${title} · Jonas Goat`;
  const desc = description ?? '';
  const img = image ?? `${DEFAULT_DOMAIN}/logo.png`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {desc && <meta name="description" content={desc} />}
      <link rel="canonical" href={url} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large" />
      )}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      {desc && <meta property="og:description" content={desc} />}
      <meta property="og:image" content={img} />
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
