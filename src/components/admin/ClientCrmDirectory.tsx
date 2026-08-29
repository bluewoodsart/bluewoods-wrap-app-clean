import { useEffect, useMemo, useState } from 'react';
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ExternalLink,
  FileText,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CustomerContactEditor, type SavedCustomerContact } from '@/components/admin/CustomerContactEditor';
import { getCrmClientLabel, loadCrmClients, type CrmClient } from '@/lib/crm';

interface ClientCrmDirectoryProps {
  onOpenCompassionWorkspace: () => void;
}

const formatDate = (value: string) => new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric'
}).format(new Date(value));

const formatStatus = (value: string) => value
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const statusClass = (client: CrmClient) => client.active_quote_count > 0
  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
  : 'border-slate-200 bg-slate-100 text-slate-700';

const ClientCrmDirectory = ({ onOpenCompassionWorkspace }: ClientCrmDirectoryProps) => {
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<CrmClient | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setClients(await loadCrmClients());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'The CRM client directory could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((client) => [
      client.customer_name,
      client.company_name,
      client.customer_email,
      client.customer_phone,
      client.latest_quote_id,
      client.latest_status,
      client.latest_product_type,
      client.assigned_rep_name
    ].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [clients, search]);

  const activeRecordCount = clients.reduce((total, client) => total + Number(client.active_quote_count || 0), 0);
  const totalRecordCount = clients.reduce((total, client) => total + Number(client.quote_count || 0), 0);

  const applySavedContact = (saved: SavedCustomerContact) => {
    if (!selectedClient) return;
    const savedCompany = typeof saved.quote_data.companyName === 'string'
      ? saved.quote_data.companyName
      : selectedClient.company_name;
    const updated: CrmClient = {
      ...selectedClient,
      customer_name: saved.customer_name,
      company_name: savedCompany,
      customer_email: saved.customer_email,
      customer_phone: saved.customer_phone,
      preferred_contact: saved.preferred_contact,
      quote_data: saved.quote_data
    };
    setSelectedClient(updated);
    setClients((current) => current.map((client) => client.client_key === updated.client_key ? updated : client));
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-slate-950/20 bg-slate-950 text-white shadow-lg">
        <div className="h-2 bg-cyan-400" />
        <div className="grid gap-6 px-5 py-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:px-8 md:py-9">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">Blue Woods CRM</span>
              <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">Customers & Jobs</span>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Client Relationship Manager</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">Every customer with a quote request or job appears here. Open a customer to correct contact information, add an address, or keep their website and social links together.</p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading} className="border-white/30 bg-white/10 text-white hover:bg-white hover:text-slate-950">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh CRM
          </Button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-xl bg-cyan-100 p-3 text-cyan-800"><Users className="h-5 w-5" /></div><div><p className="text-2xl font-black">{clients.length + 1}</p><p className="text-xs font-semibold text-slate-500">Client records</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-xl bg-emerald-100 p-3 text-emerald-800"><BriefcaseBusiness className="h-5 w-5" /></div><div><p className="text-2xl font-black">{activeRecordCount}</p><p className="text-xs font-semibold text-slate-500">Active quote/job records</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-xl bg-blue-100 p-3 text-blue-800"><FileText className="h-5 w-5" /></div><div><p className="text-2xl font-black">{totalRecordCount}</p><p className="text-xs font-semibold text-slate-500">Total quote/job history</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-xl bg-violet-100 p-3 text-violet-800"><Building2 className="h-5 w-5" /></div><div><p className="text-2xl font-black">1</p><p className="text-xs font-semibold text-slate-500">Managed client workspace</p></div></CardContent></Card>
      </div>

      <Card className="border-emerald-200 bg-emerald-50/40 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-emerald-950 p-3 text-white"><Building2 className="h-6 w-6" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black text-slate-950">Compassion Ministries of Georgia</h2><Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Managed Client</Badge></div>
              <p className="mt-1 text-sm text-slate-600">Dedicated website, marketing, operations, tasks, approvals, and final-report workspace.</p>
            </div>
          </div>
          <Button onClick={onOpenCompassionWorkspace} className="bg-emerald-950 text-white hover:bg-emerald-900">Open Client Workspace <ExternalLink className="ml-2 h-4 w-4" /></Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4 pb-3 lg:flex-row lg:items-end lg:justify-between">
          <div><CardTitle>All CRM Clients</CardTitle><p className="mt-1 text-sm text-slate-500">Customers are consolidated across current and archived quote and job records.</p></div>
          <div className="relative w-full lg:w-96"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, company, email, phone, quote..." /></div>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div>}
          {loading ? (
            <div className="py-12 text-center text-sm font-medium text-slate-500">Loading CRM clients...</div>
          ) : filteredClients.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 px-5 py-12 text-center"><Users className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 font-bold text-slate-700">No matching clients found.</p></div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredClients.map((client) => {
                const label = getCrmClientLabel(client);
                const showContactName = client.company_name && client.customer_name && client.company_name.toLowerCase() !== client.customer_name.toLowerCase();
                return (
                  <article key={client.client_key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-300 hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><h3 className="truncate text-lg font-black text-slate-950">{label}</h3>{showContactName && <p className="truncate text-sm font-semibold text-slate-500">{client.customer_name}</p>}</div>
                      <Badge variant="outline" className={statusClass(client)}>{client.active_quote_count > 0 ? `${client.active_quote_count} Active` : 'History'}</Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      {client.customer_email && <span className="flex min-w-0 items-center gap-2"><Mail className="h-4 w-4 shrink-0" /><span className="truncate">{client.customer_email}</span></span>}
                      {client.customer_phone && <span className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0" />{client.customer_phone}</span>}
                      <span className="flex items-center gap-2"><FileText className="h-4 w-4 shrink-0" />{client.quote_count} quote/job record{client.quote_count === 1 ? '' : 's'}</span>
                      <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0" />Updated {formatDate(client.latest_activity_at)}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                      <div className="text-xs font-semibold text-slate-500">Latest: {formatStatus(client.latest_status)} · {formatStatus(client.latest_product_type)}</div>
                      <Button size="sm" onClick={() => setSelectedClient(client)}>Open Client</Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedClient)} onOpenChange={(open) => { if (!open) setSelectedClient(null); }}>
        {selectedClient && (
          <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-4xl overflow-y-auto p-4 sm:w-full sm:p-6">
            <DialogHeader className="text-left">
              <DialogTitle>{getCrmClientLabel(selectedClient)}</DialogTitle>
              <DialogDescription>CRM customer record from {selectedClient.quote_count} quote/job record{selectedClient.quote_count === 1 ? '' : 's'}.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div><p className="text-xs font-semibold uppercase text-slate-500">Contact</p><p className="mt-1 font-semibold text-slate-950">{selectedClient.customer_name || '-'}</p></div>
              <div><p className="text-xs font-semibold uppercase text-slate-500">Email</p><p className="mt-1 break-all text-sm text-slate-950">{selectedClient.customer_email || '-'}</p></div>
              <div><p className="text-xs font-semibold uppercase text-slate-500">Phone</p><p className="mt-1 text-sm text-slate-950">{selectedClient.customer_phone || '-'}</p></div>
              <div><p className="text-xs font-semibold uppercase text-slate-500">Latest Quote</p><p className="mt-1 text-sm text-slate-950">{selectedClient.latest_quote_id || '-'}</p></div>
              <div><p className="text-xs font-semibold uppercase text-slate-500">Status</p><p className="mt-1 text-sm text-slate-950">{formatStatus(selectedClient.latest_status)}</p></div>
              <div><p className="text-xs font-semibold uppercase text-slate-500">Product</p><p className="mt-1 text-sm text-slate-950">{formatStatus(selectedClient.latest_product_type)}</p></div>
              <div><p className="text-xs font-semibold uppercase text-slate-500">Assigned Rep</p><p className="mt-1 text-sm text-slate-950">{selectedClient.assigned_rep_name || '-'}</p></div>
              <div><p className="text-xs font-semibold uppercase text-slate-500">First Seen</p><p className="mt-1 text-sm text-slate-950">{formatDate(selectedClient.first_seen_at)}</p></div>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedClient.customer_phone && <Button size="sm" variant="outline" asChild><a href={`tel:${selectedClient.customer_phone}`}><Phone className="mr-2 h-4 w-4" />Call</a></Button>}
              {selectedClient.customer_email && <Button size="sm" variant="outline" asChild><a href={`mailto:${selectedClient.customer_email}`}><Mail className="mr-2 h-4 w-4" />Email</a></Button>}
            </div>
            <CustomerContactEditor
              quoteRequestId={selectedClient.quote_request_id}
              customerName={selectedClient.customer_name}
              companyName={selectedClient.company_name}
              email={selectedClient.customer_email}
              phone={selectedClient.customer_phone}
              preferredContact={selectedClient.preferred_contact}
              quoteData={selectedClient.quote_data}
              onSaved={applySavedContact}
            />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default ClientCrmDirectory;
