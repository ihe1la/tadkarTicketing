import { z } from 'zod';

export const id = z.string().uuid();
export const pageQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(200).optional(),
});
export const loginInput = z.object({
  username: z.string().trim().min(3).max(100),
  password: z.string().min(12).max(200),
});
export const userInput = z.object({
  username: z.string().trim().min(3).max(100),
  displayName: z.string().trim().min(1).max(200),
  locale: z.enum(['fa', 'en']).default('fa'),
  active: z.boolean().default(true),
});
export const roleInput = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  permissions: z.array(z.string().min(2).max(100)).max(200),
});
export const organizationInput = z.object({
  name: z.string().trim().min(1).max(200),
  parentId: id.nullable().optional(),
});

const baseComponent = z.object({
  key: z.string().regex(/^[a-z][a-zA-Z0-9_]*$/),
  label: z.record(z.enum(['fa', 'en']), z.string().max(300)),
  required: z.boolean().default(false),
});
export const formComponent: z.ZodType<FormComponent> = z.lazy(() =>
  z.discriminatedUnion('type', [
    baseComponent.extend({
      type: z.enum(['text', 'textarea', 'date', 'datetime']),
      minLength: z.number().int().nonnegative().optional(),
      maxLength: z.number().int().positive().optional(),
    }),
    baseComponent.extend({
      type: z.enum(['integer', 'decimal']),
      minimum: z.number().optional(),
      maximum: z.number().optional(),
    }),
    baseComponent.extend({ type: z.literal('checkbox') }),
    baseComponent.extend({
      type: z.enum(['radio', 'select']),
      options: z
        .array(
          z.object({
            value: z.string().max(100),
            label: z.record(z.enum(['fa', 'en']), z.string().max(200)),
          }),
        )
        .min(1),
    }),
    baseComponent.extend({
      type: z.literal('file'),
      maximumBytes: z.number().int().positive().max(20_000_000),
      extensions: z.array(z.enum(['pdf', 'png', 'jpg', 'jpeg', 'txt'])).min(1),
    }),
    baseComponent.extend({
      type: z.enum(['heading', 'paragraph']),
      content: z.record(z.enum(['fa', 'en']), z.string().max(2000)),
    }),
    baseComponent.extend({
      type: z.enum(['section', 'columns']),
      children: z.array(formComponent).max(100),
    }),
  ]),
);
export type FormComponent = {
  key: string;
  label: Record<'fa' | 'en', string>;
  required: boolean;
  type: string;
  children?: FormComponent[];
  [key: string]: unknown;
};
export const formDefinitionInput = z.object({
  name: z.string().trim().min(2).max(200),
  components: z.array(formComponent).max(200),
});
export const submissionInput = z.object({
  formVersionId: id,
  values: z.record(z.string(), z.unknown()),
});

export const workflowNode = z.discriminatedUnion('type', [
  z.object({ id: z.string().min(1), type: z.literal('start'), next: z.string().min(1) }),
  z.object({
    id: z.string().min(1),
    type: z.literal('userTask'),
    name: z.string().min(1),
    assignee: z.object({ type: z.enum(['user', 'role', 'organization']), id }),
    formVersionId: id.optional(),
    next: z.string().min(1),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('decision'),
    variable: z.string().min(1),
    branches: z.record(z.string(), z.string().min(1)),
    fallback: z.string().min(1),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('service'),
    adapter: z.string().min(1),
    next: z.string().min(1),
  }),
  z.object({ id: z.string().min(1), type: z.literal('end') }),
]);
export const workflowDefinitionInput = z
  .object({ name: z.string().min(2).max(200), nodes: z.array(workflowNode).min(2).max(100) })
  .superRefine((value, ctx) => {
    const ids = new Set(value.nodes.map((node) => node.id));
    if (ids.size !== value.nodes.length)
      ctx.addIssue({ code: 'custom', message: 'Node identifiers must be unique' });
    if (value.nodes.filter((node) => node.type === 'start').length !== 1)
      ctx.addIssue({ code: 'custom', message: 'Exactly one start node is required' });
  });
export const completeTaskInput = z.object({
  idempotencyKey: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  variables: z.record(z.string(), z.unknown()).default({}),
});
export const reportInput = z.object({
  source: z.enum(['tasks', 'submissions', 'audit']),
  columns: z.array(z.string().min(1)).min(1).max(30),
  filters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
});

export type LoginInput = z.infer<typeof loginInput>;
export type FormDefinitionInput = z.infer<typeof formDefinitionInput>;
export type WorkflowDefinitionInput = z.infer<typeof workflowDefinitionInput>;
