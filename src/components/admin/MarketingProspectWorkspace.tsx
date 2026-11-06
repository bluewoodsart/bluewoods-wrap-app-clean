import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type Prospect = {
  id: string; source_id: string; company: string; location: string; email: string; phone: string;
  website: string; social_profiles: Record<string, string>; fit: string; research_notes: string;
  contact_source: string; social_evidence: string; researched_on: string; status: string;
  staff_notes: string; email_draft: string; updated_at: string; playbook_key: string; contact_id?: string;
  scheduled_date: string | null; agreed_price: number | null; deposit_paid: number | null; historical_price_notes: string; source_account: string; source_year: number | null;
};
type Playbook = { key: string; title: string; description: string; instructions: string };
const stages = ['researched', 'qualified', 'drafted', 'awaiting_approval', 'contacted', 'responded', 'handed_off', 'not_a_fit', 'quoted', 'scheduled', 'completed', 'lost'];
const label = (value: string) => value.replace(/_/g, ' ');
const safeUrl = (value: string) => {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; }
  catch { return null; }
};
const External = ({ href, children }: { href: string; children: React.ReactNode }) => {
  const url = safeUrl(href);
  return url ? <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-cyan-800 underline underline-offset-4">{children}</a> : null;
};

export default function MarketingProspectWorkspace() {
  const [leads, setLeads] = useState<Prospect[]>([]);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [campaign, setCampaign] = useState('christmas-windows-2026');
  const playbook = playbooks.find(p => p.key === campaign);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState('all');
  const [selected, setSelected] = useState<Prospect | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    Promise.all([
      supabase.from('bwb_marketing_playbooks').select('*').order('title'),
      supabase.from('bwb_marketing_prospects').select('*').order('company')
    ]).then(([book, rows]) => {
      if (!active) return;
      if (book.error || rows.error) { setError(book.error?.message || rows.error?.message || 'Unable to load leads.'); return; }
      setPlaybooks(book.data || []); setLeads(rows.data || []);
    }).catch(() => { if (active) setError('Unable to connect. Please retry.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  const filtered = useMemo(() => leads.filter(row => (campaign === 'all' || row.playbook_key === campaign) && (stage === 'all' || row.status === stage) &&
    [row.company, row.location, row.email, row.fit, ...Object.keys(row.social_profiles)].join(' ').toLowerCase().includes(query.toLowerCase())), [leads, stage, query, campaign]);
  const campaignLeads = leads.filter(r => campaign === 'all' || r.playbook_key === campaign);
  const booked = campaignLeads.filter(r => r.status === 'scheduled' || r.status === 'completed');
  const newLead = () => {
    setSelected({ id: '', source_id: 'manual-' + crypto.randomUUID(), company: '', location: '', email: '', phone: '', website: '', social_profiles: {}, fit: '', research_notes: '', contact_source: '', social_evidence: '', researched_on: new Date().toISOString().slice(0,10), status: 'researched', staff_notes: '', email_draft: '', updated_at: '', playbook_key: campaign, scheduled_date: null, agreed_price: null, deposit_paid: null, historical_price_notes: '', source_account: 'User supplied', source_year: null });
    setNotice(''); setSaveError('');
  };

  const save = async () => {
    if (!selected || saving) return;
    const draft = selected;
    setSaving(true); setSaveError(''); setNotice('');
    try {
      if (!draft.company.trim()) throw new Error('Enter a company or customer name.');
      if (draft.status === 'scheduled' && !draft.scheduled_date) throw new Error('Add the confirmed painting date before marking scheduled.');
      const fields = { status: draft.status, staff_notes: draft.staff_notes, email_draft: draft.email_draft, scheduled_date: draft.scheduled_date || null, agreed_price: draft.agreed_price, deposit_paid: draft.deposit_paid, historical_price_notes: draft.historical_price_notes };
      const request = draft.id ? supabase.from('bwb_marketing_prospects').update(fields).eq('id', draft.id).eq('updated_at', draft.updated_at) :
        supabase.from('bwb_marketing_prospects').insert({ ...fields, source_id: draft.source_id, playbook_key: draft.playbook_key, company: draft.company.trim(), email: draft.email.trim(), phone: draft.phone, location: draft.location, source_account: 'User supplied', researched_on: draft.researched_on });
      const { data, error: failure } = await request.select('*').maybeSingle();
      if (failure) throw new Error(failure.message);
      if (!data) throw new Error('This lead changed elsewhere or access changed. Copy your draft, close this window, and refresh before saving again.');
      setLeads(current => draft.id ? current.map(row => row.id === data.id ? data : row) : [...current, data]);
      setSelected(data); setNotice('Saved to BWB. No message was sent.');
    } catch (failure) { setSaveError(failure instanceof Error ? failure.message : 'Save failed. Your draft is still here.'); }
    finally { setSaving(false); }
  };

  return <div className="space-y-5">
    <div><p className="text-xs font-bold uppercase tracking-widest text-cyan-700">BWB marketing · Prospecting</p>
      <h2 className="mt-2 text-3xl font-black">Email & Lead Research</h2>
      <p className="mt-2 text-sm text-slate-600">One shared home for food truck leads, Christmas windows, and customer follow-ups. Choose a campaign to see its leads, bookings, prices, and sources.</p></div>
    {loading ? <p role="status">Loading shared leads…</p> : error ? <div role="alert" className="rounded-xl border border-red-200 p-4"><p>{error}</p><Button className="mt-3" onClick={() => setReload(n => n + 1)}>Retry</Button></div> : <>
      {playbook && <details className="rounded-xl border border-cyan-200 bg-cyan-50 p-5">
        <summary className="cursor-pointer font-bold">Skill / playbook: {playbook?.title}</summary>
        <p className="mt-3 text-sm">{playbook?.description}</p>
        <div className="mt-4 whitespace-pre-wrap text-sm leading-6">{playbook?.instructions}</div>
      </details>}
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold">Campaign<select aria-label="Campaign" disabled={saving} className="ml-2 rounded-md border p-2" value={campaign} onChange={e => { setCampaign(e.target.value); setStage('all'); }}><option value="all">All leads</option>{playbooks.map(p => <option key={p.key} value={p.key}>{p.title}</option>)}</select></label>
        <Button disabled={campaign === 'all'} onClick={newLead}>Add lead / booking</Button>
      </div>
      <div className="flex flex-wrap gap-3 text-sm font-semibold"><span>{campaignLeads.length} campaign entries</span><span>· {new Set(campaignLeads.map(r => r.contact_id || r.id)).size} contacts</span><span>· {booked.length} booked/completed</span><span>· Agreed value: {booked.reduce((n,r) => n + (Number(r.agreed_price) || 0),0).toLocaleString('en-US',{style:'currency',currency:'USD'})}</span><span>· {booked.filter(r => r.agreed_price === null).length} bookings without a price</span></div>
      <p className="text-xs text-slate-600">Last year's prices stay in historical notes. Only confirmed current-season bookings belong on the schedule. Saving a date here does not create a calendar event or send email.</p>
      <div className="flex flex-col gap-3 sm:flex-row"><Input aria-label="Search prospects" placeholder="Search company, location, email or platform" value={query} onChange={e => setQuery(e.target.value)} />
        <select aria-label="Filter by stage" className="rounded-md border p-2 capitalize" value={stage} onChange={e => setStage(e.target.value)}><option value="all">All stages</option>{stages.map(s => <option key={s} value={s}>{label(s)}</option>)}</select>
        <Button variant="outline" onClick={() => setReload(n => n + 1)}>Refresh</Button></div>
      <p className="text-sm" role="status">Showing {filtered.length} of {campaignLeads.length}</p>
      <div className="grid gap-4 lg:grid-cols-2">{filtered.map(row => <Card key={row.id}><CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap justify-between gap-2"><span className="text-xs text-slate-500">{row.source_id} · {row.location}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs capitalize">{label(row.status)}</span></div>
        <h3 className="text-xl font-bold">{row.company}</h3>
        <p className="text-xs text-slate-500">{playbooks.find(p => p.key === row.playbook_key)?.title}</p>
        <p className="text-sm">Date: {row.scheduled_date || 'Not scheduled'} · Agreed price: {row.agreed_price === null ? 'Not set' : '$' + row.agreed_price} · Deposit paid: {row.deposit_paid === null ? 'Unknown' : '$' + row.deposit_paid}</p>
        <p className="break-all text-sm">{row.email || 'Email not verified'}<br />{row.phone || 'Phone not verified'}</p>
        <div className="flex flex-wrap gap-4 text-sm"><External href={row.website}>Website</External>{Object.entries(row.social_profiles).filter(([, url]) => url).map(([name, url]) => <External key={name} href={url}>{name}</External>)}</div>
        <p className="text-sm">{row.fit}</p><p className="text-xs leading-5 text-slate-600">{row.research_notes}</p>
        <Button variant="outline" onClick={() => { setSelected({ ...row }); setSaveError(''); setNotice(''); }}>Open lead & draft</Button>
      </CardContent></Card>)}</div>
      {!filtered.length && <p>No leads match these filters.</p>}
    </>}
    <Dialog open={!!selected} onOpenChange={open => { if (!open && !saving) setSelected(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{selected?.company || 'New lead / booking'}</DialogTitle><DialogDescription>Update the shared lead record. Drafts stay inside BWB until separately reviewed and sent.</DialogDescription></DialogHeader>
      {selected && <div className="space-y-4">
        {!selected.id && <div className="grid gap-3 sm:grid-cols-2">{(['company','email','phone','location'] as const).map(field => <label key={field} className="text-sm capitalize">{field}<Input disabled={saving} value={selected[field]} onChange={e => setSelected({ ...selected, [field]: e.target.value })} /></label>)}</div>}
        <p className="text-sm">{selected.research_notes}</p>
        <p className="text-xs">Source: {selected.source_account || 'Public research'} · Source year: {selected.source_year || 'See research date'}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">Confirmed painting date<Input disabled={saving} type="date" value={selected.scheduled_date || ''} onChange={e => setSelected({ ...selected, scheduled_date: e.target.value || null })} /></label>
          <label className="text-sm">Agreed price ($)<Input disabled={saving} type="number" min="0" step="0.01" value={selected.agreed_price ?? ''} onChange={e => setSelected({ ...selected, agreed_price: e.target.value === '' ? null : Number(e.target.value) })} /></label>
          <label className="text-sm">Deposit paid ($)<Input disabled={saving} type="number" min="0" step="0.01" value={selected.deposit_paid ?? ''} onChange={e => setSelected({ ...selected, deposit_paid: e.target.value === '' ? null : Number(e.target.value) })} /></label>
        </div>
        <label className="block text-sm font-semibold">Historical prices and scope<Textarea disabled={saving} value={selected.historical_price_notes} onChange={e => setSelected({ ...selected, historical_price_notes: e.target.value })} /></label>
        <p className="text-xs text-slate-600">Researched {selected.researched_on} · {selected.social_evidence} · <External href={selected.contact_source}>Contact source</External></p>
        <label className="block text-sm font-semibold">Stage<select disabled={saving} className="mt-1 block w-full rounded-md border p-2 capitalize" value={selected.status} onChange={e => setSelected({ ...selected, status: e.target.value })}>{stages.map(s => <option key={s} value={s}>{label(s)}</option>)}</select></label>
        <label className="block text-sm font-semibold">Follow-up notes<Textarea disabled={saving} className="mt-1" value={selected.staff_notes} onChange={e => setSelected({ ...selected, staff_notes: e.target.value })} /></label>
        <label className="block text-sm font-semibold">Email draft<Textarea disabled={saving} className="mt-1 min-h-52" value={selected.email_draft} onChange={e => setSelected({ ...selected, email_draft: e.target.value })} placeholder="Draft a personal message for this campaign. Verify the recipient before sending." /></label>
        {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}{notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
        <Button disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save draft & notes'}</Button>
      </div>}
    </DialogContent></Dialog>
  </div>;
}
