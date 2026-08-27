import { useEffect, useMemo, useState } from 'react';
import { Pencil, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

type PreferredContact = 'email' | 'text' | 'call';
type AdminRole = 'owner_admin' | 'staff' | 'sales_rep';

export interface EditableCustomerQuote {
  id: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  preferred_contact?: string | null;
  quote_data?: Record<string, unknown> | null;
}

export interface UpdatedCustomerInformation {
  id: string;
  customer_name: string;
  company_name: string;
  customer_email: string;
  customer_phone: string;
  preferred_contact: PreferredContact;
  quote_data: Record<string, unknown>;
}

interface CustomerInformationEditorProps {
  quote: EditableCustomerQuote;
  currentAdminRole?: AdminRole | null;
  onSaved: (updatedCustomer: UpdatedCustomerInformation) => void;
}

const COMPANY_KEYS = ['companyName', 'company_name', 'businessName', 'business_name'] as const;

const getCompanyName = (quote: EditableCustomerQuote) => {
  const quoteData = quote.quote_data || {};

  for (const key of COMPANY_KEYS) {
    const value = quoteData[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return '';
};

const normalizePreferredContact = (value?: string | null): PreferredContact => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'text' || normalized === 'call') return normalized;
  return 'email';
};

const CustomerInformationEditor = ({ quote, currentAdminRole, onSaved }: CustomerInformationEditorProps) => {
  const canEdit = currentAdminRole === 'owner_admin' || currentAdminRole === 'staff';
  const companyName = useMemo(() => getCompanyName(quote), [quote]);
  const [editing, setEditing] = useState(false);
  const [customerName, setCustomerName] = useState(quote.customer_name || '');
  const [company, setCompany] = useState(companyName);
  const [email, setEmail] = useState(quote.customer_email || '');
  const [phone, setPhone] = useState(quote.customer_phone || '');
  const [preferredContact, setPreferredContact] = useState<PreferredContact>(
    normalizePreferredContact(quote.preferred_contact)
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setCustomerName(quote.customer_name || '');
    setCompany(companyName);
    setEmail(quote.customer_email || '');
    setPhone(quote.customer_phone || '');
    setPreferredContact(normalizePreferredContact(quote.preferred_contact));
    setEditing(false);
    setMessage('');
    setErrorMessage('');
  }, [quote.id, quote.customer_name, quote.customer_email, quote.customer_phone, quote.preferred_contact, companyName]);

  const cancelEditing = () => {
    setCustomerName(quote.customer_name || '');
    setCompany(companyName);
    setEmail(quote.customer_email || '');
    setPhone(quote.customer_phone || '');
    setPreferredContact(normalizePreferredContact(quote.preferred_contact));
    setEditing(false);
    setErrorMessage('');
  };

  const saveCustomerInformation = async () => {
    if (!canEdit || saving) return;

    const nextCustomerName = customerName.trim();
    const nextCompany = company.trim();
    const nextEmail = email.trim();
    const nextPhone = phone.trim();

    setMessage('');
    setErrorMessage('');

    if (!nextCustomerName) {
      setErrorMessage('Customer name is required.');
      return;
    }

    if (!nextEmail || !nextEmail.includes('@')) {
      setErrorMessage('Enter a valid customer email address.');
      return;
    }

    if (nextPhone.replace(/\D/g, '').length < 7) {
      setErrorMessage('Enter a valid customer phone number.');
      return;
    }

    setSaving(true);

    const { data, error } = await supabase.rpc('update_quote_customer_information_admin', {
      p_quote_request_id: quote.id,
      p_customer_name: nextCustomerName,
      p_company_name: nextCompany,
      p_customer_email: nextEmail,
      p_customer_phone: nextPhone,
      p_preferred_contact: preferredContact
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message || 'Unable to save customer information.');
      return;
    }

    const updatedRow = Array.isArray(data) ? data[0] : data;
    if (!updatedRow) {
      setErrorMessage('Customer information saved, but the updated record could not be reloaded.');
      return;
    }

    const updatedCustomer: UpdatedCustomerInformation = {
      id: String(updatedRow.id || quote.id),
      customer_name: String(updatedRow.customer_name || nextCustomerName),
      company_name: String(updatedRow.company_name || nextCompany),
      customer_email: String(updatedRow.customer_email || nextEmail),
      customer_phone: String(updatedRow.customer_phone || nextPhone),
      preferred_contact: normalizePreferredContact(updatedRow.preferred_contact || preferredContact),
      quote_data:
        updatedRow.quote_data && typeof updatedRow.quote_data === 'object'
          ? (updatedRow.quote_data as Record<string, unknown>)
          : (quote.quote_data || {})
    };

    onSaved(updatedCustomer);
    setEditing(false);
    setMessage('Customer information saved.');
  };

  return (
    <div className="mb-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-950">Customer</h3>
        {canEdit && !editing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-2"
            onClick={() => {
              setEditing(true);
              setMessage('');
              setErrorMessage('');
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Customer
          </Button>
        )}
      </div>

      {editing && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Customer Name
              <Input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                autoComplete="name"
                disabled={saving}
              />
            </label>

            <label className="space-y-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Company <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span>
              <Input
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                autoComplete="organization"
                disabled={saving}
              />
            </label>

            <label className="space-y-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Email
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                disabled={saving}
              />
            </label>

            <label className="space-y-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Phone
              <Input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="tel"
                disabled={saving}
              />
            </label>

            <label className="space-y-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 md:col-span-2">
              Preferred Contact
              <select
                value={preferredContact}
                onChange={(event) => setPreferredContact(event.target.value as PreferredContact)}
                disabled={saving}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm normal-case tracking-normal ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="email">Email</option>
                <option value="text">Text</option>
                <option value="call">Call</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={cancelEditing} disabled={saving} className="gap-2">
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="button" onClick={saveCustomerInformation} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save Customer'}
            </Button>
          </div>
        </div>
      )}

      {message && <p className="text-sm font-medium text-emerald-700">{message}</p>}
      {errorMessage && <p className="text-sm font-medium text-red-700">{errorMessage}</p>}
    </div>
  );
};

export default CustomerInformationEditor;
