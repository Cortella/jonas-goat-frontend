import { Link } from 'react-router-dom';
import { AppBar } from '../components/AppBar';
import { SectionHeader } from '../components/atoms';
import { Seo } from '../components/Seo';
import { CHANGELOG, type PatchChange, type PatchEntry } from '../lib/changelog';

const KIND_LABEL: Record<PatchChange['kind'], string> = {
  feature: 'Novo',
  improvement: 'Melhoria',
  fix: 'Correção',
  security: 'Segurança',
};

const KIND_COLOR: Record<PatchChange['kind'], string> = {
  feature: 'var(--edge)',
  improvement: 'var(--info)',
  fix: 'var(--muted)',
  security: 'oklch(0.78 0.16 25)',
};

export function ChangelogPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Seo
        title="Atualizações"
        description="Veja todas as atualizações do Jonas Goat — novas features, melhorias e correções organizadas por versão."
        path="/atualizacoes"
      />
      <AppBar />
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '32px 32px 96px' }}>
        <SectionHeader
          eyebrow="Changelog"
          title="Atualizações"
          sub={`Histórico de versões do Jonas Goat. Atual: ${CHANGELOG[0]?.version ?? '—'}.`}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 24 }}>
          {CHANGELOG.map((p, idx) => (
            <PatchCard key={p.version} patch={p} latest={idx === 0} />
          ))}
        </div>

        <div style={{ marginTop: 48, padding: 16, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          Sentiu falta de algo? <Link to="/suporte" style={{ color: 'var(--edge)' }}>Conta pra gente</Link>.
        </div>
      </div>
    </div>
  );
}

function PatchCard({ patch, latest }: Readonly<{ patch: PatchEntry; latest: boolean }>) {
  return (
    <article
      className="surface"
      style={{
        padding: 24,
        border: latest ? '1px solid oklch(0.88 0.17 125 / 0.45)' : '1px solid var(--line)',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <span
          className="tag"
          style={{
            fontSize: 10,
            color: latest ? 'var(--edge)' : 'var(--text-2)',
            borderColor: latest ? 'var(--edge)' : 'var(--line)',
            fontFamily: 'var(--mono)',
          }}
        >
          v{patch.version}
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{patch.date}</span>
        {latest && (
          <span style={{ fontSize: 10, color: 'var(--edge)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            mais recente
          </span>
        )}
      </header>
      <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>{patch.title}</h2>
      {patch.highlight && (
        <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
          {patch.highlight}
        </p>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {patch.changes.map((c) => (
          <li
            key={c.text}
            style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--text)' }}
          >
            <span
              className="tag"
              style={{
                fontSize: 9,
                color: KIND_COLOR[c.kind],
                borderColor: KIND_COLOR[c.kind],
                flexShrink: 0,
                marginTop: 2,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {KIND_LABEL[c.kind]}
            </span>
            <span style={{ lineHeight: 1.5 }}>{c.text}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
