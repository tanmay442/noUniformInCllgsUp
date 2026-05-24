import { Hono } from 'hono';
import { decodeCursor, encodeCursor } from './lib/cursor';
import { hashWithPepper } from './lib/hash';
import { cacheControl, jsonError, jsonSuccess } from './lib/http';
import { logError, logInfo } from './lib/log';
import { buildVotedCookie, isSameOrigin, securityHeaders } from './lib/security';
import { verifyTurnstile } from './lib/turnstile';
import { leaderboardQuerySchema, votePayloadSchema } from './lib/validation';
import type { AppBindings, VoteEvent } from './types';

type TallyRow = {
  value: number;
};

type CollegeRow = {
  id: number;
  college_name: string;
  district: string;
  vote_count: number;
  updated_at: string;
};

function toIsoUtc(dt: string | null | undefined): string | null {
  if (!dt) return null;
  return dt.includes('T') ? dt : dt.replace(' ', 'T') + 'Z';
}

const app = new Hono<AppBindings>();
const TEST_TURNSTILE_SECRET = '1x0000000000000000000000000000000AA';

app.use('*', async (c, next) => {
  c.set('requestId', crypto.randomUUID());
  await next();
});

app.use('*', securityHeaders);

app.onError((err, c) => {
  logError(c, err);
  return jsonError(c, 500, 'INTERNAL_ERROR', 'Something went wrong');
});

app.notFound((c) => jsonError(c, 404, 'NOT_FOUND', 'Route not found'));


app.get('/healthz', (c) => jsonSuccess(c, { status: 'ok' }));

app.get('/api/status', async (c) => {
  try {
    const collegeCount = await c.env.COLLEGES_DB.prepare('SELECT COUNT(*) AS count FROM colleges_list').first<{ count: number }>();
    const totalRow = await c.env.COLLEGES_DB.prepare("SELECT value FROM stats WHERE key = 'global_total' LIMIT 1").first<{ value: number }>();
    const voteLogCount = await c.env.VOTES_DB.prepare('SELECT COUNT(*) AS count FROM votes_log').first<{ count: number }>();

    logInfo(c, 'status_check', {
      colleges: collegeCount?.count ?? 0,
      votes: voteLogCount?.count ?? 0,
      tally: totalRow?.value ?? 0,
    });

    return jsonSuccess(c, {
      status: 'healthy',
      uptime: Math.floor(performance.now() / 1000),
      colleges: collegeCount?.count ?? 0,
      votes_logged: voteLogCount?.count ?? 0,
      global_tally: totalRow?.value ?? 0,
    });
  } catch (err) {
    logError(c, err);
    return jsonError(c, 500, 'STATUS_FAILED', 'Could not query status');
  }
});

app.get('/api/config', (c) =>
  jsonSuccess(c, {
    turnstile_site_key: c.env.TURNSTILE_SITE_KEY ?? '1x00000000000000000000AA',
    turnstile_action: c.env.TURNSTILE_EXPECTED_ACTION ?? 'vote',
  }),
);

app.post('/api/vote', async (c) => {
  if (!isSameOrigin(c)) {
    return jsonError(c, 403, 'ORIGIN_NOT_ALLOWED', 'Cross-origin requests are not allowed');
  }

  const payload = await c.req.json().catch(() => null);
  const parsed = votePayloadSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError(c, 400, 'INVALID_PAYLOAD', 'Vote payload is invalid');
  }

  const vote = parsed.data;

  if (vote.website.trim().length > 0) {
    c.header('Set-Cookie', buildVotedCookie());
    return jsonSuccess(c, { status: 'accepted_noop', message: 'Vote accepted' });
  }

  const college = await c.env.COLLEGES_DB.prepare('SELECT id FROM colleges_list WHERE id = ? LIMIT 1')
    .bind(vote.college_id)
    .first<{ id: number }>();

  if (!college) {
    return jsonError(c, 400, 'INVALID_COLLEGE', 'Unknown college_id');
  }

  const ip = c.req.header('CF-Connecting-IP');
  const votePepper = c.env.VOTE_TOKEN_PEPPER;

  const turnstileSecret = c.env.TURNSTILE_SECRET || TEST_TURNSTILE_SECRET;
  const isTestTurnstile = turnstileSecret === TEST_TURNSTILE_SECRET;

  if (!votePepper) {
    return jsonError(c, 500, 'VOTE_SECURITY_MISCONFIGURED', 'Vote security is not configured');
  }

  const turnstileResult = await verifyTurnstile({
    secret: turnstileSecret,
    response: vote.cf_turnstile_response,
    remoteIp: ip,
    idempotencyKey: vote.submission_id,
    expectedAction: isTestTurnstile ? undefined : c.env.TURNSTILE_EXPECTED_ACTION,
    expectedHostname: isTestTurnstile ? undefined : c.env.TURNSTILE_EXPECTED_HOSTNAME,
  });

  if (!turnstileResult.ok) {
    return jsonError(c, 403, turnstileResult.code ?? 'INVALID_TURNSTILE', 'Human verification failed');
  }

  const voterTokenHash = await hashWithPepper(vote.voter_token, votePepper);
  const turnstileTokenHash = await hashWithPepper(vote.cf_turnstile_response, votePepper);

  const insertResult = await c.env.VOTES_DB.prepare(
    `INSERT INTO votes_log (submission_id, college_id, voter_token_hash)
     VALUES (?, ?, ?)
     ON CONFLICT DO NOTHING`,
  )
    .bind(vote.submission_id, vote.college_id, voterTokenHash)
    .run();

  const wasInserted = Number(insertResult.meta.changes ?? 0) > 0;

  if (wasInserted) {
    await c.env.VOTES_DB.prepare(
      'INSERT INTO used_turnstile_tokens (token_hash) VALUES (?) ON CONFLICT DO NOTHING',
    )
      .bind(turnstileTokenHash)
      .run();

    const event: VoteEvent = {
      submission_id: vote.submission_id,
      college_id: vote.college_id,
      created_at: new Date().toISOString(),
    };

    try {
      await c.env.VOTE_EVENTS.send(event);
    } catch (error) {
      logError(c, error);
      await projectVoteFallback(c.env.COLLEGES_DB, event);
    }
  }

  c.header('Set-Cookie', buildVotedCookie());

  return jsonSuccess(c, {
    status: wasInserted ? 'counted' : 'already_counted',
    message: wasInserted ? 'Vote recorded' : 'Vote already counted',
  });
});

app.get('/api/tally', async (c) => {
  const row = await c.env.COLLEGES_DB.prepare("SELECT value FROM stats WHERE key = 'global_total' LIMIT 1").first<
    TallyRow
  >();

  const updatedRow = await c.env.COLLEGES_DB.prepare('SELECT MAX(updated_at) AS updated_at FROM colleges_list').first<{
    updated_at: string | null;
  }>();

  const ttl = Number(c.env.TALLY_CACHE_TTL ?? 10);

  return jsonSuccess(
    c,
    {
      global_total: Number(row?.value ?? 0),
      updated_at: toIsoUtc(updatedRow?.updated_at) ?? new Date().toISOString(),
    },
    200,
    { 'Cache-Control': cacheControl(ttl, ttl * 2) },
  );
});

app.get('/api/leaderboard', async (c) => {
  const query = Object.fromEntries(new URL(c.req.url).searchParams.entries());
  const parsed = leaderboardQuerySchema.safeParse(query);

  if (!parsed.success) {
    return jsonError(c, 400, 'INVALID_QUERY', 'Invalid leaderboard query');
  }

  const { limit, cursor } = parsed.data;
  const cursorPayload = cursor ? decodeCursor(cursor) : null;

  if (cursor && !cursorPayload) {
    return jsonError(c, 400, 'INVALID_CURSOR', 'Cursor is malformed');
  }

  const queryResult = cursorPayload
    ? await c.env.COLLEGES_DB.prepare(
        `SELECT id, college_name, district, vote_count, updated_at
         FROM colleges_list
         WHERE (vote_count < ?)
            OR (vote_count = ? AND id > ?)
         ORDER BY vote_count DESC, id ASC
         LIMIT ?`,
      )
        .bind(cursorPayload.vote_count, cursorPayload.vote_count, cursorPayload.id, limit)
        .all<CollegeRow>()
    : await c.env.COLLEGES_DB.prepare(
        `SELECT id, college_name, district, vote_count, updated_at
         FROM colleges_list
         ORDER BY vote_count DESC, id ASC
         LIMIT ?`,
      )
        .bind(limit)
        .all<CollegeRow>();

  const rows = queryResult.results ?? [];
  const last = rows.at(-1);
  const nextCursor = rows.length === limit && last ? encodeCursor({ vote_count: last.vote_count, id: last.id }) : null;

  const updatedAt = rows.reduce<string>(
    (latest, row) => (row.updated_at > latest ? row.updated_at : latest),
    new Date(0).toISOString(),
  );

  const ttl = Number(c.env.LEADERBOARD_CACHE_TTL ?? 20);

  return jsonSuccess(
    c,
    {
      rows: rows.map(({ id, college_name, district, vote_count }) => ({
        id,
        college_name,
        district,
        vote_count,
      })),
      next_cursor: nextCursor,
      updated_at: updatedAt === new Date(0).toISOString() ? new Date().toISOString() : toIsoUtc(updatedAt) ?? updatedAt,
    },
    200,
    { 'Cache-Control': cacheControl(ttl, ttl * 2) },
  );
});

app.get('/api/colleges', async (c) => {
  const result = await c.env.COLLEGES_DB.prepare(
    'SELECT id, college_name, district FROM colleges_list ORDER BY college_name ASC',
  ).all<Omit<CollegeRow, 'vote_count' | 'updated_at'>>();

  return jsonSuccess(
    c,
    {
      rows: result.results ?? [],
    },
    200,
    {
      'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400',
    },
  );
});

async function projectVoteFallback(db: D1Database, event: VoteEvent): Promise<void> {
  const dedupe = await db
    .prepare('INSERT INTO processed_submissions (submission_id) VALUES (?) ON CONFLICT DO NOTHING')
    .bind(event.submission_id)
    .run();

  if (Number(dedupe.meta.changes ?? 0) === 0) {
    return;
  }

  await db.batch([
    db.prepare(`UPDATE colleges_list SET vote_count = vote_count + 1, updated_at = datetime('now') WHERE id = ?`).bind(
      event.college_id,
    ),
    db.prepare("UPDATE stats SET value = value + 1 WHERE key = 'global_total'"),
  ]);
}

export { app };
