import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';

type QuoteData = Record<string, unknown>;

interface AddressFields {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface SocialLinks {
  website: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  linkedin: string;
  googleBusiness: string;
}

interface ExternalCustomerLink {
  id: string;
  label: string;
  url: string;
}

export interface SavedCustomerContact {
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  preferred_contact: string | null;
  quote_data: QuoteData;
}

interface CustomerContactEditorProps {
  quoteRequestId: string;
  customerName: string;
  companyName: string;
  email: string;
  phone: string | null;
  preferredContact: string | null;
  quoteData: QuoteData | null;
  onSaved: (saved: SavedCustomerContact) => void;
}

const emptyAddress = (): AddressFields => ({
  line1: '', line2: '', city: '', state: '', postalCode: '', country: 'US'
});

const emptySocialLinks = (): SocialLinks => ({
  website: '', facebook: '', instagram: '', tiktok: '', youtube: '', linkedin: '', googleBusiness: ''
});

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const asText = (value: unknown) => typeof value === 'string' ? value : '';

const ensureUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const readAddress = (quoteData: QuoteData | null): AddressFields => {
  const source = asRecord(quoteData?.customerAddress || quoteData?.address);
  return {
    line1: asText(source.line1 || source.street || source.address1),
    line2: asText(source.line2 || source.unit || source.address2),
    city: asText(source.city),
    state: asText(source.state),
    postalCode: asText(source.postalCode || source.zip || source.zipCode),
    country: asText(source.country) || 'US'
  };
};

const readSocialLinks = (quoteData: QuoteData | null): SocialLinks => {
  const source = asRecord(quoteData?.socialLinks || quoteData?.social_links);
  return {
    website: asText(source.website || quoteData?.website),
    facebook: asText(source.facebook),
    instagram: asText(source.instagram),
    tiktok: asText(source.tiktok),
    youtube: asText(source.youtube),
    linkedin: asText(source.linkedin),
    googleBusiness: asText(source.googleBusiness || source.google_business)
  };
};

const readExternalLinks = (quoteData: QuoteData | null): ExternalCustomerLink[] => {
  const source = Array.isArray(quoteData?.externalLinks) ? quoteData.externalLinks : [];
  return source.map((item) => {
    const link = asRecord(item);
    return {
      id: asText(link.id) || crypto.randomUUID(),
      label: asText(link.label),
      url: asText(link.url)
    };
  });
};

const formatAddress = (address: AddressFields) => [
  address.line1,
  address.line2,
  [address.city, address.state].filter(Boolean).join(', '),
  address.postalCode,
  address.country && address.country !== 'US' ? address.country : ''
].filter(Boolean).join(' · ');

const SOCIAL_FIELDS: Array<{ key: keyof SocialLinks; label: string; placeholder: string }> = [
  { key: 'website', label: 'Website', placeholder: 'company.com' },
  { key: 'facebook', label: 'Facebook', placeholder: 'facebook.com/company' },
  { key: 'instagram', label: 'Instagram', placeholder: 'instagram.com/company' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'tiktok.com/@company' },
  { key: 'youtube', label: 'YouTube', placeholder: 'youtube.com/@company' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/company/...' },
  { key: 'googleBusiness', label: 'Google Business', placeholder: 'Google Maps or business profile URL' }
];

export function CustomerContactEditor({
  quoteRequestId,
  customerName,
  companyName: initialCompanyName,
  email,
  phone,
  preferredContact,
  quoteData,
  onSaved
}: CustomerContactEditorProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(customerName);
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [customerEmail, setCustomerEmail] = useState(email);
  const [customerPhone, setCustomerPhone] = useState(phone || '');
  const [contactPreference, setContactPreference] = useState(preferredContact || 'email');
  const [address, setAddress] = useState<AddressFields>(emptyAddress);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(emptySocialLinks);
  const [externalLinks, setExternalLinks] = useState<ExternalCustomerLink[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(customerName);
    setCompanyName(initialCompanyName);
    setCustomerEmail(email);
    setCustomerPhone(phone || '');
    setContactPreference(preferredContact || 'email');
    setAddress(readAddress(quoteData));
    setSocialLinks(readSocialLinks(quoteData));
    setExternalLinks(readExternalLinks(quoteData));
    setEditing(false);
    setMessage('');
    setError('');
  }, [quoteRequestId, customerName, initialCompanyName, email, phone, preferredContact, quoteData]);

  const visibleLinks = useMemo(() => [
    ...SOCIAL_FIELDS.map((field) => ({ label: field.label, url: socialLinks[field.key] })),
    ...externalLinks
  ].filter((link) => link.url.trim()), [socialLinks, externalLinks]);

  const updateExternalLink = (id: string, patch: Partial<ExternalCustomerLink>) => {
    setExternalLinks((current) => current.map((link) => link.id === id ? { ...link, ...patch } : link));
  };

  const save = async () => {
    if (!name.trim()) {
      setError('Customer name is required.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('Saving corrected customer information...');

    const cleanedAddress = Object.fromEntries(
      Object.entries(address).map(([key, value]) => [key, value.trim()])
    );
    const cleanedSocialLinks = Object.fromEntries(
      Object.entries(socialLinks).map(([key, value]) => [key, ensureUrl(value)])
    );
    const cleanedExternalLinks = externalLinks
      .map((link) => ({ id: link.id, label: link.label.trim(), url: ensureUrl(link.url) }))
      .filter((link) => link.label || link.url);

    const { data, error: saveError } = await supabase.rpc('update_customer_contact_details_admin', {
      p_quote_request_id: quoteRequestId,
      p_customer_name: name.trim(),
      p_company_name: companyName.trim(),
      p_customer_email: customerEmail.trim(),
      p_customer_phone: customerPhone.trim() || null,
      p_preferred_contact: contactPreference || null,
      p_customer_address: cleanedAddress,
      p_social_links: cleanedSocialLinks,
      p_external_links: cleanedExternalLinks
    });

    setSaving(false);
    if (saveError) {
      setError(saveError.message || 'Customer information could not be saved.');
      setMessage('');
      return;
    }

    const saved = data as SavedCustomerContact;
    onSaved(saved);
    setAddress(readAddress(saved.quote_data));
    setSocialLinks(readSocialLinks(saved.quote_data));
    setExternalLinks(readExternalLinks(saved.quote_data));
    setEditing(false);
    setMessage('Customer information updated. These structured fields are ready for the newer CRM view.');
  };

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="font-semibold text-slate-950">Customer & Company Information</h4>
          <p className="mt-1 text-xs leading-5 text-slate-600">Correct information received after the original form and keep customer links together.</p>
        </div>
        <Button type="button" size="sm" variant={editing ? 'outline' : 'default'} onClick={() => { setEditing((value) => !value); setError(''); setMessage(''); }}>
          {editing ? <X className="mr-2 h-4 w-4" /> : <Pencil className="mr-2 h-4 w-4" />}
          {editing ? 'Cancel Edit' : 'Edit Customer Info'}
        </Button>
      </div>

      {!editing && (
        <div className="mt-3 space-y-3 text-sm">
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">Address</p>
            <p className="mt-1 text-slate-900">{formatAddress(address) || 'No address added yet.'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">Website, social & ads</p>
            {visibleLinks.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {visibleLinks.map((link, index) => (
                  <a key={`${link.label}-${link.url}-${index}`} href={ensureUrl(link.url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50">
                    {link.label || 'Link'} <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            ) : <p className="mt-1 text-slate-600">No website or social links added yet.</p>}
          </div>
        </div>
      )}

      {editing && (
        <div className="mt-4 space-y-6">
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Customer name</Label><Input className="mt-1" value={name} onChange={(event) => setName(event.target.value)} /></div>
            <div><Label>Company</Label><Input className="mt-1" value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Company or organization" /></div>
            <div><Label>Email</Label><Input className="mt-1" type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} /></div>
            <div><Label>Phone</Label><Input className="mt-1" type="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} /></div>
            <div>
              <Label>Preferred contact</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={contactPreference} onChange={(event) => setContactPreference(event.target.value)}>
                <option value="email">Email</option><option value="phone">Phone call</option><option value="text">Text message</option>
              </select>
            </div>
          </div>

          <div>
            <h5 className="font-semibold text-slate-950">Address</h5>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2"><Label>Street address</Label><Input className="mt-1" value={address.line1} onChange={(event) => setAddress({ ...address, line1: event.target.value })} /></div>
              <div className="md:col-span-2"><Label>Suite / unit</Label><Input className="mt-1" value={address.line2} onChange={(event) => setAddress({ ...address, line2: event.target.value })} /></div>
              <div><Label>City</Label><Input className="mt-1" value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} /></div>
              <div><Label>State</Label><Input className="mt-1" value={address.state} onChange={(event) => setAddress({ ...address, state: event.target.value })} /></div>
              <div><Label>ZIP / postal code</Label><Input className="mt-1" value={address.postalCode} onChange={(event) => setAddress({ ...address, postalCode: event.target.value })} /></div>
              <div><Label>Country</Label><Input className="mt-1" value={address.country} onChange={(event) => setAddress({ ...address, country: event.target.value })} /></div>
            </div>
          </div>

          <div>
            <h5 className="font-semibold text-slate-950">Website & social profiles</h5>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {SOCIAL_FIELDS.map((field) => (
                <div key={field.key}><Label>{field.label}</Label><Input className="mt-1" value={socialLinks[field.key]} onChange={(event) => setSocialLinks({ ...socialLinks, [field.key]: event.target.value })} placeholder={field.placeholder} /></div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div><h5 className="font-semibold text-slate-950">Ads & other links</h5><p className="text-xs text-slate-600">Add campaign pages, ad previews, ordering links, review links, or anything else associated with this customer.</p></div>
              <Button type="button" size="sm" variant="outline" onClick={() => setExternalLinks((current) => [...current, { id: crypto.randomUUID(), label: '', url: '' }])}><Plus className="mr-2 h-4 w-4" />Add Link</Button>
            </div>
            <div className="mt-3 space-y-3">
              {externalLinks.map((link) => (
                <div key={link.id} className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,12rem)_1fr_auto] sm:items-end">
                  <div><Label>Label</Label><Input className="mt-1" value={link.label} onChange={(event) => updateExternalLink(link.id, { label: event.target.value })} placeholder="Facebook ad, menu, review..." /></div>
                  <div><Label>URL</Label><Input className="mt-1" value={link.url} onChange={(event) => updateExternalLink(link.id, { url: event.target.value })} placeholder="https://..." /></div>
                  <Button type="button" size="icon" variant="outline" aria-label="Remove link" onClick={() => setExternalLinks((current) => current.filter((item) => item.id !== link.id))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </div>

          <Button type="button" onClick={() => void save()} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'Saving...' : 'Save Customer Information'}</Button>
        </div>
      )}

      {message && <p className="mt-3 text-sm font-medium text-emerald-700">{message}</p>}
      {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}
