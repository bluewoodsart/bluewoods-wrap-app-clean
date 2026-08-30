import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, QrCode, RefreshCw, Save, UserRoundCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

interface BannerLead {
  id: string;
  quote_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  preferred_contact: string;
  rep_slug: string | null;
  assigned_rep_name: string | null;
  quote_data: Record<string, unknown>;
  status: string;
  created_at: string;
}

interface OrderIntent {
  id: string;
  intent_code: string;
  status: string;
  total_cents: number;
  created_at: string;
}

interface CampaignPayload {
  campaign: {
    campaign_name: string;
    status: string;
    offer_code: string | null;
    public_path: string;
    starts_at: string | null;
    ends_at: string | null;
    content: Record<string, unknown>;
    seo: Record<string, unknown>;
  } | null;
  leads: BannerLead[];
  orderIntents: OrderIntent[];
}

const customerPage = 'https://master-front-end-blue-woods.bluewoodsart.chatgpt.site/banners/labor-day';
const davidQrRoute = 'https://master-front-end-blue-woods.bluewoodsart.chatgpt.site/go/david';
const commerceControl = 'https://master-front-end-blue-woods.bluewoodsart.chatgpt.site/marketing/banner-commerce';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));

const formatStatus = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const localDateTime = (value: string | null | undefined) => value ? new Date(value).toISOString().slice(0, 16) : '';

const localeRecord = (campaign: CampaignPayload['campaign'], locale: 'en' | 'es') => {
  const content = campaign?.content || {};
  const locales = (content.locales || {}) as Record<string, Record<string, unknown>>;
  return locales[locale] || {};
};

const BannerLeadCampaignBoard = () => {
  const [data, setData] = useState<CampaignPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data: result, error: loadError } = await supabase.rpc('get_banner_campaign_admin', {
      p_slug: 'labor-day'
    });
    setLoading(false);
    if (loadError) {
      setError(loadError.message);
      setData(null);
      return;
    }
    setData((result ?? null) as CampaignPayload | null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const leads = data?.leads ?? [];
  const davidLeads = useMemo(() => leads.filter((lead) => lead.rep_slug === 'david'), [leads]);
  const spanishLeads = useMemo(() => leads.filter((lead) => lead.quote_data?.locale === 'es'), [leads]);
  const campaign = data?.campaign ?? null;
  const english = localeRecord(campaign, 'en');
  const spanish = localeRecord(campaign, 'es');

  const saveCampaign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!campaign) return;
    const form = new FormData(event.currentTarget);
    const content = campaign.content || {};
    const locales = (content.locales || {}) as Record<string, Record<string, unknown>>;
    setSaving(true);
    setSaveMessage('');
    const { error: saveError } = await supabase.rpc('update_banner_campaign_admin', {
      p_slug: 'labor-day',
      p_updates: {
        status: form.get('status'),
        startsAt: form.get('startsAt') || null,
        endsAt: form.get('endsAt') || null,
        offerCode: form.get('offerCode'),
        content: {
          ...content,
          locales: {
            ...locales,
            en: { ...(locales.en || {}), headline: form.get('headlineEn'), lead: form.get('leadEn'), cta: form.get('ctaEn') },
            es: { ...(locales.es || {}), headline: form.get('headlineEs'), lead: form.get('leadEs'), cta: form.get('ctaEs') }
          }
        },
        seo: {
          ...(campaign.seo || {}),
          title: form.get('seoTitle'),
          description: form.get('seoDescription'),
          canonicalPath: '/banners/labor-day'
        }
      }
    });
    setSaving(false);
    if (saveError) {
      setSaveMessage(saveError.message);
      return;
    }
    setSaveMessage('Campaign saved. The English and Spanish customer page now use this content.');
    await load();
  };

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-red-200 shadow-sm">
        <div className="h-2 bg-gradient-to-r from-red-600 via-white to-blue-800" />
        <CardHeader className="border-b border-slate-200 bg-slate-950 text-white">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200">
                  {data?.campaign?.status === 'live' ? 'Live campaign' : data?.campaign?.status || 'Loading'}
                </span>
                <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">
                  SlapWrapz · Banner Blitz
                </span>
              </div>
              <CardTitle className="mt-3 text-3xl text-white">
                {data?.campaign?.campaign_name || 'Labor Day Banner Blitz'}
              </CardTitle>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                English and Spanish banner lead campaign with conversational intake, rep attribution, a permanent vehicle QR, and one-banner checkout readiness.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white hover:text-slate-950">
                <a href={customerPage} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Customer page</a>
              </Button>
              <Button asChild className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">
                <a href={commerceControl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Campaign controls</a>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <UserRoundCheck className="h-5 w-5 text-emerald-700" />
            <p className="mt-3 text-xs font-black uppercase tracking-wide text-emerald-800">Launch rep #1</p>
            <p className="mt-1 text-2xl font-black text-slate-950">David</p>
            <p className="mt-1 text-xs text-slate-600">Spanish-first · attribution code: david</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <Users className="h-5 w-5 text-slate-700" />
            <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-600">Campaign signups</p>
            <p className="mt-1 text-3xl font-black text-slate-950">{leads.length}</p>
            <p className="mt-1 text-xs text-slate-600">{davidLeads.length} credited to David</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-blue-800">Spanish signups</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{spanishLeads.length}</p>
            <p className="mt-1 text-xs text-slate-600">Español customer conversation</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-amber-800">Checkout starts</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{data?.orderIntents?.length ?? 0}</p>
            <p className="mt-1 text-xs text-slate-600">Quote mode until approved prices and links are ready</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-emerald-200 shadow-sm">
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-emerald-800"><QrCode className="h-5 w-5" /><p className="text-xs font-black uppercase tracking-[0.14em]">David’s permanent vehicle QR</p></div>
            <h3 className="mt-2 text-2xl font-black text-slate-950">/go/david</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">The printed QR stays permanent. Marketing can change its destination for the next holiday without losing David’s credit.</p>
          </div>
          <Button asChild variant="outline" className="border-emerald-300 bg-emerald-50 hover:bg-emerald-100">
            <a href={davidQrRoute} target="_blank" rel="noreferrer"><QrCode className="mr-2 h-4 w-4" />Test David’s QR</a>
          </Button>
        </CardContent>
      </Card>

      {campaign && (
        <Card className="border-cyan-200 shadow-sm">
          <CardHeader className="border-b border-slate-200">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-700">Seasonal template controls</p>
            <CardTitle>Change the campaign from BWB Marketing</CardTitle>
            <p className="text-sm text-slate-500">These fields drive the live English and Spanish `/banners/labor-day` page. Pricing and checkout stay in owner commerce controls.</p>
          </CardHeader>
          <CardContent className="p-5">
            <form key={`${campaign.status}-${campaign.starts_at}-${campaign.ends_at}`} onSubmit={saveCampaign} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="text-xs font-black uppercase tracking-wide text-slate-600">Status
                  <select name="status" defaultValue={campaign.status} className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm normal-case">
                    <option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="live">Live</option><option value="paused">Paused</option><option value="ended">Ended</option>
                  </select>
                </label>
                <label className="text-xs font-black uppercase tracking-wide text-slate-600">Offer code
                  <input name="offerCode" defaultValue={campaign.offer_code || ''} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm normal-case" />
                </label>
                <label className="text-xs font-black uppercase tracking-wide text-slate-600">Starts
                  <input name="startsAt" type="datetime-local" defaultValue={localDateTime(campaign.starts_at)} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm normal-case" />
                </label>
                <label className="text-xs font-black uppercase tracking-wide text-slate-600">Ends
                  <input name="endsAt" type="datetime-local" defaultValue={localDateTime(campaign.ends_at)} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm normal-case" />
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {[
                  { code: 'En', label: 'English', values: english },
                  { code: 'Es', label: 'Español', values: spanish }
                ].map(({ code, label, values }) => (
                  <fieldset key={code} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <legend className="px-2 text-xs font-black uppercase tracking-[0.14em] text-slate-700">{label}</legend>
                    <div className="space-y-3">
                      <label className="block text-sm font-bold">Headline<input name={`headline${code}`} defaultValue={String(values.headline || '')} className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 font-normal" /></label>
                      <label className="block text-sm font-bold">Lead message<textarea name={`lead${code}`} defaultValue={String(values.lead || '')} rows={3} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal" /></label>
                      <label className="block text-sm font-bold">Button text<input name={`cta${code}`} defaultValue={String(values.cta || '')} className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 font-normal" /></label>
                    </div>
                  </fieldset>
                ))}
              </div>

              <fieldset className="rounded-xl border border-slate-200 p-4">
                <legend className="px-2 text-xs font-black uppercase tracking-[0.14em] text-slate-700">SEO</legend>
                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="text-sm font-bold">Search title<input name="seoTitle" defaultValue={String(campaign.seo?.title || '')} className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 font-normal" /></label>
                  <label className="text-sm font-bold">Search description<textarea name="seoDescription" defaultValue={String(campaign.seo?.description || '')} rows={2} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
                </div>
              </fieldset>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className={`text-sm font-semibold ${saveMessage.toLowerCase().includes('saved') ? 'text-emerald-700' : 'text-red-700'}`}>{saveMessage}</p>
                <Button type="submit" disabled={saving} className="bg-slate-950 hover:bg-slate-800"><Save className="mr-2 h-4 w-4" />{saving ? 'Saving…' : 'Save seasonal campaign'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex-row items-center justify-between gap-3 border-b border-slate-200">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-700">Live attribution</p>
            <CardTitle className="mt-1">Banner signups</CardTitle>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div>
          ) : loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading campaign signups…</div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center"><p className="font-black text-slate-950">No signups yet</p><p className="mt-1 text-sm text-slate-500">David’s QR is active. New attributed requests will appear here.</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {leads.map((lead) => (
                <article key={lead.id} className="grid gap-3 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-950">{lead.customer_name}</p>
                      {lead.rep_slug === 'david' && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase text-emerald-800">David</span>}
                      {lead.quote_data?.locale === 'es' && <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black uppercase text-blue-800">Español</span>}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{lead.quote_id} · {formatDate(lead.created_at)}</p>
                  </div>
                  <div className="text-sm text-slate-700">
                    <p>{lead.customer_phone || lead.customer_email || 'Contact not supplied'}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{String(lead.quote_data?.bannerMessage || lead.quote_data?.bannerUse || 'Banner details pending')}</p>
                  </div>
                  <span className="justify-self-start rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase text-slate-700 md:justify-self-end">{formatStatus(lead.status)}</span>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950">
        Banner pricing floor: no banner may be sold below $5.00 per square foot. Minimums are $75 for 3×5 and $120 for 3×8.
      </div>
    </div>
  );
};

export default BannerLeadCampaignBoard;
