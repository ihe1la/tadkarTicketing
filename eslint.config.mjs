import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      'reference/**',
      'analysis/generated/**',
      'archive/**',
      'apps/api/scripts/**',
      'apps/api/prisma/**',
      'apps/web/src/main.ts',
      'apps/api/src/app.integration.test.ts',
      'eslint.config.mjs',
      'docs/**',
      'SECURITY_REPORT.md',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: { '@typescript-eslint/no-misused-promises': 'error' },
  },
);
