import { useEffect, useMemo, useState } from 'react';
import { Check, Clipboard, ExternalLink, Mail, RefreshCw, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';

interface RepOnboardingRow {
  id: string;
  email: string;
  display_name: string | null;
  role: 'sales_rep' | 'rep_manager';
  rep_slug: string | null;
  is_active: boolean;
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

const buildChatGptPrompt = (rep: RepOnboardingRow) => {
  const repName = getRepName(rep);
  const repSlug = getRepSlug(rep);

  return `I am working with Blue Woods Brands / SlapWrapz to build my custom rep cover page at www.slapwrapz.com/${repSlug}.

The page should say SlapWrapz first. I am the rep path behind the customer follow-up, not a separate wrap brand.

The page should mix my own taste, passions, personality, and audience with vehicle wraps, banners, business visibility, and real results.

Act like a creative director. Ask me up to 10 quick questions about:
- my personal style and interests
- colors, music, sports, cars, business, culture, or visuals I like
- what kind of customers I want to attract
- the energy I want the page to have
- what I do not want the page to look or sound like

After I answer, turn my answers into a clean creative brief for ${repName} with:
1. overall vibe
2. color direction
3. image/background ideas
4. headline ideas that still keep SlapWrapz as the brand
5. short page copy
6. words or themes to avoid
7. the kind of lead/customer this page should attract
8. anything Blue Woods Brands should know before updating my page`;
};

const buildEmailPreview = (rep: RepOnboardingRow) => {
  const repName = getRepName(rep);
  const repSlug = getRepSlug(rep);

  return `Hi ${repName},

During the exciting onboarding process of BWB Brands, we go straight to the results.

Your starter rep page is live at www.slapwrapz.com/${repSlug}. Now we want the cover page to feel more like you, while keeping SlapWrapz as the customer-facing brand.

Log into your rep portal at www.slapwrapz.com/rep and use the Prompt Your Cover Page section. You can write your idea there directly, or use the AI prompt below in ChatGPT, Claude, Gemini, or another AI tool first.

BWB reviews your direction before anything changes live. Once approved, Codex can use it to recommend the front-end update for your SlapWrapz rep page.`;
};

const getRepStatusClassName = (rep: RepOnboardingRow) =>
  rep.is_active
    ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200'
    : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';

const RepOnboardingPromptCard = () => {
  const [reps, setReps] = useState<RepOnboardingRow[]>([]);
  const [selectedRepId, setSelectedRepId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [emailMessage, setEmailMessage] = useState('');

  const loadReps = async () => {
    setLoading(true);
    setLoadError('');

    const { data, error } = await supabase.rpc('list_rep_onboarding_directory_v1');

    setLoading(false);

    if (error) {
      setLoadError(error.message);
      setReps([]);
      return;
    }

    const nextReps = (data ?? []) as RepOnboardingRow[];
    setReps(nextReps);
    setSelectedRepId((current) => {
      if (current && nextReps.some((rep) => rep.id === current)) return current;
      return nextReps.find((rep) => rep.rep_slug === 'jarrel')?.id || nextReps[0]?.id || '';
    });
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

  const fullSnippet = useMemo(() => {
    if (!selectedRep) return '';
    return `${buildEmailPreview(selectedRep)}\n\nCHATGPT PROMPT\n\n${buildChatGptPrompt(selectedRep)}`;
  }, [selectedRep]);

  const copyPrompt = async () => {
    if (!fullSnippet) return;
    await navigator.clipboard.writeText(fullSnippet);
    setCopyState('copied');
    window.setTimeout(() => setCopyState('idle'), 1800);
  };

  const sendEmail = async () => {
    if (!selectedRep) return;

    setEmailState('sending');
    setEmailMessage('');

    try {
      const response = await fetch('/api/send-rep-onboarding-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ repSlug: selectedRep.rep_slug })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof result.error === 'string' ? result.error : 'Email failed');
      }

      setEmailState('sent');
      setEmailMessage(`${getRepName(selectedRep)} was sent the cover page direction prompt.`);
    } catch (error) {
      setEmailState('error');
      setEmailMessage(error instanceof Error ? error.message : 'Email failed');
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
          <CardTitle>Rep Onboarding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-red-700">{loadError}</p>
          <Button onClick={() => void loadReps()}>Try Again</Button>
        </CardContent>
      </Card>
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

      <div className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-purple-600" />
              Rep Directory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                        setSelectedRepId(rep.id);
                        setEmailState('idle');
                        setEmailMessage('');
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
                <CardTitle>{selectedRep ? getRepName(selectedRep) : 'Select a rep'}</CardTitle>
                {selectedRep && (
                  <p className="mt-1 text-sm text-slate-500">
                    {formatRole(selectedRep.role)} / {getRepSlug(selectedRep)} / {selectedRep.is_active ? 'Active' : 'Paused'}
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
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {selectedRep ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Leads</p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">{selectedRep.assigned_quote_count}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Page Ideas</p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">{selectedRep.page_idea_count}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Built Pages</p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">{selectedRep.built_page_count}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Team</p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">
                      {selectedRep.role === 'rep_manager'
                        ? `${selectedRep.child_rep_count}/${selectedRep.max_child_reps || 5}`
                        : selectedRep.manager_display_name || '-'}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-3 text-sm leading-6 text-slate-600">
                    <p>
                      Use this selected-rep packet to onboard the rep, send the creative prompt,
                      and keep SlapWrapz as the customer-facing brand.
                    </p>
                    <p>
                      Latest page idea activity: <span className="font-semibold text-slate-900">{formatDate(selectedRep.latest_page_idea_at)}</span>
                    </p>
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
                      Reps and managers create niche SlapWrapz pages. The rep path owns attribution and follow-up, not a separate customer-facing brand.
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button onClick={sendEmail} disabled={emailState === 'sending' || !selectedRep.rep_slug}>
                        {emailState === 'sending' ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : emailState === 'sent' ? (
                          <Check className="mr-2 h-4 w-4" />
                        ) : (
                          <Mail className="mr-2 h-4 w-4" />
                        )}
                        {emailState === 'sending' ? 'Sending...' : `Email ${getRepName(selectedRep).split(' ')[0]}`}
                      </Button>
                      <Button variant="outline" onClick={copyPrompt}>
                        {copyState === 'copied' ? (
                          <Check className="mr-2 h-4 w-4" />
                        ) : (
                          <Clipboard className="mr-2 h-4 w-4" />
                        )}
                        {copyState === 'copied' ? 'Copied' : 'Copy Snippet'}
                      </Button>
                      <Button variant="outline" onClick={() => void loadReps()}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                      </Button>
                    </div>
                    {emailMessage && (
                      <p className={emailState === 'error' ? 'text-sm font-medium text-red-600' : 'text-sm font-medium text-emerald-700'}>
                        {emailMessage}
                      </p>
                    )}
                  </div>

                  <Textarea
                    readOnly
                    value={fullSnippet}
                    className="min-h-[380px] resize-y bg-slate-50 font-mono text-xs leading-5 text-slate-700"
                    aria-label="Selected rep ChatGPT prompt and onboarding email snippet"
                  />
                </div>
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
