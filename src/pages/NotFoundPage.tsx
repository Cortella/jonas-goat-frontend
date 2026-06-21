import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, textAlign: 'center' }}>
      <div style={{ fontSize: 64, opacity: 0.4 }}>🐐</div>
      <h1 style={{ fontSize: 24, fontWeight: 500, margin: '24px 0 8px' }}>Página não encontrada</h1>
      <p style={{ color: 'var(--text-2)', maxWidth: 480 }}>
        O recurso solicitado não existe ou foi movido. Voltar pra <Link to="/" style={{ color: 'var(--edge)' }}>home</Link>?
      </p>
    </div>
  );
}
