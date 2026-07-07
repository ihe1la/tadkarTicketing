import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const sourceSchema = resolve('prisma/prototype.prisma');

let generatedSchema;
try {
  const clientEntry = require.resolve('@prisma/client');
  generatedSchema = resolve(dirname(clientEntry), '../../.prisma/client/schema.prisma');
} catch {
  // The generator below will create the client.
}

const needsGenerate =
  !generatedSchema ||
  !existsSync(generatedSchema) ||
  statSync(sourceSchema).mtimeMs > statSync(generatedSchema).mtimeMs;

if (needsGenerate) {
  const prismaCli = require.resolve('prisma/build/index.js');
  const result = spawnSync(
    process.execPath,
    [prismaCli, 'generate', '--schema', 'prisma/prototype.prisma'],
    { stdio: 'inherit' },
  );
  process.exit(result.status ?? 1);
}

console.log('Prisma Client is already current; generation skipped.');
