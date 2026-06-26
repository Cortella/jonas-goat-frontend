import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Seo } from '../components/Seo';
import { api } from '../lib/api';

interface Plan {
  name: string;
  price: string;
  priceSub: string;
  tagline: string;
  cta: string;
  to: string;
  emphasis: boolean;
  features: Array<[string, boolean]>;
}

export function PricingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currency, setCurrency] = useState<string | undefined>(undefined);
  const [yearly, setYearly] = useState(false);
  const pq = useQuery({
    queryKey: ['public-pricing', currency],
    queryFn: () => api.publicPricing(currency),
    staleTime: 5 * 60_000,
  });

  const sym = pq.data?.prices.symbol ?? '$';
  const fmt = (v: number | null | undefined) => (v == null ? '—' : `${sym}${Number.isInteger(v) ? v : v.toFixed(2)}`);
  const proPrice = yearly ? pq.data?.plans.pro_yearly : pq.data?.plans.pro_monthly;

  const plans: Plan[] = [
    {
      name: 'Free',
      price: `${sym}0`,
      priceSub: t('pricing.plan_free_price_sub'),
      tagline: t('pricing.plan_free_tagline'),
      cta: t('pricing.plan_free_cta'),
      to: '/signup',
      emphasis: false,
      features: [
        ['5 previsões / dia', true],
        ['Top 5 ligas europeias', true],
        ['Mercados 1X2 e Over/Under', true],
        ['EV mostrado, sem Kelly', true],
        ['Alertas Telegram / email', false],
        ['Histórico completo', false],
        ['Modelos de jogador', false],
        ['Comparador de odds completo', false],
      ],
    },
    {
      name: 'Pro',
      price: fmt(proPrice),
      priceSub: yearly ? '/ano' : '/mês',
      tagline: t('pricing.plan_pro_tagline'),
      cta: t('pricing.plan_pro_cta'),
      to: `/checkout?plan=pro&cycle=${yearly ? 'yearly' : 'monthly'}`,
      emphasis: true,
      features: [
        ['Previsões ilimitadas', true],
        ['Todas as ligas + UCL + Copa 2026', true],
        ['Todos os mercados (1X2, OU, BTTS, escanteios, cartões)', true],
        ['Sugestão Kelly + bankroll tracker', true],
        ['Alertas Telegram, email, push', true],
        ['Histórico completo + export CSV', true],
        ['Modelos de jogador (5 mercados)', true],
        ['Comparador de odds (7 bookmakers)', true],
      ],
    },
    {
      name: 'Founders',
      price: fmt(pq.data?.plans.founders),
      priceSub: t('pricing.plan_founders_price_sub'),
      tagline: t('pricing.plan_founders_tagline'),
      cta: t('pricing.plan_founders_cta'),
      to: '/checkout?plan=founders&cycle=lifetime',
      emphasis: false,
      features: [
        ['Tudo do Pro, sem limite de previsões', true],
        ['5 anos de acesso a todo o conteúdo', true],
        ['Grupo VIP no WhatsApp com os engenheiros', true],
        ['Selo de Founder na futura rede social', true],
        ['Créditos vitalícios no sistema', true],
        ['Voz no roadmap', true],
      ],
    },
  ];

  return (
    <div style={{ padding: '64px 48px', background: 'var(--bg)', maxWidth: 1280, margin: '0 auto' }}>
      <Seo
        title="Planos Free, Pro e Founders"
        description="Free para sempre, Pro a US$ 10/mês ou US$ 100/ano. Founders: 100 vagas com 5 anos de acesso total, grupo VIP no WhatsApp, selo de fundador e créditos vitalícios."
        path="/precos"
      />
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <div className="t-eyebrow" style={{ marginBottom: 12 }}>{t('pricing.eyebrow')}</div>
        <h1 style={{ fontSize: 48, fontWeight: 400, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {t('pricing.title')} <span className="t-serif t-italic" style={{ color: 'var(--edge)' }}>{t('pricing.title_accent')}</span>{t('pricing.title_end')}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-2)', maxWidth: 540, margin: '16px auto 0' }}>
          {t('pricing.sub')}
        </p>
        <div style={{ display: 'flex', gap: 16, marginTop: 32, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', padding: 4, background: 'var(--surface)', borderRadius: 999, border: '1px solid var(--line)' }}>
            <button
              onClick={() => setYearly(false)}
              style={{ padding: '8px 18px', borderRadius: 999, background: yearly ? 'transparent' : 'var(--surface-2)', border: 'none', color: yearly ? 'var(--text-2)' : 'var(--text)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              {t('pricing.monthly')}
            </button>
            <button
              onClick={() => setYearly(true)}
              style={{ padding: '8px 18px', borderRadius: 999, background: yearly ? 'var(--surface-2)' : 'transparent', border: 'none', color: yearly ? 'var(--text)' : 'var(--text-2)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              {t('pricing.yearly')}
            </button>
          </div>

          {/* Seletor de moeda */}
          <select
            value={pq.data?.currency ?? ''}
            onChange={(e) => setCurrency(e.target.value)}
            className="input"
            style={{ padding: '8px 12px', maxWidth: 200 }}
            aria-label="Moeda"
          >
            {(pq.data?.currencies ?? []).map((c) => (
              <option key={c.currency} value={c.currency}>
                {c.symbol} {c.currency}{c.label ? ` — ${c.label}` : ''}
              </option>
            ))}
          </select>
        </div>
        {pq.data && pq.data.currency !== pq.data.detected_currency && (
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
            Mostrando preços em {pq.data.currency}. Sem preço especial para a sua região, os valores são cobrados em USD.
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, alignItems: 'stretch' }}>
        {plans.map((p) => (
          <div
            key={p.name}
            style={{
              padding: 32,
              borderRadius: 'var(--r-3)',
              background: p.emphasis ? 'oklch(0.21 0.02 130)' : 'var(--surface)',
              border: `1px solid ${p.emphasis ? 'oklch(0.88 0.17 125 / 0.4)' : 'var(--line)'}`,
              position: 'relative',
            }}
          >
            {p.emphasis && (
              <div
                style={{
                  position: 'absolute',
                  top: -10,
                  left: 28,
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
            <div style={{ fontSize: 16, fontWeight: 500 }}>{p.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6, minHeight: 38 }}>{p.tagline}</div>
            <div style={{ marginTop: 24, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="t-num" style={{ fontSize: 44, fontWeight: 500, letterSpacing: '-0.02em' }}>{p.price}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{p.priceSub}</span>
            </div>
            <button
              className={p.emphasis ? 'btn btn-edge' : 'btn btn-ghost'}
              style={{ width: '100%', justifyContent: 'center', marginTop: 24, padding: '12px 16px' }}
              onClick={() => navigate(p.to)}
            >
              {p.cta}
            </button>
            <hr className="hl" style={{ margin: '24px 0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {p.features.map(([f, on], i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    fontSize: 13,
                    color: on ? 'var(--text)' : 'var(--faint)',
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      marginTop: 2,
                      borderRadius: 999,
                      background: on ? 'var(--edge-soft)' : 'transparent',
                      border: `1px solid ${on ? 'var(--edge)' : 'var(--line-2)'}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {on && <span style={{ fontSize: 9, color: 'var(--edge)' }}>✓</span>}
                  </span>
                  <span style={{ textDecoration: on ? 'none' : 'line-through' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 40, padding: 20, background: 'var(--bg-2)', borderRadius: 'var(--r-3)', border: '1px solid var(--line)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>
        {[
          ['7 dias para reembolso', 'Sem perguntas. Cancela e devolve.'],
          ['Cancela a qualquer momento', 'Sem fidelidade, sem multa.'],
          ['Pix, cartão, Stripe', 'Faturamento mensal ou anual.'],
        ].map(([t, s], i) => (
          <div key={i}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{t}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{s}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
