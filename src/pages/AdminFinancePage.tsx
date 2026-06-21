import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { SectionHeader, Stat } from '../components/atoms';
import { getToken, api, type FinanceCategory, type FinanceFilters, type FinanceKind, type FinanceLine, type FinanceSource } from '../lib/api';

const CATEGORY_LABEL: Record<FinanceCategory, string> = {
  gateway: 'Gateway',
  infra: 'Infraestrutura',
  refund: 'Reembolso',
  marketing: 'Marketing',
  tax: 'Imposto',
  other: 'Outros',
};

const SOURCE_LABEL: Record<FinanceSource, string> = {
  subscription: 'Assinatura',
  commission: 'Comissão',
  manual: 'Manual',
  credits: 'Créditos',
};

function fmtBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function todayIso() { return new Date().toISOString().slice(0, 10); }

export function AdminFinancePage() {
  const [filters, setFilters] = useState<FinanceFilters>({});
  const [showForm, setShowForm] = useState(false);

  const list = useQuery({
    queryKey: ['admin-finance', filters],
    queryFn: () => api.adminFinance(filters),
  });

  const triggerExport = (format: 'csv' | 'xlsx' | 'pdf') => {
    // Como precisa do header Authorization, baixamos via fetch e Blob.
    const url = api.adminFinanceExportUrl({ ...filters, format });
    const tok = getToken();
    fetch(url, { headers: tok ? { Authorization: `Bearer ${tok}` } : {}, credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`falha no export ${r.status}`);
        const blob = await r.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `financeiro_${todayIso()}.${format}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5_000);
      })
      .catch((e) => alert(`Erro: ${(e as Error).message}`));
  };

  return (
    <AdminLayout>
      <SectionHeader
        eyebrow="Tesouraria"
        title="Financeiro"
        sub="Receitas das assinaturas, despesas das comissões pagas, lançamentos manuais. Filtre por período e exporte em CSV, Excel ou PDF."
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'Cancelar' : 'Novo lançamento'}
            </button>
            <button className="btn btn-sm" onClick={() => triggerExport('csv')}>CSV</button>
            <button className="btn btn-sm" onClick={() => triggerExport('xlsx')}>Excel</button>
            <button className="btn btn-sm" onClick={() => triggerExport('pdf')}>PDF</button>
          </div>
        }
      />

      <Filters filters={filters} onChange={setFilters} />
      {showForm && <ManualEntryForm onDone={() => setShowForm(false)} />}

      {list.isLoading && <div style={{ padding: 32, color: 'var(--muted)' }}>Carregando…</div>}

      {list.data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            <div className="surface" style={{ padding: 20 }}>
              <Stat label="Receitas" value={fmtBrl(list.data.stats.income_brl)} sub="período filtrado" color="var(--edge)" />
            </div>
            <div className="surface" style={{ padding: 20 }}>
              <Stat label="Despesas" value={fmtBrl(list.data.stats.expense_brl)} sub="período filtrado" color="var(--loss)" />
            </div>
            <div className="surface" style={{ padding: 20 }}>
              <Stat
                label="Líquido"
                value={fmtBrl(list.data.stats.net_brl)}
                sub="receita − despesa"
                color={list.data.stats.net_brl >= 0 ? 'var(--edge)' : 'var(--loss)'}
              />
            </div>
            <div className="surface" style={{ padding: 20 }}>
              <Stat label="Lançamentos" value={String(list.data.stats.count)} sub="linhas no relatório" />
            </div>
          </div>
          <FeedTable lines={list.data.lines} />
        </>
      )}
    </AdminLayout>
  );
}

function Filters({ filters, onChange }: Readonly<{ filters: FinanceFilters; onChange: (f: FinanceFilters) => void }>) {
  return (
    <div className="surface" style={{ padding: 16, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <FilterField label="De"><input type="date" className="input" value={filters.from ?? ''} onChange={(e) => onChange({ ...filters, from: e.target.value || undefined })} /></FilterField>
      <FilterField label="Até"><input type="date" className="input" value={filters.to ?? ''} onChange={(e) => onChange({ ...filters, to: e.target.value || undefined })} /></FilterField>
      <FilterField label="Tipo">
        <select className="input" value={filters.kind ?? ''} onChange={(e) => onChange({ ...filters, kind: (e.target.value || undefined) as FinanceKind | undefined })}>
          <option value="">Todos</option>
          <option value="income">Receita</option>
          <option value="expense">Despesa</option>
        </select>
      </FilterField>
      <FilterField label="Origem">
        <select className="input" value={filters.source ?? ''} onChange={(e) => onChange({ ...filters, source: (e.target.value || undefined) as FinanceSource | undefined })}>
          <option value="">Todas</option>
          <option value="subscription">Assinaturas</option>
          <option value="commission">Comissões</option>
          <option value="credits">Créditos</option>
          <option value="manual">Manuais</option>
        </select>
      </FilterField>
      {(filters.from || filters.to || filters.kind || filters.source) && (
        <button type="button" className="btn btn-sm" onClick={() => onChange({})} style={{ fontSize: 11 }}>
          Limpar
        </button>
      )}
    </div>
  );
}

function FilterField({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      {children}
    </label>
  );
}

function ManualEntryForm({ onDone }: Readonly<{ onDone: () => void }>) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<FinanceKind>('expense');
  const [category, setCategory] = useState<FinanceCategory>('gateway');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [occurred, setOccurred] = useState(todayIso());
  const [notes, setNotes] = useState('');

  const create = useMutation({
    mutationFn: () => api.adminFinanceCreate({
      kind, category, description, amount_brl: Number(amount),
      occurred_at: occurred, notes: notes || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-finance'] });
      onDone();
    },
  });

  return (
    <form
      className="surface"
      style={{ padding: 20, marginBottom: 16 }}
      onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
    >
      <div className="t-eyebrow" style={{ marginBottom: 12 }}>Novo lançamento manual</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <FilterField label="Tipo">
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as FinanceKind)}>
            <option value="income">Receita</option>
            <option value="expense">Despesa</option>
          </select>
        </FilterField>
        <FilterField label="Categoria">
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as FinanceCategory)}>
            {(Object.keys(CATEGORY_LABEL) as FinanceCategory[]).map((c) => (
              <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Valor (R$)">
          <input
            type="number" min={0} step="0.01" required
            className="input" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
          />
        </FilterField>
        <FilterField label="Data">
          <input type="date" required className="input" value={occurred} onChange={(e) => setOccurred(e.target.value)} />
        </FilterField>
      </div>
      <div style={{ marginTop: 12 }}>
        <FilterField label="Descrição">
          <input required minLength={2} maxLength={240} className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: taxa Stripe novembro" />
        </FilterField>
      </div>
      <div style={{ marginTop: 12 }}>
        <FilterField label="Observações (opcional)">
          <textarea className="input" rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FilterField>
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button type="submit" className="btn btn-edge" disabled={create.isPending || !amount || !description}>
          {create.isPending ? 'Salvando…' : 'Salvar'}
        </button>
        <button type="button" className="btn" onClick={onDone}>Cancelar</button>
      </div>
      {create.isError && <div style={{ marginTop: 8, color: 'var(--loss)', fontSize: 12 }}>{String(create.error)}</div>}
    </form>
  );
}

function FeedTable({ lines }: Readonly<{ lines: FinanceLine[] }>) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: (id: number) => api.adminFinanceDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-finance'] }),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, FinanceLine[]>();
    for (const l of lines) {
      const key = l.occurred_at.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [lines]);

  if (lines.length === 0) {
    return <div className="surface" style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>Sem lançamentos no filtro atual.</div>;
  }

  return (
    <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
      {grouped.map(([month, group]) => {
        const income = group.filter((l) => l.kind === 'income').reduce((a, b) => a + b.amount_brl, 0);
        const expense = group.filter((l) => l.kind === 'expense').reduce((a, b) => a + b.amount_brl, 0);
        return (
          <div key={month}>
            <div style={{ padding: '12px 20px', background: 'var(--bg-2)', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', fontSize: 12, fontFamily: 'var(--mono)' }}>
              <span style={{ fontWeight: 500 }}>{month}</span>
              <span style={{ color: 'var(--muted)' }}>
                <span style={{ color: 'var(--edge)' }}>+{fmtBrl(income)}</span>{' '}·{' '}
                <span style={{ color: 'var(--loss)' }}>−{fmtBrl(expense)}</span>{' '}·{' '}
                Líquido <span style={{ color: income - expense >= 0 ? 'var(--edge)' : 'var(--loss)' }}>{fmtBrl(income - expense)}</span>
              </span>
            </div>
            {group.map((l) => (
              <div
                key={`${l.source}-${l.ref_id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 90px 90px 1fr 130px 60px',
                  gap: 12, padding: '10px 20px',
                  borderTop: '1px solid var(--line)',
                  alignItems: 'center', fontSize: 12,
                }}
              >
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{l.occurred_at}</span>
                <span
                  className="tag"
                  style={{
                    fontSize: 10,
                    color: l.kind === 'income' ? 'var(--edge)' : 'var(--loss)',
                    borderColor: l.kind === 'income' ? 'var(--edge)' : 'var(--loss)',
                    justifySelf: 'start',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}
                >
                  {l.kind === 'income' ? 'Receita' : 'Despesa'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{SOURCE_LABEL[l.source]}</span>
                <span>
                  <div>{l.description}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{l.category}</div>
                </span>
                <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', fontWeight: 500, color: l.kind === 'income' ? 'var(--edge)' : 'var(--loss)' }}>
                  {l.kind === 'income' ? '+' : '−'}{fmtBrl(l.amount_brl)}
                </span>
                <span style={{ textAlign: 'right' }}>
                  {l.source === 'manual' && (
                    <button
                      type="button"
                      onClick={() => { if (confirm('Excluir este lançamento?')) del.mutate(l.ref_id); }}
                      className="btn btn-sm"
                      style={{ fontSize: 10, padding: '2px 6px', color: 'var(--loss)' }}
                    >
                      ×
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
