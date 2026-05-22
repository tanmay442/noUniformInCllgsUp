import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor } from '../src/lib/cursor';
import { isSameOrigin } from '../src/lib/security';
import { votePayloadSchema } from '../src/lib/validation';

describe('vote payload schema', () => {
  it('accepts valid vote payload', () => {
    const payload = {
      college_id: 10,
      submission_id: '2f1f2f53-c6dd-4279-9cb1-9ac5d041b1a0',
      voter_token: '123456789012345678901234567890123456',
      cf_turnstile_response: 'turnstile-token',
      website: '',
    };

    const parsed = votePayloadSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid uuid', () => {
    const payload = {
      college_id: 10,
      submission_id: 'bad-uuid',
      voter_token: '123456789012345678901234567890123456',
      cf_turnstile_response: 'turnstile-token',
      website: '',
    };

    const parsed = votePayloadSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });
});

describe('cursor codec', () => {
  it('encodes and decodes cursor', () => {
    const cursor = encodeCursor({ vote_count: 34, id: 8 });
    const decoded = decodeCursor(cursor);

    expect(decoded).toEqual({ vote_count: 34, id: 8 });
  });

  it('returns null for malformed cursor', () => {
    expect(decodeCursor('invalid')).toBeNull();
  });
});

describe('same-origin guard', () => {
  function createContextWithUrl(origin?: string, url = 'https://example.com/api/vote') {
    return {
      req: {
        url,
        header(name: string) {
          return name.toLowerCase() === 'origin' ? origin : null;
        },
      },
    };
  }

  it('rejects missing origin header', () => {
    expect(isSameOrigin(createContextWithUrl() as never)).toBe(false);
  });

  it('accepts matching origin header', () => {
    expect(isSameOrigin(createContextWithUrl('https://example.com', 'https://example.com/api/vote') as never)).toBe(true);
  });

  it('rejects mismatched origin header', () => {
    expect(isSameOrigin(createContextWithUrl('https://evil.example') as never)).toBe(false);
  });
});
