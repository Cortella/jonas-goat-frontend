/**
 * Lista de versões e features. A página /atualizacoes consome isso.
 *
 * Convenção SemVer: major.minor.patch.
 *  - patch  → bug fix invisível pra UX
 *  - minor  → feature ou melhoria que vale anunciar
 *  - major  → quebra de compatibilidade ou redesign profundo
 *
 * Adicione versões NOVAS no topo. A lista é renderizada na ordem em que vier.
 */

export interface PatchChange {
  kind: 'feature' | 'improvement' | 'fix' | 'security';
  text: string;
}

export interface PatchEntry {
  version: string;
  date: string;          // YYYY-MM-DD
  title: string;
  highlight?: string;    // 1 linha de destaque pro card resumido
  changes: PatchChange[];
}

export const CHANGELOG: PatchEntry[] = [
  {
    version: '1.6.0',
    date: '2026-05-10',
    title: 'Painel financeiro, chat estilo WhatsApp e bandeirinhas no log',
    highlight: 'Admin agora vê todas as entradas/saídas, exporta em CSV/Excel/PDF e o chat ficou bem mais bonito.',
    changes: [
      { kind: 'feature', text: 'Painel financeiro do admin com receitas, despesas, lançamentos manuais e export CSV / Excel / PDF.' },
      { kind: 'feature', text: 'Chat de suporte com gravação de áudio direto do navegador e seletor de emoji estilo WhatsApp.' },
      { kind: 'feature', text: 'Admin pode iniciar conversa de suporte com qualquer usuário, sem ele precisar abrir ticket.' },
      { kind: 'improvement', text: 'Menu do usuário virou um dropdown moderno no canto superior direito com Bankroll, Suporte, Alterar dados e Sair.' },
      { kind: 'feature', text: 'Logs de acesso e atividade mostram país de origem do IP com bandeirinha.' },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-05-09',
    title: 'Defesa em camadas e auditoria',
    highlight: 'Rate limit, detecção de brute force e log de atividades em PT pra auditoria.',
    changes: [
      { kind: 'security', text: 'Rate limit por IP em endpoints sensíveis (login, signup, mensagens de suporte) com retry-after.' },
      { kind: 'security', text: 'Detecção de brute force, signup burst e anexos com payload de script.' },
      { kind: 'security', text: 'Cabeçalhos de segurança globais (X-Frame-Options, Referrer-Policy, HSTS sob TLS).' },
      { kind: 'feature', text: 'Painel /admin/atividade com auditoria estruturada — toda mutação sensível vira linha legível em PT.' },
      { kind: 'feature', text: 'Painel /admin/seguranca com stats 24h, editor de thresholds e timeline de eventos.' },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-05-09',
    title: 'Suporte e atendimento',
    highlight: 'Sistema de tickets com chat ao vivo, áudio/imagem/documento e pesquisa de satisfação.',
    changes: [
      { kind: 'feature', text: 'Tickets de suporte com chat por polling 5s entre usuário e admin.' },
      { kind: 'feature', text: 'Anexos com whitelist estrita de MIME (anti-SVG, anti-HTML, anti-EXE) e sniff de magic bytes.' },
      { kind: 'feature', text: 'Balão de chat flutuante no canto inferior direito enquanto o ticket está aberto.' },
      { kind: 'feature', text: 'Janelas de chat estilo Facebook no painel do admin (até 3 simultâneas, minimizáveis).' },
      { kind: 'feature', text: 'Pesquisa de satisfação 1–5 com emoji ao fechar o ticket.' },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-05-09',
    title: 'Foco Copa 2026',
    highlight: 'A competição agora abre o menu, com página de análise ao vivo e mais mercados explorados.',
    changes: [
      { kind: 'feature', text: 'Copa 2026 vira o primeiro item da nav com badge e troféu.' },
      { kind: 'feature', text: 'Página /partida-ao-vivo/:id com calls do modelo durante a partida (shift, value, momentum, snapshot).' },
      { kind: 'feature', text: 'Modo simulação para pilotar minuto/placar até o feed in-play estar online.' },
      { kind: 'improvement', text: 'Catálogo de mercados expandido na página da partida: Over 1.5/3.5, dupla chance, handicap asiático, escanteios, cartões, jogadores e mais.' },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-05-09',
    title: 'Cadastro completo (Lei 14.790/23)',
    highlight: 'Conformidade legal com CPF, endereço, plataformas de aposta e termos obrigatórios.',
    changes: [
      { kind: 'feature', text: 'Cadastro completo com nome, CPF (validado por mod 11), data de nascimento (≥18) e endereço completo.' },
      { kind: 'feature', text: 'Multi-select de plataformas de aposta usadas pelo usuário.' },
      { kind: 'feature', text: 'Aceite explícito dos termos de uso com versão registrada por usuário.' },
      { kind: 'feature', text: 'Foto de identidade opcional via upload anti-script.' },
      { kind: 'improvement', text: 'Preenchimento automático do endereço pelo CEP via ViaCEP.' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-05-08',
    title: 'Painel admin, afiliados e notificações',
    highlight: 'Sidebar admin com métricas de acesso, afiliados de nível único e notificações in-app.',
    changes: [
      { kind: 'feature', text: 'Painel admin com sidebar lateral, stats e dashboard.' },
      { kind: 'feature', text: 'Programa de afiliados de nível único com comissão por convidado direto.' },
      { kind: 'feature', text: 'Notificações in-app via polling (1h) com prioridade urgente.' },
      { kind: 'feature', text: 'Cupom de desconto para convidado + comissão pro afiliado.' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-05-07',
    title: 'Lançamento — previsões com modelos reais',
    highlight: 'Ensemble Dixon-Coles + Elo + Bayesiano em produção.',
    changes: [
      { kind: 'feature', text: 'Previsões de probabilidade 1X2 baseadas em modelos estatísticos reais.' },
      { kind: 'feature', text: 'Comparador de odds entre 7 bookmakers.' },
      { kind: 'feature', text: 'Página de transparência com performance histórica.' },
      { kind: 'feature', text: 'Bankroll com gestão Kelly e histórico de apostas.' },
    ],
  },
];

export const CURRENT_VERSION = CHANGELOG[0].version;
