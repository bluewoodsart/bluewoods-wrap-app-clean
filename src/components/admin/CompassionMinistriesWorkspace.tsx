import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe2,
  Handshake,
  HeartHandshake,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Mail,
  Megaphone,
  Package,
  PlayCircle,
  Save,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Users,
  Video,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ClientVideoIntakeControl from '@/components/admin/ClientVideoIntakeControl';

type SectionId =
  | 'dashboard'
  | 'final-report'
  | 'online-presence'
  | 'website-seo'
  | 'social-media'
  | 'marketing'
  | 'donations'
  | 'food-pantry'
  | 'volunteers'
  | 'partners'
  | 'events'
  | 'tasks'
  | 'files'
  | 'settings';

type StatusTone = 'live' | 'progress' | 'waiting' | 'review' | 'planned' | 'complete';

interface NavigationItem {
  id: SectionId;
  label: string;
  icon: LucideIcon;
}

interface TaskItem {
  id: string;
  title: string;
  owner: string;
  due: string;
  area: string;
}

interface SponsorProspect {
  id: string;
  name: string;
  organization: string;
  title: string;
  relationshipType: string;
  status: string;
  opportunity: string;
  whyFit: string;
  email: string;
  verification: string;
  sources: string[];
  nextAction: string;
  privacy: string;
}

const PUBLIC_FRONT_END = '/compassion-bluefund/';
const CURRENT_WEBSITE = 'https://compassionfoodpantry.org/';
const STORAGE_VIDEO_URL = 'bwb-compassion-story-video-url';
const STORAGE_PUBLISHED_VIDEO_URL = 'bwb-compassion-published-story-video-url';
const STORAGE_PUBLISHED_VIDEO_AT = 'bwb-compassion-published-story-video-at';
const STORAGE_TASKS = 'bwb-compassion-backend-tasks';

const navigation: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'final-report', label: 'Final Report', icon: FileText },
  { id: 'online-presence', label: 'Online Presence', icon: MapPin },
  { id: 'website-seo', label: 'Website & SEO', icon: Search },
  { id: 'social-media', label: 'Social Media', icon: Share2 },
  { id: 'marketing', label: 'Marketing & Branding', icon: Megaphone },
  { id: 'donations', label: 'Donations', icon: CircleDollarSign },
  { id: 'food-pantry', label: 'Food Pantry', icon: Package },
  { id: 'volunteers', label: 'Volunteers', icon: Users },
  { id: 'partners', label: 'Sponsors & Partners', icon: Handshake },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'tasks', label: 'Tasks & Approvals', icon: ListChecks },
  { id: 'files', label: 'Files & Assets', icon: FolderOpen },
  { id: 'settings', label: 'Settings', icon: Settings }
];

const taskItems: TaskItem[] = [
  {
    id: 'story-video',
    title: 'Receive and connect Dr. Diana’s story video',
    owner: 'Blue Woods Brands',
    due: 'Before public launch',
    area: 'Website'
  },
  {
    id: 'facebook-url',
    title: 'Confirm the exact Compassion Ministries Facebook page URL',
    owner: 'Compassion Ministries',
    due: 'Open',
    area: 'Social Media'
  },
  {
    id: 'donation-processor',
    title: 'Select and connect the live donation processor',
    owner: 'Compassion Ministries',
    due: 'Before accepting funds',
    area: 'Donations'
  },
  {
    id: 'pantry-hours',
    title: 'Confirm pantry hours and food-distribution schedule',
    owner: 'Dr. Diana',
    due: 'Open',
    area: 'Food Pantry'
  },
  {
    id: 'google-profile',
    title: 'Review Google Business Profile name, address, phone, and hours',
    owner: 'Blue Woods Brands',
    due: 'Audit phase',
    area: 'Online Presence'
  },
  {
    id: 'volunteer-intake',
    title: 'Approve volunteer intake questions and routing',
    owner: 'Compassion Ministries',
    due: 'Phase 2',
    area: 'Volunteers'
  },
  {
    id: 'impact-data',
    title: 'Provide verified families-served and food-distribution figures',
    owner: 'Compassion Ministries',
    due: 'For final report',
    area: 'Final Report'
  },
  {
    id: 'sponsor-confirmation',
    title: 'Confirm sponsors and community partners before publishing logos',
    owner: 'Dr. Diana',
    due: 'Ongoing',
    area: 'Partners'
  }
];

const sponsorProspects: SponsorProspect[] = [
  {
    id: 'yessyka-santana',
    name: 'Yessyka Santana',
    organization: 'Sandy Creek High School',
    title: 'Spanish Teacher · Chick-fil-A Leader Academy Co-Sponsor',
    relationshipType: 'School connector',
    status: 'Research only',
    opportunity: 'Connect a student-led school-spirit fundraiser using magnets, stickers, posters, and approved high-school packages to support the food pantry.',
    whyFit: 'The Leader Academy focuses on service and community impact, making her a strong potential bridge to students and school leadership. Interest has not been confirmed.',
    email: 'santana.yessyka@fcboe.org',
    verification: 'Professional role verified from Fayette County Public Schools sources on August 28, 2026.',
    sources: ['Sandy Creek High School World Languages Department', 'Fayette County Public Schools Leader Academy service story'],
    nextAction: 'Prepare a one-page concept for Dr. Diana’s approval before any outreach.',
    privacy: 'Keep private. Do not identify her publicly as a sponsor, supporter, or attendee without direct confirmation and permission.'
  },
  {
    id: 'kelly-gallman',
    name: 'Kelly Gallman',
    organization: 'Sandy Creek High School',
    title: 'Visual & Performing Arts Department Chair · Chick-fil-A Leader Academy Co-Sponsor',
    relationshipType: 'School and creative connector',
    status: 'Research only',
    opportunity: 'Explore a school-approved creative fundraiser and student participation around magnets, stickers, posters, and pantry support.',
    whyFit: 'Her current arts leadership and Leader Academy service role make her a potential creative and community-service connector. Interest has not been confirmed.',
    email: 'gallman.kelly@fcboe.org',
    verification: 'Professional role verified from Fayette County Public Schools sources on August 28, 2026.',
    sources: ['Sandy Creek High School Visual and Performing Arts Department', 'Fayette County Public Schools Leader Academy service story'],
    nextAction: 'Hold for Dr. Diana’s approval, then decide whether outreach should begin with one or both school contacts.',
    privacy: 'Keep private. Do not identify her publicly as a sponsor, supporter, or attendee without direct confirmation and permission.'
  }
];

const statusStyles: Record<StatusTone, string> = {
  live: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  progress: 'border-blue-200 bg-blue-50 text-blue-800',
  waiting: 'border-amber-200 bg-amber-50 text-amber-800',
  review: 'border-red-200 bg-red-50 text-red-800',
  planned: 'border-slate-200 bg-slate-100 text-slate-700',
  complete: 'border-violet-200 bg-violet-50 text-violet-800'
};

const StatusPill = ({ label, tone }: { label: string; tone: StatusTone }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusStyles[tone]}`}>
    {label}
  </span>
);

const SectionTitle = ({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
    </div>
    {action}
  </div>
);

const InformationRow = ({
  label,
  value,
  tone = 'planned'
}: {
  label: string;
  value: string;
  tone?: StatusTone;
}) => (
  <div className="flex flex-col gap-2 border-b border-slate-100 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-sm font-semibold text-slate-800">{label}</p>
    <StatusPill label={value} tone={tone} />
  </div>
);

const getStoredVideoUrl = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(STORAGE_VIDEO_URL) ?? '';
};

const getPublishedVideoUrl = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(STORAGE_PUBLISHED_VIDEO_URL) ?? '';
};

const getPublishedVideoAt = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(STORAGE_PUBLISHED_VIDEO_AT) ?? '';
};

const getStoredTasks = (): Record<string, boolean> => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_TASKS) ?? '{}') as Record<string, boolean>;
  } catch {
    return {};
  }
};

const getYouTubeEmbedUrl = (value: string) => {
  if (!value.trim()) return '';
  try {
    const url = new URL(value.trim());
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }
    if (host.endsWith('youtube.com')) {
      if (url.pathname.startsWith('/embed/')) return value.trim();
      const id = url.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }
  } catch {
    return '';
  }
  return '';
};

const CompassionMinistriesWorkspace = ({ publicProof = false }: { publicProof?: boolean }) => {
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard');
  const [storyVideoUrl, setStoryVideoUrl] = useState(getStoredVideoUrl);
  const [savedStoryVideoUrl, setSavedStoryVideoUrl] = useState(getStoredVideoUrl);
  const [publishedStoryVideoUrl, setPublishedStoryVideoUrl] = useState(getPublishedVideoUrl);
  const [publishedStoryVideoAt, setPublishedStoryVideoAt] = useState(getPublishedVideoAt);
  const [storySaveMessage, setStorySaveMessage] = useState('');
  const [taskState, setTaskState] = useState<Record<string, boolean>>(getStoredTasks);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);

  const completedTasks = taskItems.filter((task) => taskState[task.id]).length;
  const selectedProspect = sponsorProspects.find((prospect) => prospect.id === selectedProspectId) ?? null;
  const youtubeEmbedUrl = useMemo(() => getYouTubeEmbedUrl(savedStoryVideoUrl), [savedStoryVideoUrl]);

  const openFrontEnd = () => {
    window.open(PUBLIC_FRONT_END, '_blank', 'noopener,noreferrer');
  };

  const saveStoryVideo = () => {
    const cleanUrl = storyVideoUrl.trim();
    window.localStorage.setItem(STORAGE_VIDEO_URL, cleanUrl);
    setSavedStoryVideoUrl(cleanUrl);
    setStorySaveMessage(cleanUrl ? 'Story video draft saved in this browser.' : 'Story video draft cleared.');
    window.setTimeout(() => setStorySaveMessage(''), 3000);
  };

  const publishStoryVideo = () => {
    if (!savedStoryVideoUrl || !getYouTubeEmbedUrl(savedStoryVideoUrl)) {
      setStorySaveMessage('Save a valid YouTube link before publishing.');
      return;
    }
    if (!window.confirm('Publish this approved story video to the public front-end proof?')) return;

    const publishedAt = new Date().toISOString();
    window.localStorage.setItem(STORAGE_PUBLISHED_VIDEO_URL, savedStoryVideoUrl);
    window.localStorage.setItem(STORAGE_PUBLISHED_VIDEO_AT, publishedAt);
    setPublishedStoryVideoUrl(savedStoryVideoUrl);
    setPublishedStoryVideoAt(publishedAt);
    setStorySaveMessage('Story video published to the public front-end proof in this browser.');
    window.setTimeout(() => setStorySaveMessage(''), 5000);
  };

  const toggleTask = (taskId: string) => {
    setTaskState((current) => {
      const next = { ...current, [taskId]: !current[taskId] };
      window.localStorage.setItem(STORAGE_TASKS, JSON.stringify(next));
      return next;
    });
  };

  const renderDashboard = () => (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Command center"
        title="Compassion Ministries Dashboard"
        description="A single control view for the public front end, audits, marketing, operational information, approvals, and the final report."
        action={
          <Button onClick={openFrontEnd} className="bg-red-700 text-white hover:bg-red-800">
            <ExternalLink className="mr-2 h-4 w-4" />
            View Front End
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Public Front End', 'Proof Live', 'The Compassion Ministries + BlueFund page is deployed.', Globe2, 'live' as StatusTone],
          ['Story Video', savedStoryVideoUrl ? 'Draft Added' : 'Waiting', savedStoryVideoUrl ? 'A video URL is saved for review.' : 'The video space is ready for Dr. Diana’s story.', Video, savedStoryVideoUrl ? 'progress' as StatusTone : 'waiting' as StatusTone],
          ['Donation System', 'Not Connected', 'No live payment processor is connected yet.', CircleDollarSign, 'review' as StatusTone],
          ['Open Tasks', `${taskItems.length - completedTasks} Remaining`, `${completedTasks} of ${taskItems.length} first-generation tasks are complete.`, ClipboardCheck, completedTasks === taskItems.length ? 'complete' as StatusTone : 'progress' as StatusTone]
        ].map(([title, value, note, Icon, tone]) => (
          <Card key={String(title)} className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
                  <Icon className="h-5 w-5" />
                </div>
                <StatusPill label={String(value)} tone={tone as StatusTone} />
              </div>
              <p className="mt-4 text-sm font-black text-slate-950">{String(title)}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">{String(note)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Current priorities</p>
                <CardTitle className="mt-1 text-xl">What needs attention now</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveSection('tasks')}>
                Open Tasks
              </Button>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {taskItems.slice(0, 5).map((task) => {
              const done = Boolean(taskState[task.id]);
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  className="flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
                >
                  {done ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-bold ${done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.title}</span>
                    <span className="mt-1 block text-xs text-slate-500">{task.area} · {task.owner} · {task.due}</span>
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-200 bg-emerald-950 text-white">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/10 p-2.5">
                <Video className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-200">Website control</p>
                <CardTitle className="mt-1 text-xl text-white">Our Story Video</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
              {youtubeEmbedUrl ? (
                <iframe
                  title="Saved Compassion Ministries story video"
                  src={youtubeEmbedUrl}
                  className="aspect-video w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="grid aspect-video place-items-center bg-gradient-to-br from-emerald-950 to-slate-950 text-white">
                  <div className="text-center">
                    <PlayCircle className="mx-auto h-14 w-14 text-red-500" />
                    <p className="mt-3 text-sm font-black">Video space is ready</p>
                    <p className="mt-1 text-xs text-slate-300">Add a video link or send raw footage in Website & SEO.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">Public story section</p>
                <p className="text-xs text-slate-500">The quotation and story copy remain unchanged.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveSection('website-seo')}>
                Manage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-red-700" />
              Audit progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InformationRow label="Locate Compassion Ministries" value="Organized" tone="progress" />
            <InformationRow label="Google Business Profile" value="Needs Review" tone="review" />
            <InformationRow label="Website Audit" value="In Progress" tone="progress" />
            <InformationRow label="SEO Audit" value="In Progress" tone="progress" />
            <InformationRow label="Social Media Audit" value="Needs Confirmation" tone="waiting" />
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-emerald-700" />
              Recent work recorded
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              'Story-video space added to the public Our Story section.',
              'Money, food, supplies, and partnership options organized in BlueFund.',
              'Address corrected to 180 Walter Way, Suite 120.',
              'Compassion Ministries final-report structure approved.',
              'Back-end first generation created inside Blue Woods Admin.'
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-sm leading-5 text-slate-700">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-red-700">Private research</p>
          <CardTitle className="mt-1">Potential sponsors & community connectors</CardTitle>
          <p className="mt-2 text-sm leading-6 text-slate-600">Research profiles are internal working records. Opening a dossier does not mark anyone as contacted, interested, or confirmed.</p>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 md:grid-cols-2">
          {sponsorProspects.map((prospect) => (
            <button key={prospect.id} type="button" onClick={() => setSelectedProspectId(prospect.id)} className="group flex min-h-36 w-full items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-emerald-700 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200" aria-label={`Open private dossier for ${prospect.name}`}>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2"><span className="text-lg font-black text-slate-950">{prospect.name}</span><StatusPill label={prospect.status} tone="planned" /></span>
                <span className="mt-2 block text-sm font-bold text-slate-700">{prospect.organization}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{prospect.title}</span>
                <span className="mt-3 inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-800">{prospect.relationshipType}</span>
              </span>
              <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-700" />
            </button>
          ))}
        </CardContent>
      </Card>
      {selectedProspect && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45" role="presentation" onMouseDown={() => setSelectedProspectId(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="sponsor-dossier-title" className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-emerald-950 p-5 text-white sm:p-6">
              <div><p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-200">Private prospect dossier</p><h3 id="sponsor-dossier-title" className="mt-2 text-2xl font-black">{selectedProspect.name}</h3><p className="mt-1 text-sm text-emerald-100">{selectedProspect.organization}</p></div>
              <button type="button" onClick={() => setSelectedProspectId(null)} className="rounded-xl border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300" aria-label="Close sponsor dossier"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              <div className="flex flex-wrap gap-2"><StatusPill label={selectedProspect.status} tone="planned" /><span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-800">{selectedProspect.relationshipType}</span></div>
              <div><p className="text-xs font-black uppercase tracking-[0.13em] text-slate-500">Verified professional role</p><p className="mt-2 font-bold text-slate-950">{selectedProspect.title}</p><p className="mt-2 text-sm leading-6 text-slate-600">{selectedProspect.verification}</p></div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><p className="text-xs font-black uppercase tracking-[0.13em] text-emerald-800">Opportunity</p><p className="mt-2 text-sm leading-6 text-emerald-950">{selectedProspect.opportunity}</p></div>
              <div><p className="text-xs font-black uppercase tracking-[0.13em] text-slate-500">Why this may fit</p><p className="mt-2 text-sm leading-6 text-slate-700">{selectedProspect.whyFit}</p></div>
              <div><p className="text-xs font-black uppercase tracking-[0.13em] text-slate-500">Verified professional contact</p><a href={`mailto:${selectedProspect.email}`} className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:underline"><Mail className="h-4 w-4" />{selectedProspect.email}</a><p className="mt-2 text-xs text-slate-500">No personal Facebook profile has been verified.</p></div>
              <div><p className="text-xs font-black uppercase tracking-[0.13em] text-slate-500">Research sources</p><ul className="mt-2 space-y-2">{selectedProspect.sources.map((source) => (<li key={source} className="flex items-start gap-2 text-sm text-slate-700"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />{source}</li>))}</ul></div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5"><p className="text-xs font-black uppercase tracking-[0.13em] text-blue-800">Next action</p><p className="mt-2 text-sm font-bold leading-6 text-blue-950">{selectedProspect.nextAction}</p></div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="text-xs font-black uppercase tracking-[0.13em] text-amber-800">Privacy and publication safeguard</p><p className="mt-2 text-sm leading-6 text-amber-950">{selectedProspect.privacy}</p></div>
            </div>
          </section>
        </div>
      )}
    </div>
  );

  const renderFinalReport = () => (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Master document"
        title="Final Report"
        description="The report gathers audit findings, completed work, risks, recommendations, assignments, and proof of completion into one client-ready record."
        action={
          <Button variant="outline" onClick={() => window.print()}>
            <FileText className="mr-2 h-4 w-4" />
            Print Draft
          </Button>
        }
      />

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <div className="h-2 bg-red-700" />
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.2fr_.8fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-700">Executive summary</p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">Digital foundation established; launch connections still required.</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Compassion Ministries now has a public-facing proof, an organized BlueFund giving concept, and a first-generation administrative command center. The next stage is to confirm official account information, connect live services, verify operational data, and complete the audit corrections before public launch.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-800">Overall condition</p>
            <p className="mt-2 text-3xl font-black text-amber-950">In Development</p>
            <p className="mt-2 text-sm text-amber-900">Public design is visible. Payments, data collection, final account links, and verified impact figures are not yet connected.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          ['Online Presence', 'Business identity and location consistency', 'Needs Review', 'review' as StatusTone, MapPin],
          ['Website & SEO', 'Public proof, content, usability, and search readiness', 'In Progress', 'progress' as StatusTone, Search],
          ['Social Media', 'Official profiles, access, consistency, and activity', 'Waiting', 'waiting' as StatusTone, Share2],
          ['Donations', 'BlueFund experience and live payment connection', 'Design Complete', 'complete' as StatusTone, CircleDollarSign],
          ['Operations', 'Pantry, volunteer, event, and partner information', 'Needs Data', 'waiting' as StatusTone, Building2],
          ['Marketing', 'Grand opening, content assets, and campaign coordination', 'In Progress', 'progress' as StatusTone, Megaphone]
        ].map(([title, description, status, tone, Icon]) => (
          <Card key={String(title)} className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700"><Icon className="h-5 w-5" /></div>
                <StatusPill label={String(status)} tone={tone as StatusTone} />
              </div>
              <h3 className="mt-4 text-base font-black text-slate-950">{String(title)}</h3>
              <p className="mt-2 text-sm leading-5 text-slate-600">{String(description)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Critical recommendations</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {[
            'Connect an approved payment processor before accepting financial gifts.',
            'Confirm official Google, Facebook, and social profile ownership and URLs.',
            'Publish only verified pantry hours, eligibility rules, distribution schedules, and impact figures.',
            'Separate client approval from technical production release for every public change.',
            'Create one source of truth for sponsors, volunteers, donations, events, and operational records.',
            'Preserve the public front-end proof while backend connections are completed in phases.'
          ].map((item, index) => (
            <div key={item} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-red-700 text-xs font-black text-white">{index + 1}</span>
              <p className="text-sm leading-5 text-slate-700">{item}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const renderOnlinePresence = () => (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Visibility and location"
        title="Online Presence"
        description="This consolidates Locate Compassion Ministries, Google Business Profile review, maps visibility, directory listings, and official identity consistency."
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle>Verified organization identity</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              ['Organization', 'Compassion Ministries of Georgia, Inc.'],
              ['Address', '180 Walter Way, Suite 120, Fayetteville, GA 30214'],
              ['Phone', '770-299-9735'],
              ['Website', 'compassionfoodpantry.org'],
              ['Managed marketing partner', 'Blue Woods Brands']
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-500">{label}</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle>Visibility audit</CardTitle></CardHeader>
          <CardContent>
            <InformationRow label="Google Business Profile" value="Needs Review" tone="review" />
            <InformationRow label="Google Maps destination" value="Address Corrected" tone="complete" />
            <InformationRow label="Directory consistency" value="Audit Planned" tone="planned" />
            <InformationRow label="Duplicate listings" value="Not Checked" tone="waiting" />
            <InformationRow label="Hours and categories" value="Needs Confirmation" tone="waiting" />
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline">
                <a target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=180+Walter+Way+Suite+120+Fayetteville+GA+30214">
                  <MapPin className="mr-2 h-4 w-4" />
                  Open Maps
                </a>
              </Button>
              <Button asChild variant="outline">
                <a target="_blank" rel="noopener noreferrer" href={CURRENT_WEBSITE}>
                  <Globe2 className="mr-2 h-4 w-4" />
                  Current Website
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderWebsiteSeo = () => (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Public experience"
        title="Website & SEO"
        description="Manage public content, story video, usability findings, donation-page issues, search readiness, and approved front-end changes."
        action={
          <Button onClick={openFrontEnd} variant="outline">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Public Proof
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,.75fr)]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-red-700">Our Story section</p>
                <CardTitle className="mt-1">Story Video Control</CardTitle>
              </div>
              <StatusPill
                label={publishedStoryVideoUrl === savedStoryVideoUrl && publishedStoryVideoUrl ? 'Published' : savedStoryVideoUrl ? 'Draft Saved' : 'Waiting for Video'}
                tone={publishedStoryVideoUrl === savedStoryVideoUrl && publishedStoryVideoUrl ? 'live' : savedStoryVideoUrl ? 'progress' : 'waiting'}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <div>
              <label htmlFor="compassion-story-video" className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">Video link — YouTube or another video site</label>
              <input
                id="compassion-story-video"
                type="url"
                value={storyVideoUrl}
                onChange={(event) => setStoryVideoUrl(event.target.value)}
                placeholder="https://youtube.com/... or another video site"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={saveStoryVideo} className="bg-emerald-700 text-white hover:bg-emerald-800">
                <Save className="mr-2 h-4 w-4" />
                Save Draft
              </Button>
              {savedStoryVideoUrl && (
                <Button asChild variant="outline">
                  <a target="_blank" rel="noopener noreferrer" href={savedStoryVideoUrl}>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Open Video
                  </a>
                </Button>
              )}
              {savedStoryVideoUrl && (
                <Button onClick={publishStoryVideo} className="bg-red-700 text-white hover:bg-red-800">
                  <Globe2 className="mr-2 h-4 w-4" />
                  Publish to Front End
                </Button>
              )}
            </div>
            {storySaveMessage && <p className="text-sm font-semibold text-emerald-700">{storySaveMessage}</p>}
            {publishedStoryVideoUrl && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                <p className="font-black">Published to the public front-end proof</p>
                <p className="mt-1">{publishedStoryVideoAt ? new Date(publishedStoryVideoAt).toLocaleString() : 'Published'}</p>
                <Button onClick={openFrontEnd} variant="link" className="mt-1 h-auto p-0 text-emerald-800">
                  View published page
                </Button>
              </div>
            )}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              Save Draft keeps the link under review. Publish to Front End requires confirmation and updates the public proof in this browser. This remains a browser-based demonstration until database-backed publishing is connected.
            </div>
            <ClientVideoIntakeControl
              publicProof={publicProof}
              clientSlug="compassion-ministries"
              clientName="Compassion Ministries of Georgia"
            />
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Text preserved on the front end</p>
              <p className="mt-2 text-sm font-bold text-slate-950">“We don’t just feed people. We build community, restore dignity, and remind every person that they are seen, valued, and never alone.”</p>
              <p className="mt-3 text-sm font-black text-slate-950">It Started in Front of a Garage.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle>Website findings</CardTitle></CardHeader>
          <CardContent>
            <InformationRow label="New front-end proof" value="Live" tone="live" />
            <InformationRow label="Story-video layout" value="Complete" tone="complete" />
            <InformationRow label="Old donate QR destination" value="Broken" tone="review" />
            <InformationRow label="Live payment checkout" value="Not Connected" tone="review" />
            <InformationRow label="Direct Facebook URL" value="Needs Confirmation" tone="waiting" />
            <InformationRow label="Mobile layout" value="Included" tone="complete" />
            <InformationRow label="SEO titles and descriptions" value="Audit In Progress" tone="progress" />
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderSocialMedia = () => (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Community communications"
        title="Social Media"
        description="Track official profiles, account access, branding consistency, posting activity, and content priorities without separating each platform into another project."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          ['Facebook', 'Primary community channel', 'Needs exact page URL', 'waiting' as StatusTone],
          ['Instagram', 'Visual stories, volunteers, and partners', 'Locate / confirm', 'planned' as StatusTone],
          ['TikTok', 'Short-form outreach and pantry stories', 'Planned', 'planned' as StatusTone],
          ['YouTube', 'Long-form story and impact videos', savedStoryVideoUrl ? 'Story draft added' : 'Waiting for first video', savedStoryVideoUrl ? 'progress' as StatusTone : 'waiting' as StatusTone],
          ['Email', 'Donors, volunteers, and community updates', 'Constant Contact discussed', 'progress' as StatusTone],
          ['Google Posts', 'Local event and distribution updates', 'Audit planned', 'planned' as StatusTone]
        ].map(([platform, purpose, status, tone]) => (
          <Card key={String(platform)} className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-sm font-black text-slate-700">{String(platform).slice(0, 2).toUpperCase()}</div>
                <StatusPill label={String(status)} tone={tone as StatusTone} />
              </div>
              <h3 className="mt-4 text-base font-black text-slate-950">{String(platform)}</h3>
              <p className="mt-2 text-sm leading-5 text-slate-600">{String(purpose)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderMarketing = () => (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Creative command center"
        title="Marketing & Branding"
        description="The active campaign and asset workspace remains distinct from technical audits, while still living inside the Compassion Ministries client record."
      />
      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="overflow-hidden border-red-200 shadow-sm">
          <div className="bg-red-700 p-6 text-white">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-100">September 1, 2026</p>
            <h3 className="mt-2 text-3xl font-black">Grand Opening Campaign</h3>
            <p className="mt-2 max-w-2xl text-sm text-red-50">180 Walter Way, Suite 120 · Fayetteville, Georgia · 1:00–5:00 PM · Ribbon cutting at 1:30 PM</p>
          </div>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
            {[
              ['Website announcement', 'Live on proof', 'live' as StatusTone],
              ['Countdown', 'Live on proof', 'live' as StatusTone],
              ['Facebook campaign', 'Needs official URL', 'waiting' as StatusTone],
              ['Sponsor logos', 'Confirm attendance', 'waiting' as StatusTone],
              ['Flyers and banners', 'Asset workspace', 'progress' as StatusTone],
              ['Press/community outreach', 'Planned', 'planned' as StatusTone]
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
            <InformationRow label="Compassion Ministries logo" value="Available" tone="complete" />
            <InformationRow label="Banner proof" value="In Proofing" tone="progress" />
            <InformationRow label="Mission story copy" value="Approved Direction" tone="complete" />
            <InformationRow label="Story video" value={savedStoryVideoUrl ? 'Draft Saved' : 'Waiting'} tone={savedStoryVideoUrl ? 'progress' : 'waiting'} />
            <InformationRow label="Sponsor package" value="Planned" tone="planned" />
            <InformationRow label="Content calendar" value="Planned" tone="planned" />
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderDonations = () => (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Giving system"
        title="Donations"
        description="Manage financial gifts, food and supply offers, recurring support, partner donations, acknowledgements, and the future BlueFund connection."
      />
      <div className="grid gap-5 lg:grid-cols-3">
        {[
          ['Give Money', 'One-time and monthly choices are designed in the public proof.', 'Payment processor not connected', 'review' as StatusTone, CircleDollarSign],
          ['Food & Supplies', 'Donors can describe unopened pantry food, pet food, hygiene items, and other supplies.', 'Offer form is a proof', 'progress' as StatusTone, Package],
          ['Partnership Giving', 'Businesses, churches, restaurants, and organizations use a separate large-donation path.', 'Workflow planned', 'planned' as StatusTone, HeartHandshake]
        ].map(([title, description, status, tone, Icon]) => (
          <Card key={String(title)} className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-800"><Icon className="h-6 w-6" /></div>
                <StatusPill label={String(status)} tone={tone as StatusTone} />
              </div>
              <h3 className="mt-4 text-lg font-black text-slate-950">{String(title)}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{String(description)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-amber-200 bg-amber-50 shadow-sm">
        <CardContent className="flex items-start gap-3 p-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
          <div>
            <p className="font-black text-amber-950">Production safeguard</p>
            <p className="mt-1 text-sm leading-6 text-amber-900">No public page should claim that donations are processed, submitted, or tax-receipted until the approved processor, legal language, confirmation emails, and data-storage workflow are connected and tested.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderFoodPantry = () => (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Service operations"
        title="Food Pantry"
        description="This area will become the source of truth for distribution information, families served, food received, food distributed, inventory, and community-impact reporting."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Families Served', 'Needs verified figure'],
          ['Food Distributed', 'Needs verified figure'],
          ['Next Distribution', 'Schedule not confirmed'],
          ['Current Needs', 'Pantry list not connected']
        ].map(([label, value]) => (
          <Card key={label} className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.13em] text-slate-500">{label}</p>
              <p className="mt-3 text-xl font-black text-slate-950">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader><CardTitle>Information required before publishing</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {[
            'Pantry hours and distribution schedule',
            'Eligibility or intake requirements',
            'What families should bring',
            'Pickup and accessibility instructions',
            'Current food and supply needs',
            'Verified impact totals and reporting period'
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-sm text-slate-700">{item}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const renderVolunteers = () => (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="People and service"
        title="Volunteers"
        description="Future volunteer records will include contacts, availability, skills, assignments, hours, training, communication, and event participation."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          ['Volunteer intake', 'Questions and routing need approval', 'waiting' as StatusTone],
          ['Availability', 'Database connection planned', 'planned' as StatusTone],
          ['Assignments', 'Event and pantry roles planned', 'planned' as StatusTone],
          ['Hours served', 'Reporting field planned', 'planned' as StatusTone],
          ['Training', 'Resources and acknowledgements planned', 'planned' as StatusTone],
          ['Communications', 'Email and text workflow planned', 'planned' as StatusTone]
        ].map(([title, description, tone]) => (
          <Card key={String(title)} className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <StatusPill label={tone === 'waiting' ? 'Needs Approval' : 'Phase 2'} tone={tone as StatusTone} />
              <h3 className="mt-4 font-black text-slate-950">{String(title)}</h3>
              <p className="mt-2 text-sm text-slate-600">{String(description)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderPartners = () => (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Community network"
        title="Sponsors & Partners"
        description="Track confirmed partners, prospective sponsors, businesses, churches, community organizations, commitments, follow-ups, and approved public recognition."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle>Current working partners</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              ['Blue Woods Brands', 'Marketing and technology partner', 'Confirmed'],
              ['Forbes Entertainment', 'Community and event partner', 'Shown on proof']
            ].map(([name, role, status]) => (
              <div key={name} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div><p className="font-black text-slate-950">{name}</p><p className="mt-1 text-xs text-slate-600">{role}</p></div>
                <StatusPill label={status} tone="complete" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle>Publication rule</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-black text-amber-950">Only confirmed organizations and officials should appear as attendees or sponsors.</p>
              <p className="mt-2 text-sm leading-6 text-amber-900">Names, titles, logos, contribution details, and event attendance must be confirmed before being shown on the public front end.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderEvents = () => (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Events calendar"
        title="Events"
        description="Grand openings, food distributions, fundraisers, volunteer events, partner appearances, and community outreach will be coordinated here."
      />
      <Card className="overflow-hidden border-red-200 shadow-sm">
        <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="bg-red-700 p-7 text-white">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-100">Featured event</p>
            <p className="mt-5 text-6xl font-black">SEP</p>
            <p className="text-7xl font-black leading-none">01</p>
            <p className="mt-4 text-sm font-bold">Tuesday · 2026</p>
          </div>
          <div className="p-7">
            <StatusPill label="Public proof live" tone="live" />
            <h3 className="mt-4 text-3xl font-black text-slate-950">Compassion Ministries Grand Opening</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">Tour the pantry, meet the Compassion Ministries family, and see what community support is helping make possible.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-500">Time</p><p className="mt-1 font-bold">1:00–5:00 PM · Ribbon cutting 1:30 PM</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-500">Location</p><p className="mt-1 font-bold">180 Walter Way, Suite 120, Fayetteville, GA</p></div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderTasks = () => (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Execution and approval"
        title="Tasks & Approvals"
        description="Every audit finding should become an assigned action with a deadline, status, evidence, approval, and proof of completion. Generation 1 stores task checks in this browser."
      />
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{completedTasks} of {taskItems.length} complete</CardTitle>
            <StatusPill label={completedTasks === taskItems.length ? 'All Clear' : `${taskItems.length - completedTasks} Open`} tone={completedTasks === taskItems.length ? 'complete' : 'progress'} />
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 p-0">
          {taskItems.map((task) => {
            const done = Boolean(taskState[task.id]);
            return (
              <label key={task.id} className="flex cursor-pointer items-start gap-4 px-5 py-5 transition hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => toggleTask(task.id)}
                  className="mt-1 h-5 w-5 rounded border-slate-300 accent-emerald-700"
                />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-black ${done ? 'text-slate-400 line-through' : 'text-slate-950'}`}>{task.title}</span>
                  <span className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{task.area}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">Owner: {task.owner}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">Due: {task.due}</span>
                  </span>
                </span>
              </label>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );

  const renderFiles = () => (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Source materials"
        title="Files & Assets"
        description="The next generation will connect approved logos, photographs, videos, audit screenshots, reports, marketing files, sponsor assets, and production proofs to the client record."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          ['Brand Assets', 'Logo, colors, banner references, and approved identity files', 'Available / organizing'],
          ['Story Media', 'Dr. Diana’s story video, photographs, and future digital-twin media', savedStoryVideoUrl ? 'Video draft saved' : 'Waiting for video'],
          ['Audit Evidence', 'Google, website, SEO, social, and directory screenshots', 'Collection planned'],
          ['Marketing', 'Flyers, banners, social graphics, emails, and campaign files', 'In progress'],
          ['Final Report', 'Findings, recommendations, before-and-after proof, and approvals', 'In development'],
          ['Operational Files', 'Donation, volunteer, pantry, sponsor, and event documents', 'Phase 2']
        ].map(([title, description, status]) => (
          <Card key={title} className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <FolderOpen className="h-7 w-7 text-red-700" />
              <h3 className="mt-4 font-black text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-5 text-slate-600">{description}</p>
              <p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-500">{status}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Client configuration"
        title="Settings"
        description="Identity, access, publishing safeguards, contact information, and future integrations will be managed here."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle>Client identity</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              ['Organization', 'Compassion Ministries of Georgia, Inc.'],
              ['Executive Director', 'Dr. Diana Galloway'],
              ['Co-Founder', 'Barnett Galloway'],
              ['Address', '180 Walter Way, Suite 120, Fayetteville, GA 30214'],
              ['Phone', '770-299-9735'],
              ['Blue Woods Brands role', 'Marketing, branding, technology, and operational support']
            ].map(([label, value]) => (
              <div key={label} className="border-b border-slate-100 pb-3 last:border-b-0">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle>Publishing safeguards</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              'Draft changes remain separate from approved public changes.',
              'Client approval does not automatically equal technical production release.',
              'Payments remain disabled until the approved processor is connected and tested.',
              'Unverified impact figures, officials, sponsors, and schedules are not published.',
              'Generation 1 browser drafts will move to authenticated database records in Phase 2.'
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                <p className="text-sm leading-5 text-slate-700">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderPlaceholderSection = (title: string, description: string, icon: LucideIcon) => {
    const Icon = icon;
    return (
      <div className="space-y-5">
        <SectionTitle eyebrow="First generation" title={title} description={description} />
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="grid min-h-[360px] place-items-center p-8 text-center">
            <div>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-slate-700"><Icon className="h-8 w-8" /></div>
              <h3 className="mt-5 text-xl font-black text-slate-950">The section shell is ready.</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">Database records, forms, permissions, and automations will be connected after the first-generation structure and workflow are approved.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'dashboard': return renderDashboard();
      case 'final-report': return renderFinalReport();
      case 'online-presence': return renderOnlinePresence();
      case 'website-seo': return renderWebsiteSeo();
      case 'social-media': return renderSocialMedia();
      case 'marketing': return renderMarketing();
      case 'donations': return renderDonations();
      case 'food-pantry': return renderFoodPantry();
      case 'volunteers': return renderVolunteers();
      case 'partners': return renderPartners();
      case 'events': return renderEvents();
      case 'tasks': return renderTasks();
      case 'files': return renderFiles();
      case 'settings': return renderSettings();
      default: return renderPlaceholderSection('Compassion Ministries', 'The first-generation client workspace is ready.', Building2);
    }
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-emerald-950/20 bg-emerald-950 text-white shadow-lg">
        <div className="h-2 bg-red-700" />
        <div className="grid gap-6 px-5 py-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:px-8 md:py-9">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">Clients / Compassion Ministries</span>
              <span className="rounded-full border border-red-300/30 bg-red-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-100">First Generation</span>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Compassion Ministries of Georgia</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-100">Managed by Blue Woods Brands · Public experience, audits, marketing, operations, tasks, approvals, and final reporting in one client workspace.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setActiveSection('final-report')} className="border-white/30 bg-white/10 text-white hover:bg-white hover:text-emerald-950">
              <FileText className="mr-2 h-4 w-4" />
              Final Report
            </Button>
            <Button onClick={openFrontEnd} className="bg-red-600 text-white hover:bg-red-500">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Front End
            </Button>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="min-w-0 xl:sticky xl:top-4 xl:self-start">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-200 py-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Workspace</p>
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
                      className={`flex min-h-11 min-w-max items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition xl:w-full ${selected ? 'bg-emerald-950 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'}`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${selected ? 'text-red-300' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </aside>

        <main className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          {renderActiveSection()}
        </main>
      </div>
    </div>
  );
};

export default CompassionMinistriesWorkspace;
