import { type FormEvent, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';

const SERVICES = [
  { label: 'Vehicle Wraps', type: 'wrap' },
  { label: 'Custom Banners', type: 'banner' },
  { label: 'Vehicle Magnets', type: 'sign' },
  { label: 'Stickers & Decals', type: 'decal' },
  { label: 'Business Signs', type: 'sign' },
  { label: 'Window Graphics', type: 'sign' },
  { label: 'Other Project', type: 'other' }
];
const emptyForm = () => ({
  name: '', company: '', email: '', phone: '', preferredContact: 'call',
  service: 'Vehicle Wraps', quantity: '1', dimensions: '', deadline: '', notes: ''
});

export default function NewQuoteRequest({ onCreated, draftOwnerId }: {
  draftOwnerId?: string;
  onCreated: (quote: Record<string, unknown>) => void;
}) {
  const draftKey = draftOwnerId ? 'bwb:new-quote:v1:' + draftOwnerId : null;
  const [restored] = useState(() => {
    try {
      const value = draftKey ? JSON.parse(localStorage.getItem(draftKey) || 'null') : null;
      if (!value || value.version !== 1 || !value.form) return null;
      const form = emptyForm();
      for (const key of Object.keys(form) as Array<keyof typeof form>) {
        if (typeof value.form[key] === 'string') form[key] = value.form[key];
      }
      if (!SERVICES.some(item => item.label === form.service)) form.service = 'Vehicle Wraps';
      if (!['call', 'text', 'email'].includes(form.preferredContact)) form.preferredContact = 'call';
      return { form, quoteId: typeof value.quoteId === 'string' ? value.quoteId : '', open: Boolean(value.open) };
    } catch { return null; }
  });
  const [open, setOpen] = useState(restored?.open ?? false);
  const [form, setForm] = useState(restored?.form ?? emptyForm());
  const [draftWarning, setDraftWarning] = useState('');
  const formRef = useRef(form);
  const openRef = useRef(open);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const quoteId = useRef(restored?.quoteId ?? '');
  const persist = (nextForm = formRef.current, nextOpen = openRef.current) => {
    if (!draftKey) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        version: 1, form: nextForm, open: nextOpen, quoteId: quoteId.current
      }));
      setDraftWarning('');
    } catch {
      setDraftWarning('This browser could not save the draft. Keep this page open until you save the quote.');
    }
  };
  const changeOpen = (next: boolean) => {
    if (pending.current) return;
    openRef.current = next;
    setOpen(next);
    persist(formRef.current, next);
  };
  const update = (key: keyof ReturnType<typeof emptyForm>, value: string) => {
    const next = { ...formRef.current, [key]: value };
    formRef.current = next;
    setForm(next);
    persist(next);
  };
  const clearDraft = () => {
    formRef.current = emptyForm();
    openRef.current = false;
    setForm(formRef.current);
    setOpen(false);
    quoteId.current = '';
    try { if (draftKey) localStorage.removeItem(draftKey); } catch {
      setDraftWarning('The stored draft could not be cleared.');
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
    if (!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ||
        form.phone.replace(/\D/g, '').length < 7 || !form.notes.trim()) {
      setError('Enter a customer name, valid email, phone number, and project description.');
      return;
    }
    if (!Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 1) {
      setError('Quantity must be a whole number of at least 1.');
      return;
    }
    pending.current = true;
    setSaving(true);
    setError('');
    const service = SERVICES.find(item => item.label === form.service)!;
    if (!quoteId.current) quoteId.current = 'ADMIN-' + crypto.randomUUID();
    persist();
    let saved: Record<string, unknown> | undefined;
    try {
      // Recover a saved request after an interrupted response before attempting another insert.
      const { data: existing, error: lookupError } = await supabase.rpc('get_admin_quote_requests');
      if (lookupError) throw lookupError;
      saved = existing?.find((row: { quote_id: string }) => row.quote_id === quoteId.current);
      if (!saved) {
        const { data, error: saveError } = await supabase.rpc('finalize_quote_request_public', {
          p_quote_id: quoteId.current,
          p_customer_name: form.name.trim(),
          p_customer_email: form.email.trim(),
          p_customer_phone: form.phone.trim(),
          p_preferred_contact: form.preferredContact,
          p_rep_slug: null, p_rep_email: null, p_assigned_rep_name: null,
          p_product_type: service.type,
          p_uploaded_files: [],
          p_quote_data: {
            intakeType: 'admin_manual', selectedService: service.label,
            companyName: form.company.trim(), businessName: form.company.trim(),
            quantity: Number(form.quantity), dimensions: form.dimensions.trim(),
            deadline: form.deadline, notes: form.notes.trim(),
            productType: service.type
          }
        });
        if (saveError) throw saveError;
        saved = data?.[0];
        if (!saved?.id) throw new Error('The save response could not be confirmed. Try again to check for the saved request.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message :
        (cause as { message?: string })?.message || 'Could not save the request. Your entries are still here.');
    } finally {
      pending.current = false;
      setSaving(false);
    }
    if (saved?.id) {
      clearDraft();
      onCreated(saved);
    }
  };

  return (
    <>
      <Button className="min-h-11" onClick={() => { setError(''); changeOpen(true); }}>
        <Plus className="mr-2 h-4 w-4" />New Quote Request
      </Button>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent onInteractOutside={event => event.preventDefault()} className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Quote Request</DialogTitle>
            <DialogDescription>Enter a customer and project to start a quote in your CRM. Add pricing, artwork, and rep assignment after saving. Saving does not send a customer email.</DialogDescription>
          </DialogHeader>
          <p role="status" className="text-xs text-slate-600">{draftWarning || 'Draft kept on this device until saved or discarded.'}</p>
          <form onSubmit={submit} className="space-y-4">
            <fieldset disabled={saving} className="space-y-4">
              <legend className="sr-only">Customer and project details</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1"><Label htmlFor="new-quote-name">Customer name *</Label><Input id="new-quote-name" autoComplete="name" required maxLength={200} value={form.name} onChange={e => update('name', e.target.value)} /></div>
                <div className="space-y-1"><Label htmlFor="new-quote-company">Business / company</Label><Input id="new-quote-company" autoComplete="organization" maxLength={200} value={form.company} onChange={e => update('company', e.target.value)} /></div>
                <div className="space-y-1"><Label htmlFor="new-quote-email">Email *</Label><Input id="new-quote-email" type="email" autoComplete="email" required maxLength={320} value={form.email} onChange={e => update('email', e.target.value)} /></div>
                <div className="space-y-1"><Label htmlFor="new-quote-phone">Phone *</Label><Input id="new-quote-phone" type="tel" autoComplete="tel" required minLength={7} maxLength={50} value={form.phone} onChange={e => update('phone', e.target.value)} /></div>
                <div className="space-y-1"><Label htmlFor="new-quote-contact">Preferred contact</Label><select id="new-quote-contact" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.preferredContact} onChange={e => update('preferredContact', e.target.value)}><option value="call">Call</option><option value="text">Text</option><option value="email">Email</option></select></div>
                <div className="space-y-1"><Label htmlFor="new-quote-service">Service</Label><select id="new-quote-service" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.service} onChange={e => update('service', e.target.value)}>{SERVICES.map(item => <option key={item.label}>{item.label}</option>)}</select></div>
                <div className="space-y-1"><Label htmlFor="new-quote-quantity">Quantity *</Label><Input id="new-quote-quantity" type="number" required min={1} step={1} value={form.quantity} onChange={e => update('quantity', e.target.value)} /></div>
                <div className="space-y-1"><Label htmlFor="new-quote-dimensions">Size / dimensions</Label><Input id="new-quote-dimensions" placeholder="e.g. 24 × 18 inches" maxLength={200} value={form.dimensions} onChange={e => update('dimensions', e.target.value)} /></div>
                <div className="space-y-1 sm:col-span-2"><Label htmlFor="new-quote-deadline">Requested completion date</Label><Input id="new-quote-deadline" type="date" value={form.deadline} onChange={e => update('deadline', e.target.value)} /></div>
              </div>
              <div className="space-y-1"><Label htmlFor="new-quote-notes">Project description *</Label><Textarea id="new-quote-notes" required maxLength={10000} rows={4} placeholder="What does the customer need? Include vehicle details, materials, artwork, or installation needs." value={form.notes} onChange={e => update('notes', e.target.value)} /></div>
            </fieldset>
            {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" disabled={saving} onClick={() => changeOpen(false)}>Close & Keep Draft</Button>
              <Button type="button" variant="ghost" disabled={saving} onClick={() => {
                if (window.confirm('Discard this unfinished quote?')) clearDraft();
              }}>Discard Draft</Button>
              <Button type="submit" disabled={saving} className="min-h-11">{saving ? 'Saving request…' : 'Save & Open Quote'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
