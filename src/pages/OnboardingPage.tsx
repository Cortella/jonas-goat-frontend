import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/atoms';
import { api } from '../lib/api';

const LEAGUE_OPTIONS: Array<{ code: string; name: string; sub: string; available: boolean }> = [
  { code: 'PL', name: 'Premier League', sub: '380 jogos/ano', available: true },
  { code: 'PD', name: 'La Liga', sub: '380 jogos/ano', available: true },
  { code: 'BL1', name: 'Bundesliga', sub: '306 jogos/ano', available: true },
  { code: 'SA', name: 'Serie A', sub: '380 jogos/ano', available: true },
  { code: 'FL1', name: 'Ligue 1', sub: '306 jogos/ano', available: true },
  { code: 'CL', name: 'Champions League', sub: '125 jogos/ano', available: true },
  { code: 'WC', name: 'Copa do Mundo 2026', sub: '104 jogos · jun-jul', available: true },
  { code: 'BR', name: 'Brasileirão (em breve)', sub: 'Lançamento em ago/26', available: false },
];

const RISK_OPTIONS: Array<{ key: 'conservative' | 'balanced' | 'aggressive' | 'custom'; label: string; sub: string; ev: number; risk: string }> = [
  { key: 'conservative', label: 'Conservador', sub: 'Mostra só EV ≥ 8%. ~2 oportunidades/dia. Variância baixa.', ev: 8, risk: 'Baixo' },
  { key: 'balanced', label: 'Equilibrado', sub: 'Mostra EV ≥ 5%. ~5 oportunidades/dia. Recomendado.', ev: 5, risk: 'Médio' },
  { key: 'aggressive', label: 'Agressivo', sub: 'Mostra EV ≥ 3%. ~12 oportunidades/dia. Mais variância, mais volume.', ev: 3, risk: 'Alto' },
  { key: 'custom', label: 'Personalizado', sub: 'Define um threshold próprio depois.', ev: 5, risk: '—' },
];

const BOOK_OPTIONS = ['Bet365', 'Betano', 'Sportingbet', 'Betfair', 'KTO', 'Superbet', 'Pinnacle', 'Betnacional'];

const BANKROLL_PRESETS = [500, 1000, 2000, 5000, 10000];

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const total = 4;

  const [leagues, setLeagues] = useState<string[]>(['PL', 'PD', 'SA', 'CL', 'WC']);
  const [risk, setRisk] = useState<'conservative' | 'balanced' | 'aggressive' | 'custom'>('balanced');
  const [bookmakers, setBookmakers] = useState<string[]>(['Bet365', 'Betano', 'Pinnacle']);
  const [bankroll, setBankroll] = useState<number>(2000);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = <T,>(arr: T[], v: T): T[] => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      const minEv = RISK_OPTIONS.find((r) => r.key === risk)?.ev ?? 5;
      await api.setPreferences({
        leagues,
        bookmakers,
        risk_profile: risk,
        min_ev_pct: minEv,
        bankroll_initial: bankroll,
        onboarded: true,
      });
      navigate('/predictions', { replace: true });
    } catch (e) {
      setError((e as Error).message || 'Falha ao salvar preferências');
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step === total) finish();
    else setStep(step + 1);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', gridTemplateColumns: '440px 1fr' }}>
      {/* Side panel */}
      <div style={{ background: 'var(--bg-2)', borderRight: '1px solid var(--line)', padding: 48, display: 'flex', flexDirection: 'column' }}>
        <Logo size={20} />
        <div style={{ marginTop: 80 }}>
          <div className="t-eyebrow" style={{ marginBottom: 12 }}>Bem-vindo</div>
          <h1 style={{ fontSize: 36, fontWeight: 400, lineHeight: 1.1, margin: 0, letterSpacing: '-0.02em' }}>
            <span className="t-serif t-italic">90 segundos</span><br />
            pra calibrar o feed<br />
            ao seu jogo.
          </h1>
        </div>

        <div style={{ marginTop: 56, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(
            [
              ['Ligas', 'Quais competições você acompanha'],
              ['Risco', 'Threshold de EV mínimo'],
              ['Bookmakers', 'Onde você costuma apostar'],
              ['Bankroll', 'Tamanho da banca pra Kelly'],
            ] as Array<[string, string]>
          ).map(([t, s], i) => {
            const done = i < step - 1;
            const active = i === step - 1;
            return (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: !done && !active ? 0.4 : 1 }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    background: done ? 'var(--edge)' : 'transparent',
                    border: `1px solid ${done ? 'var(--edge)' : active ? 'var(--edge)' : 'var(--line-2)'}`,
                    color: done ? 'var(--edge-ink)' : 'var(--text-2)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontFamily: 'var(--mono)',
                    fontWeight: 600,
                  }}
                >
                  {done ? '✓' : i + 1}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{t}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />
        <button
          onClick={() => navigate('/predictions')}
          className="btn btn-ghost btn-sm"
          style={{ alignSelf: 'flex-start' }}
        >
          Pular onboarding
        </button>
      </div>

      {/* Form */}
      <div style={{ padding: '64px 64px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, maxWidth: 620 }}>
          {step === 1 && (
            <>
              <div className="t-eyebrow">Passo 01 / 04</div>
              <h2 style={{ fontSize: 28, fontWeight: 500, margin: '8px 0 8px', letterSpacing: '-0.01em' }}>
                Quais ligas você acompanha?
              </h2>
              <p style={{ color: 'var(--text-2)', marginTop: 0, fontSize: 13 }}>
                Filtra previsões e alertas. Você pode mudar depois em Preferências.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 24 }}>
                {LEAGUE_OPTIONS.map((opt) => {
                  const on = leagues.includes(opt.code);
                  return (
                    <button
                      type="button"
                      key={opt.code}
                      disabled={!opt.available}
                      onClick={() => setLeagues(toggle(leagues, opt.code))}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        background: on ? 'var(--edge-soft)' : 'var(--surface)',
                        border: `1px solid ${on ? 'oklch(0.88 0.17 125 / 0.4)' : 'var(--line)'}`,
                        opacity: opt.available ? 1 : 0.5,
                        cursor: opt.available ? 'pointer' : 'not-allowed',
                        textAlign: 'left',
                        color: 'var(--text)',
                      }}
                    >
                      <span className="league-mono" style={{ width: 28, height: 28, fontSize: 11 }}>{opt.code}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{opt.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{opt.sub}</div>
                      </div>
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 4,
                          background: on ? 'var(--edge)' : 'transparent',
                          border: `1px solid ${on ? 'var(--edge)' : 'var(--line-2)'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {on && <span style={{ fontSize: 11, color: 'var(--edge-ink)', fontWeight: 700 }}>✓</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="t-eyebrow">Passo 02 / 04</div>
              <h2 style={{ fontSize: 28, fontWeight: 500, margin: '8px 0 8px', letterSpacing: '-0.01em' }}>
                Qual o seu apetite de risco?
              </h2>
              <p style={{ color: 'var(--text-2)', marginTop: 0, fontSize: 13 }}>
                Define o threshold mínimo de EV para o que aparece no seu feed.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
                {RISK_OPTIONS.map((o) => {
                  const sel = risk === o.key;
                  return (
                    <button
                      type="button"
                      key={o.key}
                      onClick={() => setRisk(o.key)}
                      style={{
                        padding: '16px 18px',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        background: sel ? 'var(--edge-soft)' : 'var(--surface)',
                        border: `1px solid ${sel ? 'oklch(0.88 0.17 125 / 0.4)' : 'var(--line)'}`,
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: 'var(--text)',
                      }}
                    >
                      <span style={{ width: 18, height: 18, borderRadius: 999, border: `2px solid ${sel ? 'var(--edge)' : 'var(--line-2)'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        {sel && <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--edge)' }} />}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{o.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{o.sub}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span className="tag" style={{ fontSize: 10 }}>EV {o.ev}%</span>
                        <span className="tag" style={{ fontSize: 10 }}>Risco {o.risk}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="t-eyebrow">Passo 03 / 04</div>
              <h2 style={{ fontSize: 28, fontWeight: 500, margin: '8px 0 8px', letterSpacing: '-0.01em' }}>
                Em quais bookmakers você aposta?
              </h2>
              <p style={{ color: 'var(--text-2)', marginTop: 0, fontSize: 13 }}>
                Comparamos odds em todos, mas destacamos primeiro os seus.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 24 }}>
                {BOOK_OPTIONS.map((b) => {
                  const on = bookmakers.includes(b);
                  return (
                    <button
                      type="button"
                      key={b}
                      onClick={() => setBookmakers(toggle(bookmakers, b))}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500,
                        background: on ? 'var(--edge-soft)' : 'var(--surface)',
                        border: `1px solid ${on ? 'oklch(0.88 0.17 125 / 0.4)' : 'var(--line)'}`,
                        color: on ? 'var(--edge)' : 'var(--text)',
                        textAlign: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="t-eyebrow">Passo 04 / 04</div>
              <h2 style={{ fontSize: 28, fontWeight: 500, margin: '8px 0 8px', letterSpacing: '-0.01em' }}>
                Qual seu bankroll inicial?
              </h2>
              <p style={{ color: 'var(--text-2)', marginTop: 0, fontSize: 13 }}>
                Alimenta a calculadora Kelly. Fica privado, só visível pra você.
              </p>
              <div style={{ marginTop: 32 }}>
                <div className="t-eyebrow" style={{ marginBottom: 8 }}>Bankroll</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '16px 20px', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8 }}>
                  <span style={{ fontSize: 14, color: 'var(--muted)' }}>R$</span>
                  <input
                    type="number"
                    value={bankroll}
                    onChange={(e) => setBankroll(Number(e.target.value) || 0)}
                    min={0}
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 36, fontWeight: 500 }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Stake típica: R$ {(bankroll * 0.01).toFixed(0)}–{(bankroll * 0.025).toFixed(0)}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {BANKROLL_PRESETS.map((v) => (
                    <button
                      key={v}
                      onClick={() => setBankroll(v)}
                      type="button"
                      className="btn btn-sm"
                      style={{
                        flex: 1,
                        background: bankroll === v ? 'var(--surface-2)' : 'transparent',
                        border: `1px solid ${bankroll === v ? 'var(--edge)' : 'var(--line-2)'}`,
                        color: bankroll === v ? 'var(--edge)' : 'var(--text-2)',
                        justifyContent: 'center',
                      }}
                    >
                      R$ {v.toLocaleString('pt-BR')}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 32, padding: 16, background: 'oklch(0.82 0.15 80 / 0.06)', border: '1px solid oklch(0.82 0.15 80 / 0.3)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ color: 'var(--warn)', fontSize: 14, marginTop: 1 }}>!</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Aviso de jogo responsável</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.55 }}>
                      Bankroll = dinheiro que você está disposto a perder. Não use poupança, fundo de emergência, salário, dinheiro de
                      aluguel ou empréstimos. A Kelly fracionária limita stake a 5% do bankroll por jogo.
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {error && (
            <div style={{ marginTop: 16, padding: 10, borderRadius: 6, background: 'oklch(0.68 0.16 25 / 0.1)', border: '1px solid oklch(0.68 0.16 25 / 0.3)', color: 'var(--loss)', fontSize: 12 }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--line)' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1 || saving}
          >
            ← Voltar
          </button>
          <div style={{ flex: 1 }} />
          <span style={{ alignSelf: 'center', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
            {step} / {total}
          </span>
          <button type="button" className="btn btn-edge" onClick={next} disabled={saving}>
            {saving ? 'Salvando…' : step === total ? 'Concluir' : 'Continuar →'}
          </button>
        </div>
      </div>
    </div>
  );
}
