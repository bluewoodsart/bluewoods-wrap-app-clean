import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Film, Image as ImageIcon, Loader2, Upload } from 'lucide-react';
import { Upload as TusUpload } from 'tus-js-client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

const BUCKET = 'bwb-podcast-assets';
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const RESUMABLE_THRESHOLD = 6 * 1024 * 1024;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const TUS_ENDPOINT = `${SUPABASE_URL.replace('.supabase.co', '.storage.supabase.co')}/storage/v1/upload/resumable`;

interface IdeaMedia {
  id: string;
  name: string;
  path: string;
  kind: 'photo' | 'video';
  signedUrl: string;
}

const cleanFileName = (name: string) => name
  .toLowerCase()
  .replace(/[^a-z0-9._-]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

const displayFileName = (name: string) => name.replace(/^[0-9a-f-]{36}-/i, '').replace(/[-_]+/g, ' ');

const mediaTypeForFile = (file: File) => {
  if (file.type.startsWith('image/') || file.type.startsWith('video/')) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  return ({
    heic: 'image/heic',
    heif: 'image/heif',
    mov: 'video/quicktime',
    m4v: 'video/x-m4v',
    mp4: 'video/mp4',
    webm: 'video/webm',
  } as Record<string, string>)[extension || ''] || '';
};

const resumableUpload = async (file: File, path: string, contentType: string, onProgress: (progress: number) => void) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Your session expired. Log in again before uploading.');

  await new Promise<void>((resolve, reject) => {
    const upload = new TusUpload(file, {
      endpoint: TUS_ENDPOINT,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${session.access_token}` },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: {
        bucketName: BUCKET,
        objectName: path,
        contentType,
        cacheControl: '3600',
      },
      onError: reject,
      onProgress: (bytesUploaded, bytesTotal) => onProgress(Math.round((bytesUploaded / bytesTotal) * 100)),
      onSuccess: () => resolve(),
    });

    void upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) upload.resumeFromPreviousUpload(previousUploads[0]);
      upload.start();
    }).catch(reject);
  });
};

const PodcastIdeaMedia = ({ ideaId, ideaTitle }: { ideaId: string; ideaTitle: string }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<IdeaMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    const folders = [
      { name: 'photos', kind: 'photo' as const },
      { name: 'videos', kind: 'video' as const },
    ];
    const results = await Promise.all(folders.map(async ({ name, kind }) => {
      const folder = `ideas/${ideaId}/${name}`;
      const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      if (error) throw error;
      return Promise.all((data ?? []).filter((file) => file.id).map(async (file) => {
        const path = `${folder}/${file.name}`;
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
        return { id: file.id || path, name: file.name, path, kind, signedUrl: signed?.signedUrl || '' };
      }));
    }));
    setMedia(results.flat());
    setLoading(false);
  }, [ideaId]);

  useEffect(() => {
    void loadMedia().catch((error: unknown) => {
      setLoading(false);
      toast.error(error instanceof Error ? error.message : `Could not load media for ${ideaTitle}.`);
    });
  }, [ideaTitle, loadMedia]);

  const uploadFile = async (file: File) => {
    const contentType = mediaTypeForFile(file);
    if (!contentType) throw new Error(`${file.name} is not a supported photo or video.`);
    if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name} is larger than the current 50 MB Supabase limit.`);

    const kind = contentType.startsWith('video/') ? 'videos' : 'photos';
    const path = `ideas/${ideaId}/${kind}/${crypto.randomUUID()}-${cleanFileName(file.name) || 'media-file'}`;
    if (file.size > RESUMABLE_THRESHOLD) {
      await resumableUpload(file, path, contentType, setProgress);
      return;
    }

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
    setProgress(100);
  };

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);
    try {
      for (const file of files) await uploadFile(file);
      toast.success(`${files.length} ${files.length === 1 ? 'file' : 'files'} added to ${ideaTitle}.`);
      await loadMedia();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The media could not be uploaded.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const photos = media.filter((item) => item.kind === 'photo');
  const videos = media.filter((item) => item.kind === 'video');

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Idea media folder</p>
          <div className="mt-1 flex gap-3 text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" />{photos.length} photos</span>
            <span className="flex items-center gap-1"><Film className="h-3.5 w-3.5" />{videos.length} videos</span>
          </div>
        </div>
        <input ref={inputRef} type="file" accept="image/*,video/*,.heic,.heif,.mov,.m4v" multiple className="hidden" onChange={(event) => void handleFiles(event)} />
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {uploading ? `Uploading ${progress}%` : 'Add photos or videos'}
        </Button>
      </div>

      {loading && <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading media...</div>}
      {!loading && media.length === 0 && <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white/70 p-3 text-xs text-slate-500">No files yet. Add field photos, interview clips, old pictures, releases, or supporting footage here.</p>}
      {!loading && media.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {media.slice(0, 8).map((item) => (
            <a key={item.id} href={item.signedUrl} target="_blank" rel="noreferrer" className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-950" title={displayFileName(item.name)}>
              {item.kind === 'photo' ? (
                <img src={item.signedUrl} alt={displayFileName(item.name)} className="h-20 w-full object-cover transition group-hover:scale-105" loading="lazy" />
              ) : (
                <div className="flex h-20 items-center justify-center text-white"><Film className="h-7 w-7" /><span className="ml-2 text-xs font-black">Video</span></div>
              )}
              <span className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white"><ExternalLink className="h-3 w-3" /></span>
            </a>
          ))}
        </div>
      )}
      {!loading && media.length > 8 && <p className="mt-2 text-right text-[11px] font-bold text-slate-500">Showing 8 of {media.length} files</p>}
    </div>
  );
};

export default PodcastIdeaMedia;
