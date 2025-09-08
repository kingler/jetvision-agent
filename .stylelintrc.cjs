/**
 * JetVision Agent Stylelint config to enforce design tokens.
 * Uses core rules only to avoid plugin dependencies.
 */
module.exports = {
  extends: [
    // You can add 'stylelint-config-standard' when available
  ],
  rules: {
    // Only use CSS variables for colors
    'declaration-property-value-disallowed-list': {
      color: [/^(?!var\(--).*/],
      'background-color': [/^(?!var\(--).*/],
      'border-color': [/^(?!var\(--).*/],
    },

    // Forbid raw color functions; prefer CSS vars (and map to Tailwind tokens)
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla'],

    // Restrict box-shadow to tokens only
    'property-value-disallowed-list': {
      'box-shadow': [/^(?!var\(--shadow-subtle-(xs|sm)\)).*/],
    },

    // Discourage arbitrary radii in CSS
    'declaration-property-value-disallowed-list': {
      'border-radius': [/\d+px/],
    },
  },
  ignoreFiles: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
  ],
};

