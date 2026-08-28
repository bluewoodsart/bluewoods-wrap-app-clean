import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  FileVideo,
  Link2,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

interface UploadLinkDetails {
  valid: boolean;
  client_slug: string;
  client_name: string;
  expires_at: string;
}

type IntakeMode = 'file' | 'link';

const MAX_VIDEO_SIZE = 250 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = ['mp4', 'mov', 'm4v', 'webm', 'mpeg', 'mpg'];
const SUPPORTED_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
  'video/mpeg'
];

const safeExtension = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension && SUPPORTED_EXTENSIONS.includes(extension)) return extension;
  if (file.type === 'video/webm') return 'webm';
  if (file.type === 'video/quicktime') return 'mov';
  if (file.type === 'video/x-m4v') return 'm4v';
  if (file.type === 'video/mpeg') return 'mpeg';
  return 'mp4';
};

const safeContentType = (file: File) => {
  if (SUPPORTED_MIME_TYPES.includes(file.type)) return file.type;
  const extension = safeExtension(file);
  if (extension === 'webm') return 'video/webm';
  if (extension === 'mov') return 'video/quicktime';
  if (extension === 'm4v') return 'video/x-m4v';
  if (extension === 'mpeg' || extension === 'mpg') return 'video/mpeg';
  return 'video/mp4';
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const formatExpiration = (value: string) => new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric'
}).format(new Date(value));

const isSupportedVideo = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return SUPPORTED_MIME_TYPES.includes(file.type) || SUPPORTED_EXTENSIONS.includes(extension);
};

const isSafeExternalUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

const ClientVideoUpload = () => {
  const { token = '' } = useParams();
  const [details, setDetails] = useState<UploadLinkDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mode, setMode] = useState<IntakeMode>('file');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [uploaderName, setUploaderName] = useState('');
  const [uploaderEmail, setUploaderEmail] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const loadUploadLink = async () => {
      setLoading(true);
      setError('');

      const { data, error: loadError } = await supabase.rpc('get_client_video_upload_link_public', {
        p_token: token
      });

      if (loadError) {
        setError('This video-upload link could not be checked. Ask Blue Woods Brands for a new link.');
        setLoading(false);
        return;
      }

      const row = data?.[0] as UploadLinkDetails | undefined;
      if (!row?.valid) {
        setError('This video-upload link is invalid or expired. Ask Blue Woods Brands for a new link.');
        setLoading(false);
        return;
      }

      setDetails(row);
      setLoading(false);
    };

    void loadUploadLink();
  }, [token]);

  const selectedSummary = useMemo(() => {
    if (mode === 'file' && videoFile) return `${videoFile.name} · ${formatBytes(videoFile.size)}`;
    if (mode === 'link' && externalUrl.trim()) return externalUrl.trim();
    return '';
  }, [externalUrl, mode, videoFile]);

  const handleVideoFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;

    if (!isSupportedVideo(file)) {
      setVideoFile(null);
      setError('Choose an MP4, MOV, M4V, WEBM, MPEG, or MPG video.');
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      setVideoFile(null);
      setError('The video must be 250 MB or smaller. For larger footage, contact Blue Woods Brands for a large-file transfer link.');
      return;
    }

    setMode('file');
    setVideoFile(file);
    setError('');
    setSuccess('');
    if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
  };

  const submitVideo = async () => {
    setError('');
    setSuccess('');

    if (!details?.valid) {
      setError('This upload link is not available.');
      return;
    }
    if (uploaderName.trim().length < 2) {
      setError('Enter the name of the person submitting the video.');
      return;
    }
    if (uploaderEmail.trim() && !/^\S+@\S+\.\S+$/.test(uploaderEmail.trim())) {
      setError('Enter a valid email address or leave the email field blank.');
      return;
    }
    if (mode === 'file' && !videoFile) {
      setError('Choose the video file you want to send.');
      return;
    }
    if (mode === 'link' && !isSafeExternalUrl(externalUrl)) {
      setError('Paste a complete video link beginning with http:// or https://.');
      return;
    }

    setSubmitting(true);
    let uploadedPath: string | null = null;

    try {
      if (mode === 'file' && videoFile) {
        uploadedPath = `${token}/${crypto.randomUUID()}.${safeExtension(videoFile)}`;
        const { error: uploadError } = await supabase.storage
          .from('client-video-intake')
          .upload(uploadedPath, videoFile, {
            contentType: safeContentType(videoFile),
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw new Error(uploadError.message);
      }

      const { error: registerError } = await supabase.rpc('register_client_video_submission_public', {
        p_token: token,
        p_uploader_name: uploaderName.trim(),
        p_uploader_email: uploaderEmail.trim() || null,
        p_title: title.trim() || null,
        p_notes: notes.trim() || null,
        p_external_url: mode === 'link' ? externalUrl.trim() : null,
        p_video_path: uploadedPath,
        p_video_name: mode === 'file' ? videoFile?.name ?? null : null,
        p_video_type: mode === 'file' && videoFile ? safeContentType(videoFile) : null,
        p_video_size: mode === 'file' ? videoFile?.size ?? null : null
      });

      if (registerError) throw new Error(registerError.message);

      setSuccess('Your video was received by Blue Woods Brands. It is now in the client video intake center for review, editing, and distribution planning.');
      setVideoFile(null);
      setExternalUrl('');
      setTitle('');
      setNotes('');
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Video submission failed.';
      setError(message.includes('row-level security')
        ? 'The secure upload was not accepted. Ask Blue Woods Brands to refresh this upload link.'
        : message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-emerald-50 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <Card className="overflow-hidden border-emerald-950/20 shadow-xl">
          <div className="h-2 bg-red-700" />
          <CardHeader className="bg-emerald-950 text-white">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-white/10 p-3">
                <UploadCloud className="h-7 w-7 text-red-300" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">Blue Woods Brands Video Intake</p>
                <CardTitle className="mt-2 text-3xl text-white">Send Your Video</CardTitle>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100">
                  {details?.client_name
                    ? `Send raw footage or a video link for ${details.client_name}.`
                    : 'Send raw footage or a video link to the Blue Woods Brands production team.'}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 p-5 sm:p-7">
            {loading ? (
              <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Checking your secure upload link...
              </div>
            ) : error && !details ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <div className="flex items-center gap-2 font-black"><AlertCircle className="h-4 w-4" /> Upload link unavailable</div>
                <p className="mt-2">{error}</p>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                  <div>
                    <p className="text-sm font-black">Private production intake</p>
                    <p className="mt-1 text-xs leading-5 text-emerald-900">
                      Uploaded files are stored privately for Blue Woods Brands. They are not posted publicly from this page.
                      {details?.expires_at ? ` This link is active through ${formatExpiration(details.expires_at)}.` : ''}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => { setMode('file'); setError(''); setSuccess(''); }}
                    className={`rounded-2xl border-2 p-5 text-left transition ${mode === 'file' ? 'border-emerald-700 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                    <FileVideo className={`h-6 w-6 ${mode === 'file' ? 'text-emerald-700' : 'text-slate-500'}`} />
                    <p className="mt-3 font-black text-slate-950">Upload from this device</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">MP4, MOV, M4V, WEBM, MPEG, or MPG up to 250 MB.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('link'); setError(''); setSuccess(''); }}
                    className={`rounded-2xl border-2 p-5 text-left transition ${mode === 'link' ? 'border-emerald-700 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                    <Link2 className={`h-6 w-6 ${mode === 'link' ? 'text-emerald-700' : 'text-slate-500'}`} />
                    <p className="mt-3 font-black text-slate-950">Send a video link</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">YouTube, Vimeo, Google Drive, Dropbox, or another video location.</p>
                  </button>
                </div>

                {mode === 'file' ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center sm:p-7">
                    {videoFile ? (
                      <div className="flex flex-col items-center gap-3 sm:flex-row sm:text-left">
                        <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-800"><FileVideo className="h-7 w-7" /></div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-black text-slate-950">{videoFile.name}</p>
                          <p className="mt-1 text-xs text-slate-600">{formatBytes(videoFile.size)}</p>
                        </div>
                        <Button type="button" variant="outline" onClick={() => setVideoFile(null)}>
                          <X className="mr-2 h-4 w-4" /> Remove
                        </Button>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="mx-auto h-10 w-10 text-slate-400" />
                        <p className="mt-3 font-black text-slate-950">Choose the original video file</p>
                        <p className="mt-1 text-xs text-slate-600">Keep the highest-quality version available whenever possible.</p>
                        <label className="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800">
                          Choose Video
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/mpeg,.mp4,.mov,.m4v,.webm,.mpeg,.mpg"
                            className="sr-only"
                            onChange={handleVideoFile}
                          />
                        </label>
                      </>
                    )}
                  </div>
                ) : (
                  <div>
                    <label htmlFor="client-video-link" className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">Video link</label>
                    <input
                      id="client-video-link"
                      type="url"
                      value={externalUrl}
                      onChange={(event) => setExternalUrl(event.target.value)}
                      placeholder="https://youtube.com/... or another video site"
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="video-uploader-name" className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">Your name *</label>
                    <input
                      id="video-uploader-name"
                      value={uploaderName}
                      onChange={(event) => setUploaderName(event.target.value)}
                      placeholder="Name"
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="video-uploader-email" className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">Email</label>
                    <input
                      id="video-uploader-email"
                      type="email"
                      value={uploaderEmail}
                      onChange={(event) => setUploaderEmail(event.target.value)}
                      placeholder="Email for follow-up"
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="video-title" className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">Video title or purpose</label>
                  <input
                    id="video-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Example: Our Story interview — take 1"
                    maxLength={180}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label htmlFor="video-notes" className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">Notes for the editing team</label>
                  <textarea
                    id="video-notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Tell us where this should be used, what should be removed, or anything else the team should know."
                    maxLength={5000}
                    rows={4}
                    className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                {selectedSummary && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                    <p className="font-black">Ready to send</p>
                    <p className="mt-1 break-all text-xs">{selectedSummary}</p>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
                {success && (
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                    <p>{success}</p>
                  </div>
                )}

                <Button
                  type="button"
                  onClick={submitVideo}
                  disabled={submitting}
                  className="min-h-12 w-full bg-red-700 text-white hover:bg-red-800"
                >
                  {submitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  {submitting ? 'Sending Video...' : 'Send Video to Blue Woods Brands'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs leading-5 text-slate-500">
          Blue Woods Brands uses submitted media only for the requested client production, editing, review, and distribution workflow.
        </p>
      </div>
    </main>
  );
};

export default ClientVideoUpload;
