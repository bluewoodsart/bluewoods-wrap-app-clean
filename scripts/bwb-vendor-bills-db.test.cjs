const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

const migration = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261125202300_owner_vendor_bills.sql'), 'utf8');

test('bills and partial payments stay owner-only; receipt retries and status transitions do not duplicate', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key);
      insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002'), ('00000000-0000-0000-0000-000000000003');
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
      $$;
      grant usage on schema auth to authenticated;
      create table public.admin_users(auth_user_id uuid, role text, is_active boolean);
      insert into public.admin_users values
        ('00000000-0000-0000-0000-000000000001','owner_admin',true),
        ('00000000-0000-0000-0000-000000000002','staff',true),
        ('00000000-0000-0000-0000-000000000003','owner_admin',false);
      create function public.is_current_user_owner_admin() returns boolean
      language sql stable security definer set search_path to 'public' as $$
        select exists (select 1 from public.admin_users au where au.auth_user_id = auth.uid()
          and au.role = 'owner_admin' and au.is_active = true)
      $$;
    `);
    await db.exec(migration);
    async function actor(n) {
      await db.exec(`reset role; set role authenticated; set "request.jwt.claim.sub" = '00000000-0000-0000-0000-00000000000${n}';`);
    }
    await actor(1);
    const insertBill = `insert into public.bwb_vendor_bills(vendor, account_label, invoice_ref, category, amount_cents, bill_date)
      values ($1, $2, $3, 'utilities', 10000, '2026-11-25') returning id`;
    const b1 = (await db.query(insertBill, ['Example Vendor', 'shop', 'B-100'])).rows[0].id;
    const b2 = (await db.query(insertBill, ['Example Vendor', 'shop', 'B-101'])).rows[0].id;
    await assert.rejects(db.query(insertBill, [' example vendor ', ' SHOP ', ' b-100 ']), { code: '23505' });
    const insertPayment = `insert into public.bwb_vendor_payments(bill_id, payment_ref, amount_cents, payment_date, status)
      values ($1, $2, 2500, '2026-11-25', $3) returning id`;
    const pay = (await db.query(insertPayment, [b1, 'Example Provider R-42', 'pending'])).rows[0].id;
    await assert.rejects(db.query(insertPayment, [b2, ' example provider r-42 ', 'posted']), { code: '23505' });
    await db.query(insertPayment, [b1, 'Example Provider R-43', 'failed']);
    assert.equal((await db.query("select count(*)::int as n from public.bwb_vendor_payments where status='posted'")).rows[0].n, 0);
    for (const n of [2,3]) {
      await actor(n);
      for (const table of ['bwb_vendor_bills','bwb_vendor_payments']) assert.equal((await db.query('select id from public.'+table)).rows.length, 0);
      await assert.rejects(db.query(insertBill, ['Example Vendor', '', 'B-200']), { code: '42501' });
      await assert.rejects(db.query(insertPayment, [b1, 'No access', 'posted']), { code: '42501' });
      assert.equal((await db.query("update public.bwb_vendor_payments set status='posted' where id=$1 returning id", [pay])).rows.length, 0);
    }
    await db.exec('reset role; set role anon;');
    await assert.rejects(db.query('select id from public.bwb_vendor_bills'), { code: '42501' });
    await assert.rejects(db.query('select id from public.bwb_vendor_payments'), { code: '42501' });
    await actor(1);
    const posting = await db.query("update public.bwb_vendor_payments set status='posted' where id=$1 returning status,status_changed_by", [pay]);
    assert.equal(posting.rows[0].status, 'posted');
    assert.equal(posting.rows[0].status_changed_by, '00000000-0000-0000-0000-000000000001');
    assert.equal((await db.query("update public.bwb_vendor_payments set status='failed' where id=$1 returning id", [pay])).rows.length, 0);
    await assert.rejects(db.query('update public.bwb_vendor_payments set amount_cents=6350 where id=$1', [pay]), { code: '42501' });
    await assert.rejects(db.query('delete from public.bwb_vendor_bills where id=$1', [b1]), { code: '42501' });
    assert.deepEqual((await db.query("select amount_cents from public.bwb_vendor_payments where status='posted'")).rows, [{ amount_cents: 2500 }]);
  } finally {
    await db.close();
  }
});
