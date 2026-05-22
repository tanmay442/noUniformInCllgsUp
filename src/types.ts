export type VoteStatus = 'counted' | 'already_counted' | 'accepted_noop';

export interface VoteEvent {
  submission_id: string;
  college_id: number;
  created_at: string;
}

export interface Env {
  VOTES_DB: D1Database;
  COLLEGES_DB: D1Database;
  VOTE_EVENTS: Queue<VoteEvent>;
  TURNSTILE_SECRET: string;
  VOTE_TOKEN_PEPPER: string;
  TURNSTILE_SECRET_VALUE?: string;
  VOTE_TOKEN_PEPPER_VALUE?: string;
  TURNSTILE_EXPECTED_ACTION?: string;
  TURNSTILE_EXPECTED_HOSTNAME?: string;
  TALLY_CACHE_TTL?: string;
  LEADERBOARD_CACHE_TTL?: string;
}

export type AppBindings = {
  Bindings: Env;
  Variables: {
    requestId: string;
  };
};
