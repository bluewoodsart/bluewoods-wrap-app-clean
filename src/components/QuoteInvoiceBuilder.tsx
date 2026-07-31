import { useEffect, useMemo, useState } from 'react';
import { Copy, Eye, Plus, Printer, Save, Send, Share2, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

interface InvoiceRecord {
  token: string;
  invoice_data: InvoiceData;
  status: 'draft' | 'approved';
  tested_at: string | null;
  approved_at: string | null;
}

interface QuoteInvoiceBuilderProps {
  quoteRequestId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCompany: string;
  projectDescription: string;
}

const today = new Date().toISOString().slice(0, 10);

const buildDefaultInvoice = (projectDescription: string): InvoiceData => ({
  lineItems: [
    {
      id: crypto.randomUUID(),
      description: 'Artwork Setup',
      details: 'AI-assisted artwork setup with two revisions included.',
      quantity: 1,
      rate: 0
    },
    {
      id: crypto.randomUUID(),
      description: 'Vehicle Wrap',
      details: 'Custom vehicle wrap production and installation as approved.',
      quantity: 1,
      rate: 0
    }
  ],
  depositPercent: 50,
  depositDueDate: today,
  balanceDueDate: '',
  notes: '',
  terms: 'A 50% deposit authorizes work to begin. Artwork setup includes two revisions. The remaining balance is due before vehicle pickup. Additional revisions or scope changes require written approval and may incur additional charges.',
  paypalUrl: '',
  projectDescription
});

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number.isFinite(value) ? value : 0);

const getShareMessage = (customerName: string, shareUrl: string) =>
  `Hi ${customerName}, here is the official Trapstar Customs quote from Blue Woods Art LLC. Please review the project details and use the secure PayPal deposit button when you are ready: ${shareUrl}`;

export function QuoteInvoiceBuilder({
  quoteRequestId,
  orderNumber,
  customerName,
  customerEmail,
  customerPhone,
  customerCompany,
  projectDescription
}: QuoteInvoiceBuilderProps) {
  const [invoice, setInvoice] = useState<InvoiceData>(() => buildDefaultInvoice(projectDescription));
  const [record, setRecord] = useState<InvoiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [testedConfirmed, setTestedConfirmed] = useState(false);

  const subtotal = useMemo(
    () => invoice.lineItems.reduce((sum, item) => sum + Math.max(item.quantity, 0) * Math.max(item.rate, 0), 0),
    [invoice.lineItems]
  );
  const depositAmount = subtotal * Math.min(Math.max(invoice.depositPercent, 0), 100) / 100;
  const remainingBalance = subtotal - depositAmount;
  const shareUrl = record?.token ? `${window.location.origin}/invoice/${record.token}` : '';
  const isApproved = record?.status === 'approved';

  useEffect(() => {
    let active = true;

    const loadInvoice = async () => {
      setLoading(true);
      const { data, error: loadError } = await supabase.rpc('get_quote_invoice_rep_v1', {
        p_quote_request_id: quoteRequestId
      });

      if (!active) return;
      setLoading(false);
      if (loadError) {
        setError(loadError.message);
        return;
      }

      const existing = data?.[0] as InvoiceRecord | undefined;
      if (existing) {
        setRecord(existing);
        setInvoice(existing.invoice_data);
      } else {
        setInvoice(buildDefaultInvoice(projectDescription));
      }
    };

    void loadInvoice();
    return () => {
      active = false;
    };
  }, [projectDescription, quoteRequestId]);

  const updateLineItem = (id: string, patch: Partial<InvoiceLineItem>) => {
    setInvoice((current) => ({
      ...current,
      lineItems: current.lineItems.map((item) => item.id === id ? { ...item, ...patch } : item)
    }));
    setMessage('');
    setError('');
  };

  const saveDraft = async () => {
    if (saving) return;
    setSaving(true);
    setMessage('Saving draft to this customer record...');
    setError('');

    const { data, error: saveError } = await supabase.rpc('upsert_quote_invoice_rep_v1', {
      p_quote_request_id: quoteRequestId,
      p_invoice_data: invoice
    });

    setSaving(false);
    if (saveError) {
      setMessage('');
      setError(saveError.message);
      return;
    }

    setRecord(data?.[0] as InvoiceRecord);
    setMessage('Draft saved. The invoice will reopen from this same customer record.');
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setMessage('Customer-facing preview link copied.');
  };

  const shareFromAndroid = async () => {
    if (!shareUrl || !isApproved) return;
    const text = getShareMessage(customerName, shareUrl);
    if (navigator.share) {
      await navigator.share({ title: `Quote ${orderNumber}`, text, url: shareUrl });
      return;
    }
    await navigator.clipboard.writeText(text);
    setMessage('Customer message copied. Paste it into your preferred app.');
  };

  const approveForSending = async () => {
    if (!testedConfirmed || saving) return;
    setSaving(true);
    setMessage('Approving tested invoice...');
    setError('');

    const { data, error: approvalError } = await supabase.rpc('approve_quote_invoice_rep_v1', {
      p_quote_request_id: quoteRequestId,
      p_confirm_tested: true
    });

    setSaving(false);
    if (approvalError) {
      setMessage('');
      setError(approvalError.message);
      return;
    }

    const approved = data?.[0];
    setRecord((current) => current ? {
      ...current,
      status: 'approved',
      token: approved.token,
      tested_at: approved.tested_at,
      approved_at: approved.approved_at
    } : current);
    setConfirmOpen(false);
    setTestedConfirmed(false);
    setMessage('Approved for manual sending. No email or text has been sent automatically.');
  };

  const emailHref = isApproved && shareUrl
    ? `mailto:${encodeURIComponent(customerEmail)}?subject=${encodeURIComponent(`Trapstar Customs quote ${orderNumber}`)}&body=${encodeURIComponent(getShareMessage(customerName, shareUrl))}`
    : '';
  const digits = customerPhone.replace(/\D/g, '');
  const textHref = isApproved && shareUrl && digits
    ? `sms:${digits}?&body=${encodeURIComponent(getShareMessage(customerName, shareUrl))}`
    : '';

  if (loading) {
    return <p className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm font-semibold text-orange-900">Loading invoice draft...</p>;
  }

  return (
    <section className="overflow-hidden rounded-2xl border-2 border-orange-300 bg-white shadow-lg">
      <div className="bg-slate-950 px-4 py-4 text-white sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">Trapstar Customs</p>
            <h3 className="mt-1 text-xl font-black">Official Quote / Invoice</h3>
            <p className="mt-1 text-xs text-slate-300">Billing entity: Blue Woods Art LLC · {orderNumber}</p>
          </div>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
            isApproved ? 'bg-emerald-400 text-emerald-950' : 'bg-red-500 text-white'
          }`}>
            {isApproved ? 'Approved to Send' : 'Test Mode'}
          </span>
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="font-bold text-slate-950">{customerCompany || customerName}</p>
          <p className="text-slate-600">Attn: {customerName}</p>
          <p className="text-slate-600">{projectDescription}</p>
        </div>

        <div>
          <label htmlFor={`invoice-project-${quoteRequestId}`} className="text-sm font-bold text-slate-900">Project description</label>
          <Input
            id={`invoice-project-${quoteRequestId}`}
            value={invoice.projectDescription}
            onChange={(event) => setInvoice((current) => ({ ...current, projectDescription: event.target.value }))}
            className="mt-2 min-h-12"
          />
        </div>

        <div className="space-y-4">
          {invoice.lineItems.map((item, index) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-slate-950">Line item {index + 1}</p>
                {invoice.lineItems.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setInvoice((current) => ({
                      ...current,
                      lineItems: current.lineItems.filter((candidate) => candidate.id !== item.id)
                    }))}
                    aria-label={`Remove ${item.description}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Input
                  value={item.description}
                  onChange={(event) => updateLineItem(item.id, { description: event.target.value })}
                  aria-label={`Line item ${index + 1} description`}
                  placeholder="Description"
                  className="min-h-12 bg-white"
                />
                <Input
                  value={item.details}
                  onChange={(event) => updateLineItem(item.id, { details: event.target.value })}
                  aria-label={`Line item ${index + 1} details`}
                  placeholder="Details"
                  className="min-h-12 bg-white"
                />
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Quantity
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(event) => updateLineItem(item.id, { quantity: Number(event.target.value) })}
                    className="mt-1 min-h-12 bg-white"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Rate
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.rate || ''}
                    onChange={(event) => updateLineItem(item.id, { rate: Number(event.target.value) })}
                    placeholder="0.00"
                    className="mt-1 min-h-12 bg-white"
                  />
                </label>
              </div>
              <p className="mt-3 text-right text-sm font-black text-slate-950">
                Amount: {formatMoney(Math.max(item.quantity, 0) * Math.max(item.rate, 0))}
              </p>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => setInvoice((current) => ({
              ...current,
              lineItems: [...current.lineItems, {
                id: crypto.randomUUID(),
                description: '',
                details: '',
                quantity: 1,
                rate: 0
              }]
            }))}
            className="min-h-12 w-full border-dashed"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Line Item
          </Button>
        </div>

        <div className="grid gap-4 rounded-xl border border-orange-200 bg-orange-50 p-4 sm:grid-cols-2">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-700">
            Deposit percentage
            <Input
              type="number"
              min="0"
              max="100"
              value={invoice.depositPercent}
              onChange={(event) => setInvoice((current) => ({ ...current, depositPercent: Number(event.target.value) }))}
              className="mt-1 min-h-12 bg-white"
            />
          </label>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <p><span className="block text-xs font-bold uppercase text-slate-600">Subtotal</span><strong>{formatMoney(subtotal)}</strong></p>
            <p><span className="block text-xs font-bold uppercase text-slate-600">Deposit</span><strong>{formatMoney(depositAmount)}</strong></p>
            <p className="col-span-2"><span className="block text-xs font-bold uppercase text-slate-600">Remaining balance</span><strong>{formatMoney(remainingBalance)}</strong></p>
          </div>
          <label className="text-xs font-bold uppercase tracking-wide text-slate-700">
            Deposit due date
            <Input
              type="date"
              value={invoice.depositDueDate}
              onChange={(event) => setInvoice((current) => ({ ...current, depositDueDate: event.target.value }))}
              className="mt-1 min-h-12 bg-white"
            />
          </label>
          <label className="text-xs font-bold uppercase tracking-wide text-slate-700">
            Balance due date
            <Input
              type="date"
              value={invoice.balanceDueDate}
              onChange={(event) => setInvoice((current) => ({ ...current, balanceDueDate: event.target.value }))}
              className="mt-1 min-h-12 bg-white"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold text-slate-900">
            Notes
            <Textarea
              value={invoice.notes}
              onChange={(event) => setInvoice((current) => ({ ...current, notes: event.target.value }))}
              rows={5}
              className="mt-2 bg-white"
              placeholder="Project notes, timing, or special instructions"
            />
          </label>
          <label className="text-sm font-bold text-slate-900">
            Terms & Conditions
            <Textarea
              value={invoice.terms}
              onChange={(event) => setInvoice((current) => ({ ...current, terms: event.target.value }))}
              rows={5}
              className="mt-2 bg-white"
            />
          </label>
        </div>

        <label className="block text-sm font-bold text-slate-900">
          PayPal payment link
          <Input
            type="url"
            inputMode="url"
            value={invoice.paypalUrl}
            onChange={(event) => setInvoice((current) => ({ ...current, paypalUrl: event.target.value }))}
            placeholder="https://www.paypal.com/..."
            className="mt-2 min-h-12 border-2 border-orange-300"
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">Paste the complete PayPal or PayPal.Me link. Saving any change returns this invoice to TEST MODE.</span>
        </label>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Button type="button" onClick={() => void saveDraft()} disabled={saving} className="min-h-12 bg-slate-950 font-bold text-white hover:bg-slate-800">
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button type="button" variant="outline" disabled={!shareUrl} onClick={() => window.open(shareUrl, '_blank', 'noopener,noreferrer')} className="min-h-12">
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button type="button" variant="outline" disabled={!shareUrl} onClick={() => window.open(shareUrl, '_blank', 'noopener,noreferrer')} className="min-h-12">
            <Printer className="mr-2 h-4 w-4" />
            Print / PDF
          </Button>
          <Button type="button" variant="outline" disabled={!shareUrl} onClick={() => void copyShareLink()} className="min-h-12">
            <Copy className="mr-2 h-4 w-4" />
            Copy Link
          </Button>
        </div>

        {!isApproved ? (
          <Button
            type="button"
            disabled={!shareUrl || saving}
            onClick={() => setConfirmOpen(true)}
            className="min-h-14 w-full bg-red-600 text-base font-black text-white hover:bg-red-500"
          >
            <ShieldCheck className="mr-2 h-5 w-5" />
            Manual Test & Send Confirmation
          </Button>
        ) : (
          <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
            <p className="font-black text-emerald-950">Approved for manual sending</p>
            <p className="mt-1 text-xs text-emerald-800">These buttons open the rep’s chosen app. SlapWrapz does not send automatically.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Button asChild className="min-h-12 bg-emerald-700 font-bold hover:bg-emerald-600">
                <a href={emailHref}><Send className="mr-2 h-4 w-4" />Email Customer</a>
              </Button>
              {textHref ? (
                <Button asChild variant="outline" className="min-h-12 border-emerald-300 bg-white font-bold text-emerald-800">
                  <a href={textHref}>Text Customer</a>
                </Button>
              ) : (
                <Button type="button" variant="outline" disabled className="min-h-12">No Phone Number</Button>
              )}
              <Button type="button" variant="outline" onClick={() => void shareFromAndroid()} className="min-h-12 border-emerald-300 bg-white font-bold text-emerald-800">
                <Share2 className="mr-2 h-4 w-4" />
                Android Share
              </Button>
              <Button type="button" variant="outline" onClick={() => void copyShareLink()} className="min-h-12 border-emerald-300 bg-white font-bold text-emerald-800">
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
            </div>
          </div>
        )}

        {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}
        {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm manual testing</DialogTitle>
            <DialogDescription>
              No message will be sent by this confirmation. It only unlocks the rep’s manual email, text, and Android Share buttons.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              Check the customer, line items, totals, dates, terms, PayPal link, and payment button in the preview before approval.
            </div>
            <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={testedConfirmed}
                onChange={(event) => setTestedConfirmed(event.target.checked)}
                className="mt-1 h-5 w-5"
              />
              <span className="text-sm font-semibold text-slate-900">I manually tested this invoice and its PayPal link on desktop and phone.</span>
            </label>
            <Button
              type="button"
              disabled={!testedConfirmed || saving}
              onClick={() => void approveForSending()}
              className="min-h-12 w-full bg-emerald-700 font-bold hover:bg-emerald-600"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Approve for Manual Sending
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
