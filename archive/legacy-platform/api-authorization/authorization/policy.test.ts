import { describe, expect, it } from 'vitest';
import { can } from './policy.js';

const principal = {
  id: 'u1',
  permissions: new Set(['submission:read']),
  organizationUnitIds: new Set(['o1']),
};
describe('authorization policy', () => {
  it('enforces horizontal ownership', () => {
    expect(can(principal, 'submission:read', 'OWN', { ownerId: 'u2' })).toBe(false);
  });
  it('enforces vertical permissions', () => {
    expect(can(principal, 'user:admin', 'GLOBAL')).toBe(false);
  });
  it('allows matching organization scope', () => {
    expect(can(principal, 'submission:read', 'ORGANIZATION', { organizationUnitId: 'o1' })).toBe(
      true,
    );
  });
});
