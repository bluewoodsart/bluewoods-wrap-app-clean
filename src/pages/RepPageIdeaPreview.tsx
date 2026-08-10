import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface RepPageIdeaPreviewRow {
  id: string;
  rep_slug: string;
  rep_name: string | null;
  brand_name: string;
  industry: string | null;
  category: string | null;
  niche: string | null;
  page_title: string | null;
  status: string;
  idea_text: string;
}

type PreviewTheme = {
  eyebrow: string;
  headline: string;
  subheadline: string;
  primary: string;
  secondary: string;
  glow: string;
  services: Array<{ title: string; description: string }>;
};

const getTheme = (idea: RepPageIdeaPreviewRow): PreviewTheme => {
  const direction = [idea.page_title, idea.category, idea.industry, idea.niche, idea.idea_text]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/ice cream|dessert|frozen/.test(direction)) {
    return {
      eyebrow: 'Make every stop impossible to miss',
      headline: 'Turn your dessert truck into the neighborhood landmark.',
      subheadline: 'Color-forward vehicle graphics built to create excitement, foot traffic, and repeat customers before the window ever opens.',
      primary: '#db2777', secondary: '#7c3aed', glow: '#f9a8d4',
      services: [
        { title: 'Flavor-first graphics', description: 'Bright, readable visuals that make the menu and brand memorable at a glance.' },
        { title: 'Event-ready visibility', description: 'A professional look for festivals, schools, parks, and private bookings.' },
        { title: 'Social follow-through', description: 'QR and social calls-to-action that turn each stop into future bookings.' }
      ]
    };
  }

  if (/food truck|catering|food service/.test(direction)) {
    return {
      eyebrow: 'Arrive looking ready to serve',
      headline: 'A polished mobile brand customers trust on sight.',
      subheadline: 'Professional vehicle graphics that clarify your menu, strengthen event confidence, and keep your business recognizable everywhere it goes.',
      primary: '#ea580c', secondary: '#b91c1c', glow: '#fdba74',
      services: [
        { title: 'Readable menu moments', description: 'Clear food, service, and contact cues designed for busy event environments.' },
        { title: 'Booking confidence', description: 'A consistent brand presence for weddings, corporate events, and celebrations.' },
        { title: 'Mobile marketing', description: 'Every trip becomes a visible invitation to book the next event.' }
      ]
    };
  }

  if (/roof|contractor|home service/.test(direction)) {
    return {
      eyebrow: 'Build trust before the first estimate',
      headline: 'A roofing brand that looks established wherever the crew goes.',
      subheadline: 'High-authority vehicle graphics that make your company easier to recognize, remember, and call when homeowners need help.',
      primary: '#ca8a04', secondary: '#1e293b', glow: '#fde047',
      services: [
        { title: 'Authority on the road', description: 'Clean, confident branding that signals a dependable local operation.' },
        { title: 'Instant contact', description: 'Prominent phone, website, and service information without visual clutter.' },
        { title: 'Neighborhood reach', description: 'Turn every active job site into proof that your company serves the area.' }
      ]
    };
  }

  if (/tow|automotive|vehicle|truck|wrap/.test(direction)) {
    return {
      eyebrow: 'Own the road before the first call',
      headline: 'Working vehicles that sell the business around the clock.',
      subheadline: 'Bold, durable fleet graphics designed for instant recognition, faster trust, and stronger local recall.',
      primary: '#2563eb', secondary: '#0f172a', glow: '#67e8f9',
      services: [
        { title: 'High-speed recognition', description: 'Readable identity and contact information built for moving traffic.' },
        { title: 'Fleet consistency', description: 'A repeatable visual system that scales from one truck to the next.' },
        { title: 'Local lead capture', description: 'Calls-to-action that turn roadside visibility into real inquiries.' }
      ]
    };
  }

  return {
    eyebrow: 'A sharper way to be remembered',
    headline: 'Put your brand where customers already look.',
    subheadline: 'A focused visual concept built to create recognition, communicate value, and give the next customer a clear reason to respond.',
    primary: '#4f46e5', secondary: '#111827', glow: '#a5b4fc',
    services: [
      { title: 'Clear first impression', description: 'Lead with the message customers need to understand immediately.' },
      { title: 'Consistent brand presence', description: 'Bring the same recognizable look to vehicles, signage, print, and digital touchpoints.' },
      { title: 'Action customers can take', description: 'Make calling, scanning, visiting, or requesting a quote feel effortless.' }
    ]
  };
};

const RepPageIdeaPreview = () => {
  const { ideaId = '' } = useParams();
  const [idea, setIdea] = useState<RepPageIdeaPreviewRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadIdea = async () => {
      const { data, error: loadError } = await supabase.rpc('list_admin_rep_page_ideas_v1', { p_rep_slug: null });
      if (!active) return;

      if (loadError) {
        setError(loadError.message);
        setLoading(false);
        return;
      }

      const match = ((data ?? []) as RepPageIdeaPreviewRow[]).find((row) => row.id === ideaId) || null;
      setIdea(match);
      setError(match ? '' : 'This page idea could not be found, or your admin session has expired.');
      setLoading(false);
    };

    void loadIdea();
    return () => { active = false; };
  }, [ideaId]);

  const theme = useMemo(() => idea ? getTheme(idea) : null, [idea]);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white"><div className="text-center"><Loader2 className="mx-auto h-9 w-9 animate-spin text-cyan-300" /><p className="mt-4 font-semibold">Building the approved front-end preview...</p></div></main>;
  }

  if (!idea || !theme) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-5">
        <div className="w-full max-w-lg rounded-3xl border bg-white p-8 text-center shadow-xl">
          <ShieldCheck className="mx-auto h-10 w-10 text-red-500" />
          <h1 className="mt-4 text-2xl font-black">Preview unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{error}</p>
          <Button className="mt-6" asChild><Link to="/admin?tab=reps&approvals=1">Back to Approvals</Link></Button>
        </div>
      </main>
    );
  }

  const title = idea.page_title || idea.category || `${idea.rep_name || idea.rep_slug} page concept`;
  const repName = idea.rep_name || idea.rep_slug;
  const themeVariables = { '--preview-primary': theme.primary, '--preview-secondary': theme.secondary, '--preview-glow': theme.glow } as CSSProperties;

  return (
    <main className="min-h-screen bg-slate-950 text-white" style={themeVariables}>
      <div className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><span className="rounded-full bg-amber-300 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-950">BWB Test Preview</span><p className="text-xs text-slate-300">Approved concept • not published to customers</p></div>
          <Button size="sm" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" asChild><Link to="/admin?tab=reps&approvals=1"><ArrowLeft className="mr-2 h-4 w-4" />Back to Approvals</Link></Button>
        </div>
      </div>

      <section className="relative isolate overflow-hidden px-5 py-20 sm:py-28">
        <div className="absolute inset-0 -z-20 bg-slate-950" />
        <img src="/slapwrapz/vehicle-wraps-hero-no-qr.png" alt="Wrapped business vehicle" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-35" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/30" />
        <div className="absolute -left-24 top-10 -z-10 h-72 w-72 rounded-full opacity-30 blur-3xl" style={{ backgroundColor: theme.glow }} />
        <div className="mx-auto max-w-7xl"><div className="max-w-3xl">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em]" style={{ color: theme.glow }}><Sparkles className="h-4 w-4" />{theme.eyebrow}</div>
          <h1 className="mt-6 text-4xl font-black leading-[0.98] sm:text-6xl lg:text-7xl">{theme.headline}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">{theme.subheadline}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href={`/${idea.rep_slug}`} className="inline-flex min-h-12 items-center justify-center rounded-xl px-6 font-black text-white shadow-lg transition hover:-translate-y-0.5" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}>Start Your Quote <ArrowRight className="ml-2 h-5 w-5" /></a>
            <a href="#concept" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-6 font-bold text-white backdrop-blur hover:bg-white/15">See the concept</a>
          </div>
        </div></div>
      </section>

      <section id="concept" className="bg-white px-5 py-16 text-slate-950 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: theme.primary }}>Approved rep direction</p><h2 className="mt-3 text-3xl font-black sm:text-5xl">{title}</h2><p className="mt-4 text-base leading-7 text-slate-600">This first-look front end translates the approved idea into a responsive customer-facing page. It is ready for Ashley to inspect before anything is published.</p></div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {theme.services.map((service, index) => <article key={service.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-white" style={{ backgroundColor: theme.primary }}>{index + 1}</span><h3 className="mt-5 text-xl font-black">{service.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{service.description}</p></article>)}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:py-20" style={{ background: `linear-gradient(135deg, ${theme.secondary}, ${theme.primary})` }}>
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div><p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">Original submitted direction</p><blockquote className="mt-4 whitespace-pre-wrap text-xl font-bold leading-8 text-white sm:text-2xl">“{idea.idea_text}”</blockquote><p className="mt-5 text-sm text-white/75">Submitted by {repName} • {idea.brand_name}</p></div>
          <div className="rounded-3xl border border-white/20 bg-slate-950/25 p-7 backdrop-blur"><CheckCircle2 className="h-9 w-9 text-white" /><h2 className="mt-4 text-2xl font-black">First look is ready.</h2><p className="mt-3 text-sm leading-6 text-white/80">Review the message, hierarchy, mobile layout, and customer action. Return to approvals when you are ready to request changes or move it toward publishing.</p><Button className="mt-6 w-full bg-white text-slate-950 hover:bg-slate-100" asChild><Link to="/admin?tab=reps&approvals=1">Review in Admin <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
        </div>
      </section>
    </main>
  );
};

export default RepPageIdeaPreview;
