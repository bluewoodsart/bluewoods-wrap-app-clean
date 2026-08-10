import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Mail, MessageSquare, Phone, RefreshCw, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface UrgentLeadRow {
  tracking_id: string;
  quote_request_id: string;
  quote_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  preferred_contact: string | null;
  status: string;
  product_type: string | null;
  source: string | null;
  quote_summary: Record<string, unknown> | null;
  lead_created_at: string;
  assigned_at: string;
  response_deadline_at: string;
  acknowledged_at: string | null;
  contacted_at: string | null;
  contact_method: string | null;
  assigned_rep_slug: string;
  assigned_rep_name: string | null;
  queue_state: 'assigned' | 'acknowledged' | 'available';
  is_mine: boolean;
}

interface UrgentLeadResponseCenterProps {
  leads: UrgentLeadRow[];
  loading: boolean;
  actionLeadId: string | null;
  message: string;
  error: string;
  onRefresh: () => void;
  onAcknowledge: (lead: UrgentLeadRow) => void;
  onContact: (lead: UrgentLeadRow, method: 'call' | 'text' | 'email') => void;
  onClaim: (lead: UrgentLeadRow) => void;
  onOpenLead: (lead: UrgentLeadRow) => void;
}

const formatExactTime = (value: string) => new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  timeZoneName: 'short'
}).format(new Date(value));

const textValue = (value: unknown) => typeof value === 'string' ? value.trim() : '';

const getLeadNature = (lead: UrgentLeadRow) => {
  const summary = lead.quote_summary || {};
  const service = textValue(summary.selectedService) || textValue(summary.quoteType) || textValue(summary.intakeType);
  const vehicle = textValue(summary.manualVehicleDescription) || textValue(summary.vehicleType);
  return [service || lead.product_type || 'Quote request', vehicle].filter(Boolean).join(' · ');
};

const formatSource = (source: string | null) => {
  if (!source) return 'SlapWrapz website';
  return source.replace(/^https?:\/\//, '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatCountdown = (milliseconds: number) => {
  if (milliseconds <= 0) return '00:00';
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const UrgentLeadResponseCenter = ({
  leads,
  loading,
  actionLeadId,
  message,
  error,
  onRefresh,
  onAcknowledge,
  onContact,
  onClaim,
  onOpenLead
}: UrgentLeadResponseCenterProps) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const orderedLeads = useMemo(() => [...leads].sort((a, b) => {
    const aPriority = a.is_mine && new Date(a.response_deadline_at).getTime() > now ? 0 : 1;
    const bPriority = b.is_mine && new Date(b.response_deadline_at).getTime() > now ? 0 : 1;
    return aPriority - bPriority || new Date(a.response_deadline_at).getTime() - new Date(b.response_deadline_at).getTime();
  }), [leads, now]);

  if (!loading && orderedLeads.length === 0) return null;

  return (
    <section id="urgent-lead-response-center" className="scroll-mt-24 overflow-hidden rounded-xl border-2 border-red-500 bg-white shadow-xl" aria-live="polite">
      <div className="flex flex-col gap-3 bg-gradient-to-r from-red-700 via-red-600 to-orange-500 px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-red-700 shadow-md">
            <AlertTriangle className="h-7 w-7" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-100">Immediate response required</p>
            <h2 className="text-xl font-black sm:text-2xl">New Lead Response Center</h2>
            <p className="mt-1 text-sm font-medium text-red-50">Acknowledge the lead and contact the customer before the five-minute timer ends.</p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={onRefresh} disabled={loading} className="min-h-11 touch-manipulation border-white/70 bg-white text-red-700 hover:bg-red-50">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Leads
        </Button>
      </div>

      <div className="space-y-4 p-3 sm:p-4">
        {loading && orderedLeads.length === 0 && (
          <p className="rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-800">Checking for urgent leads...</p>
        )}
        {orderedLeads.map((lead) => {
          const remaining = new Date(lead.response_deadline_at).getTime() - now;
          const available = remaining <= 0;
          const canContact = lead.is_mine;
          const busy = actionLeadId === lead.quote_request_id;
          return (
            <article key={lead.tracking_id} className={`rounded-xl border-2 p-4 ${available ? 'border-amber-400 bg-amber-50' : 'border-red-300 bg-red-50'}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${available ? 'bg-amber-500 text-slate-950' : 'bg-red-700 text-white'}`}>
                      {available ? 'Open to claim' : lead.acknowledged_at ? 'Received · contact now' : 'New assignment'}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                      {lead.quote_id || 'New lead'}
                    </span>
                  </div>
                  <h3 className="mt-3 break-words text-2xl font-black text-slate-950">{lead.customer_name}</h3>
                  <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    <p><span className="block text-xs font-black uppercase text-slate-500">Nature of lead</span>{getLeadNature(lead)}</p>
                    <p><span className="block text-xs font-black uppercase text-slate-500">Lead source</span>{formatSource(lead.source)}</p>
                    <p><span className="block text-xs font-black uppercase text-slate-500">Exact time received</span>{formatExactTime(lead.lead_created_at)}</p>
                    <p><span className="block text-xs font-black uppercase text-slate-500">Preferred contact</span>{lead.preferred_contact || 'Not specified'}</p>
                  </div>
                </div>

                <div className={`flex min-w-[10rem] flex-col items-center rounded-xl border-2 px-5 py-4 text-center ${available ? 'border-amber-400 bg-white text-amber-800' : 'border-red-500 bg-white text-red-700'}`}>
                  <Clock3 className="h-6 w-6" />
                  <span className="mt-1 font-mono text-4xl font-black tabular-nums">{formatCountdown(remaining)}</span>
                  <span className="mt-1 text-xs font-black uppercase tracking-wide">{available ? 'Released to team' : 'Time to contact'}</span>
                </div>
              </div>

              {!available && lead.is_mine && !lead.acknowledged_at && (
                <Button type="button" onClick={() => onAcknowledge(lead)} disabled={busy} className="mt-4 min-h-12 w-full touch-manipulation bg-red-700 text-base font-black hover:bg-red-800">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  {busy ? 'Saving...' : 'I Received This Lead'}
                </Button>
              )}

              {available && !lead.is_mine ? (
                <Button type="button" onClick={() => onClaim(lead)} disabled={busy} className="mt-4 min-h-12 w-full touch-manipulation bg-amber-500 text-base font-black text-slate-950 hover:bg-amber-400">
                  <UserPlus className="mr-2 h-5 w-5" />
                  {busy ? 'Claiming...' : 'Claim This Lead Now'}
                </Button>
              ) : canContact ? (
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
                  <Button type="button" onClick={() => onContact(lead, 'call')} disabled={busy || !lead.customer_phone} className="min-h-12 touch-manipulation bg-emerald-600 font-black hover:bg-emerald-700">
                    <Phone className="mr-2 h-5 w-5" /> Call
                  </Button>
                  <Button type="button" onClick={() => onContact(lead, 'text')} disabled={busy || !lead.customer_phone} className="min-h-12 touch-manipulation bg-blue-600 font-black hover:bg-blue-700">
                    <MessageSquare className="mr-2 h-5 w-5" /> Text
                  </Button>
                  <Button type="button" onClick={() => onContact(lead, 'email')} disabled={busy || !lead.customer_email} className="min-h-12 touch-manipulation bg-violet-600 font-black hover:bg-violet-700">
                    <Mail className="mr-2 h-5 w-5" /> Email
                  </Button>
                  <Button type="button" variant="outline" onClick={() => onOpenLead(lead)} disabled={busy} className="min-h-12 touch-manipulation border-slate-300 bg-white font-black">
                    Open Lead
                  </Button>
                </div>
              ) : null}
            </article>
          );
        })}

        {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</p>}
        {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p>}
      </div>
    </section>
  );
};

export default UrgentLeadResponseCenter;
