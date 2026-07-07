import { describe, expect, it } from 'vitest';
import { formDefinitionInput, workflowDefinitionInput } from './index.js';

describe('contracts', () => {
  it('rejects executable fields and duplicate workflow nodes', () => {
    expect(formDefinitionInput.safeParse({ name: 'x', components: [] }).success).toBe(false);
    expect(
      workflowDefinitionInput.safeParse({
        name: 'approval',
        nodes: [
          { id: 'a', type: 'start', next: 'a' },
          { id: 'a', type: 'end' },
        ],
      }).success,
    ).toBe(false);
  });
});
