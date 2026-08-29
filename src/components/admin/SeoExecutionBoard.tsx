import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  ClipboardCheck,
  ExternalLink,
  FileSearch,
  Flag,
  Gauge,
  Globe2,
  Loader2,
  MapPin,
  SearchCheck,
  Target,
  TestTube2,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';

interface SeoAction {
  key: string;
  title: string;
  detail: string;
  verify: string;
}

interface SeoPhase {
  id: string;
  eyebrow: string;
  title: string;
  timing: string;
  description: string;
  actions: SeoAction[];
}

interface SeoProgressRow {
  action_key: string;
  completed: boolean;
  verified: boolean;
  evidence: string;
  updated_at: string;
}

interface ActionState {
  completed: boolean;
  verified: boolean;
  evidence: string;
  updatedAt?: string;
}

const phases: SeoPhase[] = [
  {
    id: 'foundation',
    eyebrow: 'Phase 1',
    title: 'Technical foundation',
    timing: 'Days 1–3',
    description: 'Give Google one clear, crawlable Fayetteville page and connect the measurement systems.',
    actions: [
      { key: 'confirm-nap', title: 'Confirm the official business name, address, phone, hours, and service area', detail: 'Verify whether 305 Etowah Trace, Suite 106 is the correct customer-facing address before publishing it anywhere.', verify: 'Compare the website, Google profile, invoices, and public directories for one exact NAP format.' },
      { key: 'build-fayetteville-page', title: 'Build /vehicle-wraps-fayetteville-ga', detail: 'Create the primary ranking page with original SlapWrapz work, services, process, FAQs, testimonials, calls, and quote buttons.', verify: 'Open the published URL on desktop and mobile; confirm content, calls, images, and both quote paths work.' },
      { key: 'seo-metadata', title: 'Correct titles, descriptions, canonicals, and old Famous.ai metadata', detail: 'Give the homepage and Fayetteville page accurate SlapWrapz search and sharing information.', verify: 'Inspect the rendered page source and social preview; confirm one canonical URL per public page.' },
      { key: 'static-rendering', title: 'Pre-render public SEO pages as crawlable HTML', detail: 'Keep the interactive React quote app while making public service content available before JavaScript runs.', verify: 'Disable JavaScript or inspect raw HTML and confirm the title, H1, service copy, address, and links remain visible.' },
      { key: 'structured-data', title: 'Add LocalBusiness, Service, Breadcrumb, and FAQ structured data', detail: 'Describe SlapWrapz, the Fayetteville service, and page hierarchy in machine-readable JSON-LD.', verify: 'Pass Google Rich Results Test and Schema validator without critical errors.' },
      { key: 'sitemap-robots-noindex', title: 'Create sitemap.xml and clean up robots/noindex rules', detail: 'List only public canonical pages and keep admin, proof, invoice, designer, login, and upload routes out of search.', verify: 'Open sitemap.xml and robots.txt; use URL Inspection to confirm public pages are indexable and private routes are not.' },
      { key: 'search-console', title: 'Connect Google Search Console for slapwrapz.com', detail: 'Verify the Domain property, submit the sitemap, and establish the search-performance baseline.', verify: 'Confirm verified ownership, accepted sitemap, and successful live URL inspection for the Fayetteville page.' },
      { key: 'ga4-gtm', title: 'Install GA4 and Google Tag Manager', detail: 'Measure the public website and single-page navigation without collecting customer contact information.', verify: 'Use Tag Assistant and GA4 Realtime/DebugView to confirm one accurate page view per route.' },
      { key: 'conversion-events', title: 'Track calls, quote starts, uploads, and submitted leads', detail: 'Create click_to_call, begin_quote, vehicle_photo_uploaded, logo_uploaded, and quote_submitted events.', verify: 'Trigger every event in a safe test flow and confirm its page, source, and event name in GA4 DebugView.' }
    ]
  },
  {
    id: 'business-profile',
    eyebrow: 'Phase 2',
    title: 'Google Business Profile',
    timing: 'Days 3–7',
    description: 'Strengthen relevance, proximity, and prominence for the Fayetteville Maps results.',
    actions: [
      { key: 'verify-google-profile', title: 'Claim and verify the official SlapWrapz Google Business Profile', detail: 'Use the real-world business identity and avoid adding ranking keywords to the business name.', verify: 'Confirm the profile is verified, public, owned by BWB, and free of duplicate listings.' },
      { key: 'complete-profile', title: 'Complete categories, services, description, hours, and contact information', detail: 'Choose the most accurate primary category and add every service that SlapWrapz actually provides.', verify: 'Compare every profile field with the confirmed website NAP and service list.' },
      { key: 'profile-landing-link', title: 'Point the profile website link to the Fayetteville landing page', detail: 'Use a tagged URL so calls and quote requests from the profile can be measured.', verify: 'Click the live profile link and confirm it lands on the correct page with source tracking intact.' },
      { key: 'profile-photos', title: 'Publish an initial set of original wrap photographs and videos', detail: 'Show completed commercial vehicles, close details, before/after views, and the production process.', verify: 'Confirm every image is original, clear, correctly oriented, and visible on the public profile.' },
      { key: 'review-workflow', title: 'Add an honest-review request to the completed-job workflow', detail: 'Give real customers a direct Google review link after delivery or proof completion; never offer incentives.', verify: 'Test the review link/QR code and confirm the request does not preselect or pressure a rating.' },
      { key: 'review-responses', title: 'Respond to every existing and new Google review', detail: 'Thank customers and answer concerns with specific, professional responses.', verify: 'Review the public profile and confirm every review has an appropriate response.' }
    ]
  },
  {
    id: 'content',
    eyebrow: 'Phase 3',
    title: 'Wrap Resources & proof of work',
    timing: 'Weeks 2–4',
    description: 'Support the Fayetteville page with original experience, real projects, and customer answers.',
    actions: [
      { key: 'resource-hub', title: 'Create the Wrap Resources hub', detail: 'Organize public content into Projects, Guides, and Locations while keeping quote forms as conversion tools.', verify: 'Confirm every resource is reachable from navigation and every article links back to the Fayetteville page.' },
      { key: 'case-study-one', title: 'Publish the first Fayetteville-area vehicle-wrap case study', detail: 'Use real project photographs, business goals, design decisions, vehicle details, and the completed result.', verify: 'Confirm customer permission, accurate facts, unique images, structured data, and a working quote CTA.' },
      { key: 'case-study-two', title: 'Publish the second original vehicle-wrap case study', detail: 'Choose a meaningfully different vehicle or business so the page adds new value.', verify: 'Compare it with the first case study and remove duplicated or generic copy.' },
      { key: 'cost-guide', title: 'Publish “How Much Does a Vehicle Wrap Cost in Fayetteville?”', detail: 'Explain design, material, vehicle size, coverage, preparation, installation, and care without fake price promises.', verify: 'Have production review every claim and confirm the page answers the real customer question.' },
      { key: 'full-vs-partial', title: 'Publish a full-wrap versus partial-wrap guide', detail: 'Help local businesses choose coverage based on budget, vehicle use, and branding needs.', verify: 'Check examples and recommendations against actual SlapWrapz capabilities.' },
      { key: 'wrap-care-faq', title: 'Publish wrap preparation, lifespan, and care FAQs', detail: 'Answer common questions using Georgia conditions and SlapWrapz installation experience.', verify: 'Validate the care guidance with production and test FAQ structured data.' },
      { key: 'internal-links', title: 'Build the internal-link path from every resource to the Fayetteville page', detail: 'Use descriptive links from projects and guides to the primary service page, then to the quote flow.', verify: 'Crawl the public pages and confirm there are no orphan pages, broken links, or circular dead ends.' }
    ]
  },
  {
    id: 'authority-measurement',
    eyebrow: 'Phase 4',
    title: 'Authority, testing & comparison',
    timing: 'Ongoing',
    description: 'Earn local trust, prove the implementation works, and compare results against the baseline.',
    actions: [
      { key: 'local-citations', title: 'Build legitimate Fayetteville citations and local links', detail: 'Pursue local business organizations, customers, partners, events, suppliers, and reputable directories.', verify: 'Open every live citation and confirm the correct NAP, website URL, and business category.' },
      { key: 'nap-audit', title: 'Audit NAP consistency across the web', detail: 'Correct conflicting names, addresses, phone numbers, or URLs that weaken local trust signals.', verify: 'Record the major listings checked and recheck corrected listings after publication.' },
      { key: 'weekly-profile-posts', title: 'Publish one useful Google Business Profile update each week', detail: 'Feature real wrap work, process education, availability, or a new resource rather than filler.', verify: 'Confirm the post is live, links correctly, and uses an original visual.' },
      { key: 'rich-results-test', title: 'Run structured-data tests after every public-page release', detail: 'Catch missing or invalid business, service, breadcrumb, and FAQ data before requesting indexing.', verify: 'Save the passing Rich Results Test URL or result note as evidence.' },
      { key: 'url-inspection', title: 'Inspect and request indexing for each approved public page', detail: 'Use Search Console only after content, canonicals, schema, and mobile behavior pass review.', verify: 'Confirm the inspected URL is eligible for indexing and the canonical matches the intended page.' },
      { key: 'performance-test', title: 'Test mobile speed and Core Web Vitals', detail: 'Protect the quote experience while optimizing hero images, JavaScript, fonts, and layout stability.', verify: 'Record mobile PageSpeed results and fix critical performance or accessibility failures.' },
      { key: 'ranking-baseline', title: 'Record the Fayetteville search baseline', detail: 'Track impressions, clicks, average position, Maps actions, calls, and submitted quotes before judging progress.', verify: 'Confirm the report uses Search Console/GBP data and clearly labels date range and query.' },
      { key: 'thirty-day-review', title: 'Run the 30-day compare-and-improve review', detail: 'Compare the baseline with current rankings, visibility, engagement, and qualified leads; choose the next improvements.', verify: 'Document what moved, what did not, and the next approved actions without claiming an unverified #1 ranking.' }
    ]
  }
];

const allActions = phases.flatMap((phase) => phase.actions);

const emptyActionState = (): ActionState => ({ completed: false, verified: false, evidence: '' });

const formatUpdatedAt = (value?: string) => {
  if (!value) return 'No activity recorded yet';
  return `Updated ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value))}`;
};

const SeoExecutionBoard = ({ adminUserId }: { adminUserId: string }) => {
  const [progressByKey, setProgressByKey] = useState<Record<string, ActionState>>({});
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({ foundation: true });
  const [openEvidenceKey, setOpenEvidenceKey] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProgress = async () => {
      setLoading(true);
      setError('');
      const { data, error: loadError } = await supabase
        .from('bwb_seo_action_progress')
        .select('action_key, completed, verified, evidence, updated_at');
      if (loadError) {
        setError(loadError.message);
      } else {
        const mapped = Object.fromEntries(((data ?? []) as SeoProgressRow[]).map((row) => [row.action_key, {
          completed: row.completed,
          verified: row.verified,
          evidence: row.evidence,
          updatedAt: row.updated_at
        }]));
        setProgressByKey(mapped);
      }
      setLoading(false);
    };
    void loadProgress();
  }, []);

  const completedCount = allActions.filter((action) => progressByKey[action.key]?.completed).length;
  const verifiedCount = allActions.filter((action) => progressByKey[action.key]?.verified).length;
  const completionPercent = Math.round((completedCount / allActions.length) * 100);
  const verificationPercent = Math.round((verifiedCount / allActions.length) * 100);
  const nextAction = allActions.find((action) => !progressByKey[action.key]?.completed) ?? null;
  const latestUpdate = useMemo(() => Object.values(progressByKey)
    .map((item) => item.updatedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1), [progressByKey]);

  const saveAction = async (actionKey: string, patch: Partial<ActionState>) => {
    const current = progressByKey[actionKey] ?? emptyActionState();
    const next = { ...current, ...patch };
    if (!next.completed) next.verified = false;
    const previous = progressByKey;
    const optimistic = { ...next, updatedAt: new Date().toISOString() };
    setProgressByKey((value) => ({ ...value, [actionKey]: optimistic }));
    setSavingKey(actionKey);
    setError('');
    const { data, error: saveError } = await supabase
      .from('bwb_seo_action_progress')
      .upsert({
        action_key: actionKey,
        completed: next.completed,
        verified: next.verified,
        evidence: next.evidence,
        updated_by_admin_user_id: adminUserId,
        updated_at: optimistic.updatedAt
      }, { onConflict: 'action_key' })
      .select('action_key, completed, verified, evidence, updated_at')
      .single();
    setSavingKey(null);
    if (saveError || !data) {
      setProgressByKey(previous);
      setError(saveError?.message || 'This SEO action could not be saved.');
      return;
    }
    const row = data as SeoProgressRow;
    setProgressByKey((value) => ({ ...value, [actionKey]: {
      completed: row.completed,
      verified: row.verified,
      evidence: row.evidence,
      updatedAt: row.updated_at
    } }));
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-cyan-200 bg-slate-950 text-white shadow-sm">
        <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">SEO execution board</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-200">Fayetteville, Georgia</span>
            </div>
            <h3 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">Win “vehicle wraps Fayetteville” visibility</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Build one authoritative local service page, support it with real projects and useful resources, route traffic into the existing lead forms, and measure every result.</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm">
            <p className="text-xs font-black uppercase tracking-wide text-cyan-200">Primary target</p>
            <p className="mt-1 font-bold">Vehicle wraps Fayetteville GA</p>
            <p className="mt-1 text-xs text-slate-300">Organic results + Google Maps</p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-xl bg-cyan-100 p-3 text-cyan-800"><Flag className="h-5 w-5" /></div><div><p className="text-2xl font-black">{allActions.length}</p><p className="text-xs font-semibold text-slate-500">Planned actions</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-xl bg-blue-100 p-3 text-blue-800"><ClipboardCheck className="h-5 w-5" /></div><div><p className="text-2xl font-black">{completedCount}</p><p className="text-xs font-semibold text-slate-500">Implemented</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-xl bg-emerald-100 p-3 text-emerald-800"><TestTube2 className="h-5 w-5" /></div><div><p className="text-2xl font-black">{verifiedCount}</p><p className="text-xs font-semibold text-slate-500">Tested & verified</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-xl bg-violet-100 p-3 text-violet-800"><TrendingUp className="h-5 w-5" /></div><div><p className="text-2xl font-black">30/60/90</p><p className="text-xs font-semibold text-slate-500">Review rhythm</p></div></CardContent></Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[1fr_1fr_1.1fr]">
          <div>
            <div className="flex items-center justify-between gap-3"><p className="text-sm font-black text-slate-900">Implementation</p><span className="text-sm font-black text-blue-700">{completionPercent}%</span></div>
            <Progress value={completionPercent} className="mt-3 h-2" />
            <p className="mt-2 text-xs text-slate-500">{completedCount} of {allActions.length} actions checked off</p>
          </div>
          <div>
            <div className="flex items-center justify-between gap-3"><p className="text-sm font-black text-slate-900">Verification</p><span className="text-sm font-black text-emerald-700">{verificationPercent}%</span></div>
            <Progress value={verificationPercent} className="mt-3 h-2 [&>div]:bg-emerald-500" />
            <p className="mt-2 text-xs text-slate-500">{verifiedCount} actions compared and tested</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-amber-800"><CircleDot className="h-4 w-4" />Next action</p>
            <p className="mt-2 text-sm font-bold text-slate-950">{nextAction?.title || 'All planned actions are implemented.'}</p>
            <p className="mt-2 text-xs text-slate-500">{formatUpdatedAt(latestUpdate)}</p>
          </div>
        </CardContent>
      </Card>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}
      {loading && <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-8 text-sm font-semibold text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Loading shared SEO progress...</div>}

      {!loading && phases.map((phase) => {
        const expanded = expandedPhases[phase.id] ?? false;
        const phaseComplete = phase.actions.filter((action) => progressByKey[action.key]?.completed).length;
        const phaseVerified = phase.actions.filter((action) => progressByKey[action.key]?.verified).length;
        return (
          <Card key={phase.id} className="overflow-hidden border-slate-200 shadow-sm">
            <button
              type="button"
              className="flex w-full flex-col gap-4 p-5 text-left transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              onClick={() => setExpandedPhases((value) => ({ ...value, [phase.id]: !expanded }))}
              aria-expanded={expanded}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black uppercase tracking-[0.14em] text-cyan-700">{phase.eyebrow}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">{phase.timing}</span></div>
                <h4 className="mt-2 text-xl font-black text-slate-950">{phase.title}</h4>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{phase.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right"><p className="text-sm font-black text-slate-950">{phaseComplete}/{phase.actions.length} built</p><p className="text-xs font-semibold text-emerald-700">{phaseVerified} verified</p></div>
                <ChevronDown className={`h-5 w-5 text-slate-500 transition ${expanded ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {expanded && (
              <CardContent className="border-t border-slate-200 p-0">
                {phase.actions.map((action, index) => {
                  const state = progressByKey[action.key] ?? emptyActionState();
                  const saving = savingKey === action.key;
                  const evidenceOpen = openEvidenceKey === action.key;
                  return (
                    <div key={action.key} className={`p-4 sm:p-5 ${index > 0 ? 'border-t border-slate-100' : ''} ${state.verified ? 'bg-emerald-50/40' : state.completed ? 'bg-blue-50/30' : 'bg-white'}`}>
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                        <div className="flex min-w-0 gap-3">
                          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${state.verified ? 'bg-emerald-600 text-white' : state.completed ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{state.verified ? <CheckCircle2 className="h-4 w-4" /> : index + 1}</div>
                          <div className="min-w-0">
                            <p className={`font-black ${state.completed ? 'text-slate-700' : 'text-slate-950'}`}>{action.title}</p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">{action.detail}</p>
                            <div className="mt-3 flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50 p-3 text-xs leading-5 text-violet-950"><SearchCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" /><span><strong>Verify:</strong> {action.verify}</span></div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 lg:w-56 lg:flex-col">
                          <label className="flex min-h-10 flex-1 cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 text-sm font-bold text-blue-900">
                            <Checkbox checked={state.completed} disabled={saving} onCheckedChange={(checked) => void saveAction(action.key, { completed: checked === true })} />Implemented
                          </label>
                          <label className={`flex min-h-10 flex-1 items-center gap-2 rounded-lg border px-3 text-sm font-bold ${state.completed ? 'cursor-pointer border-emerald-200 bg-white text-emerald-900' : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'}`}>
                            <Checkbox checked={state.verified} disabled={!state.completed || saving} onCheckedChange={(checked) => void saveAction(action.key, { verified: checked === true })} />Tested & verified
                          </label>
                          <Button size="sm" variant="outline" className="justify-start" onClick={() => setOpenEvidenceKey(evidenceOpen ? null : action.key)}><FileSearch className="mr-2 h-4 w-4" />{state.evidence ? 'View evidence' : 'Add evidence'}</Button>
                        </div>
                      </div>
                      {evidenceOpen && (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:ml-11">
                          <label className="text-xs font-black uppercase tracking-wide text-slate-600" htmlFor={`evidence-${action.key}`}>Evidence, result, or comparison note</label>
                          <Textarea id={`evidence-${action.key}`} className="mt-2 bg-white" value={state.evidence} placeholder="Paste the published URL, test result, baseline number, screenshot note, or what changed after comparison..." onChange={(event) => setProgressByKey((value) => ({ ...value, [action.key]: { ...state, evidence: event.target.value } }))} />
                          <div className="mt-3 flex flex-wrap items-center gap-3"><Button size="sm" onClick={() => void saveAction(action.key, { evidence: state.evidence })} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-2 h-4 w-4" />}Save evidence</Button><span className="text-xs text-slate-500">{formatUpdatedAt(state.updatedAt)}</span></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Card>
        );
      })}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-cyan-200 bg-cyan-50/50"><CardContent className="p-5"><Globe2 className="h-5 w-5 text-cyan-800" /><p className="mt-3 font-black text-slate-950">Public SEO layer</p><p className="mt-1 text-sm leading-6 text-slate-600">Service pages, Projects, Guides, and Locations attract search traffic without replacing the existing lead forms.</p></CardContent></Card>
        <Card className="border-blue-200 bg-blue-50/50"><CardContent className="p-5"><Target className="h-5 w-5 text-blue-800" /><p className="mt-3 font-black text-slate-950">Existing conversion layer</p><p className="mt-1 text-sm leading-6 text-slate-600">Quick Quote and Full Project remain the destination for qualified visitors and continue feeding the CRM.</p></CardContent></Card>
        <Card className="border-emerald-200 bg-emerald-50/50"><CardContent className="p-5"><BarChart3 className="h-5 w-5 text-emerald-800" /><p className="mt-3 font-black text-slate-950">Measured improvement</p><p className="mt-1 text-sm leading-6 text-slate-600">Search Console, Business Profile, GA4, rankings, calls, and leads provide the evidence for every 30-day review.</p></CardContent></Card>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2"><Gauge className="h-4 w-4 text-slate-700" />The goal is first-place visibility, but the board records evidence instead of promising an unverified ranking.</p>
        <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-bold text-cyan-800 hover:text-cyan-950">Open Search Console <ExternalLink className="h-4 w-4" /></a>
      </div>
    </div>
  );
};

export default SeoExecutionBoard;
