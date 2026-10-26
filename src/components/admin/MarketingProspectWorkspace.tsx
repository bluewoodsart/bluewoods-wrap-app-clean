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
  staff_notes: string; email_draft: string; updated_at: string;
};
type Playbook = { key: string; title: string; description: string; instructions: string };
const stages = ['researched', 'qualified', 'drafted', 'awaiting_approval', 'contacted', 'responded', 'handed_off', 'not_a_fit'];
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
  const [playbook, setPlaybook] = useState<Playbook | null>(null);
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
      supabase.from('bwb_marketing_playbooks').select('*').eq('key', 'food-truck-print-partners').single(),
      supabase.from('bwb_marketing_prospects').select('*').eq('playbook_key', 'food-truck-print-partners').order('source_id')
    ]).then(([book, rows]) => {
      if (!active) return;
      if (book.error || rows.error) { setError(book.error?.message || rows.error?.message || 'Unable to load leads.'); return; }
      setPlaybook(book.data); setLeads(rows.data || []);
    }).catch(() => { if (active) setError('Unable to connect. Please retry.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  const filtered = useMemo(() => leads.filter(row => (stage === 'all' || row.status === stage) &&
    [row.company, row.location, row.email, row.fit, ...Object.keys(row.social_profiles)].join(' ').toLowerCase().includes(query.toLowerCase())), [leads, stage, query]);

  const save = async () => {
    if (!selected || saving) return;
    const draft = selected;
    setSaving(true); setSaveError(''); setNotice('');
    try {
      const { data, error: failure } = await supabase.from('bwb_marketing_prospects')
        .update({ status: draft.status, staff_notes: draft.staff_notes, email_draft: draft.email_draft })
        .eq('id', draft.id).eq('updated_at', draft.updated_at).select('*').maybeSingle();
      if (failure) throw new Error(failure.message);
      if (!data) throw new Error('This lead changed elsewhere or access changed. Copy your draft, close this window, and refresh before saving again.');
      setLeads(current => current.map(row => row.id === data.id ? data : row));
      setSelected(data); setNotice('Saved to BWB. No message was sent.');
    } catch (failure) { setSaveError(failure instanceof Error ? failure.message : 'Save failed. Your draft is still here.'); }
    finally { setSaving(false); }
  };

  return <div className="space-y-5">
    <div><p className="text-xs font-bold uppercase tracking-widest text-cyan-700">BWB marketing · Prospecting</p>
      <h2 className="mt-2 text-3xl font-black">Email & Lead Research</h2>
      <p className="mt-2 text-sm text-slate-600">Food truck builders that may need wrap and graphics printing. Research, draft, and track follow-up in one shared workspace.</p></div>
    {loading ? <p role="status">Loading shared leads…</p> : error ? <div role="alert" className="rounded-xl border border-red-200 p-4"><p>{error}</p><Button className="mt-3" onClick={() => setReload(n => n + 1)}>Retry</Button></div> : <>
      <details className="rounded-xl border border-cyan-200 bg-cyan-50 p-5">
        <summary className="cursor-pointer font-bold">Skill / playbook: {playbook?.title}</summary>
        <p className="mt-3 text-sm">{playbook?.description}</p>
        <div className="mt-4 whitespace-pre-wrap text-sm leading-6">{playbook?.instructions}</div>
      </details>
      <div className="flex flex-wrap gap-3 text-sm font-semibold"><span>{leads.length} leads</span><span>· {leads.filter(r => Object.values(r.social_profiles).some(Boolean)).length} with social links</span><span>· {leads.filter(r => r.email).length} listed emails</span></div>
      <p className="text-xs text-slate-600">Publicly listed contacts are not delivery-tested. Social links are sourced, but activity is unchecked. Contact conflicts and missing fields remain flagged. A saved draft does not send email.</p>
      <div className="flex flex-col gap-3 sm:flex-row"><Input aria-label="Search prospects" placeholder="Search company, location, email or platform" value={query} onChange={e => setQuery(e.target.value)} />
        <select aria-label="Filter by stage" className="rounded-md border p-2 capitalize" value={stage} onChange={e => setStage(e.target.value)}><option value="all">All stages</option>{stages.map(s => <option key={s} value={s}>{label(s)}</option>)}</select>
        <Button variant="outline" onClick={() => setReload(n => n + 1)}>Refresh</Button></div>
      <p className="text-sm" role="status">Showing {filtered.length} of {leads.length}</p>
      <div className="grid gap-4 lg:grid-cols-2">{filtered.map(row => <Card key={row.id}><CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap justify-between gap-2"><span className="text-xs text-slate-500">{row.source_id} · {row.location}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs capitalize">{label(row.status)}</span></div>
        <h3 className="text-xl font-bold">{row.company}</h3>
        <p className="break-all text-sm">{row.email || 'Email not verified'}<br />{row.phone || 'Phone not verified'}</p>
        <div className="flex flex-wrap gap-4 text-sm"><External href={row.website}>Website</External>{Object.entries(row.social_profiles).filter(([, url]) => url).map(([name, url]) => <External key={name} href={url}>{name}</External>)}</div>
        <p className="text-sm">{row.fit}</p><p className="text-xs leading-5 text-slate-600">{row.research_notes}</p>
        <Button variant="outline" onClick={() => { setSelected({ ...row }); setSaveError(''); setNotice(''); }}>Open lead & draft</Button>
      </CardContent></Card>)}</div>
      {!filtered.length && <p>No leads match these filters.</p>}
    </>}
    <Dialog open={!!selected} onOpenChange={open => { if (!open && !saving) setSelected(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{selected?.company}</DialogTitle><DialogDescription>Update the shared lead record. Drafts stay inside BWB until separately reviewed and sent.</DialogDescription></DialogHeader>
      {selected && <div className="space-y-4">
        <p className="text-sm">{selected.research_notes}</p>
        <p className="text-xs text-slate-600">Researched {selected.researched_on} · {selected.social_evidence} · <External href={selected.contact_source}>Contact source</External></p>
        <label className="block text-sm font-semibold">Stage<select disabled={saving} className="mt-1 block w-full rounded-md border p-2 capitalize" value={selected.status} onChange={e => setSelected({ ...selected, status: e.target.value })}>{stages.map(s => <option key={s} value={s}>{label(s)}</option>)}</select></label>
        <label className="block text-sm font-semibold">Follow-up notes<Textarea disabled={saving} className="mt-1" value={selected.staff_notes} onChange={e => setSelected({ ...selected, staff_notes: e.target.value })} /></label>
        <label className="block text-sm font-semibold">Email draft<Textarea disabled={saving} className="mt-1 min-h-52" value={selected.email_draft} onChange={e => setSelected({ ...selected, email_draft: e.target.value })} placeholder="Write a personal introduction and ask who handles wrap printing. Verify the recipient before sending." /></label>
        {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}{notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
        <Button disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save draft & notes'}</Button>
      </div>}
    </DialogContent></Dialog>
  </div>;
}
