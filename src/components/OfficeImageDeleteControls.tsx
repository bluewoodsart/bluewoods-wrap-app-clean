import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Maximize2, Trash2 } from 'lucide-react';

type Image = { url: string; name?: string };
type Job = { id: string; path: string | null; state: string };

export function useOfficeImageDeletion(quoteId: string | undefined, refresh: (id: string) => Promise<void>) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ quoteId: string; message: string } | null>(null);
  const run = async (noteId?: string, urls?: string[]) => {
    if (!quoteId || lock.current) return;
    if (noteId && !window.confirm(`Delete ${urls?.length || 0} image(s) from this group? Unused uploaded files will be permanently deleted. Files used elsewhere will be kept.`)) return;
    lock.current = true;
    setBusy(true);
    let detached = false;
    try {
      if (noteId) {
        const { error } = await supabase.rpc('prepare_office_image_delete_v1', { p_quote_id: quoteId, p_note_id: noteId, p_urls: urls });
        if (error) throw error;
        detached = true;
        await refresh(quoteId);
      }
      const { data, error } = await supabase.rpc('claim_office_image_cleanup_v1', { p_quote_id: quoteId });
      if (error) throw error;
      const jobs = (data || []) as Job[];
      let deleted = 0;
      let pending = 0;
      let retained = 0;
      for (const job of jobs) {
        if (job.state === 'retained') { retained++; continue; }
        if (job.state === 'deleted') { deleted++; continue; }
        if (job.state !== 'deleting' || !job.path) { pending++; continue; }
        // The Storage API deletes the bytes. SQL only detaches references and verifies results.
        await supabase.storage.from('customer-uploads').remove([job.path]);
        const finished = await supabase.rpc('finish_office_image_cleanup_v1', { p_job_id: job.id });
        if (finished.error || finished.data !== 'deleted') pending++;
        else deleted++;
      }
      setResult({ quoteId, message: `${detached ? 'Images removed from this group. ' : ''}${deleted} unused file(s) deleted; ${retained} file(s) kept because they are shared or stored elsewhere.${pending ? ' Storage cleanup is incomplete. Use Retry storage cleanup.' : ''}` });
    } catch (error) {
      const detail = error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Please try again.';
      setResult({ quoteId, message: `${detached ? 'Images were removed from the group, but storage cleanup is incomplete. Use Retry storage cleanup. ' : 'Could not complete deletion. Refresh the order before retrying. '}${detail}` });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return { busy, message: result?.quoteId === quoteId ? result.message : '', remove: (noteId: string, urls: string[]) => run(noteId, urls), retry: () => run() };
}

export function OfficeImageDeleteGrid({ images, title, busy, onDelete, onPreview }: {
  images: Image[]; title: string; busy: boolean;
  onDelete: (urls: string[]) => Promise<void>;
  onPreview: (image: Image) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const urls = [...new Set(images.map(image => image.url))];
  const active = selected.filter(url => urls.includes(url));
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" disabled={busy}
        onClick={() => setSelected(active.length === urls.length ? [] : urls)}>
        {active.length === urls.length ? 'Clear selection' : 'Select all'}
      </Button>
      <Button type="button" variant="destructive" size="sm" disabled={busy || !active.length}
        onClick={() => void onDelete(active)}>
        <Trash2 className="mr-2 h-4 w-4" />Delete selected ({active.length})
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={busy}
        className="border-red-300 text-red-700" onClick={() => void onDelete(urls)}>
        Delete all images in group
      </Button>
    </div>
    <div className="grid gap-2 sm:grid-cols-2">
      {images.map((image, index) => <div key={image.url + index} className="overflow-hidden rounded-md border border-amber-200 bg-white">
        <button type="button" className="group relative block min-h-48 w-full"
          onClick={() => onPreview(image)} aria-label={`Open ${image.name || title} larger`}>
          <img src={image.url} alt={image.name || title} className="max-h-80 w-full object-contain" />
          <span className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/70 text-white">
            <Maximize2 className="h-4 w-4" />
          </span>
        </button>
        <div className="flex items-center justify-between gap-2 border-t p-2">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="h-5 w-5" disabled={busy} checked={active.includes(image.url)}
              onChange={event => setSelected(event.target.checked ? [...new Set([...active, image.url])] : active.filter(url => url !== image.url))} />
            Select image {index + 1}
          </label>
          <Button type="button" variant="outline" size="sm" className="min-h-11 text-red-700"
            aria-label={`Delete ${image.name || 'image ' + (index + 1)}`} disabled={busy} onClick={() => void onDelete([image.url])}>
            <Trash2 className="mr-1 h-4 w-4" />Delete
          </Button>
        </div>
      </div>)}
    </div>
    {busy && <p role="status" className="text-sm">Deleting images…</p>}
  </div>;
}
