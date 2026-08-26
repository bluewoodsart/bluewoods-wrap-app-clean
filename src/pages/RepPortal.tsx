import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { ArrowDownRight, ArrowLeft, Bug, Calculator, CalendarDays, ChevronDown, ChevronRight, Coins, Download, ExternalLink, FileText, ImagePlus, LogOut, Mail, Maximize2, MessageSquare, Phone, QrCode, RefreshCw, Sparkles, Star, UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import FileUpload from '@/components/FileUpload';
import { QuoteInvoiceBuilder } from '@/components/QuoteInvoiceBuilder';
import { encodeUpsellImageIdea, formatUpsellIdeaForEmail, parseUpsellImageIdea, type UpsellImageIdea } from '@/lib/officeDialogue';
import { runMobileTouchAction } from '@/lib/mobileTouch';
import StaffFeed from '@/components/StaffFeed';
import UrgentLeadResponseCenter, { type UrgentLeadRow } from '@/components/UrgentLeadResponseCenter';
import ZoeGameHub from '@/components/ZoeGameHub';
import { formatWebsiteHeroReferences, WEBSITE_HERO_REFERENCE_RULE } from '@/lib/websiteHeroReference';
import { supabase } from '@/lib/supabase';
import type { UploadedFile } from '@/types';
import { clearClientAuthStorage, isClientForceLoggedOut, markClientForceLoggedOut, setRepPortalSessionActive } from '@/lib/repTracking';

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

interface RepPageIdeaRow {
  id: string;
  rep_slug: string;
  brand_name: string;
  industry: string | null;
  category: string | null;
  niche: string | null;
  page_title: string | null;
  page_slug: string | null;
  page_url: string | null;
  thumbnail_url: string | null;
  qr_png_url: string | null;
  qr_svg_url: string | null;
  status: string;
  is_featured: boolean;
  idea_text: string;
  created_at: string;
}

interface MeetingCalendarEvent {
  title: string;
  dueDate: string;
  details: string;
}

interface OfficeNote {
  id: string;
  quote_request_id: string;
  note_text: string;
  created_by: string;
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

const getTodayInputValue = () => new Date().toISOString().slice(0, 10);

const getCalendarDateStamp = (value: string) => value.replace(/-/g, '');

const getNextCalendarDateStamp = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10).replace(/-/g, '');
};

const buildGoogleCalendarHref = (event: MeetingCalendarEvent) =>
  `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${getCalendarDateStamp(event.dueDate)}/${getNextCalendarDateStamp(event.dueDate)}&details=${encodeURIComponent(event.details)}`;

const downloadCalendarFile = (event: MeetingCalendarEvent) => {
  const escapeIcsValue = (value: string) =>
    value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SlapWrapz//Rep Follow Up//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@slapwrapz.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`,
    `DTSTART;VALUE=DATE:${getCalendarDateStamp(event.dueDate)}`,
    `DTEND;VALUE=DATE:${getNextCalendarDateStamp(event.dueDate)}`,
    `SUMMARY:${escapeIcsValue(event.title)}`,
    `DESCRIPTION:${escapeIcsValue(event.details)}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'slapwrapz-follow-up.ics';
  anchor.click();
  URL.revokeObjectURL(url);
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

const getCompanyName = (quote: RepQuoteRow) =>
  getSummaryValue(quote, ['companyName', 'company_name', 'businessName', 'business_name']);

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
  if (productType === 'decal' || productType === 'sticker') return 'Stickers & Decals';
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

const getStickerValue = (quote: RepQuoteRow, key: string) => {
  const sticker = getSummaryValue(quote, ['sticker', 'decal']);
  if (!sticker || typeof sticker !== 'object' || Array.isArray(sticker)) return undefined;
  return (sticker as Record<string, unknown>)[key];
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
  if (title === "Today's Follow-ups") return 'border-amber-200 bg-amber-50/45';
  if (title === 'New Leads') return 'border-blue-200 bg-blue-50/40';
  if (title === 'Waiting on Customer') return 'border-red-200 bg-red-50/45';
  if (title === 'Ready for Install') return 'border-emerald-200 bg-emerald-50/45';
  if (title === 'Completed') return 'border-slate-200 bg-slate-100/65';
  if (title === 'Need Deposit') return 'border-violet-200 bg-violet-50/45';
  return 'border-slate-200 bg-white';
};

const getGroupBadgeClassName = (title: string) => {
  if (title === "Today's Follow-ups") return 'bg-amber-100 text-amber-800';
  if (title === 'New Leads') return 'bg-blue-100 text-blue-800';
  if (title === 'Waiting on Customer') return 'bg-red-100 text-red-800';
  if (title === 'Ready for Install') return 'bg-emerald-100 text-emerald-800';
  if (title === 'Completed') return 'bg-slate-200 text-slate-700';
  if (title === 'Need Deposit') return 'bg-violet-100 text-violet-800';
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
const WHEELERS_TOWING_QUOTE_ID = 'SW-20260715-07175D';
const WHEELERS_TOWING_PAGE_URL = 'https://www.slapwrapz.com/trapstar/local/wheelers-towing';

const isImageFile = (file: FileSummary) => {
  if (file.type?.toLowerCase().startsWith('image/')) return true;

  const imagePath = `${file.name || ''} ${file.url || ''}`.toLowerCase();
  return /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/.test(imagePath);
};

const DetailField = ({ label, value }: { label: string; value: unknown }) => (
  <div className="min-w-0">
    <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
    <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">{formatValue(value)}</dd>
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

const isPdfAttachment = (file: { name?: string; url?: string }) =>
  file.name?.toLowerCase().endsWith('.pdf') || file.url?.toLowerCase().includes('.pdf');

const getIdeaStatusClassName = (status: string, isFeatured: boolean) => {
  if (isFeatured) return 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200';
  if (status === 'built') return 'bg-blue-100 text-blue-800 ring-1 ring-blue-200';
  if (status === 'approved') return 'bg-violet-100 text-violet-800 ring-1 ring-violet-200';
  if (status === 'rejected') return 'bg-red-100 text-red-800 ring-1 ring-red-200';
  if (status === 'inactive') return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
  return 'bg-amber-100 text-amber-800 ring-1 ring-amber-200';
};

const RepPortal = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [quotes, setQuotes] = useState<RepQuoteRow[]>([]);
  const [urgentLeads, setUrgentLeads] = useState<UrgentLeadRow[]>([]);
  const [loadingUrgentLeads, setLoadingUrgentLeads] = useState(false);
  const [urgentLeadActionId, setUrgentLeadActionId] = useState<string | null>(null);
  const [urgentLeadMessage, setUrgentLeadMessage] = useState('');
  const [urgentLeadError, setUrgentLeadError] = useState('');
  const [quoteChooserOpen, setQuoteChooserOpen] = useState(false);
  const [guideQuoteButton, setGuideQuoteButton] = useState(false);
  const [zoeEmptyCustomerCelebration, setZoeEmptyCustomerCelebration] = useState(false);
  const zoeQuoteMissionOpenedRef = useRef(false);
  const zoeQuoteMissionVerifiedRef = useRef(false);
  const [selectedQuote, setSelectedQuote] = useState<RepQuoteRow | null>(null);
  const [officeNotes, setOfficeNotes] = useState<OfficeNote[]>([]);
  const [loadingOfficeNotes, setLoadingOfficeNotes] = useState(false);
  const [newOfficeMessage, setNewOfficeMessage] = useState('');
  const [savingOfficeMessage, setSavingOfficeMessage] = useState(false);
  const [officeMessageStatus, setOfficeMessageStatus] = useState('');
  const [officeMessageError, setOfficeMessageError] = useState('');
  const [showRepUpsellComposer, setShowRepUpsellComposer] = useState(false);
  const [repUpsellTitle, setRepUpsellTitle] = useState('');
  const [repUpsellMessage, setRepUpsellMessage] = useState('');
  const [repUpsellFiles, setRepUpsellFiles] = useState<UploadedFile[]>([]);
  const [savingRepUpsell, setSavingRepUpsell] = useState(false);
  const [upsellImagePreview, setUpsellImagePreview] = useState<{ url: string; name?: string; title: string } | null>(null);
  const [sendingPdfUrl, setSendingPdfUrl] = useState<string | null>(null);
  const [pdfSendStatus, setPdfSendStatus] = useState<Record<string, { type: 'success' | 'error'; message: string }>>({});
  const [quoteContinuationOpen, setQuoteContinuationOpen] = useState(false);
  const [quoteBuildUpsellIdea, setQuoteBuildUpsellIdea] = useState<UpsellImageIdea | null>(null);
  const [quotePreparationNotes, setQuotePreparationNotes] = useState('');
  const [websiteHeroReferenceFiles, setWebsiteHeroReferenceFiles] = useState<UploadedFile[]>([]);
  const [savingQuoteContinuation, setSavingQuoteContinuation] = useState(false);
  const [quoteContinuationStatus, setQuoteContinuationStatus] = useState('');
  const [quoteContinuationError, setQuoteContinuationError] = useState('');
  const [invoiceBuilderOpen, setInvoiceBuilderOpen] = useState(false);
  const [activePriorityGroupId, setActivePriorityGroupId] = useState<string | null>(null);
  const [guidedPriorityGroupId, setGuidedPriorityGroupId] = useState<string | null>(null);
  const [expandedPriorityGroupIds, setExpandedPriorityGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [coverDirection, setCoverDirection] = useState('');
  const [pageIdeaIndustry, setPageIdeaIndustry] = useState('');
  const [pageIdeaCategory, setPageIdeaCategory] = useState('');
  const [pageIdeaTitle, setPageIdeaTitle] = useState('');
  const [pageIdeas, setPageIdeas] = useState<RepPageIdeaRow[]>([]);
  const [showCoverReferenceUpload, setShowCoverReferenceUpload] = useState(false);
  const [coverReferenceFiles, setCoverReferenceFiles] = useState<UploadedFile[]>([]);
  const [coverDirectionState, setCoverDirectionState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [coverDirectionMessage, setCoverDirectionMessage] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingNextStep, setMeetingNextStep] = useState('');
  const [meetingDueDate, setMeetingDueDate] = useState('');
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [meetingMessage, setMeetingMessage] = useState('');
  const [meetingError, setMeetingError] = useState('');
  const [meetingSuccessOpen, setMeetingSuccessOpen] = useState(false);
  const [lastMeetingCalendarEvent, setLastMeetingCalendarEvent] = useState<MeetingCalendarEvent | null>(null);
  const [portalFeedbackType, setPortalFeedbackType] = useState('bug');
  const [portalFeedbackMessage, setPortalFeedbackMessage] = useState('');
  const [portalFeedbackState, setPortalFeedbackState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [portalFeedbackStatus, setPortalFeedbackStatus] = useState('');
  const [portalFeedbackResult, setPortalFeedbackResult] = useState('pass');
  const [portalFeedbackFiles, setPortalFeedbackFiles] = useState<UploadedFile[]>([]);
  const [guidedPortalReport, setGuidedPortalReport] = useState(false);
  const [zoeNavigationPhase, setZoeNavigationPhase] = useState<'idle' | 'back' | 'forward'>('idle');
  const zoeNavigationPhaseRef = useRef<'idle' | 'back' | 'forward'>('idle');
  const meetingDueDateInputRef = useRef<HTMLInputElement | null>(null);
  const quoteDetailsSectionRef = useRef<HTMLElement | null>(null);
  const quoteContinuationSectionRef = useRef<HTMLElement | null>(null);
  const quoteDetailHistoryPushedRef = useRef(false);
  const selectedQuoteRef = useRef<RepQuoteRow | null>(null);
  const location = useLocation();
  const selectedQuoteId = selectedQuote?.id;

  const loadUrgentLeads = useCallback(async () => {
    setLoadingUrgentLeads(true);
    const { data, error: urgentError } = await supabase.rpc('get_urgent_lead_queue_v1');
    setLoadingUrgentLeads(false);

    if (urgentError) {
      if (!urgentError.message.toLowerCase().includes('function')) {
        setUrgentLeadError(urgentError.message);
      }
      setUrgentLeads([]);
      return;
    }

    setUrgentLeadError('');
    setUrgentLeads((data ?? []) as UrgentLeadRow[]);
  }, []);

  const closeSelectedQuoteDetail = useCallback(() => {
    setSelectedQuote(null);
    setMeetingNotes('');
    setMeetingNextStep('');
    setMeetingDueDate('');
    setMeetingMessage('');
    setMeetingError('');
    setMeetingSuccessOpen(false);
    setNewOfficeMessage('');
    setOfficeMessageStatus('');
    setOfficeMessageError('');
    setShowRepUpsellComposer(false);
    setRepUpsellTitle('');
    setRepUpsellMessage('');
    setRepUpsellFiles([]);
    setQuoteContinuationOpen(false);
    setQuoteBuildUpsellIdea(null);
    setQuotePreparationNotes('');
    setWebsiteHeroReferenceFiles([]);
    setQuoteContinuationStatus('');
    setQuoteContinuationError('');
    setInvoiceBuilderOpen(false);
  }, []);

  const requestCloseSelectedQuoteDetail = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      quoteDetailHistoryPushedRef.current &&
      window.history.state?.repQuoteDetailOpen
    ) {
      window.history.back();
      return;
    }

    quoteDetailHistoryPushedRef.current = false;
    closeSelectedQuoteDetail();
  }, [closeSelectedQuoteDetail]);

  useEffect(() => {
    selectedQuoteRef.current = selectedQuote;
  }, [selectedQuote]);

  useEffect(() => {
    if (!selectedQuote || quoteDetailHistoryPushedRef.current || typeof window === 'undefined') return;

    window.history.pushState(
      {
        ...(window.history.state || {}),
        repQuoteDetailOpen: true,
        repQuoteId: selectedQuote.id
      },
      '',
      window.location.href
    );
    quoteDetailHistoryPushedRef.current = true;
  }, [selectedQuote]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (
        selectedQuoteRef.current &&
        quoteDetailHistoryPushedRef.current &&
        !event.state?.repQuoteDetailOpen
      ) {
        quoteDetailHistoryPushedRef.current = false;
        closeSelectedQuoteDetail();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [closeSelectedQuoteDetail]);

  const startQuoteForCustomer = (quote: RepQuoteRow) => {
    setSelectedQuote(quote);
    setQuoteContinuationOpen(true);
    setInvoiceBuilderOpen(false);
    setQuoteBuildUpsellIdea(null);
    setQuotePreparationNotes('');
    setWebsiteHeroReferenceFiles([]);
    setQuoteContinuationStatus('');
    setQuoteContinuationError('');
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        quoteContinuationSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  };

  const startQuoteFromUpsell = (idea: UpsellImageIdea) => {
    const ideaImages = idea.images?.length ? idea.images : idea.imageUrl ? [{ url: idea.imageUrl, name: idea.imageName }] : [];
    setQuoteBuildUpsellIdea(idea);
    setWebsiteHeroReferenceFiles([]);
    setQuotePreparationNotes([
      `Upsell opportunity: ${idea.title}`,
      idea.message,
      ...ideaImages.map((image, index) => `Reference image ${index + 1}: ${image.url}`)
    ].filter(Boolean).join('\n\n'));
    setQuoteContinuationStatus('');
    setQuoteContinuationError('');
    setQuoteContinuationOpen(true);
    window.requestAnimationFrame(() => {
      quoteContinuationSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const sendPdfProposal = async (file: { url: string; name?: string }) => {
    if (!selectedQuote || !session?.access_token || sendingPdfUrl) return;
    const recipientEmail = window.prompt('Send this PDF to:', selectedQuote.customer_email)?.trim();
    if (!recipientEmail) return;
    setSendingPdfUrl(file.url);
    setPdfSendStatus((current) => ({ ...current, [file.url]: { type: 'success', message: `Sending to ${recipientEmail}…` } }));

    try {
      const response = await fetch('/api/send-pdf-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          customerEmail: recipientEmail,
          customerName: selectedQuote.customer_name,
          quoteId: selectedQuote.quote_id || selectedQuote.id,
          fileUrl: file.url,
          fileName: file.name || 'SlapWrapz-Proposal.pdf'
        })
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'The PDF email could not be sent');
      setPdfSendStatus((current) => ({ ...current, [file.url]: { type: 'success', message: `PDF sent to ${recipientEmail}.` } }));
    } catch (sendError) {
      setPdfSendStatus((current) => ({ ...current, [file.url]: { type: 'error', message: sendError instanceof Error ? sendError.message : 'The PDF email could not be sent' } }));
    } finally {
      setSendingPdfUrl(null);
    }
  };

  const returnToCustomerDetails = () => {
    setQuoteContinuationOpen(false);
    setQuoteBuildUpsellIdea(null);
    setQuoteContinuationStatus('');
    setQuoteContinuationError('');
    window.requestAnimationFrame(() => {
      quoteDetailsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const saveQuoteContinuation = async () => {
    if (!selectedQuote || savingQuoteContinuation) return;

    const normalizedFiles = [...getFiles(selectedQuote), ...websiteHeroReferenceFiles]
      .filter((file) => Boolean(file.url))
      .map((file, index) => ({
        id: file.id || `${selectedQuote.id}-file-${index}`,
        name: file.name || `Customer file ${index + 1}`,
        url: file.url || '',
        type: file.type || '',
        size: file.size || 0,
        tags: file.tags || []
      }));

    setSavingQuoteContinuation(true);
    setQuoteContinuationError('');
    setQuoteContinuationStatus('Saving to this customer...');

    const { error: continuationError } = await supabase.rpc('continue_rep_quote_request_v1', {
      p_quote_request_id: selectedQuote.id,
      p_customer_name: selectedQuote.customer_name,
      p_customer_email: selectedQuote.customer_email,
      p_customer_phone: selectedQuote.customer_phone || '',
      p_preferred_contact: ['email', 'text', 'call'].includes(selectedQuote.preferred_contact || '')
        ? selectedQuote.preferred_contact
        : 'email',
      p_quote_data: {
        ...(selectedQuote.quote_summary || {}),
        repQuoteBuildStatus: 'started',
        repQuoteBuildStartedAt: new Date().toISOString(),
        repQuotePreparationNotes: quotePreparationNotes.trim(),
        websiteHeroReferenceRule: websiteHeroReferenceFiles.length > 0 ? WEBSITE_HERO_REFERENCE_RULE : null,
        websiteHeroReferenceFiles: websiteHeroReferenceFiles.map((file) => ({ name: file.name, url: file.url })),
        repQuoteBuildSource: quoteBuildUpsellIdea ? 'upsell_image_idea' : 'customer_record',
        ...(quoteBuildUpsellIdea ? { repQuoteUpsellIdea: quoteBuildUpsellIdea } : {})
      },
      p_uploaded_files: normalizedFiles
    });

    if (continuationError) {
      setSavingQuoteContinuation(false);
      setQuoteContinuationStatus('');
      setQuoteContinuationError(continuationError.message);
      return;
    }

    const heroReferenceList = formatWebsiteHeroReferences(websiteHeroReferenceFiles);
    const officeNote = [
      quotePreparationNotes.trim() ? `Quote build preparation:\n${quotePreparationNotes.trim()}` : '',
      heroReferenceList ? `WEBSITE HERO REFERENCES:\n${heroReferenceList}\n\n${WEBSITE_HERO_REFERENCE_RULE}` : ''
    ].filter(Boolean).join('\n\n');

    if (officeNote) {
      await supabase.rpc('add_quote_internal_note_rep_v1', {
        p_quote_request_id: selectedQuote.id,
        p_note_text: officeNote
      });
      await loadOfficeNotes(selectedQuote.id);
    }

    setSavingQuoteContinuation(false);
    setQuoteContinuationStatus('Saved to this customer. Opening the official invoice builder on this same record.');
    setInvoiceBuilderOpen(true);
    await refreshAssignedQuotes();
  };

  const loadOfficeNotes = useCallback(async (quoteRequestId: string) => {
    setLoadingOfficeNotes(true);
    setOfficeMessageError('');

    const { data, error: notesError } = await supabase.rpc('get_quote_internal_notes_rep_v1', {
      p_quote_request_id: quoteRequestId
    });

    setLoadingOfficeNotes(false);
    if (notesError) {
      setOfficeNotes([]);
      setOfficeMessageError(notesError.message);
      return;
    }

    setOfficeNotes((data || []) as OfficeNote[]);
  }, []);

  const sendOfficeMessage = async () => {
    if (!selectedQuote || savingOfficeMessage) return;
    const trimmedMessage = newOfficeMessage.trim();
    if (!trimmedMessage) {
      setOfficeMessageError('Add a message before sending.');
      return;
    }

    setSavingOfficeMessage(true);
    setOfficeMessageError('');
    setOfficeMessageStatus('Saving message...');

    const { error: saveError } = await supabase.rpc('add_quote_internal_note_rep_v1', {
      p_quote_request_id: selectedQuote.id,
      p_note_text: trimmedMessage
    });

    if (saveError) {
      setSavingOfficeMessage(false);
      setOfficeMessageStatus('');
      setOfficeMessageError(saveError.message);
      return;
    }

    setNewOfficeMessage('');
    await loadOfficeNotes(selectedQuote.id);

    const emailResponse = await fetch('/api/send-internal-note-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientType: 'office',
        authorName: adminUser?.display_name || adminUser?.email || 'Sales rep',
        quoteId: selectedQuote.quote_id || selectedQuote.id,
        customerName: selectedQuote.customer_name,
        noteText: trimmedMessage
      })
    });

    setSavingOfficeMessage(false);
    if (!emailResponse.ok) {
      setOfficeMessageStatus('Message saved.');
      setOfficeMessageError('The office email notification did not send, but your message is safely saved here.');
      return;
    }

    setOfficeMessageStatus('Message saved and sent to SlapWrapz Quotes.');
  };

  const saveRepUpsellIdea = async (filesOverride?: UploadedFile[]) => {
    if (!selectedQuote || savingRepUpsell) return;
    const title = repUpsellTitle.trim() || 'Upsell image idea';
    const message = repUpsellMessage.trim();
    const imageFiles = (filesOverride ?? repUpsellFiles).filter((file) => Boolean(file.url));
    const imageFile = imageFiles[0];

    if (!imageFile?.url) {
      setOfficeMessageError('Upload an opportunity image before saving.');
      return;
    }

    const idea = {
      title,
      message,
      imageUrl: imageFile.url,
      imageName: imageFile.name,
      images: imageFiles.map((file) => ({ url: file.url, name: file.name }))
    };
    setSavingRepUpsell(true);
    setOfficeMessageError('');
    setOfficeMessageStatus('Saving upsell image idea...');

    const { error: saveError } = await supabase.rpc('add_quote_internal_note_rep_v1', {
      p_quote_request_id: selectedQuote.id,
      p_note_text: encodeUpsellImageIdea(idea)
    });

    if (saveError) {
      setSavingRepUpsell(false);
      setOfficeMessageStatus('');
      setOfficeMessageError(saveError.message);
      return;
    }

    await loadOfficeNotes(selectedQuote.id);
    const response = await fetch('/api/send-internal-note-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientType: 'office',
        authorName: adminUser?.display_name || adminUser?.email || 'Sales rep',
        quoteId: selectedQuote.quote_id || selectedQuote.id,
        customerName: selectedQuote.customer_name,
        noteText: formatUpsellIdeaForEmail(idea)
      })
    });

    setSavingRepUpsell(false);
    setRepUpsellTitle('');
    setRepUpsellMessage('');
    setRepUpsellFiles([]);
    setShowRepUpsellComposer(false);

    if (!response.ok) {
      setOfficeMessageStatus('Upsell image idea saved.');
      setOfficeMessageError('The office email did not send, but the image idea is safely saved here.');
      return;
    }

    setOfficeMessageStatus('Upsell image idea saved and sent to SlapWrapz Quotes.');
  };

  const handleRepUpsellFilesUploaded = (files: UploadedFile[]) => {
    setRepUpsellFiles(files);
    if (files.some((file) => Boolean(file.url))) {
      void saveRepUpsellIdea(files);
    }
  };

  useEffect(() => {
    if (!selectedQuoteId) {
      setOfficeNotes([]);
      return;
    }

    void loadOfficeNotes(selectedQuoteId);
  }, [loadOfficeNotes, selectedQuoteId]);

  const loadPortal = async () => {
    setLoading(true);
    setError('');

    if (isClientForceLoggedOut()) {
      setSession(null);
      setAdminUser(null);
      setQuotes([]);
      setLoading(false);
      return;
    }

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

    setRepPortalSessionActive(true);

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
    await loadUrgentLeads();

    const { data: ideaData, error: ideaError } = await supabase.rpc('list_my_rep_page_ideas_v1');
    if (ideaError) {
      console.error('Rep page idea load failed:', ideaError);
      setPageIdeas([]);
    } else {
      setPageIdeas((ideaData ?? []) as RepPageIdeaRow[]);
    }

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

  useEffect(() => {
    if (!session || !adminUser || !['sales_rep', 'rep_manager'].includes(adminUser.role)) return;
    const interval = window.setInterval(() => void loadUrgentLeads(), 5000);
    return () => window.clearInterval(interval);
  }, [adminUser, loadUrgentLeads, session]);

  const handleLogout = () => {
    setSigningOut(true);
    setRepPortalSessionActive(false);
    markClientForceLoggedOut();
    clearClientAuthStorage();
    window.location.assign('/logout');
  };

  const submitCoverDirection = async () => {
    if (!adminUser) return;

    setCoverDirectionState('sending');
    setCoverDirectionMessage('');
    const trimmedDirection = coverDirection.trim();
    const referenceFileLines = coverReferenceFiles
      .map((file, index) => `${index + 1}. ${file.name}: ${file.url}`)
      .join('\n');
    const directionWithReferences = referenceFileLines
      ? `${trimmedDirection}\n\nWEBSITE HERO REFERENCES:\n${referenceFileLines}\n\n${WEBSITE_HERO_REFERENCE_RULE}`
      : trimmedDirection;

    if (trimmedDirection.length < 40) {
      setCoverDirectionState('error');
      setCoverDirectionMessage('Please add more page direction before submitting.');
      return;
    }

    try {
      const { data: savedIdeaData, error: saveIdeaError } = await supabase.rpc('submit_rep_page_idea_v1', {
        p_idea_text: directionWithReferences,
        p_industry: pageIdeaIndustry.trim() || null,
        p_category: pageIdeaCategory.trim() || null,
        p_niche: null,
        p_page_title: pageIdeaTitle.trim() || null
      });

      if (saveIdeaError) {
        throw new Error(saveIdeaError.message);
      }

      const savedIdea = (savedIdeaData?.[0] as RepPageIdeaRow | undefined) ?? null;

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
          direction: directionWithReferences
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof result.error === 'string' ? result.error : 'Cover page idea failed to send.');
      }

      setCoverDirectionState('sent');
      setCoverDirection('');
      setPageIdeaIndustry('');
      setPageIdeaCategory('');
      setPageIdeaTitle('');
      setCoverReferenceFiles([]);
      setShowCoverReferenceUpload(false);
      if (savedIdea) {
        setPageIdeas((current) => [savedIdea, ...current.filter((idea) => idea.id !== savedIdea.id)]);
      }
      setCoverDirectionMessage(
        savedIdea?.status === 'approved'
          ? 'Your page idea is in the build lane. BWB can now build a first look from it.'
          : 'Your page idea was sent to BWB for review. Add the word build when you want it to go straight into the build lane.'
      );
    } catch (coverError) {
      setCoverDirectionState('error');
      setCoverDirectionMessage(coverError instanceof Error ? coverError.message : 'Cover page idea failed to send.');
    }
  };

  const toggleFeaturedPageIdea = async (idea: RepPageIdeaRow) => {
    if (!idea.page_url || idea.status !== 'built') return;

    const { data, error: featureError } = await supabase.rpc('set_my_rep_page_idea_featured_v1', {
      p_idea_id: idea.id,
      p_is_featured: !idea.is_featured
    });

    if (featureError) {
      setCoverDirectionState('error');
      setCoverDirectionMessage(featureError.message);
      return;
    }

    const updated = data?.[0] as { id: string; is_featured: boolean } | undefined;
    if (!updated) return;

    setPageIdeas((current) =>
      current.map((pageIdea) => ({
        ...pageIdea,
        is_featured: pageIdea.id === updated.id ? updated.is_featured : updated.is_featured ? false : pageIdea.is_featured
      }))
    );
  };

  const refreshAssignedQuotes = async () => {
    if (!adminUser) return;

    const quoteRpc =
      adminUser.role === 'rep_manager'
        ? 'get_rep_manager_quote_requests_v1'
        : 'get_rep_assigned_quote_requests_v2';
    const { data: quoteData, error: quoteRefreshError } = await supabase.rpc(quoteRpc);

    if (quoteRefreshError) {
      setMeetingError(quoteRefreshError.message);
      return;
    }

    const nextQuotes = (quoteData ?? []) as RepQuoteRow[];
    setQuotes(nextQuotes);
    setSelectedQuote((current) => {
      if (!current) return current;
      return nextQuotes.find((quote) => quote.id === current.id) ?? current;
    });
    await loadUrgentLeads();
  };

  const acknowledgeUrgentLead = async (lead: UrgentLeadRow) => {
    setUrgentLeadActionId(lead.quote_request_id);
    setUrgentLeadMessage('');
    setUrgentLeadError('');
    const { error: acknowledgeError } = await supabase.rpc('acknowledge_urgent_lead_v1', {
      p_quote_request_id: lead.quote_request_id
    });
    setUrgentLeadActionId(null);

    if (acknowledgeError) {
      setUrgentLeadError(acknowledgeError.message);
      return;
    }

    setUrgentLeadMessage('Receipt confirmed. Contact the customer now before the timer ends.');
    await loadUrgentLeads();
  };

  const contactUrgentLead = async (lead: UrgentLeadRow, method: 'call' | 'text' | 'email') => {
    setUrgentLeadActionId(lead.quote_request_id);
    setUrgentLeadMessage('');
    setUrgentLeadError('');
    const { error: contactError } = await supabase.rpc('mark_urgent_lead_contacted_v1', {
      p_quote_request_id: lead.quote_request_id,
      p_contact_method: method
    });

    if (contactError) {
      setUrgentLeadActionId(null);
      setUrgentLeadError(contactError.message);
      await loadUrgentLeads();
      return;
    }

    const digits = (lead.customer_phone || '').replace(/[^\d+]/g, '');
    const subject = encodeURIComponent(`Your SlapWrapz request ${lead.quote_id || ''}`.trim());
    const body = encodeURIComponent(`Hi ${lead.customer_name}, I received your SlapWrapz request and I am reaching out to help with your quote.`);
    const destination = method === 'call'
      ? `tel:${digits}`
      : method === 'text'
        ? `sms:${digits}?&body=${body}`
        : `mailto:${lead.customer_email}?subject=${subject}&body=${body}`;

    setUrgentLeadActionId(null);
    setUrgentLeadMessage(`Contact stamped by ${method}. Opening the customer contact now.`);
    await Promise.all([loadUrgentLeads(), refreshAssignedQuotes()]);
    window.location.href = destination;
  };

  const claimUrgentLead = async (lead: UrgentLeadRow) => {
    setUrgentLeadActionId(lead.quote_request_id);
    setUrgentLeadMessage('');
    setUrgentLeadError('');
    const { error: claimError } = await supabase.rpc('claim_expired_urgent_lead_v1', {
      p_quote_request_id: lead.quote_request_id
    });
    setUrgentLeadActionId(null);

    if (claimError) {
      setUrgentLeadError(claimError.message);
      await loadUrgentLeads();
      return;
    }

    setUrgentLeadMessage(`${lead.customer_name} is now assigned to you. Your new five-minute contact timer has started.`);
    await Promise.all([loadUrgentLeads(), refreshAssignedQuotes()]);
  };

  const openUrgentLead = (lead: UrgentLeadRow) => {
    const quote = quotes.find((candidate) => candidate.id === lead.quote_request_id);
    if (quote) {
      setSelectedQuote(quote);
      return;
    }
    void refreshAssignedQuotes();
  };

  const saveCustomerMeeting = async () => {
    if (!selectedQuote || savingMeeting) return;

    const trimmedNotes = meetingNotes.trim();
    const trimmedNextStep = meetingNextStep.trim();

    if (!trimmedNotes) {
      setMeetingError('Add what happened in the meeting before saving.');
      setMeetingMessage('');
      return;
    }

    if (!trimmedNextStep) {
      setMeetingError('Add the next step before saving. If it is not scheduled, it is not happening.');
      setMeetingMessage('');
      return;
    }

    if (!meetingDueDate) {
      setMeetingError('Choose a due date for the next step.');
      setMeetingMessage('');
      return;
    }

    setSavingMeeting(true);
    setMeetingError('');
    setMeetingMessage('Saving meeting...');

    const { error: meetingSaveError } = await supabase.rpc('log_rep_quote_customer_meeting_v1', {
      p_quote_request_id: selectedQuote.id,
      p_meeting_notes: trimmedNotes,
      p_next_step_text: trimmedNextStep,
      p_next_step_due_date: meetingDueDate
    });

    if (meetingSaveError) {
      setSavingMeeting(false);
      setMeetingError(meetingSaveError.message);
      setMeetingMessage('');
      return;
    }

    const calendarEvent = {
      title: `SlapWrapz follow-up: ${trimmedNextStep}`,
      dueDate: meetingDueDate,
      details: [
        `Customer: ${selectedQuote.customer_name}`,
        `Project: ${getProjectTitle(selectedQuote) || getProductLabel(selectedQuote)}`,
        `Quote: ${selectedQuote.quote_id || selectedQuote.id}`,
        `Next step: ${trimmedNextStep}`,
        '',
        'Meeting notes:',
        trimmedNotes
      ].join('\n')
    };
    setLastMeetingCalendarEvent(calendarEvent);

    const emailResponse = await fetch('/api/send-rep-meeting-follow-up-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        repEmail: adminUser?.email,
        repName: adminUser?.display_name || adminUser?.email || 'Rep',
        customerEmail: selectedQuote.customer_email,
        customerName: selectedQuote.customer_name,
        quoteId: selectedQuote.quote_id || selectedQuote.id,
        projectName: getProjectTitle(selectedQuote) || getProductLabel(selectedQuote),
        meetingNotes: trimmedNotes,
        nextStep: trimmedNextStep,
        dueDate: meetingDueDate
      })
    });

    const emailResult = await emailResponse.json().catch(() => ({}));
    setSavingMeeting(false);

    if (!emailResponse.ok) {
      setMeetingNotes('');
      setMeetingNextStep('');
      setMeetingDueDate('');
      setMeetingMessage('Meeting saved and next follow-up added.');
      setMeetingError(typeof emailResult.error === 'string' ? emailResult.error : 'Email notifications failed, but the meeting was saved.');
      setMeetingSuccessOpen(true);
      await refreshAssignedQuotes();
      return;
    }

    setMeetingNotes('');
    setMeetingNextStep('');
    setMeetingDueDate('');
    setMeetingMessage('Meeting saved, next follow-up added, and both emails were sent.');
    setMeetingSuccessOpen(true);
    await refreshAssignedQuotes();
  };

  const submitPortalFeedback = async () => {
    if (!adminUser || portalFeedbackState === 'sending') return;

    const trimmedMessage = portalFeedbackMessage.trim();
    if (trimmedMessage.length < 10) {
      setPortalFeedbackState('error');
      setPortalFeedbackStatus('Add a little more detail so BWB knows what to fix or improve.');
      return;
    }
    if (adminUser.rep_slug === 'zoe' && guidedPortalReport && portalFeedbackFiles.length === 0) {
      setPortalFeedbackState('error');
      setPortalFeedbackStatus('Add one screenshot or short recording before sending the mission report.');
      return;
    }

    const attachmentLines = portalFeedbackFiles.map((file) => `${file.name}: ${file.url}`);
    const feedbackMessage = adminUser.rep_slug === 'zoe'
      ? `Mission 01 result: ${portalFeedbackResult === 'pass' ? 'Pass' : 'Needs Fix'}\n${trimmedMessage}${attachmentLines.length ? `\nEvidence:\n${attachmentLines.join('\n')}` : ''}`
      : trimmedMessage;

    setPortalFeedbackState('sending');
    setPortalFeedbackStatus('Sending portal note...');

    const { error: feedbackError } = await supabase.rpc('submit_rep_portal_feedback_v1', {
      p_feedback_type: portalFeedbackType,
      p_message: feedbackMessage,
      p_page_path: `${window.location.pathname}${window.location.search}`
    });

    if (feedbackError) {
      setPortalFeedbackState('error');
      setPortalFeedbackStatus(
        feedbackError.message.includes('function')
          ? 'Feedback box is ready, but the Supabase feedback function still needs to be installed.'
          : feedbackError.message
      );
      return;
    }

    setPortalFeedbackState('sent');
    setPortalFeedbackMessage('');
    setPortalFeedbackFiles([]);
    setPortalFeedbackType('bug');
    setPortalFeedbackStatus('Sent to BWB. Thanks. This helps improve the rep portal.');
    if (adminUser.rep_slug === 'zoe' && guidedPortalReport) {
      setGuidedPortalReport(false);
      window.dispatchEvent(new CustomEvent('bwb-zoe-mission-step-completed', { detail: { step: 4 } }));
      window.setTimeout(() => document.getElementById('zoe-mission-one')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 650);
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
  const scrollToPriorityGroup = (targetId: string) => {
    const target = document.getElementById(targetId);
    if (!target) return;

    setActivePriorityGroupId(targetId);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    const guideQuote = () => {
      setGuideQuoteButton(true);
      window.setTimeout(() => {
        document.getElementById('zoe-start-quote-target')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    };
    window.addEventListener('bwb-zoe-guide-quote', guideQuote);
    return () => window.removeEventListener('bwb-zoe-guide-quote', guideQuote);
  }, []);

  useEffect(() => {
    if (adminUser?.rep_slug !== 'zoe') return;
    if (quoteChooserOpen) {
      zoeQuoteMissionOpenedRef.current = true;
      if (quotes.length > 0) {
        zoeQuoteMissionVerifiedRef.current = true;
        window.dispatchEvent(new CustomEvent('bwb-zoe-mission-step-completed', { detail: { step: 0 } }));
      }
      return;
    }
    if (zoeQuoteMissionOpenedRef.current) {
      const verified = zoeQuoteMissionVerifiedRef.current;
      zoeQuoteMissionOpenedRef.current = false;
      zoeQuoteMissionVerifiedRef.current = false;
      if (verified) window.dispatchEvent(new CustomEvent('bwb-zoe-mission-step-completed', { detail: { step: 1 } }));
    }
  }, [adminUser?.rep_slug, quoteChooserOpen, quotes.length]);

  const completeZoeEmptyCustomerDiscovery = async () => {
    await loadPortal();
    zoeQuoteMissionVerifiedRef.current = true;
    window.dispatchEvent(new CustomEvent('bwb-zoe-mission-step-completed', { detail: { step: 0 } }));
    setZoeEmptyCustomerCelebration(true);
    window.setTimeout(() => {
      setZoeEmptyCustomerCelebration(false);
      setQuoteChooserOpen(false);
      window.setTimeout(() => {
        document.getElementById('zoe-mission-one')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
    }, 2200);
  };

  const openQuoteStart = () => {
    setGuideQuoteButton(false);
    setQuoteChooserOpen(true);
  };
  const groupedQuotes = useMemo(() => [
    {
      id: 'priority-todays-follow-ups',
      title: "Today's Follow-ups",
      description: 'Follow-up tasks due today.',
      quotes: quotes.filter((quote) => (getFollowUpSummary(quote).due_today_follow_up_count || 0) > 0)
    },
    {
      id: 'priority-waiting-on-customer',
      title: 'Waiting on Customer',
      description: 'Open customer action requests on assigned quotes.',
      quotes: quotes.filter(isWaitingOnCustomer)
    },
    {
      id: 'priority-new-leads',
      title: 'New Leads',
      description: 'Fresh assigned quote requests.',
      quotes: quotes.filter(isNewLead)
    },
    {
      id: 'priority-ready-for-install',
      title: 'Ready for Install',
      description: 'Approved, printing, or scheduled work.',
      quotes: quotes.filter(isReadyForInstall)
    },
    {
      id: 'priority-completed',
      title: 'Completed',
      description: 'Assigned work marked complete.',
      quotes: quotes.filter(isCompletedQuote)
    },
    {
      id: 'priority-need-deposit',
      title: 'Need Deposit',
      description: 'Quote sent and waiting for a deposit.',
      quotes: quotes.filter(needsDeposit)
    }
  ], [quotes]);

  useEffect(() => {
    const guideQuoteGroup = () => {
      const targetGroup = groupedQuotes.find((group) => group.quotes.length > 0) || groupedQuotes[0];
      if (!targetGroup) return;
      setGuidedPriorityGroupId(targetGroup.id);
      setExpandedPriorityGroupIds((current) => current.filter((id) => id !== targetGroup.id));
      window.setTimeout(() => {
        document.getElementById(targetGroup.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    };
    window.addEventListener('bwb-zoe-guide-quote-group', guideQuoteGroup);
    return () => window.removeEventListener('bwb-zoe-guide-quote-group', guideQuoteGroup);
  }, [groupedQuotes]);

  useEffect(() => {
    const startHistoryCheck = () => {
      const cleanState = { ...(window.history.state || {}) };
      delete cleanState.zoeMissionNavCheck;
      window.history.replaceState(cleanState, '', window.location.href);
      window.history.pushState({ ...cleanState, zoeMissionNavCheck: true }, '', window.location.href);
      zoeNavigationPhaseRef.current = 'back';
      setZoeNavigationPhase('back');
    };
    const handleHistoryStep = (event: PopStateEvent) => {
      if (zoeNavigationPhaseRef.current === 'back' && !event.state?.zoeMissionNavCheck) {
        zoeNavigationPhaseRef.current = 'forward';
        setZoeNavigationPhase('forward');
        return;
      }
      if (zoeNavigationPhaseRef.current === 'forward' && event.state?.zoeMissionNavCheck) {
        zoeNavigationPhaseRef.current = 'idle';
        setZoeNavigationPhase('idle');
        window.dispatchEvent(new CustomEvent('bwb-zoe-mission-step-completed', { detail: { step: 3 } }));
        window.setTimeout(() => document.getElementById('zoe-mission-one')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 500);
      }
    };
    const guideReport = () => {
      setGuidedPortalReport(true);
      setPortalFeedbackState('idle');
      setPortalFeedbackStatus('');
      window.setTimeout(() => document.getElementById('zoe-portal-report')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    };
    window.addEventListener('bwb-zoe-start-history-check', startHistoryCheck);
    window.addEventListener('bwb-zoe-guide-report', guideReport);
    window.addEventListener('popstate', handleHistoryStep);
    return () => {
      window.removeEventListener('bwb-zoe-start-history-check', startHistoryCheck);
      window.removeEventListener('bwb-zoe-guide-report', guideReport);
      window.removeEventListener('popstate', handleHistoryStep);
    };
  }, []);

  const togglePriorityGroup = (groupId: string, jobCount: number) => {
    const isExpanded = expandedPriorityGroupIds.includes(groupId);
    setExpandedPriorityGroupIds((current) => isExpanded ? current.filter((id) => id !== groupId) : [...current, groupId]);
    if (!isExpanded && adminUser?.rep_slug === 'zoe' && guidedPriorityGroupId === groupId) {
      if (jobCount > 0) {
        setGuidedPriorityGroupId(null);
        window.dispatchEvent(new CustomEvent('bwb-zoe-mission-step-completed', { detail: { step: 2 } }));
        window.setTimeout(() => document.getElementById('zoe-mission-one')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 900);
      }
    }
  };
  const selectedCallHref = getPhoneHref(selectedQuote?.customer_phone, 'tel');
  const selectedTextHref = getPhoneHref(selectedQuote?.customer_phone, 'sms');
  const showWheelersTowingPage = (selectedQuote?.quote_id || '').trim().toUpperCase() === WHEELERS_TOWING_QUOTE_ID;
  const wheelersPageMessage = selectedQuote
    ? `Hi ${selectedQuote.customer_name}, we put together a sample one-page website for Wheeler's Towing. You can preview it here: ${WHEELERS_TOWING_PAGE_URL}`
    : '';
  const wheelersEmailHref = selectedQuote?.customer_email
    ? `mailto:${selectedQuote.customer_email}?subject=${encodeURIComponent("Wheeler's Towing website preview")}&body=${encodeURIComponent(wheelersPageMessage)}`
    : undefined;
  const wheelersTextHref = selectedQuote?.customer_phone
    ? `${getPhoneHref(selectedQuote.customer_phone, 'sms')}?&body=${encodeURIComponent(wheelersPageMessage)}`
    : undefined;
  const showJazzyPartnerPacket = adminUser?.rep_slug === 'jazzy';
  const repPublicUrl = adminUser?.rep_slug ? `www.slapwrapz.com/${adminUser.rep_slug}` : 'www.slapwrapz.com';
  const repPublicPageUrl = `https://${repPublicUrl}`;
  const repDisplayName = adminUser?.display_name || adminUser?.email || 'Rep';
  const repQrPngUrl = `https://api.qrserver.com/v1/create-qr-code/?size=900x900&margin=24&data=${encodeURIComponent(repPublicPageUrl)}`;
  const repQrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?format=svg&size=900x900&margin=24&data=${encodeURIComponent(repPublicPageUrl)}`;
  const showCoverDirectionPanel = adminUser?.role === 'sales_rep' || adminUser?.role === 'rep_manager';
  const showRepQrPanel = Boolean(adminUser?.rep_slug);

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
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
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
              <Button onClick={handleLogout} onTouchEnd={(event) => runMobileTouchAction(event, () => void handleLogout())} disabled={signingOut}>
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
              <Button onClick={handleLogout} onTouchEnd={(event) => runMobileTouchAction(event, () => void handleLogout())} disabled={signingOut}>
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
          <Button variant="outline" size="sm" onClick={handleLogout} onTouchEnd={(event) => runMobileTouchAction(event, () => void handleLogout())} disabled={signingOut}>
            <LogOut className="mr-2 h-4 w-4" />
            {signingOut ? 'Signing out...' : 'Log Out'}
          </Button>
        </div>
      </div>

      <main className="mx-auto min-w-0 max-w-7xl space-y-5 overflow-x-hidden px-3 py-4 sm:px-4 sm:py-6 md:px-8">
        {adminUser.rep_slug === 'zoe' && <ZoeGameHub onStartQuote={openQuoteStart} />}
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

          <div className="mb-5">
            <UrgentLeadResponseCenter
              leads={urgentLeads}
              loading={loadingUrgentLeads}
              actionLeadId={urgentLeadActionId}
              message={urgentLeadMessage}
              error={urgentLeadError}
              onRefresh={() => void loadUrgentLeads()}
              onAcknowledge={(lead) => void acknowledgeUrgentLead(lead)}
              onContact={(lead, method) => void contactUrgentLead(lead, method)}
              onClaim={(lead) => void claimUrgentLead(lead)}
              onOpenLead={openUrgentLead}
            />
          </div>

          <div id="zoe-start-quote-target" className="relative mb-4 scroll-mt-24">
          {guideQuoteButton && adminUser.rep_slug === 'zoe' && (
            <div className="mb-3 flex animate-bounce items-center justify-center gap-2 rounded-xl border-2 border-[#fff600] bg-[#11152d] px-4 py-3 text-center text-sm font-black uppercase tracking-wide text-[#fff600] shadow-xl" role="status">
              Tap this button <ArrowDownRight className="h-6 w-6" />
            </div>
          )}
          <button
            type="button"
            onClick={openQuoteStart}
            onTouchEnd={(event) => runMobileTouchAction(event, openQuoteStart)}
            className={`flex min-h-28 w-full touch-manipulation items-center justify-between gap-3 rounded-lg border-2 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 p-4 text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 sm:gap-4 sm:p-5 ${guideQuoteButton ? 'border-[#fff600] ring-4 ring-[#fff600]/50' : 'border-cyan-300'}`}
            aria-label="Choose a customer and open the quote builder"
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-950 text-cyan-300 shadow-md sm:h-14 sm:w-14">
                <Calculator className="h-7 w-7" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-800">Create a customer quote</p>
                <p className="mt-1 text-xl font-black leading-tight sm:text-3xl">Start a Quote Here</p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  Choose an assigned customer and open the in-portal quote builder.
                </p>
              </div>
            </div>
            <ArrowDownRight className="h-8 w-8 shrink-0" />
          </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-6">
            {[
              { label: "Today's Follow-ups", value: dashboardCounts.todayFollowUps, detail: 'Due today', targetId: 'priority-todays-follow-ups' },
              { label: 'Waiting on Customer', value: dashboardCounts.waitingOnCustomer, detail: 'Open requests', targetId: 'priority-waiting-on-customer' },
              { label: 'New Leads', value: dashboardCounts.newLeads, detail: 'New or partial', targetId: 'priority-new-leads' },
              { label: 'Ready for Install', value: dashboardCounts.readyForInstall, detail: 'Approved or scheduled', targetId: 'priority-ready-for-install' },
              { label: 'Completed', value: dashboardCounts.completed, detail: 'Assigned complete', targetId: 'priority-completed' },
              { label: 'Need Deposit', value: dashboardCounts.needDeposit, detail: 'Quote sent stage', targetId: 'priority-need-deposit' }
            ].map((metric) => (
              <button
                type="button"
                key={metric.label}
                onClick={() => scrollToPriorityGroup(metric.targetId)}
                className={`min-w-0 touch-manipulation cursor-pointer rounded-md border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 sm:p-4 ${getDashboardMetricClassName(metric.label)}`}
                aria-label={`View ${metric.label}`}
                aria-current={activePriorityGroupId === metric.targetId ? 'location' : undefined}
              >
                <p className="break-words text-[10px] font-semibold uppercase leading-tight opacity-75 sm:text-xs">{metric.label}</p>
                <p className="mt-2 text-2xl font-bold sm:text-3xl">{metric.value}</p>
                <p className="mt-1 text-xs opacity-70">{metric.detail}</p>
              </button>
            ))}
          </div>
        </section>

        <StaffFeed />

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

        {showRepQrPanel && (
          <Card className="border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-slate-950">
                <QrCode className="h-5 w-5" />
                {repDisplayName} QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
              <div className="space-y-3 text-sm leading-6 text-slate-600">
                <p>
                  This QR code sends customers to this rep's public SlapWrapz quote page. Use the PNG for texting,
                  social posts, and quick sharing. Use the SVG when making cards or print layouts.
                </p>
                <p className="break-all rounded-md border border-slate-200 bg-slate-50 p-3 font-medium text-slate-900">
                  {repPublicPageUrl}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button asChild>
                    <a href={repQrPngUrl} target="_blank" rel="noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      Open PNG
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={repQrSvgUrl} target="_blank" rel="noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      Open SVG
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={repPublicPageUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open Page
                    </a>
                  </Button>
                </div>
              </div>

              <a
                href={repQrPngUrl}
                target="_blank"
                rel="noreferrer"
                className="mx-auto block w-full max-w-[22rem] rounded-md border border-slate-200 bg-white p-3 shadow-sm sm:max-w-[26rem] md:p-4"
                aria-label="Open rep QR code at full size"
              >
                <img
                  src={repQrPngUrl}
                  alt={`QR code for ${repDisplayName}`}
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
                  Use this space to send BWB creative direction for a SlapWrapz niche page connected to {repPublicUrl}.
                </p>
                <p>
                  The idea can come from you directly, or you can paste a response from ChatGPT, Claude, Gemini,
                  or another AI tool. If you include the word build, it goes straight into the build lane for a first look.
                  Otherwise BWB can review it first.
                </p>
                <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  Build lane means BWB/Codex can create a test look quickly. A page still needs to be checked before it becomes the active live page.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-blue-900">Industry</p>
                    <Input
                      value={pageIdeaIndustry}
                      onChange={(event) => setPageIdeaIndustry(event.target.value)}
                      placeholder="Home Services"
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-blue-900">Category</p>
                    <Input
                      value={pageIdeaCategory}
                      onChange={(event) => setPageIdeaCategory(event.target.value)}
                      placeholder="Roofing"
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-blue-900">Page Name</p>
                    <Input
                      value={pageIdeaTitle}
                      onChange={(event) => setPageIdeaTitle(event.target.value)}
                      placeholder="Roofing Truck Wraps"
                      className="bg-white"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={submitCoverDirection} disabled={coverDirectionState === 'sending'}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {coverDirectionState === 'sending' ? 'Sending...' : 'Send Page Idea'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCoverReferenceUpload((current) => !current)}
                    className="border-blue-200 bg-white text-blue-900 hover:bg-blue-50"
                  >
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Upload Hero Photo
                  </Button>
                </div>
                {showCoverReferenceUpload && (
                  <div className="rounded-md border border-blue-200 bg-white p-4">
                    <FileUpload
                      onFilesUploaded={setCoverReferenceFiles}
                      acceptedTypes="image/*"
                      maxFiles={6}
                      maxFileSizeMB={25}
                      title="Upload Website Hero Reference Photos"
                      showCameraButton
                      additionalTags={['rep_page_reference', 'cover_page_reference', 'website_hero_reference', 'transparent_background_required', 'mobile_safe_logo', adminUser.rep_slug ? `rep_${adminUser.rep_slug}` : 'rep_reference']}
                      enforceMaxFilesError
                    />
                    <p className="mt-3 whitespace-pre-line rounded-md border border-violet-200 bg-violet-50 p-3 text-xs font-medium leading-5 text-violet-950">
                      {WEBSITE_HERO_REFERENCE_RULE}
                    </p>
                    {coverReferenceFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-semibold uppercase text-blue-900">Attached references</p>
                        <div className="grid gap-2">
                          {coverReferenceFiles.map((file) => (
                            <a
                              key={file.id}
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100"
                            >
                              <FileText className="h-4 w-4 flex-none text-slate-500" />
                              <span className="truncate">{file.name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {coverDirectionMessage && (
                  <p className={coverDirectionState === 'error' ? 'text-sm font-medium text-red-700' : 'text-sm font-medium text-emerald-700'}>
                    {coverDirectionMessage}
                  </p>
                )}
              </div>
              <Textarea
                value={coverDirection}
                onChange={(event) => setCoverDirection(event.target.value)}
                placeholder={coverDirectionState === 'sent' ? coverDirectionFollowUpPrompt : `${coverDirectionPrompt}\n\nSay "build" in the idea when you want this sent straight to the build lane.`}
                className="min-h-[280px] resize-y bg-white text-sm leading-6 text-slate-800"
                aria-label="SlapWrapz page direction"
              />
            </CardContent>
          </Card>
        )}

        {showCoverDirectionPanel && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-slate-950">Submitted Page Ideas</CardTitle>
            </CardHeader>
            <CardContent>
              {pageIdeas.length === 0 ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                  No saved page ideas yet. New ideas submitted above will stay here for review, buildout, QR codes, and active page control.
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {pageIdeas.map((idea) => (
                    <div key={idea.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex gap-4">
                        <div className="flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-950 text-center text-xs font-black uppercase tracking-wide text-white">
                          {idea.thumbnail_url ? (
                            <img src={idea.thumbnail_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span>SlapWrapz<br />Idea</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getIdeaStatusClassName(idea.status, idea.is_featured)}`}>
                              {idea.is_featured ? 'Active' : formatLabel(idea.status)}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                              {idea.brand_name}
                            </span>
                          </div>
                          <h3 className="mt-2 truncate text-sm font-bold text-slate-950">
                            {idea.page_title || idea.category || idea.industry || 'Untitled page idea'}
                          </h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {[idea.industry, idea.category, idea.niche].filter(Boolean).join(' / ') || 'Uncategorized'}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">Submitted {formatDate(idea.created_at)}</p>
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-700">{idea.idea_text}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {idea.page_url ? (
                          <Button variant="outline" size="sm" asChild>
                            <a href={idea.page_url} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open Page
                            </a>
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled>
                            Page not built yet
                          </Button>
                        )}
                        {idea.qr_png_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={idea.qr_png_url} download>
                              <Download className="mr-2 h-4 w-4" />
                              QR
                            </a>
                          </Button>
                        )}
                        <Button
                          variant={idea.is_featured ? 'default' : 'outline'}
                          size="sm"
                          disabled={!idea.page_url || idea.status !== 'built'}
                          onClick={() => void toggleFeaturedPageIdea(idea)}
                        >
                          {idea.is_featured ? 'Active Page' : 'Make Active'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
            {groupedQuotes.map((group) => {
              const groupExpanded = adminUser.rep_slug !== 'zoe' || expandedPriorityGroupIds.includes(group.id);
              const groupGuided = adminUser.rep_slug === 'zoe' && guidedPriorityGroupId === group.id;
              return (
              <div
                key={group.title}
                id={group.id}
                className={`relative scroll-mt-24 rounded-md border shadow-sm transition-shadow ${getGroupClassName(group.title)} ${activePriorityGroupId === group.id ? 'ring-4 ring-cyan-400 ring-offset-2' : ''} ${groupGuided ? 'ring-4 ring-[#fff600] ring-offset-4' : ''}`}
              >
                {groupGuided && <div className="absolute -top-14 left-1/2 z-20 flex -translate-x-1/2 animate-bounce items-center gap-2 whitespace-nowrap rounded-xl bg-[#11152d] px-4 py-3 text-xs font-black uppercase text-[#fff600] shadow-xl">Open this group <ArrowDownRight className="h-5 w-5" /></div>}
                <button type="button" onClick={() => togglePriorityGroup(group.id, group.quotes.length)} className="block w-full touch-manipulation border-b border-current/10 bg-white/65 px-4 py-3 text-left" aria-expanded={groupExpanded}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">{group.title}</h3>
                      <p className="text-xs text-slate-500">{group.description}</p>
                    </div>
                    <div className="flex items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getGroupBadgeClassName(group.title)}`}>{group.quotes.length}</span>{groupExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}</div>
                  </div>
                </button>
                {groupExpanded && <div className="divide-y divide-slate-100">
                  {group.quotes.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-slate-500">No jobs are assigned to this group yet. Try a colored group with a number above zero.</p>
                  ) : (
                    group.quotes.slice(0, 5).map((quote) => (
                      <button
                        key={`${group.title}-${quote.id}`}
                        type="button"
                        className={`block min-h-12 w-full touch-manipulation border-l-4 px-4 py-3 text-left ${getFollowUpSurfaceClassName(getFollowUpSummary(quote))}`}
                        onClick={() => setSelectedQuote(quote)}
                        onTouchEnd={(event) => runMobileTouchAction(event, () => setSelectedQuote(quote))}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-950">{quote.customer_name}</p>
                            {getCompanyName(quote) && (
                              <p className="truncate text-xs font-semibold text-slate-700">{formatValue(getCompanyName(quote))}</p>
                            )}
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
                </div>}
              </div>
            );})}
          </div>
        </section>

        <Card id="rep-quote-work-area" className="scroll-mt-6">
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
              <>
                <div className="space-y-3 md:hidden">
                  {quotes.map((quote) => {
                    const followUpSummary = getFollowUpSummary(quote);
                    const nextTask = followUpSummary.next_follow_up_task;

                    return (
                      <button
                        key={`mobile-${quote.id}`}
                        type="button"
                        className={`min-h-12 w-full touch-manipulation rounded-md border p-4 text-left shadow-sm ${getFollowUpSurfaceClassName(followUpSummary)}`}
                        onClick={() => setSelectedQuote(quote)}
                        onTouchEnd={(event) => runMobileTouchAction(event, () => setSelectedQuote(quote))}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-950">{quote.customer_name}</p>
                            {getCompanyName(quote) && (
                              <p className="break-words text-sm font-semibold text-slate-800">{formatValue(getCompanyName(quote))}</p>
                            )}
                            <p className="break-words text-xs text-slate-600">{quote.customer_email}</p>
                            <p className="text-xs text-slate-600">{quote.customer_phone || '-'}</p>
                          </div>
                          <span className="flex-none rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {formatLabel(quote.status)}
                          </span>
                        </div>
                        <div className="mt-3 space-y-1">
                          <p className="text-sm font-medium text-slate-900">{getProjectTitle(quote)}</p>
                          <p className="text-xs text-slate-600">{getProductLabel(quote)}</p>
                          <p className="break-all text-xs text-slate-500">{quote.quote_id || quote.id}</p>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getFollowUpClassName(followUpSummary)}`}>
                            {getFollowUpBucketLabel(followUpSummary)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-slate-700">
                            <FileText className="h-3.5 w-3.5" />
                            {getFiles(quote).length} files
                          </span>
                          <span className="text-xs text-slate-500">{formatDate(quote.created_at)}</span>
                        </div>
                        {nextTask?.task_text && (
                          <div className="mt-3 rounded-md bg-white/70 p-3">
                            <p className="text-sm text-slate-900">{nextTask.task_text}</p>
                            <p className="mt-1 text-xs text-slate-500">Due {formatDueDate(nextTask.due_date)}</p>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="hidden overflow-x-auto md:block">
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
                            onTouchEnd={(event) => runMobileTouchAction(event, () => setSelectedQuote(quote))}
                          >
                            <TableCell>
                              <div className="min-w-[13rem] space-y-1">
                                <p className="font-medium text-slate-900">{quote.customer_name}</p>
                                {getCompanyName(quote) && (
                                  <p className="text-sm font-semibold text-slate-700">{formatValue(getCompanyName(quote))}</p>
                                )}
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
              </>
            )}
          </CardContent>
        </Card>

        <Card id="zoe-portal-report" className={`relative scroll-mt-24 border-slate-200 bg-slate-950 text-white shadow-sm ${guidedPortalReport ? 'ring-4 ring-[#fff600] ring-offset-4' : ''}`}>
          {guidedPortalReport && <div className="absolute -top-14 left-1/2 z-20 flex -translate-x-1/2 animate-bounce items-center gap-2 whitespace-nowrap rounded-xl bg-[#11152d] px-4 py-3 text-xs font-black uppercase text-[#fff600] shadow-xl">Send your mission report <ArrowDownRight className="h-5 w-5" /></div>}
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-md bg-white/10 p-2 text-cyan-200">
                <Bug className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg text-white">Report a Portal Issue</CardTitle>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  Tell BWB what broke, what confused you, or what would make this portal easier to use.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[14rem_1fr]">
              <select
                value={portalFeedbackType}
                onChange={(event) => setPortalFeedbackType(event.target.value)}
                className="h-11 rounded-md border border-white/10 bg-white px-3 text-sm text-slate-950"
              >
                <option value="bug">Something is broken</option>
                <option value="confusing">Something is confusing</option>
                <option value="idea">Improvement idea</option>
                <option value="customer">Customer/sale blocker</option>
              </select>
              <Textarea
                value={portalFeedbackMessage}
                onChange={(event) => setPortalFeedbackMessage(event.target.value)}
                rows={3}
                className="border-white/10 bg-white text-slate-950"
                placeholder="Example: I clicked Save Meeting and expected a calendar link, but nothing happened."
              />
            </div>
            {adminUser.rep_slug === 'zoe' && guidedPortalReport && (
              <div className="grid gap-3 rounded-xl border border-cyan-300/25 bg-white/5 p-3 md:grid-cols-[14rem_1fr]">
                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-cyan-200" htmlFor="zoe-test-result">Test result</label>
                  <select id="zoe-test-result" value={portalFeedbackResult} onChange={(event) => setPortalFeedbackResult(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-white/10 bg-white px-3 text-sm text-slate-950">
                    <option value="pass">Pass</option>
                    <option value="needs_fix">Needs Fix</option>
                  </select>
                </div>
                <FileUpload onFilesUploaded={setPortalFeedbackFiles} acceptedTypes="image/*,video/*" maxFiles={2} maxFileSizeMB={25} title="Add Screenshot or Short Recording" showCameraButton additionalTags={['zoe_mission_01', 'mobile_qa_evidence', 'rep_portal_feedback']} enforceMaxFilesError />
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className={`text-sm ${
                portalFeedbackState === 'error'
                  ? 'text-red-200'
                  : portalFeedbackState === 'sent'
                    ? 'text-emerald-200'
                    : 'text-slate-300'
              }`}>
                {portalFeedbackStatus || 'Your note saves with your rep name, email, portal path, and timestamp.'}
              </p>
              <Button
                type="button"
                onClick={() => void submitPortalFeedback()}
                disabled={portalFeedbackState === 'sending'}
                className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                {portalFeedbackState === 'sending' ? 'Sending...' : 'Send Issue'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {zoeNavigationPhase !== 'idle' && (
        <div className="fixed inset-x-3 bottom-4 z-[100] mx-auto max-w-lg rounded-2xl border-2 border-[#fff600] bg-[#11152d] p-4 text-center text-white shadow-2xl" role="status" aria-live="assertive">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#fff600]">Browser navigation test</p>
          <p className="mt-2 text-lg font-black">{zoeNavigationPhase === 'back' ? 'Press your browser Back button once.' : 'Great—now press your browser Forward button once.'}</p>
          <p className="mt-1 text-xs text-cyan-100">The portal should stay open and restore correctly.</p>
        </div>
      )}

      <Dialog open={quoteChooserOpen} onOpenChange={(open) => { if (!zoeEmptyCustomerCelebration) setQuoteChooserOpen(open); }}>
        <DialogContent className={`max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl overscroll-contain overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-all duration-700 sm:w-full sm:p-6 ${zoeEmptyCustomerCelebration ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
          <DialogHeader>
            <DialogTitle>Choose the customer you are quoting</DialogTitle>
            <DialogDescription>
              The customer’s saved lead information will open directly in the newer in-portal quote builder.
            </DialogDescription>
          </DialogHeader>

          {quotes.length === 0 ? (
            <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-cyan-300 bg-cyan-50 p-5 text-center">
              {zoeEmptyCustomerCelebration && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-800 text-white" role="status" aria-live="assertive">
                  <div className="absolute inset-0" aria-hidden="true">
                    {[...Array(12)].map((_, index) => <Star key={`zoe-star-${index}`} className="absolute h-6 w-6 animate-ping fill-yellow-300 text-yellow-300" style={{ left: `${8 + ((index * 17) % 84)}%`, top: `${8 + ((index * 23) % 75)}%`, animationDelay: `${index * 90}ms` }} />)}
                  </div>
                  <Sparkles className="relative h-12 w-12 text-yellow-300" />
                  <p className="relative mt-2 text-3xl font-black uppercase">Good job!</p>
                  <p className="relative mt-2 max-w-sm px-4 text-sm font-bold text-cyan-100">You noticed something was off: Refresh worked, but no customer appeared because none is assigned yet.</p>
                  <div className="relative mt-4 flex items-center gap-2 rounded-full bg-yellow-300 px-4 py-2 font-black text-slate-950"><Coins className="h-5 w-5" /> Mission coins earned</div>
                </div>
              )}
              <p className="font-bold text-slate-950">No assigned customers yet</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                The quote builder starts from a saved customer lead so information is not entered twice. Once a customer is assigned to this rep, they will appear here.
              </p>
              {adminUser.rep_slug === 'zoe' && <p className="mt-3 text-sm font-black text-violet-800">Do you notice something is off? Try refreshing and watch what happens.</p>}
              <Button type="button" variant="outline" className="mt-4 min-h-11 touch-manipulation bg-white" onClick={() => adminUser.rep_slug === 'zoe' ? void completeZoeEmptyCustomerDiscovery() : void loadPortal()} disabled={loadingQuotes || zoeEmptyCustomerCelebration}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loadingQuotes ? 'animate-spin' : ''}`} />
                Refresh Assigned Customers
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {quotes.map((quote) => (
                <button
                  key={`quote-chooser-${quote.id}`}
                  type="button"
                  className="flex min-h-20 w-full touch-manipulation items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-cyan-400 hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                  onClick={() => {
                    setQuoteChooserOpen(false);
                    startQuoteForCustomer(quote);
                  }}
                  onTouchEnd={(event) => runMobileTouchAction(event, () => {
                    setQuoteChooserOpen(false);
                    startQuoteForCustomer(quote);
                  })}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-slate-950">{quote.customer_name}</span>
                    <span className="mt-1 block truncate text-sm text-slate-600">{getProjectTitle(quote)} · {quote.customer_email}</span>
                    <span className="mt-1 block text-xs font-medium text-slate-500">{quote.quote_id || 'Saved customer record'}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-cyan-100 px-3 py-2 text-xs font-bold text-cyan-900">Open Quote Build</span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedQuote)}
        onOpenChange={(open) => {
          if (open) return;
          requestCloseSelectedQuoteDetail();
        }}
      >
        {selectedQuote && (
          <DialogContent
            className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-5xl overscroll-contain overflow-y-auto overflow-x-hidden p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:w-full sm:p-6"
            onEscapeKeyDown={(event) => event.preventDefault()}
            onInteractOutside={(event) => event.preventDefault()}
            onPointerDownOutside={(event) => event.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="break-words">{selectedQuote.quote_id || selectedQuote.customer_name}</DialogTitle>
              <DialogDescription>Read-only assigned quote details</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <section ref={quoteDetailsSectionRef}>
                <h3 className="mb-3 text-sm font-semibold text-slate-950">Customer</h3>
                <dl className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <DetailField label="Name" value={selectedQuote.customer_name} />
                  <DetailField label="Company" value={getCompanyName(selectedQuote)} />
                  <DetailField label="Email" value={selectedQuote.customer_email} />
                  <DetailField label="Phone" value={selectedQuote.customer_phone} />
                  <DetailField label="Preferred Contact" value={formatLabel(selectedQuote.preferred_contact)} />
                  <DetailField label="Status" value={formatLabel(selectedQuote.status)} />
                  <DetailField label="Product" value={getProductLabel(selectedQuote)} />
                  <DetailField label="Received" value={formatDate(selectedQuote.created_at)} />
                  <DetailField label="Order Number" value={selectedQuote.quote_id || selectedQuote.id} />
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
                  <Button
                    type="button"
                    size="sm"
                    className="min-h-12 touch-manipulation bg-cyan-400 font-bold text-slate-950 hover:bg-cyan-300"
                    onClick={() => startQuoteForCustomer(selectedQuote)}
                    onTouchEnd={(event) => runMobileTouchAction(event, () => startQuoteForCustomer(selectedQuote))}
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    Continue Quote Build Here
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-h-12 touch-manipulation border-orange-300 bg-orange-50 font-bold text-orange-900 hover:bg-orange-100"
                    onClick={() => setInvoiceBuilderOpen(true)}
                    onTouchEnd={(event) => runMobileTouchAction(event, () => setInvoiceBuilderOpen(true))}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Open Invoice / Quote
                  </Button>
                </div>

                {showWheelersTowingPage && (
                  <div className="mt-5 overflow-hidden rounded-xl border-2 border-red-200 bg-gradient-to-br from-red-50 via-white to-slate-50 shadow-sm">
                    <div className="border-b border-red-100 bg-slate-950 px-4 py-3 text-white sm:px-5">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-red-300">Website example ready</p>
                      <h3 className="mt-1 text-lg font-black">Wheeler's Towing one-page lead site</h3>
                    </div>
                    <div className="p-4 sm:p-5">
                      <p className="max-w-3xl text-sm leading-6 text-slate-700">
                        This live example was created for this order. Open it first, then send the same link to {selectedQuote.customer_name} by email or text.
                      </p>
                      <p className="mt-3 break-all rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                        {WHEELERS_TOWING_PAGE_URL}
                      </p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <Button asChild size="sm" className="bg-slate-950 font-bold text-white hover:bg-slate-800">
                          <a href={WHEELERS_TOWING_PAGE_URL} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open Live Page
                          </a>
                        </Button>
                        {wheelersEmailHref ? (
                          <Button asChild size="sm" className="bg-red-600 font-bold text-white hover:bg-red-500">
                            <a href={wheelersEmailHref}>
                              <Mail className="mr-2 h-4 w-4" />
                              Email Example
                            </a>
                          </Button>
                        ) : (
                          <Button size="sm" disabled>
                            <Mail className="mr-2 h-4 w-4" />
                            No Customer Email
                          </Button>
                        )}
                        {wheelersTextHref ? (
                          <Button asChild size="sm" variant="outline" className="border-red-200 bg-white font-bold text-red-700 hover:bg-red-50">
                            <a href={wheelersTextHref}>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Text Example
                            </a>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            No Customer Phone
                          </Button>
                        )}
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        Email and text buttons use the customer contact information already saved on this order and prepare the message for the rep to review before sending.
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {quoteContinuationOpen && (
                <section ref={quoteContinuationSectionRef} className="rounded-lg border-2 border-cyan-300 bg-gradient-to-br from-cyan-50 to-blue-50 p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-800">Same customer · same record</p>
                      <h3 className="mt-1 text-xl font-black text-slate-950">Begin the Quote Build</h3>
                      <p className="mt-1 text-sm text-slate-700">
                        The original lead form is complete. Use this handoff to begin building the actual quote without leaving this popup or entering the customer again.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      Lead information complete
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 rounded-md border border-cyan-200 bg-white p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <p><span className="block text-xs font-semibold uppercase text-slate-500">Customer</span>{formatValue(selectedQuote.customer_name)}</p>
                    <p><span className="block text-xs font-semibold uppercase text-slate-500">Vehicle</span>{formatValue(getVehicleValue(selectedQuote))}</p>
                    <p><span className="block text-xs font-semibold uppercase text-slate-500">Service</span>{formatValue(getSummaryValue(selectedQuote, ['selectedService', 'quoteType', 'intakeType']))}</p>
                    <p><span className="block text-xs font-semibold uppercase text-slate-500">Budget</span>{formatValue(getSummaryValue(selectedQuote, 'budget'))}</p>
                  </div>

                  {quoteBuildUpsellIdea && (
                    <div className="mt-4 grid gap-4 rounded-md border border-amber-300 bg-amber-50 p-3 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-center">
                      {(quoteBuildUpsellIdea.images?.length ? quoteBuildUpsellIdea.images : quoteBuildUpsellIdea.imageUrl ? [{ url: quoteBuildUpsellIdea.imageUrl, name: quoteBuildUpsellIdea.imageName }] : []).length > 0 && (
                        <div className="grid gap-2">
                          {(quoteBuildUpsellIdea.images?.length ? quoteBuildUpsellIdea.images : quoteBuildUpsellIdea.imageUrl ? [{ url: quoteBuildUpsellIdea.imageUrl, name: quoteBuildUpsellIdea.imageName }] : []).map((image, index) => (
                            <img
                              key={`${image.url}-${index}`}
                              src={image.url}
                              alt={image.name || quoteBuildUpsellIdea.title}
                              className="max-h-44 w-full rounded-md border border-amber-200 bg-white object-contain"
                            />
                          ))}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-amber-800">Quote started from upsell image</p>
                        <p className="mt-1 font-bold text-amber-950">{quoteBuildUpsellIdea.title}</p>
                        {quoteBuildUpsellIdea.message && (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{quoteBuildUpsellIdea.message}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 rounded-lg border-2 border-violet-300 bg-violet-50 p-4">
                    <div className="mb-3">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">Website build reference</p>
                      <h4 className="mt-1 text-lg font-black text-violet-950">Upload Hero or Logo Reference Photo</h4>
                      <p className="mt-1 text-sm text-violet-900">
                        Take a photo or choose one from your phone. When a reference is uploaded, the website build must use it, clean it up, remove the background, and keep the complete logo readable on Android and iPhone screens.
                      </p>
                    </div>
                      <FileUpload
                        onFilesUploaded={setWebsiteHeroReferenceFiles}
                        quoteId={selectedQuote.quote_id || selectedQuote.id}
                        acceptedTypes="image/*"
                        maxFiles={4}
                        maxFileSizeMB={20}
                        title="Upload Website Hero Reference Photos"
                      showCameraButton
                      additionalTags={['website_hero_reference', 'logo_reference', 'transparent_background_required', 'mobile_safe_logo']}
                      enforceMaxFilesError
                    />
                    <p className="mt-3 whitespace-pre-line rounded-md border border-violet-200 bg-white p-3 text-xs font-medium leading-5 text-violet-950">
                      {WEBSITE_HERO_REFERENCE_RULE}
                    </p>
                  </div>

                  <div className="mt-4">
                    <label htmlFor="quote-preparation-notes" className="text-sm font-semibold text-slate-900">Quote preparation notes</label>
                    <Textarea
                      id="quote-preparation-notes"
                      value={quotePreparationNotes}
                      onChange={(event) => {
                        setQuotePreparationNotes(event.target.value);
                        setQuoteContinuationError('');
                        setQuoteContinuationStatus('');
                      }}
                      placeholder="Add anything the quote builder should know: pricing direction, measurements needed, upsells, design scope, or customer expectations."
                      className="mt-2 bg-white"
                      rows={4}
                    />
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Button
                      type="button"
                      onClick={() => void saveQuoteContinuation()}
                      onTouchEnd={(event) => runMobileTouchAction(event, () => void saveQuoteContinuation())}
                      disabled={savingQuoteContinuation}
                      className="min-h-12 flex-1 touch-manipulation bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-white hover:from-cyan-400 hover:to-blue-500"
                    >
                      <Calculator className="mr-2 h-4 w-4" />
                      {savingQuoteContinuation ? 'Saving...' : 'Save & Start Quote Build'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={returnToCustomerDetails}
                      onTouchEnd={(event) => runMobileTouchAction(event, returnToCustomerDetails)}
                      className="min-h-12 touch-manipulation"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Customer Details
                    </Button>
                  </div>

                  {quoteContinuationStatus && (
                    <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{quoteContinuationStatus}</p>
                  )}
                  {quoteContinuationError && (
                    <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{quoteContinuationError}</p>
                  )}
                </section>
              )}

              {invoiceBuilderOpen && (
                <QuoteInvoiceBuilder
                  quoteRequestId={selectedQuote.id}
                  orderNumber={selectedQuote.quote_id || selectedQuote.id}
                  customerName={selectedQuote.customer_name}
                  customerEmail={selectedQuote.customer_email}
                  customerPhone={selectedQuote.customer_phone || ''}
                  customerCompany={String(getSummaryValue(selectedQuote, 'companyName') || '')}
                  projectDescription={[
                    String(getSummaryValue(selectedQuote, 'manualVehicleDescription') || ''),
                    String(getSummaryValue(selectedQuote, ['selectedService', 'quoteType']) || '')
                  ].filter(Boolean).join(' · ') || getProjectTitle(selectedQuote)}
                />
              )}

              <section className="rounded-md border border-blue-200 bg-blue-50/60 p-4">
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-blue-950">Log Customer Meeting</h3>
                    <p className="text-xs text-blue-800">
                      Save what happened, schedule the next step, and keep the job moving.
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-blue-800 ring-1 ring-blue-200">
                    Rep note
                  </span>
                </div>
                <div className="grid min-w-0 gap-3 xl:grid-cols-[1.1fr_0.75fr_0.65fr]">
                  <Textarea
                    value={meetingNotes}
                    onChange={(event) => {
                      setMeetingNotes(event.target.value);
                      setMeetingError('');
                      setMeetingMessage('');
                    }}
                    placeholder="Example: I met with the customer. They want a full wrap, budget is tight, and they care most about music promo visibility."
                    className="min-h-[132px] bg-white"
                    aria-label="Customer meeting notes"
                  />
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold uppercase text-blue-900" htmlFor="meeting-next-step">
                      Next step required
                    </label>
                    <Input
                      id="meeting-next-step"
                      value={meetingNextStep}
                      onChange={(event) => {
                        setMeetingNextStep(event.target.value);
                        setMeetingError('');
                        setMeetingMessage('');
                      }}
                      placeholder="Example: Call with quote price"
                      className="bg-white"
                      aria-label="Meeting next step"
                      required
                    />
                    <label className="block text-xs font-semibold uppercase text-blue-900" htmlFor="meeting-due-date">
                      Date required
                    </label>
                    <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <Input
                        ref={meetingDueDateInputRef}
                        id="meeting-due-date"
                        type="date"
                        min={getTodayInputValue()}
                        value={meetingDueDate}
                        onChange={(event) => {
                          setMeetingDueDate(event.target.value);
                          setMeetingError('');
                          setMeetingMessage('');
                        }}
                        className="bg-white"
                        aria-label="Meeting next step due date"
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const dateInput = meetingDueDateInputRef.current;
                          if (dateInput && 'showPicker' in dateInput) {
                            dateInput.showPicker();
                            return;
                          }
                          dateInput?.focus();
                        }}
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        Open Calendar
                      </Button>
                    </div>
                    {(meetingError || meetingMessage) && (
                      <div
                        className={`rounded-md border p-3 text-sm font-medium ${
                          meetingError
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {meetingError || meetingMessage}
                      </div>
                    )}
                    <Button onClick={saveCustomerMeeting} disabled={savingMeeting} className="w-full">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      {savingMeeting ? 'Saving...' : 'Save Meeting'}
                    </Button>
                  </div>
                  <div className="flex min-h-[132px] flex-col justify-between rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950">
                    <div>
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-white text-amber-700 ring-1 ring-amber-200">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <p className="text-lg font-black leading-tight">
                        If you do not schedule it, it is not happening.
                      </p>
                      <p className="mt-2 text-sm leading-5 text-amber-900">
                        Pick the date before you save. The reminder becomes the next action below.
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm font-bold text-amber-800">
                      <ArrowDownRight className="h-5 w-5" />
                      Pointing at the calendar
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-md border border-violet-200 bg-violet-50/70 p-4">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-violet-950">Office Dialogue</h3>
                  <p className="mt-1 text-xs text-violet-800">
                    Messages, upsell images, and their notes stay in one growing customer list. Each upsell image can be sent directly into this customer's quote build.
                  </p>
                </div>

                <div className="space-y-3">
                  {loadingOfficeNotes ? (
                    <p className="text-sm text-violet-800">Loading office messages...</p>
                  ) : officeNotes.length === 0 ? (
                    <p className="rounded-md border border-violet-100 bg-white p-3 text-sm text-slate-600">No office messages yet.</p>
                  ) : (
                    officeNotes.map((note) => {
                      const upsellIdea = parseUpsellImageIdea(note.note_text);
                      const upsellImages = upsellIdea?.images?.length
                        ? upsellIdea.images
                        : upsellIdea?.imageUrl
                          ? [{ url: upsellIdea.imageUrl, name: upsellIdea.imageName }]
                          : [];
                      return (
                      <div key={note.id} className={`rounded-md border p-3 ${upsellIdea ? 'border-amber-200 bg-amber-50' : 'border-violet-100 bg-white'}`}>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-violet-700">{note.created_by}</span>
                          <time className="text-xs text-slate-500">{formatDate(note.created_at)}</time>
                        </div>
                        {upsellIdea ? (
                          <div className="space-y-3">
                            {upsellImages.length > 0 && (
                              <div className="grid gap-2 sm:grid-cols-2">
                                {upsellImages.map((image, index) => isPdfAttachment(image) ? (
                                  <a
                                    key={`${image.url}-${index}`}
                                    href={image.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex min-h-36 touch-manipulation flex-col items-center justify-center rounded-md border border-amber-300 bg-white p-5 text-center text-slate-900 active:bg-amber-50"
                                    aria-label={`Open PDF ${image.name || upsellIdea.title}`}
                                  >
                                    <FileText className="h-12 w-12 text-red-700" />
                                    <span className="mt-3 break-all text-sm font-bold">{image.name || 'Proposal.pdf'}</span>
                                    <span className="mt-2 inline-flex items-center text-sm font-semibold text-amber-800">Open PDF <ExternalLink className="ml-1 h-4 w-4" /></span>
                                  </a>
                                ) : (
                                  <button
                                    key={`${image.url}-${index}`}
                                    type="button"
                                    className="group relative min-h-48 overflow-hidden rounded-md border border-amber-200 bg-white"
                                    onClick={() => setUpsellImagePreview({ url: image.url, name: image.name, title: upsellIdea.title })}
                                    aria-label={`Open ${image.name || upsellIdea.title} larger`}
                                  >
                                    <img src={image.url} alt={image.name || upsellIdea.title} className="max-h-80 w-full object-contain transition duration-150 group-hover:scale-[1.01]" />
                                    <span className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/70 text-white opacity-90 shadow-sm"><Maximize2 className="h-4 w-4" /></span>
                                  </button>
                                ))}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-amber-950">Upsell idea: {upsellIdea.title}</p>
                              {upsellIdea.message && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{upsellIdea.message}</p>}
                              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                                <Button
                                  type="button"
                                  size="sm"
                                  className="min-h-12 w-full touch-manipulation bg-amber-500 font-bold text-amber-950 hover:bg-amber-400 sm:w-auto"
                                  onClick={() => startQuoteFromUpsell(upsellIdea)}
                                  onTouchEnd={(event) => runMobileTouchAction(event, () => startQuoteFromUpsell(upsellIdea))}
                                >
                                  <Calculator className="mr-2 h-4 w-4" />
                                  Make a Quote
                                </Button>
                                {upsellImages.filter((image) => image.url && isPdfAttachment(image)).map((pdf) => (
                                  <Button
                                    key={`${pdf.url}-send`}
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="min-h-14 w-full touch-manipulation whitespace-normal border-emerald-600 bg-emerald-50 px-4 text-base font-bold text-emerald-800 hover:bg-emerald-100 sm:w-auto"
                                    disabled={Boolean(sendingPdfUrl)}
                                    onClick={() => void sendPdfProposal({ url: pdf.url, name: pdf.name })}
                                  >
                                    <Mail className="mr-2 h-4 w-4" />
                                    {sendingPdfUrl === pdf.url ? 'Sending PDF…' : 'Send PDF to Customer'}
                                  </Button>
                                ))}
                                {upsellImages.map((image, index) => (
                                  <a
                                    key={`${image.url}-link-${index}`}
                                    href={image.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center text-xs font-semibold text-amber-800 underline"
                                  >
                                    {isPdfAttachment(image) ? 'Open PDF' : `Open image ${index + 1}`} <ExternalLink className="ml-1 h-3 w-3" />
                                  </a>
                                ))}
                              </div>
                              {upsellImages.map((image) => pdfSendStatus[image.url] ? (
                                <p key={`${image.url}-status`} className={`mt-2 text-xs font-semibold ${pdfSendStatus[image.url].type === 'error' ? 'text-red-700' : 'text-emerald-700'}`} role="status">
                                  {pdfSendStatus[image.url].message}
                                </p>
                              ) : null)}
                            </div>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap text-sm text-slate-900">{note.note_text}</p>
                        )}
                      </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-amber-950">Upsell Image Idea</p>
                      <p className="mt-1 text-xs text-amber-800">Capture a sign, vehicle, storefront, or other opportunity worth offering.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
                      onClick={() => setShowRepUpsellComposer((current) => !current)}
                    >
                      <ImagePlus className="mr-2 h-4 w-4" />
                      {showRepUpsellComposer ? 'Close' : 'Add Image Idea'}
                    </Button>
                  </div>

                  {showRepUpsellComposer && (
                    <div className="mt-4 space-y-3 rounded-md border border-amber-200 bg-white p-3">
                      <Input value={repUpsellTitle} onChange={(event) => setRepUpsellTitle(event.target.value)} placeholder="Example: Replace the faded roadside sign" />
                      <Textarea value={repUpsellMessage} onChange={(event) => setRepUpsellMessage(event.target.value)} placeholder="Explain what you noticed and what could be offered." rows={3} />
                      <FileUpload
                        onFilesUploaded={handleRepUpsellFilesUploaded}
                        quoteId={selectedQuote.quote_id || selectedQuote.id}
                        acceptedTypes="image/*"
                        maxFiles={25}
                        maxFileSizeMB={15}
                        title="Upload Opportunity Images"
                        showCameraButton
                        additionalTags={['upsell_idea', 'office_dialogue']}
                        enforceMaxFilesError
                      />
                      <p className="text-xs text-slate-600">Add up to 25 photos using one selection or several batches. Uploaded photos save automatically.</p>
                      <Button
                        type="button"
                        onClick={() => void saveRepUpsellIdea()}
                        disabled={savingRepUpsell || !repUpsellFiles.some((file) => Boolean(file.url))}
                        className="w-full bg-amber-500 font-bold text-amber-950 hover:bg-amber-400"
                      >
                        <ImagePlus className="mr-2 h-4 w-4" />
                        {savingRepUpsell ? 'Saving...' : 'Save Upsell Image Idea'}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-md border border-violet-200 bg-white p-3">
                  <Textarea
                    value={newOfficeMessage}
                    onChange={(event) => {
                      setNewOfficeMessage(event.target.value);
                      setOfficeMessageError('');
                      setOfficeMessageStatus('');
                    }}
                    placeholder="Example: Can the shop confirm the install timing, or can SlapWrapz help answer this pricing question?"
                    rows={4}
                  />
                  <Button
                    type="button"
                    onClick={() => void sendOfficeMessage()}
                    disabled={savingOfficeMessage || !newOfficeMessage.trim()}
                    className="mt-3 w-full bg-violet-600 text-white hover:bg-violet-500"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {savingOfficeMessage ? 'Sending...' : 'Save & Send to SlapWrapz Quotes'}
                  </Button>
                  {officeMessageStatus && <p className="mt-3 text-sm font-medium text-emerald-700">{officeMessageStatus}</p>}
                  {officeMessageError && <p className="mt-3 text-sm font-medium text-red-700">{officeMessageError}</p>}
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-950">Project</h3>
                <dl className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailField label="Service" value={getSummaryValue(selectedQuote, ['selectedService', 'quoteType', 'intakeType'])} />
                  <DetailField label="Company" value={getCompanyName(selectedQuote)} />
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
                  <dl className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                    <DetailField label="AI Design Prompt" value={getBannerValue(selectedQuote, 'aiDesignPrompt')} />
                    <DetailField label="Saved Design Preview" value={getBannerValue(selectedQuote, 'aiDesignPreviewSaved')} />
                    <DetailField label="Deadline" value={getBannerValue(selectedQuote, 'deadline')} />
                    <DetailField label="Delivery Method" value={getBannerValue(selectedQuote, 'deliveryMethod')} />
                    <DetailField label="Banner Text" value={getBannerValue(selectedQuote, 'bannerText')} />
                    <DetailField label="Brand Colors" value={getBannerValue(selectedQuote, 'brandColors')} />
                    <DetailField label="Building / Placement Notes" value={getBannerValue(selectedQuote, 'placementNotes')} />
                    <DetailField label="Notes" value={getBannerValue(selectedQuote, 'notes')} />
                  </dl>
                </section>
              )}

              {getSummaryValue(selectedQuote, ['signage', 'sign']) && (
                <section>
                  <h3 className="mb-3 text-sm font-semibold text-slate-950">Signage Details</h3>
                  <dl className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

              {getSummaryValue(selectedQuote, ['sticker', 'decal']) && (
                <section>
                  <h3 className="mb-3 text-sm font-semibold text-slate-950">Sticker & Decal Details</h3>
                  <dl className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <DetailField label="Decal Type" value={getStickerValue(selectedQuote, 'decalType')} />
                    <DetailField label="Material" value={getStickerValue(selectedQuote, 'material')} />
                    <DetailField label="Width" value={getStickerValue(selectedQuote, 'width')} />
                    <DetailField label="Height" value={getStickerValue(selectedQuote, 'height')} />
                    <DetailField label="Unit" value={getStickerValue(selectedQuote, 'unit')} />
                    <DetailField label="Quantity" value={getStickerValue(selectedQuote, 'quantity')} />
                    <DetailField label="Application Surface" value={getStickerValue(selectedQuote, 'surface')} />
                    <DetailField label="Finish" value={getStickerValue(selectedQuote, 'finish')} />
                    <DetailField label="Decal Text" value={getStickerValue(selectedQuote, 'decalText')} />
                    <DetailField label="Notes" value={getStickerValue(selectedQuote, 'notes')} />
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
                  <div className="grid min-w-0 gap-3 md:grid-cols-2">
                    {selectedFiles.map((file, index) => (
                      <a
                        key={file.id || file.url || index}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-800 hover:bg-slate-50"
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

      {upsellImagePreview && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 p-3 sm:p-6">
          <div className="relative flex max-h-[94dvh] w-full max-w-6xl flex-col rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">{upsellImagePreview.name || upsellImagePreview.title}</p>
                <p className="text-xs text-slate-500">Upsell image preview</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 flex-none"
                onClick={() => setUpsellImagePreview(null)}
                aria-label="Close image preview"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-2">
              <img
                src={upsellImagePreview.url}
                alt={upsellImagePreview.name || upsellImagePreview.title}
                className="mx-auto max-h-[78dvh] w-auto max-w-full rounded-md object-contain"
              />
            </div>
            <div className="flex justify-end border-t border-slate-200 p-3">
              <Button variant="outline" asChild>
                <a href={upsellImagePreview.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Original
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}

      {meetingSuccessOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-lg border border-emerald-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
              <CalendarDays className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-950">Next step is scheduled.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Now look below at your timeline and push it to completion. Never forget again:
              use the next action, due date, follow-up tasks, and timeline until the job is finished.
            </p>
            {lastMeetingCalendarEvent && (
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Button variant="outline" asChild>
                  <a href={buildGoogleCalendarHref(lastMeetingCalendarEvent)} target="_blank" rel="noreferrer">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Google Calendar
                  </a>
                </Button>
                <Button variant="outline" onClick={() => downloadCalendarFile(lastMeetingCalendarEvent)}>
                  <Download className="mr-2 h-4 w-4" />
                  Calendar File
                </Button>
              </div>
            )}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => setMeetingSuccessOpen(false)} className="flex-1">
                Look at Timeline
              </Button>
              <Button variant="outline" onClick={() => setMeetingSuccessOpen(false)} className="flex-1">
                Keep Working
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepPortal;
