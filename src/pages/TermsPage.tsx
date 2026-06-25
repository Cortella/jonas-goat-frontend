import { Link } from 'react-router-dom';
import { Logo } from '../components/atoms';
import { Seo } from '../components/Seo';

export function TermsPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Seo
        title="Termos de Uso"
        description="Termos de uso e política de responsabilidade do Jonas Goat — uma plataforma de informação e análise estatística que NÃO opera apostas dentro do site."
        path="/termos"
      />

      {/* Top bar simples */}
      <div
        style={{
          padding: '18px 48px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Logo size={20} />
        </Link>
        <div style={{ flex: 1 }} />
        <Link to="/" style={{ fontSize: 13, color: 'var(--text-2)' }}>
          ← Voltar
        </Link>
      </div>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 32px 96px' }}>
        <div className="t-eyebrow" style={{ marginBottom: 12 }}>Documento legal</div>
        <h1 style={{ fontSize: 36, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 8 }}>
          Termos de Uso
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 32 }}>
          Última atualização: maio de 2026 · documento em português brasileiro.
        </p>

        <div
          style={{
            padding: 20,
            background: 'oklch(0.82 0.15 80 / 0.06)',
            border: '1px solid oklch(0.82 0.15 80 / 0.3)',
            borderRadius: 12,
            marginBottom: 32,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: 'var(--warn)' }}>Aviso importante.</strong> O Jonas Goat é uma
          <strong> plataforma de informação e análise estatística</strong>. Não somos uma casa de
          apostas, não aceitamos depósitos, não processamos saques e não realizamos qualquer
          aposta dentro deste site. Apenas indicamos oportunidades matemáticas no mercado,
          comparando nossas probabilidades com as odds publicadas por bookmakers regulamentados.
          Toda decisão de apostar é responsabilidade exclusiva do usuário, em casas externas.
        </div>

        <Section title="1. Sobre a plataforma">
          O Jonas Goat (&quot;nós&quot;, &quot;plataforma&quot;) é um produto digital de assinatura
          que oferece <strong>análises probabilísticas</strong> e <strong>comparações de odds</strong>{' '}
          de bookmakers para partidas de futebol das principais ligas internacionais. Nossas
          previsões são geradas por modelos estatísticos (Dixon-Coles, ELO, regressão Bayesiana) e
          combinadas em um ensemble.
        </Section>

        <Section title="2. O que NÃO fazemos">
          <ul>
            <li>Não recebemos depósitos, não custodiamos dinheiro de usuários.</li>
            <li>Não processamos apostas — qualquer aposta acontece em casas externas.</li>
            <li>
              Não somos afiliados a bookmakers; não recebemos comissão por apostas. Nossa única
              fonte de receita é a assinatura paga pelos usuários da plataforma.
            </li>
            <li>Não garantimos lucro. Quem promete lucro garantido em apostas está mentindo.</li>
          </ul>
        </Section>

        <Section title="3. Limitação de responsabilidade">
          As previsões oferecidas são <strong>probabilísticas</strong> e baseadas em dados
          históricos. <strong>Erros são esperados</strong>. Em qualquer cenário envolvendo apostas
          esportivas, existe risco de perda total do valor apostado.
          <br />
          <br />
          Ao usar a plataforma, você reconhece que:
          <ul>
            <li>EV positivo se realiza no longo prazo (≥ 500 apostas), nunca em sequências curtas.</li>
            <li>Resultados passados não garantem resultados futuros.</li>
            <li>
              Você é o único responsável pelas decisões de apostar, pelo valor apostado e pela
              gestão do seu bankroll.
            </li>
            <li>
              A plataforma não tem qualquer responsabilidade por perdas financeiras decorrentes
              do uso das informações aqui disponibilizadas.
            </li>
          </ul>
        </Section>

        <Section title="4. Jogo responsável">
          Jogos com apostas envolvem risco de perda e podem desencadear comportamento compulsivo.
          Recomendamos:
          <ul>
            <li>Apostar somente o que você está disposto a perder.</li>
            <li>Não usar dinheiro de poupança, salário, aluguel ou empréstimos.</li>
            <li>Definir um teto mensal de gastos com apostas.</li>
            <li>Buscar ajuda em caso de perda de controle.</li>
          </ul>
          <p style={{ marginTop: 12 }}>
            Em caso de necessidade, procure os serviços de apoio:{' '}
            <a
              href="https://www.jogadoresanonimos.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--edge)' }}
            >
              Jogadores Anônimos Brasil
            </a>
            . Apenas usuários com 18 anos ou mais podem utilizar a plataforma.
          </p>
        </Section>

        <Section title="5. Conta de usuário">
          Você é responsável pela confidencialidade da sua senha. Notifique-nos imediatamente em
          caso de uso não autorizado. Reservamo-nos o direito de suspender contas que violem estes
          termos ou usem o serviço para fins ilegais.
        </Section>

        <Section title="6. Programa de afiliados">
          Usuários podem convidar outras pessoas via link de afiliado. O afiliado recebe uma
          comissão sobre cada cobrança paga pelo convidado, conforme a porcentagem configurada na
          plataforma. O programa é <strong>de nível único</strong>: o afiliado ganha apenas pelas
          cobranças do convidado direto, não dos convidados do convidado. O pagamento da comissão
          é executado pelo gateway externo de pagamento; a plataforma apenas registra o ledger e
          informa quando ele está pendente ou pago.
        </Section>

        <Section title="7. Assinatura, pagamentos e reembolso">
          A assinatura é cobrada de forma recorrente (mensal ou anual) ou em pagamento único
          (vitalício). O pagamento é processado por gateway externo (Stripe/Pix). Você pode
          cancelar a qualquer momento; o acesso permanece até o fim do período pago.
          Reembolso integral está disponível nos primeiros 7 dias após a primeira cobrança.
        </Section>

        <Section title="8. Privacidade">
          Coletamos apenas o necessário para operar a plataforma: email, nome (opcional), histórico
          de apostas registradas pelo próprio usuário, preferências e dados de afiliação. Não
          vendemos dados a terceiros. Detalhes completos serão publicados em página de privacidade
          dedicada.
        </Section>

        <Section title="9. Propriedade intelectual">
          Os modelos estatísticos, os dados agregados e o software da plataforma são de propriedade
          do Jonas Goat. É proibida a redistribuição, scraping automatizado ou revenda de
          informações aqui disponibilizadas sem autorização escrita.
        </Section>

        <Section title="10. Conformidade legal (Brasil)">
          A plataforma opera em conformidade com a Lei nº 14.790/2023, que regulamenta apostas de
          quota fixa no Brasil. Reforçamos: <strong>nós não operamos apostas</strong>. Bookmakers
          licenciados pela SPA / Ministério da Fazenda são quem opera apostas — somos um produto
          de informação, paralelo, sem qualquer relação operacional com casas de apostas.
        </Section>

        <Section title="11. Alterações dos termos">
          Podemos atualizar estes termos a qualquer momento. Mudanças relevantes são comunicadas
          via notificação in-app e email. O uso continuado após a alteração implica aceitação dos
          novos termos.
        </Section>

        <Section title="12. Contato">
          Dúvidas, reclamações e solicitações de privacidade:{' '}
          <a href="mailto:contato@jonasgoat.com" style={{ color: 'var(--edge)' }}>
            contato@jonasgoat.com
          </a>
          .
        </Section>

        <div
          style={{
            marginTop: 48,
            padding: 16,
            background: 'var(--bg-2)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--muted)',
            textAlign: 'center',
          }}
        >
          +18 · jogue com responsabilidade · aposta envolve risco de perda total ·{' '}
          <a
            href="https://www.jogadoresanonimos.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'underline' }}
          >
            Jogadores Anônimos
          </a>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          marginBottom: 12,
        }}
      >
        {title}
      </h2>
      <div
        style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}
        className="terms-prose"
      >
        {children}
      </div>
    </section>
  );
}
