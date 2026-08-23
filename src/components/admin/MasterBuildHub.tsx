import { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Globe2,
  HeartHandshake,
  LayoutDashboard,
  PackageCheck,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COMPASSION_PROOF_PATH = '/compassion-bluefund/';
const COMPASSION_PROOF_URL = 'https://bluewoods-wrap-app-clean.vercel.app/compassion-bluefund/';

const MasterBuildHub = () => {
  const [copied, setCopied] = useState(false);

  const copyProofLink = async () => {
    try {
      await navigator.clipboard.writeText(COMPASSION_PROOF_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch (error) {
      console.error('Unable to copy proof link:', error);
      window.prompt('Copy this client proof link:', COMPASSION_PROOF_URL);
    }
  };

  const openProof = () => {
    window.open(COMPASSION_PROOF_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="grid gap-6 px-5 py-7 md:grid-cols-[1.25fr_0.75fr] md:px-8 md:py-9">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
              <LayoutDashboard className="h-4 w-4" />
              Blue Woods Brands Master Build
            </div>
            <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
              Client builds, live proofs, and reusable BWB products in one place.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
              This is the internal control view for work that is being developed, reviewed with a client, and prepared for production.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 self-end">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-black">1</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Client build listed</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-black">1</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Reusable product</p>
            </div>
          </div>
        </div>
      </section>

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-200 bg-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-700">
                Clients / Compassion Ministries / Front End / Live Proofs
              </p>
              <CardTitle className="mt-2 text-2xl text-slate-950">Compassion Ministries + BlueFund</CardTitle>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Full public-facing Compassion Ministries front end with the BlueFund money, food, supply, and partnership giving experience built directly into the page.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => void copyProofLink()}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? 'Link Copied' : 'Copy Client Link'}
              </Button>
              <Button onClick={openProof} className="bg-emerald-700 text-white hover:bg-emerald-800">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Live Proof
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-emerald-800">
                <Globe2 className="h-4 w-4" />
                <p className="text-xs font-black uppercase tracking-wide">Front End</p>
              </div>
              <p className="mt-2 text-sm font-bold text-emerald-950">Public proof is live</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <HeartHandshake className="h-4 w-4" />
                <p className="text-xs font-black uppercase tracking-wide">BlueFund</p>
              </div>
              <p className="mt-2 text-sm font-bold text-blue-950">Money + item offers</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-amber-800">
                <ShieldCheck className="h-4 w-4" />
                <p className="text-xs font-black uppercase tracking-wide">Connection</p>
              </div>
              <p className="mt-2 text-sm font-bold text-amber-950">Payments not connected</p>
            </div>
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
              <div className="flex items-center gap-2 text-violet-800">
                <PackageCheck className="h-4 w-4" />
                <p className="text-xs font-black uppercase tracking-wide">Review</p>
              </div>
              <p className="mt-2 text-sm font-bold text-violet-950">Ready for client feedback</p>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-black text-slate-950">Embedded live preview</p>
                  <p className="text-xs text-slate-500">The client sees the same public page shown below.</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-800">
                  Live
                </span>
              </div>
              <iframe
                title="Compassion Ministries BlueFund live proof"
                src={COMPASSION_PROOF_PATH}
                className="h-[720px] w-full bg-white"
                loading="lazy"
              />
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Included in this build</p>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  {[
                    'Compassion Ministries public front end',
                    'Grand-opening information and countdown',
                    'Give Money and Give Monthly choices',
                    'Donate Food & Supplies offer form',
                    'Pet food, hygiene, and pantry categories',
                    'Business and community partnership path',
                    'Mobile-responsive client proof'
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-800">Before production</p>
                <p className="mt-3 text-sm leading-6 text-amber-950">
                  Confirm accepted item categories, approve the campaign language, connect the secure payment checkout, and connect food-offer submissions to the Compassion Ministries backend.
                </p>
              </div>
            </aside>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MasterBuildHub;
