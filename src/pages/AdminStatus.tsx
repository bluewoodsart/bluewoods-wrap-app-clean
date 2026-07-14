import { type ChangeEvent, type MouseEvent, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, Copy, Download, ExternalLink, Eye, MessageSquare, Phone, RefreshCw, Search, Send, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { supabase } from '@/lib/supabase';

const STATUS_OPTIONS = [
  'new',
  'contacted',
  'quote_sent',
  'deposit_received',
  'design_started',
  'proof_sent',
  'approved',
  'printing',
  'install_scheduled',
  'completed',
  'lost'
] as const;

const STATUS_GROUPS: Array<{ label: string; statuses: Array<typeof STATUS_OPTIONS[number]> }> = [
  {
    label: 'Sales',
    statuses: ['new', 'contacted', 'quote_sent', 'lost']
  },
  {
    label: 'Money',
    statuses: ['deposit_received']
  },
  {
    label: 'Design / Approval',
    statuses: ['design_started', 'proof_sent', 'approved']
  },
  {
    label: 'Production',
    statuses: ['printing', 'install_scheduled', 'completed']
  }
];

const CUSTOMER_ACTION_REQUEST_OPTIONS = [
  { value: 'vehicle_photos', label: 'Vehicle photos' },
  { value: 'logo_artwork', label: 'Logo / artwork' },
  { value: 'better_quality_artwork', label: 'Better quality artwork' },
  { value: 'measurements', label: 'Measurements' },
  { value: 'other', label: 'Other' }
] as const;

type QuoteStatus = typeof STATUS_OPTIONS[number];
type CustomerActionRequestType = typeof CUSTOMER_ACTION_REQUEST_OPTIONS[number]['value'];
type QuoteData = Record<string, unknown>;
type FollowUpBucket = 'overdue' | 'due_today' | 'upcoming' | 'none';
type FollowUpFilter = 'all' | 'overdue' | 'due_today' | 'open' | 'none';
type QuoteListView = 'active' | 'archived';
type QuickQuoteFilter = 'all' | 'junk';
type ProofMode = 'single' | 'multi';

interface CustomerProofOption {
  id: string;
  quote_request_id?: string;
  label: string;
  sort_order: number;
  image_url: string;
  admin_note: string | null;
  is_active?: boolean;
  created_at?: string;
}
type AdminRole = 'owner_admin' | 'staff' | 'sales_rep';

const UNASSIGNED_REP_VALUE = '__unassigned__';
const ALL_REPS_FILTER_VALUE = '__all_reps__';

interface UploadedFileSummary {
  id?: string;
  name?: string;
  url?: string;
  type?: string;
  size?: number;
  tags?: string[];
}

interface QuoteRequestRow {
  id: string;
  quote_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  preferred_contact: string | null;
  rep_slug: string | null;
  rep_email: string | null;
  assigned_rep_name: string | null;
  status: string;
  product_type?: string | null;
  quote_data: QuoteData | null;
  uploaded_files: UploadedFileSummary[] | string | null;
  customer_proof_token: string | null;
  customer_proof_image_url: string | null;
  customer_proof_payment_url: string | null;
  customer_proof_status: string | null;
  customer_proof_approved_at: string | null;
  customer_proof_revision_requested_at: string | null;
  customer_proof_revision_message: string | null;
  customer_proof_mode?: ProofMode | null;
  customer_proof_options?: CustomerProofOption[] | string | null;
  selected_customer_proof_option_id?: string | null;
  selected_customer_proof_option_label?: string | null;
  selected_customer_proof_option_image_url?: string | null;
  customer_proof_selection_message?: string | null;
  customer_proof_selected_at?: string | null;
  created_at: string;
}

interface QuoteStatusEvent {
  id: string;
  event_type: string;
  status: string | null;
  message: string | null;
  created_at: string;
}

interface QuoteInternalNote {
  id: string;
  quote_request_id: string;
  note_text: string;
  created_by: string;
  created_at: string;
}

interface QuoteFollowUpTask {
  id: string;
  quote_request_id: string;
  task_text: string;
  due_date: string;
  status: 'open' | 'completed';
  created_by: string;
  created_at: string;
  completed_at: string | null;
}

interface QuoteFollowUpSummary {
  quote_request_id: string;
  next_follow_up_task_id: string | null;
  next_follow_up_task_text: string | null;
  next_follow_up_due_date: string | null;
  open_follow_up_count: number;
  overdue_follow_up_count: number;
  due_today_follow_up_count: number;
  upcoming_follow_up_count: number;
  follow_up_bucket: FollowUpBucket;
}

interface AssignableRepOption {
  rep_slug: string;
  assigned_rep_name: string;
  rep_email: string;
  type: string;
  status: string;
}

interface QuoteCustomerActionRequest {
  id: string;
  quote_request_id: string;
  request_type: CustomerActionRequestType;
  request_types: CustomerActionRequestType[] | string[] | null;
  message: string;
  customer_email: string;
  status: string;
  created_by: string;
  created_at: string;
  sent_at: string;
}

interface DesignerPacket {
  id: string;
  quote_request_id: string;
  token: string;
  designer_email: string;
  designer_name: string | null;
  instructions: string;
  cloud_folder_url: string | null;
  status: string;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  notes?: Array<{
    id: string;
    author_type: string;
    author_email: string | null;
    note_text: string;
    created_at: string;
  }> | string | null;
  files?: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: string | null;
    file_size: number | null;
    created_at: string;
  }> | string | null;
}

const getCustomerActionRequestLabel = (requestType: string) =>
  CUSTOMER_ACTION_REQUEST_OPTIONS.find((option) => option.value === requestType)?.label || formatStatusLabel(requestType);

const getCustomerActionRequestLabels = (requestTypes: string[]) =>
  requestTypes.map(getCustomerActionRequestLabel);

const getStoredCustomerActionRequestTypes = (request: QuoteCustomerActionRequest) => {
  if (Array.isArray(request.request_types) && request.request_types.length > 0) {
    return request.request_types;
  }

  return request.request_type ? [request.request_type] : [];
};

const getDefaultCustomerActionMessage = () =>
  'We reviewed your wrap request and need a few more items to move your quote forward. Please reply to this email with the requested information or files.';

const formatStatusLabel = (status: string) =>
  status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));

const formatDueDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(`${value}T00:00:00`));

const getPhoneHref = (phone: string | null | undefined, scheme: 'tel' | 'sms') => {
  const normalizedPhone = (phone || '').replace(/[^\d+]/g, '');
  return normalizedPhone ? `${scheme}:${normalizedPhone}` : undefined;
};

const FOLLOW_UP_FILTERS: Array<{ value: FollowUpFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'due_today', label: 'Due today' },
  { value: 'open', label: 'Open follow-ups' },
  { value: 'none', label: 'No follow-up' }
];

const getEmptyFollowUpSummary = (quoteRequestId: string): QuoteFollowUpSummary => ({
  quote_request_id: quoteRequestId,
  next_follow_up_task_id: null,
  next_follow_up_task_text: null,
  next_follow_up_due_date: null,
  open_follow_up_count: 0,
  overdue_follow_up_count: 0,
  due_today_follow_up_count: 0,
  upcoming_follow_up_count: 0,
  follow_up_bucket: 'none'
});

const getFollowUpBucketLabel = (bucket: FollowUpBucket) => {
  if (bucket === 'overdue') return 'Overdue';
  if (bucket === 'due_today') return 'Due today';
  if (bucket === 'upcoming') return 'Upcoming';
  return 'No follow-up';
};

const getFollowUpBadgeClassName = (bucket: FollowUpBucket) => {
  if (bucket === 'overdue') return 'bg-red-100 text-red-700 ring-1 ring-red-200';
  if (bucket === 'due_today') return 'bg-amber-100 text-amber-800 ring-1 ring-amber-200';
  if (bucket === 'upcoming') return 'bg-blue-100 text-blue-700 ring-1 ring-blue-200';
  return 'bg-slate-100 text-slate-600';
};

const getFollowUpSurfaceClassName = (bucket: FollowUpBucket) => {
  if (bucket === 'overdue') return 'bg-red-50/80 hover:bg-red-50';
  if (bucket === 'due_today') return 'bg-amber-50/80 hover:bg-amber-50';
  if (bucket === 'upcoming') return 'bg-blue-50/45 hover:bg-blue-50';
  return 'hover:bg-slate-50';
};

const getStatusBadgeClassName = (status: string) => {
  if (status === 'new') return 'border-blue-200 bg-blue-50 text-blue-800';
  if (status === 'contacted') return 'border-cyan-200 bg-cyan-50 text-cyan-800';
  if (status === 'quote_sent') return 'border-violet-200 bg-violet-50 text-violet-800';
  if (status === 'deposit_received') return 'border-amber-200 bg-amber-50 text-amber-900';
  if (status === 'design_started') return 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800';
  if (status === 'proof_sent') return 'border-indigo-200 bg-indigo-50 text-indigo-800';
  if (status === 'approved') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'printing') return 'border-teal-200 bg-teal-50 text-teal-800';
  if (status === 'install_scheduled') return 'border-green-200 bg-green-50 text-green-800';
  if (status === 'completed') return 'border-slate-200 bg-slate-100 text-slate-700';
  if (status === 'lost') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-slate-200 bg-white text-slate-700';
};

const getStatusSelectClassName = (status: string) => {
  if (status === 'new') return 'border-blue-200 bg-blue-50 text-blue-900';
  if (status === 'contacted') return 'border-cyan-200 bg-cyan-50 text-cyan-900';
  if (status === 'quote_sent') return 'border-violet-200 bg-violet-50 text-violet-900';
  if (status === 'deposit_received') return 'border-amber-200 bg-amber-50 text-amber-950';
  if (status === 'design_started') return 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900';
  if (status === 'proof_sent') return 'border-indigo-200 bg-indigo-50 text-indigo-900';
  if (status === 'approved') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  if (status === 'printing') return 'border-teal-200 bg-teal-50 text-teal-900';
  if (status === 'install_scheduled') return 'border-green-200 bg-green-50 text-green-900';
  if (status === 'completed') return 'border-slate-200 bg-slate-100 text-slate-800';
  if (status === 'lost') return 'border-red-200 bg-red-50 text-red-800';
  return 'border-slate-200 bg-white text-slate-900';
};

const getStatusRowClassName = (status: string) => {
  if (status === 'new') return 'border-l-4 border-l-blue-300';
  if (status === 'contacted') return 'border-l-4 border-l-cyan-300';
  if (status === 'quote_sent') return 'border-l-4 border-l-violet-300';
  if (status === 'deposit_received') return 'border-l-4 border-l-amber-300';
  if (status === 'design_started') return 'border-l-4 border-l-fuchsia-300';
  if (status === 'proof_sent') return 'border-l-4 border-l-indigo-300';
  if (status === 'approved') return 'border-l-4 border-l-emerald-300';
  if (status === 'printing') return 'border-l-4 border-l-teal-300';
  if (status === 'install_scheduled') return 'border-l-4 border-l-green-300';
  if (status === 'completed') return 'border-l-4 border-l-slate-300';
  if (status === 'lost') return 'border-l-4 border-l-red-300';
  return 'border-l-4 border-l-transparent';
};

const isFollowUpOverdue = (task: QuoteFollowUpTask) => {
  if (task.status !== 'open') return false;

  const dueDate = new Date(`${task.due_date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return dueDate < today;
};

const getFollowUpTaskBucket = (task: QuoteFollowUpTask): FollowUpBucket => {
  if (task.status !== 'open') return 'none';

  const dueDate = new Date(`${task.due_date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dueDate < today) return 'overdue';
  if (dueDate.getTime() === today.getTime()) return 'due_today';
  return 'upcoming';
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
};

const getQuoteValue = (quote: QuoteRequestRow, keys: string | string[]) => {
  const keyList = Array.isArray(keys) ? keys : [keys];
  if (!quote.quote_data) return undefined;

  for (const key of keyList) {
    if (Object.prototype.hasOwnProperty.call(quote.quote_data, key)) {
      return quote.quote_data[key];
    }
  }

  return undefined;
};

const getProductType = (quote: QuoteRequestRow) => {
  const storedProductType = typeof quote.product_type === 'string' ? quote.product_type.trim() : '';
  const quoteDataProductType = getQuoteValue(quote, 'productType');

  return (
    storedProductType ||
    (typeof quoteDataProductType === 'string' ? quoteDataProductType.trim() : '') ||
    'wrap'
  ).toLowerCase();
};

const getProductLabel = (quote: QuoteRequestRow) => {
  const productType = getProductType(quote);
  if (productType === 'banner') return 'Banner';
  if (productType === 'sign' || productType === 'signage') return 'Generic Signage';
  return 'Wrap';
};

const getQuoteSearchText = (quote: QuoteRequestRow) =>
  [
    quote.customer_name,
    quote.customer_email,
    quote.customer_phone,
    quote.quote_id,
    quote.status,
    quote.product_type,
    quote.rep_slug,
    quote.rep_email,
    quote.assigned_rep_name,
    getProductLabel(quote),
    quote.quote_data ? JSON.stringify(quote.quote_data) : ''
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const isLikelyJunkQuote = (quote: QuoteRequestRow) => {
  const searchText = getQuoteSearchText(quote);
  return [
    'test',
    'example.com',
    'upload.verify',
    'demo',
    'junk',
    'placeholder',
    'no response giver'
  ].some((pattern) => searchText.includes(pattern));
};

const getProductBadgeClassName = (quote: QuoteRequestRow) => {
  const productType = getProductType(quote);
  if (productType === 'banner') return 'bg-emerald-100 text-emerald-700';
  if (productType === 'sign' || productType === 'signage') return 'bg-amber-100 text-amber-800';
  return 'bg-blue-100 text-blue-700';
};

const getQuoteFileCount = (quote: QuoteRequestRow) => getUploadedFiles(quote).length;

const getAssignedChannelLabel = (quote: QuoteRequestRow) => {
  if (quote.rep_slug) return `Rep: ${quote.rep_slug}`;
  if (quote.rep_email) return quote.rep_email;
  return 'Direct / Blue Woods';
};

const getCustomerProofLink = (token: string | null | undefined) =>
  token ? `${window.location.origin}/proof/${token}` : '';

const getDesignerPacketLink = (token: string | null | undefined) =>
  token ? `${window.location.origin}/designer/${token}` : '';

const getSafeProofFileName = (fileName: string) =>
  fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'proof-upload';

const getCustomerProofOptions = (quote: QuoteRequestRow | null | undefined) => {
  if (!quote?.customer_proof_options) return [];
  if (Array.isArray(quote.customer_proof_options)) return quote.customer_proof_options;

  try {
    const parsedOptions = JSON.parse(quote.customer_proof_options);
    return Array.isArray(parsedOptions) ? parsedOptions as CustomerProofOption[] : [];
  } catch {
    return [];
  }
};

const getDesignerPacketDefaultInstructions = (quote: QuoteRequestRow) => {
  const productLabel = getProductLabel(quote);
  const lines = [
    `Please review and design the ${productLabel.toLowerCase()} proof for ${quote.customer_name}.`,
    '',
    `Customer: ${quote.customer_name}`,
    `Quote ID: ${quote.quote_id || quote.id}`,
    `Product: ${productLabel}`,
    quote.rep_slug ? `Rep: ${quote.rep_slug}` : '',
    '',
    'Use the attached customer/reference files and quote notes. Send proof files, working files, and any questions back through this designer packet link so the job stays connected to the quote.'
  ];

  const productType = getProductType(quote);
  if (productType === 'banner') {
    lines.push(
      '',
      'Banner details:',
      `- Size: ${formatValue(getBannerValue(quote, 'width'))} x ${formatValue(getBannerValue(quote, 'height'))} ${formatValue(getBannerValue(quote, 'unit'))}`,
      `- Banner text: ${formatValue(getBannerValue(quote, 'bannerText'))}`,
      `- Brand colors: ${formatValue(getBannerValue(quote, 'brandColors'))}`,
      `- Placement notes: ${formatValue(getBannerValue(quote, 'placementNotes'))}`,
      `- AI/design prompt: ${formatValue(getBannerValue(quote, 'aiDesignPrompt'))}`
    );
  }

  if (productType === 'sign' || productType === 'signage') {
    lines.push(
      '',
      'Signage details:',
      `- Size: ${formatValue(getSignageValue(quote, 'width'))} x ${formatValue(getSignageValue(quote, 'height'))} ${formatValue(getSignageValue(quote, 'unit'))}`,
      `- Sign text: ${formatValue(getSignageValue(quote, 'signText'))}`,
      `- Material: ${formatValue(getSignageValue(quote, 'material'))}`,
      `- Notes: ${formatValue(getSignageValue(quote, 'notes'))}`
    );
  }

  return lines.filter(Boolean).join('\n');
};

const getBannerValue = (quote: QuoteRequestRow, key: string) => {
  const banner = getQuoteValue(quote, 'banner');
  if (!banner || typeof banner !== 'object') return undefined;

  return (banner as Record<string, unknown>)[key];
};

const getSignageValue = (quote: QuoteRequestRow, key: string) => {
  const signage = getQuoteValue(quote, ['signage', 'sign']);
  if (!signage || typeof signage !== 'object') return undefined;

  return (signage as Record<string, unknown>)[key];
};

const getVehicleText = (quote: QuoteRequestRow) => {
  const vehicle = getQuoteValue(quote, 'vehicle');
  if (!vehicle || typeof vehicle !== 'object') {
    return {
      year: formatValue(getQuoteValue(quote, ['vehicleYear', 'vehicle_year'])),
      make: formatValue(getQuoteValue(quote, ['vehicleMake', 'vehicle_make'])),
      model: formatValue(getQuoteValue(quote, ['vehicleModel', 'vehicle_model']))
    };
  }

  const vehicleRecord = vehicle as Record<string, unknown>;
  return {
    year: formatValue(vehicleRecord.year),
    make: formatValue(vehicleRecord.make),
    model: formatValue(vehicleRecord.model)
  };
};

const getUploadedFiles = (quote: QuoteRequestRow) => {
  if (Array.isArray(quote.uploaded_files)) return quote.uploaded_files;
  if (typeof quote.uploaded_files === 'string') {
    try {
      const parsedFiles = JSON.parse(quote.uploaded_files);
      return Array.isArray(parsedFiles) ? parsedFiles as UploadedFileSummary[] : [];
    } catch {
      return [];
    }
  }
  return [];
};

const isVehicleFile = (file: UploadedFileSummary) => {
  const tags = file.tags ?? [];
  const name = (file.name || '').toLowerCase();
  return tags.includes('vehicle_photo') || name.includes('vehicle') || name.includes('car');
};

const isArtworkFile = (file: UploadedFileSummary) => {
  const tags = file.tags ?? [];
  const name = (file.name || '').toLowerCase();
  return (
    tags.some((tag) => ['logo', 'inspiration'].includes(tag)) ||
    tags.some((tag) => ['artwork', 'better_quality_artwork', 'reference_image'].includes(tag)) ||
    name.includes('logo') ||
    name.includes('artwork') ||
    name.includes('mockup') ||
    name.includes('inspiration') ||
    name.includes('reference')
  );
};

const isMeasurementFile = (file: UploadedFileSummary) => {
  const tags = file.tags ?? [];
  const name = (file.name || '').toLowerCase();
  return (
    tags.includes('measurement') ||
    name.includes('measurement') ||
    name.includes('measurements') ||
    name.includes('dimension') ||
    name.includes('dimensions') ||
    name.includes('size')
  );
};

const isReferenceFile = (file: UploadedFileSummary) => {
  const tags = file.tags ?? [];
  const name = (file.name || '').toLowerCase();
  return (
    tags.includes('reference_image') ||
    tags.includes('inspiration') ||
    name.includes('reference') ||
    name.includes('inspiration')
  );
};

const getGroupedFiles = (files: UploadedFileSummary[]) => {
  const vehiclePhotos: UploadedFileSummary[] = [];
  const artworkFiles: UploadedFileSummary[] = [];
  const measurementFiles: UploadedFileSummary[] = [];
  const referenceFiles: UploadedFileSummary[] = [];
  const otherFiles: UploadedFileSummary[] = [];

  files.forEach((file) => {
    const isVehicle = isVehicleFile(file);
    const isArtwork = isArtworkFile(file);
    const isMeasurement = isMeasurementFile(file);
    const isReference = isReferenceFile(file);

    if (isVehicle) {
      vehiclePhotos.push(file);
    }

    if (isArtwork) {
      artworkFiles.push(file);
    }

    if (isMeasurement) {
      measurementFiles.push(file);
    }

    if (isReference) {
      referenceFiles.push(file);
    }

    if (!isVehicle && !isArtwork && !isMeasurement && !isReference) {
      otherFiles.push(file);
    }
  });

  return { vehiclePhotos, artworkFiles, measurementFiles, referenceFiles, otherFiles };
};

const getFileReadinessSections = (
  productType: string,
  groupedFiles: ReturnType<typeof getGroupedFiles>
) => {
  if (productType === 'banner') {
    return [
      {
        title: 'Banner artwork / logo uploaded',
        files: groupedFiles.artworkFiles,
        emptyMessage: 'No clearly marked banner artwork or logo. Review all uploaded files below.'
      },
      {
        title: 'Banner size / measurements uploaded',
        files: groupedFiles.measurementFiles,
        emptyMessage: 'No clearly marked banner size or measurement files. Review all uploaded files below.'
      },
      {
        title: 'Location/reference photo uploaded',
        files: groupedFiles.referenceFiles,
        emptyMessage: 'No clearly marked location/reference photo. Review all uploaded files below.'
      },
      {
        title: 'Other files uploaded',
        files: groupedFiles.otherFiles,
        emptyMessage: 'No other uploaded files detected. Review all uploaded files below.'
      }
    ];
  }

  return [
    {
      title: 'Vehicle photos uploaded',
      files: groupedFiles.vehiclePhotos,
      emptyMessage: 'No clearly marked vehicle photos. Review all uploaded files below.'
    },
    {
      title: 'Logo/artwork uploaded',
      files: groupedFiles.artworkFiles,
      emptyMessage: 'No clearly marked logo or artwork files. Review all uploaded files below.'
    },
    {
      title: 'Measurements uploaded',
      files: groupedFiles.measurementFiles,
      emptyMessage: 'No clearly marked measurement files. Review all uploaded files below.'
    },
    {
      title: 'Reference images uploaded',
      files: groupedFiles.referenceFiles,
      emptyMessage: 'No clearly marked reference images. Review all uploaded files below.'
    }
  ];
};

const getStillNeededItems = (
  groupedFiles: ReturnType<typeof getGroupedFiles>,
  customerActionRequests: QuoteCustomerActionRequest[]
) => {
  const openRequestedTypes = Array.from(new Set(
    customerActionRequests
      .filter((request) => request.status !== 'completed' && request.status !== 'canceled')
      .flatMap((request) => getStoredCustomerActionRequestTypes(request))
  ));

  return openRequestedTypes.filter((requestType) => {
    if (requestType === 'vehicle_photos') return groupedFiles.vehiclePhotos.length === 0;
    if (requestType === 'logo_artwork' || requestType === 'better_quality_artwork') return groupedFiles.artworkFiles.length === 0;
    if (requestType === 'measurements') return groupedFiles.measurementFiles.length === 0;
    return true;
  });
};

const isImageFile = (file: UploadedFileSummary) =>
  (file.type || '').startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name || file.url || '');

const getFileName = (file: UploadedFileSummary) => {
  if (file.name) return file.name;
  if (!file.url) return 'download';

  try {
    const pathname = new URL(file.url).pathname;
    return decodeURIComponent(pathname.split('/').filter(Boolean).pop() || 'download');
  } catch {
    return 'download';
  }
};

const downloadFile = async (file: UploadedFileSummary) => {
  if (!file.url) return;

  const response = await fetch(file.url);
  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = getFileName(file);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};

const FileList = ({ files, emptyMessage = 'None uploaded.' }: { files: UploadedFileSummary[]; emptyMessage?: string }) => {
  const [downloadingFileKey, setDownloadingFileKey] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState('');

  if (files.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {files.map((file, index) => {
        const fileKey = file.id || file.url || `${file.name}-${index}`;
        const isDownloading = downloadingFileKey === fileKey;

        return (
          <div
            key={fileKey}
            className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm"
          >
            {isImageFile(file) && file.url ? (
              <img
                src={file.url}
                alt={file.name || 'Uploaded file'}
                className="h-16 w-16 shrink-0 rounded border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 text-xs font-medium uppercase text-slate-500">
                File
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <p className="truncate font-medium text-slate-900">{file.name || 'Uploaded file'}</p>
                {file.type && <p className="truncate text-xs text-slate-500">{file.type}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {file.url ? (
                  <>
                    <Button asChild size="sm" variant="outline" className="h-8">
                      <a href={file.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                        Open
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      disabled={isDownloading}
                      onClick={async () => {
                        setDownloadError('');
                        setDownloadingFileKey(fileKey);
                        try {
                          await downloadFile(file);
                        } catch (downloadError) {
                          console.error('Admin file download failed:', downloadError);
                          setDownloadError('Download failed. Use Open, then save the file from the browser.');
                        } finally {
                          setDownloadingFileKey(null);
                        }
                      }}
                    >
                      <Download className="mr-2 h-3.5 w-3.5" />
                      {isDownloading ? 'Downloading...' : 'Download'}
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-slate-500">No file URL saved.</span>
                )}
              </div>
              {downloadError && <p className="text-xs text-red-600">{downloadError}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const FileReadinessSection = ({
  title,
  files,
  emptyMessage
}: {
  title: string;
  files: UploadedFileSummary[];
  emptyMessage: string;
}) => (
  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
    <div className="mb-2 flex items-center justify-between gap-3">
      <h4 className="text-sm font-semibold text-slate-950">{title}</h4>
      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
        {files.length}
      </span>
    </div>
    <FileList files={files} emptyMessage={emptyMessage} />
  </div>
);

const DetailField = ({ label, value }: { label: string; value: unknown }) => (
  <div>
    <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
    <dd className="mt-1 text-sm text-slate-900">{formatValue(value)}</dd>
  </div>
);

const formatEventType = (eventType: string) => formatStatusLabel(eventType);

interface AdminStatusProps {
  enableBulkActions?: boolean;
  currentAdminRole?: AdminRole;
}

const AdminStatus = ({ enableBulkActions = false, currentAdminRole }: AdminStatusProps) => {
  const [quotes, setQuotes] = useState<QuoteRequestRow[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequestRow | null>(null);
  const [selectedQuoteDetail, setSelectedQuoteDetail] = useState<QuoteRequestRow | null>(null);
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [statusEvents, setStatusEvents] = useState<QuoteStatusEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [internalNotes, setInternalNotes] = useState<QuoteInternalNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newInternalNote, setNewInternalNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [notifySalesRep, setNotifySalesRep] = useState(false);
  const [noteMessage, setNoteMessage] = useState('');
  const [noteWarning, setNoteWarning] = useState('');
  const [noteError, setNoteError] = useState('');
  const [followUpTasks, setFollowUpTasks] = useState<QuoteFollowUpTask[]>([]);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);
  const [newFollowUpTaskText, setNewFollowUpTaskText] = useState('');
  const [newFollowUpDueDate, setNewFollowUpDueDate] = useState('');
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [completingFollowUpId, setCompletingFollowUpId] = useState<string | null>(null);
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [followUpError, setFollowUpError] = useState('');
  const [followUpSummaries, setFollowUpSummaries] = useState<Record<string, QuoteFollowUpSummary>>({});
  const [followUpFilter, setFollowUpFilter] = useState<FollowUpFilter>('all');
  const [quoteSearch, setQuoteSearch] = useState('');
  const [quickQuoteFilter, setQuickQuoteFilter] = useState<QuickQuoteFilter>('all');
  const [selectedRepFilter, setSelectedRepFilter] = useState(ALL_REPS_FILTER_VALUE);
  const [customerActionRequests, setCustomerActionRequests] = useState<QuoteCustomerActionRequest[]>([]);
  const [loadingCustomerActions, setLoadingCustomerActions] = useState(false);
  const [customerActionRequestTypes, setCustomerActionRequestTypes] = useState<CustomerActionRequestType[]>([]);
  const [customerActionMessage, setCustomerActionMessage] = useState(getDefaultCustomerActionMessage());
  const [sendingCustomerAction, setSendingCustomerAction] = useState(false);
  const [customerActionMessageStatus, setCustomerActionMessageStatus] = useState('');
  const [customerActionError, setCustomerActionError] = useState('');
  const [designerPacket, setDesignerPacket] = useState<DesignerPacket | null>(null);
  const [loadingDesignerPacket, setLoadingDesignerPacket] = useState(false);
  const [designerEmail, setDesignerEmail] = useState('');
  const [designerName, setDesignerName] = useState('');
  const [designerInstructions, setDesignerInstructions] = useState('');
  const [designerCloudFolderUrl, setDesignerCloudFolderUrl] = useState('');
  const [sendingDesignerPacket, setSendingDesignerPacket] = useState(false);
  const [designerPacketMessage, setDesignerPacketMessage] = useState('');
  const [designerPacketError, setDesignerPacketError] = useState('');
  const [pendingStatuses, setPendingStatuses] = useState<Record<string, QuoteStatus>>({});
  const [quoteListView, setQuoteListView] = useState<QuoteListView>('active');
  const [activeQuoteCount, setActiveQuoteCount] = useState(0);
  const [archivedQuoteCount, setArchivedQuoteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [archivingQuotes, setArchivingQuotes] = useState(false);
  const [restoringQuotes, setRestoringQuotes] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [assignableReps, setAssignableReps] = useState<AssignableRepOption[]>([]);
  const [loadingAssignableReps, setLoadingAssignableReps] = useState(false);
  const [selectedAssignRepSlug, setSelectedAssignRepSlug] = useState(UNASSIGNED_REP_VALUE);
  const [assigningRep, setAssigningRep] = useState(false);
  const [assignRepMessage, setAssignRepMessage] = useState('');
  const [assignRepError, setAssignRepError] = useState('');
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [proofPaymentUrl, setProofPaymentUrl] = useState('');
  const [proofMode, setProofMode] = useState<ProofMode>('single');
  const [proofOptions, setProofOptions] = useState<CustomerProofOption[]>([]);
  const [savingProofPortal, setSavingProofPortal] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const lastSelectedQuoteIdRef = useRef<string | null>(null);
  const quoteSelectionShiftKeyRef = useRef(false);
  const [uploadingProofOptions, setUploadingProofOptions] = useState(false);
  const [savingProofOptionId, setSavingProofOptionId] = useState<string | null>(null);
  const [deletingProofOptionId, setDeletingProofOptionId] = useState<string | null>(null);
  const [proofPortalMessage, setProofPortalMessage] = useState('');
  const [proofPortalError, setProofPortalError] = useState('');
  const proofUploadInputRef = useRef<HTMLInputElement | null>(null);
  const proofOptionsUploadInputRef = useRef<HTMLInputElement | null>(null);
  const canAssignReps = currentAdminRole === 'owner_admin';
  const canArchiveQuotes = currentAdminRole === 'owner_admin';

  const loadArchivedQuoteCount = async () => {
    if (!canArchiveQuotes) return;

    const { data, error: archivedCountError } = await supabase
      .rpc('get_archived_quote_requests_owner_admin');

    if (archivedCountError) {
      console.error('Admin archived quote count load failed:', archivedCountError);
      return;
    }

    setArchivedQuoteCount((data ?? []).length);
  };

  const loadFollowUpSummaries = async () => {
    const { data, error: summaryError } = await supabase
      .rpc('get_admin_quote_follow_up_summaries');

    if (summaryError) {
      console.error('Admin follow-up summary load failed:', summaryError);
      setError(summaryError.message);
      setFollowUpSummaries({});
      return;
    }

    const summariesByQuoteId = (data ?? []).reduce<Record<string, QuoteFollowUpSummary>>((summaries, summary) => {
      summaries[summary.quote_request_id] = summary as QuoteFollowUpSummary;
      return summaries;
    }, {});

    setFollowUpSummaries(summariesByQuoteId);
  };

  const loadQuotes = async ({ clearMessage = true, view = quoteListView }: { clearMessage?: boolean; view?: QuoteListView } = {}) => {
    setLoading(true);
    setError('');
    if (clearMessage) {
      setMessage('');
    }

    const { data, error: loadError } = await supabase
      .rpc(view === 'archived' ? 'get_archived_quote_requests_owner_admin' : 'get_admin_quote_requests');

    if (loadError) {
      console.error('Admin status quote load failed:', loadError);
      setError(loadError.message);
      setLoading(false);
      return;
    }

    setQuotes(data ?? []);
    if (view === 'active') {
      setActiveQuoteCount((data ?? []).length);
      void loadArchivedQuoteCount();
    } else {
      setArchivedQuoteCount((data ?? []).length);
    }
    setPendingStatuses({});
    setSelectedQuoteIds([]);
    if (view === 'active') {
      await loadFollowUpSummaries();
    } else {
      setFollowUpSummaries({});
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadQuotes();
  }, []);

  const loadAssignableReps = async () => {
    if (!canAssignReps) return;

    setLoadingAssignableReps(true);
    setAssignRepError('');

    const { data, error: assignableRepsError } = await supabase
      .rpc('list_assignable_reps_owner_admin');

    setLoadingAssignableReps(false);

    if (assignableRepsError) {
      console.error('Admin assignable reps load failed:', assignableRepsError);
      setAssignRepError(assignableRepsError.message);
      setAssignableReps([]);
      return;
    }

    setAssignableReps((data ?? []) as AssignableRepOption[]);
  };

  const loadStatusEvents = async (quoteRequestId: string) => {
    setLoadingEvents(true);

    const { data, error: eventError } = await supabase
      .rpc('get_quote_status_events_admin', {
        quote_request_id: quoteRequestId
      });

    setLoadingEvents(false);

    if (eventError) {
      console.error('Admin status events load failed:', eventError);
      setError(eventError.message);
      setStatusEvents([]);
      return;
    }

    setStatusEvents(data ?? []);
  };

  const loadInternalNotes = async (quoteRequestId: string) => {
    setLoadingNotes(true);
    setNoteError('');

    const { data, error: notesError } = await supabase
      .rpc('get_quote_internal_notes_admin', {
        p_quote_request_id: quoteRequestId
      });

    setLoadingNotes(false);

    if (notesError) {
      console.error('Admin internal notes load failed:', notesError);
      setNoteError(notesError.message);
      setInternalNotes([]);
      return;
    }

    setInternalNotes(data ?? []);
  };

  const loadFollowUpTasks = async (quoteRequestId: string) => {
    setLoadingFollowUps(true);
    setFollowUpError('');

    const { data, error: followUpLoadError } = await supabase
      .rpc('get_quote_follow_up_tasks_admin', {
        p_quote_request_id: quoteRequestId
      });

    setLoadingFollowUps(false);

    if (followUpLoadError) {
      console.error('Admin follow-up tasks load failed:', followUpLoadError);
      setFollowUpError(followUpLoadError.message);
      setFollowUpTasks([]);
      return;
    }

    setFollowUpTasks(data ?? []);
  };

  const loadCustomerActionRequests = async (quoteRequestId: string) => {
    setLoadingCustomerActions(true);
    setCustomerActionError('');

    const { data, error: actionLoadError } = await supabase
      .rpc('get_quote_customer_action_requests_admin', {
        p_quote_request_id: quoteRequestId
      });

    setLoadingCustomerActions(false);

    if (actionLoadError) {
      console.error('Admin customer action requests load failed:', actionLoadError);
      setCustomerActionError(actionLoadError.message);
      setCustomerActionRequests([]);
      return;
    }

    setCustomerActionRequests(data ?? []);
  };

  const loadDesignerPacket = async (quoteRequestId: string, activeQuote?: QuoteRequestRow) => {
    setLoadingDesignerPacket(true);
    setDesignerPacketError('');

    const { data, error: packetLoadError } = await supabase
      .rpc('get_designer_packet_admin', {
        p_quote_request_id: quoteRequestId
      });

    setLoadingDesignerPacket(false);

    if (packetLoadError) {
      console.error('Designer packet load failed:', packetLoadError);
      setDesignerPacket(null);
      setDesignerPacketError('Designer packet setup is not installed yet. Run supabase-designer-packets.sql in Supabase.');
      return;
    }

    const nextPacket = data?.[0] as DesignerPacket | undefined;
    setDesignerPacket(nextPacket ?? null);

    if (nextPacket) {
      setDesignerEmail(nextPacket.designer_email || '');
      setDesignerName(nextPacket.designer_name || '');
      setDesignerInstructions(nextPacket.instructions || '');
      setDesignerCloudFolderUrl(nextPacket.cloud_folder_url || '');
      return;
    }

    const quoteForDefaults = activeQuote || selectedQuoteDetail || selectedQuote;
    if (quoteForDefaults) {
      setDesignerInstructions(getDesignerPacketDefaultInstructions(quoteForDefaults));
    }
  };

  const loadQuoteDetail = async (quoteRequestId: string) => {
    setLoadingDetail(true);

    const { data, error: detailError } = await supabase
      .rpc('get_admin_quote_request_detail', {
        quote_request_id: quoteRequestId
      });

    setLoadingDetail(false);

    if (detailError) {
      console.error('Admin quote detail load failed:', detailError);
      setError(detailError.message);
      setSelectedQuoteDetail(null);
      return;
    }

    const quoteDetail = data?.[0] ?? null;
    setSelectedQuoteDetail(quoteDetail);
    setSelectedAssignRepSlug(quoteDetail?.rep_slug || UNASSIGNED_REP_VALUE);
    setProofImageUrl(quoteDetail?.customer_proof_image_url || '');
    setProofPaymentUrl(quoteDetail?.customer_proof_payment_url || '');
    setProofMode(quoteDetail?.customer_proof_mode || 'single');
    setProofOptions(getCustomerProofOptions(quoteDetail));
    if (quoteDetail) {
      setDesignerInstructions((currentInstructions) => currentInstructions || getDesignerPacketDefaultInstructions(quoteDetail));
    }
  };

  const openQuoteDetail = (quote: QuoteRequestRow) => {
    setSelectedQuote(quote);
    setSelectedQuoteDetail(null);
    setStatusEvents([]);
    setInternalNotes([]);
    setFollowUpTasks([]);
    setCustomerActionRequests([]);
    setNewInternalNote('');
    setNewFollowUpTaskText('');
    setNewFollowUpDueDate('');
    setCustomerActionRequestTypes([]);
    setCustomerActionMessage(getDefaultCustomerActionMessage());
    setDesignerPacket(null);
    setDesignerEmail('');
    setDesignerName('');
    setDesignerInstructions(getDesignerPacketDefaultInstructions(quote));
    setDesignerCloudFolderUrl('');
    setDesignerPacketMessage('');
    setDesignerPacketError('');
    setNotifySalesRep(false);
    setNoteMessage('');
    setNoteWarning('');
    setNoteError('');
    setSelectedAssignRepSlug(quote.rep_slug || UNASSIGNED_REP_VALUE);
    setAssignRepMessage('');
    setAssignRepError('');
    setProofImageUrl('');
    setProofPaymentUrl('');
    setProofMode('single');
    setProofOptions([]);
    setProofPortalMessage('');
    setProofPortalError('');
    setFollowUpMessage('');
    setFollowUpError('');
    setCustomerActionMessageStatus('');
    setCustomerActionError('');
    if (canAssignReps) {
      void loadAssignableReps();
    }
    void loadQuoteDetail(quote.id);
    void loadStatusEvents(quote.id);
    void loadInternalNotes(quote.id);
    void loadFollowUpTasks(quote.id);
    void loadCustomerActionRequests(quote.id);
    void loadDesignerPacket(quote.id, quote);
  };

  const saveProofPortalSettings = async () => {
    if (!selectedQuote || savingProofPortal) return;

    setSavingProofPortal(true);
    setProofPortalError('');
    setProofPortalMessage('Saving proof portal...');

    const { data, error: proofSettingsError } = await supabase
      .rpc('upsert_customer_proof_portal_admin', {
        p_quote_request_id: selectedQuote.id,
        p_proof_image_url: proofImageUrl.trim() || null,
        p_payment_url: proofPaymentUrl.trim() || null
      });

    setSavingProofPortal(false);

    if (proofSettingsError) {
      console.error('Admin proof portal save failed:', proofSettingsError);
      setProofPortalError(proofSettingsError.message);
      setProofPortalMessage('');
      return;
    }

    const token = data?.[0]?.customer_proof_token;
    setProofPortalMessage(token ? 'Proof portal saved. Private link is ready.' : 'Proof portal saved.');
    await Promise.all([
      loadQuoteDetail(selectedQuote.id),
      loadStatusEvents(selectedQuote.id)
    ]);
  };

  const uploadNewProof = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !selectedQuote || uploadingProof) return;

    if (!file.type.startsWith('image/')) {
      setProofPortalError('Upload an image file for the customer proof.');
      setProofPortalMessage('');
      return;
    }

    if (file.size > 52428800) {
      setProofPortalError('Proof image must be 50MB or smaller.');
      setProofPortalMessage('');
      return;
    }

    setUploadingProof(true);
    setProofPortalError('');
    setProofPortalMessage('Uploading proof...');

    const safeFileName = getSafeProofFileName(file.name);
    const storagePath = `proofs/${selectedQuote.id}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('customer-proofs')
      .upload(storagePath, file, {
        cacheControl: '3600',
        contentType: file.type || 'application/octet-stream',
        upsert: false
      });

    if (uploadError) {
      console.error('Admin proof upload failed:', uploadError);
      setUploadingProof(false);
      setProofPortalError(uploadError.message);
      setProofPortalMessage('');
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('customer-proofs')
      .getPublicUrl(storagePath);

    const uploadedProofUrl = publicUrlData.publicUrl;
    const { data, error: proofSettingsError } = await supabase
      .rpc('upsert_customer_proof_portal_admin', {
        p_quote_request_id: selectedQuote.id,
        p_proof_image_url: uploadedProofUrl,
        p_payment_url: proofPaymentUrl.trim() || null
      });

    setUploadingProof(false);

    if (proofSettingsError) {
      console.error('Admin proof portal save failed after upload:', proofSettingsError);
      setProofPortalError(proofSettingsError.message);
      setProofPortalMessage('');
      return;
    }

    setProofImageUrl(uploadedProofUrl);
    const token = data?.[0]?.customer_proof_token;
    setProofPortalMessage(token ? 'Proof uploaded. Private link still works.' : 'Proof uploaded.');
    await Promise.all([
      loadQuoteDetail(selectedQuote.id),
      loadStatusEvents(selectedQuote.id)
    ]);
  };

  const saveProofMode = async (nextProofMode = proofMode) => {
    if (!selectedQuote || savingProofPortal) return;

    setSavingProofPortal(true);
    setProofPortalError('');
    setProofPortalMessage('Saving proof mode...');

    const { error: proofModeError } = await supabase
      .rpc('set_customer_proof_mode_admin', {
        p_quote_request_id: selectedQuote.id,
        p_customer_proof_mode: nextProofMode
      });

    setSavingProofPortal(false);

    if (proofModeError) {
      console.error('Admin proof mode save failed:', proofModeError);
      setProofPortalError(proofModeError.message);
      setProofPortalMessage('');
      return;
    }

    setProofMode(nextProofMode);
    setProofPortalMessage(nextProofMode === 'multi' ? 'Multi-proof mode saved.' : 'Single-proof mode saved.');
    await Promise.all([
      loadQuoteDetail(selectedQuote.id),
      loadStatusEvents(selectedQuote.id)
    ]);
  };

  const uploadProofOptions = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (!files.length || !selectedQuote || uploadingProofOptions) return;

    const currentOptions = proofOptions;
    const remainingSlots = Math.max(0, 10 - currentOptions.length);
    if (files.length > remainingSlots) {
      setProofPortalError(`Upload ${remainingSlots} or fewer proof option image${remainingSlots === 1 ? '' : 's'}.`);
      setProofPortalMessage('');
      return;
    }

    const invalidFile = files.find((file) => !file.type.startsWith('image/') || file.size > 52428800);
    if (invalidFile) {
      setProofPortalError(
        !invalidFile.type.startsWith('image/')
          ? 'Upload image files for proof options.'
          : 'Each proof option image must be 50MB or smaller.'
      );
      setProofPortalMessage('');
      return;
    }

    setUploadingProofOptions(true);
    setProofPortalError('');
    setProofPortalMessage('Uploading proof options...');

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const sortOrder = currentOptions.length + index;
      const safeFileName = getSafeProofFileName(file.name);
      const storagePath = `proof-options/${selectedQuote.id}/${Date.now()}-${sortOrder}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('customer-proofs')
        .upload(storagePath, file, {
          cacheControl: '3600',
          contentType: file.type || 'application/octet-stream',
          upsert: false
        });

      if (uploadError) {
        console.error('Admin proof option upload failed:', uploadError);
        setUploadingProofOptions(false);
        setProofPortalError(uploadError.message);
        setProofPortalMessage('');
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('customer-proofs')
        .getPublicUrl(storagePath);

      const { data, error: optionSaveError } = await supabase
        .rpc('upsert_customer_proof_option_admin', {
          p_quote_request_id: selectedQuote.id,
          p_option_id: null,
          p_sort_order: sortOrder,
          p_image_url: publicUrlData.publicUrl,
          p_admin_note: null
        });

      if (optionSaveError) {
        console.error('Admin proof option save failed:', optionSaveError);
        setUploadingProofOptions(false);
        setProofPortalError(optionSaveError.message);
        setProofPortalMessage('');
        return;
      }

      const nextOptions = data?.[0]?.proof_options;
      if (Array.isArray(nextOptions)) {
        setProofOptions(nextOptions as CustomerProofOption[]);
      }
    }

    setUploadingProofOptions(false);
    setProofMode('multi');
    setProofPortalMessage('Proof options uploaded. Private link still works.');
    await Promise.all([
      loadQuoteDetail(selectedQuote.id),
      loadStatusEvents(selectedQuote.id)
    ]);
  };

  const saveProofOption = async (option: CustomerProofOption) => {
    if (!selectedQuote || savingProofOptionId) return;

    setSavingProofOptionId(option.id);
    setProofPortalError('');
    setProofPortalMessage('Saving proof option...');

    const { data, error: optionSaveError } = await supabase
      .rpc('upsert_customer_proof_option_admin', {
        p_quote_request_id: selectedQuote.id,
        p_option_id: option.id,
        p_sort_order: option.sort_order,
        p_image_url: option.image_url,
        p_admin_note: option.admin_note || null
      });

    setSavingProofOptionId(null);

    if (optionSaveError) {
      console.error('Admin proof option save failed:', optionSaveError);
      setProofPortalError(optionSaveError.message);
      setProofPortalMessage('');
      return;
    }

    const nextOptions = data?.[0]?.proof_options;
    if (Array.isArray(nextOptions)) {
      setProofOptions(nextOptions as CustomerProofOption[]);
    }
    setProofPortalMessage('Proof option saved.');
    await loadQuoteDetail(selectedQuote.id);
  };

  const deleteProofOption = async (optionId: string) => {
    if (!selectedQuote || deletingProofOptionId) return;

    setDeletingProofOptionId(optionId);
    setProofPortalError('');
    setProofPortalMessage('Removing proof option...');

    const { data, error: optionDeleteError } = await supabase
      .rpc('delete_customer_proof_option_admin', {
        p_quote_request_id: selectedQuote.id,
        p_option_id: optionId
      });

    setDeletingProofOptionId(null);

    if (optionDeleteError) {
      console.error('Admin proof option delete failed:', optionDeleteError);
      setProofPortalError(optionDeleteError.message);
      setProofPortalMessage('');
      return;
    }

    const nextOptions = data?.[0]?.proof_options;
    if (Array.isArray(nextOptions)) {
      setProofOptions(nextOptions as CustomerProofOption[]);
    }
    setProofPortalMessage('Proof option removed.');
    await Promise.all([
      loadQuoteDetail(selectedQuote.id),
      loadStatusEvents(selectedQuote.id)
    ]);
  };

  const moveProofOption = async (optionId: string, direction: -1 | 1) => {
    if (!selectedQuote || savingProofPortal) return;

    const currentIndex = proofOptions.findIndex((option) => option.id === optionId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= proofOptions.length) return;

    const reorderedOptions = [...proofOptions];
    const [movedOption] = reorderedOptions.splice(currentIndex, 1);
    reorderedOptions.splice(nextIndex, 0, movedOption);

    const payload = reorderedOptions.map((option, index) => ({
      id: option.id,
      sort_order: index
    }));

    setSavingProofPortal(true);
    setProofPortalError('');
    setProofPortalMessage('Reordering proof options...');

    const { data, error: reorderError } = await supabase
      .rpc('reorder_customer_proof_options_admin', {
        p_quote_request_id: selectedQuote.id,
        p_options: payload
      });

    setSavingProofPortal(false);

    if (reorderError) {
      console.error('Admin proof option reorder failed:', reorderError);
      setProofPortalError(reorderError.message);
      setProofPortalMessage('');
      return;
    }

    const nextOptions = data?.[0]?.proof_options;
    if (Array.isArray(nextOptions)) {
      setProofOptions(nextOptions as CustomerProofOption[]);
    }
    setProofPortalMessage('Proof options reordered.');
    await loadQuoteDetail(selectedQuote.id);
  };

  const copyProofPortalLink = async (token: string | null | undefined) => {
    const proofLink = getCustomerProofLink(token);
    if (!proofLink) {
      setProofPortalError('Save proof portal settings first to create a private link.');
      setProofPortalMessage('');
      return;
    }

    await navigator.clipboard.writeText(proofLink);
    setProofPortalMessage('Private proof link copied.');
    setProofPortalError('');
  };

  const copyDesignerPacketLink = async () => {
    const packetLink = getDesignerPacketLink(designerPacket?.token);
    if (!packetLink) {
      setDesignerPacketError('Send or save the designer packet first to create a private link.');
      setDesignerPacketMessage('');
      return;
    }

    await navigator.clipboard.writeText(packetLink);
    setDesignerPacketMessage('Designer packet link copied.');
    setDesignerPacketError('');
  };

  const sendDesignerPacket = async () => {
    if (!selectedQuote || sendingDesignerPacket) return;

    const activeQuote = selectedQuoteDetail || selectedQuote;
    const trimmedDesignerEmail = designerEmail.trim();
    const trimmedInstructions = designerInstructions.trim();

    if (!trimmedDesignerEmail) {
      setDesignerPacketError('Add the designer email before sending.');
      setDesignerPacketMessage('');
      return;
    }

    if (!trimmedInstructions) {
      setDesignerPacketError('Add designer instructions before sending.');
      setDesignerPacketMessage('');
      return;
    }

    setSendingDesignerPacket(true);
    setDesignerPacketError('');
    setDesignerPacketMessage('Creating designer packet...');

    const { data, error: packetSaveError } = await supabase
      .rpc('upsert_designer_packet_admin', {
        p_quote_request_id: selectedQuote.id,
        p_designer_email: trimmedDesignerEmail,
        p_designer_name: designerName.trim() || null,
        p_instructions: trimmedInstructions,
        p_cloud_folder_url: designerCloudFolderUrl.trim() || null
      });

    if (packetSaveError) {
      console.error('Designer packet save failed:', packetSaveError);
      setSendingDesignerPacket(false);
      setDesignerPacketError('Designer packet could not be created. Run supabase-designer-packets.sql in Supabase if this is the first time using it.');
      setDesignerPacketMessage('');
      return;
    }

    const nextPacket = data?.[0] as DesignerPacket | undefined;
    const packetLink = getDesignerPacketLink(nextPacket?.token);

    if (!nextPacket || !packetLink) {
      setSendingDesignerPacket(false);
      setDesignerPacketError('Designer packet was saved but no private link came back.');
      setDesignerPacketMessage('');
      return;
    }

    setDesignerPacket(nextPacket);
    setDesignerPacketMessage('Designer packet created. Sending email...');

    const emailResponse = await fetch('/api/send-designer-packet-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        designerEmail: trimmedDesignerEmail,
        designerName,
        customerName: activeQuote.customer_name,
        quoteId: activeQuote.quote_id,
        productLabel: getProductLabel(activeQuote),
        packetUrl: packetLink,
        instructions: trimmedInstructions,
        cloudFolderUrl: designerCloudFolderUrl.trim() || null
      })
    });

    setSendingDesignerPacket(false);

    if (!emailResponse.ok) {
      const responseBody = await emailResponse.text();
      console.error('Designer packet email failed:', {
        status: emailResponse.status,
        responseBody
      });
      setDesignerPacketError('Packet link was created, but email did not send. Copy the private designer link and send it manually.');
      setDesignerPacketMessage('');
      await Promise.all([
        loadDesignerPacket(selectedQuote.id, activeQuote),
        loadStatusEvents(selectedQuote.id)
      ]);
      return;
    }

    setDesignerPacketMessage('Designer packet sent and connected to this quote.');
    await Promise.all([
      loadDesignerPacket(selectedQuote.id, activeQuote),
      loadStatusEvents(selectedQuote.id)
    ]);
  };

  const saveAssignedRep = async () => {
    if (!selectedQuote || assigningRep || !canAssignReps) return;

    const nextRepSlug = selectedAssignRepSlug === UNASSIGNED_REP_VALUE ? null : selectedAssignRepSlug;

    setAssigningRep(true);
    setAssignRepError('');
    setAssignRepMessage('Saving assigned rep...');

    const { error: assignError } = await supabase
      .rpc('assign_quote_rep_owner_admin', {
        quote_id: selectedQuote.id,
        rep_slug: nextRepSlug
      });

    setAssigningRep(false);

    if (assignError) {
      console.error('Admin assign rep failed:', assignError);
      setAssignRepError(assignError.message);
      setAssignRepMessage('');
      return;
    }

    setNotifySalesRep(false);
    setSelectedAssignRepSlug(nextRepSlug || UNASSIGNED_REP_VALUE);
    setAssignRepMessage(nextRepSlug ? 'Assigned rep saved.' : 'Quote unassigned.');
    await loadStatusEvents(selectedQuote.id);
    await loadQuotes({ clearMessage: false });
    await loadQuoteDetail(selectedQuote.id);
  };

  const saveInternalNote = async () => {
    if (!selectedQuote || savingNote) return;

    const trimmedNote = newInternalNote.trim();
    if (!trimmedNote) {
      setNoteError('Add a note before saving.');
      setNoteMessage('');
      setNoteWarning('');
      return;
    }

    setSavingNote(true);
    setNoteError('');
    setNoteWarning('');
    setNoteMessage('Saving note...');

    const { error: saveNoteError } = await supabase
      .rpc('add_quote_internal_note_admin', {
        p_quote_request_id: selectedQuote.id,
        p_note_text: trimmedNote
      });

    setSavingNote(false);

    if (saveNoteError) {
      console.error('Admin internal note save failed:', saveNoteError);
      setNoteError(saveNoteError.message);
      setNoteMessage('');
      setNoteWarning('');
      return;
    }

    setNewInternalNote('');
    await loadInternalNotes(selectedQuote.id);

    const activeQuote = selectedQuoteDetail || selectedQuote;
    const hasSalesRepNotificationTarget = Boolean(activeQuote.rep_email || activeQuote.rep_slug);

    if (!notifySalesRep || !hasSalesRepNotificationTarget) {
      setNoteMessage('Note saved.');
      return;
    }

    const emailResponse = await fetch('/api/send-internal-note-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        repEmail: activeQuote.rep_email,
        repSlug: activeQuote.rep_slug,
        repName: activeQuote.assigned_rep_name,
        quoteId: activeQuote.quote_id,
        customerName: activeQuote.customer_name,
        noteText: trimmedNote
      })
    });

    if (!emailResponse.ok) {
      const responseBody = await emailResponse.text();
      console.error('Internal note sales rep notification failed:', {
        status: emailResponse.status,
        responseBody
      });
      setNoteMessage('');
      setNoteWarning('Note saved, but sales rep notification failed.');
      return;
    }

    setNoteMessage('Note saved and sales rep notified.');
  };

  const saveFollowUpTask = async () => {
    if (!selectedQuote || savingFollowUp) return;

    const trimmedTask = newFollowUpTaskText.trim();
    if (!trimmedTask) {
      setFollowUpError('Add a task before saving.');
      setFollowUpMessage('');
      return;
    }

    if (!newFollowUpDueDate) {
      setFollowUpError('Choose a due date before saving.');
      setFollowUpMessage('');
      return;
    }

    setSavingFollowUp(true);
    setFollowUpError('');
    setFollowUpMessage('Saving follow-up...');

    const { error: saveFollowUpError } = await supabase
      .rpc('add_quote_follow_up_task_admin', {
        p_quote_request_id: selectedQuote.id,
        p_task_text: trimmedTask,
        p_due_date: newFollowUpDueDate
      });

    setSavingFollowUp(false);

    if (saveFollowUpError) {
      console.error('Admin follow-up task save failed:', saveFollowUpError);
      setFollowUpError(saveFollowUpError.message);
      setFollowUpMessage('');
      return;
    }

    setNewFollowUpTaskText('');
    setNewFollowUpDueDate('');
    setFollowUpMessage('Follow-up saved.');
    await Promise.all([
      loadFollowUpTasks(selectedQuote.id),
      loadFollowUpSummaries()
    ]);
  };

  const completeFollowUpTask = async (taskId: string) => {
    if (!selectedQuote || completingFollowUpId) return;

    setCompletingFollowUpId(taskId);
    setFollowUpError('');
    setFollowUpMessage('Marking follow-up complete...');

    const { error: completeFollowUpError } = await supabase
      .rpc('complete_quote_follow_up_task_admin', {
        p_follow_up_task_id: taskId
      });

    setCompletingFollowUpId(null);

    if (completeFollowUpError) {
      console.error('Admin follow-up task completion failed:', completeFollowUpError);
      setFollowUpError(completeFollowUpError.message);
      setFollowUpMessage('');
      return;
    }

    setFollowUpMessage('Follow-up completed.');
    await Promise.all([
      loadFollowUpTasks(selectedQuote.id),
      loadFollowUpSummaries()
    ]);
  };

  const sendCustomerActionRequest = async () => {
    if (!selectedQuote || sendingCustomerAction) return;

    const trimmedMessage = customerActionMessage.trim();
    if (customerActionRequestTypes.length === 0) {
      setCustomerActionError('Select at least one requested item before sending.');
      setCustomerActionMessageStatus('');
      return;
    }

    if (!trimmedMessage) {
      setCustomerActionError('Add a message before sending.');
      setCustomerActionMessageStatus('');
      return;
    }

    if (!selectedQuote.customer_email) {
      setCustomerActionError('This quote does not have a customer email.');
      setCustomerActionMessageStatus('');
      return;
    }

    setSendingCustomerAction(true);
    setCustomerActionError('');
    setCustomerActionMessageStatus('Sending customer request...');

    const { data: uploadTokenRows, error: uploadTokenError } = await supabase
      .rpc('create_quote_customer_upload_token_admin', {
        p_quote_request_id: selectedQuote.id,
        p_requested_items: customerActionRequestTypes,
        p_expires_in_days: 14
      });

    if (uploadTokenError) {
      console.error('Customer upload token creation failed:', uploadTokenError);
      setSendingCustomerAction(false);
      setCustomerActionError('Upload link could not be created. The request was not sent.');
      setCustomerActionMessageStatus('');
      return;
    }

    const uploadToken = uploadTokenRows?.[0]?.token;
    if (!uploadToken) {
      console.error('Customer upload token creation returned no token.');
      setSendingCustomerAction(false);
      setCustomerActionError('Upload link could not be created. The request was not sent.');
      setCustomerActionMessageStatus('');
      return;
    }

    const uploadUrl = `${window.location.origin}/upload-assets/${uploadToken}`;

    const emailResponse = await fetch('/api/send-customer-action-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerEmail: selectedQuote.customer_email,
        customerName: selectedQuote.customer_name,
        quoteId: selectedQuote.quote_id,
        requestType: customerActionRequestTypes[0],
        requestTypes: customerActionRequestTypes,
        message: trimmedMessage,
        uploadUrl
      })
    });

    if (!emailResponse.ok) {
      const responseBody = await emailResponse.text();
      console.error('Customer action request email failed:', {
        status: emailResponse.status,
        responseBody
      });
      setSendingCustomerAction(false);
      setCustomerActionError('Email could not be sent. The request was not recorded.');
      setCustomerActionMessageStatus('');
      return;
    }

    const { error: recordError } = await supabase
      .rpc('create_quote_customer_action_request_admin', {
        p_quote_request_id: selectedQuote.id,
        p_request_type: customerActionRequestTypes[0],
        p_message: trimmedMessage,
        p_customer_email: selectedQuote.customer_email,
        p_create_follow_up: true,
        p_request_types: customerActionRequestTypes
      });

    setSendingCustomerAction(false);

    if (recordError) {
      console.error('Customer action request record failed:', recordError);
      setCustomerActionError('Email was sent, but the CRM record could not be saved.');
      setCustomerActionMessageStatus('');
      return;
    }

    setCustomerActionMessageStatus('Customer action request sent and recorded.');
    await Promise.all([
      loadStatusEvents(selectedQuote.id),
      loadFollowUpTasks(selectedQuote.id),
      loadCustomerActionRequests(selectedQuote.id),
      loadFollowUpSummaries()
    ]);
  };

  const getSelectedStatus = (quote: QuoteRequestRow) =>
    pendingStatuses[quote.id] || (STATUS_OPTIONS.includes(quote.status as QuoteStatus) ? quote.status as QuoteStatus : 'new');

  const saveStatus = async (quote: QuoteRequestRow, nextStatus = getSelectedStatus(quote)) => {
    if (nextStatus === quote.status) return;

    setSavingId(quote.id);
    setError('');
    setMessage(`Saving ${quote.quote_id || quote.customer_name} as ${formatStatusLabel(nextStatus)}...`);

    const { error: updateError } = await supabase
      .rpc('update_quote_status_admin', {
        quote_request_id: quote.id,
        next_status: nextStatus
      });

    setSavingId(null);

    if (updateError) {
      console.error('Admin status update failed:', updateError);
      setError(updateError.message);
      return;
    }

    setPendingStatuses((currentStatuses) => {
      const nextStatuses = { ...currentStatuses };
      delete nextStatuses[quote.id];
      return nextStatuses;
    });
    setMessage(`Saved ${quote.quote_id || quote.customer_name} as ${formatStatusLabel(nextStatus)}.`);
    setSelectedQuote((currentQuote) =>
      currentQuote?.id === quote.id
        ? { ...currentQuote, status: nextStatus }
        : currentQuote
    );
    setSelectedQuoteDetail((currentQuote) =>
      currentQuote?.id === quote.id
        ? { ...currentQuote, status: nextStatus }
        : currentQuote
    );
    if (selectedQuote?.id === quote.id) {
      await loadQuoteDetail(quote.id);
      await loadStatusEvents(quote.id);
    }
    await loadQuotes({ clearMessage: false });
  };

  const archiveSelectedQuotes = async () => {
    if (!canArchiveQuotes || archivingQuotes || selectedQuoteIds.length === 0) return;

    const selectedCount = selectedQuoteIds.length;
    const confirmed = window.confirm(
      `Archive ${selectedCount} selected quote${selectedCount === 1 ? '' : 's'}?\n\nArchived jobs will be hidden from admin and rep views, but customer records, files, notes, proof history, and follow-ups will not be deleted.`
    );

    if (!confirmed) return;

    setArchivingQuotes(true);
    setError('');
    setMessage(`Archiving ${selectedCount} quote${selectedCount === 1 ? '' : 's'}...`);

    const { data, error: archiveError } = await supabase
      .rpc('archive_quote_requests_owner_admin', {
        p_quote_request_ids: selectedQuoteIds,
        p_archive_reason: 'Admin cleanup'
      });

    setArchivingQuotes(false);

    if (archiveError) {
      console.error('Admin quote archive failed:', archiveError);
      setError(archiveError.message);
      setMessage('');
      return;
    }

    const archivedCount = typeof data === 'number' ? data : selectedCount;
    setSelectedQuoteIds([]);
    setSelectedQuote(null);
    setSelectedQuoteDetail(null);
    setStatusEvents([]);
    setInternalNotes([]);
    setFollowUpTasks([]);
    setCustomerActionRequests([]);
    setMessage(`Archived ${archivedCount} quote${archivedCount === 1 ? '' : 's'}. Open Archived to review or restore.`);
    await loadQuotes({ clearMessage: false });
  };

  const restoreSelectedQuotes = async () => {
    if (!canArchiveQuotes || restoringQuotes || selectedQuoteIds.length === 0) return;

    const selectedCount = selectedQuoteIds.length;
    const confirmed = window.confirm(`Restore ${selectedCount} archived quote${selectedCount === 1 ? '' : 's'} to the active admin list?`);

    if (!confirmed) return;

    setRestoringQuotes(true);
    setError('');
    setMessage(`Restoring ${selectedCount} quote${selectedCount === 1 ? '' : 's'}...`);

    const { data, error: restoreError } = await supabase
      .rpc('restore_quote_requests_owner_admin', {
        p_quote_request_ids: selectedQuoteIds
      });

    setRestoringQuotes(false);

    if (restoreError) {
      console.error('Admin quote restore failed:', restoreError);
      setError(restoreError.message);
      setMessage('');
      return;
    }

    const restoredCount = typeof data === 'number' ? data : selectedCount;
    setSelectedQuoteIds([]);
    setSelectedQuote(null);
    setSelectedQuoteDetail(null);
    setStatusEvents([]);
    setInternalNotes([]);
    setFollowUpTasks([]);
    setCustomerActionRequests([]);
    setMessage(`Restored ${restoredCount} quote${restoredCount === 1 ? '' : 's'} back to Active Jobs.`);
    await loadQuotes({ clearMessage: false, view: quoteListView });
  };

  const getFollowUpSummaryForQuote = (quoteId: string) =>
    followUpSummaries[quoteId] || getEmptyFollowUpSummary(quoteId);

  const followUpCounts = quotes.reduce(
    (counts, quote) => {
      const summary = getFollowUpSummaryForQuote(quote.id);

      if (summary.follow_up_bucket === 'overdue') {
        counts.overdue += 1;
      }

      if (summary.follow_up_bucket === 'due_today') {
        counts.dueToday += 1;
      }

      if (summary.follow_up_bucket !== 'none') {
        counts.open += 1;
      } else {
        counts.none += 1;
      }

      return counts;
    },
    { overdue: 0, dueToday: 0, open: 0, none: 0 }
  );

  const getFollowUpFilterCount = (filter: FollowUpFilter) => {
    if (filter === 'overdue') return followUpCounts.overdue;
    if (filter === 'due_today') return followUpCounts.dueToday;
    if (filter === 'open') return followUpCounts.open;
    if (filter === 'none') return followUpCounts.none;
    return quotes.length;
  };

  const repFilterOptions = Array.from(
    quotes.reduce<Map<string, string>>((options, quote) => {
      const repSlug = quote.rep_slug?.trim();
      if (repSlug) {
        options.set(repSlug, quote.assigned_rep_name || repSlug);
      }
      return options;
    }, new Map())
  )
    .map(([repSlug, label]) => ({ repSlug, label }))
    .sort((first, second) => first.label.localeCompare(second.label));

  const normalizedQuoteSearch = quoteSearch.trim().toLowerCase();
  const filteredQuotes = quotes.filter((quote) => {
    const summary = getFollowUpSummaryForQuote(quote.id);

    if (quoteListView === 'active') {
      if (followUpFilter === 'open' && summary.follow_up_bucket === 'none') return false;
      if (followUpFilter !== 'all' && followUpFilter !== 'open' && summary.follow_up_bucket !== followUpFilter) return false;
    }

    if (selectedRepFilter === UNASSIGNED_REP_VALUE && quote.rep_slug) return false;
    if (
      selectedRepFilter !== ALL_REPS_FILTER_VALUE &&
      selectedRepFilter !== UNASSIGNED_REP_VALUE &&
      quote.rep_slug !== selectedRepFilter
    ) {
      return false;
    }

    if (quickQuoteFilter === 'junk' && !isLikelyJunkQuote(quote)) return false;
    if (normalizedQuoteSearch && !getQuoteSearchText(quote).includes(normalizedQuoteSearch)) return false;

    return true;
  });

  const selectedQuoteIdSet = new Set(selectedQuoteIds);
  const filteredQuoteIds = filteredQuotes.map((quote) => quote.id);
  const selectedVisibleQuoteCount = filteredQuoteIds.filter((quoteId) => selectedQuoteIdSet.has(quoteId)).length;
  const allVisibleQuotesSelected = filteredQuoteIds.length > 0 && selectedVisibleQuoteCount === filteredQuoteIds.length;

  const toggleQuoteSelection = (quoteId: string, checked: boolean, shiftKey = false) => {
    setSelectedQuoteIds((currentIds) => {
      const lastSelectedQuoteId = lastSelectedQuoteIdRef.current;

      if (shiftKey && lastSelectedQuoteId && lastSelectedQuoteId !== quoteId) {
        const startIndex = filteredQuoteIds.indexOf(lastSelectedQuoteId);
        const endIndex = filteredQuoteIds.indexOf(quoteId);

        if (startIndex !== -1 && endIndex !== -1) {
          const [rangeStart, rangeEnd] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
          const rangeQuoteIds = filteredQuoteIds.slice(rangeStart, rangeEnd + 1);

          if (checked) {
            return Array.from(new Set([...currentIds, ...rangeQuoteIds]));
          }

          return currentIds.filter((currentId) => !rangeQuoteIds.includes(currentId));
        }
      }

      if (checked) {
        return currentIds.includes(quoteId) ? currentIds : [...currentIds, quoteId];
      }

      return currentIds.filter((currentId) => currentId !== quoteId);
    });
    lastSelectedQuoteIdRef.current = quoteId;
    quoteSelectionShiftKeyRef.current = false;
  };

  const toggleAllVisibleQuotes = (checked: boolean) => {
    setSelectedQuoteIds((currentIds) => {
      if (!checked) {
        return currentIds.filter((currentId) => !filteredQuoteIds.includes(currentId));
      }

      return Array.from(new Set([...currentIds, ...filteredQuoteIds]));
    });
  };

  const clearQuoteSelection = (event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    setSelectedQuoteIds([]);
    lastSelectedQuoteIdRef.current = null;
    quoteSelectionShiftKeyRef.current = false;
  };

  const clearQuoteFilters = () => {
    setQuoteSearch('');
    setQuickQuoteFilter('all');
    setSelectedRepFilter(ALL_REPS_FILTER_VALUE);
    setFollowUpFilter('all');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Quote Status</h1>
            <p className="text-sm text-slate-600">Internal quote status updates</p>
          </div>
          <Button variant="outline" onClick={() => loadQuotes()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {message && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-4">
          {[
            { filter: 'overdue' as FollowUpFilter, label: 'Critical / Late', count: followUpCounts.overdue, className: 'border-red-200 bg-red-50 text-red-800' },
            { filter: 'due_today' as FollowUpFilter, label: 'Due Today', count: followUpCounts.dueToday, className: 'border-amber-200 bg-amber-50 text-amber-900' },
            { filter: 'open' as FollowUpFilter, label: 'On Point / Open', count: followUpCounts.open, className: 'border-blue-200 bg-blue-50 text-blue-800' },
            { filter: 'none' as FollowUpFilter, label: 'No Follow-Up', count: followUpCounts.none, className: 'border-slate-200 bg-white text-slate-700' }
          ].map((item) => (
            <button
              key={item.filter}
              type="button"
              onClick={() => setFollowUpFilter(item.filter)}
              className={`rounded-lg border p-4 text-left shadow-sm transition hover:shadow ${
                followUpFilter === item.filter ? 'ring-2 ring-blue-500' : ''
              } ${item.className}`}
            >
              <p className="text-sm font-medium">{item.label}</p>
              <p className="mt-1 text-3xl font-semibold">{item.count}</p>
            </button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-lg">{quoteListView === 'archived' ? 'Archived Quote Requests' : 'Recent Quote Requests'}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={quoteListView === 'active' ? 'default' : 'outline'}
                  onClick={() => {
                    setQuoteListView('active');
                    setFollowUpFilter('all');
                    void loadQuotes({ view: 'active' });
                  }}
                >
                  Active Jobs ({quoteListView === 'active' ? quotes.length : activeQuoteCount})
                </Button>
                <Button
                  size="sm"
                  variant={quoteListView === 'archived' ? 'default' : 'outline'}
                  onClick={() => {
                    setQuoteListView('archived');
                    setFollowUpFilter('all');
                    void loadQuotes({ view: 'archived' });
                  }}
                >
                  Archived ({archivedQuoteCount})
                </Button>
                {quoteListView === 'active' && FOLLOW_UP_FILTERS.map((filter) => (
                    <Button
                      key={filter.value}
                      size="sm"
                      variant={followUpFilter === filter.value ? 'default' : 'outline'}
                      onClick={() => setFollowUpFilter(filter.value)}
                    >
                      {filter.label} ({getFollowUpFilterCount(filter.value)})
                    </Button>
                  ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_auto] lg:items-center">
              <div className="grid gap-2 md:grid-cols-[minmax(14rem,1fr)_minmax(12rem,16rem)_auto_auto] md:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={quoteSearch}
                    onChange={(event) => setQuoteSearch(event.target.value)}
                    className="pl-9"
                    placeholder="Search name, email, phone, rep, quote ID..."
                  />
                </div>
                <Select value={selectedRepFilter} onValueChange={setSelectedRepFilter}>
                  <SelectTrigger aria-label="Filter by rep">
                    <SelectValue placeholder="Filter by rep" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_REPS_FILTER_VALUE}>All reps</SelectItem>
                    <SelectItem value={UNASSIGNED_REP_VALUE}>Unassigned</SelectItem>
                    {repFilterOptions.map((rep) => (
                      <SelectItem key={rep.repSlug} value={rep.repSlug}>
                        {rep.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant={quickQuoteFilter === 'junk' ? 'default' : 'outline'}
                  onClick={() => setQuickQuoteFilter((currentFilter) => (currentFilter === 'junk' ? 'all' : 'junk'))}
                >
                  Likely junk/test
                </Button>
                <Button type="button" variant="ghost" onClick={clearQuoteFilters}>
                  Clear filters
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 lg:justify-end">
                <span>
                  Showing {filteredQuotes.length} of {quotes.length}
                </span>
                {enableBulkActions && filteredQuotes.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => toggleAllVisibleQuotes(true)}
                    disabled={allVisibleQuotesSelected}
                  >
                    Select visible ({filteredQuotes.length})
                  </Button>
                )}
              </div>
            </div>
            {enableBulkActions && selectedQuoteIds.length > 0 && (
              <div className="mb-4 flex flex-col gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-medium">
                  {selectedQuoteIds.length} quote{selectedQuoteIds.length === 1 ? '' : 's'} selected
                </p>
                <div className="flex flex-wrap gap-2">
                  {quoteListView === 'active' ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!canArchiveQuotes || archivingQuotes}
                      onClick={() => void archiveSelectedQuotes()}
                      title={canArchiveQuotes ? 'Hide selected jobs without deleting records.' : 'Owner admin access is required.'}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      {archivingQuotes ? 'Archiving...' : 'Archive selected'}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!canArchiveQuotes || restoringQuotes}
                      onClick={() => void restoreSelectedQuotes()}
                      title={canArchiveQuotes ? 'Move selected jobs back to the active list.' : 'Owner admin access is required.'}
                    >
                      {restoringQuotes ? 'Restoring...' : 'Restore selected'}
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="outline" disabled title="Delete will be enabled after the secure backend action is added.">
                    Delete disabled
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={clearQuoteSelection}>
                    Clear selection
                  </Button>
                </div>
              </div>
            )}
            {loading ? (
              <div className="py-10 text-center text-sm text-slate-600">Loading quote requests...</div>
            ) : quotes.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-600">No quote requests found.</div>
            ) : filteredQuotes.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-600">No quote requests match the current filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[72rem]">
                  <TableHeader>
                    <TableRow>
                      {enableBulkActions && (
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allVisibleQuotesSelected}
                            aria-label="Select all visible quotes"
                            onCheckedChange={(checked) => toggleAllVisibleQuotes(checked === true)}
                          />
                        </TableHead>
                      )}
                      <TableHead>Lead / Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Assigned To / Channel</TableHead>
                      <TableHead>Follow-Up / Next Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Quote ID</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="w-32 text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotes.map((quote) => {
                    const selectedStatus = getSelectedStatus(quote);
                    const isSaving = savingId === quote.id;
                    const followUpSummary = getFollowUpSummaryForQuote(quote.id);
                    const followUpBucket = followUpSummary.follow_up_bucket;
                    const isOverdue = followUpBucket === 'overdue';
                    const fileCount = getQuoteFileCount(quote);
                    const rowCallHref = getPhoneHref(quote.customer_phone, 'tel');
                    const rowTextHref = getPhoneHref(quote.customer_phone, 'sms');

                    return (
                      <TableRow
                        key={quote.id}
                        className={`cursor-pointer ${getStatusRowClassName(selectedStatus)} ${getFollowUpSurfaceClassName(followUpBucket)}`}
                        onClick={() => openQuoteDetail(quote)}
                      >
                        {enableBulkActions && (
                          <TableCell onClick={(event) => event.stopPropagation()}>
                            <Checkbox
                              checked={selectedQuoteIdSet.has(quote.id)}
                              aria-label={`Select quote ${quote.quote_id || quote.customer_name}`}
                              onClickCapture={(event) => {
                                quoteSelectionShiftKeyRef.current = event.shiftKey;
                              }}
                              onCheckedChange={(checked) => toggleQuoteSelection(quote.id, checked === true, quoteSelectionShiftKeyRef.current)}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="min-w-[14rem] space-y-1">
                            <p className="font-medium text-slate-950">{quote.customer_name}</p>
                            <p className="text-sm text-slate-600">{quote.customer_email}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs text-slate-500">{formatDate(quote.created_at)}</span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                  fileCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {fileCount > 0 ? `Files: ${fileCount}` : 'No files'}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getProductBadgeClassName(quote)}`}>
                            {getProductLabel(quote)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-[10rem] space-y-1">
                            <p className="text-sm font-medium text-slate-900">{quote.assigned_rep_name || 'Unassigned'}</p>
                            <p className="text-xs text-slate-500">{getAssignedChannelLabel(quote)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {isOverdue && (
                                <span className="inline-flex rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                                  Overdue
                                </span>
                              )}
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getFollowUpBadgeClassName(followUpSummary.follow_up_bucket)}`}
                              >
                                {getFollowUpBucketLabel(followUpSummary.follow_up_bucket)}
                              </span>
                            </div>
                            {followUpSummary.next_follow_up_task_text && followUpSummary.next_follow_up_due_date ? (
                              <div className="space-y-0.5">
                                <p className={`line-clamp-2 text-sm ${isOverdue ? 'font-medium text-red-950' : 'text-slate-900'}`}>
                                  {followUpSummary.next_follow_up_task_text}
                                </p>
                                <p className={`text-xs ${isOverdue ? 'font-medium text-red-700' : 'text-slate-500'}`}>
                                  Due {formatDueDate(followUpSummary.next_follow_up_due_date)}
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500">No open task</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <div className="space-y-1">
                            <Select
                              value={selectedStatus}
                              disabled={isSaving}
                              onValueChange={(value) => {
                                const nextStatus = value as QuoteStatus;
                                setPendingStatuses((currentStatuses) => ({
                                  ...currentStatuses,
                                  [quote.id]: nextStatus
                                }));
                                void saveStatus(quote, nextStatus);
                              }}
                            >
                              <SelectTrigger className={`w-44 font-medium ${getStatusSelectClassName(selectedStatus)}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_GROUPS.map((group, groupIndex) => (
                                  <SelectGroup key={group.label}>
                                    {groupIndex > 0 && <SelectSeparator />}
                                    <SelectLabel>{group.label}</SelectLabel>
                                    {group.statuses.map((status) => (
                                      <SelectItem key={status} value={status}>
                                        {formatStatusLabel(status)}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="max-w-[13rem] text-xs leading-snug text-slate-500">
                              Use Follow-Up / Customer Action Requests for waiting-on-customer situations until status flow is upgraded.
                            </p>
                            {isSaving && <p className="text-xs text-slate-500">Saving...</p>}
                          </div>
                        </TableCell>
                        <TableCell
                          onClick={(event) => {
                            event.stopPropagation();
                            openQuoteDetail(quote);
                          }}
                        >
                          <button
                            type="button"
                            className="max-w-[11rem] break-all text-left font-mono text-xs font-medium text-blue-700 underline-offset-2 hover:underline"
                            aria-label={`Open quote details for ${quote.quote_id || quote.customer_name}`}
                          >
                            {quote.quote_id || '-'}
                          </button>
                        </TableCell>
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            {rowCallHref ? (
                              <Button asChild type="button" size="icon" variant="outline" title="Call customer">
                                <a href={rowCallHref} aria-label={`Call ${quote.customer_name}`}>
                                  <Phone className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                            ) : (
                              <Button type="button" size="icon" variant="outline" disabled title="No phone number">
                                <Phone className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {rowTextHref ? (
                              <Button asChild type="button" size="icon" variant="outline" title="Text customer">
                                <a href={rowTextHref} aria-label={`Text ${quote.customer_name}`}>
                                  <MessageSquare className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                            ) : (
                              <Button type="button" size="icon" variant="outline" disabled title="No phone number">
                                <MessageSquare className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell onClick={(event) => event.stopPropagation()} className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openQuoteDetail(quote)}
                          >
                            <Eye className="mr-2 h-3.5 w-3.5" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={Boolean(selectedQuote)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedQuote(null);
              setSelectedQuoteDetail(null);
              setStatusEvents([]);
              setInternalNotes([]);
              setFollowUpTasks([]);
              setCustomerActionRequests([]);
              setNewInternalNote('');
              setNewFollowUpTaskText('');
              setNewFollowUpDueDate('');
              setCustomerActionRequestTypes([]);
              setCustomerActionMessage(getDefaultCustomerActionMessage());
              setNotifySalesRep(false);
              setNoteMessage('');
              setNoteWarning('');
              setNoteError('');
              setSelectedAssignRepSlug(UNASSIGNED_REP_VALUE);
              setAssignRepMessage('');
              setAssignRepError('');
              setProofImageUrl('');
              setProofPaymentUrl('');
              setProofMode('single');
              setProofOptions([]);
              setProofPortalMessage('');
              setProofPortalError('');
              setFollowUpMessage('');
              setFollowUpError('');
              setCustomerActionMessageStatus('');
              setCustomerActionError('');
            }
          }}
        >
          {selectedQuote && (() => {
            const activeQuote = selectedQuoteDetail || selectedQuote;
            const hasSalesRepNotificationTarget = Boolean(activeQuote.rep_email || activeQuote.rep_slug);
            const uploadedFiles = getUploadedFiles(activeQuote);
            const groupedFiles = getGroupedFiles(uploadedFiles);
            const stillNeededItems = getStillNeededItems(groupedFiles, customerActionRequests);
            const hasArtworkOrLogo = groupedFiles.artworkFiles.length > 0;
            const productType = getProductType(activeQuote);
            const isBannerQuote = productType === 'banner';
            const isSignageQuote = productType === 'sign' || productType === 'signage';
            const fileReadinessSections = getFileReadinessSections(productType, groupedFiles);
            const nextFollowUpTask = followUpTasks.find((task) => task.status === 'open') || null;
            const nextFollowUpBucket = nextFollowUpTask ? getFollowUpTaskBucket(nextFollowUpTask) : 'none';
            const currentAssignRepSlug = activeQuote.rep_slug || UNASSIGNED_REP_VALUE;
            const hasAssignmentChange = selectedAssignRepSlug !== currentAssignRepSlug;
            const activeProofOptions = proofOptions.length > 0 ? proofOptions : getCustomerProofOptions(activeQuote);
            const selectedCallHref = getPhoneHref(activeQuote.customer_phone, 'tel');
            const selectedTextHref = getPhoneHref(activeQuote.customer_phone, 'sms');

            return (
            <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{activeQuote.quote_id || activeQuote.customer_name}</DialogTitle>
                <DialogDescription>Read-only quote request details</DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-6">
                {loadingDetail && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    Loading quote details...
                  </div>
                )}

                <section className="order-1">
                  <h3 className="mb-3 text-sm font-semibold text-slate-950">Customer</h3>
                  <dl className="grid gap-4 md:grid-cols-3">
                    <DetailField label="Customer Name" value={activeQuote.customer_name} />
                    <DetailField label="Email" value={activeQuote.customer_email} />
                    <DetailField label="Phone" value={activeQuote.customer_phone} />
                    <DetailField label="Preferred Contact" value={activeQuote.preferred_contact} />
                    <DetailField label="Rep Slug" value={activeQuote.rep_slug} />
                    <DetailField label="Assigned Rep" value={activeQuote.assigned_rep_name} />
                    <DetailField label="Product" value={getProductLabel(activeQuote)} />
                    <div>
                      <dt className="text-xs font-medium uppercase text-slate-500">Current Status</dt>
                      <dd className="mt-1">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClassName(activeQuote.status)}`}>
                          {formatStatusLabel(activeQuote.status)}
                        </span>
                      </dd>
                    </div>
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
                  {canAssignReps && (
                    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div className="w-full max-w-sm space-y-2">
                          <label className="text-xs font-medium uppercase text-slate-500" htmlFor="assign-rep-select">
                            Assign Rep
                          </label>
                          <Select
                            value={selectedAssignRepSlug}
                            onValueChange={(value) => {
                              setSelectedAssignRepSlug(value);
                              setAssignRepMessage('');
                              setAssignRepError('');
                            }}
                            disabled={loadingAssignableReps || assigningRep}
                          >
                            <SelectTrigger id="assign-rep-select">
                              <SelectValue placeholder={loadingAssignableReps ? 'Loading reps...' : 'Choose assignment'} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={UNASSIGNED_REP_VALUE}>Unassigned</SelectItem>
                              {assignableReps.map((rep) => (
                                <SelectItem key={rep.rep_slug} value={rep.rep_slug}>
                                  {rep.assigned_rep_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {loadingAssignableReps && (
                            <p className="text-xs text-slate-500">Loading assignable reps...</p>
                          )}
                        </div>
                        <Button
                          onClick={saveAssignedRep}
                          disabled={assigningRep || loadingAssignableReps || !hasAssignmentChange}
                        >
                          {assigningRep ? 'Saving...' : 'Save Assignment'}
                        </Button>
                      </div>
                      {assignRepMessage && (
                        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                          {assignRepMessage}
                        </div>
                      )}
                      {assignRepError && (
                        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                          {assignRepError}
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <section className="order-2">
                  <h3 className="mb-3 text-sm font-semibold text-slate-950">Customer Proof Portal</h3>
                  <div className="rounded-md border border-slate-200 bg-white p-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase text-slate-500" htmlFor="proof-mode">
                          Proof Mode
                        </label>
                        <Select
                          value={proofMode}
                          onValueChange={(value) => {
                            const nextProofMode = value as ProofMode;
                            setProofMode(nextProofMode);
                            setProofPortalMessage('');
                            setProofPortalError('');
                          }}
                        >
                          <SelectTrigger id="proof-mode">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Single proof</SelectItem>
                            <SelectItem value="multi">Multiple options</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase text-slate-500" htmlFor="proof-image-url">
                          Current Proof Image URL
                        </label>
                        <Input
                          id="proof-image-url"
                          value={proofImageUrl}
                          onChange={(event) => {
                            setProofImageUrl(event.target.value);
                            setProofPortalMessage('');
                            setProofPortalError('');
                          }}
                          placeholder="https://..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase text-slate-500" htmlFor="proof-payment-url">
                          Deposit / Balance Payment Link
                        </label>
                        <Input
                          id="proof-payment-url"
                          value={proofPaymentUrl}
                          onChange={(event) => {
                            setProofPaymentUrl(event.target.value);
                            setProofPortalMessage('');
                            setProofPortalError('');
                          }}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void saveProofMode()}
                        disabled={savingProofPortal || uploadingProof || uploadingProofOptions}
                      >
                        {savingProofPortal ? 'Saving...' : 'Save Proof Mode'}
                      </Button>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <DetailField label="Customer Phase" value={formatStatusLabel(activeQuote.status)} />
                      <DetailField label="Proof Status" value={formatStatusLabel(activeQuote.customer_proof_status || 'pending')} />
                      <DetailField label="Approved At" value={activeQuote.customer_proof_approved_at ? formatDate(activeQuote.customer_proof_approved_at) : null} />
                    </div>
                    {activeQuote.selected_customer_proof_option_id && (
                      <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3">
                        <p className="text-xs font-medium uppercase text-blue-800">Selected Proof Option</p>
                        <div className="mt-2 flex gap-3">
                          {activeQuote.selected_customer_proof_option_image_url && (
                            <img
                              src={activeQuote.selected_customer_proof_option_image_url}
                              alt={activeQuote.selected_customer_proof_option_label || 'Selected proof option'}
                              className="h-20 w-28 rounded border border-blue-100 bg-white object-contain"
                            />
                          )}
                          <div className="min-w-0 text-sm text-blue-950">
                            <p className="font-medium">{activeQuote.selected_customer_proof_option_label || 'Selected option'}</p>
                            {activeQuote.customer_proof_selected_at && (
                              <p className="text-blue-800">{formatDate(activeQuote.customer_proof_selected_at)}</p>
                            )}
                            {activeQuote.customer_proof_selection_message && (
                              <p className="mt-1 whitespace-pre-wrap">{activeQuote.customer_proof_selection_message}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {activeQuote.customer_proof_revision_message && (
                      <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
                        <p className="text-xs font-medium uppercase text-amber-800">Latest Revision Request</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-amber-950">
                          {activeQuote.customer_proof_revision_message}
                        </p>
                      </div>
                    )}
                    {proofMode === 'multi' && (
                      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-950">Proof Options</p>
                            <p className="text-xs text-slate-500">{activeProofOptions.length}/10 options uploaded</p>
                          </div>
                          <div>
                            <input
                              ref={proofOptionsUploadInputRef}
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={uploadProofOptions}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              disabled={savingProofPortal || uploadingProofOptions || activeProofOptions.length >= 10}
                              onClick={() => proofOptionsUploadInputRef.current?.click()}
                            >
                              <Upload className="mr-2 h-3.5 w-3.5" />
                              {uploadingProofOptions ? 'Uploading...' : 'Upload Options'}
                            </Button>
                          </div>
                        </div>
                        {activeProofOptions.length > 0 ? (
                          <div className="mt-3 grid gap-3">
                            {activeProofOptions.map((option, optionIndex) => (
                              <div key={option.id} className="rounded-md border border-slate-200 bg-white p-3">
                                <div className="flex flex-col gap-3 md:flex-row">
                                  <img
                                    src={option.image_url}
                                    alt={option.label}
                                    className="h-28 w-full rounded border border-slate-100 bg-slate-50 object-contain md:w-40"
                                  />
                                  <div className="min-w-0 flex-1 space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="font-medium text-slate-950">{option.label}</p>
                                      <div className="flex gap-1">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          disabled={savingProofPortal || optionIndex === 0}
                                          onClick={() => void moveProofOption(option.id, -1)}
                                          aria-label={`Move ${option.label} up`}
                                        >
                                          <ArrowUp className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          disabled={savingProofPortal || optionIndex === activeProofOptions.length - 1}
                                          onClick={() => void moveProofOption(option.id, 1)}
                                          aria-label={`Move ${option.label} down`}
                                        >
                                          <ArrowDown className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          disabled={deletingProofOptionId === option.id}
                                          onClick={() => void deleteProofOption(option.id)}
                                          aria-label={`Delete ${option.label}`}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                    <Textarea
                                      value={option.admin_note || ''}
                                      onChange={(event) => {
                                        const nextNote = event.target.value;
                                        setProofOptions((currentOptions) =>
                                          currentOptions.map((currentOption) =>
                                            currentOption.id === option.id
                                              ? { ...currentOption, admin_note: nextNote }
                                              : currentOption
                                          )
                                        );
                                      }}
                                      rows={2}
                                      placeholder="Optional note shown with this option."
                                    />
                                    <div className="flex justify-end">
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => void saveProofOption(option)}
                                        disabled={savingProofOptionId === option.id}
                                      >
                                        {savingProofOptionId === option.id ? 'Saving...' : 'Save Note'}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                            Upload up to 10 image proof options. They will appear as Option A-J on the private proof link.
                          </p>
                        )}
                      </div>
                    )}
                    <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 text-xs text-slate-500">
                        {activeQuote.customer_proof_token ? (
                          <span className="block truncate">{getCustomerProofLink(activeQuote.customer_proof_token)}</span>
                        ) : (
                          <span>Save once to generate a secure private customer link.</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <input
                          ref={proofUploadInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={uploadNewProof}
                        />
                        {proofMode === 'single' && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={savingProofPortal || uploadingProof}
                              onClick={() => proofUploadInputRef.current?.click()}
                            >
                              <Upload className="mr-2 h-3.5 w-3.5" />
                              {uploadingProof ? 'Uploading...' : 'Upload New Proof'}
                            </Button>
                            <Button onClick={saveProofPortalSettings} disabled={savingProofPortal || uploadingProof}>
                              {savingProofPortal ? 'Saving...' : 'Save Proof Portal'}
                            </Button>
                          </>
                        )}
                        {proofMode === 'multi' && (
                          <Button
                            onClick={saveProofPortalSettings}
                            disabled={savingProofPortal || uploadingProofOptions}
                          >
                            {savingProofPortal
                              ? 'Saving...'
                              : activeQuote.customer_proof_token
                                ? 'Save Proof Portal'
                                : 'Create Proof Link'}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!activeQuote.customer_proof_token}
                          onClick={() => copyProofPortalLink(activeQuote.customer_proof_token)}
                        >
                          <Copy className="mr-2 h-3.5 w-3.5" />
                          Copy Link
                        </Button>
                        {activeQuote.customer_proof_token && (
                          <Button asChild type="button" variant="outline">
                            <a href={getCustomerProofLink(activeQuote.customer_proof_token)} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-2 h-3.5 w-3.5" />
                              Open
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                    {proofPortalMessage && (
                      <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                        {proofPortalMessage}
                      </div>
                    )}
                    {proofPortalError && (
                      <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {proofPortalError}
                      </div>
                    )}
                  </div>
                </section>

                <section className="order-3">
                  <h3 className="mb-3 text-sm font-semibold text-slate-950">Designer Packet</h3>
                  <div className="rounded-md border border-slate-200 bg-white p-4">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-950">Send this quote to a designer from here.</p>
                        <p className="mt-1 text-xs text-slate-500">
                          The designer gets a private link with quote details, customer uploads, notes, and a place to send proof files back.
                        </p>
                      </div>
                      <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {loadingDesignerPacket ? 'Loading...' : designerPacket ? formatStatusLabel(designerPacket.status) : 'Not sent'}
                      </span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase text-slate-500" htmlFor="designer-email">
                          Designer Email
                        </label>
                        <Input
                          id="designer-email"
                          type="email"
                          value={designerEmail}
                          onChange={(event) => {
                            setDesignerEmail(event.target.value);
                            setDesignerPacketMessage('');
                            setDesignerPacketError('');
                          }}
                          placeholder="designer@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase text-slate-500" htmlFor="designer-name">
                          Designer Name
                        </label>
                        <Input
                          id="designer-name"
                          value={designerName}
                          onChange={(event) => {
                            setDesignerName(event.target.value);
                            setDesignerPacketMessage('');
                            setDesignerPacketError('');
                          }}
                          placeholder="Optional"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase text-slate-500" htmlFor="designer-cloud-folder">
                          Cloud Folder Link
                        </label>
                        <Input
                          id="designer-cloud-folder"
                          value={designerCloudFolderUrl}
                          onChange={(event) => {
                            setDesignerCloudFolderUrl(event.target.value);
                            setDesignerPacketMessage('');
                            setDesignerPacketError('');
                          }}
                          placeholder="Google Drive / Dropbox / folder link"
                        />
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      <label className="text-xs font-medium uppercase text-slate-500" htmlFor="designer-instructions">
                        Designer Instructions
                      </label>
                      <Textarea
                        id="designer-instructions"
                        value={designerInstructions}
                        onChange={(event) => {
                          setDesignerInstructions(event.target.value);
                          setDesignerPacketMessage('');
                          setDesignerPacketError('');
                        }}
                        rows={7}
                      />
                    </div>

                    <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 text-xs text-slate-500">
                        {designerPacket?.token ? (
                          <span className="block truncate">{getDesignerPacketLink(designerPacket.token)}</span>
                        ) : (
                          <span>Send once to create a private designer packet link.</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={sendDesignerPacket}
                          disabled={sendingDesignerPacket || !designerEmail.trim() || !designerInstructions.trim()}
                        >
                          <Send className="mr-2 h-3.5 w-3.5" />
                          {sendingDesignerPacket ? 'Sending...' : designerPacket ? 'Resend Packet' : 'Send Designer Packet'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!designerPacket?.token}
                          onClick={copyDesignerPacketLink}
                        >
                          <Copy className="mr-2 h-3.5 w-3.5" />
                          Copy Link
                        </Button>
                        {designerPacket?.token && (
                          <Button asChild type="button" variant="outline">
                            <a href={getDesignerPacketLink(designerPacket.token)} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-2 h-3.5 w-3.5" />
                              Open
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>

                    {designerPacketMessage && (
                      <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                        {designerPacketMessage}
                      </div>
                    )}
                    {designerPacketError && (
                      <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {designerPacketError}
                      </div>
                    )}

                    {designerPacket && (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                          <p className="mb-2 text-xs font-medium uppercase text-slate-500">Designer Proof Files</p>
                          {Array.isArray(designerPacket.files) && designerPacket.files.length > 0 ? (
                            <div className="space-y-2">
                              {designerPacket.files.map((file) => (
                                <a
                                  key={file.id}
                                  href={file.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-2 text-sm hover:border-blue-300"
                                >
                                  <span className="min-w-0 truncate">{file.file_name}</span>
                                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                                </a>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">No designer proof files yet.</p>
                          )}
                        </div>
                        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                          <p className="mb-2 text-xs font-medium uppercase text-slate-500">Designer Notes</p>
                          {Array.isArray(designerPacket.notes) && designerPacket.notes.length > 0 ? (
                            <div className="space-y-2">
                              {designerPacket.notes.slice(0, 3).map((note) => (
                                <div key={note.id} className="rounded-md border border-slate-200 bg-white p-2">
                                  <div className="mb-1 flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium uppercase text-slate-500">{formatStatusLabel(note.author_type)}</span>
                                    <span className="text-xs text-slate-500">{formatDate(note.created_at)}</span>
                                  </div>
                                  <p className="whitespace-pre-wrap text-sm text-slate-900">{note.note_text}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">No designer notes yet.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <section className="order-3">
                  <h3 className="mb-3 text-sm font-semibold text-slate-950">Project</h3>
                  <dl className="grid gap-4 md:grid-cols-3">
                    <DetailField label="Vehicle Type" value={getQuoteValue(activeQuote, ['vehicleType', 'vehicle_type'])} />
                    <DetailField label="Year" value={getVehicleText(activeQuote).year} />
                    <DetailField label="Make" value={getVehicleText(activeQuote).make} />
                    <DetailField label="Model" value={getVehicleText(activeQuote).model} />
                    <DetailField
                      label="Manual Vehicle Description"
                      value={getQuoteValue(activeQuote, [
                        'manualVehicleDescription',
                        'customVehicleDescription',
                        'otherVehicleDescription'
                      ])}
                    />
                    <DetailField label="Service Selected" value={getQuoteValue(activeQuote, ['selectedService', 'service'])} />
                    <DetailField label="Budget" value={getQuoteValue(activeQuote, ['budget', 'budget_range'])} />
                  </dl>
                  <div className="mt-4">
                    <DetailField label="Project Notes" value={getQuoteValue(activeQuote, ['goal', 'notes', 'projectNotes'])} />
                  </div>
                </section>

                {isBannerQuote && (
                  <section className="order-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-950">Banner Details</h3>
                    <dl className="grid gap-4 md:grid-cols-3">
                      <DetailField label="Width" value={getBannerValue(activeQuote, 'width')} />
                      <DetailField label="Height" value={getBannerValue(activeQuote, 'height')} />
                      <DetailField label="Unit" value={getBannerValue(activeQuote, 'unit')} />
                      <DetailField label="Quantity" value={getBannerValue(activeQuote, 'quantity')} />
                      <DetailField label="Indoor / Outdoor" value={getBannerValue(activeQuote, 'indoorOutdoor')} />
                      <DetailField label="Sides" value={getBannerValue(activeQuote, 'sides')} />
                      <DetailField label="Grommets" value={getBannerValue(activeQuote, 'grommets')} />
                      <DetailField label="Hemmed Edges" value={getBannerValue(activeQuote, 'hemmedEdges')} />
                      <DetailField label="Pole Pockets" value={getBannerValue(activeQuote, 'polePockets')} />
                      <DetailField label="Material Preference" value={getBannerValue(activeQuote, 'materialPreference')} />
                      <DetailField label="Design Needed" value={getBannerValue(activeQuote, 'designNeeded')} />
                      <DetailField label="AI Design Prompt" value={getBannerValue(activeQuote, 'aiDesignPrompt')} />
                      <DetailField label="Saved Design Preview" value={getBannerValue(activeQuote, 'aiDesignPreviewSaved')} />
                      <DetailField label="Deadline" value={getBannerValue(activeQuote, 'deadline')} />
                      <DetailField label="Delivery Method" value={getBannerValue(activeQuote, 'deliveryMethod')} />
                    </dl>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <DetailField label="Banner Text" value={getBannerValue(activeQuote, 'bannerText')} />
                      <DetailField label="Brand Colors" value={getBannerValue(activeQuote, 'brandColors')} />
                      <DetailField label="Building / Placement Notes" value={getBannerValue(activeQuote, 'placementNotes')} />
                    </div>
                    <div className="mt-4">
                      <DetailField label="Notes" value={getBannerValue(activeQuote, 'notes')} />
                    </div>
                  </section>
                )}

                {isSignageQuote && (
                  <section className="order-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-950">Signage Details</h3>
                    <dl className="grid gap-4 md:grid-cols-3">
                      <DetailField label="Material" value={getSignageValue(activeQuote, 'material')} />
                      <DetailField label="Width" value={getSignageValue(activeQuote, 'width')} />
                      <DetailField label="Height" value={getSignageValue(activeQuote, 'height')} />
                      <DetailField label="Unit" value={getSignageValue(activeQuote, 'unit')} />
                      <DetailField label="Quantity" value={getSignageValue(activeQuote, 'quantity')} />
                    </dl>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <DetailField label="Sign Text" value={getSignageValue(activeQuote, 'signText')} />
                      <DetailField label="Notes" value={getSignageValue(activeQuote, 'notes')} />
                    </div>
                  </section>
                )}

                <section className="order-9">
                  <h3 className="mb-3 text-sm font-semibold text-slate-950">Activity Timeline</h3>
                  {loadingEvents ? (
                    <p className="text-sm text-slate-500">Loading timeline...</p>
                  ) : statusEvents.length === 0 ? (
                    <p className="text-sm text-slate-500">No timeline events yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {statusEvents.map((event) => (
                        <div key={event.id} className="rounded-md border border-slate-200 bg-white p-3">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {event.message || formatEventType(event.event_type)}
                              </p>
                              {event.status && (
                                <p className="text-xs text-slate-500">
                                  Status: {formatStatusLabel(event.status)}
                                </p>
                              )}
                            </div>
                            <time className="text-xs text-slate-500">{formatDate(event.created_at)}</time>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="order-5">
                  <h3 className="mb-3 text-sm font-semibold text-slate-950">Customer Action Request</h3>
                  <div className="rounded-md border border-slate-200 bg-white p-4">
                    <div className="grid gap-3 md:grid-cols-[16rem_1fr]">
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase text-slate-500">Requested Items</p>
                        <div className="space-y-2 rounded-md border border-slate-200 p-3">
                          {CUSTOMER_ACTION_REQUEST_OPTIONS.map((option) => {
                            const isChecked = customerActionRequestTypes.includes(option.value);

                            return (
                              <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm text-slate-900">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    setCustomerActionRequestTypes((currentTypes) =>
                                      checked
                                        ? Array.from(new Set([...currentTypes, option.value]))
                                        : currentTypes.filter((requestType) => requestType !== option.value)
                                    );
                                    setCustomerActionError('');
                                    setCustomerActionMessageStatus('');
                                  }}
                                />
                                {option.label}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase text-slate-500" htmlFor="customer-action-message">
                          Message
                        </label>
                        <Textarea
                          id="customer-action-message"
                          value={customerActionMessage}
                          onChange={(event) => {
                            setCustomerActionMessage(event.target.value);
                            setCustomerActionError('');
                            setCustomerActionMessageStatus('');
                          }}
                          rows={4}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-slate-500">
                        Sends to {activeQuote.customer_email}. Customer should reply by email with the requested files or information.
                      </p>
                      <Button
                        onClick={sendCustomerActionRequest}
                        disabled={sendingCustomerAction || !customerActionMessage.trim()}
                      >
                        {sendingCustomerAction ? 'Sending...' : 'Send Request'}
                      </Button>
                    </div>
                    {customerActionMessageStatus && (
                      <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                        {customerActionMessageStatus}
                      </div>
                    )}
                    {customerActionError && (
                      <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {customerActionError}
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    {loadingCustomerActions ? (
                      <p className="text-sm text-slate-500">Loading customer action requests...</p>
                    ) : customerActionRequests.length === 0 ? (
                      <p className="text-sm text-slate-500">No customer action requests sent yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {customerActionRequests.map((request) => {
                          const requestLabels = getCustomerActionRequestLabels(getStoredCustomerActionRequestTypes(request));

                          return (
                            <div key={request.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                              <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="flex flex-wrap gap-1">
                                    {requestLabels.map((label) => (
                                      <span key={label} className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                                        {label}
                                      </span>
                                    ))}
                                  </div>
                                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                    {formatStatusLabel(request.status)}
                                  </span>
                                </div>
                                <time className="text-xs text-slate-500">{formatDate(request.sent_at)}</time>
                              </div>
                              <p className="whitespace-pre-wrap text-sm text-slate-900">{request.message}</p>
                              <p className="mt-2 text-xs text-slate-500">
                                Sent to {request.customer_email} by {request.created_by}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>

                <section className="order-6">
                  <h3 className="mb-3 text-sm font-semibold text-slate-950">Next Action</h3>
                  {loadingFollowUps ? (
                    <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500">
                      Loading next action...
                    </div>
                  ) : nextFollowUpTask ? (
                    <div
                      className={`rounded-md border p-4 ${
                        nextFollowUpBucket === 'overdue'
                          ? 'border-red-200 bg-red-50'
                          : nextFollowUpBucket === 'due_today'
                            ? 'border-amber-200 bg-amber-50'
                            : 'border-blue-200 bg-blue-50'
                      }`}
                    >
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${getFollowUpBadgeClassName(nextFollowUpBucket)}`}>
                          {getFollowUpBucketLabel(nextFollowUpBucket)}
                        </span>
                        <div className="text-left sm:text-right">
                          <p className="text-xs font-medium uppercase text-slate-500">Due Date</p>
                          <p className="text-lg font-semibold text-slate-950">{formatDueDate(nextFollowUpTask.due_date)}</p>
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap text-sm font-medium text-slate-950">{nextFollowUpTask.task_text}</p>
                    </div>
                  ) : (
                    <div className="rounded-md border border-slate-200 bg-white p-4">
                      <p className="text-sm font-medium text-slate-900">No open next action.</p>
                      <p className="mt-1 text-sm text-slate-500">Add a follow-up task below when staff needs a reminder or next step.</p>
                    </div>
                  )}
                </section>

                <section className="order-7">
                  <h3 className="mb-3 text-sm font-semibold text-slate-950">Follow-Up Tasks</h3>
                  <div className="rounded-md border border-slate-200 bg-white p-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_12rem]">
                      <Textarea
                        value={newFollowUpTaskText}
                        onChange={(event) => {
                          setNewFollowUpTaskText(event.target.value);
                          setFollowUpError('');
                          setFollowUpMessage('');
                        }}
                        placeholder="Add a follow-up task, reminder, or next action."
                        rows={3}
                      />
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase text-slate-500" htmlFor="follow-up-due-date">
                          Due Date
                        </label>
                        <Input
                          id="follow-up-due-date"
                          type="date"
                          value={newFollowUpDueDate}
                          onChange={(event) => {
                            setNewFollowUpDueDate(event.target.value);
                            setFollowUpError('');
                            setFollowUpMessage('');
                          }}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-slate-500">Open tasks are shown first. Overdue tasks are highlighted.</p>
                      <Button
                        onClick={saveFollowUpTask}
                        disabled={savingFollowUp || !newFollowUpTaskText.trim() || !newFollowUpDueDate}
                      >
                        {savingFollowUp ? 'Saving...' : 'Add Follow-Up'}
                      </Button>
                    </div>
                    {followUpMessage && (
                      <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                        {followUpMessage}
                      </div>
                    )}
                    {followUpError && (
                      <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {followUpError}
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    {loadingFollowUps ? (
                      <p className="text-sm text-slate-500">Loading follow-up tasks...</p>
                    ) : followUpTasks.length === 0 ? (
                      <p className="text-sm text-slate-500">No follow-up tasks yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {followUpTasks.map((task) => {
                          const isCompleted = task.status === 'completed';
                          const isOverdue = isFollowUpOverdue(task);

                          return (
                            <div
                              key={task.id}
                              className={`rounded-md border p-3 ${
                                isOverdue
                                  ? 'border-red-200 bg-red-50'
                                  : isCompleted
                                    ? 'border-slate-200 bg-slate-50'
                                    : 'border-amber-200 bg-amber-50'
                              }`}
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                        isCompleted
                                          ? 'bg-slate-200 text-slate-700'
                                          : isOverdue
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-amber-100 text-amber-800'
                                      }`}
                                    >
                                      {isCompleted ? 'Completed' : isOverdue ? 'Overdue' : 'Open'}
                                    </span>
                                    <span className="text-xs text-slate-600">Due {formatDueDate(task.due_date)}</span>
                                  </div>
                                  <p className={`whitespace-pre-wrap text-sm ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                                    {task.task_text}
                                  </p>
                                  <p className="mt-2 text-xs text-slate-500">
                                    Created by {task.created_by} on {formatDate(task.created_at)}
                                    {task.completed_at ? ` - Completed ${formatDate(task.completed_at)}` : ''}
                                  </p>
                                </div>
                                {!isCompleted && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="shrink-0 bg-white"
                                    onClick={() => completeFollowUpTask(task.id)}
                                    disabled={completingFollowUpId === task.id}
                                  >
                                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                                    {completingFollowUpId === task.id ? 'Saving...' : 'Complete'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>

                <section className="order-8">
                  <h3 className="mb-3 text-sm font-semibold text-slate-950">Internal Notes</h3>
                  <div className="rounded-md border border-slate-200 bg-white p-4">
                    <Textarea
                      value={newInternalNote}
                      onChange={(event) => {
                        setNewInternalNote(event.target.value);
                        setNoteError('');
                        setNoteMessage('');
                        setNoteWarning('');
                      }}
                      placeholder="Document calls, follow-ups, pricing discussions, design notes, or next steps."
                      rows={4}
                    />
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500">Internal only. Notes are timestamped and shown newest first.</p>
                        {hasSalesRepNotificationTarget ? (
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                            <Checkbox
                              checked={notifySalesRep}
                              onCheckedChange={(checked) => {
                                setNotifySalesRep(Boolean(checked));
                                setNoteError('');
                                setNoteMessage('');
                                setNoteWarning('');
                              }}
                            />
                            Notify assigned sales rep
                          </label>
                        ) : (
                          <p className="text-sm text-slate-500">No sales rep assigned.</p>
                        )}
                      </div>
                      <Button onClick={saveInternalNote} disabled={savingNote || !newInternalNote.trim()}>
                        {savingNote ? 'Saving...' : 'Add Note'}
                      </Button>
                    </div>
                    {noteMessage && (
                      <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                        {noteMessage}
                      </div>
                    )}
                    {noteWarning && (
                      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        {noteWarning}
                      </div>
                    )}
                    {noteError && (
                      <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {noteError}
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    {loadingNotes ? (
                      <p className="text-sm text-slate-500">Loading internal notes...</p>
                    ) : internalNotes.length === 0 ? (
                      <p className="text-sm text-slate-500">No internal notes yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {internalNotes.map((note) => (
                          <div key={note.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                            <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-xs font-medium uppercase text-slate-500">{note.created_by}</p>
                              <time className="text-xs text-slate-500">{formatDate(note.created_at)}</time>
                            </div>
                            <p className="whitespace-pre-wrap text-sm text-slate-900">{note.note_text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                <section className="order-4 space-y-4" data-modal-section="file-readiness-late">
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-slate-950">File Readiness</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Grouped from existing upload tags and filenames. Review all uploaded files below if something is not clearly marked.
                      </p>
                    </div>
                    <div className="grid gap-3">
                      {fileReadinessSections.map((section) => (
                        <FileReadinessSection
                          key={section.title}
                          title={section.title}
                          files={section.files}
                          emptyMessage={section.emptyMessage}
                        />
                      ))}
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                        <h4 className="mb-2 text-sm font-semibold text-amber-950">Still needed</h4>
                        {loadingCustomerActions ? (
                          <p className="text-sm text-amber-900">Checking customer requests...</p>
                        ) : stillNeededItems.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {stillNeededItems.map((requestType) => (
                              <span key={requestType} className="rounded-full bg-white px-2 py-1 text-xs font-medium text-amber-900">
                                {getCustomerActionRequestLabel(requestType)}
                              </span>
                            ))}
                          </div>
                        ) : customerActionRequests.length === 0 ? (
                          <p className="text-sm text-amber-900">No open requested items. Review files manually.</p>
                        ) : (
                          <p className="text-sm text-amber-900">
                            No still-needed items detected from open customer action requests.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-slate-950">All uploaded files</h3>
                    {uploadedFiles.length > 20 && (
                      <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                        Large upload set — review required.
                      </div>
                    )}
                    <FileList
                      files={uploadedFiles}
                      emptyMessage="No uploaded files saved to this quote yet."
                    />
                  </div>
                  {!hasArtworkOrLogo && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <h3 className="mb-1 font-semibold">Brand / Logo Opportunity</h3>
                      <p>
                        No logo file detected. This may be an opportunity to offer logo cleanup, vector redraw, or new logo design.
                      </p>
                    </div>
                  )}
                </section>
              </div>
            </DialogContent>
            );
          })()}
        </Dialog>
      </div>
    </div>
  );
};

export default AdminStatus;
