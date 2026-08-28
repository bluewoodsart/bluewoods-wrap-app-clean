import { ExternalLink, Eye, ShieldCheck } from 'lucide-react';
import CompassionMinistriesWorkspace from '@/components/admin/CompassionMinistriesWorkspace';
import { Button } from '@/components/ui/button';

const CompassionBackendProof = () => {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-800">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-amber-950">Public First-Generation Backend Proof</p>
              <p className="mt-0.5 text-xs leading-5 text-amber-900">
                No login is required. This preview does not expose the protected Blue Woods Admin database or publish changes to the live website.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="border-amber-300 bg-white text-amber-950 hover:bg-amber-100">
            <a href="/compassion-bluefund/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Front End
            </a>
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 md:px-8">
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <p className="text-sm leading-6">
            Buttons, task checks, and the story-video field are demonstration controls. Any drafts entered here remain only in the visitor’s browser.
          </p>
        </div>
        <CompassionMinistriesWorkspace publicProof />
      </div>
    </div>
  );
};

export default CompassionBackendProof;
