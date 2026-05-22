type VerifyTurnstileArgs = {
  secret: string;
  response: string;
  remoteIp?: string;
  idempotencyKey?: string;
  expectedAction?: string;
  expectedHostname?: string;
};

type VerifyTurnstileResult = {
  ok: boolean;
  code?: string;
  detail?: string;
};

type TurnstileResponse = {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
};

export async function verifyTurnstile(args: VerifyTurnstileArgs): Promise<VerifyTurnstileResult> {
  const formData = new URLSearchParams();
  formData.set('secret', args.secret);
  formData.set('response', args.response);

  if (args.remoteIp) {
    formData.set('remoteip', args.remoteIp);
  }

  if (args.idempotencyKey) {
    formData.set('idempotency_key', args.idempotencyKey);
  }

  let response: Response;

  try {
    response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });
  } catch {
    return { ok: false, code: 'TURNSTILE_UNAVAILABLE', detail: 'verification service unavailable' };
  }

  if (!response.ok) {
    return { ok: false, code: 'TURNSTILE_UNAVAILABLE', detail: 'verification service unavailable' };
  }

  const payload = (await response.json()) as TurnstileResponse;

  if (!payload.success) {
    return {
      ok: false,
      code: 'INVALID_TURNSTILE',
      detail: (payload['error-codes'] ?? []).join(',') || 'verification failed',
    };
  }

  if (args.expectedAction && payload.action !== args.expectedAction) {
    return { ok: false, code: 'TURNSTILE_ACTION_MISMATCH', detail: 'unexpected action' };
  }

  if (
    args.expectedHostname &&
    payload.hostname?.toLowerCase() !== args.expectedHostname.toLowerCase()
  ) {
    return { ok: false, code: 'TURNSTILE_HOSTNAME_MISMATCH', detail: 'unexpected hostname' };
  }

  return { ok: true };
}
