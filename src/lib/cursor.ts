type CursorPayload = {
  vote_count: number;
  id: number;
};

function toBase64(input: string): string {
  if (typeof btoa === 'function') {
    return btoa(input);
  }

  return Buffer.from(input, 'utf8').toString('base64');
}

function fromBase64(input: string): string {
  if (typeof atob === 'function') {
    return atob(input);
  }

  return Buffer.from(input, 'base64').toString('utf8');
}

export function encodeCursor(payload: CursorPayload): string {
  const raw = JSON.stringify(payload);
  return toBase64(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeCursor(value: string): CursorPayload | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = fromBase64(padded);
    const parsed = JSON.parse(decoded) as Partial<CursorPayload>;

    if (typeof parsed.id !== 'number' || typeof parsed.vote_count !== 'number') {
      return null;
    }

    return {
      id: parsed.id,
      vote_count: parsed.vote_count,
    };
  } catch {
    return null;
  }
}
