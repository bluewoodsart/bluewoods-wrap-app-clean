import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, ExternalLink, Mail, Plus, RefreshCw, Search, Users, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

interface RepOnboardingRow {
  id: string;
  email: string;
  display_name: string | null;
  role: 'sales_rep' | 'rep_manager';
  rep_slug: string | null;
  is_active: boolean;
  auth_linked: boolean;
  manager_admin_user_id: string | null;
  manager_display_name: string | null;
  rep_manager_status: string | null;
  max_child_reps: number | null;
  child_rep_count: number;
  assigned_quote_count: number;
  page_idea_count: number;
  built_page_count: number;
  latest_page_idea_at: string | null;
  created_at: string;
}

interface RepPageIdeaReviewRow {
  id: string;
  rep_slug: string;
  rep_name: string | null;
  rep_email: string | null;
  brand_name: string;
  industry: string | null;
  category: string | null;
  niche: string | null;
  page_title: string | null;
  page_slug: string | null;
  page_url: string | null;
  thumbnail_url: string | null;
  qr_png_url: string | null;
  qr_svg_url: string | null;
  status: 'pending_review' | 'approved' | 'built' | 'inactive' | 'rejected' | string;
  is_featured: boolean;
  idea_text: string;
  created_at: string;
  updated_at: string;
}

const formatRole = (role: RepOnboardingRow['role']) =>
  role === 'rep_manager' ? 'Rep Manager' : 'Sales Rep';

const formatDate = (value: string | null) => {
  if (!value) return 'No activity yet';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
};

const getRepName = (rep: RepOnboardingRow) =>
  rep.display_name?.trim() || rep.email.split('@')[0] || 'Rep';

const getRepSlug = (rep: RepOnboardingRow) =>
  rep.rep_slug?.trim().toLowerCase() || getRepName(rep).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const getRepStatusClassName = (rep: RepOnboardingRow) =>
  rep.is_active
    ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200'
    : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';

const getIdeaStatusClassName = (status: string) => {
  if (status === 'pending_review') return 'bg-amber-100 text-amber-900 ring-1 ring-amber-200';
  if (status === 'approved') return 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200';
  if (status === 'rejected') return 'bg-red-100 text-red-800 ring-1 ring-red-200';
  if (status === 'built') return 'bg-blue-100 text-blue-800 ring-1 ring-blue-200';
  return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
};

const formatStatus = (status: string) =>
  status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const RepOnboardingPromptCard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [reps, setReps] = useState<RepOnboardingRow[]>([]);
  const [selectedRepId, setSelectedRepId] = useState('');
  const [detailRepSlug, setDetailRepSlug] = useState(searchParams.get('rep') || '');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pageIdeas, setPageIdeas] = useState<RepPageIdeaReviewRow[]>([]);
  const [pageIdeaError, setPageIdeaError] = useState('');
  const [pageIdeaMessage, setPageIdeaMessage] = useState('');
  const [updatingIdeaId, setUpdatingIdeaId] = useState('');
  const [newRepName, setNewRepName] = useState('');
  const [newRepEmail, setNewRepEmail] = useState('');
  const [newRepRole, setNewRepRole] = useState<'sales_rep' | 'rep_manager'>('sales_rep');
  const [newRepSlug, setNewRepSlug] = useState('');
  const [savingRep, setSavingRep] = useState(false);
  const [repCreateMessage, setRepCreateMessage] = useState('');
  const [repCreateError, setRepCreateError] = useState('');
  const [emailingRepId, setEmailingRepId] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailError, setEmailError] = useState('');

  const loadPageIdeas = async () => {
    setPageIdeaError('');

    const { data, error } = await supabase.rpc('list_admin_rep_page_ideas_v1', {
      p_rep_slug: null
    });

    if (error) {
      setPageIdeaError(error.message);
      setPageIdeas([]);
      return;
    }

    setPageIdeas((data ?? []) as RepPageIdeaReviewRow[]);
  };

  const loadReps = async () => {
    setLoading(true);
    setLoadError('');
    setPageIdeaMessage('');

    const { data, error } = await supabase.rpc('list_rep_onboarding_directory_v1');

    setLoading(false);

    if (error) {
      setLoadError(error.message);
      setReps([]);
      return;
    }

    const nextReps = (data ?? []) as RepOnboardingRow[];
    const requestedRepSlug = searchParams.get('rep') || detailRepSlug;
    setReps(nextReps);
    setSelectedRepId((current) => {
      if (current && nextReps.some((rep) => rep.id === current)) return current;
      const requestedRep = requestedRepSlug
        ? nextReps.find((rep) => getRepSlug(rep) === requestedRepSlug)
        : null;
      if (requestedRep) return requestedRep.id;
      return nextReps.find((rep) => rep.rep_slug === 'jarrel')?.id || nextReps[0]?.id || '';
    });
    void loadPageIdeas();
  };

  useEffect(() => {
    void loadReps();
  }, []);

  const filteredReps = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return reps;

    return reps.filter((rep) =>
      [rep.display_name, rep.email, rep.role, rep.rep_slug, rep.manager_display_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [reps, search]);

  const selectedRep = reps.find((rep) => rep.id === selectedRepId) || reps[0] || null;
  const activeReps = reps.filter((rep) => rep.is_active).length;
  const managerCount = reps.filter((rep) => rep.role === 'rep_manager').length;
  const totalLeads = reps.reduce((total, rep) => total + (rep.assigned_quote_count || 0), 0);
  const selectedRepSlug = selectedRep ? getRepSlug(selectedRep) : '';
  const selectedRepIdeas = pageIdeas.filter((idea) => idea.rep_slug === selectedRepSlug);
  const selectedPendingIdeas = selectedRepIdeas.filter((idea) => idea.status === 'pending_review');
  const allPendingIdeas = pageIdeas.filter((idea) => idea.status === 'pending_review');
  const visibleIdeas = selectedPendingIdeas.length > 0 ? selectedPendingIdeas : allPendingIdeas.slice(0, 5);

  const openRepDetail = (rep: RepOnboardingRow) => {
    const repSlug = getRepSlug(rep);
    setSelectedRepId(rep.id);
    setDetailRepSlug(repSlug);
    setSearchParams({ rep: repSlug });
  };

  const closeRepDetail = () => {
    setDetailRepSlug('');
    setSearchParams({});
  };

  const updateIdeaStatus = async (idea: RepPageIdeaReviewRow, status: 'approved' | 'rejected') => {
    setUpdatingIdeaId(idea.id);
    setPageIdeaError('');
    setPageIdeaMessage('');

    const { data, error } = await supabase.rpc('update_admin_rep_page_idea_status_v1', {
      p_idea_id: idea.id,
      p_status: status
    });

    setUpdatingIdeaId('');

    if (error) {
      setPageIdeaError(error.message);
      return;
    }

    const updated = data?.[0] as { id: string; status: string; updated_at: string } | undefined;
    setPageIdeas((current) =>
      current.map((pageIdea) =>
        pageIdea.id === idea.id
          ? { ...pageIdea, status: updated?.status || status, updated_at: updated?.updated_at || new Date().toISOString() }
          : pageIdea
      )
    );
    setPageIdeaMessage(
      status === 'approved'
        ? `${idea.rep_name || idea.rep_slug}'s page idea is approved. Codex can now build it when you ask.`
        : `${idea.rep_name || idea.rep_slug}'s page idea was rejected.`
    );
  };

  const createRep = async () => {
    setSavingRep(true);
    setRepCreateError('');
    setRepCreateMessage('');

    const { data, error } = await supabase.rpc('create_admin_rep_onboarding_v1', {
      p_display_name: newRepName,
      p_email: newRepEmail,
      p_role: newRepRole,
      p_rep_slug: newRepSlug
    });

    setSavingRep(false);

    if (error) {
      setRepCreateError(error.message);
      return;
    }

    const createdRep = data?.[0] as { id?: string; rep_slug?: string } | undefined;
    setRepCreateMessage(`${newRepName.trim() || 'Rep'} is in the directory. Login is pending until the Supabase Auth user is created or linked.`);
    setNewRepName('');
    setNewRepEmail('');
    setNewRepRole('sales_rep');
    setNewRepSlug('');
    await loadReps();
    if (createdRep?.id) setSelectedRepId(createdRep.id);
  };

  const sendOnboardingEmail = async (rep: RepOnboardingRow) => {
    setEmailingRepId(rep.id);
    setEmailMessage('');
    setEmailError('');

    try {
      const response = await fetch('/api/send-rep-onboarding-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repSlug: getRepSlug(rep),
          repName: getRepName(rep),
          repEmail: rep.email
        })
      });

      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(responseBody || 'Onboarding email failed.');
      }

      setEmailMessage(`Onboarding email sent to ${getRepName(rep)}.`);
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : 'Onboarding email failed.');
    } finally {
      setEmailingRepId('');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex min-h-[20rem] items-center justify-center text-sm text-slate-600">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Loading reps from Supabase...
        </CardContent>
      </Card>
    );
  }

  if (loadError) {
    return (
        <Card>
          <CardHeader>
          <CardTitle>Reps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-red-700">{loadError}</p>
          <Button onClick={() => void loadReps()}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  if (detailRepSlug && selectedRep) {
    return (
      <div className="space-y-5">
        <Button variant="outline" onClick={closeRepDetail}>
          Back to Rep Directory
        </Button>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">Rep Admin View</p>
                <CardTitle className="mt-1 text-2xl">{getRepName(selectedRep)}</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  {formatRole(selectedRep.role)} / {getRepSlug(selectedRep)} / {selectedRep.email} / {selectedRep.is_active ? 'Active' : 'Paused'} / {selectedRep.auth_linked ? 'Login linked' : 'Login pending'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="/rep" target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Portal
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/${getRepSlug(selectedRep)}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Public Page
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void sendOnboardingEmail(selectedRep)}
                  disabled={emailingRepId === selectedRep.id}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {emailingRepId === selectedRep.id ? 'Sending...' : 'Send Onboarding Email'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {emailMessage && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                {emailMessage}
              </div>
            )}
            {emailError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                {emailError}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Leads</p>
                <p className="mt-1 text-xl font-bold text-slate-950">{selectedRep.assigned_quote_count}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Page Ideas</p>
                <p className="mt-1 text-xl font-bold text-slate-950">{selectedRep.page_idea_count}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Built Pages</p>
                <p className="mt-1 text-xl font-bold text-slate-950">{selectedRep.built_page_count}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Team</p>
                <p className="mt-1 text-xl font-bold text-slate-950">
                  {selectedRep.role === 'rep_manager'
                    ? `${selectedRep.child_rep_count}/${selectedRep.max_child_reps || 5}`
                    : selectedRep.manager_display_name || '-'}
                </p>
              </div>
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              This view is only for {getRepName(selectedRep)}. Use it to review their page ideas, public page, portal, and attribution path.
              {!selectedRep.auth_linked && (
                <span className="mt-2 block font-semibold">
                  Login pending: create this same email in Supabase Auth with a password, then link the Auth user to this rep.
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>{getRepName(selectedRep)} Page Ideas</CardTitle>
                <p className="mt-1 text-sm text-slate-600">
                  Approve or reject this rep's submitted page ideas before asking Codex to build anything live.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void loadPageIdeas()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Ideas
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {pageIdeaMessage && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                {pageIdeaMessage}
              </div>
            )}
            {pageIdeaError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                {pageIdeaError}
              </div>
            )}
            {selectedRepIdeas.length === 0 ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No page ideas have been submitted by this rep yet.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedRepIdeas.map((idea) => (
                  <div key={idea.id} className="rounded-md border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {idea.page_title || idea.category || 'Untitled page idea'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{formatDate(idea.created_at)}</p>
                      </div>
                      <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${getIdeaStatusClassName(idea.status)}`}>
                        {formatStatus(idea.status)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{idea.idea_text}</p>
                    {idea.status === 'pending_review' && (
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <Button size="sm" onClick={() => void updateIdeaStatus(idea, 'approved')} disabled={updatingIdeaId === idea.id}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void updateIdeaStatus(idea, 'rejected')} disabled={updatingIdeaId === idea.id}>
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Active reps</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{activeReps}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Rep managers</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{managerCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Assigned leads</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{totalLeads}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Rep Page Idea Approval Queue</CardTitle>
              <p className="mt-1 text-sm text-slate-600">
                This is the handoff: reps submit page ideas, Ashley reviews them here, then Codex builds only after approval.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadPageIdeas()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Ideas
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {pageIdeaMessage && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
              {pageIdeaMessage}
            </div>
          )}
          {pageIdeaError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {pageIdeaError}
            </div>
          )}
          {visibleIdeas.length === 0 ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No pending rep page ideas are waiting for approval.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {visibleIdeas.map((idea) => (
                <div key={idea.id} className="rounded-md border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {idea.page_title || idea.category || `${idea.rep_name || idea.rep_slug} page idea`}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {idea.rep_name || idea.rep_slug} / {idea.rep_email || 'No email'} / {formatDate(idea.created_at)}
                      </p>
                    </div>
                    <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${getIdeaStatusClassName(idea.status)}`}>
                      {formatStatus(idea.status)}
                    </span>
                  </div>
                  <p className="line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {idea.idea_text}
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button
                      size="sm"
                      onClick={() => void updateIdeaStatus(idea, 'approved')}
                      disabled={updatingIdeaId === idea.id}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void updateIdeaStatus(idea, 'rejected')}
                      disabled={updatingIdeaId === idea.id}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    {idea.page_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={idea.page_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Page
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="space-y-4">
            <div className="rounded-md border border-purple-200 bg-purple-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">Onboarding Reps</p>
              <h2 className="mt-2 text-xl font-bold text-slate-950">Search a rep, select them, then manage their SlapWrapz path.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Every rep stays under SlapWrapz. The directory below is the starting point for rep setup, page ideas, QR links, and lead follow-up.
              </p>
            </div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-purple-600" />
              Rep Directory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4 text-purple-600" />
                <p className="text-sm font-semibold text-slate-950">Start New Rep</p>
              </div>
              <div className="grid gap-2">
                <Input
                  value={newRepName}
                  onChange={(event) => setNewRepName(event.target.value)}
                  placeholder="Rep name"
                />
                <Input
                  value={newRepEmail}
                  onChange={(event) => setNewRepEmail(event.target.value)}
                  placeholder="Rep email"
                  type="email"
                />
                <Input
                  value={newRepSlug}
                  onChange={(event) => setNewRepSlug(event.target.value)}
                  placeholder="Page slug, like anthony"
                />
                <select
                  value={newRepRole}
                  onChange={(event) => setNewRepRole(event.target.value as 'sales_rep' | 'rep_manager')}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm text-slate-900"
                >
                  <option value="sales_rep">Sales Rep</option>
                  <option value="rep_manager">Rep Manager</option>
                </select>
                <Button onClick={() => void createRep()} disabled={savingRep}>
                  <Plus className="mr-2 h-4 w-4" />
                  {savingRep ? 'Starting Rep...' : 'Start Rep'}
                </Button>
              </div>
              {repCreateMessage && (
                <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs font-medium text-emerald-800">
                  {repCreateMessage}
                </p>
              )}
              {repCreateError && (
                <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs font-medium text-red-700">
                  {repCreateError}
                </p>
              )}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reps..."
                className="pl-9"
              />
            </div>

            <div className="max-h-[34rem] space-y-2 overflow-y-auto pr-1">
              {filteredReps.length === 0 ? (
                <p className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  No reps match that search.
                </p>
              ) : (
                filteredReps.map((rep) => {
                  const isSelected = selectedRep?.id === rep.id;
                  return (
                    <button
                      key={rep.id}
                      type="button"
                      onClick={() => {
                        openRepDetail(rep);
                      }}
                      className={`w-full rounded-md border p-3 text-left transition ${
                        isSelected
                          ? 'border-purple-300 bg-purple-50 ring-2 ring-purple-200'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">{getRepName(rep)}</p>
                          <p className="truncate text-xs text-slate-500">{rep.email}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${getRepStatusClassName(rep)}`}>
                          {rep.is_active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5">{formatRole(rep.role)}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5">/{getRepSlug(rep)}</span>
                        {!rep.auth_linked && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">Login pending</span>}
                        {isSelected && <span className="rounded-full bg-purple-600 px-2 py-0.5 font-semibold text-white">Selected</span>}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="text-lg">Selected Rep</CardTitle>
                {selectedRep && (
                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {getRepName(selectedRep)}
                  </p>
                )}
                {selectedRep && (
                  <p className="mt-1 text-xs text-slate-500">
                    {formatRole(selectedRep.role)} / {getRepSlug(selectedRep)} / {selectedRep.is_active ? 'Active' : 'Paused'} / {selectedRep.auth_linked ? 'Login linked' : 'Login pending'}
                  </p>
                )}
              </div>
              {selectedRep?.rep_slug && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/rep`} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Portal
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/${getRepSlug(selectedRep)}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Public Page
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void sendOnboardingEmail(selectedRep)}
                    disabled={emailingRepId === selectedRep.id}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    {emailingRepId === selectedRep.id ? 'Sending...' : 'Onboarding Email'}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {emailMessage && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                {emailMessage}
              </div>
            )}
            {emailError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                {emailError}
              </div>
            )}
            {selectedRep ? (
              <>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Leads</p>
                    <p className="mt-1 text-xl font-bold text-slate-950">{selectedRep.assigned_quote_count}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Page Ideas</p>
                    <p className="mt-1 text-xl font-bold text-slate-950">{selectedRep.page_idea_count}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Built Pages</p>
                    <p className="mt-1 text-xl font-bold text-slate-950">{selectedRep.built_page_count}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Team</p>
                    <p className="mt-1 text-xl font-bold text-slate-950">
                      {selectedRep.role === 'rep_manager'
                        ? `${selectedRep.child_rep_count}/${selectedRep.max_child_reps || 5}`
                        : selectedRep.manager_display_name || '-'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600 md:flex-row md:items-center md:justify-between">
                  <p>
                    Latest page idea activity: <span className="font-semibold text-slate-900">{formatDate(selectedRep.latest_page_idea_at)}</span>
                  </p>
                  <Button variant="outline" size="sm" onClick={() => void loadReps()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Reps
                  </Button>
                </div>
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                  Reps and managers create niche SlapWrapz pages. The rep path owns attribution and follow-up, not a separate customer-facing brand.
                  {!selectedRep.auth_linked && (
                    <span className="mt-2 block font-semibold">
                      Login pending: the rep is started here, but the Supabase Auth user still needs to be created or linked before they can sign in.
                    </span>
                  )}
                </div>
                {selectedRepIdeas.length > 0 && (
                  <div className="rounded-md border border-slate-200 bg-white p-4">
                    <p className="mb-3 text-sm font-semibold text-slate-950">Recent Page Ideas</p>
                    <div className="space-y-2">
                      {selectedRepIdeas.slice(0, 3).map((idea) => (
                        <div key={idea.id} className="flex flex-col gap-1 rounded-md bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{idea.page_title || idea.category || 'Untitled idea'}</p>
                            <p className="text-xs text-slate-500">{formatDate(idea.created_at)}</p>
                          </div>
                          <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${getIdeaStatusClassName(idea.status)}`}>
                            {formatStatus(idea.status)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="rounded-md border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                No reps are available yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RepOnboardingPromptCard;
