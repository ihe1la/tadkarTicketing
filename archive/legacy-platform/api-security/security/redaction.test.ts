import { describe, expect, it } from 'vitest';
import { redact } from './redaction.js';
describe('redaction', () => {
  it('recursively removes secrets', () =>
    expect(redact({ password: 'x', nested: { accessToken: 'y', safe: 1 } })).toEqual({
      password: '[REDACTED]',
      nested: { accessToken: '[REDACTED]', safe: 1 },
    }));
});
