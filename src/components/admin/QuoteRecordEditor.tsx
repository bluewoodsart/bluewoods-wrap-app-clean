import { useEffect, useMemo, useState } from 'react';
import { Pencil, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';

type PreferredContact = 'email' | 'text' | 'call';
type AdminRole = 'owner_admin' | 'staff' | 'sales_rep';
type QuoteData = Record<string, unknown>;
type FormState = Record<string, string>;
type SelectOption = { value: string; label: string };

export interface EditableQuoteRecord {
  id: string;
  quote_id?: string | null;
  product_type?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  preferred_contact?: string | null;
  quote_data?: QuoteData | null;
}

export interface UpdatedQuoteRecord {
  id: string;
  quote_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  preferred_contact: PreferredContact;
  product_type: string;
  quote_data: QuoteData;
}

interface QuoteRecordEditorProps {
  quote: EditableQuoteRecord;
  currentAdminRole?: AdminRole | null;
  onSaved: (updatedQuote: UpdatedQuoteRecord) => void;
}

const COMPANY_KEYS = ['companyName', 'company_name', 'businessName', 'business_name'] as const;

const asRecord = (value: unknown): QuoteData =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as QuoteData
    : {};

const getString = (record: QuoteData, keys: string | string[]) => {
  const keyList = Array.isArray(keys) ? keys : [keys];

  for (const key of keyList) {
    const value = record[key];
    if (value === null || value === undefined) continue;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  }

  return '';
};

const getCompanyName = (quoteData: QuoteData) => {
  for (const key of COMPANY_KEYS) {
    const value = quoteData[key];
    if (typeof value === 'string') return value;
  }
  return '';
};

const getProductType = (quote: EditableQuoteRecord) => {
  const storedProductType = quote.product_type?.trim().toLowerCase();
  const quoteDataProductType = getString(quote.quote_data || {}, 'productType').trim().toLowerCase();
  return storedProductType || quoteDataProductType || 'wrap';
};

const getProductLabel = (productType: string) => {
  if (productType === 'banner') return 'Banner';
  if (productType === 'sign' || productType === 'signage') return 'Signage';
  if (productType === 'decal' || productType === 'sticker') return 'Stickers & Decals';
  return 'Vehicle Wrap';
};

const normalizePreferredContact = (value?: string | null): PreferredContact => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'text' || normalized === 'call') return normalized;
  return 'email';
};

const cloneQuoteData = (quoteData: QuoteData | null | undefined): QuoteData => {
  try {
    return JSON.parse(JSON.stringify(quoteData || {})) as QuoteData;
  } catch {
    return {};
  }
};

const createFormState = (quote: EditableQuoteRecord): FormState => {
  const quoteData = quote.quote_data || {};
  const vehicle = asRecord(quoteData.vehicle);
  const banner = asRecord(quoteData.banner);
  const signage = asRecord(quoteData.signage || quoteData.sign);
  const sticker = asRecord(quoteData.sticker || quoteData.decal);

  return {
    customerName: quote.customer_name || '',
    companyName: getCompanyName(quoteData),
    customerEmail: quote.customer_email || '',
    customerPhone: quote.customer_phone || '',
    preferredContact: normalizePreferredContact(quote.preferred_contact),

    vehicleType: getString(quoteData, ['vehicleType', 'vehicle_type']),
    vehicleYear: getString(vehicle, 'year') || getString(quoteData, ['vehicleYear', 'vehicle_year']),
    vehicleMake: getString(vehicle, 'make') || getString(quoteData, ['vehicleMake', 'vehicle_make']),
    vehicleModel: getString(vehicle, 'model') || getString(quoteData, ['vehicleModel', 'vehicle_model']),
    manualVehicleDescription: getString(quoteData, [
      'manualVehicleDescription',
      'customVehicleDescription',
      'otherVehicleDescription'
    ]),
    selectedService: getString(quoteData, ['selectedService', 'service', 'wrapType']),
    budget: getString(quoteData, ['budget', 'budget_range']),
    artworkStatus: getString(quoteData, ['artworkStatus', 'hasArtwork']),
    projectNotes: getString(quoteData, ['goal', 'notes', 'projectNotes']),

    bannerWidth: getString(banner, 'width'),
    bannerHeight: getString(banner, 'height'),
    bannerUnit: getString(banner, 'unit') || 'inches',
    bannerQuantity: getString(banner, 'quantity'),
    bannerIndoorOutdoor: getString(banner, 'indoorOutdoor'),
    bannerSides: getString(banner, 'sides'),
    bannerGrommets: getString(banner, 'grommets'),
    bannerHemmedEdges: getString(banner, 'hemmedEdges'),
    bannerPolePockets: getString(banner, 'polePockets'),
    bannerMaterialPreference: getString(banner, 'materialPreference'),
    bannerDesignNeeded: getString(banner, 'designNeeded'),
    bannerDeadline: getString(banner, 'deadline'),
    bannerDeliveryMethod: getString(banner, 'deliveryMethod'),
    bannerText: getString(banner, 'bannerText'),
    bannerBrandColors: getString(banner, 'brandColors'),
    bannerPlacementNotes: getString(banner, 'placementNotes'),
    bannerAiDesignPrompt: getString(banner, 'aiDesignPrompt'),
    bannerNotes: getString(banner, 'notes'),

    signMaterial: getString(signage, 'material'),
    signWidth: getString(signage, 'width'),
    signHeight: getString(signage, 'height'),
    signUnit: getString(signage, 'unit') || 'inches',
    signQuantity: getString(signage, 'quantity'),
    signText: getString(signage, 'signText'),
    signNotes: getString(signage, 'notes'),

    decalType: getString(sticker, 'decalType'),
    decalMaterial: getString(sticker, 'material'),
    decalWidth: getString(sticker, 'width'),
    decalHeight: getString(sticker, 'height'),
    decalUnit: getString(sticker, 'unit') || 'inches',
    decalQuantity: getString(sticker, 'quantity'),
    decalSurface: getString(sticker, 'surface'),
    decalFinish: getString(sticker, 'finish'),
    decalText: getString(sticker, 'decalText'),
    decalNotes: getString(sticker, 'notes')
  };
};

const buildUpdatedQuoteData = (
  quote: EditableQuoteRecord,
  productType: string,
  form: FormState
): QuoteData => {
  const nextQuoteData = cloneQuoteData(quote.quote_data);

  for (const key of COMPANY_KEYS) delete nextQuoteData[key];
  nextQuoteData.companyName = form.companyName.trim();
  nextQuoteData.quoteId = quote.quote_id || getString(nextQuoteData, 'quoteId');
  nextQuoteData.productType = productType;

  if (productType === 'banner') {
    nextQuoteData.selectedService = getString(nextQuoteData, 'selectedService') || 'Banner';
    nextQuoteData.banner = {
      ...asRecord(nextQuoteData.banner),
      width: form.bannerWidth.trim(),
      height: form.bannerHeight.trim(),
      unit: form.bannerUnit,
      quantity: form.bannerQuantity.trim(),
      indoorOutdoor: form.bannerIndoorOutdoor,
      sides: form.bannerSides,
      grommets: form.bannerGrommets,
      hemmedEdges: form.bannerHemmedEdges,
      polePockets: form.bannerPolePockets.trim(),
      materialPreference: form.bannerMaterialPreference.trim(),
      designNeeded: form.bannerDesignNeeded,
      deadline: form.bannerDeadline.trim(),
      deliveryMethod: form.bannerDeliveryMethod.trim(),
      bannerText: form.bannerText,
      brandColors: form.bannerBrandColors,
      placementNotes: form.bannerPlacementNotes,
      aiDesignPrompt: form.bannerAiDesignPrompt,
      notes: form.bannerNotes
    };
  } else if (productType === 'sign' || productType === 'signage') {
    nextQuoteData.selectedService = getString(nextQuoteData, 'selectedService') || 'Generic Signage';
    nextQuoteData.signage = {
      ...asRecord(nextQuoteData.signage || nextQuoteData.sign),
      material: form.signMaterial.trim(),
      width: form.signWidth.trim(),
      height: form.signHeight.trim(),
      unit: form.signUnit,
      quantity: form.signQuantity.trim(),
      signText: form.signText,
      notes: form.signNotes
    };
    delete nextQuoteData.sign;
  } else if (productType === 'decal' || productType === 'sticker') {
    nextQuoteData.selectedService = getString(nextQuoteData, 'selectedService') || 'Stickers & Decals';
    nextQuoteData.sticker = {
      ...asRecord(nextQuoteData.sticker || nextQuoteData.decal),
      decalType: form.decalType.trim(),
      material: form.decalMaterial.trim(),
      width: form.decalWidth.trim(),
      height: form.decalHeight.trim(),
      unit: form.decalUnit,
      quantity: form.decalQuantity.trim(),
      surface: form.decalSurface.trim(),
      finish: form.decalFinish.trim(),
      decalText: form.decalText,
      notes: form.decalNotes
    };
    delete nextQuoteData.decal;
  } else {
    nextQuoteData.vehicleType = form.vehicleType.trim();
    nextQuoteData.vehicle = {
      ...asRecord(nextQuoteData.vehicle),
      year: form.vehicleYear.trim(),
      make: form.vehicleMake.trim(),
      model: form.vehicleModel.trim()
    };
    nextQuoteData.manualVehicleDescription = form.manualVehicleDescription.trim();
    nextQuoteData.selectedService = form.selectedService.trim();
    nextQuoteData.budget = form.budget.trim();
    nextQuoteData.hasArtwork = form.artworkStatus;
    nextQuoteData.artworkStatus = form.artworkStatus;
    nextQuoteData.goal = form.projectNotes;
  }

  return nextQuoteData;
};

const QuoteRecordEditor = ({ quote, currentAdminRole, onSaved }: QuoteRecordEditorProps) => {
  const canEdit = currentAdminRole === 'owner_admin' || currentAdminRole === 'staff';
  const productType = useMemo(() => getProductType(quote), [quote]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(() => createFormState(quote));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setForm(createFormState(quote));
    setEditing(false);
    setMessage('');
    setErrorMessage('');
  }, [quote.id, quote.customer_name, quote.customer_email, quote.customer_phone, quote.preferred_contact, quote.product_type, quote.quote_data]);

  const updateField = (field: string, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setMessage('');
    setErrorMessage('');
  };

  const cancelEditing = () => {
    setForm(createFormState(quote));
    setEditing(false);
    setMessage('');
    setErrorMessage('');
  };

  const saveQuoteRecord = async () => {
    if (!canEdit || saving) return;

    const customerName = form.customerName.trim();
    const customerEmail = form.customerEmail.trim();
    const customerPhone = form.customerPhone.trim();
    const preferredContact = normalizePreferredContact(form.preferredContact);

    if (!customerName) {
      setErrorMessage('Customer name is required.');
      return;
    }

    if (!customerEmail || !customerEmail.includes('@')) {
      setErrorMessage('Enter a valid customer email address.');
      return;
    }

    if (customerPhone.replace(/\D/g, '').length < 7) {
      setErrorMessage('Enter a valid customer phone number.');
      return;
    }

    const nextQuoteData = buildUpdatedQuoteData(quote, productType, form);

    setSaving(true);
    setMessage('');
    setErrorMessage('');

    const { data, error } = await supabase.rpc('update_quote_record_admin', {
      p_quote_request_id: quote.id,
      p_customer_name: customerName,
      p_customer_email: customerEmail,
      p_customer_phone: customerPhone,
      p_preferred_contact: preferredContact,
      p_quote_data: nextQuoteData
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message || 'Unable to save this quote.');
      return;
    }

    const updatedRow = Array.isArray(data) ? data[0] : data;
    if (!updatedRow) {
      setErrorMessage('The quote saved, but the updated record could not be reloaded.');
      return;
    }

    const updatedQuote: UpdatedQuoteRecord = {
      id: String(updatedRow.id || quote.id),
      quote_id: updatedRow.quote_id ? String(updatedRow.quote_id) : quote.quote_id || null,
      customer_name: String(updatedRow.customer_name || customerName),
      customer_email: String(updatedRow.customer_email || customerEmail),
      customer_phone: String(updatedRow.customer_phone || customerPhone),
      preferred_contact: normalizePreferredContact(updatedRow.preferred_contact || preferredContact),
      product_type: String(updatedRow.product_type || productType),
      quote_data:
        updatedRow.quote_data && typeof updatedRow.quote_data === 'object'
          ? updatedRow.quote_data as QuoteData
          : nextQuoteData
    };

    onSaved(updatedQuote);
    setEditing(false);
    setMessage('Quote changes saved to the CRM.');
  };

  const field = (label: string, key: string, options?: { type?: string; placeholder?: string; className?: string }) => (
    <label className={`space-y-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 ${options?.className || ''}`}>
      {label}
      <Input
        type={options?.type || 'text'}
        value={form[key] || ''}
        placeholder={options?.placeholder}
        onChange={(event) => updateField(key, event.target.value)}
        disabled={saving}
        className="normal-case tracking-normal"
      />
    </label>
  );

  const textArea = (label: string, key: string, rows = 3, className = '') => (
    <label className={`space-y-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 ${className}`}>
      {label}
      <Textarea
        value={form[key] || ''}
        onChange={(event) => updateField(key, event.target.value)}
        disabled={saving}
        rows={rows}
        className="normal-case tracking-normal"
      />
    </label>
  );

  const selectField = (label: string, key: string, options: SelectOption[], className = '') => {
    const value = form[key] || '';
    const includesCurrentValue = options.some((option) => option.value === value);

    return (
      <label className={`space-y-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 ${className}`}>
        {label}
        <select
          value={value}
          onChange={(event) => updateField(key, event.target.value)}
          disabled={saving}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm normal-case tracking-normal ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Not specified</option>
          {value && !includesCurrentValue && <option value={value}>{value}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    );
  };

  const renderProductFields = () => {
    if (productType === 'banner') {
      return (
        <div className="grid gap-4 md:grid-cols-3">
          {field('Width', 'bannerWidth')}
          {field('Height', 'bannerHeight')}
          {selectField('Unit', 'bannerUnit', [
            { value: 'inches', label: 'Inches' },
            { value: 'feet', label: 'Feet' }
          ])}
          {field('Quantity', 'bannerQuantity')}
          {selectField('Indoor / Outdoor', 'bannerIndoorOutdoor', [
            { value: 'indoor', label: 'Indoor' },
            { value: 'outdoor', label: 'Outdoor' }
          ])}
          {selectField('Sides', 'bannerSides', [
            { value: 'single-sided', label: 'Single-sided' },
            { value: 'double-sided', label: 'Double-sided' }
          ])}
          {selectField('Grommets', 'bannerGrommets', [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' }
          ])}
          {selectField('Hemmed Edges', 'bannerHemmedEdges', [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' }
          ])}
          {field('Pole Pockets', 'bannerPolePockets')}
          {field('Material Preference', 'bannerMaterialPreference')}
          {selectField('Design Needed', 'bannerDesignNeeded', [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
            { value: 'not_sure', label: 'Not sure' }
          ])}
          {field('Deadline', 'bannerDeadline', { type: 'date' })}
          {field('Delivery Method', 'bannerDeliveryMethod', { className: 'md:col-span-2' })}
          {textArea('Banner Text', 'bannerText', 3, 'md:col-span-3')}
          {textArea('Brand Colors', 'bannerBrandColors', 2, 'md:col-span-3')}
          {textArea('Placement Notes', 'bannerPlacementNotes', 3, 'md:col-span-3')}
          {textArea('AI / Design Prompt', 'bannerAiDesignPrompt', 3, 'md:col-span-3')}
          {textArea('Banner Notes', 'bannerNotes', 3, 'md:col-span-3')}
        </div>
      );
    }

    if (productType === 'sign' || productType === 'signage') {
      return (
        <div className="grid gap-4 md:grid-cols-3">
          {field('Material', 'signMaterial', { className: 'md:col-span-3' })}
          {field('Width', 'signWidth')}
          {field('Height', 'signHeight')}
          {selectField('Unit', 'signUnit', [
            { value: 'inches', label: 'Inches' },
            { value: 'feet', label: 'Feet' }
          ])}
          {field('Quantity', 'signQuantity')}
          {textArea('Sign Text', 'signText', 3, 'md:col-span-3')}
          {textArea('Sign Notes', 'signNotes', 3, 'md:col-span-3')}
        </div>
      );
    }

    if (productType === 'decal' || productType === 'sticker') {
      return (
        <div className="grid gap-4 md:grid-cols-3">
          {field('Decal Type', 'decalType')}
          {field('Material', 'decalMaterial', { className: 'md:col-span-2' })}
          {field('Width', 'decalWidth')}
          {field('Height', 'decalHeight')}
          {selectField('Unit', 'decalUnit', [
            { value: 'inches', label: 'Inches' },
            { value: 'feet', label: 'Feet' }
          ])}
          {field('Quantity', 'decalQuantity')}
          {field('Application Surface', 'decalSurface')}
          {field('Finish', 'decalFinish')}
          {textArea('Decal Text', 'decalText', 3, 'md:col-span-3')}
          {textArea('Decal Notes', 'decalNotes', 3, 'md:col-span-3')}
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-3">
        {field('Vehicle Type', 'vehicleType')}
        {field('Year', 'vehicleYear')}
        {field('Make', 'vehicleMake')}
        {field('Model', 'vehicleModel')}
        {field('Manual Vehicle Description', 'manualVehicleDescription', { className: 'md:col-span-2' })}
        {field('Service Requested', 'selectedService', { className: 'md:col-span-2' })}
        {field('Budget', 'budget')}
        {selectField('Artwork Status', 'artworkStatus', [
          { value: 'yes', label: 'Artwork ready' },
          { value: 'no', label: 'Needs design' },
          { value: 'not_sure', label: 'Not sure' }
        ], 'md:col-span-3')}
        {textArea('Project Notes', 'projectNotes', 4, 'md:col-span-3')}
      </div>
    );
  };

  return (
    <div className="mb-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Customer & Quote</h3>
          <p className="mt-0.5 text-xs text-slate-500">Open this record, correct the saved information, and update the same CRM quote.</p>
        </div>
        {canEdit && !editing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            onClick={() => {
              setEditing(true);
              setMessage('');
              setErrorMessage('');
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Quote
          </Button>
        )}
      </div>

      {editing && (
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50/60 p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Editing existing CRM record</p>
              <p className="mt-1 text-lg font-black text-slate-950">{quote.quote_id || quote.id}</p>
              <p className="mt-1 text-xs text-slate-600">Saving updates this quote. It does not create a second customer or order.</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-800 ring-1 ring-blue-200">
              {getProductLabel(productType)}
            </span>
          </div>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h4 className="mb-3 text-sm font-bold text-slate-950">Customer Information</h4>
            <div className="grid gap-4 md:grid-cols-2">
              {field('Customer Name', 'customerName')}
              {field('Company', 'companyName')}
              {field('Email', 'customerEmail', { type: 'email' })}
              {field('Phone', 'customerPhone', { type: 'tel' })}
              {selectField('Preferred Contact', 'preferredContact', [
                { value: 'email', label: 'Email' },
                { value: 'text', label: 'Text' },
                { value: 'call', label: 'Call' }
              ], 'md:col-span-2')}
            </div>
          </section>

          <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
            <h4 className="mb-3 text-sm font-bold text-slate-950">Quote Information</h4>
            {renderProductFields()}
          </section>

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={cancelEditing} disabled={saving} className="gap-2">
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="button" onClick={saveQuoteRecord} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save Quote Changes'}
            </Button>
          </div>
        </div>
      )}

      {message && <p className="text-sm font-medium text-emerald-700">{message}</p>}
      {errorMessage && <p className="text-sm font-medium text-red-700">{errorMessage}</p>}
    </div>
  );
};

export default QuoteRecordEditor;
