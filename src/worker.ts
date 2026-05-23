import { app } from './app';
import { consumeVoteEvents } from './queue';
import { reconcileProjection } from './reconcile';
import type { Env } from './types';

export const queue = async (batch: MessageBatch<unknown>, env: Env) => {
  await consumeVoteEvents(batch, env);
};

export const scheduled = async (_event: ScheduledController, env: Env) => {
  await reconcileProjection(env);
};

const worker = {
  fetch: app.fetch,
  queue,
  scheduled,
} satisfies ExportedHandler<Env>;

export default worker;
