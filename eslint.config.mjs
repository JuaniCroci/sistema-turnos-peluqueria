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
      // TODO: re-enable as error once eslint-plugin-react supports the isMounted/
      // hydration-guard pattern (setMounted(true) in empty-deps useEffect is intentional).
      'react-hooks/set-state-in-effect': 'warn',
    },
    ignores: ['.next/', 'node_modules/', 'pnpm-lock.yaml'],
  },
);
