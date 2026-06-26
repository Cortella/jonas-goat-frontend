import type {
  PredictionsResponse,
  Prediction,
  SystemStatus,
  PerformanceResults,
  HistoryItem,
} from './types';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

const TOKEN_KEY = 'jg-token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const tok = getToken();
  if (tok && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${tok}`);

  const res = await fetch(`${BASE}${path}`, { ...init, headers, credentials: 'include' });

  if (res.status === 204) return undefined as T;
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const msg =
      (body && typeof body === 'object' && 'detail' in body && typeof (body as { detail: unknown }).detail === 'string'
        ? (body as { detail: string }).detail
        : null) || `${res.status} ${res.statusText}`;
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return body as T;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) });
const put = <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });

// ─── Domain types only used by the API layer ─────────────────────────────
export type Plan = 'free' | 'pro' | 'founders';
export type SubStatus = 'active' | 'cancelled' | 'expired' | 'trialing';
export type BillingCycle = 'monthly' | 'yearly' | 'lifetime';

export interface User {
  id: number;
  email: string;
  name: string | null;
  plan: Plan;
  is_admin: boolean;
  affiliate_code: string;
  affiliated_by: number | null;
  affiliate_pct_override: number | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  cpf: string | null;
  birth_date: string | null;
  full_name: string | null;
  country: string | null;
  address_zipcode: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  terms_accepted_at: string | null;
  terms_version: string | null;
  id_image_path: string | null;
  email_confirmed: boolean;
  created_at: string;
}

export interface SignupBody {
  email: string;
  password: string;
  name?: string;
  full_name: string;
  country?: string;
  cpf: string;
  birth_date: string;
  platforms?: string[];
  terms_accepted: true;
  referralCode?: string;
}

export interface ProfilePatch {
  name?: string | null;
  bio?: string | null;
  phone?: string | null;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export type CommissionStatus = 'pending' | 'paid' | 'cancelled';

export interface AffiliateCommission {
  id: number;
  beneficiary_user_id: number;
  beneficiary_email: string;
  beneficiary_name: string | null;
  subscription_id: number | null;
  base_amount_brl: number;
  pct_used: number;
  amount_brl: number;
  status: CommissionStatus;
  created_at: string;
  paid_at: string | null;
}

export interface AffiliateMe {
  enabled: boolean;
  affiliate_code: string;
  link_path: string;
  default_pct: number;
  my_pct: number;
  has_override: boolean;
  sponsor: { id: number; email: string; name: string | null; code: string } | null;
  invited_count: number;
  invited: Array<{
    id: number;
    email: string;
    name: string | null;
    plan: Plan;
    created_at: string;
    active_amount: number | null;
    active_billing: BillingCycle | null;
  }>;
  total_earned_brl: number;
  total_pending_brl: number;
  recent_commissions: AffiliateCommission[];
}

export interface AdminCommission extends AffiliateCommission {
  affiliate_user_id: number;
  affiliate_email: string;
  affiliate_name: string | null;
  notes: string | null;
}

export interface AppSettings {
  default_affiliate_pct: number;
  affiliate_program_enabled: boolean;
  referral_discount_pct: number;
  pix_recurring_discount_pct: number;
  prediction_unlock_cost_brl: number;
  credit_packages: CreditPackage[];
}

export interface PublicSettings {
  affiliate_program_enabled: boolean;
  default_affiliate_pct: number;
  referral_discount_pct: number;
}

export interface ReferralLookup {
  sponsor: { name: string | null; display: string } | null;
}

// ─── Checkout / pagamentos ──────────────────────────────────────────────
export type PaymentMethod = 'pix' | 'pix_recurring' | 'card';
export type OrderKind = 'plan' | 'credits';
export type OrderStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export interface CreditPackage {
  id: string;
  price_brl: number;
  bonus_brl: number;
}

export interface CheckoutConfig {
  plans: Array<{ plan: Plan; cycles: Array<{ cycle: BillingCycle; price_brl: number }> }>;
  prices: Record<string, { monthly: number; yearly?: number; lifetime?: number }>;
  currency: string;
  currency_symbol: string;
  payment_methods: PaymentMethod[];
  pix_recurring_discount_pct: number;
  referral_discount_pct: number;
  referral_eligible: boolean;
  credit_packages: CreditPackage[];
  prediction_unlock_cost_brl: number;
  wallet_balance_brl: number;
  identity: { has_cpf: boolean; cpf_masked: string | null };
  gateway: string;
}

export interface Order {
  id: number;
  kind: OrderKind;
  plan: Plan | null;
  billing_cycle: BillingCycle | null;
  payment_method: PaymentMethod;
  status: OrderStatus;
  base_amount_brl: number;
  discount_brl: number;
  wallet_applied_brl: number;
  amount_brl: number;
  credits_amount_brl: number | null;
  discount_reason: string | null;
  gateway_ref: string | null;
  pix_qr_code: string | null;
  pix_qr_image: string | null;
  pix_expires_at: string | null;
  checkout_url: string | null;
  subscription_id: number | null;
  created_at: string;
  paid_at: string | null;
}

export interface CreateOrderBody {
  kind: OrderKind;
  plan?: Plan;
  billing_cycle?: BillingCycle;
  package_id?: string;
  payment_method: PaymentMethod;
  document_number: string;
  use_wallet?: boolean;
  card?: { token?: string; holder?: string; last4?: string };
}

export interface CreditTransaction {
  id: number;
  kind: 'topup' | 'spend' | 'refund' | 'adjust';
  amount_brl: number;
  balance_after: number;
  reason: string | null;
  ref_type: string | null;
  ref_id: string | null;
  created_at: string;
}

export interface CreditsMe {
  balance_brl: number;
  unlock_cost_brl: number;
  transactions: CreditTransaction[];
}

export interface PredictionAccess {
  match_id: number;
  has_access: boolean;
  included_in_plan: boolean;
  unlocked: boolean;
  cost_brl: number;
  balance_brl: number;
}

export interface AdminOrder extends Order {
  user_id: number;
  user_email: string | null;
  user_name: string | null;
  document_number: string | null;
  gateway: string | null;
}

export interface AdminOrdersResponse {
  stats: {
    paid_count: number;
    paid_total_brl: number;
    pending_count: number;
    credits_issued_brl: number;
  };
  orders: AdminOrder[];
}

export interface AdminOrderDetail extends AdminOrder {
  events: Array<{ id: number; event_type: string; received_at: string }>;
}

export interface AdminCreditsResponse {
  total_outstanding_brl: number;
  wallets_with_balance: number;
  wallets: Array<{ user_id: number; email: string; name: string | null; balance_brl: number; updated_at: string }>;
  recent_transactions: Array<{
    id: number;
    user_id: number;
    email: string;
    kind: string;
    amount_brl: number;
    balance_after: number;
    reason: string | null;
    created_at: string;
  }>;
}

// ─── Notifications ────────────────────────────────────────────────────────
export type NotificationPriority = 'normal' | 'urgent';
export type NotificationSource = 'admin' | 'commit' | 'system';

export interface AppNotification {
  id: number;
  title: string;
  body: string;
  priority: NotificationPriority;
  source: NotificationSource;
  target_user_id: number | null;
  commit_hash: string | null;
  topics: string[];
  created_by: number | null;
  created_at: string;
  read_at: string | null;
  is_read: boolean;
}

export interface NotificationsFeed {
  unread_count: number;
  notifications: AppNotification[];
}

export interface AdminNotification extends AppNotification {
  read_count: number;
  total_target: number;
}

export interface SendNotificationBody {
  title: string;
  body: string;
  priority?: NotificationPriority;
  target_user_id?: number | null;
  topics?: string[];
}

// ─── Access logs (admin) ──────────────────────────────────────────────────
export type AccessAction = 'signup' | 'login' | 'logout';

export interface AccessLog {
  id: number;
  user_id: number | null;
  action: AccessAction;
  email: string | null;
  ip: string | null;
  user_agent: string | null;
  referer: string | null;
  country_code: string | null;
  created_at: string;
  user_name: string | null;
}

// ─── Finance (admin) ──────────────────────────────────────────────────
export type FinanceKind = 'income' | 'expense';
export type FinanceSource = 'subscription' | 'commission' | 'manual' | 'credits';
export type FinanceCategory = 'gateway' | 'infra' | 'refund' | 'marketing' | 'tax' | 'other';

export interface FinanceLine {
  source: FinanceSource;
  kind: FinanceKind;
  ref_id: number;
  category: string;
  description: string;
  amount_brl: number;
  occurred_at: string;
}

export interface FinanceResponse {
  stats: { income_brl: number; expense_brl: number; net_brl: number; count: number };
  lines: FinanceLine[];
}

export interface FinanceEntryBody {
  kind: FinanceKind;
  category: FinanceCategory;
  description: string;
  amount_brl: number;
  occurred_at: string;
  notes?: string | null;
}

export interface FinanceFilters {
  from?: string; to?: string;
  kind?: FinanceKind; source?: FinanceSource;
}

// ─── Security ──────────────────────────────────────────────────────────
export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';
export type SecurityKind = 'rate_limited' | 'brute_force' | 'suspicious_signup' | 'failed_login_burst' | 'attachment_blocked' | 'admin_action_alert';

export interface SecurityEvent {
  id: number;
  kind: SecurityKind;
  severity: SecuritySeverity;
  ip: string | null;
  user_id: number | null;
  target: string | null;
  summary: string;
  details: unknown;
  created_at: string;
  resolved_at: string | null;
  resolved_by: number | null;
}

export interface SecurityConfig {
  rate_limits: {
    auth_login_per_min: number;
    auth_signup_per_hour: number;
    support_msg_per_min: number;
    global_per_min: number;
  };
  detect: {
    brute_force_window_min: number;
    brute_force_threshold: number;
  };
  alerts: {
    notify_admins_on_critical: boolean;
  };
}

export interface SecurityResponse {
  events: SecurityEvent[];
  stats: {
    last_24h: { total: number; critical: number; high: number; medium: number; low: number };
    by_kind_7d: Array<{ kind: string; n: number }>;
    unresolved: number;
  };
  config: SecurityConfig;
}

export interface SecurityConfigPatch {
  rate_limit?: Partial<SecurityConfig['rate_limits']>;
  detect?: Partial<SecurityConfig['detect']>;
  alerts?: Partial<SecurityConfig['alerts']>;
}

export type ActorRole = 'user' | 'admin' | 'system';

export interface ActivityLog {
  id: number;
  user_id: number | null;
  actor_role: ActorRole;
  action_key: string;
  description: string;
  entity_type: string | null;
  entity_id: number | null;
  metadata: unknown;
  ip: string | null;
  user_agent: string | null;
  country_code: string | null;
  created_at: string;
  user_email: string | null;
  user_name: string | null;
}

export interface ActivityLogResponse {
  stats: {
    last_24h_total: number;
    last_24h_users: number;
    last_24h_admins: number;
  };
  top_actions_7d: Array<{ action: string; n: number }>;
  logs: ActivityLog[];
}

export interface AccessLogsResponse {
  stats: {
    last_24h_signups: number;
    last_24h_logins: number;
    last_24h_unique_users: number;
  };
  timeline: Array<{ day: string; action: AccessAction; n: number }>;
  logs: AccessLog[];
}

export interface Preferences {
  leagues: string[];
  bookmakers: string[];
  risk_profile: 'conservative' | 'balanced' | 'aggressive' | 'custom';
  min_ev_pct: number;
  bankroll_initial: number;
  bankroll_current: number;
  onboarded: boolean;
  suggestions_enabled: boolean;
}

export interface GameSuggestion {
  match_id: number;
  home_team: string;
  away_team: string;
  league: string;
  kickoff: string | null;
  market: string | null;
  ev: number;
  odds: number | null;
  confidence: string;
}

export interface SuggestionsResponse {
  enabled: boolean;
  suggestions: GameSuggestion[];
}

export interface AlertRule {
  id: number;
  name: string;
  status: 'on' | 'paused' | 'draft';
  min_ev_pct: number;
  leagues: string[];
  markets: string[];
  channels: string[];
  sent_count: number;
  hit_count: number;
  created_at: string;
}

export interface AlertChannel {
  id: number;
  kind: 'telegram' | 'email' | 'discord' | 'push';
  handle: string;
  enabled: boolean;
  created_at: string;
}

export interface BankrollWallet {
  id: number;
  name: string;
  bankroll_initial: number;
  bankroll_current: number;
  open_bets?: number;
  created_at: string;
}

export interface Bet {
  id: number;
  wallet_id: number | null;
  wallet_name?: string | null;
  match_id: number | null;
  league: string | null;
  home_team: string | null;
  away_team: string | null;
  market: string;
  bookmaker: string | null;
  odd: number;
  stake: number;
  expected_value: number | null;
  kelly_fraction: number | null;
  placed_at: string;
  settled_at: string | null;
  result: 'win' | 'loss' | 'push' | null;
  payout: number | null;
  notes: string | null;
}

export interface BankrollSummary {
  bankroll_initial: number;
  bankroll_current: number;
  total_bets: number;
  settled: number;
  open: number;
  wins: number;
  losses: number;
  pushes: number;
  total_staked: number;
  total_payout: number;
  roi: number;
}

export interface BankrollEntry {
  id: number;
  kind: 'deposit' | 'withdraw' | 'adjust';
  amount: number;
  balance_after: number;
  note: string | null;
  wallet_name?: string | null;
  created_at: string;
}

// ─── Support tickets ──────────────────────────────────────────────────────
export type TicketCategory = 'billing' | 'account' | 'technical' | 'feature' | 'other';
export type TicketStatus = 'open' | 'waiting_user' | 'resolved' | 'closed';
export type SenderRole = 'user' | 'admin' | 'system';

export interface SupportTicket {
  id: number;
  user_id: number;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  last_message_at: string;
  created_at: string;
  closed_at: string | null;
  user_email?: string | null;
  user_name?: string | null;
  unread_count?: number;
  message_count?: number;
  has_survey?: boolean;
}

export interface SupportMessage {
  id: number;
  ticket_id: number;
  sender_user_id: number | null;
  sender_role: SenderRole;
  body: string;
  attachment_path: string | null;
  attachment_mime: string | null;
  attachment_filename: string | null;
  attachment_size: number | null;
  read_by_user_at: string | null;
  read_by_admin_at: string | null;
  created_at: string;
}

export interface SupportAttachmentInput {
  data_url: string;
  filename?: string | null;
}

export interface CreateTicketBody {
  subject: string;
  category: TicketCategory;
  body: string;
  attachment?: SupportAttachmentInput;
}

export interface SendMessageBody {
  body: string;
  attachment?: SupportAttachmentInput;
}

export interface ActiveTicketResp {
  active: Pick<SupportTicket, 'id' | 'subject' | 'status' | 'last_message_at' | 'unread_count'> | null;
}

export interface TicketDetail {
  ticket: SupportTicket;
  messages: SupportMessage[];
}

export interface AdminTicketDetail extends TicketDetail {
  survey: { score: number; comment: string | null; created_at: string } | null;
}

export type LiveCallKind = 'value' | 'shift' | 'risk' | 'momentum';

export interface LiveCall {
  id: string;
  minute: number;
  kind: LiveCallKind;
  market: string;
  message: string;
  odds_hint: number | null;
  emitted_at: string;
}

export interface LiveState {
  match_id: number;
  home_team: string;
  away_team: string;
  league: string;
  minute: number;
  home_goals: number;
  away_goals: number;
  status: 'pre' | 'live' | 'ht' | 'ft';
  pre: {
    prob_home: number;
    prob_draw: number;
    prob_away: number;
    over_2_5: number | null;
    btts_yes: number | null;
  };
  now: {
    prob_home: number;
    prob_draw: number;
    prob_away: number;
    next_goal_home: number;
    next_goal_away: number;
    no_more_goals: number;
    over_2_5: number;
    btts_yes: number;
  };
  calls: LiveCall[];
}

export interface WCOutlook {
  tournament: string;
  dates: { start: string; end: string };
  host_countries: string[];
  n_teams: number;
  n_matches_modeled: number;
  winner_probs: Array<{ code: string; team: string; champion_pct: number; semi_pct: number; elo: number }>;
  groups: Record<string, Array<{ code: string; team: string; first: number; second: number; third: number; out: number; expected_pts: number }>>;
}

// ─── Copa do Mundo — jogos reais por grupo + análise (API-Football) ───────
export interface WCStanding {
  rank: number;
  team_id: number;
  team: string;
  logo: string;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
  form: string | null;
  eliminated?: boolean;
}
export interface WCMatchTeam {
  id: number;
  name: string;
  logo: string;
  goals: number | null;
}
export type WCPhase = 'upcoming' | 'live' | 'finished';
export interface WCMatch {
  id: number;
  date: string;
  timestamp: number;
  round: string;
  group: string | null;
  status: { short: string; long: string; elapsed: number | null; phase: WCPhase };
  home: WCMatchTeam;
  away: WCMatchTeam;
  venue: { name: string | null; city: string | null };
}
export interface WCGroup {
  group: string;
  standings: WCStanding[];
  matches: WCMatch[];
}
export interface WCKnockoutRound {
  round: string;
  matches: WCMatch[];
}
export interface WCMatches {
  tournament: string;
  season: number;
  updated_at: string;
  has_data: boolean;
  counts: { total: number; finished: number; live: number; upcoming: number };
  groups: WCGroup[];
  knockout: WCKnockoutRound[];
}
export interface WCTeamForm {
  played: number;
  gf: number;
  ga: number;
  points: number;
  goalsDiff: number;
  form: string | null;
  rank: number | null;
  fair_odds: number | null;
}
export interface WCAnalysis {
  match: WCMatch;
  /** true quando o usuário (grátis/anônimo) não tem acesso — valores embaçados. */
  locked?: boolean;
  probs: { home: number; draw: number; away: number };
  expected_goals: { home: number; away: number };
  likely_score: string;
  markets: {
    over_0_5: number;
    over_1_5: number;
    over_2_5: number;
    over_3_5: number;
    under_1_5: number;
    under_2_5: number;
    under_3_5: number;
    btts_yes: number;
    btts_no: number;
    dc_1x: number;
    dc_12: number;
    dc_x2: number;
  };
  strength: { home: WCTeamForm; away: WCTeamForm };
  h2h: {
    total: number;
    home_wins: number;
    away_wins: number;
    draws: number;
    last: Array<{ date: string; home: string; away: string; score: string }>;
  };
  top_pick: { market: string; p: number };
  narrative: string;
}

export interface WCCountry {
  id: number;
  name: string;
  logo: string;
  code: string | null;
  slug: string | null;
  is_origin: boolean;
  eliminated: boolean;
}

export interface SelecaoLive {
  logo: string | null;
  group: string | null;
  eliminated: boolean;
  standing: WCStanding | null;
  matches: WCMatch[];
}
export interface Selecao {
  slug: string;
  nome: string;
  nome_en: string;
  has_content: boolean;
  meta: Record<string, unknown> | null;
  body: string | null;
  live: SelecaoLive | null;
}
export interface WCCountries {
  origin_code: string | null;
  origin_in_cup: boolean;
  countries: WCCountry[];
}

// ─── Preços multimoeda ────────────────────────────────────────────────────
export interface PublicPricing {
  detected_currency: string;
  currency: string;
  prices: { currency: string; symbol: string; label: string | null; monthly: number; yearly: number | null; lifetime: number | null };
  plans: { pro_monthly: number; pro_yearly: number; founders: number };
  currencies: Array<{ currency: string; symbol: string; label: string | null }>;
}
export interface CurrencyPriceRow {
  currency: string;
  symbol: string;
  label: string | null;
  monthly: number;
  yearly: number | null;
  lifetime: number | null;
  enabled: boolean;
  updated_at?: string;
}
export interface CurrencyPriceInput {
  symbol: string;
  label?: string | null;
  monthly: number;
  yearly?: number | null;
  lifetime?: number | null;
  enabled?: boolean;
}

// ─── Reviews / avaliações ──────────────────────────────────────────────────
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface PublicReview {
  id: number;
  rating: number;
  comment: string;
  author: string;
  avatar_url: string | null;
  created_at: string;
}

export interface ReviewsResponse {
  count: number;
  average: number | null;
  reviews: PublicReview[];
}

export interface OwnReview {
  id: number;
  rating: number;
  comment: string;
  status: ReviewStatus;
  created_at: string;
}

export interface AdminReview {
  id: number;
  rating: number;
  comment: string;
  status: ReviewStatus;
  created_at: string;
  author: string;
  email: string;
  avatar_url: string | null;
}

// ─── Sugestões / feedback dos usuários ──────────────────────────────────────
export type SuggestionStatus = 'new' | 'reviewed' | 'archived';

export interface OwnSuggestion {
  id: number;
  message: string;
  status: SuggestionStatus;
  created_at: string;
}

export interface AdminSuggestion {
  id: number;
  message: string;
  status: SuggestionStatus;
  created_at: string;
  email: string;
  plan: Plan;
  author: string;
  bankroll_brl: number | null;
  subscription_days: number | null;
}

export interface GoogleOnboardNeeded {
  needs_onboarding: true;
  email: string;
  name: string | null;
  pending: string;
}

// ─── API surface ──────────────────────────────────────────────────────────
export const api = {
  status: () => get<SystemStatus>('/api/status'),
  predictions: (params: { date?: string; league?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.date) q.set('date', params.date);
    if (params.league) q.set('league', params.league);
    const qs = q.toString();
    const suffix = qs ? '?' + qs : '';
    return get<PredictionsResponse>(`/api/predictions${suffix}`);
  },
  prediction: (matchId: number) => get<Prediction>(`/api/predictions/${matchId}`),
  performance: () => get<PerformanceResults>('/api/performance'),
  history: (days = 30) =>
    get<{ days: number; history: HistoryItem[]; error?: string }>(`/api/history?days=${days}`),

  // auth
  signup: (body: SignupBody) => post<AuthResponse>('/api/auth/signup', body),
  login: (body: { email: string; password: string }) => post<AuthResponse>('/api/auth/login', body),
  logout: () => post<{ ok: boolean }>('/api/auth/logout', {}),
  googleAuth: (credential: string) =>
    post<AuthResponse | GoogleOnboardNeeded>('/api/auth/google', { credential }),
  googleComplete: (body: { pending: string; full_name: string; cpf: string; birth_date: string; country?: string | null; terms_accepted: true }) =>
    post<AuthResponse>('/api/auth/google/complete', body),
  me: async () => {
    // O backend reemite o token a cada /me (sessão deslizante) — guardamos o
    // novo para o Bearer do localStorage também nunca expirar.
    const u = await get<User & { token?: string }>('/api/auth/me');
    if (u.token) setToken(u.token);
    return u as User;
  },
  patchMe: (body: ProfilePatch) =>
    request<User>('/api/auth/me', { method: 'PATCH', body: JSON.stringify(body) }),
  uploadAvatar: (dataUrl: string) =>
    post<User>('/api/auth/avatar', { data_url: dataUrl }),
  deleteAvatar: () => del<User>('/api/auth/avatar'),
  confirmEmail: (token: string) =>
    get<{ ok: boolean; email: string }>(`/api/auth/confirm-email?token=${encodeURIComponent(token)}`),
  resendConfirmation: () =>
    post<{ ok: boolean; already?: boolean }>('/api/auth/resend-confirmation', {}),
  forgotPassword: (email: string) =>
    post<{ ok: boolean }>('/api/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    post<{ ok: boolean }>('/api/auth/reset-password', { token, password }),

  // preferences
  getPreferences: () => get<Preferences>('/api/preferences'),
  setPreferences: (body: Partial<Preferences>) => put<Preferences>('/api/preferences', body),
  markOnboarded: () => post<{ ok: boolean }>('/api/preferences/onboarded', {}),
  gameSuggestions: () => get<SuggestionsResponse>('/api/predictions/suggestions'),
  setSuggestionsEnabled: (enabled: boolean) =>
    post<{ ok: boolean; suggestions_enabled: boolean }>('/api/preferences/suggestions', { enabled }),

  // alerts
  listRules: () => get<AlertRule[]>('/api/alerts/rules'),
  createRule: (body: Omit<AlertRule, 'id' | 'sent_count' | 'hit_count' | 'created_at'>) =>
    post<AlertRule>('/api/alerts/rules', body),
  updateRule: (id: number, body: Omit<AlertRule, 'id' | 'sent_count' | 'hit_count' | 'created_at'>) =>
    put<AlertRule>(`/api/alerts/rules/${id}`, body),
  deleteRule: (id: number) => del<void>(`/api/alerts/rules/${id}`),
  listChannels: () => get<AlertChannel[]>('/api/alerts/channels'),
  createChannel: (body: { kind: AlertChannel['kind']; handle: string }) =>
    post<AlertChannel>('/api/alerts/channels', body),
  deleteChannel: (id: number) => del<void>(`/api/alerts/channels/${id}`),

  // bankroll
  listWallets: () => get<BankrollWallet[]>('/api/bankroll/wallets'),
  createWallet: (name: string) => post<BankrollWallet>('/api/bankroll/wallets', { name }),
  deleteWallet: (id: number) => del<void>(`/api/bankroll/wallets/${id}`),
  bankrollSummary: (wallet = 'all') => get<BankrollSummary>(`/api/bankroll/summary?wallet=${wallet}`),
  listBets: (wallet = 'all', limit = 200) => get<Bet[]>(`/api/bankroll/bets?wallet=${wallet}&limit=${limit}`),
  createBet: (body: Omit<Bet, 'id' | 'wallet_name' | 'placed_at' | 'settled_at' | 'result' | 'payout'> & { result?: never }) =>
    post<Bet>('/api/bankroll/bets', body),
  settleBet: (id: number, body: { result: 'win' | 'loss' | 'push'; payout?: number }) =>
    post<Bet>(`/api/bankroll/bets/${id}/settle`, body),
  deleteBet: (id: number) => del<void>(`/api/bankroll/bets/${id}`),
  listBankrollEntries: (wallet = 'all', limit = 200) =>
    get<BankrollEntry[]>(`/api/bankroll/entries?wallet=${wallet}&limit=${limit}`),
  createBankrollEntry: (body: { wallet_id: number; kind: 'deposit' | 'withdraw' | 'adjust'; amount: number; note?: string | null }) =>
    post<BankrollEntry>('/api/bankroll/entries', body),

  // world cup
  worldCup: () => get<WCOutlook>('/api/world-cup'),
  worldCupMatches: () => get<WCMatches>('/api/world-cup/matches'),
  worldCupAnalysis: (id: number) => get<WCAnalysis>(`/api/world-cup/matches/${id}`),
  worldCupCountries: () => get<WCCountries>('/api/world-cup/countries'),

  // moeda do usuário
  getMyCurrency: () => get<{ currency: string | null; detected: string }>('/api/me/currency'),
  setMyCurrency: (currency: string) => put<{ ok: boolean; currency: string }>('/api/me/currency', { currency }),

  // pricing (multimoeda)
  publicPricing: (currency?: string) =>
    get<PublicPricing>(`/api/public/pricing${currency ? `?currency=${encodeURIComponent(currency)}` : ''}`),
  adminCurrencyPrices: () =>
    get<{ base: CurrencyPriceRow; prices: CurrencyPriceRow[] }>('/api/admin/currency-prices'),
  putCurrencyPrice: (currency: string, body: CurrencyPriceInput) =>
    put<{ ok: boolean }>(`/api/admin/currency-prices/${currency}`, body),
  deleteCurrencyPrice: (currency: string) =>
    del<{ ok: boolean }>(`/api/admin/currency-prices/${currency}`),
  worldCupSelecao: (slug: string) => get<Selecao>(`/api/world-cup/selecao/${slug}`),

  // support
  supportListMine: () => get<SupportTicket[]>('/api/support/tickets'),
  supportActive: () => get<ActiveTicketResp>('/api/support/active'),
  supportCreate: (body: CreateTicketBody) =>
    post<{ ticket: SupportTicket }>('/api/support/tickets', body),
  supportDetail: (id: number) => get<TicketDetail>(`/api/support/tickets/${id}`),
  supportSend: (id: number, body: SendMessageBody) =>
    post<SupportMessage>(`/api/support/tickets/${id}/messages`, body),
  supportClose: (id: number) =>
    post<{ ok: boolean }>(`/api/support/tickets/${id}/close`, {}),
  supportSurvey: (id: number, body: { score: number; comment?: string | null }) =>
    post<{ ok: boolean }>(`/api/support/tickets/${id}/survey`, body),
  adminSupportList: (status?: string) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return get<SupportTicket[]>(`/api/admin/support/tickets${qs}`);
  },
  adminSupportDetail: (id: number) =>
    get<AdminTicketDetail>(`/api/admin/support/tickets/${id}`),
  adminSupportSend: (id: number, body: SendMessageBody) =>
    post<SupportMessage>(`/api/admin/support/tickets/${id}/messages`, body),
  adminSupportPatch: (id: number, body: { status?: TicketStatus; category?: TicketCategory }) =>
    request<SupportTicket>(`/api/admin/support/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  adminSupportInit: (body: { user_id: number; subject: string; category: TicketCategory; body: string }) =>
    post<{ ticket: SupportTicket; message: SupportMessage }>(
      '/api/admin/support/init',
      body,
    ),
  adminSupportSearchUsers: (q: string) =>
    get<Array<{ id: number; email: string; name: string | null; full_name: string | null }>>(
      `/api/admin/support/users/search?q=${encodeURIComponent(q)}`,
    ),

  // live match analysis
  liveMatch: (matchId: number, sim?: { minute: number; home: number; away: number }) => {
    const q = new URLSearchParams();
    if (sim) {
      q.set('minute', String(sim.minute));
      q.set('home', String(sim.home));
      q.set('away', String(sim.away));
    }
    const qs = q.toString();
    return get<LiveState>(`/api/live/${matchId}${qs ? '?' + qs : ''}`);
  },

  // admin
  adminStats: () => get<AdminStats>('/api/admin/stats'),
  adminUsers: (params: AdminUsersFilters = {}) => {
    const q = new URLSearchParams();
    if (params.q) q.set('q', params.q);
    if (params.plan) q.set('plan', params.plan);
    if (params.is_admin) q.set('is_admin', params.is_admin);
    if (params.has_override) q.set('has_override', params.has_override);
    if (params.has_sponsor) q.set('has_sponsor', params.has_sponsor);
    if (params.affiliated_by) q.set('affiliated_by', String(params.affiliated_by));
    const qs = q.toString();
    const suffix = qs ? '?' + qs : '';
    return get<AdminUser[]>(`/api/admin/users${suffix}`);
  },
  adminPatchUser: (id: number, body: AdminUserPatch) =>
    request<AdminUser>(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminListSubs: (params: { status?: string; plan?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.plan) q.set('plan', params.plan);
    const qs = q.toString();
    const suffix = qs ? '?' + qs : '';
    return get<AdminSub[]>(`/api/admin/subscriptions${suffix}`);
  },
  adminCreateSub: (body: AdminSubCreate) => post<AdminSub>('/api/admin/subscriptions', body),
  adminPatchSub: (id: number, body: AdminSubPatch) =>
    request<AdminSub>(`/api/admin/subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminDeleteSub: (id: number) => del<void>(`/api/admin/subscriptions/${id}`),

  // affiliate (user-facing)
  affiliateMe: () => get<AffiliateMe>('/api/affiliate/me'),

  // admin · affiliates / commissions / settings
  adminGetSettings: () => get<AppSettings & { raw: unknown }>('/api/admin/settings'),
  adminPutSettings: (body: Partial<AppSettings>) =>
    request<{ ok: boolean; updated: Record<string, string> }>(`/api/admin/settings`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  adminUserDetail: (id: number) =>
    get<AdminUser & { effective_pct: number }>(`/api/admin/users/${id}`),
  adminUserAffiliates: (id: number) => get<AdminUser[]>(`/api/admin/users/${id}/affiliates`),
  adminUserCommissions: (id: number) => get<AdminCommission[]>(`/api/admin/users/${id}/commissions`),
  adminListCommissions: (params: { status?: CommissionStatus; affiliate_user_id?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.affiliate_user_id) q.set('affiliate_user_id', String(params.affiliate_user_id));
    const qs = q.toString();
    return get<AdminCommission[]>(`/api/admin/commissions${qs ? '?' + qs : ''}`);
  },
  adminPatchCommission: (id: number, body: { status: CommissionStatus; notes?: string | null }) =>
    request<AdminCommission>(`/api/admin/commissions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  // checkout / pagamentos
  checkoutConfig: () => get<CheckoutConfig>('/api/checkout/config'),
  createOrder: (body: CreateOrderBody) => post<Order>('/api/checkout/orders', body),
  getOrder: (id: number) => get<Order>(`/api/checkout/orders/${id}`),
  listMyOrders: () => get<Order[]>('/api/checkout/orders'),
  simulateOrderPaid: (id: number) => post<Order>(`/api/checkout/orders/${id}/simulate-paid`, {}),

  // créditos
  creditsMe: () => get<CreditsMe>('/api/credits/me'),
  predictionAccess: (matchId: number) => get<PredictionAccess>(`/api/credits/access/${matchId}`),
  unlockPrediction: (matchId: number) =>
    post<{ ok: boolean; cost_brl?: number; balance_brl: number; already?: boolean }>(
      `/api/predictions/${matchId}/unlock`,
      {},
    ),

  // admin · pedidos / créditos
  adminListOrders: (params: { status?: string; kind?: string; method?: string; q?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.kind) q.set('kind', params.kind);
    if (params.method) q.set('method', params.method);
    if (params.q) q.set('q', params.q);
    const qs = q.toString();
    return get<AdminOrdersResponse>(`/api/admin/orders${qs ? '?' + qs : ''}`);
  },
  adminOrderDetail: (id: number) => get<AdminOrderDetail>(`/api/admin/orders/${id}`),
  adminPatchOrder: (id: number, body: { status: OrderStatus }) =>
    request<AdminOrder>(`/api/admin/orders/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminCredits: () => get<AdminCreditsResponse>('/api/admin/credits'),
  adminAdjustCredits: (body: { user_id: number; amount_brl: number; reason: string }) =>
    post<{ ok: boolean; balance_brl: number }>('/api/admin/credits/adjust', body),

  // public (no auth)
  publicSettings: () => get<PublicSettings>('/api/public/settings'),
  publicReferral: (code: string) =>
    get<ReferralLookup>(`/api/public/referral/${encodeURIComponent(code)}`),

  // notifications
  notifications: () => get<NotificationsFeed>('/api/notifications'),
  markNotificationRead: (id: number) =>
    post<{ ok: boolean }>(`/api/notifications/${id}/read`, {}),
  markAllNotificationsRead: () => post<{ ok: boolean }>('/api/notifications/read-all', {}),
  adminListNotifications: () => get<AdminNotification[]>('/api/admin/notifications'),
  adminSendNotification: (body: SendNotificationBody) =>
    post<AppNotification>('/api/admin/notifications', body),
  adminDeleteNotification: (id: number) => del<void>(`/api/admin/notifications/${id}`),
  // ─── Finance (admin) ───
  adminFinance: (filters: FinanceFilters = {}) => {
    const q = new URLSearchParams();
    if (filters.from) q.set('from', filters.from);
    if (filters.to) q.set('to', filters.to);
    if (filters.kind) q.set('kind', filters.kind);
    if (filters.source) q.set('source', filters.source);
    const qs = q.toString();
    return get<FinanceResponse>(`/api/admin/finance${qs ? '?' + qs : ''}`);
  },
  adminFinanceCreate: (body: FinanceEntryBody) =>
    post<{ id: number }>('/api/admin/finance/entries', body),
  adminFinanceDelete: (id: number) =>
    del<void>(`/api/admin/finance/entries/${id}`),
  adminFinanceExportUrl: (filters: FinanceFilters & { format: 'csv' | 'xlsx' | 'pdf' }) => {
    const q = new URLSearchParams();
    q.set('format', filters.format);
    if (filters.from) q.set('from', filters.from);
    if (filters.to) q.set('to', filters.to);
    if (filters.kind) q.set('kind', filters.kind);
    if (filters.source) q.set('source', filters.source);
    return `/api/admin/finance/export?${q.toString()}`;
  },

  adminSecurity: (params: { kind?: string; severity?: string; resolved?: 'true' | 'false' } = {}) => {
    const q = new URLSearchParams();
    if (params.kind) q.set('kind', params.kind);
    if (params.severity) q.set('severity', params.severity);
    if (params.resolved) q.set('resolved', params.resolved);
    const qs = q.toString();
    return get<SecurityResponse>(`/api/admin/security${qs ? '?' + qs : ''}`);
  },
  adminSecurityPatchConfig: (body: SecurityConfigPatch) =>
    request<{ ok: boolean; updated: Record<string, string> }>('/api/admin/security/config', {
      method: 'PUT', body: JSON.stringify(body),
    }),
  adminSecurityResolve: (id: number) =>
    post<{ ok: boolean }>(`/api/admin/security/events/${id}/resolve`, {}),

  adminActivityLog: (params: { action?: string; role?: string; user_id?: number; q?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.action) q.set('action', params.action);
    if (params.role) q.set('role', params.role);
    if (params.user_id) q.set('user_id', String(params.user_id));
    if (params.q) q.set('q', params.q);
    const qs = q.toString();
    return get<ActivityLogResponse>(`/api/admin/activity-log${qs ? '?' + qs : ''}`);
  },

  adminAccessLogs: (params: { action?: AccessAction; q?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.action) q.set('action', params.action);
    if (params.q) q.set('q', params.q);
    const qs = q.toString();
    const suffix = qs ? '?' + qs : '';
    return get<AccessLogsResponse>(`/api/admin/access-logs${suffix}`);
  },

  // reviews / avaliações
  reviews: () => get<ReviewsResponse>('/api/reviews'),
  myReview: () => get<OwnReview | null>('/api/reviews/me'),
  submitReview: (body: { rating: number; comment: string }) =>
    post<OwnReview>('/api/reviews', body),
  deleteMyReview: () => del<void>('/api/reviews/me'),
  adminListReviews: (status?: ReviewStatus) => {
    const qs = status ? `?status=${status}` : '';
    return get<AdminReview[]>(`/api/admin/reviews${qs}`);
  },
  adminModerateReview: (id: number, action: 'approve' | 'reject') =>
    post<{ id: number; status: ReviewStatus }>(`/api/admin/reviews/${id}/moderate`, { action }),

  // sugestões / feedback
  submitSuggestion: (message: string) => post<OwnSuggestion>('/api/suggestions', { message }),
  mySuggestions: () => get<OwnSuggestion[]>('/api/suggestions/me'),
  adminListSuggestions: (status?: SuggestionStatus) => {
    const qs = status ? `?status=${status}` : '';
    return get<AdminSuggestion[]>(`/api/admin/suggestions${qs}`);
  },
  adminSetSuggestionStatus: (id: number, status: SuggestionStatus) =>
    post<{ id: number; status: SuggestionStatus }>(`/api/admin/suggestions/${id}/status`, { status }),
};

// ─── Admin types ──────────────────────────────────────────────────────────
export interface AdminStats {
  generated_at: string;
  total_users: number;
  new_users_30d: number;
  active_subscriptions: number;
  churn_rate_30d: number;
  mrr_brl: number;
  arr_brl: number;
  gross_revenue_brl: number;
  users_by_plan: Array<{ plan: string; n: number }>;
  active_subs_by_plan: Array<{ plan: string; n: number }>;
  auto_debit: {
    active_subscriptions: number;
    paying_users: number;
    card_recurring_subs: number;
    card_recurring_users: number;
    pct_of_active_subs: number;
    pct_of_paying_users: number;
  };
  signups_30d: Array<{ day: string; n: number }>;
  revenue_90d: Array<{ day: string; total: number }>;
  pricing: Record<string, { monthly: number; yearly?: number; lifetime?: number }>;
}

export interface AdminUser {
  id: number;
  email: string;
  name: string | null;
  plan: Plan;
  is_admin: boolean;
  affiliate_code: string;
  affiliated_by: number | null;
  sponsor_email: string | null;
  affiliate_pct_override: number | null;
  affiliates_count: number;
  total_commissions_brl: number;
  created_at: string;
  last_login_at: string | null;
  active_subscription: {
    id: number;
    amount_brl: number;
    billing_cycle: BillingCycle | null;
    period_end: string | null;
  } | null;
}

export interface AdminUserPatch {
  plan?: Plan;
  is_admin?: boolean;
  name?: string | null;
  affiliate_pct_override?: number | null;
}

export type BoolFilter = 'true' | 'false' | '';

export interface AdminUsersFilters {
  q?: string;
  plan?: Plan | '';
  is_admin?: BoolFilter;
  has_override?: BoolFilter;
  has_sponsor?: BoolFilter;
  affiliated_by?: number;
}

export interface AdminSub {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string | null;
  plan: Plan;
  status: SubStatus;
  billing_cycle: BillingCycle | null;
  amount_brl: number;
  period_start: string;
  period_end: string | null;
  cancelled_at: string | null;
  payment_method: string | null;
  payment_ref: string | null;
  notes: string | null;
  created_at: string;
}

export interface AdminSubPatch {
  status?: SubStatus;
  period_end?: string | null;
  notes?: string | null;
}

export interface AdminSubCreate {
  user_id: number;
  plan: Plan;
  status?: SubStatus;
  billing_cycle?: BillingCycle | null;
  amount_brl?: number;
  period_start?: string | null;
  period_end?: string | null;
  payment_method?: string | null;
  payment_ref?: string | null;
  notes?: string | null;
}
