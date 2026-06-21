import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Logo } from '../components/atoms';
import { Seo } from '../components/Seo';
import { useAuth } from '../lib/auth';
import { api, type SignupBody } from '../lib/api';
import { LanguageSelector } from '../components/LanguageSelector';
import { COUNTRIES } from '../lib/countries';

function maskCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
function isValidCpfClient(input: string) {
  const cpf = input.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  for (let pos = 9; pos < 11; pos += 1) {
    let sum = 0;
    for (let i = 0; i < pos; i += 1) sum += Number(cpf[i]) * (pos + 1 - i);
    let digit = (sum * 10) % 11;
    if (digit === 10) digit = 0;
    if (digit !== Number(cpf[pos])) return false;
  }
  return true;
}
function isAdultClient(birthIso: string) {
  const t = new Date(birthIso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t >= 18 * 365.25 * 86_400_000;
}

export function SignupPage() {
  const { t } = useTranslation();
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Identificação
  const [email, setEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('BR');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  // Plataformas (texto livre digitado pelo usuário)
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [platformInput, setPlatformInput] = useState('');
  // Termos
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsScrolled, setTermsScrolled] = useState(false);
  // Convite
  const [referralCode, setReferralCode] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setReferralCode(ref.trim().toLowerCase());
  }, [searchParams]);

  const settingsQ = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => api.publicSettings(),
    staleTime: 5 * 60_000,
  });
  const referralQ = useQuery({
    queryKey: ['public-referral', referralCode],
    queryFn: () => api.publicReferral(referralCode),
    enabled: !!referralCode && referralCode.length >= 4,
    staleTime: 5 * 60_000,
  });
  const sponsor = referralQ.data?.sponsor ?? null;
  const discount = settingsQ.data?.referral_discount_pct ?? 10;
  // Programa de afiliados pausado → some o convite/indicação (foco na Copa).
  const affiliatesEnabled = settingsQ.data?.affiliate_program_enabled ?? false;

  const isBR = country === 'BR';
  // CPF só é validado para o Brasil; outros países informam documento livre.
  const cpfValid = useMemo(
    () => !isBR || cpf.length === 0 || isValidCpfClient(cpf),
    [isBR, cpf],
  );
  const ageOk = useMemo(() => birthDate.length === 0 || isAdultClient(birthDate), [birthDate]);
  const emailMatch = useMemo(
    () => emailConfirm.length === 0 || email.trim().toLowerCase() === emailConfirm.trim().toLowerCase(),
    [email, emailConfirm],
  );
  const passwordMatch = useMemo(
    () => passwordConfirm.length === 0 || password === passwordConfirm,
    [password, passwordConfirm],
  );

  const addPlatform = (raw: string) => {
    const v = raw.replace(/\s+/g, ' ').trim();
    if (!v) return;
    setPlatforms((prev) =>
      prev.some((p) => p.toLowerCase() === v.toLowerCase()) || prev.length >= 15 ? prev : [...prev, v],
    );
    setPlatformInput('');
  };
  const removePlatform = (id: string) => {
    setPlatforms((prev) => prev.filter((p) => p !== id));
  };
  const onPlatformKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addPlatform(platformInput);
    } else if (e.key === 'Backspace' && platformInput === '' && platforms.length > 0) {
      setPlatforms((prev) => prev.slice(0, -1));
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase()) {
      setError('os emails não coincidem'); return;
    }
    if (password !== passwordConfirm) { setError('as senhas não coincidem'); return; }
    if (isBR && !cpfValid) { setError('CPF inválido'); return; }
    if (!ageOk) { setError('apenas maiores de 18 anos'); return; }
    if (!termsAccepted) { setError('é preciso aceitar os termos de uso'); return; }
    if (!termsScrolled) { setError('leia os termos antes de aceitar'); return; }

    setLoading(true);
    try {
      const body: SignupBody = {
        email,
        password,
        name: name || undefined,
        full_name: fullName,
        country,
        cpf: isBR ? cpf.replace(/\D/g, '') : cpf.trim(),
        birth_date: birthDate,
        platforms,
        terms_accepted: true,
        referralCode: referralCode || undefined,
      };
      await signup(body);
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setError((err as Error).message || t('auth.login_error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', placeItems: 'start center', padding: '32px 16px' }}>
      <Seo
        title="Criar conta"
        description="Crie sua conta no Jonas Goat e comece a receber value bets matemáticas. Plano grátis sem cartão."
        path="/signup"
        noindex
      />
      <LanguageSelector variant="floating" />
      <div className="surface" style={{ padding: 40, width: '100%', maxWidth: 640 }}>
        <Logo size={20} />
        <h1 style={{ fontSize: 28, fontWeight: 500, marginTop: 32, marginBottom: 8, letterSpacing: '-0.02em' }}>
          {t('auth.signup_title')}
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 24 }}>
          Leva menos de um minuto. Plano free libera 5 previsões por dia.
        </p>

        {affiliatesEnabled && referralCode && sponsor && (
          <div
            style={{
              marginBottom: 16, padding: '12px 14px', borderRadius: 8,
              background: 'var(--edge-soft)',
              border: '1px solid oklch(0.88 0.17 125 / 0.4)',
              fontSize: 13, color: 'var(--edge)', lineHeight: 1.5,
            }}
          >
            🎁 Convite de <strong>{sponsor.display}</strong>. Você ganha{' '}
            <strong>{discount}% off</strong> na primeira cobrança quando assinar Pro ou Founders.
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Section title="Acesso">
            <Field label="Email">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="seu@email.com" autoComplete="email" />
            </Field>
            <Field label="Confirmar email">
              <input type="email" required value={emailConfirm} onChange={(e) => setEmailConfirm(e.target.value)} className="input" placeholder="repita o email" autoComplete="email" onPaste={(e) => e.preventDefault()} />
              {!emailMatch && emailConfirm.length > 0 && <Hint kind="error">os emails não coincidem</Hint>}
            </Field>
            <Field label="Senha (mín. 8 caracteres)">
              <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" autoComplete="new-password" />
            </Field>
            <Field label="Confirmar senha">
              <input type="password" required minLength={8} value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className="input" placeholder="••••••••" autoComplete="new-password" />
              {!passwordMatch && passwordConfirm.length > 0 && <Hint kind="error">as senhas não coincidem</Hint>}
            </Field>
            <Field label="Apelido (opcional)">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Como prefere ser chamado" autoComplete="nickname" />
            </Field>
          </Section>

          <Section title="Identificação">
            <Field label="Nome completo">
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" placeholder="Como aparece no documento" autoComplete="name" />
            </Field>
            <Field label="País">
              <select required className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </Field>
            <Row>
              <Field label={isBR ? 'CPF' : 'Número do documento'}>
                {isBR ? (
                  <input
                    type="text" required value={cpf}
                    onChange={(e) => setCpf(maskCpf(e.target.value))}
                    className="input"
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    style={{ fontFamily: 'var(--mono)' }}
                  />
                ) : (
                  <input
                    type="text" required value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    className="input"
                    placeholder="passaporte, ID nacional…"
                    maxLength={40}
                  />
                )}
                {isBR && !cpfValid && cpf.length > 0 && <Hint kind="error">CPF inválido</Hint>}
              </Field>
              <Field label="Data de nascimento">
                <input type="date" required value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="input" />
                {!ageOk && birthDate.length > 0 && <Hint kind="error">apenas maiores de 18</Hint>}
              </Field>
            </Row>
          </Section>

          <Section title="Plataformas que você usa">
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: -4, marginBottom: 8 }}>
              Digite o nome da casa de apostas e tecle Enter. Adicione quantas quiser —
              usamos isso para priorizar comparação de odds nessas casas.
            </p>
            {platforms.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {platforms.map((p) => (
                  <span
                    key={p}
                    className="tag"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '6px 10px', fontSize: 12,
                      background: 'var(--edge-soft)', borderColor: 'var(--edge)', color: 'var(--edge)',
                    }}
                  >
                    {p}
                    <button
                      type="button"
                      onClick={() => removePlatform(p)}
                      aria-label={`remover ${p}`}
                      style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              value={platformInput}
              onChange={(e) => setPlatformInput(e.target.value)}
              onKeyDown={onPlatformKeyDown}
              onBlur={() => addPlatform(platformInput)}
              className="input"
              placeholder="ex.: Bet365, Betano…"
              maxLength={40}
            />
          </Section>

          <Section title="Termos de uso">
            <TermsBox onScrolledToEnd={() => setTermsScrolled(true)} />
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 12, cursor: termsScrolled ? 'pointer' : 'not-allowed', fontSize: 13, color: termsScrolled ? 'var(--text)' : 'var(--muted)' }}>
              <input
                type="checkbox"
                checked={termsAccepted}
                disabled={!termsScrolled}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                style={{ marginTop: 2 }}
              />
              <span>
                Li e aceito os <Link to="/termos" target="_blank" style={{ color: 'var(--edge)' }}>Termos de uso</Link>,
                tenho mais de 18 anos e entendo que a plataforma é apenas informativa — não opero apostas dentro dela.
              </span>
            </label>
            {!termsScrolled && (
              <Hint>Role o texto até o fim para liberar o aceite.</Hint>
            )}
          </Section>

          {error && (
            <div style={{ padding: 10, borderRadius: 6, background: 'oklch(0.68 0.16 25 / 0.1)', border: '1px solid oklch(0.68 0.16 25 / 0.3)', color: 'var(--loss)', fontSize: 12 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-edge"
            disabled={loading || !termsAccepted}
            style={{ justifyContent: 'center' }}
          >
            {loading ? t('auth.signup_loading') : t('auth.signup_title')}
          </button>
        </form>

        <hr className="hl" style={{ margin: '24px 0' }} />
        <div style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center' }}>
          {t('auth.signup_have_account')} <Link to="/login" style={{ color: 'var(--edge)' }}>{t('auth.signup_login')}</Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <legend className="t-eyebrow" style={{ marginBottom: 4 }}>{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
      <span style={{ fontSize: 11, color: 'var(--text-2)', letterSpacing: '0.04em' }}>{label}</span>
      {children}
    </label>
  );
}

function Row({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{children}</div>;
}

function Hint({ children, kind }: Readonly<{ children: React.ReactNode; kind?: 'error' | 'warn' }>) {
  let color = 'var(--muted)';
  if (kind === 'error') color = 'var(--loss)';
  else if (kind === 'warn') color = 'var(--warn)';
  return <span style={{ fontSize: 11, color }}>{children}</span>;
}

function TermsBox({ onScrolledToEnd }: Readonly<{ onScrolledToEnd: () => void }>) {
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const t = e.currentTarget;
    if (t.scrollTop + t.clientHeight >= t.scrollHeight - 8) onScrolledToEnd();
  };
  return (
    <div
      onScroll={onScroll}
      style={{
        height: 220, overflowY: 'auto', padding: 16,
        border: '1px solid var(--line)', borderRadius: 8,
        background: 'var(--bg-2)', fontSize: 12, color: 'var(--text-2)',
        lineHeight: 1.6,
      }}
    >
      <p><strong>Aviso importante.</strong> O Jonas Goat é uma <strong>plataforma de informação e análise estatística</strong>. Não somos uma casa de apostas, não aceitamos depósitos, não processamos saques e não realizamos qualquer aposta dentro deste site.</p>
      <p><strong>1. Sobre a plataforma.</strong> Oferecemos análises probabilísticas e comparações de odds. As previsões são geradas por modelos estatísticos (Dixon-Coles, ELO, regressão Bayesiana) combinados em ensemble.</p>
      <p><strong>2. O que NÃO fazemos.</strong> Não recebemos depósitos. Não custodiamos dinheiro. Não processamos apostas. Não somos afiliados a bookmakers. Não garantimos lucro.</p>
      <p><strong>3. Limitação de responsabilidade.</strong> As previsões são probabilísticas. Erros são esperados. Resultados passados não garantem resultados futuros. Você é o único responsável pelas decisões de apostar e pela gestão do bankroll.</p>
      <p><strong>4. Jogo responsável.</strong> Apostas envolvem risco de perda total. Aposte só o que está disposto a perder. Não use dinheiro de salário, aluguel ou empréstimos. Defina um teto mensal. Em caso de descontrole, procure <a href="https://www.jogadoresanonimos.com.br/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--edge)' }}>Jogadores Anônimos</a>. <strong>Apenas maiores de 18 anos.</strong></p>
      <p><strong>5. Conta.</strong> Você é responsável pela senha. Notifique-nos em caso de uso não autorizado. Reservamo-nos o direito de suspender contas que violem os termos.</p>
      <p><strong>6. Programa de afiliados.</strong> Nível único. O afiliado ganha comissão sobre cobranças do convidado direto.</p>
      <p><strong>7. Assinatura e reembolso.</strong> Cobrança recorrente (mensal/anual) ou única (vitalício) via gateway externo. Reembolso integral em 7 dias após primeira cobrança.</p>
      <p><strong>8. Privacidade.</strong> Coletamos email, nome, dados de identificação (CPF, endereço) exigidos pela Lei 14.790/23, histórico que você registrar e dados de afiliação. Não vendemos dados.</p>
      <p><strong>9. Propriedade intelectual.</strong> Modelos, dados agregados e software são propriedade do Jonas Goat. Proibida redistribuição, scraping ou revenda.</p>
      <p><strong>10. Conformidade legal (Brasil).</strong> Operamos em conformidade com a Lei 14.790/2023. Bookmakers licenciados pela SPA / Ministério da Fazenda é quem opera apostas — somos um produto de informação paralelo.</p>
      <p><strong>11. Alterações.</strong> Podemos atualizar estes termos. Mudanças relevantes são comunicadas via notificação in-app e email.</p>
      <p><strong>12. Contato.</strong> contato@jonasgoat.com.br</p>
      <p style={{ marginTop: 12, color: 'var(--muted)', fontSize: 11 }}>+18 · jogue com responsabilidade · aposta envolve risco de perda total · versão 2026-05.</p>
    </div>
  );
}
