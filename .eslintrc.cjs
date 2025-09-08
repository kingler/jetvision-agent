/**
 * JetVision Agent ESLint configuration focused on enforcing the design system.
 * Note: Some rules rely on regex selectors and core ESLint only (no plugins),
 * so it works without extra deps. You can add plugins later for stricter checks.
 */
module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2023,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  env: {
    es2021: true,
    node: true,
    browser: true,
  },
  overrides: [
    {
      files: ['**/*.{ts,tsx,js,jsx}'],
      rules: {
        /**
         * Disallow non-semantic Tailwind palette colors in className.
         * Allowed semantic prefixes: background|foreground|secondary|tertiary|quaternary|brand|muted|accent|destructive|border|soft|hard|input|ring|card|popover
         */
        'no-restricted-syntax': [
          'error',
          {
            selector:
              'JSXAttribute[name.name="className"] Literal[value=/(^|\\s)(text|bg|border)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(-|\\/|\\s|$)/i] ',
            message:
              'Use semantic color tokens (e.g., text-brand, bg-secondary, border-border) — raw Tailwind palette colors are forbidden.',
          },
          {
            selector:
              'JSXAttribute[name.name="className"] Literal[value=/(^|\\s)shadow-(?!subtle-(xs|sm))(?:[a-z0-9-]+)/] ',
            message:
              'Use shadow tokens (shadow-subtle-xs|shadow-subtle-sm) instead of raw Tailwind shadow utilities.',
          },
          {
            selector: 'JSXAttribute[name.name="className"] Literal[value=/rounded-\[/] ',
            message:
              'Avoid arbitrary radii. Use rounded-sm/md/lg/xl/full mapped to --radius tokens.',
          },
          {
            selector: 'Literal[value=/(#[0-9a-fA-F]{3,8}|\\brgb(a)?\\(|\\bhsl(a)?\\()/] ',
            message:
              'Do not use literal colors (hex/rgb/hsl). Use CSS variables (var(--token)) or semantic Tailwind tokens.',
          },
        ],
      },
    },
  ],
  ignorePatterns: [
    'dist/**',
    'node_modules/**',
    '**/*.d.ts',
    '**/*.worker.js',
    '**/playwright-report/**',
    '**/test-results/**',
  ],
};

