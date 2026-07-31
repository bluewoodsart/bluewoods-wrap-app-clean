import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronRight, Gamepad2, Pause, Play, ShieldCheck, Smartphone, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ZoeMissionOneProps {
  viewerName: string;
  ownerPreview: boolean;
}

const missionSteps = [
  'Tap Start a Quote and confirm the customer quote module opens.',
  'Close the quote module and confirm you return to this rep portal.',
  'Open one colored quote group and confirm its jobs appear below it.',
  'Use the phone browser Back and Forward buttons once without losing the portal.',
  'Send Ashley a screenshot or short recording with Pass or Needs Fix.'
];

const STEPS_KEY = 'bwb_zoe_mission_one_steps_v2';

const readSavedSteps = () => {
  try {
    const value = JSON.parse(window.localStorage.getItem(STEPS_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item) => Number.isInteger(item)) : [];
  } catch {
    return [];
  }
};

const ZoeMissionOne = ({ viewerName, ownerPreview }: ZoeMissionOneProps) => {
  const [focusMotion, setFocusMotion] = useState(true);
  const [completed, setCompleted] = useState<number[]>(readSavedSteps);
  const [instruction, setInstruction] = useState('Tap Step 1 when you are ready. I will show you the real button.');
  const progress = Math.round((completed.length / missionSteps.length) * 100);
  const missionStatus = useMemo(() => progress === 100 ? 'Mission cleared' : progress > 0 ? 'Mission in progress' : 'Ready to launch', [progress]);

  const guideStep = (index: number) => {
    if (completed.includes(index)) return;
    const nextStep = missionSteps.findIndex((_, stepIndex) => !completed.includes(stepIndex));
    if (index !== nextStep) {
      setInstruction(`Finish Step ${nextStep + 1} first. Mission credit unlocks in order.`);
      return;
    }
    if (index === 0) {
      setInstruction('Find the glowing arrow, then tap Start a Quote Here.');
      window.dispatchEvent(new Event('bwb-zoe-guide-quote'));
      return;
    }
    if (index === 2) {
      setInstruction('Follow the yellow arrow to a colored quote group, then open it to reveal its jobs.');
      window.dispatchEvent(new Event('bwb-zoe-guide-quote-group'));
      return;
    }
    if (index === 3) {
      setInstruction('Use your phone browser controls: press Back once, then Forward once. Stay on this portal.');
      window.dispatchEvent(new Event('bwb-zoe-start-history-check'));
      return;
    }
    if (index === 4) {
      setInstruction('Follow the yellow guide to send Ashley your Pass or Needs Fix report with a screenshot or recording.');
      window.dispatchEvent(new Event('bwb-zoe-guide-report'));
      return;
    }
    setInstruction(`Step ${index + 1} is waiting for the real portal action. Tapping this card does not award credit.`);
  };

  useEffect(() => {
    const completeVerifiedStep = (event: Event) => {
      const step = (event as CustomEvent<{ step?: number }>).detail?.step;
      if (!Number.isInteger(step)) return;
      setCompleted((current) => {
        if (current.includes(step as number)) return current;
        const nextStep = missionSteps.findIndex((_, index) => !current.includes(index));
        if (step !== nextStep) return current;
        setInstruction(step === 0 ? 'Nice! Now close the quote window to prove you can return safely.' : `Step ${(step as number) + 1} verified by the portal. Quick reward unlocked!`);
        return [...current, step as number];
      });
    };
    window.addEventListener('bwb-zoe-mission-step-completed', completeVerifiedStep);
    return () => window.removeEventListener('bwb-zoe-mission-step-completed', completeVerifiedStep);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STEPS_KEY, JSON.stringify(completed));
    window.dispatchEvent(new Event('bwb-zoe-rewards-updated'));
  }, [completed]);

  return (
    <Card id="zoe-mission-one" className="scroll-mt-4 overflow-hidden border-cyan-300 bg-[#05091d] text-white shadow-xl shadow-indigo-950/20">
      <div className="relative isolate overflow-hidden border-b border-cyan-300/30 px-4 py-5 sm:px-6">
        <div className={`zoe-focus-spiral absolute -right-20 -top-36 h-96 w-96 rounded-full opacity-55 ${focusMotion ? '' : 'zoe-focus-spiral-paused'}`} aria-hidden="true" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#060b2d] via-indigo-950/95 to-fuchsia-950/80" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-300 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-950"><Gamepad2 className="h-4 w-4" /> Zoe Launch Lab</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-cyan-100">Mission 01</span>
              {ownerPreview && <span className="rounded-full border border-amber-300/50 bg-amber-300/15 px-3 py-1 text-xs font-bold text-amber-200">Owner preview · Zoe login pending</span>}
            </div>
            <h2 className="mt-3 text-2xl font-black sm:text-3xl">Back Button Boss Battle</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">Learn one valuable skill at a time: reproduce a navigation problem, capture what happened, and verify the repair on a real phone.</p>
          </div>
          <Button type="button" variant="secondary" className="min-h-11 touch-manipulation bg-white/95 font-bold text-slate-950" onClick={() => setFocusMotion((current) => !current)} aria-pressed={!focusMotion}>
            {focusMotion ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}{focusMotion ? 'Pause Focus Motion' : 'Play Focus Motion'}
          </Button>
        </div>
      </div>
      <CardContent className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-2">
          <p className="mb-3 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-bold text-cyan-100" aria-live="polite">{instruction}</p>
          {missionSteps.map((step, index) => {
            const checked = completed.includes(index);
            return <button key={step} type="button" onClick={() => guideStep(index)} className={`flex min-h-14 w-full touch-manipulation items-start gap-3 rounded-xl border p-3 text-left transition ${checked ? 'border-emerald-300/50 bg-emerald-300/10' : 'border-indigo-300/20 bg-white/5 hover:border-cyan-300/50 hover:bg-white/10'}`} aria-label={`${checked ? 'Verified' : 'Guide me through'} step ${index + 1}: ${step}`}>
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${checked ? 'bg-emerald-300 text-emerald-950' : 'bg-indigo-500 text-white'}`}>{checked ? <CheckCircle2 className="h-4 w-4" /> : index + 1}</span>
              <span className={`text-sm leading-6 ${checked ? 'text-emerald-100 line-through decoration-emerald-300/60' : 'text-white'}`}>{step}</span>
            </button>;
          })}
        </div>
        <div className="flex flex-col rounded-2xl border border-fuchsia-300/30 bg-gradient-to-br from-indigo-900/70 to-fuchsia-900/60 p-4">
          <div className="flex items-center justify-between gap-3"><Trophy className="h-9 w-9 text-amber-300" /><span className="text-xs font-black uppercase tracking-wider text-fuchsia-200">100 XP</span></div>
          <div className="mt-3 flex items-center gap-2" aria-label={`${completed.length} of ${missionSteps.length} trophies earned`}>
            {missionSteps.map((_, index) => (
              <span key={`mission-trophy-${index}`} className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-500 ${completed.includes(index) ? 'scale-110 border-amber-200 bg-amber-300 text-amber-950 shadow-[0_0_18px_rgba(253,224,71,.65)]' : 'border-white/15 bg-black/20 text-white/25'}`}>
                <Trophy className="h-5 w-5" />
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs font-black uppercase tracking-wider text-cyan-200">{missionStatus}</p>
          <p className="mt-1 text-3xl font-black">{progress}%</p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-950/60"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 transition-all" style={{ width: `${progress}%` }} /></div>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-indigo-100"><ShieldCheck className="mb-2 h-5 w-5 text-cyan-300" />Training access only. Production changes still require Ashley&apos;s approval.</div>
          <Button type="button" className="mt-4 min-h-12 touch-manipulation bg-cyan-300 font-black text-slate-950 hover:bg-cyan-200" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <Smartphone className="mr-2 h-5 w-5" /> Open Test Area <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
          <p className="mt-3 text-center text-xs text-indigo-200">Signed in as {viewerName}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ZoeMissionOne;
