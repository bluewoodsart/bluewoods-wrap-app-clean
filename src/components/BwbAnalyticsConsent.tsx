import { useEffect, useState } from 'react';
import { analyticsChoice, setBwbAnalyticsConsent, startBwbTracking } from '@/lib/bwbVisitorTracking';

export default function BwbAnalyticsConsent() {
  const [choice,setChoice] = useState<'granted'|'denied'|null>(()=>analyticsChoice());
  useEffect(()=> { if (choice === 'granted') startBwbTracking(); },[choice]);
  if (choice !== null) return null;
  return (
    <aside role="dialog" aria-label="Optional website analytics" className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-xl rounded-lg border bg-white p-4 text-slate-900 shadow-xl">
      <p className="text-sm">SlapWrapz would like to measure anonymous page visits and quote interest to improve our website. Optional analytics do not collect form contents, names or phone numbers.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className="rounded bg-slate-900 px-4 py-2 text-sm text-white" onClick={()=>{setBwbAnalyticsConsent(true);setChoice('granted');}}>Allow analytics</button>
        <button type="button" className="rounded border px-4 py-2 text-sm" onClick={()=>{setBwbAnalyticsConsent(false);setChoice('denied');}}>No thanks</button>
      </div>
    </aside>
  );
}
