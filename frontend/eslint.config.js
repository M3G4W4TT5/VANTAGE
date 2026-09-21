import js from '@eslint/js';
import ts from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import refresh from 'eslint-plugin-react-refresh';

export default ts.config(
  { ignores: ['src/api/generated/**', 'dist/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': hooks, 'react-refresh': refresh },
    rules: {
      ...hooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-restricted-imports': ['error', { paths: [{ name: '@blueprintjs/core', importNames: ['Popover', 'Overlay'], message: 'Use PopoverNext / Overlay2 with React 19.' }], patterns: [{ group: ['@radix-ui/*'], message: 'Use the approved Blueprint controls.' }] }],
    },
  },
  {
    files: ['src/apps/**/*.{ts,tsx}', 'src/platform/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', {
      paths: [{ name: '@blueprintjs/core', importNames: ['Popover', 'Overlay'], message: 'Use PopoverNext / Overlay2 with React 19.' }],
      patterns: [
        { group: ['@radix-ui/*'], message: 'Use the approved Blueprint controls.' },
        { group: ['**/connectors/**'], message: 'Consume capability contracts. Wire concrete providers only in main.tsx and connectors/sourceRegistration.ts.' },
      ],
    }] },
  },
);
