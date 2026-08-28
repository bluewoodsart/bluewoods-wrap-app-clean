import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  FileVideo,
  Link2,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  Video
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

interface ClientVideoIntakeControlProps {
  clientSlug: string;
  clientName: string;
  publicProof?: boolean;
}

interface UploadLinkRecord {
  id: string;
  client_slug: string;
  client_name: string;
  token: string;
  status: string;
  expires_at: string;
  created_at: string;
}

interface SubmissionRecord {
  id: string;
  uploader_name: string;
  uploader_email: string | null;
  title: string | null;
  notes: string | null;
  external_url: string | null;
  video_bucket: string | null;
  video_path: string | null;
  video_name: string | null;
  video_type: string | null;
  video_size: number | null;
  status: string;
  created_at: string;
  signed_url?: string;
}

const formatDate = (value: string) => new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
}).format(new Date(value));

const formatBytes = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const statusLabel = (value: string) => value
  .split('_')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const ClientVideoIntakeControl = ({
  clientSlug,
  clientName,
  publicProof = false
}: ClientVideoIntakeControlProps) => {
  const [uploadLink, setUploadLink] = useState<UploadLinkRecord | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [loading, setLoading] = useState(!publicProof);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const uploadUrl = useMemo(() => {
    if (!uploadLink?.token || typeof window === 'undefined') return '';
    return `${window.location.origin}/client-video-upload/${uploadLink.token}`;
  }, [uploadLink]);

  const loadIntake = useCallback(async () => {
    if (publicProof) return;

    setLoading(true);
    setError('');

    const { data: linkData, error: linkError } = await supabase.rpc('get_or_create_client_video_upload_link_v1', {
      p_client_slug: clientSlug,
      p_client_name: clientName
    });

    if (linkError) {
      setError(linkError.message.includes('Could not find the function')
        ? 'The client video intake migration must be installed before this section can create upload links.'
        : linkError.message);
      setLoading(false);
      return;
    }

    const link = linkData as UploadLinkRecord;
    setUploadLink(link);

    const { data: submissionData, error: submissionError } = await supabase.rpc('list_client_video_submissions_v1', {
      p_client_slug: clientSlug
    });

    if (submissionError) {
      setError(submissionError.message);
      setLoading(false);
      return;
    }

    const rows = (Array.isArray(submissionData) ? submissionData : []) as SubmissionRecord[];
    const rowsWithUrls = await Promise.all(rows.map(async (submission) => {
      if (!submission.video_path) return submission;
      const { data: signed } = await supabase.storage
        .from(submission.video_bucket || 'client-video-intake')
        .createSignedUrl(submission.video_path, 3600);
      return { ...submission, signed_url: signed?.signedUrl };
    }));

    setSubmissions(rowsWithUrls);
    setLoading(false);
  }, [clientName, clientSlug, publicProof]);

  useEffect(() => {
    void loadIntake();
  }, [loadIntake]);

  const copyUploadLink = async () => {
    if (!uploadUrl) return;
    try {
      await navigator.clipboard.writeText(uploadUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt('Copy this secure client video upload link:', uploadUrl);
    }
  };

  if (publicProof) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50 shadow-none">
        <CardHeader className="border-b border-emerald-200">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-800">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.13em] text-emerald-700">Central video intake</p>
              <CardTitle className="mt-1 text-lg">Upload the Original Video</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <p className="text-sm leading-6 text-slate-700">
            The protected BWB workspace creates a private client upload link. The client can upload the original video file or paste a link from YouTube, Vimeo, Google Drive, Dropbox, or another video location.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <FileVideo className="h-5 w-5 text-emerald-700" />
              <p className="mt-3 text-sm font-black text-slate-950">Direct video upload</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">MP4, MOV, M4V, WEBM, MPEG, or MPG up to 250 MB.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <Link2 className="h-5 w-5 text-emerald-700" />
              <p className="mt-3 text-sm font-black text-slate-950">Video-site link</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">The existing link method remains available for hosted or shared videos.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" />
            <p className="text-xs leading-5">The public backend proof demonstrates the control. The real secure upload link and submitted files are visible only inside the protected Blue Woods Admin.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-emerald-200 shadow-sm">
      <CardHeader className="border-b border-emerald-200 bg-emerald-50/70">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-800">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.13em] text-emerald-700">Central video intake</p>
              <CardTitle className="mt-1 text-lg">Client Upload & Raw Footage Center</CardTitle>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadIntake()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Preparing the secure client video intake...
          </div>
        ) : uploadLink ? (
          <>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Secure client upload link</p>
                  <input
                    readOnly
                    value={uploadUrl}
                    aria-label="Secure client video upload link"
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700"
                  />
                  <p className="mt-2 text-xs text-slate-500">Active through {formatDate(uploadLink.expires_at)}. Anyone with this private link can submit video for this client.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" onClick={copyUploadLink}>
                    {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    {copied ? 'Copied' : 'Copy Link'}
                  </Button>
                  <Button asChild className="bg-emerald-700 text-white hover:bg-emerald-800">
                    <a href={uploadUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open Upload Page
                    </a>
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <FileVideo className="h-5 w-5 text-emerald-700" />
                <p className="mt-3 text-sm font-black text-slate-950">Upload original footage</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">The raw file enters private BWB storage instead of being dropped into texts, email threads, or scattered folders.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <Link2 className="h-5 w-5 text-emerald-700" />
                <p className="mt-3 text-sm font-black text-slate-950">Keep hosted-video links</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">YouTube, Vimeo, Drive, Dropbox, and other video links remain part of the intake workflow.</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Received videos</p>
                  <p className="mt-1 text-sm text-slate-600">{submissions.length} submission{submissions.length === 1 ? '' : 's'} in this client intake.</p>
                </div>
              </div>

              {submissions.length === 0 ? (
                <div className="mt-3 grid min-h-36 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                  <div>
                    <Video className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="mt-3 text-sm font-black text-slate-800">No videos received yet</p>
                    <p className="mt-1 text-xs text-slate-500">Send the secure upload link to the client when footage is needed.</p>
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {submissions.map((submission) => (
                    <div key={submission.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black text-slate-950">{submission.title || submission.video_name || 'Client video submission'}</p>
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-800">{statusLabel(submission.status)}</span>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">From {submission.uploader_name}{submission.uploader_email ? ` · ${submission.uploader_email}` : ''} · {formatDate(submission.created_at)}</p>
                          {submission.video_name && (
                            <p className="mt-2 text-xs font-semibold text-slate-700">{submission.video_name}{submission.video_size ? ` · ${formatBytes(submission.video_size)}` : ''}</p>
                          )}
                          {submission.notes && <p className="mt-2 text-sm leading-5 text-slate-600">{submission.notes}</p>}
                        </div>
                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                          {submission.signed_url && (
                            <Button asChild variant="outline" size="sm">
                              <a href={submission.signed_url} target="_blank" rel="noopener noreferrer">
                                <FileVideo className="mr-2 h-4 w-4" />
                                Open File
                              </a>
                            </Button>
                          )}
                          {submission.external_url && (
                            <Button asChild variant="outline" size="sm">
                              <a href={submission.external_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open Link
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default ClientVideoIntakeControl;
