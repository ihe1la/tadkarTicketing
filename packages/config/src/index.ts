import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  S3_ENDPOINT: z.string().url(),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(16),
  S3_BUCKET: z.string().min(1),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  WEB_ORIGIN: z.string().url(),
  TRUSTED_PROXIES: z.string().transform((value) => value.split(',').map((item) => item.trim())),
});

export type Environment = z.infer<typeof environmentSchema>;
export const parseEnvironment = (source: Record<string, unknown>): Environment =>
  environmentSchema.parse(source);
