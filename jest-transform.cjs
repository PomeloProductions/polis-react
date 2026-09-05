/**
 * Custom Jest transformer that wraps ts-jest and rewrites `import.meta.env`
 * references (Vite-style env access) to a globalThis-backed object before
 * compiling. This keeps src/services/api.ts and similar files runnable
 * under Jest without modifying source.
 */
const tsJest = require('ts-jest').default;

const inner = tsJest.createTransformer({
  useESM: false,
  tsconfig: {
    jsx: 'react-jsx',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    target: 'ES2020',
    module: 'CommonJS',
    moduleResolution: 'node',
    isolatedModules: true,
    // @tanstack/react-table v9 is ESM-only JS; allow ts-jest to compile the
    // `.js` files pulled in from node_modules down to CommonJS.
    allowJs: true,
    allowImportingTsExtensions: false,
    skipLibCheck: true,
    strict: false,
    resolveJsonModule: true,
    lib: ['ES2020', 'DOM', 'DOM.Iterable'],
  },
  diagnostics: false,
});

function rewrite(src) {
  if (typeof src !== 'string') return src;
  if (src.indexOf('import.meta') === -1) return src;
  // Replace `import.meta.env` (and `import.meta`) with a globalThis-backed shim.
  return src
    .replace(/import\.meta\.env/g, '((globalThis).__VITE_ENV__ || {})')
    .replace(/import\.meta/g, '({ env: ((globalThis).__VITE_ENV__ || {}) })');
}

module.exports = {
  canInstrument: inner.canInstrument,
  getCacheKey(sourceText, sourcePath, options) {
    if (typeof inner.getCacheKey === 'function') {
      return inner.getCacheKey(rewrite(sourceText), sourcePath, options) + ':vite-env-v2';
    }
    return 'vite-env-v2:' + sourcePath;
  },
  getCacheKeyAsync(sourceText, sourcePath, options) {
    if (typeof inner.getCacheKeyAsync === 'function') {
      return inner
        .getCacheKeyAsync(rewrite(sourceText), sourcePath, options)
        .then((k) => k + ':vite-env-v2');
    }
    return Promise.resolve('vite-env-v2:' + sourcePath);
  },
  process(sourceText, sourcePath, options) {
    return inner.process(rewrite(sourceText), sourcePath, options);
  },
  processAsync(sourceText, sourcePath, options) {
    return inner.processAsync(rewrite(sourceText), sourcePath, options);
  },
};
