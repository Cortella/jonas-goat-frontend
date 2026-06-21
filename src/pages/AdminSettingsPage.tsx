import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { SectionHeader } from '../components/atoms';
import { api, type AppSettings } from '../lib/api';

export function AdminSettingsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-settings'], queryFn: () => api.adminGetSettings() });

  const [defaultPct, setDefaultPct] = useState<string>('');
  const [enabled, setEnabled] = useState(true);
  const [saved, setSaved] = useState(false);

  // Checkout e créditos
  const [referralPct, setReferralPct] = useState<string>('');
  const [pixRecurringPct, setPixRecurringPct] = useState<string>('');
  const [unlockCost, setUnlockCost] = useState<string>('');
  const [savedCheckout, setSavedCheckout] = useState(false);

  useEffect(() => {
    if (q.data) {
      setDefaultPct(String(q.data.default_affiliate_pct));
      setEnabled(q.data.affiliate_program_enabled);
      setReferralPct(String(q.data.referral_discount_pct));
      setPixRecurringPct(String(q.data.pix_recurring_discount_pct));
      setUnlockCost(String(q.data.prediction_unlock_cost_brl));
    }
  }, [q.data]);

  const m = useMutation({
    mutationFn: (body: Partial<AppSettings>) => api.adminPutSettings(body),
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      setTimeout(() => setSaved(false), 1800);
    },
  });

  const mCheckout = useMutation({
    mutationFn: (body: Partial<AppSettings>) => api.adminPutSettings(body),
    onSuccess: () => {
      setSavedCheckout(true);
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      setTimeout(() => setSavedCheckout(false), 1800);
    },
  });

  const submitCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    mCheckout.mutate({
      referral_discount_pct: Number(referralPct),
      pix_recurring_discount_pct: Number(pixRecurringPct),
      prediction_unlock_cost_brl: Number(unlockCost),
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const pct = Number(defaultPct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return;
    m.mutate({ default_affiliate_pct: pct, affiliate_program_enabled: enabled });
  };

  return (
    <AdminLayout>
      <SectionHeader
        eyebrow="Configurações"
        title="Programa de afiliados"
        sub="A porcentagem padrão se aplica a todos os usuários, exceto aqueles com taxa customizada."
      />

      {q.isLoading && <div style={{ padding: 48, color: 'var(--muted)' }}>Carregando…</div>}
      {q.data && (
        <form onSubmit={submit} className="surface" style={{ padding: 32, maxWidth: 640 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
            <span className="t-eyebrow">Programa de afiliados</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 999,
                  position: 'relative',
                  cursor: 'pointer',
                  background: enabled ? 'var(--edge)' : 'var(--surface-2)',
                  border: `1px solid ${enabled ? 'var(--edge)' : 'var(--line-2)'}`,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 1,
                    left: enabled ? 21 : 1,
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    background: enabled ? 'var(--edge-ink)' : 'var(--text-2)',
                    transition: 'left 120ms',
                  }}
                />
              </button>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                {enabled ? 'Ativo — comissões geradas a cada cobrança' : 'Pausado — sem comissões novas'}
              </span>
            </div>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
            <span className="t-eyebrow">Comissão padrão (%)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="number"
                step={0.1}
                min={0}
                max={100}
                value={defaultPct}
                onChange={(e) => setDefaultPct(e.target.value)}
                className="input"
                style={{ maxWidth: 120, fontFamily: 'var(--mono)' }}
              />
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                aplica-se a todo afiliado sem taxa customizada
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
              Em um plano de R$ 49/mês com 20%, o convidador ganha R$ 9,80 por cobrança do convidado.
            </div>
          </label>

          {m.isError && (
            <div style={{ padding: 10, borderRadius: 6, background: 'oklch(0.68 0.16 25 / 0.1)', border: '1px solid oklch(0.68 0.16 25 / 0.3)', color: 'var(--loss)', fontSize: 12, marginBottom: 12 }}>
              {String(m.error)}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button type="submit" className="btn btn-edge" disabled={m.isPending}>
              {m.isPending ? 'Salvando…' : 'Salvar'}
            </button>
            {saved && <span style={{ color: 'var(--edge)', fontSize: 13 }}>✓ salvo</span>}
          </div>
        </form>
      )}

      {q.data && (
        <form onSubmit={submitCheckout} className="surface" style={{ padding: 32, maxWidth: 640, marginTop: 24 }}>
          <div className="t-eyebrow" style={{ marginBottom: 4 }}>Checkout e créditos</div>
          <p style={{ margin: '0 0 20px', color: 'var(--text-2)', fontSize: 13 }}>
            Descontos do checkout e custo para destravar uma previsão avulsa.
          </p>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            <span className="t-eyebrow">Desconto de indicação (%)</span>
            <input type="number" step={0.1} min={0} max={100} value={referralPct}
              onChange={(e) => setReferralPct(e.target.value)} className="input"
              style={{ maxWidth: 120, fontFamily: 'var(--mono)' }} />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>aplicado na 1ª compra de plano de quem foi convidado</span>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            <span className="t-eyebrow">Desconto Pix recorrente (%)</span>
            <input type="number" step={0.1} min={0} max={100} value={pixRecurringPct}
              onChange={(e) => setPixRecurringPct(e.target.value)} className="input"
              style={{ maxWidth: 120, fontFamily: 'var(--mono)' }} />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>incentivo para assinatura via Pix recorrente</span>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
            <span className="t-eyebrow">Custo para destravar previsão (R$)</span>
            <input type="number" step={0.01} min={0} value={unlockCost}
              onChange={(e) => setUnlockCost(e.target.value)} className="input"
              style={{ maxWidth: 120, fontFamily: 'var(--mono)' }} />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>debitado da carteira; planos Pro/Founders veem grátis</span>
          </label>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button type="submit" className="btn btn-edge" disabled={mCheckout.isPending}>
              {mCheckout.isPending ? 'Salvando…' : 'Salvar'}
            </button>
            {savedCheckout && <span style={{ color: 'var(--edge)', fontSize: 13 }}>✓ salvo</span>}
          </div>
        </form>
      )}
    </AdminLayout>
  );
}
