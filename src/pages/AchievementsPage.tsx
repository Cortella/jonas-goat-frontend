import { useQuery } from '@tanstack/react-query';
import { AppBar } from '../components/AppBar';
import { Seo } from '../components/Seo';
import { api, type Achievement } from '../lib/api';

const TIER: Record<Achievement['tier'], { label: string; color: string }> = {
  bronze: { label: 'Bronze', color: '#b87333' },
  silver: { label: 'Prata', color: '#9aa3ad' },
  gold: { label: 'Ouro', color: '#e3b341' },
  platinum: { label: 'Platina', color: 'oklch(0.82 0.12 200)' },
};

export function AchievementsPage() {
  const q = useQuery({ queryKey: ['achievements'], queryFn: () => api.achievements() });
  const data = q.data;
  const items = [...(data?.achievements ?? [])].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
  const pct = data && data.total_count > 0 ? data.unlocked_count / data.total_count : 0;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <AppBar />
      <Seo title="Conquistas" description="Suas conquistas no Jonas Goat" path="/conquistas" noindex />
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px 80px' }}>
        <div className="t-eyebrow" style={{ marginBottom: 8 }}>🏆 Conquistas</div>
        <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
          Seus troféus
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14, margin: '0 0 16px' }}>
          Desbloqueie conquistas usando a plataforma — apostas, banca, sequências e mais.
        </p>

        {data && (
          <div style={{ marginBottom: 28, maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: 'var(--text-2)' }}>Progresso</span>
              <strong style={{ fontFamily: 'var(--mono)' }}>{data.unlocked_count} / {data.total_count}</strong>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'var(--bg-2)', border: '1px solid var(--line)', overflow: 'hidden' }}>
              <div style={{ width: `${pct * 100}%`, height: '100%', background: 'var(--edge)' }} />
            </div>
          </div>
        )}

        {q.isLoading && <div style={{ color: 'var(--muted)', padding: 40, textAlign: 'center' }}>Carregando…</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
          {items.map((a) => <Card key={a.id} a={a} />)}
        </div>
      </div>
    </div>
  );
}

function Card({ a }: Readonly<{ a: Achievement }>) {
  const tier = TIER[a.tier];
  const ratio = a.target > 0 ? a.progress / a.target : 0;
  return (
    <div
      className="surface"
      style={{
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative',
        opacity: a.unlocked ? 1 : 0.6,
        border: `1px solid ${a.unlocked ? tier.color : 'var(--line)'}`,
        boxShadow: a.unlocked ? `0 0 0 1px ${tier.color} inset` : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 34, filter: a.unlocked ? undefined : 'grayscale(1)' }} aria-hidden>{a.unlocked ? a.icon : '🔒'}</span>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: tier.color }}>{tier.label}</span>
      </div>
      <strong style={{ fontSize: 14 }}>{a.title}</strong>
      <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.45, margin: 0, flex: 1 }}>{a.description}</p>
      {a.unlocked ? (
        <span style={{ fontSize: 11, color: tier.color, fontWeight: 600 }}>✓ Desbloqueada</span>
      ) : (
        <div>
          <div style={{ height: 5, borderRadius: 999, background: 'var(--bg-2)', overflow: 'hidden', marginBottom: 4 }}>
            <div style={{ width: `${Math.min(ratio, 1) * 100}%`, height: '100%', background: 'var(--muted)' }} />
          </div>
          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{a.progress} / {a.target}</span>
        </div>
      )}
    </div>
  );
}
