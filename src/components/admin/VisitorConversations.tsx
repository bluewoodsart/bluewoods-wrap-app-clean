import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

interface Conversation {
  id: string; site_id: string; created_at: string; contact_name: string | null;
  contact_email: string | null; reported_source: string | null; reported_search: string | null;
  attribution: Record<string, string>; quote_request_id: string | null;
  follow_up_requested_at: string | null;
  quote_requests: { status: string; assigned_rep_name: string | null } | null;
}
interface Exchange { id: string; visitor_text: string; assistant_text: string; created_at: string }
const VisitorConversations = () => {
  const [sites, setSites] = useState<Array<{ id: string; display_name: string; enabled: boolean }>>([]);
  const [site, setSite] = useState('slapwrapz');
  const [rows, setRows] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Exchange[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    let current = true;
    void supabase.from('bwb_conversation_sites').select('id, display_name, enabled').then(({ data, error }) => {
      if (!current) return;
      if (error) setError('Conversation storage is not available. Apply the database migration before enabling intake.');
      else {
        setSites(data || []);
        if (data?.length && !data.some(s => s.id === 'slapwrapz')) setSite(data[0].id);
      }
    });
    return () => { current = false; };
  }, []);
  useEffect(() => {
    const sequence = ++generation.current;
    let current = true;
    setLoading(true); setError(''); setRows([]); setSelected(null); setMessages([]);
    void supabase.from('bwb_visitor_conversations')
      .select('id,site_id,created_at,contact_name,contact_email,reported_source,reported_search,attribution,quote_request_id,follow_up_requested_at', { count: 'exact' })
      .eq('site_id', site).order('created_at', { ascending: false }).range(page * 50, page * 50 + 49)
      .then(async ({ data, error, count }) => {
        if (!current || sequence !== generation.current) return;
        if (error) { setLoading(false); setCount(0); setError('Conversations could not be loaded. Check database setup and your site access.'); return; }
        const { data: outcomes, error: outcomeError } = await supabase.rpc('get_bwb_conversation_outcomes', { p_ids: (data || []).map(row => row.id) });
        if (!current || sequence !== generation.current) return;
        setLoading(false);
        if (outcomeError) setError('Conversations loaded, but CRM outcomes are unavailable. Refresh to retry.');
        const byId = new Map((outcomes || []).map((o: { conversation_id: string; status: string; assigned_rep_name: string | null }) => [o.conversation_id, o]));
        setRows((data || []).map(row => ({ ...row, quote_requests: byId.get(row.id) || null })) as Conversation[]);
        setCount(count || 0);
      });
    return () => { current = false; };
  }, [site, page, refresh]);
  useEffect(() => {
    let current = true;
    setMessages([]);
    if (!selected) return;
    void supabase.from('bwb_conversation_messages').select('id,visitor_text,assistant_text,created_at')
      .eq('conversation_id', selected.id).eq('site_id', selected.site_id).order('created_at')
      .then(({ data, error }) => {
        if (!current) return;
        if (error) setError('The conversation could not be loaded. Select it again to retry.');
        else setMessages(data || []);
      });
    return () => { current = false; };
  }, [selected]);
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center gap-3">
      <label className="text-sm font-semibold">Brand / partner
        <select className="ml-2 rounded border p-2" value={site} onChange={e => { setSite(e.target.value); setPage(0); }}>
          {sites.map(s => <option key={s.id} value={s.id}>{s.display_name}{s.enabled ? '' : ' (intake paused)'}</option>)}
        </select>
      </label>
      <Button variant="outline" disabled={loading} onClick={() => setRefresh(x => x + 1)}>Refresh</Button>
      <Button asChild variant="outline"><Link to="/start">Open visitor experience</Link></Button>
      <Button asChild variant="outline"><Link to="/admin?tab=clients">Client CRM</Link></Button>
    </div>
    {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-red-900">{error}</p>}
    <p className="text-sm text-slate-600">{count} retained conversations. On this page: {rows.filter(r => r.follow_up_requested_at).length} follow-up requests. Source answers are visitor-reported; campaign tags are captured from the arriving link. Neither proves a sale was caused by a campaign.</p>
    <div className="grid gap-5 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Visitor conversations</CardTitle></CardHeader><CardContent className="space-y-2">
        {loading ? <p role="status">Loading…</p> : !rows.length && <p>No conversations in this view yet.</p>}
        {rows.map(row => <button type="button" key={row.id} onClick={() => { setError(''); setSelected(row); }}
          className={`w-full rounded border p-3 text-left ${selected?.id === row.id ? 'border-cyan-600 bg-cyan-50' : 'border-slate-200'}`}>
          <p className="font-semibold">{row.contact_name || 'Browsing visitor'}</p>
          <p className="text-sm">{row.reported_source || row.attribution.utmSource || 'Source not provided'}</p>
          <p className="text-xs text-slate-600">{new Date(row.created_at).toLocaleString()} · {row.quote_requests?.status || (row.follow_up_requested_at ? 'Follow-up requested' : 'Exploring')}</p>
        </button>)}
        <div className="flex items-center justify-between pt-3">
          <Button variant="outline" disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span>Page {page + 1}</span>
          <Button variant="outline" disabled={(page + 1) * 50 >= count || loading} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>{selected ? 'Conversation and handoff' : 'Select a conversation'}</CardTitle></CardHeader><CardContent className="space-y-4">
        {selected && <>
          <dl className="space-y-2 text-sm">
            <div><dt className="font-semibold">Visitor-reported source</dt><dd>{selected.reported_source || 'Not provided'}</dd></div>
            <div><dt className="font-semibold">Visitor-reported search phrase</dt><dd>{selected.reported_search || 'Not provided'}</dd></div>
            <div><dt className="font-semibold">Captured link information</dt><dd>{Object.entries(selected.attribution).filter(([, value]) => value).map(([key, value]) => <p key={key}>{key}: {value}</p>)}</dd></div>
            <div><dt className="font-semibold">Follow-up</dt><dd>{selected.follow_up_requested_at ? `${selected.contact_name} · ${selected.contact_email}` : 'Not requested'}</dd></div>
            {selected.quote_request_id && <div><dt className="font-semibold">Linked CRM inquiry</dt><dd className="break-all">{selected.quote_request_id}</dd><dd>{selected.quote_requests?.assigned_rep_name || 'Unassigned'} · {selected.quote_requests?.status || 'New'}</dd></div>}
          </dl>
          {selected.quote_request_id && <Button asChild><Link to={`/admin?tab=quote-requests&inquiry=${selected.quote_request_id}`}>Open CRM inquiry</Link></Button>}
          <div className="space-y-3" aria-label="Conversation transcript">
            {messages.map(m => <div key={m.id} className="space-y-2 border-t pt-3">
              <p className="whitespace-pre-wrap"><strong>Visitor:</strong> {m.visitor_text}</p>
              <p className="whitespace-pre-wrap text-slate-600"><strong>Guide:</strong> {m.assistant_text}</p>
            </div>)}
          </div>
        </>}
      </CardContent></Card>
    </div>
  </div>;
};
export default VisitorConversations;
