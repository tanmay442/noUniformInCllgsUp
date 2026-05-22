import { app } from './app';
import { consumeVoteEvents } from './queue';
import { reconcileProjection } from './reconcile';
import type { Env } from './types';

export default {
  fetch: app.fetch,
  queue: async (batch, env) => {
    await consumeVoteEvents(batch, env);
  },
  scheduled: async (_event, env) => {
    await reconcileProjection(env);
  },
} satisfies ExportedHandler<Env>;
