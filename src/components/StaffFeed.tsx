import { type ChangeEvent, type ClipboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BriefcaseBusiness, Download, ExternalLink, Gift, Globe2, ImagePlus, Lightbulb, Link as LinkIcon, MessageCircle, MonitorSmartphone, Pencil, QrCode, RefreshCw, Save, Share2, Sparkles, UploadCloud, Users, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import VoiceDictationButton from '@/components/ui/voice-dictation-button';
import FileUpload from '@/components/FileUpload';
import ZoeMissionOne from '@/components/ZoeMissionOne';
import { encodeUpsellImageIdea } from '@/lib/officeDialogue';
import { runMobileTouchAction } from '@/lib/mobileTouch';
import { getStaffMediaDetails, prepareStaffMedia, type StaffMediaPhase } from '@/lib/staffMedia';
import { supabase } from '@/lib/supabase';
import { appendDictation } from '@/lib/voiceDictation';
import type { UploadedFile } from '@/types';

type Audience = 'everyone' | 'friends' | 'specific' | 'only_me';
type Reaction = 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry' | 'dislike';

const REACTIONS: ReadonlyArray<{ key: Reaction; label: string; emoji: string; activeClass: string }> = [
  { key: 'like', label: 'Like', emoji: '👍', activeClass: 'text-blue-600' },
  { key: 'love', label: 'Love', emoji: '❤️', activeClass: 'text-rose-600' },
  { key: 'care', label: 'Care', emoji: '🥰', activeClass: 'text-amber-600' },
  { key: 'haha', label: 'Haha', emoji: '😂', activeClass: 'text-amber-600' },
  { key: 'wow', label: 'Wow', emoji: '😮', activeClass: 'text-amber-600' },
  { key: 'sad', label: 'Sad', emoji: '😢', activeClass: 'text-amber-600' },
  { key: 'angry', label: 'Angry', emoji: '😡', activeClass: 'text-orange-700' },
  { key: 'dislike', label: 'Down', emoji: '👎', activeClass: 'text-slate-700' }
];

const EMPTY_REACTION_COUNTS = Object.fromEntries(
  REACTIONS.map(({ key }) => [key, 0])
) as Record<Reaction, number>;

interface Person { id: string; display_name: string; email: string; role: string; is_my_friend: boolean }
interface Friendship { id: string; user_one_id: string; user_two_id: string; user_one_name: string; user_two_name: string }
interface Bootstrap {
  me: { id: string; display_name: string; email: string; role: string; is_owner_admin: boolean };
  people: Person[];
  friendships: Friendship[];
}
interface FeedComment { id: string; body: string; created_at: string; author_id: string; author_name: string }
interface FeedPost {
  id: string; body: string; link_url: string | null; audience_type: Audience; created_at: string;
  attachment_path: string | null; attachment_name: string | null; attachment_url?: string | null; attachment_url_error?: string | null;
  author_id: string; author_name: string; author_role: string; is_mine: boolean;
  recipient_names: string[]; reaction_counts: Record<Reaction, number>; my_reaction: Reaction | null;
  comments: FeedComment[];
}

interface SocialProfile {
  admin_user_id: string;
  display_name: string;
  email: string;
  role: string;
  is_mine: boolean;
  header_path: string | null;
  header_name: string | null;
  bio: string;
  accent_color: string;
  header_url?: string | null;
}

interface CustomerJob {
  id: string;
  quoteId: string;
  customerName: string;
  customerEmail: string;
  companyName: string;
  status: string;
  repEmail: string;
  repSlug: string;
  repName: string;
  mainProject: string;
  inferredNiche: string;
}

interface CustomerIdea {
  id: string;
  title: string;
  niche: string;
  badge: string;
  description: string;
  placements: string;
  offer: string;
  priority: number;
  stage: 'Best Next Offer' | 'Build the Brand' | 'Operations' | 'Later Opportunity';
  requiresDestination: boolean;
}

const audienceLabels: Record<Audience, string> = {
  everyone: 'Everyone on the team', friends: 'All my friends', specific: 'Specific people', only_me: 'Only me'
};

const friendlyDate = (value: string) => new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
}).format(new Date(value));

const roleLabel = (role: string) => role.split('_').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ');
const normalizeWebUrl = (value: string | null) => {
  const trimmed = value?.trim() || '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  return null;
};
const safeWebUrl = (value: string | null) => normalizeWebUrl(value);
const extractFirstWebUrl = (value: string | null | undefined) => {
  const match = value?.match(/(?:https?:\/\/|www\.)[^\s<>"']+/i)?.[0];
  return normalizeWebUrl(match?.replace(/[),.!?]+$/, '') || null);
};
const getPostWebUrl = (post: FeedPost) => safeWebUrl(post.link_url) || extractFirstWebUrl(post.body);
const getYouTubeVideoId = (value: string | null | undefined) => {
  const normalized = normalizeWebUrl(value || null);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0]?.slice(0, 11) || null;
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (url.pathname === '/watch') return url.searchParams.get('v')?.slice(0, 11) || null;
      const parts = url.pathname.split('/').filter(Boolean);
      if (['shorts', 'embed', 'live'].includes(parts[0])) return parts[1]?.slice(0, 11) || null;
    }
  } catch {
    return null;
  }
  return null;
};
const isVideoAttachment = (name: string | null | undefined, path?: string | null) => /\.(mp4|webm|mov)$/i.test(`${name || ''} ${path || ''}`);
const getAttachmentName = (post: FeedPost) => post.attachment_name || post.attachment_path?.split('/').pop() || 'Attached media';
const postBodyClaimsMedia = (post: FeedPost) => /shared a (photo|screenshot|video)/i.test(post.body || '');
const isAcceptedMediaFile = (file: File) => Boolean(getStaffMediaDetails(file));
const getMediaExtension = (file: File) => getStaffMediaDetails(file)?.extension || null;
const WHEELERS_TOWING_QUOTE_ID = 'SW-20260715-07175D';
const WHEELERS_TOWING_PAGE_URL = 'https://www.slapwrapz.com/zone6/local/wheelers-towing';

const CUSTOMER_IDEAS: CustomerIdea[] = [
  { id: 'towing-website', title: '24/7 Towing Website & Emergency Call Page', niche: 'Towing & Roadside', badge: 'Priority 1 · Strategic offer', description: 'A fast mobile website with tap-to-call, service area, towing services, reviews, truck photos, and quote/contact capture.', placements: 'Linked from Google Business, every truck QR, social profiles, cards, signs, invoices, and uniforms.', offer: 'Your wrapped trucks get attention; the website gives that attention one place to call, trust, and convert.', priority: 1, stage: 'Best Next Offer', requiresDestination: false },
  { id: 'towing-fleet-continuity', title: 'Fleet Graphics & Second-Truck Continuity', niche: 'Towing & Roadside', badge: 'Priority 2 · Protect the brand', description: 'Carry the approved cab-wrap look across the remaining trucks, support vehicles, trailers, unit numbers, and required door lettering.', placements: 'Tow trucks, wreckers, rollbacks, service pickups, trailers, and replacement panels.', offer: 'Build one recognizable fleet instead of allowing every truck to look like a different company.', priority: 2, stage: 'Build the Brand', requiresDestination: false },
  { id: 'towing-uniforms', title: 'Driver Uniform, Hat & Safety Apparel Package', niche: 'Towing & Roadside', badge: 'Priority 3 · Team visibility', description: 'Branded work shirts, moisture-wicking tees, hats, hoodies, jackets, and high-visibility safety apparel for drivers and dispatch.', placements: 'Drivers, roadside crews, dispatch staff, events, recruiting, and customer-facing calls.', offer: 'Match the team to the trucks so customers see one professional company from arrival through payment.', priority: 3, stage: 'Build the Brand', requiresDestination: false },
  { id: 'towing-lot-signage', title: 'Impound Lot & Office Sign System', niche: 'Towing & Roadside', badge: 'Priority 4 · Required information', description: 'Entrance signs, rates and payment signs, release instructions, parking rules, hours, directional signs, and dispatch-window graphics.', placements: 'Lot entrance, gates, office windows, payment areas, vehicle release areas, and roadside property.', offer: 'Reduce confusion and repeated questions while making the property look organized and legitimate.', priority: 4, stage: 'Operations', requiresDestination: false },
  { id: 'review-stickers-towing', title: 'Tow Receipt Review QR Stickers', niche: 'Towing & Roadside', badge: 'Priority 5 · Reputation builder', description: 'Give satisfied towing customers a one-scan path to leave a Google review.', placements: 'Tow receipts, truck windows, dispatch counters, key envelopes, and payment folders.', offer: 'Turn completed tows into more local reviews with a scan-ready sticker customers can use immediately.', priority: 5, stage: 'Operations', requiresDestination: true },
  { id: 'referral-cards-towing', title: 'Accident & Roadside Referral Cards', niche: 'Towing & Roadside', badge: 'Priority 6 · Referral network', description: 'Wallet cards with emergency contact, towing, repair-partner, insurance, website, and QR information.', placements: 'Driver cards, glove boxes, partner shops, insurance desks, dealerships, and community boards.', offer: 'Give drivers something useful they will keep while keeping the towing company one call or scan away.', priority: 6, stage: 'Later Opportunity', requiresDestination: false },
  { id: 'towing-office-print', title: 'Dispatch, Release & Key-Tag Print Package', niche: 'Towing & Roadside', badge: 'Priority 7 · Daily operations', description: 'Branded invoices, inspection sheets, damage diagrams, release envelopes, key tags, receipt folders, and driver paperwork.', placements: 'Dispatch office, every truck, impound releases, customer files, and accounting packets.', offer: 'Make everyday paperwork faster to identify, easier to organize, and consistent with the new brand.', priority: 7, stage: 'Operations', requiresDestination: false },
  { id: 'towing-promotional', title: 'Roadside Giveaway & Community Package', niche: 'Towing & Roadside', badge: 'Priority 8 · Promotion', description: 'Magnets, emergency contact cards, decals, pens, keychains, banners, tents, and community-event materials.', placements: 'Customer giveaways, local events, partner shops, dealerships, insurance offices, and recruiting.', offer: 'Stay visible after the tow and build referral relationships throughout the service area.', priority: 8, stage: 'Later Opportunity', requiresDestination: false },
  { id: 'social-follow-stickers', title: 'Social Follow QR Sticker Pack', niche: 'All Businesses', badge: 'Free starter idea', description: 'Send every scan to the customer’s Instagram, Facebook, TikTok, or other social page.', placements: 'Counters, packaging, toolboxes, windows, event materials, and giveaway items.', offer: 'We can include a starter batch of working social QR stickers with a qualifying project.', priority: 1, stage: 'Later Opportunity', requiresDestination: true },
  { id: 'menu-review-restaurant', title: 'Menu & Review Table QR Stickers', niche: 'Restaurant & Food', badge: 'Priority 1 · Table traffic', description: 'Open a menu, ordering page, loyalty offer, or review link without making customers search.', placements: 'Tables, counters, takeout packaging, food trucks, menus, and register displays.', offer: 'Turn every table and takeout order into a direct path to order, follow, or review.', priority: 1, stage: 'Best Next Offer', requiresDestination: true },
  { id: 'estimate-contractor', title: 'Instant Estimate QR Yard Sign', niche: 'Contractor & Home Services', badge: 'Priority 1 · Lead generator', description: 'Let neighbors scan a job-site sign to request an estimate while the work is visible.', placements: 'Yard signs, trailers, toolboxes, invoices, door hangers, and completed project packets.', offer: 'Capture nearby homeowners at the exact moment they see your work and want the same result.', priority: 1, stage: 'Best Next Offer', requiresDestination: true },
  { id: 'booking-beauty', title: 'Book Again QR Mirror Stickers', niche: 'Barber, Beauty & Tattoo', badge: 'Priority 1 · Repeat booking', description: 'Send clients directly to booking, portfolio, social, or review pages before they leave.', placements: 'Mirrors, stations, aftercare cards, product bags, appointment cards, and front windows.', offer: 'Make the next appointment one scan away while the client is still excited about the result.', priority: 1, stage: 'Best Next Offer', requiresDestination: true },
  { id: 'listing-real-estate', title: 'Listing & Open House QR Signs', niche: 'Real Estate', badge: 'Priority 1 · Property lead', description: 'Open property details, virtual tours, agent contact, or showing requests from the sign.', placements: 'Yard signs, riders, open-house displays, brochures, vehicle graphics, and directional signs.', offer: 'Turn every person who passes the property into a measurable listing visitor.', priority: 1, stage: 'Best Next Offer', requiresDestination: true },
  { id: 'stream-music', title: 'Follow & Stream QR Giveaway', niche: 'Music & Events', badge: 'Priority 1 · Audience builder', description: 'Send fans directly to music, tickets, social profiles, or an upcoming event.', placements: 'Merchandise, posters, wristbands, handbills, venue counters, vehicles, and sponsor displays.', offer: 'Give fans one place to scan, follow, stream, and remember the next event.', priority: 1, stage: 'Best Next Offer', requiresDestination: true },
  { id: 'service-auto', title: 'Service & Review QR Stickers', niche: 'Automotive', badge: 'Priority 1 · Retention idea', description: 'Connect drivers to scheduling, reviews, maintenance reminders, or the shop’s social page.', placements: 'Service invoices, oil-change reminders, key tags, waiting rooms, windows, and courtesy vehicles.', offer: 'Keep the shop one scan away when the customer needs service again.', priority: 1, stage: 'Best Next Offer', requiresDestination: true }
];

const inferCustomerNiche = (searchText: string) => {
  const value = searchText.toLowerCase();
  if (/tow|wrecker|roadside|rollback|impound|recovery/.test(value)) return 'Towing & Roadside';
  if (/restaurant|food|cafe|barbecue|bbq|kitchen|catering|bakery/.test(value)) return 'Restaurant & Food';
  if (/contractor|roof|plumb|electric|hvac|landscap|construction|remodel|home service/.test(value)) return 'Contractor & Home Services';
  if (/barber|salon|beauty|tattoo|spa|nail/.test(value)) return 'Barber, Beauty & Tattoo';
  if (/real estate|realtor|property|homes|realty/.test(value)) return 'Real Estate';
  if (/music|artist|band|dj|event|concert|venue/.test(value)) return 'Music & Events';
  if (/auto|automotive|mechanic|collision|body shop|detail|tire/.test(value)) return 'Automotive';
  return 'All Businesses';
};

const getIdeasForNiche = (niche: string) => CUSTOMER_IDEAS
  .filter((idea) => idea.niche === niche)
  .sort((left, right) => left.priority - right.priority);

const normalizeCustomerJob = (row: Record<string, unknown>): CustomerJob => {
  const summary = ((row.quote_summary || row.quote_data || {}) as Record<string, unknown>);
  const quoteId = String(row.quote_id || row.id || '');
  const product = String(row.product_type || summary.selectedService || summary.quoteType || summary.intakeType || 'Current quoted project');
  const vehicle = [summary.vehicleYear, summary.vehicleMake, summary.vehicleModel, summary.manualVehicle, summary.vehicleType].filter(Boolean).join(' ');
  const searchText = [row.customer_name, summary.companyName, summary.company_name, product, vehicle, JSON.stringify(summary)].filter(Boolean).join(' ');
  return {
    id: String(row.id || ''),
    quoteId,
    customerName: String(row.customer_name || 'Customer'),
    customerEmail: String(row.customer_email || ''),
    companyName: String(summary.companyName || summary.company_name || ''),
    status: String(row.status || 'new'),
    repEmail: String(row.rep_email || ''),
    repSlug: String(row.rep_slug || ''),
    repName: String(row.assigned_rep_name || ''),
    mainProject: [product, vehicle].filter(Boolean).join(' · '),
    inferredNiche: quoteId.trim().toUpperCase() === WHEELERS_TOWING_QUOTE_ID ? 'Towing & Roadside' : inferCustomerNiche(searchText)
  };
};

const StaffFeed = () => {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [body, setBody] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [mediaPhase, setMediaPhase] = useState<StaffMediaPhase>('idle');
  const [audience, setAudience] = useState<Audience>('everyone');
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [friendOne, setFriendOne] = useState('');
  const [friendTwo, setFriendTwo] = useState('');
  const [visiblePostCount, setVisiblePostCount] = useState(10);
  const [expandedCommentPosts, setExpandedCommentPosts] = useState<string[]>([]);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const mediaSelectionRequestRef = useRef(0);
  const createPostInFlightRef = useRef(false);
  const imagePreviewUrlRef = useRef('');
  const [ideaLibraryOpen, setIdeaLibraryOpen] = useState(false);
  const [customerJobs, setCustomerJobs] = useState<CustomerJob[]>([]);
  const [loadingCustomerJobs, setLoadingCustomerJobs] = useState(false);
  const [selectedCustomerJobId, setSelectedCustomerJobId] = useState('');
  const [selectedNiche, setSelectedNiche] = useState('All Businesses');
  const [selectedIdeaId, setSelectedIdeaId] = useState('social-follow-stickers');
  const [ideaDestinationUrl, setIdeaDestinationUrl] = useState('');
  const [ideaReferenceFiles, setIdeaReferenceFiles] = useState<UploadedFile[]>([]);
  const [savingCustomerIdea, setSavingCustomerIdea] = useState(false);
  const [customerIdeaError, setCustomerIdeaError] = useState('');
  const [customerIdeaStatus, setCustomerIdeaStatus] = useState('');
  const [socialView, setSocialView] = useState<'my_home' | 'live_feed'>('live_feed');
  const [socialProfile, setSocialProfile] = useState<SocialProfile | null>(null);
  const [profileBio, setProfileBio] = useState('');
  const [profileAccent, setProfileAccent] = useState('#4f46e5');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileStatus, setProfileStatus] = useState('');
  const [selectedMediaPost, setSelectedMediaPost] = useState<FeedPost | null>(null);
  const [selectedMediaLoading, setSelectedMediaLoading] = useState(false);
  const [selectedMediaError, setSelectedMediaError] = useState('');
  const [videoReviewPostIds, setVideoReviewPostIds] = useState<string[]>([]);
  const [reactionPickerPostId, setReactionPickerPostId] = useState<string | null>(null);
  const [downloadingPostId, setDownloadingPostId] = useState<string | null>(null);
  const profileHeaderInputRef = useRef<HTMLInputElement>(null);
  const mediaPickerInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current);
  }, []);

  const loadFeed = useCallback(async () => {
    setLoading(true); setError('');
    let hydratedPosts: FeedPost[] | null = null;
    const [bootstrapResult, postsResult] = await Promise.all([
      supabase.rpc('get_staff_feed_bootstrap_v1'),
      supabase.rpc('get_staff_feed_posts_v1', { p_limit: 50 })
    ]);
    if (bootstrapResult.error || postsResult.error) {
      setError(bootstrapResult.error?.message || postsResult.error?.message || 'The staff feed could not load.');
    } else {
      setBootstrap(bootstrapResult.data as Bootstrap);
      const loadedPosts = ((postsResult.data || []) as FeedPost[])
        .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
      const postsWithImages = await Promise.all(loadedPosts.map(async (post) => {
        if (!post.attachment_path) return post;
        const { data: signedData, error: signedError } = await supabase.storage.from('staff-feed').createSignedUrl(post.attachment_path, 3600);
        return {
          ...post,
          attachment_url: signedData?.signedUrl || null,
          attachment_url_error: signedError?.message || null
        };
      }));
      hydratedPosts = postsWithImages;
      setPosts(postsWithImages);
    }
    setLoading(false);
    return hydratedPosts;
  }, []);

  useEffect(() => { void loadFeed(); }, [loadFeed]);

  const loadSocialProfile = useCallback(async () => {
    const { data, error: profileError } = await supabase.rpc('get_staff_social_profile_v1', { p_admin_user_id: null });
    if (profileError) {
      setProfileStatus('Personal social headers are being prepared. The live feed still works.');
      return;
    }
    const profile = data as SocialProfile;
    let headerUrl: string | null = null;
    if (profile.header_path) {
      const { data: signedData } = await supabase.storage.from('staff-feed').createSignedUrl(profile.header_path, 3600);
      headerUrl = signedData?.signedUrl || null;
    }
    const loadedProfile = { ...profile, header_url: headerUrl };
    setSocialProfile(loadedProfile);
    setProfileBio(loadedProfile.bio || '');
    setProfileAccent(loadedProfile.accent_color || '#4f46e5');
    setProfileStatus('');
  }, []);

  useEffect(() => {
    if (bootstrap) void loadSocialProfile();
  }, [bootstrap, loadSocialProfile]);

  const friendCount = useMemo(() => bootstrap?.people.filter((person) => person.is_my_friend).length || 0, [bootstrap]);
  const selectedCustomerJob = customerJobs.find((job) => job.id === selectedCustomerJobId) || null;
  const selectedCustomerIdea = CUSTOMER_IDEAS.find((idea) => idea.id === selectedIdeaId) || CUSTOMER_IDEAS[0];
  const nicheOptions = Array.from(new Set(CUSTOMER_IDEAS.map((idea) => idea.niche)));
  const visibleCustomerIdeas = getIdeasForNiche(selectedNiche);
  const normalizedIdeaDestinationUrl = normalizeWebUrl(ideaDestinationUrl);
  const generatedQrUrl = normalizedIdeaDestinationUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=900x900&margin=24&data=${encodeURIComponent(normalizedIdeaDestinationUrl)}`
    : '';
  const composerWebUrl = normalizeWebUrl(linkUrl) || extractFirstWebUrl(body);
  const composerYouTubeId = getYouTubeVideoId(composerWebUrl);

  const loadCustomerJobs = async () => {
    if (!bootstrap) return;
    setLoadingCustomerJobs(true);
    setCustomerIdeaError('');
    const rpcName = bootstrap.me.role === 'rep_manager'
      ? 'get_rep_manager_quote_requests_v1'
      : bootstrap.me.role === 'sales_rep'
        ? 'get_rep_assigned_quote_requests_v2'
        : 'get_admin_quote_requests';
    const { data, error: jobsError } = await supabase.rpc(rpcName);
    setLoadingCustomerJobs(false);
    if (jobsError) {
      setCustomerJobs([]);
      setCustomerIdeaError(jobsError.message);
      return;
    }
    const jobs = ((data || []) as Record<string, unknown>[]).map(normalizeCustomerJob);
    setCustomerJobs(jobs);
    const currentJob = jobs.find((job) => job.id === selectedCustomerJobId) || jobs[0];
    setSelectedCustomerJobId(currentJob?.id || '');
    if (currentJob) {
      setSelectedNiche(currentJob.inferredNiche);
      setSelectedIdeaId(getIdeasForNiche(currentJob.inferredNiche)[0]?.id || CUSTOMER_IDEAS[0].id);
      setIdeaDestinationUrl(currentJob.quoteId.trim().toUpperCase() === WHEELERS_TOWING_QUOTE_ID ? WHEELERS_TOWING_PAGE_URL : '');
    }
  };

  const chooseCustomerJob = (jobId: string) => {
    const job = customerJobs.find((customerJob) => customerJob.id === jobId);
    setSelectedCustomerJobId(jobId);
    setCustomerIdeaStatus('');
    if (!job) return;
    setSelectedNiche(job.inferredNiche);
    setSelectedIdeaId(getIdeasForNiche(job.inferredNiche)[0]?.id || CUSTOMER_IDEAS[0].id);
    setIdeaDestinationUrl(job.quoteId.trim().toUpperCase() === WHEELERS_TOWING_QUOTE_ID ? WHEELERS_TOWING_PAGE_URL : '');
  };

  const openIdeaLibrary = () => {
    setIdeaLibraryOpen(true);
    setCustomerIdeaError('');
    setCustomerIdeaStatus('');
    void loadCustomerJobs();
  };

  const buildIdeaMessage = () => [
    `Customer idea: ${selectedCustomerIdea.title}`,
    `Business niche: ${selectedCustomerIdea.niche}`,
    `Sales order: Priority ${selectedCustomerIdea.priority} · ${selectedCustomerIdea.stage}`,
    selectedCustomerJob?.mainProject ? `Keep the main quote first: ${selectedCustomerJob.mainProject}` : '',
    selectedCustomerIdea.description,
    `Suggested placements: ${selectedCustomerIdea.placements}`,
    `Rep offer: ${selectedCustomerIdea.offer}`,
    normalizedIdeaDestinationUrl ? `QR destination: ${normalizedIdeaDestinationUrl}` : '',
    ideaReferenceFiles[0]?.url ? `Customer logo/reference: ${ideaReferenceFiles[0].url}` : '',
    'The QR destination must be scan-tested before printing.'
  ].filter(Boolean).join('\n\n');

  const saveIdeaToCustomerJob = async () => {
    if (!bootstrap || !selectedCustomerJob || savingCustomerIdea) return;
    if (ideaDestinationUrl.trim() && !normalizedIdeaDestinationUrl) {
      setCustomerIdeaError('Enter a valid link beginning with www., http://, or https://, or leave the optional link empty.');
      return;
    }
    if (selectedCustomerIdea.requiresDestination && !normalizedIdeaDestinationUrl) {
      setCustomerIdeaError('Enter the customer’s complete destination link beginning with www., http://, or https://.');
      return;
    }
    setSavingCustomerIdea(true);
    setCustomerIdeaError('');
    setCustomerIdeaStatus('Saving this idea to the customer’s job...');
    const noteText = encodeUpsellImageIdea({
      title: selectedCustomerIdea.title,
      message: buildIdeaMessage(),
      imageUrl: generatedQrUrl || ideaReferenceFiles[0]?.url || undefined,
      imageName: generatedQrUrl ? `${selectedCustomerIdea.id}-qr-code.png` : ideaReferenceFiles[0]?.name
    });
    const rpcName = bootstrap.me.role === 'sales_rep' || bootstrap.me.role === 'rep_manager'
      ? 'add_quote_internal_note_rep_v1'
      : 'add_quote_internal_note_admin';
    const { error: saveError } = await supabase.rpc(rpcName, {
      p_quote_request_id: selectedCustomerJob.id,
      p_note_text: noteText
    });
    if (saveError) {
      setSavingCustomerIdea(false);
      setCustomerIdeaStatus('');
      setCustomerIdeaError(saveError.message);
      return;
    }
    const isRep = bootstrap.me.role === 'sales_rep' || bootstrap.me.role === 'rep_manager';
    void fetch('/api/send-internal-note-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(isRep ? { recipientType: 'office' } : {
          repEmail: selectedCustomerJob.repEmail,
          repSlug: selectedCustomerJob.repSlug,
          repName: selectedCustomerJob.repName
        }),
        authorName: bootstrap.me.display_name || bootstrap.me.email,
        quoteId: selectedCustomerJob.quoteId,
        customerName: selectedCustomerJob.customerName,
        noteText: buildIdeaMessage()
      })
    }).catch(() => undefined);
    setSavingCustomerIdea(false);
    setCustomerIdeaStatus(`Saved to ${selectedCustomerJob.customerName}. Open that customer’s job to review the idea and start its quote.`);
  };

  const shareIdeaWithStaff = () => {
    const customerLabel = selectedCustomerJob
      ? `${selectedCustomerJob.customerName}${selectedCustomerJob.companyName ? ` / ${selectedCustomerJob.companyName}` : ''}`
      : 'a customer';
    setBody(`CUSTOMER IDEA FOR ${customerLabel.toUpperCase()}\n\n${buildIdeaMessage()}`);
    setLinkUrl(normalizedIdeaDestinationUrl || '');
    setIdeaLibraryOpen(false);
    setError('');
    window.setTimeout(() => {
      composerRef.current?.focus();
      composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  const acceptImage = async (file: File | null) => {
    if (!file) return;
    const requestId = mediaSelectionRequestRef.current + 1;
    mediaSelectionRequestRef.current = requestId;
    if (!isAcceptedMediaFile(file)) {
      setMediaPhase(imageFile ? 'ready' : 'idle');
      setError('Use a photo, screenshot, GIF, MP4, WEBM, or MOV file.');
      return;
    }
    try {
      const preparedFile = await prepareStaffMedia(file, setMediaPhase);
      if (mediaSelectionRequestRef.current !== requestId) return;
      if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current);
      const nextPreviewUrl = URL.createObjectURL(preparedFile);
      imagePreviewUrlRef.current = nextPreviewUrl;
      setImageFile(preparedFile);
      setImagePreview(nextPreviewUrl);
      setMediaPhase('ready');
      setError('');
    } catch (mediaError) {
      if (mediaSelectionRequestRef.current !== requestId) return;
      setMediaPhase('idle');
      setError(mediaError instanceof Error ? mediaError.message : 'The media could not be prepared.');
    }
  };

  const clearImage = (revokePreview = true) => {
    if (revokePreview && imagePreview) URL.revokeObjectURL(imagePreview);
    if (revokePreview) imagePreviewUrlRef.current = '';
    mediaSelectionRequestRef.current += 1;
    setImageFile(null);
    setImagePreview('');
    setMediaPhase('idle');
  };

  const handleImagePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const imageItem = Array.from(event.clipboardData.items).find((item) => item.kind === 'file' && item.type.startsWith('image/'));
    const pastedImage = imageItem?.getAsFile();
    if (pastedImage) { event.preventDefault(); void acceptImage(pastedImage); }
  };

  const handleImagePicker = (event: ChangeEvent<HTMLInputElement>) => {
    void acceptImage(event.target.files?.[0] || null);
    event.target.value = '';
  };

  const saveSocialProfile = async (headerPath = socialProfile?.header_path || null, headerName = socialProfile?.header_name || null) => {
    setProfileBusy(true);
    setProfileStatus('Saving your social homepage...');
    const { error: profileError } = await supabase.rpc('update_staff_social_profile_v1', {
      p_header_path: headerPath,
      p_header_name: headerName,
      p_bio: profileBio,
      p_accent_color: profileAccent
    });
    if (profileError) {
      setProfileBusy(false);
      setProfileStatus(profileError.message);
      return;
    }
    setEditingProfile(false);
    setProfileBusy(false);
    setProfileStatus('Social homepage saved.');
    await loadSocialProfile();
  };

  const uploadProfileHeader = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setProfileStatus('Use a PNG, JPG, or WEBP image for the personal header.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setProfileStatus('The personal header must be smaller than 10 MB.');
      return;
    }
    setProfileBusy(true);
    setProfileStatus('Uploading your personal header...');
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setProfileBusy(false);
      setProfileStatus('Please sign in again before uploading a header.');
      return;
    }
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const headerPath = `${userId}/profile-headers/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('staff-feed').upload(headerPath, file, { contentType: file.type, cacheControl: '3600', upsert: false });
    if (uploadError) {
      setProfileBusy(false);
      setProfileStatus(uploadError.message);
      return;
    }
    await saveSocialProfile(headerPath, file.name);
  };

  const notifyStaffActivity = async (postId: string, eventType: 'new_post' | 'comment' | 'reaction', commentId?: string) => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) return;
    try {
      const response = await fetch('/api/send-staff-feed-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ postId, eventType, commentId: commentId || null })
      });
      if (!response.ok) console.warn('Staff email notification was not delivered.');
    } catch {
      console.warn('Staff email notification was not delivered.');
    }
  };

  const sendVideoToAdminReview = async (post: FeedPost) => {
    if (working || videoReviewPostIds.includes(post.id)) return;
    setWorking(true);
    setError('');
    const { error: reviewError } = await supabase.rpc('create_video_instruction_from_post_v1', {
      p_post_id: post.id
    });
    if (reviewError) {
      setError(reviewError.message.includes('Could not find the function')
        ? 'The Admin video-review update must be installed before social videos can be submitted.'
        : reviewError.message);
    } else {
      setVideoReviewPostIds((current) => [...current, post.id]);
      setCommentDrafts((current) => ({
        ...current,
        [post.id]: 'Video sent to Admin for transcription, problem/fix review, approval, and follow-up.'
      }));
    }
    setWorking(false);
  };

  const createPost = async () => {
    const postBody = body.trim() || (imageFile ? (getStaffMediaDetails(imageFile)?.kind === 'video' ? 'Shared a video.' : 'Shared a photo or screenshot.') : '');
    if (!postBody || working || createPostInFlightRef.current) return;
    if (audience === 'specific' && recipientIds.length === 0) { setError('Choose at least one person for this post.'); return; }
    const normalizedLinkUrl = normalizeWebUrl(linkUrl) || extractFirstWebUrl(postBody);
    if (linkUrl.trim() && !normalizedLinkUrl) { setError('Enter a link starting with www., http://, or https://.'); return; }
    createPostInFlightRef.current = true;
    setWorking(true);
    setError('');
    let attachmentPath: string | null = null;
    const attachedFile = imageFile;
    const attachedPreview = imagePreview;
    try {
      if (imageFile) {
        setMediaPhase('uploading');
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id;
        if (!userId) { setError('Please sign in again before uploading media.'); return; }
        const mediaDetails = getStaffMediaDetails(imageFile);
        if (!mediaDetails) { setError('The selected media type is not supported.'); setMediaPhase('ready'); return; }
        attachmentPath = `${userId}/${crypto.randomUUID()}.${mediaDetails.extension}`;
        const { error: uploadError } = await supabase.storage.from('staff-feed').upload(attachmentPath, imageFile, {
          contentType: mediaDetails.contentType,
          cacheControl: '3600',
          upsert: false
        });
        if (uploadError) { setError(uploadError.message); setMediaPhase('ready'); return; }
        setMediaPhase('finalizing');
      }
      const { data: postId, error: postError } = await supabase.rpc('create_staff_feed_post_v1', {
        p_body: postBody, p_audience_type: audience, p_recipient_ids: recipientIds,
        p_link_url: normalizedLinkUrl,
        p_attachment_path: attachmentPath,
        p_attachment_name: attachedFile?.name || 'pasted-screenshot.png'
      });
      if (postError) {
        if (attachmentPath) await supabase.storage.from('staff-feed').remove([attachmentPath]);
        setError(postError.message);
        setMediaPhase(imageFile ? 'ready' : 'idle');
      } else {
        const optimisticPostId = String(postId || crypto.randomUUID());
        if (bootstrap) {
          setPosts((currentPosts) => [{
            id: optimisticPostId,
            body: postBody,
            link_url: normalizedLinkUrl,
            audience_type: audience,
            created_at: new Date().toISOString(),
            attachment_path: attachmentPath,
            attachment_name: attachedFile?.name || (attachmentPath ? 'pasted-screenshot.png' : null),
            attachment_url: attachedPreview || null,
            attachment_url_error: null,
            author_id: bootstrap.me.id,
            author_name: bootstrap.me.display_name || bootstrap.me.email,
            author_role: bootstrap.me.role,
            is_mine: true,
            recipient_names: [],
            reaction_counts: { ...EMPTY_REACTION_COUNTS },
            my_reaction: null,
            comments: []
          }, ...currentPosts.filter((post) => post.id !== optimisticPostId)]);
        }
        if (audience === 'everyone' || bootstrap?.me.is_owner_admin) setSocialView('live_feed');
        setBody(''); setLinkUrl(''); setRecipientIds([]); setAudience('everyone');
        clearImage(false);
        if (postId) void notifyStaffActivity(String(postId), 'new_post');
        const refreshedPosts = await loadFeed();
        const signedReplacementReady = refreshedPosts?.some((post) =>
          post.id === optimisticPostId &&
          Boolean(post.attachment_url) &&
          !post.attachment_url?.startsWith('blob:')
        );
        if (signedReplacementReady && attachedPreview && imagePreviewUrlRef.current === attachedPreview) {
          URL.revokeObjectURL(attachedPreview);
          imagePreviewUrlRef.current = '';
        } else if (attachmentPath && attachedPreview) {
          setPosts((currentPosts) => currentPosts.map((post) =>
            post.id === optimisticPostId && !post.attachment_url
              ? { ...post, attachment_url: attachedPreview }
              : post
          ));
        }
      }
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : 'The post could not be completed.');
      setMediaPhase(imageFile ? 'ready' : 'idle');
    } finally {
      createPostInFlightRef.current = false;
      setWorking(false);
      setMediaPhase((current) => current === 'uploading' || current === 'finalizing' ? (imageFile ? 'ready' : 'idle') : current);
    }
  };

  const react = async (post: FeedPost, reaction: Reaction) => {
    const nextReaction = post.my_reaction === reaction ? null : reaction;
    setReactionPickerPostId(null);
    setPosts((current) => current.map((item) => item.id === post.id ? {
      ...item,
      my_reaction: nextReaction,
      reaction_counts: {
        ...item.reaction_counts,
        ...(post.my_reaction ? { [post.my_reaction]: Math.max(0, (item.reaction_counts[post.my_reaction] || 0) - 1) } : {}),
        ...(nextReaction ? { [nextReaction]: (item.reaction_counts[nextReaction] || 0) + 1 } : {})
      }
    } : item));
    const { error: reactionError } = await supabase.rpc('set_staff_feed_reaction_v1', { p_post_id: post.id, p_reaction: nextReaction });
    if (reactionError) { setError(reactionError.message); await loadFeed(); }
    else if (nextReaction) void notifyStaffActivity(post.id, 'reaction');
  };

  const downloadAttachment = async (post: FeedPost) => {
    if (!post.attachment_path || downloadingPostId) return;
    setDownloadingPostId(post.id);
    setError('');
    try {
      const { data, error: downloadError } = await supabase.storage
        .from('staff-feed')
        .download(post.attachment_path);
      if (downloadError || !data) throw downloadError || new Error('The file could not be downloaded.');

      const downloadUrl = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = getAttachmentName(post);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'The file could not be downloaded.');
    } finally {
      setDownloadingPostId(null);
    }
  };

  const refreshSelectedMedia = async (post: FeedPost) => {
    if (!post.attachment_path) {
      setSelectedMediaLoading(false);
      setSelectedMediaError('This post does not have an attached image.');
      return;
    }

    setSelectedMediaLoading(true);
    setSelectedMediaError('');
    const { data, error: signedUrlError } = await supabase.storage
      .from('staff-feed')
      .createSignedUrl(post.attachment_path, 3600);

    if (signedUrlError || !data?.signedUrl) {
      setSelectedMediaLoading(false);
      setSelectedMediaError(signedUrlError?.message || 'The full-size image could not be opened.');
      return;
    }

    setSelectedMediaPost((current) => current?.id === post.id
      ? { ...current, attachment_url: signedUrlError ? null : data.signedUrl, attachment_url_error: null }
      : current);
  };

  const openMediaPost = (post: FeedPost) => {
    const postForViewer = { ...post, attachment_url: null, attachment_url_error: null };
    setSelectedMediaPost(postForViewer);
    void refreshSelectedMedia(postForViewer);
  };

  const addComment = async (postId: string) => {
    const comment = commentDrafts[postId]?.trim();
    if (!comment || working) return;
    setWorking(true);
    const { data: commentId, error: commentError } = await supabase.rpc('add_staff_feed_comment_v1', { p_post_id: postId, p_body: comment });
    if (commentError) setError(commentError.message);
    else {
      setCommentDrafts((current) => ({ ...current, [postId]: '' }));
      if (commentId) void notifyStaffActivity(postId, 'comment', String(commentId));
      await loadFeed();
    }
    setWorking(false);
  };

  const connectFriends = async (one: string, two: string, enabled: boolean) => {
    if (!one || !two || one === two || working) { if (one === two) setError('Choose two different people.'); return; }
    setWorking(true); setError('');
    const { error: friendshipError } = await supabase.rpc('set_staff_friendship_admin_v1', {
      p_user_one_id: one, p_user_two_id: two, p_enabled: enabled
    });
    if (friendshipError) setError(friendshipError.message);
    else { setFriendOne(''); setFriendTwo(''); await loadFeed(); }
    setWorking(false);
  };

  const allPeople = bootstrap ? [{ id: bootstrap.me.id, display_name: bootstrap.me.display_name, email: bootstrap.me.email, role: bootstrap.me.role, is_my_friend: false }, ...bootstrap.people] : [];
  const postsForView = socialView === 'my_home' && bootstrap
    ? posts.filter((post) => post.author_id === bootstrap.me.id)
    : posts;
  const visiblePosts = postsForView.slice(0, visiblePostCount);
  const isZoeViewer = /\bzoe\b|\bzoie\b/i.test(`${bootstrap?.me.display_name || ''} ${bootstrap?.me.email || ''}`);

  return (
    <section className="space-y-4" aria-label="Staff feed">
      <Card className="border-indigo-200 bg-white shadow-sm">
        <CardContent className="grid gap-2 p-2 sm:grid-cols-2">
          <Button type="button" variant={socialView === 'my_home' ? 'default' : 'ghost'} className={`min-h-12 touch-manipulation font-bold ${socialView === 'my_home' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`} onClick={() => { setSocialView('my_home'); setVisiblePostCount(10); }} onTouchEnd={(event) => runMobileTouchAction(event, () => { setSocialView('my_home'); setVisiblePostCount(10); })}>
            <Users className="mr-2 h-5 w-5" /> My Social Home
          </Button>
          <Button type="button" variant={socialView === 'live_feed' ? 'default' : 'ghost'} className={`min-h-12 touch-manipulation font-bold ${socialView === 'live_feed' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`} onClick={() => { setSocialView('live_feed'); setVisiblePostCount(10); }} onTouchEnd={(event) => runMobileTouchAction(event, () => { setSocialView('live_feed'); setVisiblePostCount(10); })}>
            <RefreshCw className="mr-2 h-5 w-5" /> Live Team Feed
          </Button>
        </CardContent>
      </Card>

      {isZoeViewer && <ZoeMissionOne viewerName={bootstrap?.me.display_name || bootstrap?.me.email || 'Zoe'} ownerPreview={false} />}

      {socialView === 'my_home' && <>
      <Card className="overflow-hidden border-indigo-300 shadow-lg">
        <div
          className="relative min-h-52 bg-gradient-to-br from-slate-950 via-indigo-950 to-fuchsia-950 bg-cover bg-center p-5 text-white sm:min-h-64 sm:p-7"
          style={socialProfile?.header_url ? { backgroundImage: `linear-gradient(90deg, rgba(2,6,23,.9), rgba(2,6,23,.35)), url(${socialProfile.header_url})` } : { backgroundImage: `linear-gradient(135deg, #020617, ${profileAccent}, #701a75)` }}
        >
          <div className="relative z-10 flex min-h-40 flex-col justify-end">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">BWB Staff Social Homepage</p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">{socialProfile?.display_name || bootstrap?.me.display_name || 'My Homepage'}</h2>
            <p className="mt-1 text-sm font-semibold text-indigo-100">{roleLabel(socialProfile?.role || bootstrap?.me.role || 'staff')}</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/90">{socialProfile?.bio || 'Add a short introduction, specialty, or message for your teammates.'}</p>
          </div>
          <Button type="button" variant="secondary" className="relative z-20 mt-4 min-h-12 w-full touch-manipulation bg-white/95 font-bold text-slate-950 hover:bg-white sm:absolute sm:right-4 sm:top-4 sm:mt-0 sm:min-h-11 sm:w-auto" onClick={() => setEditingProfile((current) => !current)} onTouchEnd={(event) => runMobileTouchAction(event, () => setEditingProfile((current) => !current))}>
            <Pencil className="mr-2 h-4 w-4" /> {editingProfile ? 'Close Editor' : 'Edit Homepage'}
          </Button>
        </div>
        {editingProfile && <CardContent className="grid gap-4 border-t border-indigo-200 bg-indigo-50/60 p-4 sm:p-5">
          <div>
            <label className="text-sm font-bold text-slate-900" htmlFor="staff-social-bio">Homepage introduction</label>
            <Textarea id="staff-social-bio" value={profileBio} onChange={(event) => setProfileBio(event.target.value)} className="mt-2 min-h-24 bg-white" maxLength={500} placeholder="Tell the team what you sell, create, or help customers with." />
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
            <div>
              <label className="text-sm font-bold text-slate-900" htmlFor="staff-social-accent">Homepage accent color</label>
              <div className="mt-2 flex min-h-12 items-center gap-3 rounded-md border bg-white px-3">
                <input id="staff-social-accent" type="color" value={profileAccent} onChange={(event) => setProfileAccent(event.target.value)} className="h-9 w-14 cursor-pointer border-0 bg-transparent" />
                <span className="font-mono text-sm text-slate-700">{profileAccent}</span>
              </div>
            </div>
            <Button type="button" variant="outline" className="min-h-12 touch-manipulation bg-white" onClick={() => profileHeaderInputRef.current?.click()} disabled={profileBusy}>
              <UploadCloud className="mr-2 h-5 w-5" /> Upload Header
            </Button>
            <input ref={profileHeaderInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void uploadProfileHeader(event)} />
            <Button type="button" className="min-h-12 touch-manipulation bg-indigo-600 hover:bg-indigo-700" onClick={() => void saveSocialProfile()} disabled={profileBusy}>
              <Save className="mr-2 h-5 w-5" /> {profileBusy ? 'Saving...' : 'Save Homepage'}
            </Button>
          </div>
          {profileStatus && <p className="text-sm font-medium text-indigo-800">{profileStatus}</p>}
        </CardContent>}
      </Card>

      <Card className="overflow-hidden border-indigo-300 bg-gradient-to-br from-white via-indigo-50/50 to-violet-50/70 shadow-lg">
        <div className="border-b border-indigo-300 bg-[#030819]">
          <img src="/staff-feed/bwb-fate-staff-social.png" alt="BWB F.A.T.E. Staff Social - Focus, Authority, Tribe, Emotion" className="aspect-[3/1] w-full object-cover" />
        </div>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl text-slate-950"><Users className="h-5 w-5 text-indigo-600" /> Post From My Social Home</CardTitle>
              <p className="mt-1 text-sm text-slate-600">Publish to the live team feed, then choose exactly who may see it. Owner Admin can review everything.</p>
            </div>
            <Button type="button" variant="outline" size="sm" className="min-h-11 touch-manipulation" onClick={() => void loadFeed()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-fuchsia-200 bg-gradient-to-br from-slate-950 via-indigo-950 to-fuchsia-950 text-white shadow-md">
            <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-300 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-950">
                    <Sparkles className="h-3.5 w-3.5" /> Customer Idea Library Preview
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-fuchsia-100">
                    <Gift className="h-3.5 w-3.5" /> Starter stickers can be free
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-950/40">
                    <QrCode className="h-7 w-7" />
                  </span>
                  <div>
                    <h3 className="text-xl font-black sm:text-2xl">Free Social QR Sticker Giveaway</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-indigo-100 sm:text-base">
                      Turn a customer’s real Instagram, Facebook, review, or website QR code into working stickers they can place on counters, packaging, toolboxes, windows, event materials, and giveaway items.
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-white/15 bg-white/10 p-3 text-sm leading-6 text-white">
                  <p className="flex items-center gap-2 font-black text-cyan-200"><Lightbulb className="h-4 w-4" /> Rep talking point</p>
                  <p className="mt-1">“We can create a starter batch of working QR stickers for your business. Put them where customers already look and make it easier for people to follow, share, and remember your brand.”</p>
                </div>
              </div>
              <Button type="button" onClick={openIdeaLibrary} className="min-h-12 touch-manipulation bg-cyan-300 px-5 font-black text-slate-950 hover:bg-cyan-200 lg:min-w-56">
                Browse Customer Ideas
              </Button>
            </div>
            <div className="border-t border-white/10 bg-black/20 px-4 py-2.5 text-center text-xs font-semibold text-indigo-100 sm:px-5 sm:text-left">
              Choose a niche-based idea, connect it to a real customer job, generate the working QR, and continue it into that customer’s quote.
            </div>
          </div>
          <div className="rounded-xl border-2 border-dashed border-indigo-300 bg-white p-2 transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200">
            <Textarea ref={composerRef} value={body} onChange={(event) => setBody(event.target.value)} onPaste={handleImagePaste} placeholder="Share an update—or copy a screenshot and paste it right here..." className="min-h-28 resize-y border-0 bg-transparent text-base shadow-none focus-visible:ring-0" maxLength={5000} />
            <div className="border-t border-slate-100 px-1 py-2">
              <VoiceDictationButton
                fieldName="social post"
                disabled={working}
                onTranscript={(transcript) => {
                  setBody((current) => appendDictation(current, transcript).slice(0, 5000));
                  window.setTimeout(() => composerRef.current?.focus(), 0);
                }}
              />
            </div>
            {imagePreview && <div className="relative overflow-hidden rounded-lg border border-indigo-200 bg-slate-950">
              {imageFile && getStaffMediaDetails(imageFile)?.kind === 'video'
                ? <video src={imagePreview} controls playsInline preload="metadata" className="max-h-[32rem] w-full object-contain" />
                : <img src={imagePreview} alt="Visual ready to post" className="max-h-[32rem] w-full object-contain" />}
              <button type="button" onClick={clearImage} className="absolute right-2 top-2 flex h-11 w-11 touch-manipulation items-center justify-center rounded-full bg-slate-950/85 text-white shadow-lg" aria-label="Remove attached media"><X className="h-5 w-5" /></button>
            </div>}
            <div className="border-t border-slate-100 px-1 pt-3">
            <p className="mb-2 text-center text-xs font-medium text-slate-600 sm:text-left">Add visual details to this post</p>
            {mediaPhase === 'optimizing' && <p role="status" className="mb-2 rounded-md bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">Optimizing image for a reliable upload…</p>}
            {mediaPhase === 'uploading' && <p role="status" className="mb-2 rounded-md bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-800">Uploading media securely…</p>}
            {mediaPhase === 'finalizing' && <p role="status" className="mb-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">Upload complete. Finalizing your post…</p>}
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  className="inline-flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800"
                  onClick={() => mediaPickerInputRef.current?.click()}
                  disabled={working || mediaPhase === 'optimizing'}
                >
                  {imageFile?.type.startsWith('video/') ? <Video className="h-5 w-5" /> : <ImagePlus className="h-5 w-5" />} {imageFile ? 'Change Photo or Video' : 'Upload Photo, Screenshot, or Video'}
                </button>
                <input ref={mediaPickerInputRef} type="file" accept=".png,.jpg,.jpeg,.webp,.gif,.heic,.heif,.mp4,.webm,.mov,image/png,image/jpeg,image/webp,image/gif,image/heic,image/heif,video/mp4,video/webm,video/quicktime" className="sr-only" onChange={handleImagePicker} disabled={working || mediaPhase === 'optimizing'} />
                <button
                  type="button"
                  className="inline-flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-lg border-2 border-indigo-300 bg-indigo-50 px-4 text-sm font-bold text-indigo-800 hover:bg-indigo-100 active:bg-indigo-200 sm:hidden"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={working || mediaPhase === 'optimizing'}
                >
                  <Video className="h-5 w-5" /> Take Photo or Video
                </button>
                <input ref={cameraInputRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime,.heic,.heif,.mov" capture="environment" className="sr-only" onChange={handleImagePicker} disabled={working || mediaPhase === 'optimizing'} />
                <p className="self-center text-xs leading-5 text-slate-500 sm:text-right">Photos: 25 MB max. Videos: MP4, WEBM, or MOV up to 50 MB. Phone users can upload or record.</p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(13rem,0.45fr)]">
            <div className="relative"><LinkIcon className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><Input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="Optional link — www.example.com is okay" className="min-h-11 bg-white pl-10" inputMode="url" /></div>
            <select value={audience} onChange={(event) => { setAudience(event.target.value as Audience); setRecipientIds([]); }} className="min-h-11 touch-manipulation rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800">
              {(Object.keys(audienceLabels) as Audience[]).map((key) => <option key={key} value={key}>{audienceLabels[key]}</option>)}
            </select>
          </div>
          {composerYouTubeId && (
            <div className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-red-100 px-3 py-2 text-sm font-black text-red-700">
                <Video className="h-4 w-4" /> YouTube video ready to post
              </div>
              <div className="relative aspect-video bg-black">
                <img
                  src={`https://i.ytimg.com/vi/${composerYouTubeId}/hqdefault.jpg`}
                  alt="YouTube video thumbnail"
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-2xl text-white shadow-xl">▶</span>
                </span>
              </div>
            </div>
          )}
          {audience === 'friends' && <p className="rounded-md bg-white px-3 py-2 text-sm text-slate-600">This will go to {friendCount} connected friend{friendCount === 1 ? '' : 's'}.</p>}
          {audience === 'specific' && (
            <div className="grid max-h-52 gap-2 overflow-y-auto rounded-md border border-indigo-200 bg-white p-3 sm:grid-cols-2">
              {bootstrap?.people.map((person) => <label key={person.id} className="flex min-h-11 cursor-pointer touch-manipulation items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm">
                <input type="checkbox" className="h-5 w-5" checked={recipientIds.includes(person.id)} onChange={(event) => setRecipientIds((current) => event.target.checked ? [...current, person.id] : current.filter((id) => id !== person.id))} />
                <span className="min-w-0"><span className="block truncate font-semibold">{person.display_name}</span><span className="block truncate text-xs text-slate-500">{roleLabel(person.role)}</span></span>
              </label>)}
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">Visible only to the audience you choose. Admin can review the full staff feed.</p>
            <Button type="button" className="min-h-12 touch-manipulation bg-indigo-600 px-7 hover:bg-indigo-700" onClick={() => void createPost()} disabled={(!body.trim() && !imageFile) || working || mediaPhase === 'optimizing'}>{working ? (imageFile ? 'Uploading & Posting...' : 'Posting...') : mediaPhase === 'optimizing' ? 'Optimizing Image...' : 'Post to Staff Feed'}</Button>
          </div>
          {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </CardContent>
      </Card>
      </>}

      {socialView === 'live_feed' && <Card className="border-indigo-200 bg-gradient-to-r from-indigo-950 to-violet-950 text-white shadow-md">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-2xl font-black">Live Team Feed</h2><p className="mt-1 text-sm text-indigo-100">You see posts shared with you, your friends, or the full team. Owner Admin sees the complete company conversation.</p></div>
          <Button type="button" variant="secondary" className="min-h-11 touch-manipulation bg-white text-slate-950" onClick={() => void loadFeed()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</Button>
        </CardContent>
      </Card>}

      {bootstrap?.me.is_owner_admin && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3"><CardTitle className="text-base">Friend Connections</CardTitle><p className="text-sm text-slate-600">Admin controls who receives posts sent to “All My Friends.”</p></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <select value={friendOne} onChange={(event) => setFriendOne(event.target.value)} className="min-h-11 rounded-md border bg-white px-3 text-sm"><option value="">Choose first person</option>{allPeople.map((person) => <option key={person.id} value={person.id}>{person.display_name}</option>)}</select>
              <select value={friendTwo} onChange={(event) => setFriendTwo(event.target.value)} className="min-h-11 rounded-md border bg-white px-3 text-sm"><option value="">Choose second person</option>{allPeople.map((person) => <option key={person.id} value={person.id}>{person.display_name}</option>)}</select>
              <Button type="button" className="min-h-11 touch-manipulation" onClick={() => void connectFriends(friendOne, friendTwo, true)} disabled={!friendOne || !friendTwo || working}>Connect</Button>
            </div>
            {bootstrap.friendships.length > 0 ? <div className="grid gap-2 md:grid-cols-2">{bootstrap.friendships.map((friendship) => <div key={friendship.id} className="flex items-center justify-between gap-3 rounded-md border bg-slate-50 p-3 text-sm"><span className="font-medium">{friendship.user_one_name} ↔ {friendship.user_two_name}</span><Button type="button" variant="ghost" size="sm" className="min-h-10 touch-manipulation text-red-600" onClick={() => void connectFriends(friendship.user_one_id, friendship.user_two_id, false)}>Remove</Button></div>)}</div> : <p className="text-sm text-slate-500">No friend connections yet.</p>}
          </CardContent>
        </Card>
      )}

      {loading ? <Card><CardContent className="flex items-center justify-center py-10 text-sm text-slate-600"><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading the staff feed...</CardContent></Card> : postsForView.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-slate-600">{socialView === 'my_home' ? 'You have not posted from your social homepage yet.' : 'No staff posts are visible yet.'}</CardContent></Card> : visiblePosts.map((post) => {
        const commentsExpanded = expandedCommentPosts.includes(post.id);
        const hiddenCommentCount = Math.max(0, post.comments.length - 2);
        const commentsToShow = commentsExpanded ? post.comments : post.comments.slice(-2);
        const missingExpectedMedia = !post.attachment_path && postBodyClaimsMedia(post);
        const postWebUrl = getPostWebUrl(post);
        const youtubeVideoId = getYouTubeVideoId(postWebUrl);
        return (
        <Card key={post.id} className="overflow-hidden border-slate-200 shadow-sm">
          <CardContent className="p-0">
            <div className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="font-bold text-slate-950">{post.author_name}</p><p className="text-xs text-slate-500">{roleLabel(post.author_role)} · {friendlyDate(post.created_at)}</p></div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{audienceLabels[post.audience_type]}{post.audience_type === 'specific' && post.recipient_names.length ? `: ${post.recipient_names.join(', ')}` : ''}</span>
              </div>
              <p className="mt-4 whitespace-pre-wrap break-words text-base leading-7 text-slate-800">{post.body}</p>
              {missingExpectedMedia && (
                <div className="mt-4 flex min-h-32 flex-col items-center justify-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center">
                  <ImagePlus className="h-9 w-9 text-amber-700" />
                  <div>
                    <p className="font-bold text-amber-950">Photo not attached to this post</p>
                    <p className="mt-1 text-sm text-amber-800">
                      The post text says a photo or screenshot was shared, but the saved post did not return an attachment path.
                    </p>
                  </div>
                </div>
              )}
              {post.attachment_path && (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-sm">
                  {post.attachment_url ? (
                    isVideoAttachment(post.attachment_name, post.attachment_path)
                      ? <video src={post.attachment_url} controls playsInline preload="metadata" className="max-h-[42rem] w-full object-contain">Your browser cannot play this video.</video>
                      : <button type="button" className="group block w-full touch-manipulation text-left" onClick={() => openMediaPost(post)} aria-label={`Open ${getAttachmentName(post)} full size`}>
                          <img src={post.attachment_url} alt={getAttachmentName(post)} loading="lazy" className="max-h-[28rem] w-full object-contain transition group-hover:scale-[1.01] sm:max-h-[34rem]" />
                          <span className="flex min-h-11 items-center justify-between gap-3 bg-white px-3 py-2 text-sm font-semibold text-slate-800">
                            <span className="truncate">{getAttachmentName(post)}</span>
                            <span className="shrink-0 text-indigo-700">Open large</span>
                          </span>
                        </button>
                  ) : (
                    <div className="flex min-h-40 flex-col items-center justify-center gap-3 bg-slate-100 px-4 py-8 text-center">
                      <ImagePlus className="h-10 w-10 text-slate-500" />
                      <div>
                        <p className="font-bold text-slate-900">{getAttachmentName(post)}</p>
                        <p className="mt-1 text-sm text-slate-600">This post has an uploaded photo or screenshot, but the preview link could not be opened yet.</p>
                        {post.attachment_url_error && <p className="mt-2 text-xs text-red-600">{post.attachment_url_error}</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {post.attachment_path && isVideoAttachment(post.attachment_name, post.attachment_path) && (
                <div className="mt-3 flex flex-col gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-indigo-950">Does this video contain a problem or instruction?</p>
                    <p className="text-xs leading-5 text-indigo-700">Send it to Admin for transcription, a proposed fix, social follow-up, approval, and deployment.</p>
                  </div>
                  <Button type="button" className="min-h-11 shrink-0 bg-indigo-700 hover:bg-indigo-800"
                    onClick={() => void sendVideoToAdminReview(post)}
                    disabled={working || videoReviewPostIds.includes(post.id)}>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    {videoReviewPostIds.includes(post.id) ? 'Sent to Admin' : 'Send to Admin Review'}
                  </Button>
                </div>
              )}
              {youtubeVideoId && postWebUrl ? (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="relative aspect-video bg-black">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}`}
                      title={`YouTube video shared by ${post.author_name}`}
                      className="absolute inset-0 h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                  <a href={postWebUrl} target="_blank" rel="noreferrer" className="flex min-h-12 items-center gap-2 break-all px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50">
                    <Video className="h-4 w-4 shrink-0" /> Watch on YouTube
                  </a>
                </div>
              ) : postWebUrl ? (
                <a href={postWebUrl} target="_blank" rel="noreferrer" className="mt-3 flex min-h-11 touch-manipulation items-center gap-2 break-all rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">
                  <LinkIcon className="h-4 w-4 shrink-0" />{postWebUrl}
                </a>
              ) : null}
            </div>
            <div className="grid grid-cols-2 border-y border-slate-200 bg-slate-50">
              <div className="group relative border-r border-slate-200">
                <div
                  className={`absolute bottom-[calc(100%+.45rem)] left-2 z-30 flex max-w-[calc(100vw-3rem)] items-end gap-0.5 rounded-full border border-slate-200 bg-white p-1.5 shadow-xl transition-all duration-150 ${
                    reactionPickerPostId === post.id
                      ? 'visible translate-y-0 opacity-100'
                      : 'invisible translate-y-2 opacity-0 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100'
                  }`}
                  role="menu"
                  aria-label="Choose a reaction"
                >
                  {REACTIONS.map(({ key, label, emoji }) => (
                    <button
                      key={key}
                      type="button"
                      role="menuitem"
                      title={label}
                      aria-label={label}
                      onClick={() => void react(post, key)}
                      className={`flex h-11 w-9 shrink-0 touch-manipulation items-center justify-center rounded-full text-2xl transition hover:-translate-y-1 hover:scale-125 focus-visible:-translate-y-1 focus-visible:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:h-12 sm:w-10 ${
                        post.my_reaction === key ? 'bg-indigo-100 ring-2 ring-indigo-400' : 'hover:bg-slate-100'
                      }`}
                    >
                      <span aria-hidden="true">{emoji}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.matchMedia('(hover: hover)').matches) void react(post, post.my_reaction || 'like');
                    else setReactionPickerPostId((current) => current === post.id ? null : post.id);
                  }}
                  onContextMenu={(event) => { event.preventDefault(); setReactionPickerPostId(post.id); }}
                  aria-haspopup="menu"
                  aria-expanded={reactionPickerPostId === post.id}
                  className={`flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 px-3 text-sm font-bold ${
                    post.my_reaction
                      ? REACTIONS.find(({ key }) => key === post.my_reaction)?.activeClass
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  <span className="text-lg" aria-hidden="true">{REACTIONS.find(({ key }) => key === post.my_reaction)?.emoji || '👍'}</span>
                  <span>{REACTIONS.find(({ key }) => key === post.my_reaction)?.label || 'Like'}</span>
                  {post.my_reaction && post.reaction_counts[post.my_reaction] > 0 ? <span>{post.reaction_counts[post.my_reaction]}</span> : null}
                  <span className="text-[10px] text-slate-400" aria-hidden="true">▾</span>
                </button>
              </div>
              <button type="button" title="Team sharing will be added in a future update" className="flex min-h-12 touch-manipulation items-center justify-center gap-1.5 px-2 text-sm font-semibold text-slate-400"><Share2 className="h-4 w-4" /> <span>Share soon</span></button>
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              {hiddenCommentCount > 0 && <button type="button" className="min-h-10 touch-manipulation text-sm font-semibold text-indigo-700 hover:text-indigo-900" onClick={() => setExpandedCommentPosts((current) => commentsExpanded ? current.filter((id) => id !== post.id) : [...current, post.id])}>{commentsExpanded ? 'Hide older comments' : `View ${hiddenCommentCount} older comment${hiddenCommentCount === 1 ? '' : 's'}`}</button>}
              {commentsToShow.map((comment) => <div key={comment.id} className="rounded-xl bg-slate-100 px-3 py-2.5"><p className="text-sm font-bold text-slate-900">{comment.author_name} <span className="ml-1 text-xs font-normal text-slate-500">{friendlyDate(comment.created_at)}</span></p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{comment.body}</p></div>)}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input value={commentDrafts[post.id] || ''} onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void addComment(post.id); } }} placeholder="Write a comment..." className="min-h-11 text-base" maxLength={2000} />
                <VoiceDictationButton
                  fieldName="comment"
                  compact
                  disabled={working}
                  onTranscript={(transcript) => setCommentDrafts((current) => ({
                    ...current,
                    [post.id]: appendDictation(current[post.id] || '', transcript).slice(0, 2000)
                  }))}
                />
                <Button type="button" variant="outline" className="min-h-11 touch-manipulation" onClick={() => void addComment(post.id)} disabled={!commentDrafts[post.id]?.trim() || working}><MessageCircle className="mr-2 h-4 w-4" />Comment</Button>
              </div>
            </div>
          </CardContent>
        </Card>
        );
      })}
      {!loading && visiblePostCount < postsForView.length && <Button type="button" variant="outline" className="min-h-12 w-full touch-manipulation border-indigo-200 bg-white font-semibold text-indigo-700 hover:bg-indigo-50" onClick={() => setVisiblePostCount((current) => Math.min(postsForView.length, current + 10))}>Show 10 older posts ({postsForView.length - visiblePostCount} remaining)</Button>}

      <Dialog open={Boolean(selectedMediaPost)} onOpenChange={(open) => {
        if (!open) {
          setSelectedMediaPost(null);
          setSelectedMediaLoading(false);
          setSelectedMediaError('');
        }
      }}>
        {selectedMediaPost && (
          <DialogContent className="max-h-[94dvh] w-[calc(100%-1rem)] max-w-6xl overflow-y-auto bg-slate-950 p-0 text-white">
            <DialogHeader className="border-b border-white/10 px-4 py-3 pr-12 text-left">
              <DialogTitle className="text-base text-white">{getAttachmentName(selectedMediaPost)}</DialogTitle>
              <DialogDescription className="text-slate-300">
                Shared by {selectedMediaPost.author_name} on {friendlyDate(selectedMediaPost.created_at)}
              </DialogDescription>
            </DialogHeader>
            <div className="relative flex min-h-64 items-center justify-center overflow-auto bg-black sm:min-h-96">
              {selectedMediaLoading && (
                <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-300" role="status">
                  <RefreshCw className="h-7 w-7 animate-spin" />
                  <p className="text-sm font-semibold">Opening the full-size image…</p>
                </div>
              )}
              {!selectedMediaLoading && selectedMediaError && (
                <div className="flex min-h-64 max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
                  <ImagePlus className="h-10 w-10 text-slate-400" />
                  <p className="font-bold text-white">The large preview did not load.</p>
                  <p className="text-sm text-slate-300">{selectedMediaError}</p>
                  <Button type="button" variant="secondary" className="min-h-11" onClick={() => void refreshSelectedMedia(selectedMediaPost)}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Retry Large Preview
                  </Button>
                </div>
              )}
              {!selectedMediaError && selectedMediaPost.attachment_url && (
                <img
                  src={selectedMediaPost.attachment_url}
                  alt={getAttachmentName(selectedMediaPost)}
                  className={`h-auto max-h-[72dvh] max-w-full object-contain ${selectedMediaLoading ? 'hidden' : 'block'}`}
                  onLoad={() => setSelectedMediaLoading(false)}
                  onError={() => {
                    setSelectedMediaLoading(false);
                    setSelectedMediaError('The secure image link could not be displayed. Try again or download the original file.');
                  }}
                />
              )}
            </div>
            <div className="flex flex-col gap-2 border-t border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="truncate text-sm text-slate-300">{selectedMediaPost.body}</p>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  className="min-h-11 touch-manipulation bg-indigo-500 text-white hover:bg-indigo-400"
                  onClick={() => void downloadAttachment(selectedMediaPost)}
                  disabled={downloadingPostId === selectedMediaPost.id}
                >
                  {downloadingPostId === selectedMediaPost.id
                    ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    : <Download className="mr-2 h-4 w-4" />}
                  {downloadingPostId === selectedMediaPost.id ? 'Downloading…' : 'Download Photo'}
                </Button>
                {selectedMediaPost.attachment_url && (
                  <Button asChild type="button" variant="secondary" className="min-h-11 touch-manipulation bg-white text-slate-950 hover:bg-slate-100">
                    <a href={selectedMediaPost.attachment_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open Original
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={ideaLibraryOpen} onOpenChange={setIdeaLibraryOpen}>
        <DialogContent className="max-h-[92dvh] w-[calc(100%-1rem)] max-w-5xl overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl"><BriefcaseBusiness className="h-6 w-6 text-indigo-600" /> Customer Idea Library</DialogTitle>
            <DialogDescription>Choose a real customer, match an idea to their niche, generate the working QR, and save it directly to that customer’s job.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="text-sm font-black text-slate-900" htmlFor="customer-idea-job">1. Choose the customer</label>
                <select id="customer-idea-job" value={selectedCustomerJobId} onChange={(event) => chooseCustomerJob(event.target.value)} disabled={loadingCustomerJobs} className="mt-2 min-h-12 w-full touch-manipulation rounded-md border border-slate-300 bg-white px-3 text-base">
                  {loadingCustomerJobs && <option value="">Loading customers...</option>}
                  {!loadingCustomerJobs && customerJobs.length === 0 && <option value="">No customer jobs available</option>}
                  {customerJobs.map((job) => <option key={job.id} value={job.id}>{job.customerName}{job.companyName ? ` — ${job.companyName}` : ''} · {job.quoteId}</option>)}
                </select>
                {selectedCustomerJob && <p className="mt-2 text-xs text-slate-600">Status: {selectedCustomerJob.status} · {selectedCustomerJob.customerEmail || 'No email saved'} · Detected niche: <strong>{selectedCustomerJob.inferredNiche}</strong></p>}
              </div>

              {selectedCustomerJob?.quoteId.trim().toUpperCase() === WHEELERS_TOWING_QUOTE_ID && (
                <div className="overflow-hidden rounded-xl border-2 border-red-300 bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-red-200 bg-gradient-to-r from-slate-950 via-red-950 to-slate-950 px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-red-300"><MonitorSmartphone className="h-4 w-4" /> Customer website asset</p>
                      <h3 className="mt-1 text-lg font-black">Wheeler&apos;s Towing Website App Package</h3>
                    </div>
                    <span className="w-fit rounded-full bg-emerald-300 px-3 py-1 text-xs font-black uppercase text-emerald-950">Live preview ready</span>
                  </div>
                  <div className="grid gap-4 p-4 sm:grid-cols-[minmax(12rem,0.8fr)_minmax(0,1.2fr)]">
                    <a href={WHEELERS_TOWING_PAGE_URL} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-xl border border-slate-300 bg-slate-950 shadow-sm" aria-label="Open Wheeler's Towing website preview">
                      <div className="flex h-6 items-center gap-1.5 border-b border-white/10 bg-slate-900 px-2"><span className="h-2 w-2 rounded-full bg-red-400" /><span className="h-2 w-2 rounded-full bg-amber-300" /><span className="h-2 w-2 rounded-full bg-emerald-400" /></div>
                      <div className="flex min-h-36 flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 p-4 text-center transition group-hover:scale-[1.02]">
                        <img src="/wheelers/wheelers-towing-logo.png" alt="Wheeler's Towing" className="max-h-20 max-w-[85%] object-contain" />
                        <p className="mt-3 text-xs font-black uppercase tracking-wider text-red-300">Website thumbnail placeholder</p>
                      </div>
                    </a>
                    <div className="flex flex-col justify-center">
                      <p className="text-sm leading-6 text-slate-700">Keep the website, its working QR destination, and the wrap opportunity together on Michael&apos;s customer record. Replace this placeholder with a finished site thumbnail whenever the page design changes.</p>
                      <p className="mt-2 break-all rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">{WHEELERS_TOWING_PAGE_URL}</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <Button asChild type="button" className="min-h-11 bg-slate-950 font-bold text-white hover:bg-slate-800">
                          <a href={WHEELERS_TOWING_PAGE_URL} target="_blank" rel="noreferrer"><Globe2 className="mr-2 h-4 w-4" /> Open Website</a>
                        </Button>
                        <Button type="button" variant="outline" className="min-h-11 border-red-300 font-bold text-red-800 hover:bg-red-50" onClick={() => { setIdeaDestinationUrl(WHEELERS_TOWING_PAGE_URL); setCustomerIdeaStatus('Website loaded as the working QR destination.'); }}>
                          <QrCode className="mr-2 h-4 w-4" /> Use for Website QR
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedCustomerJob && <div className="overflow-hidden rounded-xl border-2 border-amber-300 bg-amber-50">
                <div className="border-b border-amber-200 bg-amber-100 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-wider text-amber-900">2. Sales order of operations</p>
                  <p className="mt-1 text-sm font-bold text-amber-950">Stay focused. Close the main project before expanding the sale.</p>
                </div>
                <div className="grid gap-0 sm:grid-cols-3">
                  <div className="border-b border-amber-200 p-4 sm:border-b-0 sm:border-r">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-900 text-xs font-black text-white">1</span>
                    <p className="mt-2 text-xs font-black uppercase text-amber-800">Main quote first</p>
                    <p className="mt-1 text-sm font-bold text-slate-950">{selectedCustomerJob.mainProject}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">Confirm scope, decision, and next step. Do not distract from the job they already requested.</p>
                  </div>
                  <div className="border-b border-amber-200 p-4 sm:border-b-0 sm:border-r">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white">2</span>
                    <p className="mt-2 text-xs font-black uppercase text-indigo-700">Best next offer</p>
                    <p className="mt-1 text-sm font-bold text-slate-950">{visibleCustomerIdeas[0]?.title || 'Choose the strongest related idea'}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">Present one logical add-on that makes the main project work harder.</p>
                  </div>
                  <div className="p-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-600 text-xs font-black text-white">3</span>
                    <p className="mt-2 text-xs font-black uppercase text-slate-600">Save the rest for later</p>
                    <p className="mt-1 text-sm font-bold text-slate-950">Future follow-ups</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">Keep uniforms, signs, print, and giveaways visible without overwhelming the customer today.</p>
                  </div>
                </div>
              </div>}

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <label className="text-sm font-black text-slate-900" htmlFor="customer-idea-niche">3. Confirm the business niche</label>
                <select id="customer-idea-niche" value={selectedNiche} onChange={(event) => { setSelectedNiche(event.target.value); const firstIdea = getIdeasForNiche(event.target.value)[0] || CUSTOMER_IDEAS[0]; setSelectedIdeaId(firstIdea.id); }} className="mt-2 min-h-12 w-full touch-manipulation rounded-md border border-slate-300 bg-white px-3 text-base">
                  {nicheOptions.map((niche) => <option key={niche} value={niche}>{niche}</option>)}
                </select>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {visibleCustomerIdeas.map((idea) => <button key={idea.id} type="button" onClick={() => { setSelectedIdeaId(idea.id); setCustomerIdeaStatus(''); }} className={`min-h-28 touch-manipulation rounded-xl border-2 p-3 text-left transition ${selectedIdeaId === idea.id ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
                    <span className="text-xs font-black uppercase tracking-wide text-fuchsia-700">{idea.badge}</span>
                    <span className="mt-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{idea.stage}</span>
                    <span className="mt-1 block font-black text-slate-950">{idea.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600">{idea.description}</span>
                  </button>)}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <label className="text-sm font-black text-slate-900" htmlFor="customer-idea-url">4. {selectedCustomerIdea.requiresDestination ? 'Where should the QR code send people?' : 'Optional website or campaign link'}</label>
                <Input id="customer-idea-url" value={ideaDestinationUrl} onChange={(event) => { setIdeaDestinationUrl(event.target.value); setCustomerIdeaStatus(''); }} placeholder="www.customerwebsite.com, Instagram, Google review link, booking page…" inputMode="url" className="mt-2 min-h-12 text-base" />
                <p className="mt-2 text-xs text-slate-500">{selectedCustomerIdea.requiresDestination ? 'Required for this QR product. The finished code must be scan-tested before printing.' : 'This product does not require a QR code. Add a link only if it helps the rep present the opportunity.'}</p>
              </div>

              {selectedCustomerJob && <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-3 text-sm font-black text-slate-900">5. Optional customer logo or reference</p>
                <FileUpload onFilesUploaded={setIdeaReferenceFiles} quoteId={selectedCustomerJob.quoteId} acceptedTypes="image/*,.svg,.pdf" maxFiles={1} maxFileSizeMB={10} title="Add Customer Logo or Reference" showCameraButton additionalTags={['customer_idea_library', 'qr_campaign_reference', `idea_${selectedCustomerIdea.id}`]} enforceMaxFilesError />
              </div>}
            </div>

            <div className="space-y-4 lg:sticky lg:top-0 lg:self-start">
              <div className="overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-slate-950 to-indigo-950 text-white shadow-lg">
                <div className="p-4 sm:p-5">
                  <p className="text-xs font-black uppercase tracking-widest text-cyan-300">Priority {selectedCustomerIdea.priority} · {selectedCustomerIdea.stage}</p>
                  <h3 className="mt-2 text-xl font-black">{selectedCustomerIdea.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-indigo-100">{selectedCustomerIdea.description}</p>
                  <div className="mt-3 rounded-xl border border-white/15 bg-white/10 p-3 text-sm leading-6">
                    <p className="font-black text-cyan-200">Where it can work</p>
                    <p>{selectedCustomerIdea.placements}</p>
                  </div>
                  <div className="mt-3 rounded-xl border border-fuchsia-300/30 bg-fuchsia-500/15 p-3 text-sm leading-6">
                    <p className="font-black text-fuchsia-200">Rep offer</p>
                    <p>{selectedCustomerIdea.offer}</p>
                  </div>
                </div>
                <div className="border-t border-white/10 bg-white p-4 text-slate-950">
                  {generatedQrUrl ? <div className="text-center">
                    <img src={generatedQrUrl} alt={`Working QR code for ${selectedCustomerIdea.title}`} className="mx-auto aspect-square w-full max-w-64 rounded-xl border bg-white p-3" />
                    <a href={normalizedIdeaDestinationUrl || undefined} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-2 break-all text-sm font-bold text-blue-700 underline"><ExternalLink className="h-4 w-4 shrink-0" /> Test destination</a>
                  </div> : <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm text-slate-500"><QrCode className="mb-2 h-10 w-10" />{selectedCustomerIdea.requiresDestination ? 'Enter the destination link to generate the working QR preview.' : 'No QR code is required for this opportunity. Upload a logo or reference if the quote team needs one.'}</div>}
                </div>
              </div>

              <Button type="button" onClick={() => void saveIdeaToCustomerJob()} disabled={!selectedCustomerJob || (selectedCustomerIdea.requiresDestination && !normalizedIdeaDestinationUrl) || savingCustomerIdea} className="min-h-12 w-full touch-manipulation bg-emerald-600 font-black hover:bg-emerald-700">
                <Save className="mr-2 h-5 w-5" /> {savingCustomerIdea ? 'Saving to Customer...' : 'Save to Customer Job'}
              </Button>
              <Button type="button" variant="outline" onClick={shareIdeaWithStaff} disabled={!selectedCustomerJob || (selectedCustomerIdea.requiresDestination && !normalizedIdeaDestinationUrl)} className="min-h-12 w-full touch-manipulation border-indigo-300 font-black text-indigo-700">
                <Share2 className="mr-2 h-5 w-5" /> Share With Staff Instead
              </Button>
              {customerIdeaStatus && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold leading-6 text-emerald-800">{customerIdeaStatus}</p>}
              {customerIdeaError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold leading-6 text-red-700">{customerIdeaError}</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default StaffFeed;
