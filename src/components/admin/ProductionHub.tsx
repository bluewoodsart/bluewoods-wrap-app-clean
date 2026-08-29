import { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  BriefcaseBusiness,
  CheckCircle2,
  Mail,
  MapPin,
  PackagePlus,
  Phone,
  Plus,
  Search,
  Send,
  Users,
  Wrench
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { getCrmClientLabel, loadCrmClients, type CrmClient } from '@/lib/crm';

type ProductionCategory = 'installer' | 'printer' | 'designer' | 'materials' | 'supplies' | 'labor';
type AccountingStatus = 'not-needed' | 'ready' | 'sent';

interface ProductionContact {
  id: string;
  name: string;
  company: string;
  category: ProductionCategory;
  phone: string;
  email: string;
  location: string;
  rate: string;
  notes: string;
  accountingStatus: AccountingStatus;
  createdAt: string;
  quoteRequestId: string | null;
}

interface ProductionContactRow {
  id: string;
  name: string;
  company: string;
  category: ProductionCategory;
  phone: string;
  email: string;
  location: string;
  rate: string;
  notes: string;
  accounting_status: AccountingStatus;
  created_at: string;
  quote_request_id: string | null;
}

const STORAGE_KEY = 'blue-woods-production-contacts-v1';
const categories: Array<{ id: ProductionCategory; label: string; singular: string }> = [
  { id: 'installer', label: 'Installers', singular: 'Installer' },
  { id: 'printer', label: 'Printers', singular: 'Printer' },
  { id: 'designer', label: 'Graphic Designers', singular: 'Graphic Designer' },
  { id: 'materials', label: 'Materials', singular: 'Material Contact' },
  { id: 'supplies', label: 'Supplies', singular: 'Supply Contact' },
  { id: 'labor', label: 'Laborers / Shop Workers', singular: 'Laborer / Shop Worker' }
];

const emptyForm = {
  name: '',
  company: '',
  category: 'installer' as ProductionCategory,
  phone: '',
  email: '',
  location: '',
  rate: '',
  notes: '',
  quoteRequestId: 'none'
};

const mapContact = (row: ProductionContactRow): ProductionContact => ({
  id: row.id,
  name: row.name,
  company: row.company,
  category: row.category,
  phone: row.phone,
  email: row.email,
  location: row.location,
  rate: row.rate,
  notes: row.notes,
  accountingStatus: row.accounting_status,
  createdAt: row.created_at,
  quoteRequestId: row.quote_request_id
});

const ProductionHub = () => {
  const [contacts, setContacts] = useState<ProductionContact[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ProductionCategory>('installer');
  const [showForm, setShowForm] = useState(false);
  const [crmClients, setCrmClients] = useState<CrmClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setSaveError('');
      try {
        const [contactResult, loadedClients] = await Promise.all([
          supabase.from('production_contacts').select('id, name, company, category, phone, email, location, rate, notes, accounting_status, created_at, quote_request_id').order('created_at', { ascending: false }),
          loadCrmClients()
        ]);
        if (contactResult.error) throw contactResult.error;

        let loadedContacts = ((contactResult.data ?? []) as ProductionContactRow[]).map(mapContact);
        if (loadedContacts.length === 0) {
          try {
            const cached = window.localStorage.getItem(STORAGE_KEY);
            const cachedContacts = cached ? JSON.parse(cached) as ProductionContact[] : [];
            if (cachedContacts.length > 0) {
              const { data: userData } = await supabase.auth.getUser();
              if (userData.user) {
                const { data: migrated, error: migrationError } = await supabase.from('production_contacts').insert(cachedContacts.map((contact) => ({
                  name: contact.name || '', company: contact.company || '', category: contact.category,
                  phone: contact.phone || '', email: contact.email || '', location: contact.location || '',
                  rate: contact.rate || '', notes: contact.notes || '', accounting_status: contact.accountingStatus || 'not-needed',
                  quote_request_id: contact.quoteRequestId || null, created_by: userData.user.id
                }))).select('id, name, company, category, phone, email, location, rate, notes, accounting_status, created_at, quote_request_id');
                if (migrationError) throw migrationError;
                loadedContacts = ((migrated ?? []) as ProductionContactRow[]).map(mapContact);
              }
            }
          } catch {
            // A damaged or older browser cache should not block the shared directory.
          }
        }
        setContacts(loadedContacts);
        setCrmClients(loadedClients);
      } catch (loadError) {
        setSaveError(loadError instanceof Error ? loadError.message : 'The shared production directory could not be loaded.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!loading) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  }, [contacts, loading]);

  const crmClientByQuoteId = useMemo(() => new Map(crmClients.map((client) => [client.quote_request_id, client])), [crmClients]);

  const filteredContacts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return contacts.filter((contact) => {
      if (contact.category !== activeCategory) return false;
      if (!term) return true;
      const linkedClient = contact.quoteRequestId ? crmClientByQuoteId.get(contact.quoteRequestId) : null;
      return [contact.name, contact.company, contact.location, contact.notes, linkedClient ? getCrmClientLabel(linkedClient) : '']
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [activeCategory, contacts, crmClientByQuoteId, search]);

  const accountingCount = contacts.filter((contact) => contact.accountingStatus === 'ready').length;
  const sentCount = contacts.filter((contact) => contact.accountingStatus === 'sent').length;

  const addContact = async () => {
    if (!form.name.trim() && !form.company.trim()) return;
    setSaving(true);
    setSaveError('');
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSaving(false);
      setSaveError('Your session could not be confirmed. Please sign in again.');
      return;
    }
    const { data, error } = await supabase.from('production_contacts').insert({
      name: form.name.trim(), company: form.company.trim(), category: form.category,
      phone: form.phone.trim(), email: form.email.trim(), location: form.location.trim(),
      rate: form.rate.trim(), notes: form.notes.trim(), accounting_status: 'not-needed',
      quote_request_id: form.quoteRequestId === 'none' ? null : form.quoteRequestId,
      created_by: userData.user.id
    }).select('id, name, company, category, phone, email, location, rate, notes, accounting_status, created_at, quote_request_id').single();
    setSaving(false);
    if (error || !data) {
      setSaveError(error?.message || 'The production contact could not be saved.');
      return;
    }
    setContacts((current) => [mapContact(data as ProductionContactRow), ...current]);
    setActiveCategory(form.category);
    setForm(emptyForm);
    setShowForm(false);
  };

  const setAccountingStatus = async (id: string, accountingStatus: AccountingStatus) => {
    const { error } = await supabase.from('production_contacts').update({ accounting_status: accountingStatus }).eq('id', id);
    if (error) {
      setSaveError(error.message);
      return;
    }
    setContacts((current) => current.map((contact) => contact.id === id ? { ...contact, accountingStatus } : contact));
  };

  const openAddForm = (category: ProductionCategory = activeCategory) => {
    setForm((current) => ({ ...current, category }));
    setShowForm(true);
  };

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 text-white shadow-lg sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-blue-300">
              <Wrench className="h-4 w-4" />
              Production Agent
            </div>
            <h1 className="text-2xl font-black sm:text-3xl">Build the crew. Track the cost. Keep production moving.</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              One shared contact book for installers, printers, designers, laborers, materials, and supplies—connected to CRM customers and jobs.
            </p>
          </div>
          <Button onClick={() => openAddForm()} className="min-h-11 bg-blue-500 font-bold text-white hover:bg-blue-400">
            <Plus className="mr-2 h-4 w-4" />
            Add Production Contact
          </Button>
        </div>
      </div>

      {saveError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{saveError}</div>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700"><Users className="h-5 w-5" /></div>
            <div><p className="text-2xl font-black">{contacts.length}</p><p className="text-xs font-semibold text-slate-500">Production contacts</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-amber-100 p-3 text-amber-700"><Calculator className="h-5 w-5" /></div>
            <div><p className="text-2xl font-black">{accountingCount}</p><p className="text-xs font-semibold text-slate-500">Ready for accounting</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></div>
            <div><p className="text-2xl font-black">{sentCount}</p><p className="text-xs font-semibold text-slate-500">Accounting handoffs sent</p></div>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Card className="border-2 border-blue-200 shadow-md">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><PackagePlus className="h-5 w-5 text-blue-600" />New production contact</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Contact name" /></div>
            <div className="space-y-2"><Label>Company</Label><Input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Business name" /></div>
            <div className="space-y-2">
              <Label>Production lane</Label>
              <Select value={form.category} onValueChange={(value: ProductionCategory) => setForm({ ...form, category: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="(404) 555-0123" /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="contact@company.com" /></div>
            <div className="space-y-2"><Label>Service area</Label><Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Atlanta metro / mobile" /></div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label>CRM customer / job</Label>
              <Select value={form.quoteRequestId} onValueChange={(value) => setForm({ ...form, quoteRequestId: value })}>
                <SelectTrigger><SelectValue placeholder="Optional customer or job" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No customer/job assigned yet</SelectItem>
                  {crmClients.map((client) => <SelectItem key={client.client_key} value={client.quote_request_id}>{getCrmClientLabel(client)} · {client.latest_quote_id || 'CRM record'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1"><Label>Rate or estimated cost</Label><Input value={form.rate} onChange={(event) => setForm({ ...form, rate: event.target.value })} placeholder="$3/sq. ft. or quoted per job" /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Specialties, availability, equipment, payment terms..." /></div>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
              <Button onClick={() => void addContact()} disabled={saving || (!form.name.trim() && !form.company.trim())}>{saving ? 'Saving...' : 'Save Contact'}</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle>Production Directory</CardTitle><p className="mt-1 text-sm text-slate-500">Contacts and vendors your staff can call when a job needs to move.</p></div>
          <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search this production lane" /></div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as ProductionCategory)}>
            <TabsList className="mb-4 flex h-auto w-full justify-start overflow-x-auto">
              {categories.map((category) => (
                <TabsTrigger key={category.id} value={category.id} className="min-h-10 min-w-max">
                  {category.label}
                  <Badge variant="secondary" className="ml-2">{contacts.filter((contact) => contact.category === category.id).length}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
            {categories.map((category) => (
              <TabsContent key={category.id} value={category.id} className="mt-0">
                {loading ? (
                  <div className="py-12 text-center text-sm font-medium text-slate-500">Loading shared production contacts...</div>
                ) : filteredContacts.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 px-5 py-12 text-center">
                    <Users className="mx-auto h-9 w-9 text-slate-300" />
                    <p className="mt-3 font-bold text-slate-700">No {category.label.toLowerCase()} added yet.</p>
                    <p className="mt-1 text-sm text-slate-500">Start building this lane of your production network.</p>
                    <Button variant="outline" className="mt-4" onClick={() => openAddForm(category.id)}><Plus className="mr-2 h-4 w-4" />Add {category.singular}</Button>
                  </div>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {filteredContacts.map((contact) => (
                      <div key={contact.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div><h3 className="font-black text-slate-900">{contact.name || contact.company}</h3>{contact.name && contact.company && <p className="text-sm font-medium text-slate-500">{contact.company}</p>}</div>
                          {contact.accountingStatus === 'sent' && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Sent to accounting</Badge>}
                          {contact.accountingStatus === 'ready' && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Accounting ready</Badge>}
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                          {contact.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:text-blue-700"><Phone className="h-4 w-4" />{contact.phone}</a>}
                          {contact.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-2 truncate hover:text-blue-700"><Mail className="h-4 w-4" />{contact.email}</a>}
                          {contact.location && <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{contact.location}</span>}
                          {contact.rate && <span className="flex items-center gap-2 font-semibold"><Calculator className="h-4 w-4" />{contact.rate}</span>}
                        </div>
                        {contact.notes && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-5 text-slate-600">{contact.notes}</p>}
                        {contact.quoteRequestId && crmClientByQuoteId.get(contact.quoteRequestId) && (
                          <div className="mt-3 flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold text-cyan-950"><BriefcaseBusiness className="h-4 w-4" />CRM: {getCrmClientLabel(crmClientByQuoteId.get(contact.quoteRequestId)!)}</div>
                        )}
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                          {contact.accountingStatus === 'not-needed' && <Button size="sm" variant="outline" onClick={() => void setAccountingStatus(contact.id, 'ready')}><Calculator className="mr-2 h-4 w-4" />Mark for accounting</Button>}
                          {contact.accountingStatus === 'ready' && <Button size="sm" onClick={() => void setAccountingStatus(contact.id, 'sent')}><Send className="mr-2 h-4 w-4" />Send handoff</Button>}
                          {contact.accountingStatus === 'sent' && <Button size="sm" variant="outline" onClick={() => void setAccountingStatus(contact.id, 'ready')}>Reopen handoff</Button>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
      <p className="text-center text-xs text-slate-500">
        Production contacts are shared through Supabase and can be linked to the customer or job in the Blue Woods CRM.
      </p>
    </div>
  );
};

export default ProductionHub;
