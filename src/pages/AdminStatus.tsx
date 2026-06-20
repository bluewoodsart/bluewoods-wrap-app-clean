import { type MouseEvent, useEffect, useState } from 'react';
import { CheckCircle2, Download, ExternalLink, RefreshCw } from 'lucide-react';
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
  if (bucket === 'overdue') return 'bg-red-100 text-red-700';
  if (bucket === 'due_today') return 'bg-amber-100 text-amber-800';
  if (bucket === 'upcoming') return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-600';
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

const getProductLabel = (quote: QuoteRequestRow) =>
  getProductType(quote) === 'banner' ? 'Banner' : 'Wrap';

const getProductBadgeClassName = (quote: QuoteRequestRow) =>
  getProductType(quote) === 'banner'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-blue-100 text-blue-700';

const getQuoteFileCount = (quote: QuoteRequestRow) => getUploadedFiles(quote).length;

const getAssignedChannelLabel = (quote: QuoteRequestRow) => {
  if (quote.rep_slug) return `Rep: ${quote.rep_slug}`;
  if (quote.rep_email) return quote.rep_email;
  return 'Direct / Blue Woods';
};

const getBannerValue = (quote: QuoteRequestRow, key: string) => {
  const banner = getQuoteValue(quote, 'banner');
  if (!banner || typeof banner !== 'object') return undefined;

  return (banner as Record<string, unknown>)[key];
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
}

const AdminStatus = ({ enableBulkActions = false }: AdminStatusProps) => {
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
  const [customerActionRequests, setCustomerActionRequests] = useState<QuoteCustomerActionRequest[]>([]);
  const [loadingCustomerActions, setLoadingCustomerActions] = useState(false);
  const [customerActionRequestTypes, setCustomerActionRequestTypes] = useState<CustomerActionRequestType[]>([]);
  const [customerActionMessage, setCustomerActionMessage] = useState(getDefaultCustomerActionMessage());
  const [sendingCustomerAction, setSendingCustomerAction] = useState(false);
  const [customerActionMessageStatus, setCustomerActionMessageStatus] = useState('');
  const [customerActionError, setCustomerActionError] = useState('');
  const [pendingStatuses, setPendingStatuses] = useState<Record<string, QuoteStatus>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  const loadQuotes = async ({ clearMessage = true } = {}) => {
    setLoading(true);
    setError('');
    if (clearMessage) {
      setMessage('');
    }

    const { data, error: loadError } = await supabase
      .rpc('get_admin_quote_requests');

    if (loadError) {
      console.error('Admin status quote load failed:', loadError);
      setError(loadError.message);
      setLoading(false);
      return;
    }

    setQuotes(data ?? []);
    setPendingStatuses({});
    setSelectedQuoteIds([]);
    await loadFollowUpSummaries();
    setLoading(false);
  };

  useEffect(() => {
    void loadQuotes();
  }, []);

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

    setSelectedQuoteDetail(data?.[0] ?? null);
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
    setNotifySalesRep(false);
    setNoteMessage('');
    setNoteWarning('');
    setNoteError('');
    setFollowUpMessage('');
    setFollowUpError('');
    setCustomerActionMessageStatus('');
    setCustomerActionError('');
    void loadQuoteDetail(quote.id);
    void loadStatusEvents(quote.id);
    void loadInternalNotes(quote.id);
    void loadFollowUpTasks(quote.id);
    void loadCustomerActionRequests(quote.id);
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

    if (!notifySalesRep) {
      setNoteMessage('Note saved.');
      return;
    }

    const activeQuote = selectedQuoteDetail || selectedQuote;
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

  const filteredQuotes = quotes.filter((quote) => {
    const summary = getFollowUpSummaryForQuote(quote.id);

    if (followUpFilter === 'all') return true;
    if (followUpFilter === 'open') return summary.follow_up_bucket !== 'none';
    return summary.follow_up_bucket === followUpFilter;
  });

  const selectedQuoteIdSet = new Set(selectedQuoteIds);
  const filteredQuoteIds = filteredQuotes.map((quote) => quote.id);
  const selectedVisibleQuoteCount = filteredQuoteIds.filter((quoteId) => selectedQuoteIdSet.has(quoteId)).length;
  const allVisibleQuotesSelected = filteredQuoteIds.length > 0 && selectedVisibleQuoteCount === filteredQuoteIds.length;

  const toggleQuoteSelection = (quoteId: string, checked: boolean) => {
    setSelectedQuoteIds((currentIds) => {
      if (checked) {
        return currentIds.includes(quoteId) ? currentIds : [...currentIds, quoteId];
      }

      return currentIds.filter((currentId) => currentId !== quoteId);
    });
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
            { filter: 'overdue' as FollowUpFilter, label: 'Overdue', count: followUpCounts.overdue, className: 'border-red-200 bg-red-50 text-red-800' },
            { filter: 'due_today' as FollowUpFilter, label: 'Due today', count: followUpCounts.dueToday, className: 'border-amber-200 bg-amber-50 text-amber-900' },
            { filter: 'open' as FollowUpFilter, label: 'Open follow-ups', count: followUpCounts.open, className: 'border-blue-200 bg-blue-50 text-blue-800' },
            { filter: 'none' as FollowUpFilter, label: 'No follow-up set', count: followUpCounts.none, className: 'border-slate-200 bg-white text-slate-700' }
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
              <CardTitle className="text-lg">Recent Quote Requests</CardTitle>
              <div className="flex flex-wrap gap-2">
                {FOLLOW_UP_FILTERS.map((filter) => (
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
            {enableBulkActions && selectedQuoteIds.length > 0 && (
              <div className="mb-4 flex flex-col gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-medium">
                  {selectedQuoteIds.length} quote{selectedQuoteIds.length === 1 ? '' : 's'} selected
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" disabled title="Archive will be enabled after the secure backend action is added.">
                    Archive coming after secure backend
                  </Button>
                  <Button type="button" size="sm" variant="outline" disabled title="Delete will be enabled after the secure backend action is added.">
                    Delete coming after secure backend
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
              <div className="py-10 text-center text-sm text-slate-600">No quote requests match this follow-up filter.</div>
            ) : (
              <Table>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.map((quote) => {
                    const selectedStatus = getSelectedStatus(quote);
                    const isSaving = savingId === quote.id;
                    const followUpSummary = getFollowUpSummaryForQuote(quote.id);
                    const isOverdue = followUpSummary.follow_up_bucket === 'overdue';
                    const fileCount = getQuoteFileCount(quote);

                    return (
                      <TableRow
                        key={quote.id}
                        className={`cursor-pointer ${isOverdue ? 'bg-red-50/70 hover:bg-red-50' : ''}`}
                        onClick={() => openQuoteDetail(quote)}
                      >
                        {enableBulkActions && (
                          <TableCell onClick={(event) => event.stopPropagation()}>
                            <Checkbox
                              checked={selectedQuoteIdSet.has(quote.id)}
                              aria-label={`Select quote ${quote.quote_id || quote.customer_name}`}
                              onCheckedChange={(checked) => toggleQuoteSelection(quote.id, checked === true)}
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
                              <SelectTrigger className="w-44">
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
                        <TableCell onClick={(event) => event.stopPropagation()} className="cursor-default">
                          <p className="max-w-[11rem] break-all font-mono text-xs text-slate-500">{quote.quote_id || '-'}</p>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
              setFollowUpMessage('');
              setFollowUpError('');
              setCustomerActionMessageStatus('');
              setCustomerActionError('');
            }
          }}
        >
          {selectedQuote && (() => {
            const activeQuote = selectedQuoteDetail || selectedQuote;
            const uploadedFiles = getUploadedFiles(activeQuote);
            const groupedFiles = getGroupedFiles(uploadedFiles);
            const stillNeededItems = getStillNeededItems(groupedFiles, customerActionRequests);
            const hasArtworkOrLogo = groupedFiles.artworkFiles.length > 0;
            const productType = getProductType(activeQuote);
            const isBannerQuote = productType === 'banner';
            const fileReadinessSections = getFileReadinessSections(productType, groupedFiles);
            const nextFollowUpTask = followUpTasks.find((task) => task.status === 'open') || null;
            const nextFollowUpBucket = nextFollowUpTask ? getFollowUpTaskBucket(nextFollowUpTask) : 'none';

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
                    <DetailField label="Current Status" value={formatStatusLabel(activeQuote.status)} />
                  </dl>
                </section>

                <section className="order-2">
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
                  <section className="order-3">
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
                      <DetailField label="Deadline" value={getBannerValue(activeQuote, 'deadline')} />
                      <DetailField label="Delivery Method" value={getBannerValue(activeQuote, 'deliveryMethod')} />
                    </dl>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <DetailField label="Banner Text" value={getBannerValue(activeQuote, 'bannerText')} />
                      <DetailField label="Brand Colors" value={getBannerValue(activeQuote, 'brandColors')} />
                    </div>
                    <div className="mt-4">
                      <DetailField label="Notes" value={getBannerValue(activeQuote, 'notes')} />
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
