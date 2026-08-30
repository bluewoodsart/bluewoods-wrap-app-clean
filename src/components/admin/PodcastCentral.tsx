import { useEffect, useRef, useState } from 'react';
import {
  Archive,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  FileImage,
  Headphones,
  Lightbulb,
  Loader2,
  MapPin,
  Mic2,
  Plus,
  RadioTower,
  Rss,
  Share2,
  Sparkles,
  Upload,
  Video,
  Youtube,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import PodcastIdeaMedia from './PodcastIdeaMedia';

type ShowStatus = 'active' | 'foundation' | 'planned';

interface PodcastShow {
  name: string;
  owner: string;
  description: string;
  status: ShowStatus;
  accent: string;
}

interface PodcastAsset {
  id: string;
  name: string;
  path: string;
  createdAt: string | null;
  signedUrl: string;
}

interface PodcastIdea {
  id: string;
  title: string;
  concept: string;
  show_key: string | null;
  related_initiatives: string[];
  status: 'idea' | 'developing' | 'ready' | 'producing' | 'launched';
  priority: 'flagship' | 'high' | 'standard';
  target_date: string | null;
  updated_at: string;
}

const shows: PodcastShow[] = [
  {
    name: 'The Breakout',
    owner: 'Blue Woods Brands',
    description: 'The flagship show about breaking out, building brands, creating opportunities, and documenting the work in public.',
    status: 'foundation',
    accent: 'border-cyan-200 bg-cyan-50',
  },
  {
    name: 'Press Play Podcast',
    owner: 'Press Play',
    description: 'Advertising, entertainment, activation ideas, and the people who know how to press play on an opportunity.',
    status: 'planned',
    accent: 'border-violet-200 bg-violet-50',
  },
  {
    name: 'A&W Podcast',
    owner: 'A&W',
    description: 'A dedicated show lane ready for its concept, hosts, visual identity, channel connections, and episode plan.',
    status: 'planned',
    accent: 'border-amber-200 bg-amber-50',
  },
  {
    name: 'The Golden Years',
    owner: 'Blue Woods Brands · Boomer app bridge',
    description: 'Stories, wisdom, memories, and turning points from older adults—preserving their voices while opening the path toward the future Boomer app.',
    status: 'planned',
    accent: 'border-yellow-200 bg-yellow-50',
  },
  {
    name: 'SlapWrapz Podcast',
    owner: 'SlapWrapz',
    description: 'Vehicle transformations, customer stories, design education, shop talk, and the business behind moving billboards.',
    status: 'planned',
    accent: 'border-fuchsia-200 bg-fuchsia-50',
  },
];

const distributionChannels = [
  { name: 'YouTube', detail: 'New Blue Woods Brands channel setup underway', icon: Youtube, status: 'Setup started' },
  { name: 'Spotify', detail: 'Audio show destination', icon: Headphones, status: 'Connect next' },
  { name: 'Apple Podcasts', detail: 'Audio directory and subscriber destination', icon: Rss, status: 'Connect next' },
  { name: 'Social clips', detail: 'Short-form cuts for the BWB social network', icon: Share2, status: 'Workflow ready' },
];

const episodePipeline = [
  { label: 'Idea', detail: 'Capture the show or episode concept', icon: Sparkles },
  { label: 'Research', detail: 'Guests, history, locations, and story', icon: Archive },
  { label: 'Record', detail: 'Studio, remote, or on location', icon: Mic2 },
  { label: 'Edit', detail: 'Full episode, audio, and short clips', icon: Video },
  { label: 'Approve', detail: 'Review titles, artwork, and final cuts', icon: CheckCircle2 },
  { label: 'Distribute', detail: 'Publish once and send everywhere', icon: RadioTower },
];

const showStatus = {
  active: { label: 'Active', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  foundation: { label: 'Foundation live', className: 'border-cyan-200 bg-cyan-50 text-cyan-800' },
  planned: { label: 'Planned', className: 'border-slate-200 bg-white text-slate-700' },
};

const formatFileName = (name: string) => name.replace(/^[0-9a-f-]{36}-/i, '').replace(/[-_]+/g, ' ');

const ideaStatusStyles: Record<PodcastIdea['status'], string> = {
  idea: 'border-slate-200 bg-slate-50 text-slate-700',
  developing: 'border-amber-200 bg-amber-50 text-amber-800',
  ready: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  producing: 'border-violet-200 bg-violet-50 text-violet-800',
  launched: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

const PodcastCentral = ({ adminUserId, onOpenSocial, onOpenCalendar }: { adminUserId: string; onOpenSocial: () => void; onOpenCalendar: () => void }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<PodcastAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [assetError, setAssetError] = useState('');
  const [ideas, setIdeas] = useState<PodcastIdea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(true);
  const [ideaError, setIdeaError] = useState('');
  const [savingIdea, setSavingIdea] = useState(false);
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaConcept, setNewIdeaConcept] = useState('');
  const [newIdeaConnections, setNewIdeaConnections] = useState('');
  const [newIdeaTargetDate, setNewIdeaTargetDate] = useState('');

  const loadAssets = async () => {
    setLoadingAssets(true);
    setAssetError('');
    const { data, error } = await supabase.storage
      .from('bwb-podcast-assets')
      .list('breakout', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

    if (error) {
      setAssetError(error.message);
      setAssets([]);
      setLoadingAssets(false);
      return;
    }

    const files = (data ?? []).filter((file) => file.name && file.id);
    const signedAssets = await Promise.all(files.map(async (file) => {
      const path = `breakout/${file.name}`;
      const { data: signed } = await supabase.storage.from('bwb-podcast-assets').createSignedUrl(path, 3600);
      return {
        id: file.id || path,
        name: file.name,
        path,
        createdAt: file.created_at || null,
        signedUrl: signed?.signedUrl || '',
      };
    }));

    setAssets(signedAssets);
    setLoadingAssets(false);
  };

  const loadIdeas = async () => {
    setLoadingIdeas(true);
    setIdeaError('');
    const { data, error } = await supabase
      .from('bwb_podcast_ideas')
      .select('id, title, concept, show_key, related_initiatives, status, priority, target_date, updated_at')
      .order('priority', { ascending: true })
      .order('target_date', { ascending: true, nullsFirst: false })
      .order('updated_at', { ascending: false });
    if (error) {
      setIdeaError(error.message);
      setIdeas([]);
    } else {
      setIdeas((data ?? []) as PodcastIdea[]);
    }
    setLoadingIdeas(false);
  };

  useEffect(() => {
    void loadAssets();
    void loadIdeas();
  }, []);

  const saveIdea = async () => {
    const title = newIdeaTitle.trim();
    const concept = newIdeaConcept.trim();
    if (!title || !concept) {
      toast.error('Give the podcast idea a title and a short concept.');
      return;
    }
    setSavingIdea(true);
    const { error } = await supabase.from('bwb_podcast_ideas').insert({
      title,
      concept,
      show_key: 'breakout',
      related_initiatives: newIdeaConnections.split(',').map((item) => item.trim()).filter(Boolean),
      status: 'idea',
      priority: 'standard',
      target_date: newIdeaTargetDate || null,
      created_by_admin_user_id: adminUserId,
      updated_at: new Date().toISOString(),
    });
    setSavingIdea(false);
    if (error) {
      toast.error(error.message || 'The podcast idea could not be saved.');
      return;
    }
    setNewIdeaTitle('');
    setNewIdeaConcept('');
    setNewIdeaConnections('');
    setNewIdeaTargetDate('');
    toast.success(`${title} was added to Podcast Central.`);
    await loadIdeas();
  };

  const uploadAsset = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      toast.error('Podcast assets must be 25 MB or smaller.');
      return;
    }
    const allowed = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!allowed) {
      toast.error('Upload a PNG, JPG, SVG, WEBP, or PDF brand asset.');
      return;
    }

    setUploading(true);
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/-+/g, '-');
    const path = `breakout/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage
      .from('bwb-podcast-assets')
      .upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });
    setUploading(false);

    if (error) {
      toast.error(error.message || 'The asset could not be uploaded.');
      return;
    }
    toast.success(`${file.name} is now in the shared Podcast Asset Vault.`);
    await loadAssets();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void uploadAsset(file);
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-cyan-300/40 bg-slate-950 text-white shadow-sm">
        <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-center md:p-7">
          <div>
            <span className="inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">Blue Woods broadcast system</span>
            <h3 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Podcast Central</h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Build every Blue Woods show in one world: identity, ideas, episodes, production, channels, clips, distribution, and performance.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={onOpenCalendar} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"><CalendarDays className="mr-2 h-4 w-4" />Open content calendar</Button>
              <Button onClick={onOpenSocial} variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white hover:text-slate-950"><Share2 className="mr-2 h-4 w-4" />Open social channels</Button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white p-4">
            <img src="/bwb-bluewoods-logo.png" alt="Blue Woods Brands blue and white logo" className="w-full object-contain" />
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Podcast brands', value: shows.length, icon: Mic2, color: 'bg-cyan-100 text-cyan-800' },
          { label: 'Flagship show', value: 1, icon: RadioTower, color: 'bg-violet-100 text-violet-800' },
          { label: 'Ideas captured', value: ideas.length, icon: Lightbulb, color: 'bg-amber-100 text-amber-800' },
          { label: 'Publishing lanes', value: distributionChannels.length, icon: Share2, color: 'bg-emerald-100 text-emerald-800' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`rounded-xl p-3 ${color}`}><Icon className="h-5 w-5" /></div>
              <div><p className="text-2xl font-black text-slate-950">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Card className="overflow-hidden border-cyan-200 shadow-sm">
          <div className="bg-gradient-to-br from-cyan-500 via-blue-700 to-slate-950 p-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide">Flagship podcast</span>
              <span className="rounded-full bg-cyan-300 px-3 py-1 text-[10px] font-black uppercase text-slate-950">Foundation live</span>
            </div>
            <h3 className="mt-5 text-4xl font-black tracking-tight">The Breakout</h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-cyan-50">The acting front for Blue Woods Brands—documenting the moment people, ideas, companies, and communities break out into something bigger.</p>
          </div>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
            {[
              ['Parent brand', 'Blue Woods Brands'],
              ['Primary channel', 'YouTube setup started'],
              ['Host system', 'BWB production workflow'],
              ['Publishing model', 'One episode · many destinations'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/60 shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-800">First recurring series</p>
                <CardTitle className="mt-2 text-2xl">Fayetteville Originals</CardTitle>
              </div>
              <MapPin className="h-7 w-7 text-amber-700" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-slate-700">Go inside Fayetteville's longtime restaurants, shops, buildings, churches, entertainment spots, and family businesses to preserve the stories of the people and places that made the city.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {['Location & old photos', 'Founder or community voice', 'Origin story', 'How Fayetteville changed', 'Lessons worth preserving', 'Where the place is today'].map((item, index) => (
                <div key={item} className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-slate-800">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px] font-black text-amber-950">{index + 1}</span>{item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-xl font-black text-slate-950">Blue Woods podcast portfolio</h3>
          <p className="mt-1 text-sm text-slate-600">Every show gets its own brand kit, channel connections, episode board, distribution history, and analytics.</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {shows.map((show) => {
            const status = showStatus[show.status];
            return (
              <Card key={show.name} className={`${show.accent} shadow-sm`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-xs font-black uppercase tracking-wide text-slate-500">{show.owner}</p><h4 className="mt-1 text-xl font-black text-slate-950">{show.name}</h4></div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${status.className}`}>{status.label}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{show.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-xl font-black text-slate-950">Podcast Idea Bank</h3>
          <p className="mt-1 text-sm text-slate-600">Capture every show, recurring series, field episode, community activation, and connected business idea as it arrives.</p>
        </div>
        <Card className="border-amber-200 bg-amber-50/40 shadow-sm">
          <CardContent className="grid gap-4 p-4 lg:grid-cols-[.8fr_1.2fr]">
            <div className="space-y-3">
              <div><Label htmlFor="podcast-idea-title">Idea title</Label><Input id="podcast-idea-title" className="mt-1 bg-white" value={newIdeaTitle} onChange={(event) => setNewIdeaTitle(event.target.value)} placeholder="New show, episode, series, or event" /></div>
              <div><Label htmlFor="podcast-idea-connections">Connected plans</Label><Input id="podcast-idea-connections" className="mt-1 bg-white" value={newIdeaConnections} onChange={(event) => setNewIdeaConnections(event.target.value)} placeholder="DJ West, service companies, Boomer app..." /></div>
              <div><Label htmlFor="podcast-idea-date">Target date</Label><Input id="podcast-idea-date" type="date" className="mt-1 bg-white" value={newIdeaTargetDate} onChange={(event) => setNewIdeaTargetDate(event.target.value)} /></div>
            </div>
            <div className="flex flex-col">
              <Label htmlFor="podcast-idea-concept">Concept</Label>
              <Textarea id="podcast-idea-concept" className="mt-1 min-h-32 flex-1 bg-white" value={newIdeaConcept} onChange={(event) => setNewIdeaConcept(event.target.value)} placeholder="What happens, who is involved, why it matters, and what it connects to..." />
              <Button className="mt-3 self-end" onClick={() => void saveIdea()} disabled={savingIdea}>{savingIdea ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Save idea</Button>
            </div>
          </CardContent>
        </Card>

        {ideaError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{ideaError}</div>}
        {loadingIdeas && <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-8 text-sm font-semibold text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Loading the Podcast Idea Bank...</div>}
        {!loadingIdeas && ideas.length > 0 && (
          <div className="grid gap-3 lg:grid-cols-2">
            {ideas.map((idea) => (
              <Card key={idea.id} className={`shadow-sm ${idea.priority === 'flagship' ? 'border-cyan-300 bg-cyan-50/40' : idea.target_date ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'}`}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-xs font-black uppercase tracking-wide text-slate-500">{idea.priority === 'flagship' ? 'Flagship' : idea.show_key === 'breakout' ? 'The Breakout' : idea.show_key ? idea.show_key.replace(/-/g, ' ') : 'Podcast Central'}</p><h4 className="mt-1 text-lg font-black text-slate-950">{idea.title}</h4></div>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${ideaStatusStyles[idea.status]}`}>{idea.status}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{idea.concept}</p>
                  {idea.related_initiatives.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{idea.related_initiatives.map((connection) => <span key={connection} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase text-slate-700 ring-1 ring-slate-200">{connection}</span>)}</div>}
                  {idea.target_date && <div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-3 text-xs font-black text-amber-800"><CalendarDays className="h-4 w-4" />Target: {new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${idea.target_date}T00:00:00Z`))}</div>}
                  <PodcastIdeaMedia ideaId={idea.id} ideaTitle={idea.title} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-xl font-black text-slate-950">Create once · publish everywhere</h3>
          <p className="mt-1 text-sm text-slate-600">The production lane that Podcast Central will eventually package as a reusable customer plugin and Codex skill.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {episodePipeline.map(({ label, detail, icon: Icon }, index) => (
            <Card key={label} className="border-slate-200 shadow-sm">
              <CardContent className="flex gap-3 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-cyan-300"><Icon className="h-5 w-5" /></div>
                <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Step {index + 1}</p><p className="font-black text-slate-950">{label}</p><p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2"><RadioTower className="h-5 w-5 text-cyan-700" />Publishing destinations</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {distributionChannels.map(({ name, detail, icon: Icon, status }) => (
              <div key={name} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                <div className="rounded-xl bg-slate-950 p-2.5 text-cyan-300"><Icon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1"><p className="font-black text-slate-950">{name}</p><p className="mt-0.5 text-xs text-slate-500">{detail}</p></div>
                <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase text-slate-700 sm:inline-flex">{status}</span>
              </div>
            ))}
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950"><strong>Security:</strong> channel passwords stay with Google and each platform. Podcast Central will store connections and URLs—not passwords.</div>
          </CardContent>
        </Card>

        <Card className="border-cyan-200 shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div><p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-700">Shared across computers</p><CardTitle className="mt-2">Podcast Asset Vault</CardTitle><p className="mt-1 text-sm text-slate-600">Logos, cover art, guest photos, episode artwork, sponsor files, and approved exports.</p></div>
              <div>
                <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
                <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>{uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Upload asset</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)_auto] sm:items-center rounded-xl border border-cyan-200 bg-cyan-50 p-3">
              <div className="rounded-lg border border-white bg-white p-2"><img src="/bwb-bluewoods-logo.png" alt="BWB master logo" className="h-16 w-full object-contain" /></div>
              <div><p className="font-black text-slate-950">BWB blue-and-white master logo</p><p className="mt-1 text-xs text-slate-600">Ready now for The Breakout YouTube channel and podcast brand development.</p></div>
              <Button size="sm" variant="outline" asChild><a href="/bwb-bluewoods-logo.png" download="bwb-bluewoods-logo.png"><Download className="mr-2 h-4 w-4" />Download</a></Button>
            </div>

            {assetError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{assetError}</div>}
            {loadingAssets && <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm font-semibold text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Loading shared podcast assets...</div>}
            {!loadingAssets && assets.length === 0 && !assetError && <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"><FileImage className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-2 font-black text-slate-900">The shared upload lane is ready.</p><p className="mt-1 text-sm text-slate-600">Upload The Breakout cover art, alternate logos, guest photos, or sponsor files.</p></div>}
            {!loadingAssets && assets.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {assets.map((asset) => (
                  <div key={asset.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                    <div className="rounded-lg bg-slate-100 p-2.5 text-slate-700"><FileImage className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-950">{formatFileName(asset.name)}</p><p className="mt-0.5 text-xs text-slate-500">The Breakout asset</p></div>
                    {asset.signedUrl && <Button size="icon" variant="ghost" asChild><a href={asset.signedUrl} target="_blank" rel="noreferrer" aria-label={`Open ${formatFileName(asset.name)}`}><ExternalLink className="h-4 w-4" /></a></Button>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-violet-200 bg-violet-50/60 shadow-sm">
        <CardContent className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div><p className="text-xs font-black uppercase tracking-[0.14em] text-violet-800">Future product</p><h3 className="mt-2 text-xl font-black text-slate-950">Podcast Central Plugin + Skill</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">This Blue Woods workspace becomes the model for a customer-ready system: create a podcast brand, organize episodes, manage assets, connect channels, approve content, and publish everywhere.</p></div>
          <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-black text-violet-900"><BarChart3 className="h-5 w-5" />Reusable foundation started</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PodcastCentral;
