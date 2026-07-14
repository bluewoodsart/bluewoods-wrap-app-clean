import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ExternalLink, FileText, RefreshCw, Send, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import FileUpload from '@/components/FileUpload';
import { supabase } from '@/lib/supabase';

type DesignerPacketStatus = 'sent' | 'in_design' | 'proof_ready' | 'needs_info' | 'completed';

interface UploadedFile {
  id?: string;
  name?: string;
  url?: string;
  type?: string;
  size?: number;
  tags?: string[];
}

interface DesignerPacketFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

interface DesignerPacketNote {
  id: string;
  author_type: 'admin' | 'designer';
  author_email: string | null;
  note_text: string;
  created_at: string;
}

interface DesignerPacketDetails {
  valid: boolean;
  id: string | null;
  quote_request_id: string | null;
  token: string | null;
  designer_email: string | null;
  designer_name: string | null;
  instructions: string | null;
  cloud_folder_url: string | null;
  status: DesignerPacketStatus | null;
  sent_at: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  quote_id: string | null;
  product_type: string | null;
  quote_data: Record<string, unknown> | null;
  uploaded_files: UploadedFile[] | string | null;
  notes: DesignerPacketNote[] | string | null;
  files: DesignerPacketFile[] | string | null;
}

const statusOptions: Array<{ value: DesignerPacketStatus; label: string }> = [
  { value: 'sent', label: 'Packet received' },
  { value: 'in_design', label: 'In design' },
  { value: 'proof_ready', label: 'Proof ready' },
  { value: 'needs_info', label: 'Need more info' },
  { value: 'completed', label: 'Completed' }
];

const parseJsonArray = <T,>(value: T[] | string | null | undefined): T[] => {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
};

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

const formatLabel = (value: string | null | undefined) =>
  (value || 'job')
    .split(/[_-]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const getQuoteValue = (quoteData: Record<string, unknown> | null | undefined, keys: string[]) => {
  if (!quoteData) return null;

  for (const key of keys) {
    const value = quoteData[key];
    if (value !== undefined && value !== null && String(value).trim()) return value;
  }

  return null;
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '-';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

const DesignerPacketPortal = () => {
  const { token = '' } = useParams();
  const [details, setDetails] = useState<DesignerPacketDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<DesignerPacketStatus>('in_design');
  const [noteText, setNoteText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const loadPacket = async () => {
    setLoading(true);
    setError('');

    const { data, error: loadError } = await supabase
      .rpc('get_designer_packet_public', {
        p_token: token
      });

    setLoading(false);

    if (loadError) {
      console.error('Designer packet load failed:', loadError);
      setError('This designer packet could not be checked. Please ask SlapWrapz for a fresh link.');
      setDetails(null);
      return;
    }

    const nextDetails = data?.[0] as DesignerPacketDetails | undefined;
    if (!nextDetails || !nextDetails.valid) {
      setDetails(nextDetails ?? null);
      setError('This designer packet link is invalid or no longer available.');
      return;
    }

    setDetails(nextDetails);
    setStatus(nextDetails.status || 'in_design');
    setUploadedFiles([]);
  };

  useEffect(() => {
    void loadPacket();
  }, [token]);

  const customerFiles = useMemo(
    () => parseJsonArray<UploadedFile>(details?.uploaded_files),
    [details?.uploaded_files]
  );
  const packetNotes = useMemo(
    () => parseJsonArray<DesignerPacketNote>(details?.notes),
    [details?.notes]
  );
  const packetFiles = useMemo(
    () => parseJsonArray<DesignerPacketFile>(details?.files),
    [details?.files]
  );

  const submitUpdate = async () => {
    if (saving) return;

    const hasNote = Boolean(noteText.trim());
    const hasFiles = uploadedFiles.length > 0;

    if (!hasNote && !hasFiles && status === details?.status) {
      setError('Add a note, upload a proof, or change the status before sending.');
      setMessage('');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('Sending update...');

    const { error: submitError } = await supabase
      .rpc('submit_designer_packet_update_public', {
        p_token: token,
        p_status: status,
        p_note_text: noteText.trim() || null,
        p_uploaded_files: uploadedFiles.map((file) => ({
          id: file.id,
          name: file.name,
          url: file.url,
          type: file.type,
          size: file.size
        }))
      });

    setSaving(false);

    if (submitError) {
      console.error('Designer packet update failed:', submitError);
      setError(submitError.message || 'We could not send that update. Please contact SlapWrapz.');
      setMessage('');
      return;
    }

    setNoteText('');
    setUploadedFiles([]);
    setMessage('Update sent to SlapWrapz.');
    await loadPacket();
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:py-10">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">SlapWrapz Designer Packet</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950 sm:text-3xl">
              {details?.customer_name ? `${details.customer_name} Design Job` : 'Design Job'}
            </h1>
          </div>
          {details?.status && (
            <span className="w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800">
              {formatLabel(details.status)}
            </span>
          )}
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-8 text-sm text-slate-700">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading designer packet...
            </CardContent>
          </Card>
        ) : error && !details?.valid ? (
          <Card>
            <CardContent className="py-8">
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4" />
                  Packet unavailable
                </div>
                <p className="mt-1">{error}</p>
              </div>
            </CardContent>
          </Card>
        ) : details ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-700" />
                    Job Packet
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs font-medium uppercase text-slate-500">Customer</p>
                      <p className="mt-1 text-sm text-slate-950">{details.customer_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-slate-500">Quote</p>
                      <p className="mt-1 text-sm text-slate-950">{details.quote_id || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-slate-500">Product</p>
                      <p className="mt-1 text-sm text-slate-950">{formatLabel(details.product_type)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-slate-500">Phone</p>
                      <p className="mt-1 text-sm text-slate-950">{details.customer_phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-slate-500">Sent</p>
                      <p className="mt-1 text-sm text-slate-950">{formatDate(details.sent_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-slate-500">Designer</p>
                      <p className="mt-1 text-sm text-slate-950">{details.designer_email || '-'}</p>
                    </div>
                  </div>

                  <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-medium uppercase text-amber-800">Instructions From SlapWrapz</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-amber-950">{details.instructions}</p>
                  </div>

                  {details.cloud_folder_url && (
                    <Button asChild variant="outline">
                      <a href={details.cloud_folder_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open cloud folder
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quote Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-4 md:grid-cols-2">
                    <div>
                      <dt className="text-xs font-medium uppercase text-slate-500">Design Prompt</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
                        {formatValue(getQuoteValue(details.quote_data, ['aiDesignPrompt', 'designPrompt', 'prompt']))}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase text-slate-500">Main Text</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
                        {formatValue(getQuoteValue(details.quote_data, ['bannerText', 'signText', 'text', 'copy']))}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase text-slate-500">Size</dt>
                      <dd className="mt-1 text-sm text-slate-900">
                        {formatValue(getQuoteValue(details.quote_data, ['width']))} x {formatValue(getQuoteValue(details.quote_data, ['height']))} {formatValue(getQuoteValue(details.quote_data, ['unit']))}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase text-slate-500">Colors</dt>
                      <dd className="mt-1 text-sm text-slate-900">
                        {formatValue(getQuoteValue(details.quote_data, ['brandColors', 'colors']))}
                      </dd>
                    </div>
                    <div className="md:col-span-2">
                      <dt className="text-xs font-medium uppercase text-slate-500">Placement / Notes</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
                        {formatValue(getQuoteValue(details.quote_data, ['placementNotes', 'notes', 'projectNotes']))}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Send Proof Update</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-[14rem_1fr]">
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase text-slate-500" htmlFor="designer-status">
                        Status
                      </label>
                      <Select value={status} onValueChange={(value) => setStatus(value as DesignerPacketStatus)}>
                        <SelectTrigger id="designer-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase text-slate-500" htmlFor="designer-note">
                        Note To SlapWrapz
                      </label>
                      <Textarea
                        id="designer-note"
                        value={noteText}
                        onChange={(event) => {
                          setNoteText(event.target.value);
                          setError('');
                          setMessage('');
                        }}
                        rows={4}
                        placeholder="Tell Ashley what changed, what is ready, or what you need."
                      />
                    </div>
                  </div>

                  <FileUpload
                    title="Upload Proof / Working Files"
                    acceptedTypes="image/*,.pdf,.svg,.ai,.eps,.psd"
                    maxFiles={8}
                    maxFileSizeMB={50}
                    additionalTags={['designer_proof', 'designer_packet']}
                    showCameraButton={false}
                    onFilesUploaded={setUploadedFiles}
                  />

                  <Button onClick={submitUpdate} disabled={saving} className="w-full">
                    {saving ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Update To SlapWrapz
                      </>
                    )}
                  </Button>

                  {message && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      <CheckCircle2 className="mr-2 inline h-4 w-4" />
                      {message}
                    </div>
                  )}
                  {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      <AlertCircle className="mr-2 inline h-4 w-4" />
                      {error}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <aside className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Files</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {customerFiles.length === 0 ? (
                    <p className="text-sm text-slate-500">No customer files attached yet.</p>
                  ) : (
                    customerFiles.map((file, index) => (
                      <a
                        key={file.id || file.url || index}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm hover:border-blue-300"
                      >
                        <span className="min-w-0 truncate">{file.name || `File ${index + 1}`}</span>
                        <ExternalLink className="h-4 w-4 shrink-0 text-slate-500" />
                      </a>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Designer Proofs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {packetFiles.length === 0 ? (
                    <p className="text-sm text-slate-500">No designer proof files yet.</p>
                  ) : (
                    packetFiles.map((file) => (
                      <a
                        key={file.id}
                        href={file.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-md border border-slate-200 bg-white p-3 text-sm hover:border-blue-300"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="min-w-0 truncate font-medium">{file.file_name}</span>
                          <ExternalLink className="h-4 w-4 shrink-0 text-slate-500" />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{formatDate(file.created_at)}</p>
                      </a>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {packetNotes.length === 0 ? (
                    <p className="text-sm text-slate-500">No notes yet.</p>
                  ) : (
                    packetNotes.map((note) => (
                      <div key={note.id} className="rounded-md border border-slate-200 bg-white p-3">
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <p className="text-xs font-medium uppercase text-slate-500">{formatLabel(note.author_type)}</p>
                          <time className="text-xs text-slate-500">{formatDate(note.created_at)}</time>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-slate-900">{note.note_text}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </aside>
          </div>
        ) : null}
      </div>
    </main>
  );
};

export default DesignerPacketPortal;
