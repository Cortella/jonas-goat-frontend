import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Logo,
  ProbBar,
  Stat,
  SectionHeader,
  Dot,
} from '../components/atoms';
import { Seo } from '../components/Seo';
import { useAuth } from '../lib/auth';
import { api, type ReviewsResponse } from '../lib/api';
import { LanguageSelector } from '../components/LanguageSelector';
import type { Prediction } from '../lib/types';

const LEAGUE_DISPLAY: Record<string, string> = {
  PL: 'PL',
  PD: 'LL',
  BL1: 'BL',
  SA: 'SA',
  FL1: 'L1',
  CL: 'UCL',
  WC: 'CWC',
};

/** Item de navegação do header — pílula com hover, para âncora (#) ou rota. */
function NavItem({ to, href, children }: Readonly<{ to?: string; href?: string; children: ReactNode }>) {
  const [hover, setHover] = useState(false);
  const style: CSSProperties = {
    padding: '7px 12px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    textDecoration: 'none',
    color: hover ? 'var(--text)' : 'var(--text-2)',
    background: hover ? 'var(--surface-2)' : 'transparent',
    transition: 'color 0.15s, background 0.15s',
    whiteSpace: 'nowrap',
  };
  const handlers = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
  };
  if (to) return <Link to={to} style={style} {...handlers}>{children}</Link>;
  return <a href={href} style={style} {...handlers}>{children}</a>;
}

export function LandingPage() {
  const predsQ = useQuery({
    queryKey: ['landing-predictions'],
    queryFn: () => api.predictions(),
    staleTime: 60_000,
  });
  // Preço por região (Brasil R$, resto USD) — detectado por geoip no backend.
  const pricingQ = useQuery({
    queryKey: ['public-pricing'],
    queryFn: () => api.publicPricing(),
    staleTime: 5 * 60_000,
  });
  const sym = pricingQ.data?.prices.symbol ?? '$';
  const px = (v: number | null | undefined) =>
    v == null ? '—' : `${sym}${Number.isInteger(v) ? v : v.toFixed(2)}`;
  // Avaliações reais (prova social pública) — embasam o aggregateRating do schema.
  const reviewsQ = useQuery({ queryKey: ['public-reviews'], queryFn: () => api.reviews(), staleTime: 5 * 60_000 });

  const live: Prediction[] = (predsQ.data?.predictions ?? []).slice(0, 4);

  const signupHref = '/signup';

  const { t } = useTranslation();
  const { user } = useAuth();

  const STEPS = [
    { n: '01', title: t('landing.step1_title'), desc: t('landing.step1_desc') },
    { n: '02', title: t('landing.step2_title'), desc: t('landing.step2_desc') },
    { n: '03', title: t('landing.step3_title'), desc: t('landing.step3_desc') },
  ];

  const DIFFERENTIATORS = [
    { icon: '🧮', title: t('landing.diff1_title'), desc: t('landing.diff1_desc') },
    { icon: '📊', title: t('landing.diff2_title'), desc: t('landing.diff2_desc') },
    { icon: '🔄', title: t('landing.diff3_title'), desc: t('landing.diff3_desc') },
    { icon: '⚖️', title: t('landing.diff4_title'), desc: t('landing.diff4_desc') },
  ];

  const FAQ = [
    { q: t('landing.faq1_q'), a: t('landing.faq1_a') },
    { q: t('landing.faq2_q'), a: t('landing.faq2_a') },
    { q: t('landing.faq3_q'), a: t('landing.faq3_a') },
    { q: t('landing.faq4_q'), a: t('landing.faq4_a') },
  ];

  // FAQPage JSON-LD: usa as mesmas perguntas exibidas abaixo (Google exige que
  // o schema bata com o conteúdo visível). Habilita rich result de FAQ na busca.
  // Product com aggregateRating/review SÓ quando há avaliações reais (política
  // do Google — nota precisa refletir reviews reais e visíveis na página).
  const rvCount = Number(reviewsQ.data?.count ?? 0);
  const rvAvg = Number(reviewsQ.data?.average ?? 0);
  const productNode: Record<string, unknown> = {
    '@type': 'Product',
    '@id': 'https://www.jonasgoat.com/#product',
    name: 'Jonas Goat — assinatura Pro',
    description: 'Previsões e probabilidades de futebol por modelos estatísticos para Top 5 ligas, Champions e Copa do Mundo 2026.',
    image: 'https://www.jonasgoat.com/logo.png',
    brand: { '@type': 'Brand', name: 'Jonas Goat' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BRL',
      price: '49.90',
      url: 'https://www.jonasgoat.com/precos',
      availability: 'https://schema.org/InStock',
      priceValidUntil: '2026-12-31',
    },
  };
  if (rvCount > 0 && rvAvg > 0) {
    productNode.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(rvAvg),
      reviewCount: String(rvCount),
      bestRating: '5',
      worstRating: '1',
    };
    productNode.review = (reviewsQ.data?.reviews ?? []).slice(0, 5).map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.author },
      datePublished: r.created_at,
      reviewRating: { '@type': 'Rating', ratingValue: String(r.rating), bestRating: '5', worstRating: '1' },
      reviewBody: r.comment,
    }));
  }
  const faqSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        mainEntity: FAQ.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      productNode,
    ],
  };

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', overflowX: 'hidden' }}>
      <Seo
        title="Jonas Goat — Previsões de futebol com modelos estatísticos"
        description="Três modelos estatísticos em ensemble calculam a probabilidade real de cada jogo. Análise transparente das Top 5 ligas, Champions e Copa do Mundo 2026. Sem achismo, sem hype."
        path="/"
        schema={faqSchema}
      />

      {/* ─── Top bar ──────────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '14px 48px',
          borderBottom: '1px solid var(--line)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'oklch(0.16 0.006 240 / 0.72)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex' }}>
          <Logo size={20} />
        </Link>
        <nav style={{ display: 'flex', gap: 2, marginLeft: 20, alignItems: 'center' }}>
          <NavItem href="#como-funciona">{t('landing.nav_how')}</NavItem>
          <NavItem to="/metodologia">{t('landing.nav_methodology')}</NavItem>
          <NavItem to="/gratis">Grátis</NavItem>
          <NavItem to="/precos">{t('landing.nav_plans')}</NavItem>
          <NavItem href="#faq">FAQ</NavItem>
        </nav>
        <div style={{ flex: 1 }} />
        <LanguageSelector />
        {user ? (
          <Link to="/predictions" className="btn btn-edge btn-sm" style={{ textDecoration: 'none', marginLeft: 4 }}>
            {t('nav.dashboard', 'Acessar painel')}
          </Link>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none', marginLeft: 4 }}>
              {t('nav.login')}
            </Link>
            <Link to={signupHref} className="btn btn-edge btn-sm" style={{ textDecoration: 'none' }}>
              {t('landing.cta_signup')}
            </Link>
          </>
        )}
      </header>


      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section style={{ position: 'relative' }}>
        <div className="landing-halo" />
        <div
          className="landing-section"
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 480px',
            gap: 64,
            alignItems: 'center',
            paddingTop: 88,
            paddingBottom: 32,
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid var(--line-2)',
                marginBottom: 24,
              }}
            >
              <Dot pulse />
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                {t('landing.badge')}
              </span>
            </div>
            <h1
              style={{
                fontSize: 64,
                lineHeight: 1.02,
                fontWeight: 400,
                margin: 0,
                letterSpacing: '-0.03em',
              }}
            >
              {t('landing.hero_1')}<br />
              {t('landing.hero_2')}{' '}
              <span className="t-serif t-italic" style={{ color: 'var(--edge)', fontWeight: 400 }}>
                {t('landing.hero_accent')}
              </span>
              <br />
              {t('landing.hero_3')}
            </h1>
            <p
              style={{
                fontSize: 17,
                color: 'var(--text-2)',
                maxWidth: 540,
                marginTop: 24,
                lineHeight: 1.55,
              }}
            >
              {t('landing.hero_body')}{' '}
              <strong style={{ color: 'var(--edge)' }}>{t('landing.hero_ev')}</strong>.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
              <Link to={signupHref} className="btn btn-edge" style={{ textDecoration: 'none' }}>
                {t('landing.cta_signup')}
              </Link>
              <Link to="/metodologia" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
                {t('landing.cta_backtest')}
              </Link>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 32,
                marginTop: 48,
                paddingTop: 24,
                borderTop: '1px solid var(--line)',
                flexWrap: 'wrap',
              }}
            >
              <Stat label="Jogos modelados" value="14k+" color="var(--edge)" sub={t('landing.stat_roi_sub')} />
              <Stat label="Acerto 1X2" value="54.2%" sub={t('landing.stat_accuracy_sub')} />
              <Stat label="Brier score" value="0.198" sub={t('landing.stat_brier_sub')} />
              <Stat label="Ligas cobertas" value="07" sub={t('landing.stat_leagues_sub')} />
            </div>
          </div>

          <LivePreviewCard preds={live} loading={predsQ.isLoading} signupHref={signupHref} />
        </div>
      </section>

      {/* ─── Como funciona (3 passos) ──────────────────────────────── */}
      <section id="como-funciona" className="landing-section" style={{ borderTop: '1px solid var(--line)' }}>
        <SectionHeader
          eyebrow={t('landing.how_eyebrow')}
          title={t('landing.how_title')}
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24,
          }}
        >
          {STEPS.map((s) => (
            <article key={s.n} className="surface" style={{ padding: 28 }}>
              <div className="t-eyebrow" style={{ color: 'var(--edge)' }}>{s.n}</div>
              <h3 style={{ fontSize: 18, fontWeight: 500, margin: '12px 0 8px', lineHeight: 1.3 }}>
                {s.title}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.55 }}>
                {s.desc}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ─── Diferenciais ─────────────────────────────────────────── */}
      <section className="landing-section tight" style={{ borderTop: '1px solid var(--line)' }}>
        <SectionHeader
          eyebrow={t('landing.diff_eyebrow')}
          title={t('landing.diff_title')}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {DIFFERENTIATORS.map((d) => (
            <article key={d.title} className="surface" style={{ padding: 24 }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{d.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 8px' }}>{d.title}</h3>
              <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.55 }}>
                {d.desc}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ─── Pricing snippet ──────────────────────────────────────── */}
      <section className="landing-section tight" style={{ borderTop: '1px solid var(--line)' }}>
        <SectionHeader
          eyebrow={t('landing.plans_eyebrow')}
          title={t('landing.plans_title')}
          action={
            <Link to="/precos" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
              {t('landing.plans_see_all')}
            </Link>
          }
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <PlanCard
            name="Free"
            price={`${sym}0`}
            sub="pra sempre"
            bullets={['Carteira + registro de jogos', 'Gestão de caixa', 'Previsões só no Pro']}
            cta="Criar conta"
            href={signupHref}
          />
          <PlanCard
            highlight
            name="Pro"
            price={px(pricingQ.data?.plans.pro_monthly)}
            sub={`/mês ou ${px(pricingQ.data?.plans.pro_yearly)}/ano`}
            bullets={[
              'Previsões ilimitadas',
              'Comparador de cotações (7 fontes)',
              'Alertas Telegram + email',
              'Controle de caixa + sugestões',
            ]}
            cta="Assinar Pro"
            href={signupHref}
          />
          <PlanCard
            name="Founders"
            price={px(pricingQ.data?.plans.founders)}
            sub="3 anos · 100 vagas"
            bullets={['3 anos de acesso a tudo', 'Grupo VIP no WhatsApp', 'Selo + créditos vitalícios']}
            cta="Quero ser Founder"
            href="/founders"
          />
        </div>
      </section>

      {/* ─── Prova social (avaliações reais) ──────────────────────── */}
      <ReviewsProof data={reviewsQ.data} />

      {/* ─── FAQ ──────────────────────────────────────────────────── */}
      <section id="faq" className="landing-section" style={{ borderTop: '1px solid var(--line)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 64 }}>
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 12 }}>{t('landing.faq_eyebrow')}</div>
            <h2
              style={{
                fontSize: 32,
                fontWeight: 400,
                margin: 0,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
              }}
            >
              <span className="t-serif t-italic">{t('landing.faq_title_1')}</span>
              <br />
              {t('landing.faq_title_2')}
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--line)' }}>
            {FAQ.map((f) => (
              <article key={f.q} style={{ padding: '20px 0', background: 'var(--bg)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 500, margin: 0, marginBottom: 8 }}>{f.q}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>
                  {f.a}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ────────────────────────────────────────────── */}
      <section
        style={{
          borderTop: '1px solid var(--line)',
          padding: '64px 48px',
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontSize: 32, fontWeight: 500, margin: 0, letterSpacing: '-0.02em' }}>
          {t('landing.faq_title_1')}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 12 }}>
          {t('landing.plan_free_tagline')}
        </p>
        <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to={signupHref} className="btn btn-edge" style={{ textDecoration: 'none' }}>
            {t('landing.cta_signup')}
          </Link>
          <Link to="/predictions" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
            {t('predictions.eyebrow')}
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

// Prova social pública: nota média + nº de avaliações + depoimentos reais.
// Só renderiza com avaliações reais (embasa o aggregateRating do schema e
// respeita a política do Google). O ENVIO segue só na área logada (/avaliacoes).
function ReviewsProof({ data }: Readonly<{ data?: ReviewsResponse }>) {
  const count = Number(data?.count ?? 0);
  const avg = Number(data?.average ?? 0);
  if (!data || count === 0) return null;
  const top = (data.reviews ?? []).filter((r) => r.comment?.trim()).slice(0, 3);
  const stars = (n: number) => '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n));
  return (
    <section className="landing-section" style={{ borderTop: '1px solid var(--line)' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 22, color: 'var(--edge)', letterSpacing: 2 }}>{stars(avg)}</div>
        <div style={{ fontSize: 15, color: 'var(--text-2)', marginTop: 6 }}>
          <strong style={{ color: 'var(--text)', fontFamily: 'var(--mono)' }}>{avg.toFixed(1)}</strong> de 5 ·{' '}
          {count} {count === 1 ? 'avaliação' : 'avaliações'} de assinantes
        </div>
      </div>
      {top.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, maxWidth: 1000, margin: '0 auto' }}>
          {top.map((r) => (
            <div key={r.id} className="surface" style={{ padding: 18 }}>
              <div style={{ color: 'var(--edge)', fontSize: 13, letterSpacing: 1 }}>{stars(r.rating)}</div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, margin: '8px 0 10px' }}>“{r.comment}”</p>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{r.author}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <Link to="/avaliacoes" style={{ color: 'var(--edge)', fontSize: 13 }}>Ver todas as avaliações →</Link>
      </div>
    </section>
  );
}


function LivePreviewCard({
  preds,
  loading,
  signupHref,
}: Readonly<{ preds: Prediction[]; loading: boolean; signupHref: string }>) {
  const [now, setNow] = useState<string>('');
  const { t } = useTranslation();
  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      );
    tick();
    const i = setInterval(tick, 30_000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="surface" style={{ padding: 0, boxShadow: 'var(--shadow-2)', overflow: 'hidden' }}>
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Dot pulse style={{ background: 'var(--edge)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
            {t('landing.live_title')} {now}
          </span>
        </div>
        <span className="t-eyebrow">Maior confiança</span>
      </div>
      {loading && (
        <div style={{ padding: 32, color: 'var(--muted)', fontSize: 13 }}>
          {t('landing.live_loading')}
        </div>
      )}
      {!loading && preds.length === 0 && (
        <div style={{ padding: 32, color: 'var(--muted)', fontSize: 13 }}>
          {t('landing.live_empty')}
        </div>
      )}
      {preds.map((p, i) => {
        const probHome = (p.ensemble.prob_home ?? 0) * 100;
        const probDraw = (p.ensemble.prob_draw ?? 0) * 100;
        const probAway = (p.ensemble.prob_away ?? 0) * 100;
        const oddHome = p.odds.odds_home ?? 0;
        const ev = oddHome > 0 ? (probHome * oddHome) / 100 - 1 : 0;
        const time = p.kickoff
          ? new Date(p.kickoff).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : '—';
        return (
          <article
            key={p.match_id}
            style={{
              padding: '14px 16px',
              borderBottom: i < preds.length - 1 ? '1px solid var(--line)' : 'none',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="league-mono">{LEAGUE_DISPLAY[p.league] ?? p.league}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{time}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  {p.home_team} · {p.away_team}
                </span>
              </div>
              {ev > 0.01 && <span className="tag tag-edge" style={{ fontSize: 11 }}>Destaque</span>}
            </div>
            <ProbBar home={probHome} draw={probDraw} away={probAway} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 6,
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: 'var(--text-2)',
              }}
            >
              <span>
                1 · {probHome.toFixed(0)}%{oddHome > 0 ? ` · odd ${oddHome.toFixed(2)}` : ''}
              </span>
              <span style={{ color: 'var(--muted)' }}>{t('common.ensemble')}</span>
            </div>
          </article>
        );
      })}
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-2)',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {preds.length > 0 ? t('landing.live_see_all') : '—'}
        </span>
        <Link to={signupHref} className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
          {t('landing.live_cta')}
        </Link>
      </div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  sub,
  bullets,
  cta,
  href,
  highlight,
}: Readonly<{
  name: string;
  price: string;
  sub: string;
  bullets: string[];
  cta: string;
  href: string;
  highlight?: boolean;
}>) {
  const { t } = useTranslation();
  return (
    <article
      className="surface"
      style={{
        padding: 24,
        position: 'relative',
        border: highlight ? '1px solid oklch(0.88 0.17 125 / 0.4)' : '1px solid var(--line)',
        background: highlight ? 'oklch(0.21 0.02 130)' : 'var(--surface)',
      }}
    >
      {highlight && (
        <div
          style={{
            position: 'absolute',
            top: -10,
            left: 20,
            padding: '3px 10px',
            background: 'var(--edge)',
            color: 'var(--edge-ink)',
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 600,
            fontFamily: 'var(--mono)',
            letterSpacing: '0.06em',
          }}
        >
          {t('landing.more_popular')}
        </div>
      )}
      <div style={{ fontSize: 14, fontWeight: 500 }}>{name}</div>
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span className="t-num" style={{ fontSize: 36, fontWeight: 500, letterSpacing: '-0.02em' }}>
          {price}
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</span>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 20px', display: 'grid', gap: 8 }}>
        {bullets.map((b) => (
          <li
            key={b}
            style={{
              fontSize: 12,
              color: 'var(--text-2)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <span style={{ color: 'var(--edge)', fontWeight: 600 }}>✓</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <Link
        to={href}
        className={highlight ? 'btn btn-edge' : 'btn btn-ghost'}
        style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
      >
        {cta}
      </Link>
    </article>
  );
}

function Footer() {
  const { t } = useTranslation();
  return (
    <footer
      style={{
        padding: '32px 48px',
        borderTop: '1px solid var(--line)',
        background: 'var(--bg-2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          fontSize: 11,
          color: 'var(--muted)',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            padding: '3px 8px',
            borderRadius: 4,
            border: '1px solid var(--warn)',
            color: 'var(--warn)',
            fontWeight: 600,
          }}
        >
          +18
        </span>
        <span>{t('footer.disclaimer')}</span>
        <span>·</span>
        <a
          href="https://www.jogadoresanonimos.com.br/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit', textDecoration: 'underline' }}
        >
          {t('footer.anon_gamblers')}
        </a>
      </div>
      <nav style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--muted)', alignItems: 'center' }}>
        <Link to="/termos" style={{ color: 'inherit' }}>{t('footer.terms')}</Link>
        <Link to="/precos" style={{ color: 'inherit' }}>{t('footer.plans')}</Link>
        <Link to="/metodologia" style={{ color: 'inherit' }}>{t('footer.methodology')}</Link>
        <a
          href="https://instagram.com/jonasgoat.bet"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram @jonasgoat.bet"
          style={{ color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
          Instagram
        </a>
      </nav>
    </footer>
  );
}

// ─── Static arrays removed — now built with t() inside LandingPage ──
