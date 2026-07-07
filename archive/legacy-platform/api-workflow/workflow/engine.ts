import type { WorkflowDefinitionInput } from '@tadkar/contracts';

export type EngineState = {
  currentNodeId: string;
  status: 'RUNNING' | 'COMPLETED';
  variables: Record<string, unknown>;
};
export type EngineAction =
  | {
      type: 'CREATE_TASK';
      nodeId: string;
      name: string;
      assignee: { type: 'user' | 'role' | 'organization'; id: string };
    }
  | { type: 'SERVICE'; nodeId: string; adapter: string }
  | { type: 'END'; nodeId: string };

export class DeterministicWorkflowEngine {
  start(
    definition: WorkflowDefinitionInput,
    variables: Record<string, unknown> = {},
  ): { state: EngineState; actions: EngineAction[] } {
    const start = definition.nodes.find((node) => node.type === 'start');
    if (!start || start.type !== 'start') throw new Error('Workflow has no start node');
    return this.advance(definition, { currentNodeId: start.next, status: 'RUNNING', variables });
  }

  complete(
    definition: WorkflowDefinitionInput,
    state: EngineState,
    nodeId: string,
    variables: Record<string, unknown>,
  ): { state: EngineState; actions: EngineAction[] } {
    if (state.status !== 'RUNNING' || state.currentNodeId !== nodeId)
      throw new Error('Stale task completion');
    const node = definition.nodes.find((candidate) => candidate.id === nodeId);
    if (!node || node.type !== 'userTask') throw new Error('Current node is not a user task');
    return this.advance(definition, {
      currentNodeId: node.next,
      status: 'RUNNING',
      variables: { ...state.variables, ...variables },
    });
  }

  private advance(
    definition: WorkflowDefinitionInput,
    initial: EngineState,
  ): { state: EngineState; actions: EngineAction[] } {
    let state = initial;
    const actions: EngineAction[] = [];
    for (let guard = 0; guard < definition.nodes.length + 1; guard += 1) {
      const node = definition.nodes.find((candidate) => candidate.id === state.currentNodeId);
      if (!node) throw new Error(`Missing node: ${state.currentNodeId}`);
      if (node.type === 'userTask') {
        actions.push({
          type: 'CREATE_TASK',
          nodeId: node.id,
          name: node.name,
          assignee: node.assignee,
        });
        return { state, actions };
      }
      if (node.type === 'decision') {
        const selected = String(state.variables[node.variable] ?? '');
        state = { ...state, currentNodeId: node.branches[selected] ?? node.fallback };
        continue;
      }
      if (node.type === 'service') {
        actions.push({ type: 'SERVICE', nodeId: node.id, adapter: node.adapter });
        state = { ...state, currentNodeId: node.next };
        continue;
      }
      if (node.type === 'end') {
        state = { ...state, status: 'COMPLETED' };
        actions.push({ type: 'END', nodeId: node.id });
        return { state, actions };
      }
      throw new Error('Start nodes are only valid at workflow entry');
    }
    throw new Error('Workflow contains a cycle without a wait state');
  }
}
