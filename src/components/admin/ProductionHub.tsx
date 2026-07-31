import { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
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

type ProductionCategory = 'installer' | 'printer' | 'designer' | 'materials' | 'supplies';
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
}

const STORAGE_KEY = 'blue-woods-production-contacts-v1';
const categories: Array<{ id: ProductionCategory; label: string }> = [
  { id: 'installer', label: 'Installers' },
  { id: 'printer', label: 'Printers' },
  { id: 'designer', label: 'Graphic Designers' },
  { id: 'materials', label: 'Materials' },
  { id: 'supplies', label: 'Supplies' }
];

const emptyForm = {
  name: '',
  company: '',
  category: 'installer' as ProductionCategory,
  phone: '',
  email: '',
  location: '',
  rate: '',
  notes: ''
};

const ProductionHub = () => {
  const [contacts, setContacts] = useState<ProductionContact[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ProductionCategory>('installer');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setContacts(JSON.parse(saved) as ProductionContact[]);
    } catch {
      // A damaged browser cache should never block the production workspace.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return contacts.filter((contact) => {
      if (contact.category !== activeCategory) return false;
      if (!term) return true;
      return [contact.name, contact.company, contact.location, contact.notes]
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [activeCategory, contacts, search]);

  const accountingCount = contacts.filter((contact) => contact.accountingStatus === 'ready').length;
  const sentCount = contacts.filter((contact) => contact.accountingStatus === 'sent').length;

  const addContact = () => {
    if (!form.name.trim() && !form.company.trim()) return;
    const contact: ProductionContact = {
      id: crypto.randomUUID(),
      ...form,
      name: form.name.trim(),
      company: form.company.trim(),
      accountingStatus: 'not-needed',
      createdAt: new Date().toISOString()
    };
    setContacts((current) => [contact, ...current]);
    setActiveCategory(form.category);
    setForm(emptyForm);
    setShowForm(false);
  };

  const setAccountingStatus = (id: string, accountingStatus: AccountingStatus) => {
    setContacts((current) =>
      current.map((contact) => contact.id === id ? { ...contact, accountingStatus } : contact)
    );
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
              One contact book for installers, printers, designers, materials, and supplies—with a clean handoff to accounting.
            </p>
          </div>
          <Button onClick={() => openAddForm()} className="min-h-11 bg-blue-500 font-bold text-white hover:bg-blue-400">
            <Plus className="mr-2 h-4 w-4" />
            Add Production Contact
          </Button>
        </div>
      </div>

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
            <div className="space-y-2 sm:col-span-2 lg:col-span-1"><Label>Rate or estimated cost</Label><Input value={form.rate} onChange={(event) => setForm({ ...form, rate: event.target.value })} placeholder="$3/sq. ft. or quoted per job" /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Specialties, availability, equipment, payment terms..." /></div>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
              <Button onClick={addContact} disabled={!form.name.trim() && !form.company.trim()}>Save Contact</Button>
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
                {filteredContacts.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 px-5 py-12 text-center">
                    <Users className="mx-auto h-9 w-9 text-slate-300" />
                    <p className="mt-3 font-bold text-slate-700">No {category.label.toLowerCase()} added yet.</p>
                    <p className="mt-1 text-sm text-slate-500">Start building this lane of your production network.</p>
                    <Button variant="outline" className="mt-4" onClick={() => openAddForm(category.id)}><Plus className="mr-2 h-4 w-4" />Add {category.label.slice(0, -1)}</Button>
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
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                          {contact.accountingStatus === 'not-needed' && <Button size="sm" variant="outline" onClick={() => setAccountingStatus(contact.id, 'ready')}><Calculator className="mr-2 h-4 w-4" />Mark for accounting</Button>}
                          {contact.accountingStatus === 'ready' && <Button size="sm" onClick={() => setAccountingStatus(contact.id, 'sent')}><Send className="mr-2 h-4 w-4" />Send handoff</Button>}
                          {contact.accountingStatus === 'sent' && <Button size="sm" variant="outline" onClick={() => setAccountingStatus(contact.id, 'ready')}>Reopen handoff</Button>}
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
        Accounting handoffs are staged here now. A shared database connection can route them into the accounting task when that module is connected.
      </p>
    </div>
  );
};

export default ProductionHub;
