import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Logo } from '../components/atoms';
import { Seo } from '../components/Seo';
import { api, type CreditTransaction } from '../lib/api';

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const KIND_LABEL: Record<CreditTransaction['kind'], string> = {
  topup: 'Recarga',
  spend: 'Uso',
  refund: 'Estorno',
  adjust: 'Ajuste',
};

export function CreditsPage() {
  const me = useQuery({ queryKey: ['credits-me'], queryFn: api.creditsMe });

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Seo title="Meus créditos" description="Saldo e extrato de créditos" path="/creditos" noindex />
      <div style={{ borderBottom: '1px solid var(--line)', padding: '14px 24px' }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Logo size={16} />
        </Link>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div className="t-eyebrow" style={{ marginBottom: 8 }}>Carteira</div>
        <h1 style={{ margin: 0, fontWeight: 500, fontSize: 30, letterSpacing: '-0.02em' }}>Meus créditos</h1>

        <div
          className="surface"
          style={{ padding: 28, marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div>
            <div className="t-eyebrow">Saldo disponível</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 40, fontWeight: 600, letterSpacing: '-0.02em' }}>
              {me.data ? BRL(me.data.balance_brl) : '—'}
            </div>
            {me.data && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                Cada previsão custa {BRL(me.data.unlock_cost_brl)} para destravar.
              </div>
            )}
          </div>
          <Link to="/checkout?credits=1" className="btn btn-edge">
            Carregar créditos
          </Link>
        </div>

        <div className="t-eyebrow" style={{ margin: '32px 0 12px' }}>Extrato</div>
        {me.isLoading && <div style={{ color: 'var(--muted)' }}>Carregando…</div>}
        {me.data && me.data.transactions.length === 0 && (
          <div className="surface" style={{ padding: 24, color: 'var(--muted)', fontSize: 13 }}>
            Nenhum movimento ainda.
          </div>
        )}
        {me.data && me.data.transactions.length > 0 && (
          <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
            {me.data.transactions.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 18px',
                  borderTop: '1px solid var(--line)',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {t.reason || KIND_LABEL[t.kind]}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {KIND_LABEL[t.kind]} · {new Date(t.created_at).toLocaleString('pt-BR')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontWeight: 600,
                      color: t.amount_brl >= 0 ? 'var(--edge)' : 'var(--loss)',
                    }}
                  >
                    {t.amount_brl >= 0 ? '+' : ''}
                    {BRL(t.amount_brl)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                    saldo {BRL(t.balance_after)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
