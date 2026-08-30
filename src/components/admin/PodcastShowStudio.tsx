import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  Headphones,
  Mic2,
  Play,
  RadioTower,
  Rss,
  Settings2,
  Share2,
  Youtube,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PodcastIdea, PodcastShow } from './PodcastCentral';
import PodcastIdeaMedia from './PodcastIdeaMedia';

const formatTargetDate = (targetDate: string) => new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
}).format(new Date(`${targetDate}T00:00:00Z`));

const setupForShow = (show: PodcastShow) => [
  { label: 'Show name', detail: show.key === 'breakout' ? 'Working title—final naming decision remains open' : show.name, complete: show.key !== 'breakout' },
  { label: 'Parent brand', detail: show.owner, complete: true },
  { label: 'Cover artwork', detail: show.key === 'breakout' ? 'BWB master mark available' : 'Create square podcast cover', complete: show.key === 'breakout' },
  { label: 'Trailer & intro', detail: 'Record the show promise and opening', complete: false },
  { label: 'Publishing accounts', detail: 'Connect YouTube and audio feeds', complete: false },
  { label: 'Release cadence', detail: 'Choose weekly, seasonal, or field schedule', complete: false },
];

const PodcastShowStudio = ({ show, ideas, onBack }: { show: PodcastShow; ideas: PodcastIdea[]; onBack: () => void }) => {
  const setup = setupForShow(show);
  const completedSetup = setup.filter((item) => item.complete).length;

  return (
    <div className="space-y-5">
      <Button variant="ghost" onClick={onBack} className="px-0 text-slate-700 hover:bg-transparent hover:text-slate-950"><ArrowLeft className="mr-2 h-4 w-4" />Back to Podcast Central</Button>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-xl">
        <div className="bg-gradient-to-br from-cyan-500/70 via-blue-800/80 to-fuchsia-900/70 p-5 sm:p-7">
          <div className="grid gap-6 md:grid-cols-[210px_minmax(0,1fr)] md:items-end">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-slate-950/80 shadow-2xl">
              {show.key === 'breakout' ? <img src="/bwb-bluewoods-logo.png" alt="BWB Breakout cover foundation" className="w-full bg-white p-5" /> : <span className="px-4 text-center text-5xl font-black tracking-tighter text-cyan-300">{show.name.split(' ').map((word) => word[0]).join('').slice(0, 3)}</span>}
            </div>
            <div>
              <span className="inline-flex rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">Blue Woods podcast studio</span>
              {show.key === 'breakout' && <span className="ml-2 inline-flex rounded-full border border-amber-200/40 bg-amber-300/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100">Working title</span>}
              <p className="mt-5 text-sm font-black uppercase tracking-wide text-white/70">Podcast</p>
              <h2 className="mt-1 text-4xl font-black tracking-tight sm:text-6xl">{show.name}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/85">{show.description}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button className="rounded-full bg-cyan-300 text-slate-950 hover:bg-cyan-200" onClick={() => document.getElementById('podcast-episode-board')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><Play className="mr-2 h-4 w-4 fill-current" />Build next episode</Button>
                <span className="text-xs font-bold text-white/70">{ideas.length} episode ideas · {completedSetup} of {setup.length} setup steps ready</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,.55fr)]">
        <main className="space-y-5">
          <Card id="podcast-episode-board" className="scroll-mt-5 border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-700">Episode board</p><CardTitle className="mt-2">Stories being developed</CardTitle></div><Mic2 className="h-6 w-6 text-cyan-700" /></div>
            </CardHeader>
            <CardContent className="space-y-3">
              {ideas.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"><p className="font-black text-slate-950">This studio is ready for its first episode.</p><p className="mt-1 text-sm text-slate-600">Add the idea in Podcast Central, then its complete media folder will appear here.</p></div>}
              {ideas.map((idea, index) => (
                <div key={idea.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-black text-cyan-300">{String(index + 1).padStart(2, '0')}</div>
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-slate-950">{idea.title}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">{idea.status}</span></div><p className="mt-1 text-sm leading-6 text-slate-600">{idea.concept}</p>{idea.target_date && <p className="mt-2 flex items-center gap-1 text-xs font-black text-amber-800"><CalendarDays className="h-3.5 w-3.5" />Target {formatTargetDate(idea.target_date)}</p>}</div>
                  </div>
                  <PodcastIdeaMedia ideaId={idea.id} ideaTitle={idea.title} />
                </div>
              ))}
            </CardContent>
          </Card>
        </main>

        <aside className="space-y-5">
          {show.key === 'breakout' && (
            <Card className="border-amber-300 bg-amber-50/70 shadow-sm">
              <CardHeader><CardTitle>Flagship naming decision</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-slate-700">“Breakout” has the right energy, but it needs a distinctive searchable identity before channel launch.</p>
                <div className="mt-3 flex flex-wrap gap-2">{['BWB Breakout', 'Fayetteville Georgia Breakout', 'Blue Woods Breakout', 'The Fayetteville Breakout'].map((name) => <span key={name} className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-black text-slate-800">{name}</span>)}</div>
                <p className="mt-3 text-xs font-semibold text-amber-900">Keep BWB Breakout as the working title until we compare availability, memorability, local reach, and future expansion.</p>
              </CardContent>
            </Card>
          )}

          <Card className="border-violet-200 bg-violet-50/50 shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2"><Mic2 className="h-5 w-5 text-violet-700" />Recording room</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-slate-700">Use Riverside for remote interviews, separate guest tracks, transcripts, editing, and social clips. Field stories can still be recorded on location and uploaded to their episode folder here.</p>
              <Button className="mt-4 w-full" variant="outline" asChild><a href="https://riverside.com/home" target="_blank" rel="noreferrer">Open Riverside <ExternalLink className="ml-2 h-4 w-4" /></a></Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-cyan-700" />Show setup</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {setup.map((item) => (
                <div key={item.label} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                  {item.complete ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />}
                  <div><p className="text-sm font-black text-slate-950">{item.label}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{item.detail}</p></div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2"><RadioTower className="h-5 w-5 text-fuchsia-700" />Publish everywhere</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'YouTube', icon: Youtube },
                { label: 'Spotify', icon: Headphones },
                { label: 'Apple Podcasts', icon: Rss },
                { label: 'Social clips', icon: Share2 },
              ].map(({ label, icon: Icon }) => <div key={label} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5"><span className="flex items-center gap-2 text-sm font-black text-slate-800"><Icon className="h-4 w-4" />{label}</span><span className="text-[10px] font-black uppercase text-slate-400">Connect</span></div>)}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default PodcastShowStudio;
