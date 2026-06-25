import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type PublicReview } from '../lib/api';
import { useAuth } from '../lib/auth';
import { SectionHeader } from './atoms';

const PRODUCT_ID = 'https://www.jonasgoat.com/#product';

/** Estrelas (cheias/vazias) — `size` controla o tamanho. */
function Stars({ value, size = 16 }: Readonly<{ value: number; size?: number }>) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }} aria-label={`${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={n <= Math.round(value) ? 'var(--warn)' : 'none'}
          stroke="var(--warn)"
          strokeWidth="1.5"
          aria-hidden
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

/** Seletor de estrelas para o formulário. */
function StarPicker({ value, onChange }: Readonly<{ value: number; onChange: (v: number) => void }>) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <span style={{ display: 'inline-flex', gap: 4 }} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 0 }}
        >
          <svg width={28} height={28} viewBox="0 0 24 24" fill={n <= active ? 'var(--warn)' : 'none'} stroke="var(--warn)" strokeWidth="1.5">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </span>
  );
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function ReviewCard({ r }: Readonly<{ r: PublicReview }>) {
  return (
    <article className="surface" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Stars value={r.rating} />
      <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.55, margin: 0 }}>"{r.comment}"</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto' }}>
        {r.avatar_url ? (
          <img src={r.avatar_url} alt="" width={28} height={28} style={{ borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-2)', display: 'grid', placeItems: 'center', fontSize: 11, color: 'var(--text-2)' }}>
            {initials(r.author)}
          </span>
        )}
        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.author}</span>
      </div>
    </article>
  );
}

function ReviewForm() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const mine = useQuery({ queryKey: ['my-review'], queryFn: () => api.myReview(), enabled: !!user });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (mine.data) {
      setRating(mine.data.rating);
      setComment(mine.data.comment);
    }
  }, [mine.data]);

  const submit = useMutation({
    mutationFn: () => api.submitReview({ rating, comment: comment.trim() }),
    onSuccess: () => {
      setDone(true);
      qc.invalidateQueries({ queryKey: ['my-review'] });
      qc.invalidateQueries({ queryKey: ['reviews'] });
    },
  });

  const remove = useMutation({
    mutationFn: () => api.deleteMyReview(),
    onSuccess: () => {
      setComment('');
      setRating(5);
      setDone(false);
      qc.invalidateQueries({ queryKey: ['my-review'] });
      qc.invalidateQueries({ queryKey: ['reviews'] });
    },
  });

  // Não logado → convite para entrar.
  if (!user) {
    return (
      <div className="surface" style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-2)' }}>
        Já é assinante?{' '}
        <Link to="/login" style={{ color: 'var(--edge)' }}>Entre</Link> para deixar sua avaliação.
      </div>
    );
  }

  // Logado mas não pagante → só assinantes avaliam.
  if (user.plan !== 'pro' && user.plan !== 'founders') {
    return (
      <div className="surface" style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-2)' }}>
        Avaliações são exclusivas para assinantes.{' '}
        <Link to="/precos" style={{ color: 'var(--edge)' }}>Conheça os planos</Link>.
      </div>
    );
  }

  const status = mine.data?.status;
  const tooShort = comment.trim().length < 10;

  return (
    <form
      className="surface"
      style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
      onSubmit={(e) => { e.preventDefault(); if (!tooShort) submit.mutate(); }}
    >
      <strong style={{ fontSize: 14 }}>{mine.data ? 'Edite sua avaliação' : 'Deixe sua avaliação'}</strong>
      <StarPicker value={rating} onChange={(v) => { setRating(v); setDone(false); }} />
      <textarea
        className="input"
        value={comment}
        onChange={(e) => { setComment(e.target.value); setDone(false); }}
        placeholder="Conte como o Jonas Goat tem te ajudado (mín. 10 caracteres)…"
        maxLength={600}
        rows={3}
        style={{ resize: 'vertical' }}
      />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="submit" className="btn btn-edge btn-sm" disabled={submit.isPending || tooShort}>
          {submit.isPending ? 'Enviando…' : mine.data ? 'Atualizar' : 'Publicar'}
        </button>
        {mine.data && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove.mutate()} disabled={remove.isPending}>
            Excluir
          </button>
        )}
        {status === 'pending' && <span style={{ fontSize: 11, color: 'var(--warn)' }}>Em moderação — aparece após aprovação.</span>}
        {status === 'approved' && !done && <span style={{ fontSize: 11, color: 'var(--win)' }}>Publicada ✓</span>}
        {status === 'rejected' && <span style={{ fontSize: 11, color: 'var(--loss)' }}>Não aprovada. Edite e reenvie.</span>}
        {done && status !== 'approved' && <span style={{ fontSize: 11, color: 'var(--win)' }}>Recebida! Vai passar por moderação.</span>}
        {submit.isError && <span style={{ fontSize: 11, color: 'var(--loss)' }}>{(submit.error as Error).message}</span>}
      </div>
    </form>
  );
}

export function ReviewsSection() {
  const { data } = useQuery({ queryKey: ['reviews'], queryFn: () => api.reviews() });
  const count = data?.count ?? 0;
  const average = data?.average ?? null;
  const reviews = data?.reviews ?? [];

  // JSON-LD com aggregateRating/review REAIS — só quando há avaliações aprovadas.
  // Mesmo @id do Product estático (index.html) para o Google fundir num só item.
  const schema =
    count > 0 && average
      ? {
          '@context': 'https://schema.org',
          '@type': 'Product',
          '@id': PRODUCT_ID,
          name: 'Jonas Goat — assinatura Pro',
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: average.toFixed(1),
            reviewCount: String(count),
            bestRating: '5',
            worstRating: '1',
          },
          review: reviews.slice(0, 8).map((r) => ({
            '@type': 'Review',
            reviewRating: { '@type': 'Rating', ratingValue: String(r.rating), bestRating: '5', worstRating: '1' },
            author: { '@type': 'Person', name: r.author },
            reviewBody: r.comment,
          })),
        }
      : null;

  return (
    <section id="avaliacoes" className="landing-section" style={{ borderTop: '1px solid var(--line)' }}>
      {schema && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify(schema)}</script>
        </Helmet>
      )}
      <SectionHeader
        eyebrow="Avaliações"
        title="O que os assinantes dizem"
        sub={
          count > 0 && average
            ? `${average.toFixed(1)} de 5 · ${count} avaliação${count > 1 ? 'ões' : ''} de assinantes reais`
            : 'Seja o primeiro a avaliar a plataforma.'
        }
        action={
          count > 0 && average ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Stars value={average} size={18} />
              <strong style={{ fontSize: 18 }}>{average.toFixed(1)}</strong>
            </span>
          ) : undefined
        }
      />

      {reviews.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
          {reviews.map((r) => (
            <ReviewCard key={r.id} r={r} />
          ))}
        </div>
      )}

      <div style={{ maxWidth: 520 }}>
        <ReviewForm />
      </div>
    </section>
  );
}
