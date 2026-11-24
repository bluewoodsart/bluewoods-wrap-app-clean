const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const root = join(__dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const files = {
  form: 'src/components/admin/NewQuoteRequest.tsx',
  networking: 'src/components/admin/BusinessCardNetworking.tsx',
  admin: 'src/pages/Admin.tsx',
  status: 'src/pages/AdminStatus.tsx',
  migration: 'supabase/migrations/20261124223000_networking_quote_handoff.sql'
};

function harness(path, supabase) {
  const state = [];
  const effects = [];
  let index = 0;
  const react = {
    useState(initial) {
      const i = index++;
      if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial;
      return [state[i], (value) => { state[i] = typeof value === 'function' ? value(state[i]) : value; }];
    },
    useRef(current) {
      const i = index++;
      if (!(i in state)) state[i] = { current };
      return state[i];
    },
    useMemo(fn) { return fn(); },
    useEffect(fn) {
      const i = index++;
      if (!(i in state)) { effects.push(fn); state[i] = true; }
    }
  };
  const tag = (type, props) => ({ type, props });
  const source = ts.transpileModule(read(path), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true
  });
  assert.deepEqual(source.diagnostics, [], path + ' TSX syntax');
  const exports = {};
  vm.runInNewContext(source.outputText, {
    exports,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    window: { confirm: () => true },
    crypto: { randomUUID: () => 'generated-id' },
    require(mod) {
      if (mod === 'react') return react;
      if (mod === 'react/jsx-runtime') return { jsx: tag, jsxs: tag, Fragment: 'fragment' };
      if (mod === '@/lib/supabase') return { supabase };
      if (mod.endsWith('/NewQuoteRequest')) return { default: 'NetworkingQuoteDialog' };
      return new Proxy({}, { get: (_obj, key) => key });
    }
  });
  return {
    render(props) { index = 0; return exports.default(props); },
    async flushEffects() {
      for (const fn of effects.splice(0)) fn();
      await new Promise(resolve => setImmediate(resolve));
    }
  };
}

function walk(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(item => walk(item, predicate));
  if (!node || typeof node !== 'object') return [];
  return (predicate(node) ? [node] : []).concat(walk(node.props?.children, predicate));
}
function one(node, predicate) {
  const found = walk(node, predicate);
  assert.equal(found.length, 1);
  return found[0].props;
}

test('verified Networking selector opens a prefill, cancel does not update, and save opens the linked quote', async () => {
  let writes = 0;
  const lead = { id: 'lead-id', business_name: 'Example Co', contact_name: 'Jane', phone: null,
    email: 'jane@example.com', status: 'contacted', verification_status: 'verified', created_at: '2026-11-01' };
  const fake = {
    from() {
      return {
        select: () => ({ order: async () => ({ data: [lead], error: null }) }),
        update() { writes++; }
      };
    }
  };
  const h = harness(files.networking, fake);
  const visited = [];
  const props = { adminUserId: 'staff', onOpenQuote: (id) => visited.push(id) };
  h.render(props);
  await h.flushEffects();
  const getSelector = () => one(h.render(props), n => n.props?.id === 'networking-status-lead-id');
  assert.equal(getSelector().value, 'contacted');
  getSelector().onChange({ target: { value: 'quote' } });
  let dialog = one(h.render(props), n => n.type === 'NetworkingQuoteDialog');
  assert.equal(dialog.networkingLead.email, lead.email);
  assert.equal(dialog.networkingLead.businessName, lead.business_name);
  dialog.onNetworkingClose();
  assert.equal(getSelector().value, 'contacted');
  assert.equal(writes, 0);
  getSelector().onChange({ target: { value: 'quote' } });
  dialog = one(h.render(props), n => n.type === 'NetworkingQuoteDialog');
  dialog.onCreated({ id: 'quote-id' });
  assert.deepEqual(visited, ['quote-id']);
  assert.equal(walk(h.render(props), n => n.props?.id === 'networking-status-lead-id').length, 0);
  one(h.render(props), n => n.type === 'select' && n.props?.value === 'active').onChange({ target: { value: 'quote' } });
  assert.equal(getSelector().value, 'quote');
  one(h.render(props), n => n.type === 'Button' && n.props?.children === 'Open CRM quote').onClick();
  assert.deepEqual(visited, ['quote-id', 'quote-id']);
  assert.equal(writes, 0);
});

test('prefilled handoff uses only the one staff conversion RPC and accepts email-only contacts', async () => {
  const calls = [];
  const h = harness(files.form, { rpc: async (name, params) => {
    calls.push({ name, params });
    return { data: 'quote-id', error: null };
  } });
  const created = [];
  const props = { networkingLead: { id: 'lead-id', businessName: 'Example Co', contactName: null,
    email: 'jane@example.com', phone: null }, onCreated: (row) => created.push(row.id) };
  let view = h.render(props);
  assert.equal(one(view, n => n.props?.id === 'new-quote-company').value, 'Example Co');
  assert.equal(one(view, n => n.props?.id === 'new-quote-email').value, 'jane@example.com');
  assert.equal(one(view, n => n.props?.id === 'new-quote-phone').required, false);
  assert.equal(calls.length, 0);
  one(view, n => n.props?.id === 'new-quote-notes').onChange({ target: { value: 'Storefront graphics' } });
  view = h.render(props);
  await one(view, n => n.type === 'form').onSubmit({ preventDefault() {} });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, 'convert_networking_lead_to_quote');
  assert.equal(calls[0].params.p_phone, '');
  assert.equal(calls[0].params.p_notes, 'Storefront graphics');
  assert.deepEqual(created, ['quote-id']);
});

test('handoff route and staff-only idempotent transaction remain wired', () => {
  const admin = read(files.admin);
  const status = read(files.status);
  const migration = read(files.migration);
  assert.match(admin, /tab: 'quotes', request: id/);
  assert.match(admin, /initialQuoteId=\{routeParams.get\('request'\)\}/);
  assert.match(status, /get_admin_quote_request_detail'[\s\S]{0,70}quote_request_id: initialQuoteId/);
  assert.match(migration, /require_active_admin_role\(array\['owner_admin', 'staff'\]\)/);
  assert.match(migration, /for update;[\s\S]*return v_lead.quote_request_id/);
  assert.match(migration, /insert into public.quote_internal_notes/);
  assert.match(migration, /from public, anon;\ngrant execute on function public.convert_networking_lead_to_quote/);
});
