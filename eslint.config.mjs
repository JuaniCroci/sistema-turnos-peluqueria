import nextConfig from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  ...nextConfig,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      'react-hooks/set-state-in-effect': 'error',
    },
    ignores: ['.next/', 'node_modules/', 'pnpm-lock.yaml'],
  },
);
