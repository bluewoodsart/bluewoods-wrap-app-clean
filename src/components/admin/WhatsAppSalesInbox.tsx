import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, MessageCircle, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';

type Contact = { id: string; profile_name: string | null; phone: string; lead_status: string; project_type: string | null; vehicle_or_trailer: string | null; dimensions: string | null; location: string | null; deadline: string | null; budget: string | null; last_message_at: string | null };
type Conversation = { id: string; status: string; summary: string | null; whatsapp_contacts: Contact; whatsapp_messages: Array<{ id: string; direction: string; body: string | null; message_type: string; status: string; created_at: string }>; whatsapp_outbound_approvals: Array<{ id: string; draft_body: string; draft_kind: string; status: string; created_at: string }> };

const WhatsAppSalesInbox = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('whatsapp_conversations').select(`
      id,status,summary,
      whatsapp_contacts(id,profile_name,phone,lead_status,project_type,vehicle_or_trailer,dimensions,location,deadline,budget,last_message_at),
      whatsapp_messages(id,direction,body,message_type,status,created_at),
      whatsapp_outbound_approvals(id,draft_body,draft_kind,status,created_at)
    `).order('updated_at', { ascending: false });
    if (error) setMessage(error.message.includes('whatsapp_conversations') ? 'WhatsApp workspace is awaiting its database migration.' : error.message);
    else {
      const rows = (data || []) as unknown as Conversation[];
      setConversations(rows.map((row) => ({ ...row, whatsapp_messages: [...(row.whatsapp_messages || [])].sort((a,b) => a.created_at.localeCompare(b.created_at)), whatsapp_outbound_approvals: [...(row.whatsapp_outbound_approvals || [])].sort((a,b) => b.created_at.localeCompare(a.created_at)) })));
      setSelectedId((current) => current || rows[0]?.id || null);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);
  const selected = useMemo(() => conversations.find((item) => item.id === selectedId) || null, [conversations, selectedId]);
  const pending = selected?.whatsapp_outbound_approvals.find((item) => item.status === 'pending') || null;
  useEffect(() => { setDraft(pending?.draft_body || ''); setMessage(''); }, [pending?.id, selectedId]);

  const approveAndSend = async () => {
    if (!pending || !draft.trim()) return;
    setSending(true); setMessage('');
    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch('/api/whatsapp-send-approved', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token || ''}` }, body: JSON.stringify({ approvalId: pending.id, body: draft.trim() }) });
    const result = await response.json();
    setSending(false);
    if (!response.ok) { setMessage(result.error || 'Message was not sent.'); return; }
    setMessage('Approved and sent through WhatsApp.');
    await load();
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl bg-[#071b15] text-white shadow-lg">
        <div className="h-2 bg-[#25D366]" />
        <div className="flex flex-col gap-5 p-6 md:flex-row md:items-end md:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[.16em] text-[#77f2a5]">BWB controlled communications</p><h2 className="mt-2 text-3xl font-black">WhatsApp Sales Assistant</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-50/80">Trailer and wrap inquiries enter the CRM, get qualified, and receive a prepared response. Nothing customer-facing is sent until Ashley or approved staff reviews it.</p></div>
          <div className="flex gap-2"><span className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold">{conversations.length} leads</span><span className="rounded-full bg-amber-300 px-3 py-2 text-xs font-black text-amber-950">{conversations.reduce((count,row) => count + row.whatsapp_outbound_approvals.filter(a => a.status === 'pending').length, 0)} approvals</span></div>
        </div>
      </section>
      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card><CardHeader className="flex-row items-center justify-between"><CardTitle>Conversations</CardTitle><Button size="sm" variant="outline" onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Button></CardHeader><CardContent className="space-y-2">
          {loading ? <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading...</p> : conversations.length === 0 ? <div className="py-10 text-center"><MessageCircle className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 font-bold">No WhatsApp leads yet</p><p className="mt-1 text-sm text-slate-500">New messages will appear after Meta connects the webhook.</p></div> : conversations.map((conversation) => <button key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={`w-full rounded-xl border p-3 text-left ${selectedId === conversation.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}><div className="flex justify-between gap-2"><p className="font-black">{conversation.whatsapp_contacts.profile_name || conversation.whatsapp_contacts.phone}</p>{conversation.whatsapp_outbound_approvals.some(a => a.status === 'pending') && <span className="rounded-full bg-amber-200 px-2 py-1 text-[10px] font-black">REVIEW</span>}</div><p className="mt-1 truncate text-xs text-slate-500">{conversation.whatsapp_messages.at(-1)?.body || 'New lead'}</p></button>)}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>{selected ? selected.whatsapp_contacts.profile_name || selected.whatsapp_contacts.phone : 'Select a conversation'}</CardTitle></CardHeader><CardContent>
          {!selected ? <p className="py-12 text-center text-sm text-slate-500">Choose a WhatsApp lead to review.</p> : <div className="space-y-5">
            <div className="flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-slate-100 px-3 py-1.5">{selected.whatsapp_contacts.phone}</span><span className="rounded-full bg-blue-100 px-3 py-1.5 text-blue-800">{selected.whatsapp_contacts.lead_status}</span><span className="rounded-full bg-violet-100 px-3 py-1.5 text-violet-800">{selected.status.replace('_',' ')}</span></div>
            <div className="max-h-80 space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-4">{selected.whatsapp_messages.map(item => <div key={item.id} className={`max-w-[85%] rounded-xl p-3 text-sm ${item.direction === 'outbound' ? 'ml-auto bg-emerald-700 text-white' : 'bg-white shadow-sm'}`}><p>{item.body || `[${item.message_type}]`}</p><p className={`mt-1 text-[10px] ${item.direction === 'outbound' ? 'text-emerald-100' : 'text-slate-400'}`}>{new Date(item.created_at).toLocaleString()}</p></div>)}</div>
            {pending ? <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-amber-700" /><p className="font-black text-amber-950">Approval required before sending</p></div><p className="mt-1 text-xs text-amber-800">Edit the assistant draft if needed. The customer has not received this.</p><Textarea className="mt-3 min-h-32 bg-white" value={draft} onChange={(event) => setDraft(event.target.value)} /><Button onClick={() => void approveAndSend()} disabled={sending || !draft.trim()} className="mt-3 w-full bg-emerald-700 hover:bg-emerald-800"><Send className="mr-2 h-4 w-4" />{sending ? 'Sending...' : 'Approve and Send'}</Button></div> : <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900"><CheckCircle2 className="mr-2 inline h-4 w-4" />No response is waiting for approval.</div>}
            {message && <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700">{message}</p>}
          </div>}
        </CardContent></Card>
      </div>
    </div>
  );
};

export default WhatsAppSalesInbox;
