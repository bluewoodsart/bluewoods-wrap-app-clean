import { useEffect, useMemo, useState } from 'react';
import {
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  ExternalLink,
  Filter,
  Loader2,
  MapPin,
  PackageCheck,
  Plus,
  Search,
  Sparkles,
  Upload,
  Video,
  WandSparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';

type LeadStatus = 'discovered' | 'contacted' | 'interviewed' | 'product_featured' | 'tiktok_ready' | 'selling' | 'parked';
type VerificationStatus = 'needs_review' | 'verified' | 'rejected';

interface NetworkingLead {
  id: string;
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  social_links: string | null;
  business_category: string | null;
  where_met: string | null;
  date_met: string | null;
  product_summary: string | null;
  notes: string | null;
  card_image_path: string | null;
  original_file_name: string | null;
  tiktok_opportunity: boolean;
  can_ship: boolean | null;
  status: LeadStatus;
  verification_status: VerificationStatus;
  episode_name: string | null;
  social_profiles?: Record<string, string | null>;
  extraction_confidence?: number | null;
  extraction_notes?: string | null;
  batch_id?: string | null;
  card_index?: number | null;
  created_at: string;
}

interface ExtractedLead {
  business_name: string | null; contact_name: string | null; phone: string | null; email: string | null;
  website: string | null; business_category: string | null; product_summary: string | null;
  social_profiles: Record<string, string | null>; confidence: number; review_notes: string;
}

interface LeadDraft {
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  website: string;
  socialLinks: string;
  category: string;
  whereMet: string;
  dateMet: string;
  productSummary: string;
  notes: string;
  episodeName: string;
  tiktokOpportunity: boolean;
  canShip: '' | 'yes' | 'no';
}

const emptyDraft = (): LeadDraft => ({
  businessName: '', contactName: '', phone: '', email: '', website: '', socialLinks: '', category: '',
  whereMet: '', dateMet: new Date().toISOString().slice(0, 10), productSummary: '', notes: '',
  episodeName: 'Found Local · Episode 1', tiktokOpportunity: false, canShip: ''
});

const statuses: Array<{ value: LeadStatus; label: string }> = [
  { value: 'discovered', label: 'Discovered' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'interviewed', label: 'Interviewed' },
  { value: 'product_featured', label: 'Product Featured' },
  { value: 'tiktok_ready', label: 'TikTok Ready' },
  { value: 'selling', label: 'Selling' },
  { value: 'parked', label: 'Parked' }
];

const statusLabel = (value: string) => statuses.find((item) => item.value === value)?.label ?? value;
const cleanNullable = (value: string) => value.trim() || null;

const BusinessCardNetworking = ({ adminUserId }: { adminUserId: string }) => {
  const [leads, setLeads] = useState<NetworkingLead[]>([]);
  const [draft, setDraft] = useState<LeadDraft>(emptyDraft);
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LeadStatus>('all');

  const loadLeads = async () => {
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase
      .from('business_network_leads')
      .select('*')
      .order('created_at', { ascending: false });
    setLoading(false);
    if (loadError) {
      setError(loadError.message.includes('business_network_leads')
        ? 'The networking database migration has not been installed yet.'
        : loadError.message);
      return;
    }
    setLeads((data ?? []) as NetworkingLead[]);
  };

  useEffect(() => { void loadLeads(); }, []);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
      if (!term) return true;
      return [lead.business_name, lead.contact_name, lead.business_category, lead.where_met, lead.product_summary]
        .some((value) => value?.toLowerCase().includes(term));
    });
  }, [leads, search, statusFilter]);

  const chooseCard = (file: File | null) => {
    setError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Choose a photograph of a business card.'); return; }
    if (file.size > 15 * 1024 * 1024) { setError('Business-card images must be 15 MB or smaller.'); return; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setCardFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const saveLead = async () => {
    if (saving) return;
    if (draft.businessName.trim().length < 2) { setError('Enter the business name after checking the card.'); return; }
    setSaving(true);
    setError('');
    setMessage('Saving verified networking lead...');

    let cardImagePath: string | null = null;
    if (cardFile) {
      const safeName = cardFile.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
      cardImagePath = `${adminUserId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('business-card-networking')
        .upload(cardImagePath, cardFile, { contentType: cardFile.type, upsert: false });
      if (uploadError) {
        setSaving(false); setMessage(''); setError(`Card image could not be uploaded: ${uploadError.message}`); return;
      }
    }

    const { error: insertError } = await supabase.from('business_network_leads').insert({
      business_name: draft.businessName.trim(),
      contact_name: cleanNullable(draft.contactName), phone: cleanNullable(draft.phone),
      email: cleanNullable(draft.email), website: cleanNullable(draft.website),
      social_links: cleanNullable(draft.socialLinks), business_category: cleanNullable(draft.category),
      where_met: cleanNullable(draft.whereMet), date_met: draft.dateMet || null,
      product_summary: cleanNullable(draft.productSummary), notes: cleanNullable(draft.notes),
      episode_name: cleanNullable(draft.episodeName), tiktok_opportunity: draft.tiktokOpportunity,
      can_ship: draft.canShip === '' ? null : draft.canShip === 'yes',
      card_image_path: cardImagePath, original_file_name: cardFile?.name ?? null,
      created_by_admin_user_id: adminUserId
    });

    if (insertError) {
      if (cardImagePath) await supabase.storage.from('business-card-networking').remove([cardImagePath]);
      setSaving(false); setMessage(''); setError(insertError.message); return;
    }

    setDraft(emptyDraft()); setCardFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(''); setSaving(false); setMessage('Lead saved. It remains outside the quote pipeline.');
    await loadLeads();
  };

  const analyzeBoard = async () => {
    if (!cardFile || analyzing) { setError('Upload the group photograph first.'); return; }
    setAnalyzing(true); setError(''); setMessage('Uploading the board securely, then reading every visible card...');
    const safeName = cardFile.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
    const imagePath = `${adminUserId}/boards/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('business-card-networking')
      .upload(imagePath, cardFile, { contentType: cardFile.type, upsert: false });
    if (uploadError) { setAnalyzing(false); setMessage(''); setError(`Board image could not be uploaded: ${uploadError.message}`); return; }
    const { data: signed, error: signError } = await supabase.storage.from('business-card-networking').createSignedUrl(imagePath, 900);
    if (signError || !signed?.signedUrl) { setAnalyzing(false); setMessage(''); setError(signError?.message || 'Could not prepare the board for analysis.'); return; }
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/send-video-instruction-notification', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({ mode: 'business-card-board', imageUrl: signed.signedUrl })
    });
    const result = await response.json();
    if (!response.ok) { setAnalyzing(false); setMessage(''); setError(result.error || 'The board could not be analyzed.'); return; }
    const extracted = (result.leads || []) as ExtractedLead[];
    const usable = extracted.filter((lead) => lead.business_name?.trim());
    if (!usable.length) { setAnalyzing(false); setMessage(''); setError('No business names were legible. Retake the photo closer or in smaller groups.'); return; }
    const batchId = crypto.randomUUID();
    const rows = usable.map((lead, index) => {
      const socialLinks = Object.values(lead.social_profiles || {}).filter(Boolean).join('\n') || null;
      return {
        business_name: lead.business_name!.trim(), contact_name: lead.contact_name, phone: lead.phone, email: lead.email,
        website: lead.website, social_links: socialLinks, social_profiles: lead.social_profiles || {},
        business_category: lead.business_category, product_summary: lead.product_summary,
        where_met: cleanNullable(draft.whereMet), date_met: draft.dateMet || null,
        notes: cleanNullable(draft.notes), episode_name: cleanNullable(draft.episodeName),
        tiktok_opportunity: Boolean(lead.social_profiles?.tiktok), can_ship: null,
        card_image_path: imagePath, original_file_name: cardFile.name,
        created_by_admin_user_id: adminUserId, verification_status: 'needs_review', status: 'discovered',
        extraction_confidence: Math.max(0, Math.min(1, lead.confidence || 0)), extraction_notes: lead.review_notes || null,
        batch_id: batchId, card_index: index + 1
      };
    });
    const { error: insertError } = await supabase.from('business_network_leads').insert(rows);
    if (insertError) { setAnalyzing(false); setMessage(''); setError(insertError.message); return; }
    setAnalyzing(false); setCardFile(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl('');
    setMessage(`${rows.length} contacts were added to the review queue. Verify each one before outreach.`);
    await loadLeads();
  };

  const updateLead = async (id: string, patch: Partial<NetworkingLead>) => {
    setError('');
    const { error: updateError } = await supabase
      .from('business_network_leads')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (updateError) { setError(updateError.message); return; }
    setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, ...patch } : lead));
  };

  const openCard = async (path: string) => {
    const { data, error: signError } = await supabase.storage.from('business-card-networking').createSignedUrl(path, 300);
    if (signError || !data?.signedUrl) { setError(signError?.message || 'Card image is unavailable.'); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const verifiedCount = leads.filter((lead) => lead.verification_status === 'verified').length;
  const tiktokCount = leads.filter((lead) => lead.tiktok_opportunity).length;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">BWB local network</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Business Card Networking</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Turn real-world meetings into reviewed CRM leads, product discoveries, and possible TikTok features—without pretending anyone requested a quote.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/10 px-4 py-3"><b className="block text-2xl">{leads.length}</b><span className="text-[10px] uppercase text-slate-300">Discovered</span></div>
            <div className="rounded-xl bg-white/10 px-4 py-3"><b className="block text-2xl">{verifiedCount}</b><span className="text-[10px] uppercase text-slate-300">Verified</span></div>
            <div className="rounded-xl bg-cyan-400/20 px-4 py-3"><b className="block text-2xl text-cyan-200">{tiktokCount}</b><span className="text-[10px] uppercase text-cyan-100">TikTok</span></div>
          </div>
        </div>
      </section>

      <Card className="border-violet-200 bg-violet-50 shadow-sm">
        <CardContent className="grid gap-4 p-5 md:grid-cols-[auto_1fr_auto] md:items-center">
          <div className="rounded-xl bg-violet-700 p-3 text-white"><Video className="h-6 w-6" /></div>
          <div><p className="text-xs font-black uppercase tracking-wide text-violet-700">Show concept from Video Analysis Options</p><p className="mt-1 font-black text-slate-950">Found Local · messy card pile → organized BWB network</p><p className="mt-1 text-sm text-slate-600">`717.mp4` can become Episode 1. The original video is not available in this task yet, so transcript, frames, and scene analysis are waiting for reattachment.</p></div>
          <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-black uppercase text-amber-900">Video needed</span>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="h-fit border-slate-200 shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5 text-cyan-700" />Add a networking lead</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center transition hover:border-cyan-600 hover:bg-cyan-50">
              {previewUrl ? <img src={previewUrl} alt="Selected business card or card board" className="mx-auto max-h-48 rounded-xl object-contain" /> : <><Upload className="mx-auto h-7 w-7 text-slate-500" /><p className="mt-2 text-sm font-black">Upload one card or a whole card board</p><p className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP, HEIC · 15 MB maximum</p></>}
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => chooseCard(event.target.files?.[0] ?? null)} />
            </label>
            {cardFile && <Button type="button" onClick={() => void analyzeBoard()} disabled={analyzing} className="w-full bg-violet-700 text-white hover:bg-violet-800">{analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}{analyzing ? 'Reading Every Card...' : 'Analyze Whole Board Into Leads'}</Button>}
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-slate-400"><span className="h-px flex-1 bg-slate-200" />or enter one card<span className="h-px flex-1 bg-slate-200" /></div>
            <div><Label>Business name *</Label><Input className="mt-1" value={draft.businessName} onChange={(e) => setDraft({ ...draft, businessName: e.target.value })} placeholder="Verify this from the card" /></div>
            <div className="grid gap-3 sm:grid-cols-2"><div><Label>Contact person</Label><Input className="mt-1" value={draft.contactName} onChange={(e) => setDraft({ ...draft, contactName: e.target.value })} /></div><div><Label>Category</Label><Input className="mt-1" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Food, beauty, auto..." /></div></div>
            <div className="grid gap-3 sm:grid-cols-2"><div><Label>Phone</Label><Input className="mt-1" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></div><div><Label>Email</Label><Input className="mt-1" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div></div>
            <div><Label>Website</Label><Input className="mt-1" value={draft.website} onChange={(e) => setDraft({ ...draft, website: e.target.value })} /></div>
            <div><Label>Instagram / TikTok / other links</Label><Input className="mt-1" value={draft.socialLinks} onChange={(e) => setDraft({ ...draft, socialLinks: e.target.value })} /></div>
            <div className="grid gap-3 sm:grid-cols-2"><div><Label>Where you met</Label><Input className="mt-1" value={draft.whereMet} onChange={(e) => setDraft({ ...draft, whereMet: e.target.value })} placeholder="Market, festival, event" /></div><div><Label>Date met</Label><Input className="mt-1" type="date" value={draft.dateMet} onChange={(e) => setDraft({ ...draft, dateMet: e.target.value })} /></div></div>
            <div><Label>Product or service</Label><Textarea className="mt-1" value={draft.productSummary} onChange={(e) => setDraft({ ...draft, productSummary: e.target.value })} placeholder="What do they make or sell?" /></div>
            <div className="grid gap-3 sm:grid-cols-2"><label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-bold"><input type="checkbox" checked={draft.tiktokOpportunity} onChange={(e) => setDraft({ ...draft, tiktokOpportunity: e.target.checked })} className="h-4 w-4 accent-cyan-700" />Product / TikTok opportunity</label><div><Label>Can it ship?</Label><select className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={draft.canShip} onChange={(e) => setDraft({ ...draft, canShip: e.target.value as LeadDraft['canShip'] })}><option value="">Unknown</option><option value="yes">Yes</option><option value="no">No</option></select></div></div>
            <div><Label>Show / episode</Label><Input className="mt-1" value={draft.episodeName} onChange={(e) => setDraft({ ...draft, episodeName: e.target.value })} /></div>
            <div><Label>Private notes</Label><Textarea className="mt-1" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
            {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
            {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}
            <Button onClick={() => void saveLead()} disabled={saving} className="w-full bg-cyan-700 text-white hover:bg-cyan-800">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}{saving ? 'Saving Lead...' : 'Save as Networking Lead'}</Button>
          </CardContent>
        </Card>

        <Card className="min-w-0 border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-200"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><CardTitle>Local business discoveries</CardTitle><p className="mt-1 text-sm text-slate-600">Review first. Contact details from wide group photos should never be trusted automatically.</p></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads" className="pl-9" /></div><div className="relative"><Filter className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | LeadStatus)} className="h-10 rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm"><option value="all">All statuses</option>{statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div></div></div></CardHeader>
          <CardContent className="p-0">
            {loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Loading networking leads...</div> : filteredLeads.length === 0 ? <div className="p-12 text-center"><BriefcaseBusiness className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-black text-slate-700">No matching networking leads yet</p><p className="mt-1 text-sm text-slate-500">Add the first verified business card from your local stack.</p></div> : <div className="divide-y divide-slate-100">{filteredLeads.map((lead) => (
              <article key={lead.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_190px]">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black text-slate-950">{lead.business_name}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${lead.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{lead.verification_status === 'verified' ? 'Verified lead' : 'Needs review'}</span>{lead.tiktok_opportunity && <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2.5 py-1 text-[10px] font-black uppercase text-cyan-900"><Sparkles className="h-3 w-3" />TikTok opportunity</span>}</div>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{lead.contact_name || 'Contact not verified'}{lead.business_category ? ` · ${lead.business_category}` : ''}</p>
                  {lead.extraction_confidence != null && <p className={`mt-2 text-xs font-black ${lead.extraction_confidence >= .8 ? 'text-emerald-700' : lead.extraction_confidence >= .55 ? 'text-amber-700' : 'text-red-700'}`}>{Math.round(lead.extraction_confidence * 100)}% extraction confidence · verify before contact</p>}
                  {lead.product_summary && <p className="mt-3 text-sm leading-6 text-slate-600">{lead.product_summary}</p>}
                  {lead.extraction_notes && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{lead.extraction_notes}</p>}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">{lead.where_met && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1"><MapPin className="h-3 w-3" />{lead.where_met}</span>}{lead.can_ship !== null && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1"><PackageCheck className="h-3 w-3" />{lead.can_ship ? 'Can ship' : 'Local only'}</span>}{lead.episode_name && <span className="rounded-full bg-violet-100 px-2.5 py-1 text-violet-800">{lead.episode_name}</span>}</div>
                  <div className="mt-4 flex flex-wrap gap-2">{lead.card_image_path && <Button size="sm" variant="outline" onClick={() => void openCard(lead.card_image_path!)}><ExternalLink className="mr-2 h-3.5 w-3.5" />View original card</Button>}{lead.verification_status !== 'verified' && <Button size="sm" onClick={() => void updateLead(lead.id, { verification_status: 'verified' })} className="bg-emerald-700 text-white hover:bg-emerald-800"><CheckCircle2 className="mr-2 h-3.5 w-3.5" />Approve as CRM lead</Button>}</div>
                </div>
                <div><Label>Status</Label><select value={lead.status} onChange={(e) => void updateLead(lead.id, { status: e.target.value as LeadStatus })} className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold">{statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><p className="mt-3 text-xs leading-5 text-slate-500">Added {new Date(lead.created_at).toLocaleDateString()}</p>{lead.phone && <a className="mt-2 block text-xs font-bold text-blue-700" href={`tel:${lead.phone}`}>{lead.phone}</a>}{lead.email && <a className="mt-1 block break-all text-xs font-bold text-blue-700" href={`mailto:${lead.email}`}>{lead.email}</a>}{lead.website && <a className="mt-1 block break-all text-xs font-bold text-blue-700" href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer">Website</a>}{Object.entries(lead.social_profiles || {}).filter(([, url]) => url).map(([network, url]) => <a key={network} className="mt-1 block break-all text-xs font-bold capitalize text-violet-700" href={url!} target="_blank" rel="noreferrer">{network}</a>)}</div>
              </article>
            ))}</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BusinessCardNetworking;
