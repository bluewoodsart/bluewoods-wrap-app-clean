import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

const categories = ['utilities', 'software', 'supplies', 'equipment', 'other'] as const;
const states = ['pending', 'posted', 'failed'] as const;
type Status = typeof states[number];
type Bill = { id: string; vendor: string; account_label: string; invoice_ref: string; category: string; amount_cents: number; bill_date: string; due_date: string | null };
type Payment = { id: string; bill_id: string; payment_ref: string; amount_cents: number; payment_date: string; status: Status };
const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const field = 'w-full rounded-md border bg-white px-3 py-2 text-sm';
function cents(value: string) {
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(value)) throw new Error('Enter a positive dollar amount with at most two decimal places.');
  const [whole, fraction = ''] = value.split('.');
  const n = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (n <= 0 || n > 2147483647) throw new Error('Enter an amount between $0.01 and $21,474,836.47.');
  return n;
}
const friendly = (err: unknown) => {
  if (typeof err === 'object' && err !== null && 'code' in err && err.code === '23505') return 'This reference is already on file. Check the existing entry before adding another.';
  return err instanceof Error ? err.message : 'BWB could not verify the save. Refresh and check for the entry before retrying.';
};

export default function BillsExpenses() {
  const [ledger, setLedger] = useState<{ bills: Bill[]; payments: Payment[] } | null>(null);
  const [loadProblem, setLoadProblem] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const load = useCallback(async () => {
    const allRows = async <T,>(table: string, columns: string, dateColumn: string) => {
      const rows: T[] = [];
      const seen = new Set<string>();
      for (;;) {
        const { error, data, count } = await supabase.from(table).select(columns, { count: 'exact' })
          .order(dateColumn, { ascending: false }).order('id').range(rows.length, rows.length + 249);
        if (error || !data || count == null) throw new Error('Could not read the entire ledger.');
        for (const row of data as unknown as (T & { id: string })[]) {
          if (seen.has(row.id)) throw new Error('The ledger changed during loading.');
          seen.add(row.id);
          rows.push(row);
        }
        if (rows.length === count) return rows;
        if (!data.length || rows.length > count) throw new Error('The ledger changed during loading.');
      }
    };
    try {
      const [bills, payments] = await Promise.all([
        allRows<Bill>('bwb_vendor_bills', 'id,vendor,account_label,invoice_ref,category,amount_cents,bill_date,due_date', 'bill_date'),
        allRows<Payment>('bwb_vendor_payments', 'id,bill_id,payment_ref,amount_cents,payment_date,status', 'payment_date'),
      ]);
      if (payments.some(payment => !bills.some(bill => bill.id === payment.bill_id))) throw new Error('The ledger changed during loading.');
      setLoadProblem(false);
      setLedger({ bills, payments });
    } catch {
      setLedger(null);
      setLoadProblem(true);
      return false;
    }
    return true;
  }, []);
  useEffect(() => { void load(); }, [load]);

  const run = async (write: () => Promise<void>, success: string) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setNotice('');
    try {
      await write();
      const refreshed = await load();
      setNotice(refreshed ? success : 'Saved, but the ledger could not refresh. Reload before making another entry.');
    } catch (err) {
      setNotice(friendly(err));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const saveBill = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) ?? '').trim();
    void run(async () => {
      const { error } = await supabase.from('bwb_vendor_bills').insert({
        vendor: value('vendor'), invoice_ref: value('reference'), account_label: value('account'),
        category: value('category'), amount_cents: cents(value('amount')),
        bill_date: value('date'), due_date: value('due') || null,
      }).select('id').single();
      if (error) throw error;
      form.reset();
    }, 'Bill recorded. No payment was made.');
  };
  const savePayment = (event: FormEvent<HTMLFormElement>, billId: string) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) ?? '').trim();
    void run(async () => {
      const { error } = await supabase.from('bwb_vendor_payments').insert({
        bill_id: billId, payment_ref: value('reference'), amount_cents: cents(value('amount')),
        payment_date: value('date'), status: value('status'),
      }).select('id').single();
      if (error) throw error;
      form.reset();
    }, 'Payment record saved. No money was moved.');
  };
  const resolvePayment = (payment: Payment, status: 'posted' | 'failed') => {
    void run(async () => {
      const { error } = await supabase.from('bwb_vendor_payments').update({ status })
        .eq('id', payment.id).eq('status', 'pending').select('id,status').single();
      if (error) throw error;
    }, status === 'posted' ? 'Payment marked posted.' : 'Payment marked failed.');
  };

  return <div className="space-y-4">
    <Card>
      <CardHeader><CardTitle>Bills &amp; Expenses</CardTitle>
        <p className="text-sm text-muted-foreground">Owner only. Record shop bills and payments made elsewhere. This does not pay bills, file taxes, or change quote prices.</p>
      </CardHeader>
      <CardContent>
        {notice && <p role="status" className="mb-3 text-sm">{notice}</p>}
        {loadProblem ? <div role="alert" className="space-y-2"><p>The ledger is unavailable. No bill or payment was sent.</p><Button variant="outline" onClick={() => void load()}>Retry loading</Button></div>
          : !ledger ? <p role="status">Loading bills…</p>
          : <form onSubmit={saveBill} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label>Vendor<input className={field} name="vendor" required maxLength={120} /></label>
            <label>Account nickname (optional)<input className={field} name="account" maxLength={120} /></label>
            <label>Invoice or bill reference<input className={field} name="reference" required maxLength={120} /></label>
            <label>Category<select className={field} name="category" defaultValue="utilities">{categories.map(x => <option key={x} value={x}>{x}</option>)}</select></label>
            <label>Bill amount (USD)<input className={field} name="amount" inputMode="decimal" required /></label>
            <label>Bill date<input className={field} name="date" type="date" required /></label>
            <label>Due date (optional)<input className={field} name="due" type="date" /></label>
            <div className="flex items-end"><Button type="submit" disabled={busy}>Record bill</Button></div>
            <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">Use a short account nickname. Do not enter card numbers, bank details, or passwords.</p>
          </form>}
      </CardContent>
    </Card>
    {ledger && <section aria-label="Recorded bills" className="space-y-3">
      {ledger.bills.length === 0 && <p className="text-sm text-muted-foreground">No bills recorded yet.</p>}
      {ledger.bills.map(bill => {
        const rows = ledger.payments.filter(item => item.bill_id === bill.id);
        const posted = rows.filter(item => item.status === 'posted').reduce((sum, item) => sum + item.amount_cents, 0);
        const pending = rows.filter(item => item.status === 'pending').reduce((sum, item) => sum + item.amount_cents, 0);
        return <Card key={bill.id}>
          <CardHeader><CardTitle className="text-lg">{bill.vendor} {bill.account_label && <span className="text-sm font-normal">({bill.account_label})</span>}</CardTitle>
            <p className="text-sm text-muted-foreground">{bill.category} · Bill {bill.invoice_ref} · Issued {bill.bill_date}{bill.due_date ? ' · Due ' + bill.due_date : ''}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">Billed <strong>{money(bill.amount_cents)}</strong> · Posted {money(posted)} · Pending {money(pending)}</p>
            <p className="text-sm">{posted > bill.amount_cents ? 'Credit on this record ' + money(posted - bill.amount_cents) : 'Remaining against this bill ' + money(bill.amount_cents - posted)}</p>
            {rows.length > 0 && <ul className="space-y-2 text-sm">{rows.map(payment => <li key={payment.id} className="flex flex-wrap items-center gap-2">
              <span>{payment.payment_date} · {money(payment.amount_cents)} · {payment.status} · {payment.payment_ref}</span>
              {payment.status === 'pending' && <>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => resolvePayment(payment, 'posted')}>Mark posted</Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => resolvePayment(payment, 'failed')}>Mark failed</Button>
              </>}
            </li>)}</ul>}
            <details><summary className="cursor-pointer text-sm font-medium">Record a payment or attempt</summary>
              <form onSubmit={event => savePayment(event, bill.id)} className="mt-2 grid gap-3 sm:grid-cols-2">
                <label>Provider and payment reference<input className={field} name="reference" required maxLength={120} /></label>
                <label>Payment amount (USD)<input className={field} name="amount" required inputMode="decimal" /></label>
                <label>Payment date<input className={field} name="date" type="date" required /></label>
                <label>Status<select className={field} name="status" defaultValue="pending">{states.map(x => <option key={x} value={x}>{x}</option>)}</select></label>
                <Button type="submit" disabled={busy}>Record payment</Button>
              </form>
            </details>
          </CardContent>
        </Card>;
      })}
    </section>}
  </div>;
}
