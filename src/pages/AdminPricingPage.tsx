import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { SectionHeader } from '../components/atoms';
import { api, type CurrencyPriceRow, type CurrencyPriceInput } from '../lib/api';

export function AdminPricingPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-currency-prices'], queryFn: () => api.adminCurrencyPrices() });

  const save = useMutation({
    mutationFn: ({ currency, body }: { currency: string; body: CurrencyPriceInput }) =>
      api.putCurrencyPrice(currency, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-currency-prices'] }),
  });
  const remove = useMutation({
    mutationFn: (currency: string) => api.deleteCurrencyPrice(currency),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-currency-prices'] }),
  });

  return (
    <AdminLayout>
      <div style={{ maxWidth: 980 }}>
        <SectionHeader
          eyebrow="Controle de assinaturas"
          title="Preços por moeda"
          sub="O padrão global é USD (Founders $300, mensal $10, anual $100). Cadastre um preço especial por moeda; se uma moeda não tiver preço especial, é cobrado o valor em USD."
        />

        {q.isLoading && <div style={{ padding: 32, color: 'var(--muted)' }}>Carregando…</div>}
        {q.data && (
          <>
            <div className="surface" style={{ padding: 0, overflow: 'hidden', marginTop: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 60px 1fr 110px 110px 120px 90px 150px', gap: 8, padding: '10px 16px', fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}>
                <span>Moeda</span><span>Símbolo</span><span>Nome</span><span>Mensal</span><span>Anual</span><span>Vitalício</span><span>Ativo</span><span></span>
              </div>
              {q.data.prices.map((row) => (
                <PriceRow
                  key={row.currency}
                  row={row}
                  saving={save.isPending}
                  onSave={(body) => save.mutate({ currency: row.currency, body })}
                  onDelete={row.currency === 'USD' ? undefined : () => remove.mutate(row.currency)}
                />
              ))}
            </div>

            <NewCurrency saving={save.isPending} onSave={(currency, body) => save.mutate({ currency, body })} />
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function PriceRow({
  row, onSave, onDelete, saving,
}: Readonly<{ row: CurrencyPriceRow; onSave: (b: CurrencyPriceInput) => void; onDelete?: () => void; saving: boolean }>) {
  const [symbol, setSymbol] = useState(row.symbol);
  const [label, setLabel] = useState(row.label ?? '');
  const [monthly, setMonthly] = useState(String(row.monthly));
  const [yearly, setYearly] = useState(row.yearly != null ? String(row.yearly) : '');
  const [lifetime, setLifetime] = useState(row.lifetime != null ? String(row.lifetime) : '');
  const [enabled, setEnabled] = useState(row.enabled);

  const dirty =
    symbol !== row.symbol || label !== (row.label ?? '') || monthly !== String(row.monthly) ||
    yearly !== (row.yearly != null ? String(row.yearly) : '') ||
    lifetime !== (row.lifetime != null ? String(row.lifetime) : '') || enabled !== row.enabled;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '80px 60px 1fr 110px 110px 120px 90px 150px', gap: 8, padding: '10px 16px', alignItems: 'center', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
      <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{row.currency}{row.currency === 'USD' && <span style={{ fontSize: 9, color: 'var(--edge)', marginLeft: 4 }}>base</span>}</span>
      <input className="input" value={symbol} onChange={(e) => setSymbol(e.target.value)} style={{ padding: 6 }} />
      <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} style={{ padding: 6 }} />
      <input className="input" type="number" value={monthly} onChange={(e) => setMonthly(e.target.value)} style={{ padding: 6 }} />
      <input className="input" type="number" value={yearly} onChange={(e) => setYearly(e.target.value)} style={{ padding: 6 }} placeholder="—" />
      <input className="input" type="number" value={lifetime} onChange={(e) => setLifetime(e.target.value)} style={{ padding: 6 }} placeholder="—" />
      <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          className="btn btn-edge btn-sm"
          disabled={!dirty || saving}
          onClick={() => onSave({ symbol, label: label || null, monthly: Number(monthly), yearly: yearly ? Number(yearly) : null, lifetime: lifetime ? Number(lifetime) : null, enabled })}
        >
          Salvar
        </button>
        {onDelete && (
          <button className="btn btn-ghost btn-sm" onClick={onDelete} title="Remover preço especial" style={{ color: 'var(--loss)' }}>✕</button>
        )}
      </div>
    </div>
  );
}

function NewCurrency({ onSave, saving }: Readonly<{ onSave: (currency: string, b: CurrencyPriceInput) => void; saving: boolean }>) {
  const [currency, setCurrency] = useState('');
  const [symbol, setSymbol] = useState('');
  const [label, setLabel] = useState('');
  const [monthly, setMonthly] = useState('');
  const [yearly, setYearly] = useState('');
  const [lifetime, setLifetime] = useState('');
  const valid = /^[A-Za-z]{3}$/.test(currency) && symbol && monthly;

  return (
    <div className="surface" style={{ padding: 20, marginTop: 16 }}>
      <div className="t-eyebrow" style={{ marginBottom: 12 }}>Adicionar preço especial para uma moeda</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr) auto', gap: 8, alignItems: 'end' }}>
        <Field label="Moeda (ISO)"><input className="input" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} placeholder="EUR" /></Field>
        <Field label="Símbolo"><input className="input" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="€" /></Field>
        <Field label="Nome"><input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Euro" /></Field>
        <Field label="Mensal"><input className="input" type="number" value={monthly} onChange={(e) => setMonthly(e.target.value)} /></Field>
        <Field label="Anual"><input className="input" type="number" value={yearly} onChange={(e) => setYearly(e.target.value)} /></Field>
        <Field label="Vitalício"><input className="input" type="number" value={lifetime} onChange={(e) => setLifetime(e.target.value)} /></Field>
        <button
          className="btn btn-edge"
          disabled={!valid || saving}
          onClick={() => {
            onSave(currency, { symbol, label: label || null, monthly: Number(monthly), yearly: yearly ? Number(yearly) : null, lifetime: lifetime ? Number(lifetime) : null, enabled: true });
            setCurrency(''); setSymbol(''); setLabel(''); setMonthly(''); setYearly(''); setLifetime('');
          }}
        >
          Adicionar
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      {children}
    </label>
  );
}
