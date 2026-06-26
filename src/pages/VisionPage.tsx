import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppBar } from '../components/AppBar';
import { Seo } from '../components/Seo';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

/**
 * Página pública de VISÃO + plano FOUNDERS. Explica por que começamos pela Copa,
 * para onde a plataforma vai (todas as ligas e mercados em breve) e por que ser
 * Founders é vantagem eterna. No fim, qualquer usuário logado pode mandar uma
 * sugestão do que gostaria de ver — salva no banco e triada no admin.
 */
export function VisionPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <AppBar />
      <Seo
        title="Visão & Founders"
        description="O futuro do Jonas Goat: todas as ligas e todos os mercados em breve. Começamos pela Copa do Mundo 2026 para validar a IA com foco e máxima assertividade. Conheça as vantagens eternas do plano Founders."
        path="/founders"
      />

      <main style={{ maxWidth: 820, margin: '0 auto', padding: '56px 24px 96px' }}>
        {/* Hero */}
        <div className="t-eyebrow" style={{ marginBottom: 12 }}>Nossa visão</div>
        <h1 style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 16px', lineHeight: 1.1 }}>
          Começamos pela Copa.<br />Vamos chegar em tudo.
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: 16, lineHeight: 1.6, maxWidth: 660 }}>
          O Jonas Goat está só começando. O plano é claro: cobrir <strong>todas as ligas</strong> e
          <strong> todos os principais mercados</strong> com a mesma profundidade de análise. Mas
          fazemos isso do jeito certo — com foco, validando cada passo antes de entregar.
        </p>

        <Section eyebrow="Por que a Copa primeiro" title="Foco para acertar mais">
          Inteligência artificial é tão boa quanto os dados e o foco que recebe. No início, a IA
          trabalha com <strong>menos dados de propósito</strong>: concentrando todo o poder de
          modelagem num universo menor e bem definido, as análises ficam <strong>mais assertivas</strong> do
          que se tentássemos abraçar o mundo inteiro de uma vez. Por isso o foco inicial é a
          <strong> Copa do Mundo 2026</strong> — um campeonato fechado, com seleções, dados ricos e
          altíssima atenção. É o ambiente perfeito para calibrar e provar o modelo.
        </Section>

        <Section eyebrow="O método" title="Validar e então liberar">
          Nossa intenção não é prometer — é <strong>provar</strong>. Cada análise é validada contra o
          resultado real antes de ganhar a nossa confiança. Só o que passa nesse teste é
          <strong> disponibilizado para os nossos assinantes</strong>. Crescemos liga por liga,
          mercado por mercado, sempre mantendo a régua de qualidade que validamos na Copa.
        </Section>

        <Section eyebrow="O roadmap" title="Para onde vamos">
          <ul>
            <li><strong>Todas as ligas em breve</strong> — Top 5 europeias, UCL, Libertadores, Brasileirão e muito mais.</li>
            <li><strong>Todos os principais mercados</strong> disponíveis para análise — 1X2, Over/Under, ambas marcam, escanteios, cartões, handicaps e mercados de jogador.</li>
            <li><strong>Mais dados, mesma régua</strong> — conforme expandimos, cada novo mercado passa pela mesma validação antes de chegar até você.</li>
          </ul>
        </Section>

        {/* Founders — destaque */}
        <section
          style={{
            marginTop: 48,
            padding: 28,
            borderRadius: 16,
            background: 'var(--edge-soft)',
            border: '1px solid oklch(0.88 0.17 125 / 0.45)',
          }}
        >
          <div className="t-eyebrow" style={{ marginBottom: 10 }}>Plano Founders</div>
          <h2 style={{ fontSize: 26, fontWeight: 600, margin: '0 0 10px', letterSpacing: '-0.01em' }}>
            Entrou cedo? As vantagens são <span style={{ color: 'var(--edge)' }}>eternas</span>.
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 20px', maxWidth: 640 }}>
            Os Founders são quem acreditou no projeto no começo — e por isso recebem um lugar que
            ninguém mais terá. Não é uma promoção temporária: é um benefício <strong>para sempre</strong>.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <Benefit icon="🔒" title="Preço travado para sempre">
              O valor de fundador nunca aumenta. Enquanto sua assinatura seguir ativa, você paga o
              preço de hoje — mesmo quando os planos subirem para todo mundo.
            </Benefit>
            <Benefit icon="🌍" title="Tudo que vier, incluído">
              Todas as ligas e todos os mercados que lançarmos entram no seu plano sem custo extra.
              Você cresce junto com a plataforma, de graça.
            </Benefit>
            <Benefit icon="🐐" title="Selo de Founder">
              Reconhecimento permanente de quem construiu o Jonas Goat desde o início.
            </Benefit>
            <Benefit icon="🗣️" title="Voz no roadmap">
              Sugestões de Founders têm prioridade. Você ajuda a decidir o que entra primeiro.
            </Benefit>
          </div>
          <div style={{ marginTop: 24 }}>
            <Link to="/checkout?plan=founders&cycle=lifetime" className="btn btn-edge" style={{ textDecoration: 'none', padding: '12px 22px', fontWeight: 700 }}>
              Quero ser Founder
            </Link>
            <Link to="/precos" className="btn btn-ghost" style={{ textDecoration: 'none', marginLeft: 10 }}>
              Ver todos os planos
            </Link>
          </div>
        </section>

        {/* Sugestões */}
        <SuggestionBox />

        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 40, textAlign: 'center' }}>
          +18 · aposta envolve risco de perda total · previsões probabilísticas, sem garantia de retorno.
        </p>
      </main>
    </div>
  );
}

// ─── Caixa de sugestões (usuário logado) ────────────────────────────────────
function SuggestionBox() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const mine = useQuery({
    queryKey: ['my-suggestions'],
    queryFn: () => api.mySuggestions(),
    enabled: !!user,
  });

  const submit = useMutation({
    mutationFn: () => api.submitSuggestion(message.trim()),
    onSuccess: () => {
      setSent(true);
      setMessage('');
      qc.invalidateQueries({ queryKey: ['my-suggestions'] });
    },
  });

  const tooShort = message.trim().length < 5;

  return (
    <section style={{ marginTop: 48 }}>
      <div className="t-eyebrow" style={{ marginBottom: 10 }}>Ajude a construir</div>
      <h2 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
        O que você gostaria de ver?
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 18px', maxWidth: 620 }}>
        Conte como podemos melhorar a plataforma — uma liga, um mercado, um recurso. Lemos tudo, e
        as ideias guiam o que entra primeiro.
      </p>

      {!user ? (
        <div className="surface" style={{ padding: 20, fontSize: 14, color: 'var(--text-2)' }}>
          <Link to="/login" style={{ color: 'var(--edge)' }}>Entre na sua conta</Link> para enviar uma sugestão.
        </div>
      ) : (
        <form
          className="surface"
          style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
          onSubmit={(e) => { e.preventDefault(); if (!tooShort) submit.mutate(); }}
        >
          <textarea
            className="input"
            value={message}
            onChange={(e) => { setMessage(e.target.value); setSent(false); }}
            placeholder="Ex.: queria ver a Libertadores e o mercado de escanteios…"
            maxLength={2000}
            rows={4}
            style={{ resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-edge btn-sm" disabled={submit.isPending || tooShort}>
              {submit.isPending ? 'Enviando…' : 'Enviar sugestão'}
            </button>
            {sent && <span style={{ fontSize: 12, color: 'var(--win)' }}>Recebido! Obrigado pela ideia. 🙌</span>}
            {submit.isError && <span style={{ fontSize: 12, color: 'var(--loss)' }}>{(submit.error as Error).message}</span>}
          </div>

          {mine.data && mine.data.length > 0 && (
            <div style={{ marginTop: 8, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <div className="t-eyebrow" style={{ marginBottom: 8 }}>Suas sugestões</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {mine.data.slice(0, 5).map((s) => (
                  <div key={s.id} style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', gap: 8 }}>
                    <span aria-hidden style={{ color: 'var(--edge)' }}>•</span>
                    <span style={{ flex: 1 }}>{s.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      )}
    </section>
  );
}

function Section({ eyebrow, title, children }: Readonly<{ eyebrow: string; title: string; children: React.ReactNode }>) {
  return (
    <section style={{ marginTop: 40 }}>
      <div className="t-eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div>
      <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 12px' }}>{title}</h2>
      <div style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.7 }} className="terms-prose">
        {children}
      </div>
    </section>
  );
}

function Benefit({ icon, title, children }: Readonly<{ icon: string; title: string; children: React.ReactNode }>) {
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 22, marginBottom: 8 }} aria-hidden>{icon}</div>
      <strong style={{ fontSize: 14, display: 'block', marginBottom: 6 }}>{title}</strong>
      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>{children}</p>
    </div>
  );
}
