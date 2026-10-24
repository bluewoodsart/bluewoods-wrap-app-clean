import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import handler from '../api/visitor-conversation';
import { PGlite } from '@electric-sql/pglite';
import { conversationInput, conversationReply } from '../server/conversationInput';

test('HTTP handler validates requests, derives site, hashes secrets and returns retry errors', async () => {
  const savedEnv = { url: process.env.VITE_SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY, enabled: process.env.BWB_CONVERSATIONS_ENABLED };
  let submitted: Record<string, unknown> = {};
  let allowed = true, rateLimited = false;
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url?.startsWith('/rest/v1/bwb_conversation_sites')) return res.end(JSON.stringify(allowed ? [{ id: 'slapwrapz' }] : []));
    let body = ''; for await (const chunk of req) body += chunk;
    submitted = JSON.parse(body);
    if (rateLimited) { res.statusCode = 400; return res.end(JSON.stringify({ code: 'P0002', message: 'rate limit' })); }
    res.end(JSON.stringify({ reply: 'Saved', followUpSaved: true }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  process.env.VITE_SUPABASE_URL = `http://127.0.0.1:${address.port}`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-service-key';
  process.env.BWB_CONVERSATIONS_ENABLED = 'true';
  const body = { conversationId: randomUUID(), requestId: randomUUID(), token: 'a'.repeat(64), message: 'Hello' };
  const headers = { origin: 'https://slapwrapz.com', 'x-vercel-forwarded-for': '192.0.2.1' };
  async function call(request = { method: 'POST', headers, body: body as unknown }) {
    let status = 0, result: unknown;
    await handler(request, { setHeader() {}, status(code) { status = code; return { json(value) { result = value; } }; } });
    return { status, result };
  }
  try {
    assert.equal((await call({ method: 'GET', headers, body })).status, 405);
    assert.equal((await call({ method: 'POST', headers, body: { ...body, brandKey: 'other' } })).status, 400);
    assert.equal((await call({ method: 'POST', headers, body: { ...body, message: 'x'.repeat(17000) } })).status, 413);
    assert.equal((await call()).status, 200);
    assert.equal(submitted.p_site, 'slapwrapz');
    assert.notEqual(submitted.p_token_hash, body.token);
    assert.equal(JSON.stringify(submitted).includes(body.token), false);
    assert.equal(JSON.stringify(submitted).includes('192.0.2.1'), false);
    allowed = false; assert.equal((await call()).status, 403);
    allowed = true; rateLimited = true; assert.equal((await call()).status, 429);
    process.env.BWB_CONVERSATIONS_ENABLED = 'false'; assert.equal((await call()).status, 503);
  } finally {
    for (const [key, value] of Object.entries({ VITE_SUPABASE_URL: savedEnv.url, SUPABASE_SERVICE_ROLE_KEY: savedEnv.key, BWB_CONVERSATIONS_ENABLED: savedEnv.enabled })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('visitor input is bounded and cannot nominate a brand, role or CRM identity', () => {
  const valid = { conversationId: randomUUID(), requestId: randomUUID(), token: 'a'.repeat(64), message: 'I need more customers' };
  assert.equal(conversationInput.safeParse(valid).success, true);
  for (const invalid of [ { ...valid, site: 'other' }, { ...valid, message: 'x'.repeat(2001) },
    { ...valid, contact: { name: 'Pat', email: 'pat@example.com', requestFollowUp: false } },
    { ...valid, contact: { name: 'Pat', email: 'invalid', requestFollowUp: true } },
    { ...valid, attribution: { landingPath: '/', token: 'private' } } ]) {
    assert.equal(conversationInput.safeParse(invalid).success, false);
  }
  assert.match(conversationReply('Just looking', false), /explore/i);
  assert.match(conversationReply('I need signs', true), /saved/i);
});

test('database intake, isolation, CRM handoff, retries, rate limit and retention', async t => {
  const db = new PGlite();
  const owner = randomUUID(), staff = randomUUID(), outsider = randomUUID();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated;
    create table public.admin_users(id uuid primary key, auth_user_id uuid, role text, is_active boolean);
    create table public.quote_requests(id uuid primary key default gen_random_uuid(), customer_name text not null,
      customer_email text not null, customer_phone text not null, preferred_contact text not null,
      product_type text, source text, quote_data jsonb, status text, assigned_rep_name text);
    insert into public.admin_users values ('${owner}','${owner}','owner_admin',true),
      ('${staff}','${staff}','staff',true),('${outsider}','${outsider}','staff',true);
  `);
  await db.exec(readFileSync(new URL('../supabase/migrations/20261024203620_bwb_visitor_conversations.sql', import.meta.url), 'utf8'));
  await db.exec(`update public.bwb_conversation_sites set enabled=true;
    insert into public.bwb_conversation_sites values ('partner','partner','partner','Partner',array['https://partner.example'],true,false);
    insert into public.bwb_conversation_members values ('slapwrapz','${staff}');`);
  const id = randomUUID();
  const payload = { conversationId: id, requestId: randomUUID(), message: 'Need more customers',
    attribution: { utmSource: 'vehicle-qr' }, reportedSearch: 'sign shop near me', reportedSource: 'Google' };
  async function ingest(p = payload, site = 'slapwrapz', token = 'a'.repeat(64), rate = 'b'.repeat(64)) {
    const result = await db.query<{ result: { reply: string; followUpSaved: boolean } }>(
      'select public.ingest_bwb_conversation($1,$2,$3,$4::jsonb,$5) as result', [site, token, rate, JSON.stringify(p), 'Saved reply']);
    return result.rows[0].result;
  }
  async function asRole(role: string, uid: string, sql: string) {
    await db.exec('begin');
    try {
      await db.exec(`set local role ${role}; set local "request.jwt.claim.sub" = '${uid}'`);
      return await db.query(sql);
    } finally { await db.exec('rollback'); }
  }
  await t.test('anonymous conversations do not create CRM records', async () => {
    assert.equal((await ingest()).followUpSaved, false);
    assert.equal((await db.query('select * from public.quote_requests')).rows.length, 0);
  });
  await t.test('retry records one exchange and preserves original attribution', async () => {
    await ingest();
    assert.equal((await db.query('select * from public.bwb_conversation_messages')).rows.length, 1);
    await ingest({ ...payload, requestId: randomUUID(), attribution: { utmSource: 'changed' } });
    const { rows } = await db.query<{ attribution: { utmSource: string } }>('select attribution from public.bwb_visitor_conversations');
    assert.equal(rows[0].attribution.utmSource, 'vehicle-qr');
  });
  await t.test('wrong token, wrong site and public reads are denied', async () => {
    await assert.rejects(ingest(payload, 'slapwrapz', 'c'.repeat(64)), /unavailable/);
    await assert.rejects(ingest(payload, 'partner'), /unavailable/);
    await assert.rejects(asRole('anon', '', 'select * from public.bwb_visitor_conversations'), /permission denied/);
    await assert.rejects(asRole('anon', '', `select public.ingest_bwb_conversation('slapwrapz','','','{}','')`), /permission denied/);
    await assert.rejects(asRole('authenticated', staff, `select public.ingest_bwb_conversation('slapwrapz','','','{}','')`), /permission denied/);
  });
  await t.test('staff read only explicitly assigned sites; owners can read all', async () => {
    await ingest({ ...payload, conversationId: randomUUID(), requestId: randomUUID() }, 'partner');
    assert.equal((await asRole('authenticated', staff, 'select * from public.bwb_visitor_conversations')).rows.length, 1);
    assert.equal((await asRole('authenticated', outsider, 'select * from public.bwb_visitor_conversations')).rows.length, 0);
    assert.equal((await asRole('authenticated', owner, 'select * from public.bwb_visitor_conversations')).rows.length, 2);
    assert.equal((await asRole('authenticated', outsider, 'select * from public.bwb_conversation_messages')).rows.length, 0);
    await assert.rejects(asRole('authenticated', staff, "update public.bwb_conversation_sites set enabled=false"), /permission denied/);
  });
  const followUp = { ...payload, requestId: randomUUID(), contact: { name: 'Pat', email: 'pat@example.com', requestFollowUp: true } };
  await t.test('explicit follow-up creates exactly one linked CRM inquiry, including retries', async () => {
    assert.equal((await ingest(followUp)).followUpSaved, true);
    await ingest(followUp);
    await ingest({ ...followUp, requestId: randomUUID() });
    const { rows } = await db.query<{ source: string; product_type: string; quote_data: Record<string, unknown> }>('select * from public.quote_requests');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].source, 'website_conversation');
    assert.equal(rows[0].product_type, 'consultation');
    assert.equal(rows[0].quote_data.reportedSearch, 'sign shop near me');
    assert.equal(rows[0].quote_data.marketingConsent, false);
    assert.match(String(rows[0].quote_data.conversationTranscript), /Need more customers/);
  });
  await t.test('invalid contact rolls back the whole exchange', async () => {
    const before = (await db.query('select * from public.bwb_conversation_messages')).rows.length;
    await assert.rejects(ingest({ ...followUp, conversationId: randomUUID(), contact: { ...followUp.contact, requestFollowUp: false } } as typeof payload), /required/);
    assert.equal((await db.query('select * from public.bwb_conversation_messages')).rows.length, before);
  });
  await t.test('CRM outcomes enforce the conversation site scope', async () => {
    const sql = `select * from public.get_bwb_conversation_outcomes(array['${id}']::uuid[])`;
    assert.equal((await asRole('authenticated', owner, sql)).rows.length, 1);
    assert.equal((await asRole('authenticated', staff, sql)).rows.length, 1);
    assert.equal((await asRole('authenticated', outsider, sql)).rows.length, 0);
    await assert.rejects(asRole('anon', '', sql), /permission denied/);
  });
  await t.test('database limit is shared across server instances', async () => {
    await db.exec(`update bwb_private.conversation_rate_limits set requests=100 where bucket_key='${'b'.repeat(64)}'`);
    await assert.rejects(ingest({ ...payload, conversationId: randomUUID(), requestId: randomUUID() }), /try again later/);
    assert.equal((await ingest(followUp)).followUpSaved, true); // Successful retries still work.
  });
  await t.test('expired conversations cannot be read or appended; purge also removes CRM transcript', async () => {
    await db.exec(`update public.bwb_visitor_conversations set expires_at=now()-interval '1 day' where id='${id}'`);
    assert.equal((await asRole('authenticated', staff, 'select * from public.bwb_visitor_conversations')).rows.length, 0);
    assert.equal((await asRole('authenticated', staff, 'select * from public.bwb_conversation_messages')).rows.length, 0);
    await assert.rejects(ingest(), /unavailable/);
    await db.exec('select public.purge_expired_bwb_conversations()');
    const { rows } = await db.query<{ quote_data: Record<string, unknown> }>('select quote_data from public.quote_requests');
    assert.equal(rows[0].quote_data.conversationTranscript, undefined);
    assert.equal((await db.query(`select * from public.bwb_conversation_messages where conversation_id='${id}'`)).rows.length, 0);
  });
  await db.close();
});
