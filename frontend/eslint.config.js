import js from '@eslint/js';
import ts from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import refresh from 'eslint-plugin-react-refresh';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot = fileURLToPath(new URL('./src/', import.meta.url));
const moduleBoundaries = {
  rules: {
    independent: {
      meta: { type: 'problem', schema: [], messages: {
        platform: 'Platform services must not import an app. Apps consume platform contracts.',
        app: 'Apps must not import another app. Use platform contracts or registered optional actions.',
      } },
      create(context) {
        const owner = path.relative(sourceRoot, context.filename).split(path.sep);
        const check = node => {
          const source = node.source;
          if (typeof source?.value !== 'string' || !(source.value.startsWith('.') || path.isAbsolute(source.value))) return;
          const target = path.relative(sourceRoot, path.resolve(path.dirname(context.filename), source.value)).split(path.sep);
          if (target[0] !== 'apps') return;
          if (owner[0] === 'platform') context.report({ node: source, messageId: 'platform' });
          else if (owner[0] === 'apps' && owner[1] !== target[1]) context.report({ node: source, messageId: 'app' });
        };
        return { ImportDeclaration: check, ExportNamedDeclaration: check, ExportAllDeclaration: check, ImportExpression: check, TSImportType: check };
      },
    },
  },
};

export default ts.config(
  { ignores: ['src/api/generated/**', 'dist/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': hooks, 'react-refresh': refresh, boundaries: moduleBoundaries },
    rules: {
      'boundaries/independent': 'error',
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
