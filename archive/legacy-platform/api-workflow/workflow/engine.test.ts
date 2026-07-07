import { describe, expect, it } from 'vitest';
import { DeterministicWorkflowEngine } from './engine.js';

const workflow = {
  name: 'Approval',
  nodes: [
    { id: 'start', type: 'start' as const, next: 'review' },
    {
      id: 'review',
      type: 'userTask' as const,
      name: 'Review',
      assignee: { type: 'role' as const, id: '00000000-0000-4000-8000-000000000001' },
      next: 'decision',
    },
    {
      id: 'decision',
      type: 'decision' as const,
      variable: 'approved',
      branches: { true: 'end' },
      fallback: 'review',
    },
    { id: 'end', type: 'end' as const },
  ],
};

describe('workflow engine', () => {
  it('runs an approval to completion deterministically', () => {
    const engine = new DeterministicWorkflowEngine();
    const started = engine.start(workflow);
    expect(started.actions[0]?.type).toBe('CREATE_TASK');
    const completed = engine.complete(workflow, started.state, 'review', { approved: true });
    expect(completed.state.status).toBe('COMPLETED');
  });
  it('rejects stale or duplicate completion', () => {
    const engine = new DeterministicWorkflowEngine();
    const started = engine.start(workflow);
    expect(() => engine.complete(workflow, started.state, 'other', {})).toThrow('Stale');
  });
});
