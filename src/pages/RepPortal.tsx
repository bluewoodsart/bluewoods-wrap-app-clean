import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { Download, ExternalLink, FileText, LogOut, MessageSquare, Phone, QrCode, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';

interface AdminUser {
  id: string;
  auth_user_id: string;
  email: string;
  display_name: string | null;
  role: 'owner_admin' | 'staff' | 'sales_rep' | 'rep_manager';
  rep_slug: string | null;
  is_active: boolean;
}

type QuoteSummary = Record<string, unknown>;

interface FileSummary {
  id?: string;
  name?: string;
  url?: string;
  type?: string;
  size?: number;
  tags?: string[];
}

interface StatusEvent {
  id?: string;
  event_type?: string;
  status?: string | null;
  message?: string | null;
  created_at?: string;
}

interface FollowUpTask {
  id?: string;
  task_text?: string;
  due_date?: string;
  status?: 'open' | 'completed' | string;
  created_by?: string;
  created_at?: string;
  completed_at?: string | null;
}

interface FollowUpSummary {
  next_follow_up_task?: FollowUpTask | null;
  open_follow_up_count?: number;
  overdue_follow_up_count?: number;
  due_today_follow_up_count?: number;
}

interface CustomerActionRequest {
  id?: string;
  request_type?: string;
  request_types?: string[] | string | null;
  message?: string;
  customer_email?: string;
  status?: string;
  created_by?: string;
  created_at?: string;
  sent_at?: string;
}

interface RepQuoteRow {
  id: string;
  quote_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  preferred_contact: string | null;
  status: string;
  product_type: string | null;
  rep_slug: string;
  assigned_rep_name: string | null;
  quote_summary: QuoteSummary | null;
  file_summary: FileSummary[] | string | null;
  status_events: StatusEvent[] | string | null;
  follow_up_summary: FollowUpSummary | string | null;
  follow_up_tasks: FollowUpTask[] | string | null;
  customer_action_requests: CustomerActionRequest[] | string | null;
  created_at: string;
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
};

const formatDueDate = (value: string | null | undefined) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(`${value}T00:00:00`));
};

const formatLabel = (value: string | null | undefined) =>
  value ? value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : '-';

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(formatValue).join(', ');
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const vehicleParts = [record.year, record.make, record.model].filter(Boolean);
    if (vehicleParts.length > 0) return vehicleParts.map(String).join(' ');
    return Object.entries(record)
      .filter(([, entryValue]) => entryValue !== null && entryValue !== undefined && entryValue !== '')
      .map(([key, entryValue]) => `${formatLabel(key)}: ${formatValue(entryValue)}`)
      .join(', ');
  }
  return String(value);
};

const parseJsonValue = <T,>(value: T | string | null | undefined, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const getJsonArray = <T,>(value: T[] | string | null | undefined): T[] => {
  const parsed = parseJsonValue<T[] | unknown>(value, []);
  return Array.isArray(parsed) ? parsed as T[] : [];
};

const getJsonObject = <T extends Record<string, unknown>>(value: T | string | null | undefined): T | null => {
  const parsed = parseJsonValue<T | unknown>(value, null);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as T : null;
};

const getSummaryValue = (quote: RepQuoteRow, keys: string | string[]) => {
  const summary = quote.quote_summary;
  if (!summary) return undefined;
  const keyList = Array.isArray(keys) ? keys : [keys];
  for (const key of keyList) {
    if (Object.prototype.hasOwnProperty.call(summary, key)) {
      return summary[key];
    }
  }
  return undefined;
};

const getFiles = (quote: RepQuoteRow) => getJsonArray<FileSummary>(quote.file_summary);
const getStatusEvents = (quote: RepQuoteRow) => getJsonArray<StatusEvent>(quote.status_events);
const getFollowUpTasks = (quote: RepQuoteRow) => getJsonArray<FollowUpTask>(quote.follow_up_tasks);
const getFollowUpSummary = (quote: RepQuoteRow) => getJsonObject<FollowUpSummary>(quote.follow_up_summary) || {};
const getCustomerActionRequests = (quote: RepQuoteRow) =>
  getJsonArray<CustomerActionRequest>(quote.customer_action_requests);

const getProjectTitle = (quote: RepQuoteRow) =>
  formatValue(getSummaryValue(quote, ['selectedService', 'quoteType', 'intakeType']));

const getProductType = (quote: RepQuoteRow) =>
  (quote.product_type || (getSummaryValue(quote, 'productType') as string | undefined) || 'wrap').toLowerCase();

const getProductLabel = (quote: RepQuoteRow) => {
  const productType = getProductType(quote);
  if (productType === 'sign' || productType === 'signage') return 'Generic Signage';
  return formatLabel(productType);
};

const getVehicleValue = (quote: RepQuoteRow) => {
  const vehicle = getSummaryValue(quote, 'vehicle');
  if (vehicle) return vehicle;

  const summaryVehicle = {
    year: getSummaryValue(quote, ['vehicleYear', 'vehicle_year']),
    make: getSummaryValue(quote, ['vehicleMake', 'vehicle_make']),
    model: getSummaryValue(quote, ['vehicleModel', 'vehicle_model'])
  };

  return Object.values(summaryVehicle).some(Boolean) ? summaryVehicle : undefined;
};

const getBannerValue = (quote: RepQuoteRow, key: string) => {
  const banner = getSummaryValue(quote, 'banner');
  if (!banner || typeof banner !== 'object' || Array.isArray(banner)) return undefined;
  return (banner as Record<string, unknown>)[key];
};

const getSignageValue = (quote: RepQuoteRow, key: string) => {
  const signage = getSummaryValue(quote, ['signage', 'sign']);
  if (!signage || typeof signage !== 'object' || Array.isArray(signage)) return undefined;
  return (signage as Record<string, unknown>)[key];
};

const getFollowUpBucket = (summary: FollowUpSummary) => {
  if ((summary.overdue_follow_up_count || 0) > 0) return 'overdue';
  if ((summary.due_today_follow_up_count || 0) > 0) return 'due_today';
  if ((summary.open_follow_up_count || 0) > 0) return 'upcoming';
  return 'none';
};

const getFollowUpBucketLabel = (summary: FollowUpSummary) => {
  const bucket = getFollowUpBucket(summary);
  if (bucket === 'overdue') return 'Overdue';
  if (bucket === 'due_today') return 'Due today';
  if (bucket === 'upcoming') return 'Open follow-up';
  return 'No open follow-up';
};

const getFollowUpClassName = (summary: FollowUpSummary) => {
  const bucket = getFollowUpBucket(summary);
  if (bucket === 'overdue') return 'bg-red-100 text-red-700 ring-1 ring-red-200';
  if (bucket === 'due_today') return 'bg-amber-100 text-amber-800 ring-1 ring-amber-200';
  if (bucket === 'upcoming') return 'bg-blue-100 text-blue-700 ring-1 ring-blue-200';
  return 'bg-slate-100 text-slate-600';
};

const getFollowUpSurfaceClassName = (summary: FollowUpSummary) => {
  const bucket = getFollowUpBucket(summary);
  if (bucket === 'overdue') return 'border-red-200 bg-red-50/75 hover:bg-red-50';
  if (bucket === 'due_today') return 'border-amber-200 bg-amber-50/75 hover:bg-amber-50';
  if (bucket === 'upcoming') return 'border-blue-100 bg-blue-50/45 hover:bg-blue-50';
  return 'border-slate-200 hover:bg-slate-50';
};

const getDashboardMetricClassName = (label: string) => {
  if (label === "Today's Follow-ups") return 'border-amber-200 bg-amber-50 text-amber-950';
  if (label === 'Waiting on Customer') return 'border-red-200 bg-red-50 text-red-950';
  if (label === 'New Leads') return 'border-blue-200 bg-blue-50 text-blue-950';
  if (label === 'Ready for Install') return 'border-emerald-200 bg-emerald-50 text-emerald-950';
  if (label === 'Completed') return 'border-slate-200 bg-slate-100 text-slate-800';
  if (label === 'Need Deposit') return 'border-violet-200 bg-violet-50 text-violet-950';
  return 'border-slate-200 bg-white text-slate-950';
};

const getGroupClassName = (title: string) => {
  if (title === 'New Leads') return 'border-blue-200 bg-blue-50/40';
  if (title === 'Waiting for Customer') return 'border-red-200 bg-red-50/45';
  if (title === 'Ready for Install') return 'border-emerald-200 bg-emerald-50/45';
  if (title === 'Completed') return 'border-slate-200 bg-slate-100/65';
  return 'border-slate-200 bg-white';
};

const getGroupBadgeClassName = (title: string) => {
  if (title === 'New Leads') return 'bg-blue-100 text-blue-800';
  if (title === 'Waiting for Customer') return 'bg-red-100 text-red-800';
  if (title === 'Ready for Install') return 'bg-emerald-100 text-emerald-800';
  if (title === 'Completed') return 'bg-slate-200 text-slate-700';
  return 'bg-slate-100 text-slate-700';
};

const getRequestTypes = (request: CustomerActionRequest) => {
  if (Array.isArray(request.request_types)) return request.request_types;
  if (typeof request.request_types === 'string') {
    try {
      const parsed = JSON.parse(request.request_types);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [request.request_types];
    }
  }
  return request.request_type ? [request.request_type] : [];
};

const getNormalizedStatus = (quote: RepQuoteRow) => quote.status?.toLowerCase() || '';

const isNewLead = (quote: RepQuoteRow) =>
  ['new', 'partial_lead'].includes(getNormalizedStatus(quote));

const isReadyForInstall = (quote: RepQuoteRow) =>
  ['approved', 'printing', 'install_scheduled'].includes(getNormalizedStatus(quote));

const isCompletedQuote = (quote: RepQuoteRow) => getNormalizedStatus(quote) === 'completed';

const needsDeposit = (quote: RepQuoteRow) => getNormalizedStatus(quote) === 'quote_sent';

const isOpenCustomerActionRequest = (request: CustomerActionRequest) =>
  !['completed', 'canceled', 'cancelled'].includes((request.status || '').toLowerCase());

const isWaitingOnCustomer = (quote: RepQuoteRow) =>
  getCustomerActionRequests(quote).some(isOpenCustomerActionRequest);

const getQuoteGroupMeta = (quote: RepQuoteRow) => {
  const followUpSummary = getFollowUpSummary(quote);
  const nextTask = followUpSummary.next_follow_up_task;
  const waitingRequest = getCustomerActionRequests(quote).find(isOpenCustomerActionRequest);

  if (waitingRequest) {
    const requestTypes = getRequestTypes(waitingRequest).map(formatLabel).join(', ');
    return requestTypes || waitingRequest.message || 'Waiting on customer';
  }

  if (nextTask?.task_text) return nextTask.task_text;
  return getFollowUpBucketLabel(followUpSummary);
};

const getPhoneHref = (phone: string | null | undefined, scheme: 'tel' | 'sms') => {
  const normalizedPhone = (phone || '').replace(/[^\d+]/g, '');
  return normalizedPhone ? `${scheme}:${normalizedPhone}` : undefined;
};

const JAZZY_REFERRAL_ONE_SHEET_PATH = '/jazzy/kevin-jazzy-referral-one-sheet.pdf';
const JARREL_PUBLIC_PAGE_URL = 'https://www.slapwrapz.com/jarrel';
const JARREL_QR_PNG_PATH = '/jarrel/jarrel-slapwrapz-qr.png';
const JARREL_QR_SVG_PATH = '/jarrel/jarrel-slapwrapz-qr.svg';

const isImageFile = (file: FileSummary) => {
  if (file.type?.toLowerCase().startsWith('image/')) return true;

  const imagePath = `${file.name || ''} ${file.url || ''}`.toLowerCase();
  return /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/.test(imagePath);
};

const DetailField = ({ label, value }: { label: string; value: unknown }) => (
  <div>
    <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
    <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{formatValue(value)}</dd>
  </div>
);

const EmptySection = ({ children }: { children: string }) => (
  <p className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-600">{children}</p>
);

const coverDirectionPrompt = `Use this box to describe how you want your public rep page to feel.

You can write it yourself, or paste a creative brief from ChatGPT, Claude, Gemini, or another AI tool.

Helpful details:
- colors, mood, culture, hobbies, music, cars, sports, business style, or visual references you like
- the kind of customers you want the page to attract
- headline or phrase ideas
- what you do not want the page to look or sound like
- any photos, logos, or examples BWB should consider

BWB will review your idea before anything changes live.`;

const coverDirectionFollowUpPrompt = `Would you like to add anything else?

You can send another note, another idea, a photo direction, a color direction, or a correction to the first message.`;

const RepPortal = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [quotes, setQuotes] = useState<RepQuoteRow[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<RepQuoteRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [coverDirection, setCoverDirection] = useState('');
  const [coverDirectionState, setCoverDirectionState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [coverDirectionMessage, setCoverDirectionMessage] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const loadPortal = async () => {
    setLoading(true);
    setError('');

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      setError(sessionError.message);
      setSession(null);
      setAdminUser(null);
      setLoading(false);
      return;
    }

    const activeSession = sessionData.session;
    setSession(activeSession);

    if (!activeSession) {
      setAdminUser(null);
      setQuotes([]);
      setLoading(false);
      return;
    }

    const { data: userData, error: userError } = await supabase.rpc('get_current_admin_user');

    if (userError) {
      setError(userError.message);
      setAdminUser(null);
      setQuotes([]);
      setLoading(false);
      return;
    }

    const activeAdminUser = (userData?.[0] as AdminUser | undefined) ?? null;
    setAdminUser(activeAdminUser);

    if (!activeAdminUser || !['sales_rep', 'rep_manager'].includes(activeAdminUser.role)) {
      setQuotes([]);
      setLoading(false);
      return;
    }

    setLoadingQuotes(true);
    const quoteRpc =
      activeAdminUser.role === 'rep_manager'
        ? 'get_rep_manager_quote_requests_v1'
        : 'get_rep_assigned_quote_requests_v2';
    const { data: quoteData, error: quoteError } = await supabase.rpc(quoteRpc);
    setLoadingQuotes(false);

    if (quoteError) {
      setError(quoteError.message);
      setQuotes([]);
      setLoading(false);
      return;
    }

    setQuotes((quoteData ?? []) as RepQuoteRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void loadPortal();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      void loadPortal();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
    navigate('/login?redirect=/rep', { replace: true });
  };

  const submitCoverDirection = async () => {
    if (!adminUser) return;

    setCoverDirectionState('sending');
    setCoverDirectionMessage('');

    try {
      const response = await fetch('/api/send-rep-cover-direction-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repSlug: adminUser.rep_slug,
          repName: adminUser.display_name || 'Jarrel',
          repEmail: adminUser.email,
          pageUrl: `https://www.slapwrapz.com/${adminUser.rep_slug || ''}`,
          direction: coverDirection
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof result.error === 'string' ? result.error : 'Cover page idea failed to send.');
      }

      setCoverDirectionState('sent');
      setCoverDirection('');
      setCoverDirectionMessage('Your page idea was sent to BWB for review. Would you like to add anything else?');
    } catch (coverError) {
      setCoverDirectionState('error');
      setCoverDirectionMessage(coverError instanceof Error ? coverError.message : 'Cover page idea failed to send.');
    }
  };

  const selectedFiles = useMemo(() => (selectedQuote ? getFiles(selectedQuote) : []), [selectedQuote]);
  const selectedEvents = useMemo(() => (selectedQuote ? getStatusEvents(selectedQuote) : []), [selectedQuote]);
  const selectedFollowUpSummary = useMemo(() => (selectedQuote ? getFollowUpSummary(selectedQuote) : {}), [selectedQuote]);
  const selectedFollowUpTasks = useMemo(() => (selectedQuote ? getFollowUpTasks(selectedQuote) : []), [selectedQuote]);
  const selectedCustomerActions = useMemo(
    () => (selectedQuote ? getCustomerActionRequests(selectedQuote) : []),
    [selectedQuote]
  );
  const dashboardCounts = useMemo(() => ({
    todayFollowUps: quotes.reduce(
      (total, quote) => total + (getFollowUpSummary(quote).due_today_follow_up_count || 0),
      0
    ),
    waitingOnCustomer: quotes.filter(isWaitingOnCustomer).length,
    newLeads: quotes.filter(isNewLead).length,
    readyForInstall: quotes.filter(isReadyForInstall).length,
    completed: quotes.filter(isCompletedQuote).length,
    needDeposit: quotes.filter(needsDeposit).length
  }), [quotes]);
  const groupedQuotes = useMemo(() => [
    {
      title: 'New Leads',
      description: 'Fresh assigned quote requests.',
      quotes: quotes.filter(isNewLead)
    },
    {
      title: 'Waiting for Customer',
      description: 'Open customer action requests on assigned quotes.',
      quotes: quotes.filter(isWaitingOnCustomer)
    },
    {
      title: 'Ready for Install',
      description: 'Approved, printing, or scheduled work.',
      quotes: quotes.filter(isReadyForInstall)
    },
    {
      title: 'Completed',
      description: 'Assigned work marked complete.',
      quotes: quotes.filter(isCompletedQuote)
    }
  ], [quotes]);
  const selectedCallHref = getPhoneHref(selectedQuote?.customer_phone, 'tel');
  const selectedTextHref = getPhoneHref(selectedQuote?.customer_phone, 'sms');
  const showJazzyPartnerPacket = adminUser?.rep_slug === 'jazzy';
  const showCoverDirectionPanel = adminUser?.role === 'rep_manager' && adminUser?.rep_slug === 'jarrel';
  const showJarrelQrPanel = adminUser?.rep_slug === 'jarrel';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5 text-slate-700">
        <div className="flex items-center gap-3 text-sm font-medium">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Checking rep access...
        </div>
      </div>
    );
  }

  if (!session) {
    const redirect = encodeURIComponent(location.pathname);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (adminUser && !['sales_rep', 'rep_manager'].includes(adminUser.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Rep account needed.</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              You are currently signed in as an admin account. Log out first, then sign in with the rep account for Jazzy, Jarrel, Trapstar, or PressPlay.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={handleLogout} disabled={signingOut}>
                <LogOut className="mr-2 h-4 w-4" />
                {signingOut ? 'Signing out...' : 'Log Out'}
              </Button>
              <Button variant="outline" asChild>
                <Link to="/admin">Admin Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!adminUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access not approved.</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              This account is not approved for the SlapWrapz rep portal.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" asChild>
                <Link to="/">Back to Home</Link>
              </Button>
              <Button onClick={handleLogout} disabled={signingOut}>
                <LogOut className="mr-2 h-4 w-4" />
                {signingOut ? 'Signing out...' : 'Log Out'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-3 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">SlapWrapz Rep Portal</p>
            <p className="text-sm text-slate-800">
              {adminUser.display_name || adminUser.email} - {adminUser.role === 'rep_manager' ? 'Manager team quotes' : 'Assigned quotes only'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} disabled={signingOut}>
            <LogOut className="mr-2 h-4 w-4" />
            {signingOut ? 'Signing out...' : 'Log Out'}
          </Button>
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
        <section>
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-950">{adminUser.display_name || 'Rep Portal'}</h1>
              <p className="text-sm text-slate-600">
                {adminUser.role === 'rep_manager' ? 'Manager view for' : 'Assigned work for'} rep slug {adminUser.rep_slug || '-'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadPortal()} disabled={loadingQuotes}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loadingQuotes ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {[
              { label: "Today's Follow-ups", value: dashboardCounts.todayFollowUps, detail: 'Due today' },
              { label: 'Waiting on Customer', value: dashboardCounts.waitingOnCustomer, detail: 'Open requests' },
              { label: 'New Leads', value: dashboardCounts.newLeads, detail: 'New or partial' },
              { label: 'Ready for Install', value: dashboardCounts.readyForInstall, detail: 'Approved or scheduled' },
              { label: 'Completed', value: dashboardCounts.completed, detail: 'Assigned complete' },
              { label: 'Need Deposit', value: dashboardCounts.needDeposit, detail: 'Quote sent stage' }
            ].map((metric) => (
              <div key={metric.label} className={`rounded-md border p-4 shadow-sm ${getDashboardMetricClassName(metric.label)}`}>
                <p className="text-xs font-semibold uppercase opacity-75">{metric.label}</p>
                <p className="mt-2 text-3xl font-bold">{metric.value}</p>
                <p className="mt-1 text-xs opacity-70">{metric.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {showJazzyPartnerPacket && (
          <Card className="border-amber-200 bg-amber-50/70">
            <CardHeader>
              <CardTitle className="text-lg text-amber-950">First sale payout packet</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="space-y-2 text-sm text-amber-950">
                <p>
                  Transit referral one-sheet for the first Jazzy / SlapWrapz booked wrap job.
                </p>
                <p className="font-medium">
                  Check request: $500 payable to Tori Smith after the final balance is collected and the job is past refund risk.
                </p>
                <p className="text-xs text-amber-800">
                  Discussion sheet only. Final payout terms can be adjusted by written agreement before future leads are worked.
                </p>
              </div>
              <Button asChild className="bg-amber-500 text-amber-950 hover:bg-amber-400">
                <a href={JAZZY_REFERRAL_ONE_SHEET_PATH} target="_blank" rel="noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Open PDF
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {showJarrelQrPanel && (
          <Card className="border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-slate-950">
                <QrCode className="h-5 w-5" />
                Jarrel QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
              <div className="space-y-3 text-sm leading-6 text-slate-600">
                <p>
                  This QR code sends customers to Jarrel's public quote page. Use the PNG for texting,
                  social posts, and quick sharing. Use the SVG when making cards or print layouts.
                </p>
                <p className="break-all rounded-md border border-slate-200 bg-slate-50 p-3 font-medium text-slate-900">
                  {JARREL_PUBLIC_PAGE_URL}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button asChild>
                    <a href={JARREL_QR_PNG_PATH} download="jarrel-slapwrapz-qr.png">
                      <Download className="mr-2 h-4 w-4" />
                      Download PNG
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={JARREL_QR_SVG_PATH} download="jarrel-slapwrapz-qr.svg">
                      <Download className="mr-2 h-4 w-4" />
                      Download SVG
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={JARREL_QR_PNG_PATH} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open Large
                    </a>
                  </Button>
                </div>
              </div>

              <a
                href={JARREL_QR_PNG_PATH}
                target="_blank"
                rel="noreferrer"
                className="mx-auto block w-full max-w-[22rem] rounded-md border border-slate-200 bg-white p-3 shadow-sm sm:max-w-[26rem] md:p-4"
                aria-label="Open Jarrel QR code at full size"
              >
                <img
                  src={JARREL_QR_PNG_PATH}
                  alt="QR code for Jarrel Wraps"
                  className="aspect-square w-full object-contain"
                />
              </a>
            </CardContent>
          </Card>
        )}

        {showCoverDirectionPanel && (
          <Card className="border-blue-200 bg-blue-50/60">
            <CardHeader>
              <CardTitle className="text-lg text-blue-950">Prompt Your Cover Page</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="space-y-3 text-sm leading-6 text-blue-950">
                <p>
                  Use this space to send BWB creative direction for your public page at www.slapwrapz.com/jarrel.
                </p>
                <p>
                  The idea can come from you directly, or you can paste a response from ChatGPT, Claude, Gemini,
                  or another AI tool. BWB reviews it first, then Codex can recommend the page update.
                </p>
                <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  Nothing changes live automatically. Ashley approves the direction before the front end is updated.
                </p>
                <Button onClick={submitCoverDirection} disabled={coverDirectionState === 'sending'}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {coverDirectionState === 'sending' ? 'Sending...' : 'Send Page Idea'}
                </Button>
                {coverDirectionMessage && (
                  <p className={coverDirectionState === 'error' ? 'text-sm font-medium text-red-700' : 'text-sm font-medium text-emerald-700'}>
                    {coverDirectionMessage}
                  </p>
                )}
              </div>
              <Textarea
                value={coverDirection}
                onChange={(event) => setCoverDirection(event.target.value)}
                placeholder={coverDirectionState === 'sent' ? coverDirectionFollowUpPrompt : coverDirectionPrompt}
                className="min-h-[280px] resize-y bg-white text-sm leading-6 text-slate-800"
                aria-label="Jarrel cover page direction"
              />
            </CardContent>
          </Card>
        )}

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Priority Work</h2>
            <p className="text-sm text-slate-600">
              Grouped from the assigned quotes already available to this {adminUser.role === 'rep_manager' ? 'manager team' : 'rep'}.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {groupedQuotes.map((group) => (
              <div key={group.title} className={`rounded-md border shadow-sm ${getGroupClassName(group.title)}`}>
                <div className="border-b border-current/10 bg-white/65 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">{group.title}</h3>
                      <p className="text-xs text-slate-500">{group.description}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getGroupBadgeClassName(group.title)}`}>
                      {group.quotes.length}
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {group.quotes.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-slate-500">No quotes in this group.</p>
                  ) : (
                    group.quotes.slice(0, 5).map((quote) => (
                      <button
                        key={`${group.title}-${quote.id}`}
                        type="button"
                        className={`block w-full border-l-4 px-4 py-3 text-left ${getFollowUpSurfaceClassName(getFollowUpSummary(quote))}`}
                        onClick={() => setSelectedQuote(quote)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-950">{quote.customer_name}</p>
                            <p className="truncate text-xs text-slate-500">{getProjectTitle(quote)} - {getProductLabel(quote)}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-600">{getQuoteGroupMeta(quote)}</p>
                          </div>
                          <span className={`flex-none rounded-full px-2 py-0.5 text-xs font-medium ${getFollowUpClassName(getFollowUpSummary(quote))}`}>
                            {formatLabel(quote.status)}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Assigned Quote Requests</CardTitle>
              <p className="mt-1 text-sm text-slate-600">
                Showing quotes currently assigned to your {adminUser.role === 'rep_manager' ? 'manager team' : 'rep account'}.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadPortal()} disabled={loadingQuotes}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loadingQuotes ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {quotes.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-600">
                No currently assigned quotes.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Next Action</TableHead>
                      <TableHead>Files</TableHead>
                      <TableHead>Received</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.map((quote) => {
                      const followUpSummary = getFollowUpSummary(quote);
                      const nextTask = followUpSummary.next_follow_up_task;

                      return (
                        <TableRow
                          key={quote.id}
                          className={`cursor-pointer ${getFollowUpSurfaceClassName(followUpSummary)}`}
                          onClick={() => setSelectedQuote(quote)}
                        >
                          <TableCell>
                            <div className="min-w-[13rem] space-y-1">
                              <p className="font-medium text-slate-900">{quote.customer_name}</p>
                              <p className="text-xs text-slate-500">{quote.customer_email}</p>
                              <p className="text-xs text-slate-500">{quote.customer_phone || '-'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="min-w-[14rem] space-y-1">
                              <p className="text-sm text-slate-900">{getProjectTitle(quote)}</p>
                              <p className="text-xs text-slate-500">{getProductLabel(quote)}</p>
                              <p className="break-all text-xs text-slate-500">{quote.quote_id || quote.id}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                              {formatLabel(quote.status)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs space-y-1">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getFollowUpClassName(followUpSummary)}`}>
                                {getFollowUpBucketLabel(followUpSummary)}
                              </span>
                              {nextTask?.task_text && (
                                <>
                                  <p className="line-clamp-2 text-sm text-slate-900">{nextTask.task_text}</p>
                                  <p className="text-xs text-slate-500">Due {formatDueDate(nextTask.due_date)}</p>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 text-sm text-slate-700">
                              <FileText className="h-4 w-4" />
                              {getFiles(quote).length}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">{formatDate(quote.created_at)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={Boolean(selectedQuote)} onOpenChange={(open) => !open && setSelectedQuote(null)}>
        {selectedQuote && (
          <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedQuote.quote_id || selectedQuote.customer_name}</DialogTitle>
              <DialogDescription>Read-only assigned quote details</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-950">Customer</h3>
                <dl className="grid gap-4 md:grid-cols-4">
                  <DetailField label="Name" value={selectedQuote.customer_name} />
                  <DetailField label="Email" value={selectedQuote.customer_email} />
                  <DetailField label="Phone" value={selectedQuote.customer_phone} />
                  <DetailField label="Preferred Contact" value={formatLabel(selectedQuote.preferred_contact)} />
                  <DetailField label="Status" value={formatLabel(selectedQuote.status)} />
                  <DetailField label="Product" value={getProductLabel(selectedQuote)} />
                  <DetailField label="Received" value={formatDate(selectedQuote.created_at)} />
                  <DetailField label="Quote ID" value={selectedQuote.quote_id || selectedQuote.id} />
                </dl>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  {selectedCallHref ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={selectedCallHref}>
                        <Phone className="mr-2 h-4 w-4" />
                        Call Customer
                      </a>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled>
                      <Phone className="mr-2 h-4 w-4" />
                      Call Customer
                    </Button>
                  )}
                  {selectedTextHref ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={selectedTextHref}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Text Customer
                      </a>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Text Customer
                    </Button>
                  )}
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-950">Project</h3>
                <dl className="grid gap-4 md:grid-cols-3">
                  <DetailField label="Service" value={getSummaryValue(selectedQuote, ['selectedService', 'quoteType', 'intakeType'])} />
                  <DetailField label="Company" value={getSummaryValue(selectedQuote, 'companyName')} />
                  <DetailField label="Vehicle Type" value={getSummaryValue(selectedQuote, 'vehicleType')} />
                  <DetailField label="Vehicle" value={getVehicleValue(selectedQuote)} />
                  <DetailField
                    label="Manual Vehicle"
                    value={getSummaryValue(selectedQuote, [
                      'manualVehicleDescription',
                      'customVehicleDescription',
                      'otherVehicleDescription'
                    ])}
                  />
                  <DetailField label="Wrap Type" value={getSummaryValue(selectedQuote, 'wrapType')} />
                  <DetailField label="Coverage Areas" value={getSummaryValue(selectedQuote, 'coverageAreas')} />
                  <DetailField label="Use Type" value={getSummaryValue(selectedQuote, 'useType')} />
                  <DetailField label="Finish Preference" value={getSummaryValue(selectedQuote, 'finishPreference')} />
                  <DetailField label="Design Needs" value={getSummaryValue(selectedQuote, ['designNeeds', 'hasArtwork', 'artworkStatus'])} />
                  <DetailField label="Budget" value={getSummaryValue(selectedQuote, 'budget')} />
                  <DetailField label="Timeline" value={getSummaryValue(selectedQuote, 'timeline')} />
                </dl>
                <div className="mt-4">
                  <DetailField label="Project Notes" value={getSummaryValue(selectedQuote, ['goal', 'notes', 'projectNotes'])} />
                </div>
              </section>

              {getSummaryValue(selectedQuote, 'banner') && (
                <section>
                  <h3 className="mb-3 text-sm font-semibold text-slate-950">Banner Details</h3>
                  <dl className="grid gap-4 md:grid-cols-4">
                    <DetailField label="Width" value={getBannerValue(selectedQuote, 'width')} />
                    <DetailField label="Height" value={getBannerValue(selectedQuote, 'height')} />
                    <DetailField label="Unit" value={getBannerValue(selectedQuote, 'unit')} />
                    <DetailField label="Quantity" value={getBannerValue(selectedQuote, 'quantity')} />
                    <DetailField label="Indoor / Outdoor" value={getBannerValue(selectedQuote, 'indoorOutdoor')} />
                    <DetailField label="Sides" value={getBannerValue(selectedQuote, 'sides')} />
                    <DetailField label="Grommets" value={getBannerValue(selectedQuote, 'grommets')} />
                    <DetailField label="Hemmed Edges" value={getBannerValue(selectedQuote, 'hemmedEdges')} />
                    <DetailField label="Pole Pockets" value={getBannerValue(selectedQuote, 'polePockets')} />
                    <DetailField label="Material Preference" value={getBannerValue(selectedQuote, 'materialPreference')} />
                    <DetailField label="Design Needed" value={getBannerValue(selectedQuote, 'designNeeded')} />
                    <DetailField label="Deadline" value={getBannerValue(selectedQuote, 'deadline')} />
                    <DetailField label="Delivery Method" value={getBannerValue(selectedQuote, 'deliveryMethod')} />
                    <DetailField label="Banner Text" value={getBannerValue(selectedQuote, 'bannerText')} />
                    <DetailField label="Brand Colors" value={getBannerValue(selectedQuote, 'brandColors')} />
                    <DetailField label="Notes" value={getBannerValue(selectedQuote, 'notes')} />
                  </dl>
                </section>
              )}

              {getSummaryValue(selectedQuote, ['signage', 'sign']) && (
                <section>
                  <h3 className="mb-3 text-sm font-semibold text-slate-950">Signage Details</h3>
                  <dl className="grid gap-4 md:grid-cols-4">
                    <DetailField label="Material" value={getSignageValue(selectedQuote, 'material')} />
                    <DetailField label="Width" value={getSignageValue(selectedQuote, 'width')} />
                    <DetailField label="Height" value={getSignageValue(selectedQuote, 'height')} />
                    <DetailField label="Unit" value={getSignageValue(selectedQuote, 'unit')} />
                    <DetailField label="Quantity" value={getSignageValue(selectedQuote, 'quantity')} />
                    <DetailField label="Sign Text" value={getSignageValue(selectedQuote, 'signText')} />
                    <DetailField label="Notes" value={getSignageValue(selectedQuote, 'notes')} />
                  </dl>
                </section>
              )}

              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-950">Next Action</h3>
                {selectedFollowUpSummary.next_follow_up_task?.task_text ? (
                  <div className="rounded-md border border-slate-200 bg-white p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getFollowUpClassName(selectedFollowUpSummary)}`}>
                        {getFollowUpBucketLabel(selectedFollowUpSummary)}
                      </span>
                      <span className="text-xs text-slate-500">
                        Due {formatDueDate(selectedFollowUpSummary.next_follow_up_task.due_date)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-slate-900">
                      {selectedFollowUpSummary.next_follow_up_task.task_text}
                    </p>
                  </div>
                ) : (
                  <EmptySection>No open next action is currently set.</EmptySection>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-950">Follow-Up Tasks</h3>
                {selectedFollowUpTasks.length === 0 ? (
                  <EmptySection>No follow-up tasks yet.</EmptySection>
                ) : (
                  <div className="space-y-3">
                    {selectedFollowUpTasks.map((task, index) => (
                      <div key={task.id || index} className="rounded-md border border-slate-200 bg-white p-3">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {formatLabel(task.status)}
                          </span>
                          <span className="text-xs text-slate-500">Due {formatDueDate(task.due_date)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-slate-900">{task.task_text || '-'}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          Created by {task.created_by || 'Staff'} on {formatDate(task.created_at)}
                          {task.completed_at ? ` - Completed ${formatDate(task.completed_at)}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-950">Customer Action Requests</h3>
                {selectedCustomerActions.length === 0 ? (
                  <EmptySection>No customer action requests sent yet.</EmptySection>
                ) : (
                  <div className="space-y-3">
                    {selectedCustomerActions.map((request, index) => (
                      <div key={request.id || index} className="rounded-md border border-slate-200 bg-white p-3">
                        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex flex-wrap gap-2">
                            {getRequestTypes(request).map((requestType) => (
                              <span key={requestType} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                {formatLabel(requestType)}
                              </span>
                            ))}
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                              {formatLabel(request.status)}
                            </span>
                          </div>
                          <time className="text-xs text-slate-500">{formatDate(request.sent_at || request.created_at)}</time>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-slate-900">{request.message || '-'}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          Sent to {request.customer_email || selectedQuote.customer_email} by {request.created_by || 'Staff'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-950">Activity Timeline</h3>
                {selectedEvents.length === 0 ? (
                  <EmptySection>No activity events yet.</EmptySection>
                ) : (
                  <div className="space-y-3">
                    {selectedEvents.map((event, index) => (
                      <div key={event.id || index} className="rounded-md border border-slate-200 bg-white p-3">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {event.message || formatLabel(event.event_type)}
                            </p>
                            {event.status && (
                              <p className="text-xs text-slate-500">Status: {formatLabel(event.status)}</p>
                            )}
                          </div>
                          <time className="text-xs text-slate-500">{formatDate(event.created_at)}</time>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-950">Files</h3>
                {selectedFiles.length === 0 ? (
                  <EmptySection>No uploaded files on this quote.</EmptySection>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {selectedFiles.map((file, index) => (
                      <a
                        key={file.id || file.url || index}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-800 hover:bg-slate-50"
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-3">
                          {file.url && isImageFile(file) ? (
                            <img
                              src={file.url}
                              alt=""
                              loading="lazy"
                              className="h-16 w-16 flex-none rounded-md border border-slate-200 bg-slate-100 object-cover"
                            />
                          ) : (
                            <FileText className="h-5 w-5 flex-none text-slate-500" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{file.name || file.url || `File ${index + 1}`}</span>
                            {file.tags && file.tags.length > 0 && (
                              <span className="mt-1 block truncate text-xs text-slate-500">{file.tags.join(', ')}</span>
                            )}
                          </span>
                        </span>
                        <ExternalLink className="h-4 w-4 flex-none text-slate-500" />
                      </a>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default RepPortal;
