import { z } from 'zod';

const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const votePayloadSchema = z.object({
  college_id: z.number().int().positive(),
  submission_id: z.string().regex(uuidV4Regex).max(64),
  voter_token: z.string().min(24).max(256),
  cf_turnstile_response: z.string().min(1),
  website: z.string().max(120).default(''),
});

export const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type VotePayload = z.infer<typeof votePayloadSchema>;
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
