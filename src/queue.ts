import type { Env, VoteEvent } from './types';
import { logWorker } from './lib/log';

function isVoteEvent(value: unknown): value is VoteEvent {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<VoteEvent>;

  return typeof candidate.submission_id === 'string' && typeof candidate.college_id === 'number';
}

export async function consumeVoteEvents(batch: MessageBatch<unknown>, env: Env): Promise<void> {
  const increments = new Map<number, number>();
  let insertedCount = 0;
  let dedupedCount = 0;
  let invalidCount = 0;

  for (const message of batch.messages) {
    if (!isVoteEvent(message.body)) {
      invalidCount += 1;
      continue;
    }

    const dedupe = await env.COLLEGES_DB.prepare(
      'INSERT INTO processed_submissions (submission_id) VALUES (?) ON CONFLICT DO NOTHING',
    )
      .bind(message.body.submission_id)
      .run();

    if (Number(dedupe.meta.changes ?? 0) === 0) {
      dedupedCount += 1;
      continue;
    }

    insertedCount += 1;
    increments.set(message.body.college_id, (increments.get(message.body.college_id) ?? 0) + 1);
  }

  if (insertedCount === 0) {
    logWorker('queue_batch_empty', { total: batch.messages.length, deduped: dedupedCount, invalid: invalidCount });
    return;
  }

  const statements: D1PreparedStatement[] = [];

  for (const [collegeId, increment] of increments.entries()) {
    statements.push(
      env.COLLEGES_DB.prepare(
        `UPDATE colleges_list SET vote_count = vote_count + ?, updated_at = datetime('now') WHERE id = ?`,
      ).bind(increment, collegeId),
    );
  }

  statements.push(env.COLLEGES_DB.prepare("UPDATE stats SET value = value + ? WHERE key = 'global_total'").bind(insertedCount));

  await env.COLLEGES_DB.batch(statements);

  logWorker('queue_batch_processed', {
    total: batch.messages.length,
    inserted: insertedCount,
    deduped: dedupedCount,
    invalid: invalidCount,
    colleges_updated: increments.size,
  });
}