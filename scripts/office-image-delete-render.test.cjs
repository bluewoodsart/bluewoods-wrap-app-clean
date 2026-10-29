const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToString } = require('react-dom/server');

const source = fs.readFileSync('src/components/OfficeImageDeleteControls.tsx', 'utf8');
function loadHook(sourceText) {
  const output = ts.transpileModule(sourceText, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.ReactJSX
  }}).outputText;
  const mod = { exports: {} };
  const scopedRequire = name => {
    if (name === '@/lib/supabase') return { supabase: new Proxy({}, { get() { throw new Error('Rendering must not access the database'); } }) };
    if (name === '@/components/ui/button') return { Button: 'button' };
    return require(name);
  };
  vm.runInNewContext(output, { module: mod, exports: mod.exports, require: scopedRequire });
  return mod.exports.useOfficeImageDeletion;
}
function renderHook(hook, quoteId) {
  function Probe() {
    const state = hook(quoteId, async () => {});
    assert.equal(state.busy, false);
    assert.equal(state.message, '');
    return React.createElement('span', null, 'Quote requests ready');
  }
  return renderToString(React.createElement(Probe));
}
test('quote requests render before a quote is selected', () => {
  assert.equal(renderHook(loadHook(source), undefined), '<span>Quote requests ready</span>');
});
test('opening a quote renders before any deletion result exists', () => {
  assert.equal(renderHook(loadHook(source), 'test-quote'), '<span>Quote requests ready</span>');
});
test('regression fixture reproduces the previous null-message crash', () => {
  const previous = source.replace("result && result.quoteId === quoteId", "result?.quoteId === quoteId");
  assert.notEqual(previous, source);
  assert.throws(() => renderHook(loadHook(previous), undefined), /Cannot read properties of null.*message/);
});
