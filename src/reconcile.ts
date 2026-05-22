import type { Env } from './types';

type VoteCountRow = {
  college_id: number;
  vote_count: number;
};

export async function reconcileProjection(env: Env): Promise<void> {
  const authoritativeCounts = await env.VOTES_DB.prepare(
    'SELECT college_id, COUNT(*) AS vote_count FROM votes_log GROUP BY college_id',
  ).all<VoteCountRow>();

  const totalRow = await env.VOTES_DB.prepare('SELECT COUNT(*) AS total_votes FROM votes_log').first<{
    total_votes: number;
  }>();

  await env.COLLEGES_DB.prepare('UPDATE colleges_list SET vote_count = 0, updated_at = CURRENT_TIMESTAMP').run();

  const updates: D1PreparedStatement[] = [];

  for (const row of authoritativeCounts.results ?? []) {
    updates.push(
      env.COLLEGES_DB.prepare('UPDATE colleges_list SET vote_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(
        row.vote_count,
        row.college_id,
      ),
    );
  }

  updates.push(
    env.COLLEGES_DB.prepare("UPDATE stats SET value = ? WHERE key = 'global_total'").bind(
      Number(totalRow?.total_votes ?? 0),
    ),
  );

  if (updates.length > 0) {
    await env.COLLEGES_DB.batch(updates);
  }
}
