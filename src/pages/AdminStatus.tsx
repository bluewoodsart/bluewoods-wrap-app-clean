import { useEffect, useState } from 'react';
import { Download, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
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

type QuoteStatus = typeof STATUS_OPTIONS[number];
type QuoteData = Record<string, unknown>;

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
  assigned_rep_name: string | null;
  status: string;
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
    name.includes('logo') ||
    name.includes('artwork') ||
    name.includes('mockup') ||
    name.includes('inspiration') ||
    name.includes('reference')
  );
};

const getGroupedFiles = (files: UploadedFileSummary[]) => {
  const vehiclePhotos: UploadedFileSummary[] = [];
  const artworkFiles: UploadedFileSummary[] = [];

  files.forEach((file) => {
    if (isVehicleFile(file)) {
      vehiclePhotos.push(file);
    }

    if (isArtworkFile(file)) {
      artworkFiles.push(file);
    }
  });

  return { vehiclePhotos, artworkFiles };
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

const DetailField = ({ label, value }: { label: string; value: unknown }) => (
  <div>
    <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
    <dd className="mt-1 text-sm text-slate-900">{formatValue(value)}</dd>
  </div>
);

const formatEventType = (eventType: string) => formatStatusLabel(eventType);

const AdminStatus = () => {
  const [quotes, setQuotes] = useState<QuoteRequestRow[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequestRow | null>(null);
  const [selectedQuoteDetail, setSelectedQuoteDetail] = useState<QuoteRequestRow | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [statusEvents, setStatusEvents] = useState<QuoteStatusEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [pendingStatuses, setPendingStatuses] = useState<Record<string, QuoteStatus>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadQuotes = async ({ clearMessage = true } = {}) => {
    setLoading(true);
    setError('');
    if (clearMessage) {
      setMessage('');
    }

    const { data, error: loadError } = await supabase
      .rpc('get_admin_quote_requests');

    setLoading(false);

    if (loadError) {
      console.error('Admin status quote load failed:', loadError);
      setError(loadError.message);
      return;
    }

    setQuotes(data ?? []);
    setPendingStatuses({});
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
    void loadQuoteDetail(quote.id);
    void loadStatusEvents(quote.id);
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Quote Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-center text-sm text-slate-600">Loading quote requests...</div>
            ) : quotes.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-600">No quote requests found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rep Slug</TableHead>
                    <TableHead>Assigned Rep</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => {
                    const selectedStatus = getSelectedStatus(quote);
                    const isSaving = savingId === quote.id;

                    return (
                      <TableRow
                        key={quote.id}
                        className="cursor-pointer"
                        onClick={() => openQuoteDetail(quote)}
                      >
                        <TableCell className="font-medium">{quote.quote_id || '-'}</TableCell>
                        <TableCell>{quote.customer_name}</TableCell>
                        <TableCell>{quote.customer_email}</TableCell>
                        <TableCell>{quote.rep_slug || '-'}</TableCell>
                        <TableCell>{quote.assigned_rep_name || '-'}</TableCell>
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
                                {STATUS_OPTIONS.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {formatStatusLabel(status)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {isSaving && <p className="text-xs text-slate-500">Saving...</p>}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(quote.created_at)}</TableCell>
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
            }
          }}
        >
          {selectedQuote && (() => {
            const activeQuote = selectedQuoteDetail || selectedQuote;
            const uploadedFiles = getUploadedFiles(activeQuote);
            const groupedFiles = getGroupedFiles(uploadedFiles);
            const hasArtworkOrLogo = groupedFiles.artworkFiles.length > 0;

            return (
            <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{activeQuote.quote_id || activeQuote.customer_name}</DialogTitle>
                <DialogDescription>Read-only quote request details</DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {loadingDetail && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    Loading quote details...
                  </div>
                )}

                <section>
                  <h3 className="mb-3 text-sm font-semibold text-slate-950">Customer</h3>
                  <dl className="grid gap-4 md:grid-cols-3">
                    <DetailField label="Customer Name" value={activeQuote.customer_name} />
                    <DetailField label="Email" value={activeQuote.customer_email} />
                    <DetailField label="Phone" value={activeQuote.customer_phone} />
                    <DetailField label="Preferred Contact" value={activeQuote.preferred_contact} />
                    <DetailField label="Rep Slug" value={activeQuote.rep_slug} />
                    <DetailField label="Assigned Rep" value={activeQuote.assigned_rep_name} />
                    <DetailField label="Current Status" value={formatStatusLabel(activeQuote.status)} />
                  </dl>
                </section>

                <section>
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

                <section>
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

                <section className="space-y-4">
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-slate-950">Uploaded Customer Files</h3>
                    <FileList files={uploadedFiles} />
                  </div>
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-slate-950">Vehicle Photos</h3>
                    <FileList
                      files={groupedFiles.vehiclePhotos}
                      emptyMessage="No clearly marked vehicle photos. Review uploaded files above."
                    />
                  </div>
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-slate-950">Artwork / Logo / Reference Files</h3>
                    <FileList
                      files={groupedFiles.artworkFiles}
                      emptyMessage="No clearly marked artwork or logo files. Review uploaded files above."
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
