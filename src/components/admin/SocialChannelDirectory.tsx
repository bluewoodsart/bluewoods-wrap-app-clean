import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Apple,
  AtSign,
  BookOpen,
  Building2,
  Camera,
  CheckCircle2,
  ExternalLink,
  Feather,
  Gamepad2,
  Ghost,
  Globe2,
  Hammer,
  Handshake,
  Home,
  Image,
  Images,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  MessagesSquare,
  Music2,
  Palette,
  PenTool,
  Radio,
  Rss,
  Search,
  Send,
  Settings2,
  Share2,
  Star,
  Users,
  Video,
  Wrench,
  Youtube,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';

type ChannelStatus = 'not_started' | 'planned' | 'active' | 'paused';
type PublishingStatus = 'manual' | 'planned' | 'connected';
type ChannelPriority = 'high' | 'standard' | 'watch';
type ChannelCategory = 'core' | 'local' | 'community' | 'portfolio';

interface PlatformDefinition {
  key: string;
  name: string;
  category: ChannelCategory;
  focus: string;
  icon: LucideIcon;
}

interface SocialChannelRow {
  id: string;
  brand_key: string;
  platform_key: string;
  status: ChannelStatus;
  publishing_status: PublishingStatus;
  priority: ChannelPriority;
  profile_name: string;
  handle: string;
  profile_url: string;
  content_focus: string;
  notes: string;
  updated_at: string;
}

interface ChannelDraft {
  status: ChannelStatus;
  publishingStatus: PublishingStatus;
  priority: ChannelPriority;
  profileName: string;
  handle: string;
  profileUrl: string;
  contentFocus: string;
  notes: string;
}

const platforms: PlatformDefinition[] = [
  { key: 'facebook', name: 'Facebook', category: 'core', focus: 'Completed projects, community updates, offers, and customer stories.', icon: Users },
  { key: 'instagram', name: 'Instagram', category: 'core', focus: 'Wrap reveals, before-and-after carousels, Reels, and design details.', icon: Camera },
  { key: 'tiktok', name: 'TikTok', category: 'core', focus: 'Fast transformations, shop process, trends, and short educational clips.', icon: Music2 },
  { key: 'youtube', name: 'YouTube', category: 'core', focus: 'Project stories, installation videos, customer features, and searchable guides.', icon: Youtube },
  { key: 'pinterest', name: 'Pinterest', category: 'core', focus: 'Vehicle-wrap inspiration, color ideas, project boards, and evergreen visual search.', icon: Image },
  { key: 'linkedin', name: 'LinkedIn', category: 'core', focus: 'Commercial fleet work, B2B case studies, partnerships, and company updates.', icon: Linkedin },
  { key: 'threads', name: 'Threads', category: 'core', focus: 'Conversation, quick project updates, brand voice, and community engagement.', icon: AtSign },
  { key: 'x-twitter', name: 'X / Twitter', category: 'core', focus: 'Short updates, event coverage, local conversation, and industry news.', icon: MessageCircle },
  { key: 'snapchat', name: 'Snapchat', category: 'core', focus: 'Behind-the-scenes shop moments, quick reveals, and local audience reach.', icon: Ghost },
  { key: 'google-business-profile', name: 'Google Business Profile', category: 'local', focus: 'Local photos, offers, service updates, reviews, and Fayetteville search visibility.', icon: MapPin },
  { key: 'nextdoor', name: 'Nextdoor', category: 'local', focus: 'Neighborhood awareness, local business recommendations, and community offers.', icon: Home },
  { key: 'yelp', name: 'Yelp', category: 'local', focus: 'Business details, project photos, reviews, and service discovery.', icon: Star },
  { key: 'apple-business-connect', name: 'Apple Business Connect', category: 'local', focus: 'Apple Maps identity, photos, hours, showcases, and accurate local information.', icon: Apple },
  { key: 'bing-places', name: 'Bing Places', category: 'local', focus: 'Microsoft search and maps presence with consistent business information.', icon: Search },
  { key: 'alignable', name: 'Alignable', category: 'local', focus: 'Local business networking, referrals, partnerships, and recommendations.', icon: Handshake },
  { key: 'houzz', name: 'Houzz', category: 'local', focus: 'Visual project portfolio and relationships with contractors and local businesses.', icon: Building2 },
  { key: 'angi', name: 'Angi', category: 'local', focus: 'Service presence, business credibility, and local project discovery.', icon: Wrench },
  { key: 'reddit', name: 'Reddit', category: 'community', focus: 'Helpful answers, project education, local communities, and industry discussion.', icon: MessagesSquare },
  { key: 'discord', name: 'Discord', category: 'community', focus: 'Community groups, partners, creators, and real-time brand conversations.', icon: Gamepad2 },
  { key: 'quora', name: 'Quora', category: 'community', focus: 'Expert answers about vehicle wraps, pricing, design, care, and business use.', icon: BookOpen },
  { key: 'medium', name: 'Medium', category: 'community', focus: 'Long-form project lessons, design strategy, and repurposed educational articles.', icon: PenTool },
  { key: 'substack', name: 'Substack', category: 'community', focus: 'Owned newsletter, project updates, offers, and business-marketing education.', icon: Mail },
  { key: 'bluesky', name: 'Bluesky', category: 'community', focus: 'Open social conversation, company updates, and creator relationships.', icon: Feather },
  { key: 'mastodon', name: 'Mastodon', category: 'community', focus: 'Decentralized communities, company updates, and niche industry conversation.', icon: Send },
  { key: 'tumblr', name: 'Tumblr', category: 'community', focus: 'Visual storytelling, process posts, project collections, and brand personality.', icon: Rss },
  { key: 'vimeo', name: 'Vimeo', category: 'portfolio', focus: 'Polished project films, client review links, and high-quality video portfolios.', icon: Video },
  { key: 'twitch', name: 'Twitch', category: 'portfolio', focus: 'Live design sessions, shop events, project launches, and creative education.', icon: Radio },
  { key: 'behance', name: 'Behance', category: 'portfolio', focus: 'Professional design case studies, wrap concepts, and creative portfolio work.', icon: Palette },
  { key: 'dribbble', name: 'Dribbble', category: 'portfolio', focus: 'Design details, concepts, mockups, and creative-industry visibility.', icon: Share2 },
  { key: 'flickr', name: 'Flickr', category: 'portfolio', focus: 'Organized project photography, albums, event coverage, and visual archives.', icon: Images },
  { key: 'other-channel', name: 'Other / Custom Channel', category: 'portfolio', focus: 'Track another network, directory, community, or publishing destination.', icon: Globe2 },
];

const categoryDetails: Record<ChannelCategory, { label: string; description: string }> = {
  core: { label: 'Core social networks', description: 'The primary places to publish, grow an audience, and show SlapWrapz work.' },
  local: { label: 'Local discovery & business listings', description: 'Channels that strengthen local search, reviews, maps, and business referrals.' },
  community: { label: 'Communities & owned audiences', description: 'Conversation, education, newsletters, and niche audience-building channels.' },
  portfolio: { label: 'Video & creative portfolios', description: 'Long-form video, live content, photography, and design portfolio destinations.' },
};

const statusDetails: Record<ChannelStatus, { label: string; className: string }> = {
  not_started: { label: 'Needs setup', className: 'border-slate-200 bg-slate-100 text-slate-700' },
  planned: { label: 'Planned', className: 'border-amber-200 bg-amber-50 text-amber-800' },
  active: { label: 'Active', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  paused: { label: 'Paused', className: 'border-violet-200 bg-violet-50 text-violet-800' },
};

const publishingDetails: Record<PublishingStatus, string> = {
  manual: 'Manual posting',
  planned: 'Integration planned',
  connected: 'Publishing connected',
};

const createDraft = (platform: PlatformDefinition, row?: SocialChannelRow): ChannelDraft => ({
  status: row?.status ?? 'not_started',
  publishingStatus: row?.publishing_status ?? 'manual',
  priority: row?.priority ?? 'standard',
  profileName: row?.profile_name ?? '',
  handle: row?.handle ?? '',
  profileUrl: row?.profile_url ?? '',
  contentFocus: row?.content_focus || platform.focus,
  notes: row?.notes ?? '',
});

const isValidProfileUrl = (value: string) => {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

const SocialChannelDirectory = ({ adminUserId }: { adminUserId: string }) => {
  const [rowsByPlatform, setRowsByPlatform] = useState<Record<string, SocialChannelRow>>({});
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformDefinition | null>(null);
  const [draft, setDraft] = useState<ChannelDraft | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ChannelCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'needs_setup'>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadChannels = async () => {
      setLoading(true);
      setError('');
      const { data, error: loadError } = await supabase
        .from('bwb_social_channels')
        .select('id, brand_key, platform_key, status, publishing_status, priority, profile_name, handle, profile_url, content_focus, notes, updated_at')
        .eq('brand_key', 'slapwrapz');
      if (loadError) {
        setError(loadError.message);
      } else {
        const rows = (data ?? []) as SocialChannelRow[];
        setRowsByPlatform(Object.fromEntries(rows.map((row) => [row.platform_key, row])));
      }
      setLoading(false);
    };
    void loadChannels();
  }, []);

  const activeCount = platforms.filter((platform) => rowsByPlatform[platform.key]?.status === 'active').length;
  const plannedCount = platforms.filter((platform) => rowsByPlatform[platform.key]?.status === 'planned').length;
  const connectedCount = platforms.filter((platform) => rowsByPlatform[platform.key]?.publishing_status === 'connected').length;
  const needsSetupCount = platforms.length - activeCount - plannedCount - platforms.filter((platform) => rowsByPlatform[platform.key]?.status === 'paused').length;

  const visiblePlatforms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return platforms.filter((platform) => {
      const row = rowsByPlatform[platform.key];
      const matchesQuery = !query || [platform.name, platform.focus, row?.handle, row?.profile_name]
        .some((value) => value?.toLowerCase().includes(query));
      const matchesCategory = categoryFilter === 'all' || platform.category === categoryFilter;
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' && row?.status === 'active')
        || (statusFilter === 'needs_setup' && (!row || row.status === 'not_started'));
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [categoryFilter, rowsByPlatform, searchQuery, statusFilter]);

  const openEditor = (platform: PlatformDefinition) => {
    setSelectedPlatform(platform);
    setDraft(createDraft(platform, rowsByPlatform[platform.key]));
  };

  const saveChannel = async () => {
    if (!selectedPlatform || !draft) return;
    if (!isValidProfileUrl(draft.profileUrl)) {
      toast.error('Enter a complete profile URL beginning with http:// or https://.');
      return;
    }
    setSaving(true);
    const { data, error: saveError } = await supabase
      .from('bwb_social_channels')
      .upsert({
        brand_key: 'slapwrapz',
        platform_key: selectedPlatform.key,
        status: draft.status,
        publishing_status: draft.publishingStatus,
        priority: draft.priority,
        profile_name: draft.profileName.trim(),
        handle: draft.handle.trim(),
        profile_url: draft.profileUrl.trim(),
        content_focus: draft.contentFocus.trim(),
        notes: draft.notes.trim(),
        updated_by_admin_user_id: adminUserId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'brand_key,platform_key' })
      .select('id, brand_key, platform_key, status, publishing_status, priority, profile_name, handle, profile_url, content_focus, notes, updated_at')
      .single();
    setSaving(false);
    if (saveError || !data) {
      toast.error(saveError?.message || 'The social channel could not be saved.');
      return;
    }
    const saved = data as SocialChannelRow;
    setRowsByPlatform((value) => ({ ...value, [saved.platform_key]: saved }));
    setSelectedPlatform(null);
    setDraft(null);
    toast.success(`${selectedPlatform.name} was updated.`);
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-cyan-200 bg-slate-950 text-white shadow-sm">
        <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-6">
          <div>
            <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">Channel inventory</span>
            <h3 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">Build the complete SlapWrapz publishing network</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Record every profile, identify what is missing, prioritize the channels that matter now, and prepare each destination for future publishing connections.</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm">
            <p className="text-xs font-black uppercase tracking-wide text-cyan-200">Future workflow</p>
            <p className="mt-1 font-bold">Create once · publish everywhere</p>
            <p className="mt-1 text-xs text-slate-300">Connections are tracked separately from profile setup.</p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Channels tracked', value: platforms.length, icon: Globe2, color: 'bg-cyan-100 text-cyan-800' },
          { label: 'Active profiles', value: activeCount, icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-800' },
          { label: 'Planned next', value: plannedCount, icon: Settings2, color: 'bg-amber-100 text-amber-800' },
          { label: 'Publishing connected', value: connectedCount, icon: Share2, color: 'bg-violet-100 text-violet-800' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`rounded-xl p-3 ${color}`}><Icon className="h-5 w-5" /></div>
              <div><p className="text-2xl font-black">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search every social and publishing channel" className="pl-9" />
          </div>
          <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as 'all' | ChannelCategory)}>
            <SelectTrigger><SelectValue placeholder="All channel types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channel types</SelectItem>
              {Object.entries(categoryDetails).map(([key, details]) => <SelectItem key={key} value={key}>{details.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'active' | 'needs_setup')}>
            <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active profiles</SelectItem><SelectItem value="needs_setup">Needs setup</SelectItem></SelectContent>
          </Select>
        </CardContent>
      </Card>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}
      {loading && <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-10 text-sm font-semibold text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Loading the shared channel directory...</div>}

      {!loading && (Object.keys(categoryDetails) as ChannelCategory[]).map((category) => {
        const categoryPlatforms = visiblePlatforms.filter((platform) => platform.category === category);
        if (!categoryPlatforms.length) return null;
        const details = categoryDetails[category];
        return (
          <section key={category} className="space-y-3">
            <div>
              <h4 className="text-lg font-black text-slate-950">{details.label}</h4>
              <p className="mt-1 text-sm text-slate-600">{details.description}</p>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {categoryPlatforms.map((platform) => {
                const row = rowsByPlatform[platform.key];
                const status = statusDetails[row?.status ?? 'not_started'];
                const safeProfileUrl = row?.profile_url && isValidProfileUrl(row.profile_url) ? row.profile_url : '';
                const Icon = platform.icon;
                return (
                  <Card key={platform.key} className="border-slate-200 shadow-sm">
                    <CardContent className="flex h-full flex-col p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="rounded-xl bg-slate-950 p-2.5 text-cyan-300"><Icon className="h-5 w-5" /></div>
                          <div className="min-w-0"><p className="font-black text-slate-950">{platform.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{row?.handle || row?.profile_name || 'No profile recorded yet'}</p></div>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${status.className}`}>{status.label}</span>
                      </div>
                      <p className="mt-4 flex-1 text-sm leading-6 text-slate-600">{row?.content_focus || platform.focus}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black uppercase text-violet-800">{publishingDetails[row?.publishing_status ?? 'manual']}</span>
                        {row?.priority === 'high' && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase text-amber-800">High priority</span>}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditor(platform)}><Settings2 className="mr-2 h-4 w-4" />{row ? 'Edit channel' : 'Set up channel'}</Button>
                        {safeProfileUrl && <Button size="sm" variant="ghost" asChild><a href={safeProfileUrl} target="_blank" rel="noreferrer">Open profile <ExternalLink className="ml-2 h-4 w-4" /></a></Button>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}

      {!loading && visiblePlatforms.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center"><p className="font-black text-slate-900">No channels match these filters.</p><p className="mt-1 text-sm text-slate-600">Clear the search or choose a different channel type.</p></div>
      )}

      <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950">
        <strong>{needsSetupCount} channels still need setup.</strong> Start with Facebook, Instagram, TikTok, YouTube, Google Business Profile, Pinterest, and LinkedIn; keep the full directory visible so nothing is forgotten.
      </div>

      <Dialog open={Boolean(selectedPlatform && draft)} onOpenChange={(open) => { if (!open) { setSelectedPlatform(null); setDraft(null); } }}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto p-4 sm:w-full sm:p-6">
          {selectedPlatform && draft && (
            <>
              <DialogHeader className="text-left">
                <DialogTitle>{selectedPlatform.name}</DialogTitle>
                <DialogDescription>Record the SlapWrapz profile now and track how publishing will be handled later.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2 sm:grid-cols-2">
                <div><Label>Status</Label><Select value={draft.status} onValueChange={(value) => setDraft({ ...draft, status: value as ChannelStatus })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="not_started">Needs setup</SelectItem><SelectItem value="planned">Planned</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="paused">Paused</SelectItem></SelectContent></Select></div>
                <div><Label>Posting connection</Label><Select value={draft.publishingStatus} onValueChange={(value) => setDraft({ ...draft, publishingStatus: value as PublishingStatus })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manual">Manual posting</SelectItem><SelectItem value="planned">Integration planned</SelectItem><SelectItem value="connected">Publishing connected</SelectItem></SelectContent></Select></div>
                <div><Label>Priority</Label><Select value={draft.priority} onValueChange={(value) => setDraft({ ...draft, priority: value as ChannelPriority })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">High priority</SelectItem><SelectItem value="standard">Standard</SelectItem><SelectItem value="watch">Watch for later</SelectItem></SelectContent></Select></div>
                <div><Label htmlFor="social-profile-name">Profile name</Label><Input id="social-profile-name" className="mt-1" value={draft.profileName} onChange={(event) => setDraft({ ...draft, profileName: event.target.value })} placeholder="SlapWrapz" /></div>
                <div><Label htmlFor="social-handle">Handle / username</Label><Input id="social-handle" className="mt-1" value={draft.handle} onChange={(event) => setDraft({ ...draft, handle: event.target.value })} placeholder="@slapwrapz" /></div>
                <div><Label htmlFor="social-url">Profile URL</Label><Input id="social-url" className="mt-1" value={draft.profileUrl} onChange={(event) => setDraft({ ...draft, profileUrl: event.target.value })} placeholder="https://..." /></div>
                <div className="sm:col-span-2"><Label htmlFor="social-focus">Content focus</Label><Textarea id="social-focus" className="mt-1" value={draft.contentFocus} onChange={(event) => setDraft({ ...draft, contentFocus: event.target.value })} /></div>
                <div className="sm:col-span-2"><Label htmlFor="social-notes">Notes</Label><Textarea id="social-notes" className="mt-1" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Login owner, next setup step, profile requirements, or publishing notes..." /></div>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => { setSelectedPlatform(null); setDraft(null); }}>Cancel</Button>
                <Button onClick={() => void saveChannel()} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Save channel</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SocialChannelDirectory;
