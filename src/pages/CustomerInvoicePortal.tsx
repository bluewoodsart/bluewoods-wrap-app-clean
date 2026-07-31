import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Printer, ShieldCheck } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface InvoiceLineItem {
  id: string;
  description: string;
  details: string;
  quantity: number;
  rate: number;
}

interface InvoiceData {
  lineItems: InvoiceLineItem[];
  depositPercent: number;
  depositDueDate: string;
  balanceDueDate: string;
  notes: string;
  terms: string;
  paypalUrl: string;
  projectDescription: string;
}

interface PublicInvoice {
  valid: boolean;
  invoice_data: InvoiceData;
  status: 'draft' | 'approved';
  order_number: string;
  customer_name: string;
  customer_company: string | null;
  project_description: string;
  approved_at: string | null;
}

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number.isFinite(value) ? value : 0);

const formatDate = (value: string) => {
  if (!value) return 'To be confirmed';
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .format(new Date(`${value}T00:00:00`));
};

export default function CustomerInvoicePortal() {
  const { token = '' } = useParams();
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadInvoice = async () => {
      setLoading(true);
      setError('');
      const { data, error: loadError } = await supabase.rpc('get_quote_invoice_public_v1', {
        p_token: token
      });

      if (!active) return;
      setLoading(false);
      if (loadError) {
        setError('This invoice link could not be checked. Please contact Trapstar Customs for a fresh link.');
        return;
      }

      const nextInvoice = data?.[0] as PublicInvoice | undefined;
      if (!nextInvoice?.valid) {
        setError('This invoice link is invalid or no longer available.');
        return;
      }
      setInvoice(nextInvoice);
    };

    void loadInvoice();
    return () => {
      active = false;
    };
  }, [token]);

  const subtotal = useMemo(
    () => invoice?.invoice_data.lineItems.reduce(
      (sum, item) => sum + Math.max(Number(item.quantity) || 0, 0) * Math.max(Number(item.rate) || 0, 0),
      0
    ) ?? 0,
    [invoice]
  );
  const depositPercent = Math.min(Math.max(Number(invoice?.invoice_data.depositPercent) || 0, 0), 100);
  const depositAmount = subtotal * depositPercent / 100;
  const remainingBalance = subtotal - depositAmount;
  const isApproved = invoice?.status === 'approved';
  const canPay = Boolean(isApproved && invoice?.invoice_data.paypalUrl && subtotal > 0);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4"><p className="font-semibold text-slate-700">Loading official quote...</p></main>;
  }

  if (error || !invoice) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="max-w-lg rounded-2xl border border-red-200 bg-white p-6 text-center shadow-lg">
          <h1 className="text-xl font-black text-slate-950">Invoice unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <p className="mt-4 text-sm font-semibold text-slate-900">Blue Woods Art LLC · 770-669-0861</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-200 px-3 py-4 sm:px-6 sm:py-8">
      <article id="customer-invoice" className="invoice-print mx-auto max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="border-b-[6px] border-orange-500 bg-slate-950 px-5 py-7 text-white sm:px-10 sm:py-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-2xl font-black tracking-tight sm:text-3xl">TRAPSTAR CUSTOMS</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-300">Powered by Blue Woods Art LLC</p>
            </div>
            <div className="sm:text-right">
              <h1 className="text-2xl font-black">QUOTE / INVOICE</h1>
              <p className="mt-1 text-sm text-slate-300">{invoice.order_number}</p>
            </div>
          </div>
        </header>

        {!isApproved && (
          <div className="bg-red-600 px-4 py-3 text-center text-sm font-black uppercase tracking-wide text-white">
            TEST MODE · Preview only · Payment disabled
          </div>
        )}

        <div className="space-y-7 p-5 sm:p-10">
          <section className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Legal billing entity</p>
              <h2 className="mt-2 text-lg font-black text-slate-950">Blue Woods Art LLC</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">305 Etowah Trace<br />Fayetteville, GA 30214<br />770-669-0861</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Prepared for</p>
              <h2 className="mt-2 text-lg font-black text-slate-950">{invoice.customer_company || invoice.customer_name}</h2>
              <p className="mt-1 text-sm text-slate-600">Attn: {invoice.customer_name}</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">{invoice.project_description}</p>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200">
            <div className="hidden grid-cols-[1fr_80px_120px_130px] bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-wide text-white sm:grid">
              <span>Description</span><span>Qty</span><span>Rate</span><span className="text-right">Amount</span>
            </div>
            {invoice.invoice_data.lineItems.map((item) => {
              const amount = Math.max(Number(item.quantity) || 0, 0) * Math.max(Number(item.rate) || 0, 0);
              return (
                <div key={item.id} className="grid gap-3 border-b border-slate-200 px-4 py-4 last:border-0 sm:grid-cols-[1fr_80px_120px_130px] sm:items-center">
                  <div><p className="font-black text-slate-950">{item.description}</p>{item.details && <p className="mt-1 text-xs text-slate-600">{item.details}</p>}</div>
                  <p className="text-sm"><span className="font-bold sm:hidden">Qty: </span>{item.quantity}</p>
                  <p className="text-sm"><span className="font-bold sm:hidden">Rate: </span>{formatMoney(item.rate)}</p>
                  <p className="text-sm font-black sm:text-right">{formatMoney(amount)}</p>
                </div>
              );
            })}
          </section>

          <section className="ml-auto max-w-md rounded-xl border border-orange-200 bg-orange-50 p-5">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt>Subtotal</dt><dd className="font-black">{formatMoney(subtotal)}</dd></div>
              <div className="flex justify-between gap-4"><dt>Deposit ({depositPercent}%)</dt><dd className="font-black">{formatMoney(depositAmount)}</dd></div>
              <div className="flex justify-between gap-4 border-t border-orange-200 pt-3 text-base"><dt className="font-black">Remaining balance</dt><dd className="font-black">{formatMoney(remainingBalance)}</dd></div>
            </dl>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-black uppercase text-slate-500">Deposit due</p><p className="mt-1 font-bold text-slate-950">{formatDate(invoice.invoice_data.depositDueDate)}</p></div>
            <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-black uppercase text-slate-500">Balance due</p><p className="mt-1 font-bold text-slate-950">{formatDate(invoice.invoice_data.balanceDueDate)}</p></div>
          </section>

          {(invoice.invoice_data.notes || invoice.invoice_data.terms) && (
            <section className="grid gap-5 sm:grid-cols-2">
              {invoice.invoice_data.notes && <div><h3 className="text-sm font-black uppercase text-slate-700">Project notes</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{invoice.invoice_data.notes}</p></div>}
              {invoice.invoice_data.terms && <div><h3 className="text-sm font-black uppercase text-slate-700">Terms & Conditions</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{invoice.invoice_data.terms}</p></div>}
            </section>
          )}

          <section className="invoice-actions space-y-3">
            {canPay ? (
              <Button asChild className="min-h-14 w-full bg-orange-600 text-base font-black text-white hover:bg-orange-500">
                <a href={invoice.invoice_data.paypalUrl} target="_blank" rel="noreferrer">
                  <CreditCard className="mr-2 h-5 w-5" />
                  Pay {formatMoney(depositAmount)} Deposit with PayPal
                </a>
              </Button>
            ) : (
              <Button type="button" disabled className="min-h-14 w-full text-base font-black">
                <ShieldCheck className="mr-2 h-5 w-5" />
                Payment Disabled During Testing
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => window.print()} className="min-h-12 w-full">
              <Printer className="mr-2 h-4 w-4" />
              Print or Save as PDF
            </Button>
            <p className="text-center text-xs text-slate-500">Payments are processed securely by PayPal. Work begins after the deposit is confirmed.</p>
          </section>
        </div>

        <footer className="border-t border-slate-200 bg-slate-50 px-5 py-5 text-center text-xs text-slate-600 sm:px-10">
          Trapstar Customs project services · Legal billing entity: Blue Woods Art LLC
        </footer>
      </article>
    </main>
  );
}
