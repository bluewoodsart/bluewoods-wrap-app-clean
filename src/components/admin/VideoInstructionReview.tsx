import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck, CheckCircle2, Clock3, FileText, Mail, MessageSquareReply,
  RefreshCw, Rocket, Save, Send, ShieldCheck, UploadCloud, Video
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';

type ReviewStatus =
  | 'uploaded' | 'transcribing' | 'under_review' | 'fix_proposed'
  | 'awaiting_social_reply' | 'rechecking' | 'ready_for_approval'
  | 'approved' | 'ready_to_deploy' | 'deployed' | 'rejected';

interface ReviewActivity {
  id: string;
  action: string;
  note: string;
  created_at: string;
  actor_name: string;
}

interface VideoReview {
  id: string;
  title: string;
  instructions: string;
  video_bucket: 'video-instructions' | 'staff-feed';
  video_path: string;
  video_name: string;
  video_url?: string;
  status: ReviewStatus;
  transcript: string;
  problem_summary: string;
  proposed_fix: string;
  expected_result: string;
  social_reply: string;
  social_post_id: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  deployed_at: string | null;
  created_by_name: string;
  approved_by_name: string | null;
  deployed_by_name: string | null;
  activity: ReviewActivity[];
}

interface Draft {
  transcript: string;
  problem_summary: string;
  proposed_fix: string;
  expected_result: string;
  social_reply: string;
}

interface VideoInstructionReviewProps {
  currentAdminRole: 'owner_admin' | 'staff' | 'sales_rep' | 'rep_manager';
}

const STATUS_LABELS: Record<ReviewStatus, string> = {
  uploaded: 'Uploaded',
  transcribing: 'Transcribing',
  under_review: 'Under Review',
  fix_proposed: 'Fix Proposed',
  awaiting_social_reply: 'Awaiting Social Reply',
  rechecking: 'Rechecking',
  ready_for_approval: 'Ready for Approval',
  approved: 'Approved',
  ready_to_deploy: 'Ready to Deploy',
  deployed: 'Deployed',
  rejected: 'Rejected'
};

const STATUS_STYLES: Record<ReviewStatus, string> = {
  uploaded: 'border-slate-300 bg-slate-100 text-slate-800',
  transcribing: 'border-sky-300 bg-sky-100 text-sky-900',
  under_review: 'border-amber-300 bg-amber-100 text-amber-900',
  fix_proposed: 'border-violet-300 bg-violet-100 text-violet-900',
  awaiting_social_reply: 'border-blue-300 bg-blue-100 text-blue-900',
  rechecking: 'border-orange-300 bg-orange-100 text-orange-900',
  ready_for_approval: 'border-red-300 bg-red-100 text-red-900',
  approved: 'border-emerald-300 bg-emerald-100 text-emerald-900',
  ready_to_deploy: 'border-indigo-300 bg-indigo-100 text-indigo-900',
  deployed: 'border-green-400 bg-green-600 text-white',
  rejected: 'border-rose-300 bg-rose-100 text-rose-900'
};

const friendlyDate = (value: string) => new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
}).format(new Date(value));

const toDraft = (review: VideoReview): Draft => ({
  transcript: review.transcript || '',
  problem_summary: review.problem_summary || '',
  proposed_fix: review.proposed_fix || '',
  expected_result: review.expected_result || '',
  social_reply: review.social_reply || ''
});

const safeVideoExtension = (file: File) => {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && ['mp4', 'webm', 'mov'].includes(fromName)) return fromName;
  if (file.type === 'video/webm') return 'webm';
  if (file.type === 'video/quicktime') return 'mov';
  return 'mp4';
};

const VideoInstructionReview = ({ currentAdminRole }: VideoInstructionReviewProps) => {
  const [reviews, setReviews] = useState<VideoReview[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'deployed'>('open');

  const selected = useMemo(
    () => reviews.find((review) => review.id === selectedId) ?? reviews[0] ?? null,
    [reviews, selectedId]
  );
  const isOwner = currentAdminRole === 'owner_admin';

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      return;
    }
    setSelectedId(selected.id);
    setDraft(toDraft(selected));
  }, [selected]);

  const loadReviews = useCallback(async (preferId?: string) => {
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase.rpc('list_video_instructions_v1');
    if (loadError) {
      setError(loadError.message.includes('Could not find the function')
        ? 'The Video Instructions database migration must be installed before this section can load.'
        : loadError.message);
      setLoading(false);
      return;
    }

    const rows = (Array.isArray(data) ? data : []) as VideoReview[];
    const withUrls = await Promise.all(rows.map(async (review) => {
      const { data: signed } = await supabase.storage
        .from(review.video_bucket)
        .createSignedUrl(review.video_path, 3600);
      return { ...review, video_url: signed?.signedUrl };
    }));
    setReviews(withUrls);
    const nextId = preferId && withUrls.some((review) => review.id === preferId)
      ? preferId
      : withUrls[0]?.id || '';
    setSelectedId(nextId);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const filteredReviews = useMemo(() => reviews.filter((review) => {
    if (statusFilter === 'deployed') return review.status === 'deployed';
    if (statusFilter === 'open') return review.status !== 'deployed' && review.status !== 'rejected';
    return true;
  }), [reviews, statusFilter]);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;
    const supported = file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name);
    if (!supported) {
      setError('Choose an MP4, WEBM, or MOV video.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('Instruction videos must be smaller than 50 MB.');
      return;
    }
    setError('');
    setVideoFile(file);
    if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
  };

  const uploadReview = async () => {
    if (!videoFile || !title.trim()) {
      setError('Add a title and choose a video.');
      return;
    }
    setWorking(true);
    setError('');
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const ownerFolder = session?.user.id || 'staff';
    const path = `${ownerFolder}/${crypto.randomUUID()}.${safeVideoExtension(videoFile)}`;
    const { error: uploadError } = await supabase.storage.from('video-instructions').upload(path, videoFile, {
      contentType: videoFile.type || 'video/mp4',
      cacheControl: '3600',
      upsert: false
    });
    if (uploadError) {
      setError(uploadError.message);
      setWorking(false);
      return;
    }

    const { data: reviewId, error: createError } = await supabase.rpc('create_video_instruction_v1', {
      p_title: title.trim(),
      p_instructions: instructions.trim(),
      p_video_bucket: 'video-instructions',
      p_video_path: path,
      p_video_name: videoFile.name
    });
    if (createError) {
      await supabase.storage.from('video-instructions').remove([path]);
      setError(createError.message);
      setWorking(false);
      return;
    }
    setTitle('');
    setInstructions('');
    setVideoFile(null);
    toast.success('Video added to the Admin review queue.');
    await loadReviews(String(reviewId));
    setWorking(false);
  };

  const saveAnalysis = async () => {
    if (!selected || !draft) return;
    setWorking(true);
    const { error: saveError } = await supabase.rpc('save_video_instruction_analysis_v1', {
      p_review_id: selected.id,
      p_transcript: draft.transcript,
      p_problem_summary: draft.problem_summary,
      p_proposed_fix: draft.proposed_fix,
      p_expected_result: draft.expected_result,
      p_social_reply: draft.social_reply
    });
    if (saveError) setError(saveError.message);
    else {
      toast.success('Video result and fix saved.');
      await loadReviews(selected.id);
    }
    setWorking(false);
  };

  const notifyOwner = async (reviewId: string) => {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const response = await fetch('/api/send-video-instruction-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ reviewId })
    });
    if (!response.ok) console.warn('Video instruction email was not delivered:', await response.text());
  };

  const setStatus = async (status: ReviewStatus, note: string) => {
    if (!selected) return;
    setWorking(true);
    setError('');
    const { error: statusError } = await supabase.rpc('set_video_instruction_status_v1', {
      p_review_id: selected.id,
      p_status: status,
      p_note: note
    });
    if (statusError) setError(statusError.message);
    else {
      if (['ready_for_approval', 'approved', 'deployed'].includes(status)) {
        await notifyOwner(selected.id);
      }
      toast.success(`Status changed to ${STATUS_LABELS[status]}.`);
      await loadReviews(selected.id);
    }
    setWorking(false);
  };

  const publishSocialReply = async () => {
    if (!selected || !draft) return;
    await saveAnalysis();
    setWorking(true);
    const { data: postId, error: postError } = await supabase.rpc('publish_video_instruction_reply_v1', {
      p_review_id: selected.id
    });
    if (postError) setError(postError.message);
    else {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (session?.access_token && postId) {
        void fetch('/api/send-staff-feed-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ postId, eventType: 'new_post', commentId: null })
        });
      }
      toast.success('Resolution posted to the Staff Feed.');
      await loadReviews(selected.id);
    }
    setWorking(false);
  };

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-indigo-200 bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 text-white">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-300">Admin workflow</p>
              <CardTitle className="mt-2 flex items-center gap-2 text-2xl text-white">
                <Video className="h-6 w-6" /> Video Instructions & Fixes
              </CardTitle>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Review instruction videos, record the problem and fix, reply to the social team,
                recheck the result, approve the decision, and deploy it with a complete history.
              </p>
            </div>
            <div className="rounded-xl border border-indigo-400/30 bg-white/10 px-4 py-3 text-sm">
              <p className="font-bold">{reviews.filter((review) => review.status !== 'deployed' && review.status !== 'rejected').length} open</p>
              <p className="text-indigo-200">{reviews.filter((review) => review.status === 'ready_for_approval').length} awaiting approval</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><UploadCloud className="h-5 w-5" /> Add an instruction video</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Title</label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs to be reviewed?" maxLength={180} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Initial instructions</label>
            <Input value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="What should the team look for?" maxLength={5000} />
          </div>
          <div className="flex flex-col justify-end gap-2 sm:flex-row lg:flex-col">
            <label className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold hover:bg-slate-50">
              <Video className="mr-2 h-4 w-4" /> {videoFile ? videoFile.name : 'Choose Video'}
              <input type="file" accept="video/mp4,video/webm,video/quicktime,.mov" className="sr-only" onChange={handleFile} />
            </label>
            <Button onClick={uploadReview} disabled={working || !videoFile || !title.trim()}>
              {working ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              Add to Review
            </Button>
          </div>
          <p className="text-xs text-slate-500 lg:col-span-3">MP4, WEBM, or MOV up to 50 MB. Social-team videos can also be sent here directly from the Staff Feed.</p>
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[21rem_minmax(0,1fr)]">
        <Card className="min-w-0 self-start">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">Review queue</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => void loadReviews(selected?.id)} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="flex gap-2">
              {(['open', 'all', 'deployed'] as const).map((filter) => (
                <button key={filter} type="button" onClick={() => setStatusFilter(filter)}
                  className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusFilter === filter ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {filter}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && <p className="py-8 text-center text-sm text-slate-500">Loading video reviews...</p>}
            {!loading && filteredReviews.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No videos in this view yet.</p>}
            {filteredReviews.map((review) => (
              <button key={review.id} type="button" onClick={() => setSelectedId(review.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${selected?.id === review.id ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-black text-slate-900">{review.title}</p>
                  {review.status === 'deployed' && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />}
                </div>
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLES[review.status]}`}>
                  {STATUS_LABELS[review.status]}
                </span>
                <p className="mt-2 text-xs text-slate-500">{review.created_by_name} · {friendlyDate(review.updated_at)}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        {!selected || !draft ? (
          <Card><CardContent className="py-16 text-center text-sm text-slate-500">Choose or upload a video to begin the review.</CardContent></Card>
        ) : (
          <div className="min-w-0 space-y-5">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-xl">{selected.title}</CardTitle>
                    <p className="mt-1 text-sm text-slate-500">Submitted by {selected.created_by_name} · {friendlyDate(selected.created_at)}</p>
                  </div>
                  <span className={`self-start rounded-full border px-3 py-1 text-xs font-black ${STATUS_STYLES[selected.status]}`}>
                    {STATUS_LABELS[selected.status]}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selected.video_url ? (
                  <video src={selected.video_url} controls playsInline preload="metadata" className="max-h-[34rem] w-full rounded-xl bg-black object-contain">
                    Your browser cannot play this video.
                  </video>
                ) : <div className="rounded-xl bg-slate-100 p-8 text-center text-sm text-slate-500">Video preview is unavailable.</div>}
                {selected.instructions && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                    <p className="text-xs font-black uppercase text-indigo-700">Original instructions</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-indigo-950">{selected.instructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5" /> Video result</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Transcript and stopping points</label>
                  <Textarea value={draft.transcript} onChange={(event) => setDraft({ ...draft, transcript: event.target.value })}
                    placeholder="Paste or enter the timestamped transcript and named instruction sections." className="min-h-40" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-red-700">What is the problem?</label>
                    <Textarea value={draft.problem_summary} onChange={(event) => setDraft({ ...draft, problem_summary: event.target.value })}
                      placeholder="State the problem clearly." className="min-h-28 border-red-200" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-violet-700">What is the fix?</label>
                    <Textarea value={draft.proposed_fix} onChange={(event) => setDraft({ ...draft, proposed_fix: event.target.value })}
                      placeholder="Describe the proposed correction." className="min-h-28 border-violet-200" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-emerald-700">What will happen after the fix?</label>
                  <Textarea value={draft.expected_result} onChange={(event) => setDraft({ ...draft, expected_result: event.target.value })}
                    placeholder="Describe the result the team should see and recheck." className="min-h-24 border-emerald-200" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-blue-700">Social reply to the salesperson or team</label>
                  <Textarea value={draft.social_reply} onChange={(event) => setDraft({ ...draft, social_reply: event.target.value })}
                    placeholder="Write the reply that will be posted to the Staff Feed." className="min-h-28 border-blue-200" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={saveAnalysis} disabled={working}>
                    <Save className="mr-2 h-4 w-4" /> Save Result
                  </Button>
                  <Button variant="outline" onClick={publishSocialReply} disabled={working || !draft.social_reply.trim() || Boolean(selected.social_post_id)}>
                    <MessageSquareReply className="mr-2 h-4 w-4" /> {selected.social_post_id ? 'Reply Posted' : 'Post Social Reply'}
                  </Button>
                  <Button variant="outline" onClick={() => void setStatus('rechecking', 'Team asked to recheck the fix and report the result.')} disabled={working}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Request Recheck
                  </Button>
                  <Button className="bg-red-600 hover:bg-red-700" onClick={() => void setStatus('ready_for_approval', 'Analysis and recheck are ready for Owner Admin approval.')} disabled={working}>
                    <Send className="mr-2 h-4 w-4" /> Send for Approval
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-emerald-200">
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5 text-emerald-700" /> Owner approval and deployment</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {!isOwner && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Only the Owner Admin can approve or deploy a final decision.</p>}
                <div className="grid gap-3 sm:grid-cols-3">
                  <Button variant="outline" className="min-h-12 border-emerald-400" disabled={working || !isOwner}
                    onClick={() => void setStatus('approved', 'Owner Admin approved the proposed fix and result.')}>
                    <BadgeCheck className="mr-2 h-5 w-5" /> Approve Fix
                  </Button>
                  <Button variant="outline" className="min-h-12 border-indigo-400" disabled={working || !isOwner}
                    onClick={() => void setStatus('ready_to_deploy', 'Approved decision prepared for main Admin deployment.')}>
                    <Rocket className="mr-2 h-5 w-5" /> Ready to Deploy
                  </Button>
                  <Button className="min-h-12 bg-green-600 hover:bg-green-700" disabled={working || !isOwner}
                    onClick={() => void setStatus('deployed', 'Owner Admin deployed the approved decision to the main Admin workflow.')}>
                    <CheckCircle2 className="mr-2 h-5 w-5" /> Deploy to Admin
                  </Button>
                </div>
                <p className="flex items-center gap-2 text-xs text-slate-500"><Mail className="h-4 w-4" /> Owner email notices are sent at final review, approval, and deployment.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Clock3 className="h-5 w-5" /> Decision history</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {selected.activity.length === 0 && <p className="text-sm text-slate-500">No history yet.</p>}
                {selected.activity.map((activity) => (
                  <div key={activity.id} className="flex gap-3 border-l-2 border-slate-200 pl-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{STATUS_LABELS[activity.action as ReviewStatus] || activity.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-500">{activity.actor_name} · {friendlyDate(activity.created_at)}</p>
                      {activity.note && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{activity.note}</p>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoInstructionReview;
