// Domain types matching the FastAPI backend (src/services/prediction.py)

export type LeagueCode = 'PL' | 'PD' | 'BL1' | 'SA' | 'FL1' | 'CL' | 'WC';

export interface ModelProb {
  prob_home: number;
  prob_draw: number;
  prob_away: number;
  over_2_5?: number;
  btts_yes?: number;
}

export interface ValueBet {
  market: string;
  ev: number;
  odds?: number;
  kelly?: number;
  prob?: number;
}

export interface Prediction {
  match_id: number;
  date: string;
  kickoff: string;
  league: string;
  home_team: string;
  away_team: string;
  home_team_id: number;
  away_team_id: number;
  status: string;
  home_goals: number | null;
  away_goals: number | null;
  models: {
    dixon_coles: ModelProb;
    elo: ModelProb;
    bayesian: ModelProb;
  };
  ensemble: ModelProb;
  markets: {
    over_1_5?: number;
    over_2_5?: number;
    over_3_5?: number;
    btts_yes?: number;
  };
  corners: Record<string, number> | null;
  cards: Record<string, number> | null;
  odds: {
    odds_home?: number;
    odds_draw?: number;
    odds_away?: number;
  };
  value_bets: ValueBet[];
  all_markets: ValueBet[];
  confidence: 'low' | 'medium' | 'high';
}

export interface PredictionsResponse {
  date: string;
  league: string | null;
  count: number;
  predictions: Prediction[];
}

export interface SystemStatus {
  status: string;
  models: { dixon_coles: boolean; elo: boolean; bayesian_logistic: boolean };
  any_model_trained: boolean;
  db_ok: boolean;
  matches_in_db: number;
  leagues: string[];
}

export interface ModelMetrics {
  rps?: number;
  log_loss?: number;
  brier?: number;
  auc?: number;
  accuracy?: number;
  n_matches?: number;
}

export interface CalibrationPoint {
  bin_center: number;
  predicted: number;
  actual: number;
  count: number;
}

export interface PerformanceResults {
  models?: Record<string, ModelMetrics>;
  by_league?: Record<string, Record<string, ModelMetrics>>;
  n_train?: number;
  n_test?: number;
  date_range?: {
    train_start: string;
    train_end: string;
    test_start: string;
    test_end: string;
  };
  calibration?: Record<string, CalibrationPoint[]>;
  error?: string;
}

export interface HistoryItem {
  match_id: number;
  generated_at: string;
  prob_home: number;
  prob_draw: number;
  prob_away: number;
  confidence: string;
  home_team_name: string;
  away_team_name: string;
  league: string;
  home_goals?: number | null;
  away_goals?: number | null;
}
