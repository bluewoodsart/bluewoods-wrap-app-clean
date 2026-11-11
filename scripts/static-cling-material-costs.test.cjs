const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { buildSync } = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const root = path.resolve(__dirname, '..');
const result = buildSync({
  entryPoints: [path.join(root, 'src/components/admin/StaticClingMaterialCosts.tsx')],
  bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
  external: ['react', 'react-dom'], alias: { '@': path.join(root, 'src') }
});
const compiled = { exports: {} };
new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, compiled, compiled.exports);
const html = renderToStaticMarkup(React.createElement(compiled.exports.default));

test('static cling reference renders accurate gross costs and source links', () => {
  for (const value of ['White static cling', 'Clear static cling', '$153.87', '$150.69',
    '$0.4559', '$0.4465', '337.5', '54 in', '75 ft', 'November 11, 2026']) {
    assert.ok(html.includes(value), value);
  }
  assert.equal((html.match(/href="https:\/\/www.lexjet.com/g) || []).length, 2);
});

test('reference clearly excludes production costs and does not claim selling prices', () => {
  for (const value of ['not a customer selling price', 'Shipping, tax, ink, waste',
    'labor, and finishing are excluded', 'do not change vehicle-wrap pricing rules']) {
    assert.ok(html.includes(value), value);
  }
});

test('material reference appears independently of the wrap RPC result', () => {
  const admin = fs.readFileSync(path.join(root, 'src/pages/Admin.tsx'), 'utf8');
  assert.ok(admin.includes('<StaticClingMaterialCosts />\n              <PricingSandboxErrorBoundary>'));
  assert.ok(admin.includes('{canViewPricingSandbox && ('));
});
