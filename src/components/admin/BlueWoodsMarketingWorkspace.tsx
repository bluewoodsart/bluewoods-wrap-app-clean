import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe2,
  LayoutDashboard,
  ListChecks,
  Maximize2,
  Megaphone,
  Mic2,
  Monitor,
  Network,
  Search,
  Settings,
  Share2,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SeoExecutionBoard from '@/components/admin/SeoExecutionBoard';
import SocialChannelDirectory from '@/components/admin/SocialChannelDirectory';
import PodcastCentral from '@/components/admin/PodcastCentral';
import BrandPortfolio from '@/components/admin/BrandPortfolio';

type SectionId =
  | 'overview'
  | 'master-front-end'
  | 'brands'
  | 'website-seo'
  | 'social-media'
  | 'podcasts'
  | 'content-calendar'
  | 'marketing'
  | 'lead-campaigns'
  | 'content'
  | 'partnerships'
  | 'events'
  | 'tasks'
  | 'files'
  | 'settings';

type StatusTone = 'live' | 'progress' | 'waiting' | 'planned' | 'complete';

interface NavigationItem {
  id: SectionId;
  label: string;
  icon: LucideIcon;
}

const navigation: NavigationItem[] = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'master-front-end', label: 'Master Front End', icon: Monitor },
  { id: 'brands', label: 'Brand Portfolio', icon: BriefcaseBusiness },
  { id: 'website-seo', label: 'Websites & SEO', icon: Search },
  { id: 'social-media', label: 'Social Media', icon: Share2 },
  { id: 'podcasts', label: 'Podcast Central', icon: Mic2 },
  { id: 'content-calendar', label: 'Content Calendar', icon: CalendarDays },
  { id: 'marketing', label: 'Marketing & Branding', icon: Megaphone },
  { id: 'lead-campaigns', label: 'Lead Campaigns', icon: BadgeCheck },
  { id: 'content', label: 'Content Production', icon: Sparkles },
  { id: 'partnerships', label: 'Partners & Reps', icon: Network },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'tasks', label: 'Tasks & Approvals', icon: ListChecks },
  { id: 'files', label: 'Files & Assets', icon: FolderOpen },
  { id: 'settings', label: 'Settings', icon: Settings }
];

const statusStyles: Record<StatusTone, string> = {
  live: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  progress: 'border-blue-200 bg-blue-50 text-blue-800',
  waiting: 'border-amber-200 bg-amber-50 text-amber-800',
  planned: 'border-slate-200 bg-slate-100 text-slate-700',
  complete: 'border-violet-200 bg-violet-50 text-violet-800'
};

const StatusPill = ({ label, tone }: { label: string; tone: StatusTone }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusStyles[tone]}`}>
    {label}
  </span>
);

const SectionTitle = ({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) => (
  <div className="border-b border-slate-200 pb-5">
    <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">{eyebrow}</p>
    <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{title}</h2>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
  </div>
);

const InformationRow = ({ label, value, tone }: { label: string; value: string; tone: StatusTone }) => (
  <div className="flex flex-col gap-2 border-b border-slate-100 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
    <span className="text-sm font-semibold text-slate-800">{label}</span>
    <StatusPill label={value} tone={tone} />
  </div>
);

const MasterFrontEnd = ({ onOpenSeo, onOpenBrandAssets, onOpenContent }: { onOpenSeo: () => void; onOpenBrandAssets: () => void; onOpenContent: () => void }) => (
  <div className="space-y-5">
    <Card className="overflow-hidden border-cyan-200 shadow-sm">
      <CardHeader className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <StatusPill label="Live" tone="live" />
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-cyan-200">Production website</span>
            </div>
            <CardTitle className="mt-3 text-2xl text-white">SlapWrapz Master Front End</CardTitle>
            <p className="mt-1 text-sm text-slate-300">This is the active customer-facing website. The preview below always loads the current production front end.</p>
          </div>
          <Button asChild className="shrink-0 bg-cyan-300 text-slate-950 hover:bg-cyan-200">
            <a href="/" target="_blank" rel="noreferrer"><Maximize2 className="mr-2 h-4 w-4" />Open Full Website</a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-5">
        <div className="overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 shadow-inner">
          <div className="flex items-center gap-2 border-b border-slate-300 bg-white px-4 py-2.5">
            <div className="flex gap-1.5" aria-hidden="true"><span className="h-2.5 w-2.5 rounded-full bg-red-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /></div>
            <div className="ml-2 flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"><Globe2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">slapwrapz.com</span></div>
          </div>
          <div className="relative aspect-[16/10] min-h-[360px] bg-white">
            <iframe
              src="https://bluewoods-wrap-app-clean.vercel.app/"
              title="Live SlapWrapz master front end"
              loading="lazy"
              sandbox="allow-forms allow-popups allow-scripts allow-same-origin"
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">This is a live interactive preview. Some links may open inside the preview; use Open Full Website for the normal customer view.</p>
      </CardContent>
    </Card>

    <div className="grid gap-3 md:grid-cols-3">
      <button type="button" onClick={onOpenSeo} className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-cyan-300 hover:bg-cyan-50"><p className="font-black text-slate-950">Website & SEO work</p><p className="mt-1 text-sm text-slate-600">Plan, test, and check off search improvements.</p></button>
      <button type="button" onClick={onOpenBrandAssets} className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-cyan-300 hover:bg-cyan-50"><p className="font-black text-slate-950">Brand assets</p><p className="mt-1 text-sm text-slate-600">Use approved logos and visual files.</p></button>
      <button type="button" onClick={onOpenContent} className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-cyan-300 hover:bg-cyan-50"><p className="font-black text-slate-950">Front-end content</p><p className="mt-1 text-sm text-slate-600">Organize photos, video, copy, and new page material.</p></button>
    </div>
  </div>
);

const workspaceSections: Record<Exclude<SectionId, 'marketing'>, { eyebrow: string; title: string; description: string; items: string[] }> = {
  overview: {
    eyebrow: 'Owner command center',
    title: 'Blue Woods Brands Dashboard',
    description: 'A company-level view of Blue Woods brands, marketing systems, lead generation, creative production, approvals, and growth priorities.',
    items: ['SlapWrapz marketing and quote activity', 'Brand and campaign priorities', 'Creative production and approvals', 'Partner and rep growth']
  },
  'master-front-end': {
    eyebrow: 'Customer-facing website',
    title: 'Master Front End',
    description: 'See the live SlapWrapz website, open the full customer experience, and connect future front-end work to SEO, brand assets, and content production.',
    items: []
  },
  brands: {
    eyebrow: 'Company portfolio',
    title: 'Brand Portfolio',
    description: 'Keep Blue Woods Brands and each owned or managed brand organized without mixing a client workspace into the company workspace.',
    items: ['Blue Woods Brands', 'SlapWrapz', 'Client brands and managed projects', 'New brand concepts']
  },
  'website-seo': {
    eyebrow: 'Digital presence',
    title: 'Websites & SEO',
    description: 'Track company websites, landing pages, search visibility, conversion paths, and the technical work that supports lead generation.',
    items: ['SlapWrapz main website', 'Lead-capture landing pages', 'Search and local visibility', 'Conversion and performance checks']
  },
  'social-media': {
    eyebrow: 'Owned channels',
    title: 'Social Media',
    description: 'Organize Blue Woods and SlapWrapz social channels, content priorities, publishing status, and campaign links.',
    items: []
  },
  podcasts: {
    eyebrow: 'Broadcast network',
    title: 'Podcast Central',
    description: 'Build Blue Woods podcast brands, recurring series, episodes, production workflows, channel connections, assets, distribution, and analytics in one place.',
    items: []
  },
  'content-calendar': {
    eyebrow: 'Publishing rhythm',
    title: 'Content Calendar',
    description: 'Plan what Blue Woods and SlapWrapz will publish, where it will go, who owns it, and when it should be reviewed.',
    items: ['Calendar view', 'Draft and approval queue', 'Scheduled posts', 'Published content history']
  },
  'lead-campaigns': {
    eyebrow: 'Demand generation',
    title: 'Lead Campaigns',
    description: 'Connect campaign creative to quote requests, rep attribution, follow-up, and the main CRM.',
    items: ['Vehicle-wrap lead capture', 'Rep and partner campaigns', 'QR and print campaigns', 'Lead follow-up']
  },
  content: {
    eyebrow: 'Creative production',
    title: 'Content Production',
    description: 'Manage the photos, videos, copy, proofs, and campaign assets produced for Blue Woods Brands and SlapWrapz.',
    items: ['Photo and video library', 'Campaign copy', 'Sales and rep materials', 'Proof-ready creative']
  },
  partnerships: {
    eyebrow: 'Growth network',
    title: 'Partners & Reps',
    description: 'Coordinate reps, referral partners, production relationships, and co-marketing opportunities.',
    items: ['Sales representatives', 'Referral partners', 'Production contacts', 'Co-marketing opportunities']
  },
  events: {
    eyebrow: 'Field marketing',
    title: 'Events',
    description: 'Plan the company events, community appearances, sales activations, and promotional deadlines that support growth.',
    items: ['Upcoming activations', 'Event creative', 'Follow-up plans', 'Campaign deadlines']
  },
  tasks: {
    eyebrow: 'Work management',
    title: 'Tasks & Approvals',
    description: 'Keep company marketing assignments, approvals, next actions, and owners in one place.',
    items: ['Priority marketing tasks', 'Creative approvals', 'Website changes', 'Campaign follow-up']
  },
  files: {
    eyebrow: 'Company library',
    title: 'Files & Assets',
    description: 'Organize Blue Woods and SlapWrapz logos, campaign files, photos, videos, sales materials, and approved exports.',
    items: ['Master logos', 'Campaign artwork', 'Photos and videos', 'Sales and rep materials']
  },
  settings: {
    eyebrow: 'Workspace control',
    title: 'Settings',
    description: 'Manage the Blue Woods company workspace, access, brand connections, and operational defaults.',
    items: ['Workspace identity', 'Brand connections', 'Team access', 'Publishing defaults']
  }
};

const BlueWoodsMarketingWorkspace = ({ initialSection = 'marketing', adminUserId }: { initialSection?: SectionId; adminUserId: string }) => {
  const [activeSection, setActiveSection] = useState<SectionId>(initialSection);

  const renderMarketing = () => (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Creative command center"
        title="Blue Woods Marketing & Branding"
        description="The company-level workspace for Blue Woods Brands, SlapWrapz, lead campaigns, creative assets, sales materials, and growth marketing. Client workspaces remain separate under Clients."
      />
      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="overflow-hidden border-cyan-200 shadow-sm">
          <div className="bg-slate-950 p-6 text-white">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Active growth system</p>
            <h3 className="mt-2 text-3xl font-black">SlapWrapz Marketing</h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-200">Vehicle wraps · signs · print · quote capture · customer proofs · rep follow-up</p>
          </div>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
            {[
              ['Main website', 'Live', 'live' as StatusTone],
              ['Quote request funnel', 'Live', 'live' as StatusTone],
              ['Customer proof portal', 'Live', 'live' as StatusTone],
              ['Rep marketing pages', 'Active', 'complete' as StatusTone],
              ['Vehicle-wrap QR capture', 'In progress', 'progress' as StatusTone],
              ['Content and social calendar', 'Planned', 'planned' as StatusTone]
            ].map(([label, status, tone]) => (
              <div key={String(label)} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">{String(label)}</p>
                <div className="mt-3"><StatusPill label={String(status)} tone={tone as StatusTone} /></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle>Brand and content assets</CardTitle></CardHeader>
          <CardContent>
            <InformationRow label="Blue Woods Brands master logo" value="Available" tone="complete" />
            <InformationRow label="SlapWrapz brand identity" value="Live" tone="live" />
            <InformationRow label="Vehicle-wrap campaign creative" value="Active" tone="complete" />
            <InformationRow label="Quote and proof assets" value="Live" tone="live" />
            <InformationRow label="Sales and rep materials" value="In progress" tone="progress" />
            <InformationRow label="Content calendar" value="Planned" tone="planned" />
          </CardContent>
        </Card>
      </div>
      <Card className="overflow-hidden border-amber-300 bg-amber-50/50 shadow-sm">
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-900">Connected growth initiative</span>
              <StatusPill label="Developing" tone="progress" />
            </div>
            <h3 className="mt-3 text-2xl font-black text-slate-950">Neighborhood Domination Plan</h3>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">Build trust and visibility neighborhood by neighborhood, then connect the attention to Blue Woods, SlapWrapz, service companies, DJ West, and The Breakout.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Geofencing', 'Field signs', 'Trusted call concierge', 'Gated-community access', 'Service-company network', 'Podcast and local stories'].map((item) => (
                <span key={item} className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800">{item}</span>
              ))}
            </div>
          </div>
          <Button variant="outline" onClick={() => setActiveSection('podcasts')} className="border-amber-300 bg-white hover:bg-amber-100"><Mic2 className="mr-2 h-4 w-4" />Open connected podcast ideas</Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderSection = () => {
    if (activeSection === 'marketing') return renderMarketing();
    const section = workspaceSections[activeSection];
    if (activeSection === 'website-seo') {
      return (
        <div className="space-y-5">
          <SectionTitle eyebrow={section.eyebrow} title={section.title} description={section.description} />
          <SeoExecutionBoard adminUserId={adminUserId} />
        </div>
      );
    }
    if (activeSection === 'master-front-end') {
      return (
        <div className="space-y-5">
          <SectionTitle eyebrow={section.eyebrow} title={section.title} description={section.description} />
          <MasterFrontEnd onOpenSeo={() => setActiveSection('website-seo')} onOpenBrandAssets={() => setActiveSection('brands')} onOpenContent={() => setActiveSection('content')} />
        </div>
      );
    }
    if (activeSection === 'brands') {
      return (
        <div className="space-y-5">
          <SectionTitle eyebrow={section.eyebrow} title={section.title} description={section.description} />
          <BrandPortfolio />
        </div>
      );
    }
    if (activeSection === 'social-media') {
      return (
        <div className="space-y-5">
          <SectionTitle eyebrow={section.eyebrow} title={section.title} description={section.description} />
          <SocialChannelDirectory adminUserId={adminUserId} />
        </div>
      );
    }
    if (activeSection === 'podcasts') {
      return (
        <div className="space-y-5">
          <SectionTitle eyebrow={section.eyebrow} title={section.title} description={section.description} />
          <PodcastCentral adminUserId={adminUserId} onOpenSocial={() => setActiveSection('social-media')} onOpenCalendar={() => setActiveSection('content-calendar')} />
        </div>
      );
    }
    return (
      <div className="space-y-5">
        <SectionTitle eyebrow={section.eyebrow} title={section.title} description={section.description} />
        <div className="grid gap-4 sm:grid-cols-2">
          {section.items.map((item) => (
            <Card key={item} className="border-slate-200 shadow-sm">
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-black text-slate-950">{item}</p>
                  <p className="mt-1 text-sm text-slate-600">Blue Woods company workspace</p>
                </div>
                <StatusPill label="Organized" tone="progress" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-slate-950/20 bg-slate-950 text-white shadow-lg">
        <div className="h-2 bg-cyan-400" />
        <div className="grid gap-6 px-5 py-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:px-8 md:py-9">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">Owner / Blue Woods Brands</span>
              <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">BWB Main Admin</span>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Blue Woods Brands</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">Company marketing, brand systems, websites, lead campaigns, content, reps, approvals, and assets in one owner workspace.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" asChild className="border-white/30 bg-white/10 text-white hover:bg-white hover:text-slate-950">
              <Link to="/admin?tab=quotes"><FileText className="mr-2 h-4 w-4" />Open Quotes</Link>
            </Button>
            <Button asChild className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
              <Link to="/"><ExternalLink className="mr-2 h-4 w-4" />Main Website</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="min-w-0 xl:sticky xl:top-4 xl:self-start">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-200 py-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">BWB Workspace</p>
            </CardHeader>
            <CardContent className="p-2">
              <div className="flex gap-2 overflow-x-auto pb-2 xl:block xl:space-y-1 xl:overflow-visible xl:pb-0">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const selected = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      className={`flex min-h-11 min-w-max items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition xl:w-full ${selected ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'}`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${selected ? 'text-cyan-300' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </aside>

        <main className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          {renderSection()}
        </main>
      </div>
    </div>
  );
};

export default BlueWoodsMarketingWorkspace;
