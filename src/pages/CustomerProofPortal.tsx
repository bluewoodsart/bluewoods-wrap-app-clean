import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, CreditCard, FileText, RefreshCw, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';

type ProofStatus = 'pending' | 'approved' | 'changes_requested' | 'selection_received';
type ProofMode = 'single' | 'multi';

interface ProofOption {
  id: string;
  label: string;
  sort_order: number;
  image_url: string;
}

interface ProofPortalDetails {
  valid: boolean;
  customer_first_name: string | null;
  customer_phase: string | null;
  proof_image_url: string | null;
  payment_url: string | null;
  proof_status: ProofStatus | null;
  approved_at: string | null;
  revision_requested_at: string | null;
  revision_message: string | null;
  proof_mode?: ProofMode | null;
  proof_options?: ProofOption[] | string | null;
  selected_customer_proof_option_id?: string | null;
  customer_proof_selection_message?: string | null;
  customer_proof_selected_at?: string | null;
}

const formatPhase = (phase: string | null) => {
  if (!phase) return 'In review';
  return phase
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getProofOptions = (details: ProofPortalDetails | null) => {
  if (!details?.proof_options) return [];
  if (Array.isArray(details.proof_options)) return details.proof_options;

  try {
    const parsedOptions = JSON.parse(details.proof_options);
    return Array.isArray(parsedOptions) ? parsedOptions as ProofOption[] : [];
  } catch {
    return [];
  }
};

const CustomerProofPortal = () => {
  const { token = '' } = useParams();
  const [details, setDetails] = useState<ProofPortalDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [revisionMessage, setRevisionMessage] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [selectionMessage, setSelectionMessage] = useState('');
  const [finalApproval, setFinalApproval] = useState(false);

  const loadProof = async () => {
    setLoading(true);
    setError('');

    const { data, error: proofError } = await supabase
      .rpc('get_customer_proof_portal_public', {
        p_token: token
      });

    setLoading(false);

    if (proofError) {
      console.error('Customer proof portal load failed:', proofError);
      setError('This proof link could not be checked. Please contact SlapWrapz for a fresh link.');
      return;
    }

    const nextDetails = data?.[0] as ProofPortalDetails | undefined;
    if (!nextDetails || !nextDetails.valid) {
      setDetails(nextDetails ?? null);
      setError('This proof link is invalid or no longer available.');
      return;
    }

    setDetails(nextDetails);
    setRevisionMessage(nextDetails.revision_message || '');
    setSelectedOptionId(nextDetails.selected_customer_proof_option_id || '');
    setSelectionMessage(nextDetails.customer_proof_selection_message || '');
    setFinalApproval(false);
  };

  useEffect(() => {
    void loadProof();
  }, [token]);

  const submitDecision = async (decision: 'approved' | 'changes_requested') => {
    if (saving) return;

    const trimmedRevisionMessage = revisionMessage.trim();
    if (decision === 'changes_requested' && !trimmedRevisionMessage) {
      setError('Please describe the changes you want before sending.');
      setMessage('');
      return;
    }

    setSaving(true);
    setError('');
    setMessage(decision === 'approved' ? 'Saving approval...' : 'Sending revision request...');

    const { error: actionError } = await supabase
      .rpc('submit_customer_proof_action_public', {
        p_token: token,
        p_action: decision,
        p_revision_message: decision === 'changes_requested' ? trimmedRevisionMessage : null
      });

    setSaving(false);

    if (actionError) {
      console.error('Customer proof action failed:', actionError);
      setError(actionError.message || 'We could not save your response. Please contact SlapWrapz.');
      setMessage('');
      return;
    }

    setMessage(decision === 'approved' ? 'Proof approved. Thank you.' : 'Revision request sent. Thank you.');
    await loadProof();
  };

  const submitOptionSelection = async () => {
    if (saving || !selectedOptionId) return;

    setSaving(true);
    setError('');
    setMessage(finalApproval ? 'Saving final approval...' : 'Sending selection...');

    const { error: selectionError } = await supabase
      .rpc('submit_customer_proof_option_selection_public', {
        p_token: token,
        p_option_id: selectedOptionId,
        p_selection_message: selectionMessage.trim() || null,
        p_final_approval: finalApproval
      });

    setSaving(false);

    if (selectionError) {
      console.error('Customer proof option selection failed:', selectionError);
      setError(selectionError.message || 'We could not save your selection. Please contact SlapWrapz.');
      setMessage('');
      return;
    }

    setMessage(finalApproval ? 'Final proof approval saved. Thank you.' : 'Proof option selection sent. Thank you.');
    await loadProof();
  };

  const proofStatus = details?.proof_status || 'pending';
  const isApproved = proofStatus === 'approved';
  const hasRevisionRequest = proofStatus === 'changes_requested';
  const hasSelection = proofStatus === 'selection_received';
  const proofMode = details?.proof_mode || 'single';
  const proofOptions = getProofOptions(details);
  const selectedOption = proofOptions.find((option) => option.id === details?.selected_customer_proof_option_id);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:py-10">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">SlapWrapz Proof Review</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950 sm:text-3xl">
              {details?.customer_first_name ? `${details.customer_first_name}'s Proof` : 'Customer Proof'}
            </h1>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-8 text-sm text-slate-700">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Checking proof link...
            </CardContent>
          </Card>
        ) : error && !details?.valid ? (
          <Card>
            <CardContent className="py-8">
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4" />
                  Proof link unavailable
                </div>
                <p className="mt-1">{error}</p>
              </div>
            </CardContent>
          </Card>
        ) : proofMode === 'multi' ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
            <Card>
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-blue-700" />
                  Choose Your Preferred Proof
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {proofOptions.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {proofOptions.map((option) => {
                      const isSelected = selectedOptionId === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setSelectedOptionId(option.id);
                            setError('');
                            setMessage('');
                          }}
                          className={`overflow-hidden rounded-md border bg-white text-left transition ${
                            isSelected ? 'border-blue-600 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          <img
                            src={option.image_url}
                            alt={option.label}
                            className="h-56 w-full bg-slate-100 object-contain"
                          />
                          <div className="space-y-1 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium text-slate-950">{option.label}</p>
                              {isSelected && (
                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                  Selected
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex min-h-[22rem] items-center justify-center bg-slate-100 px-6 text-center text-sm text-slate-600">
                    Proof options have not been posted yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Proof Response</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                    Proof status: {formatPhase(proofStatus)}
                  </div>
                  {hasSelection && selectedOption && (
                    <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                      Selection received: {selectedOption.label}
                    </div>
                  )}
                  {isApproved && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      Final approval sent to the SlapWrapz team.
                    </div>
                  )}
                  <Textarea
                    value={selectionMessage}
                    onChange={(event) => {
                      setSelectionMessage(event.target.value);
                      setError('');
                      setMessage('');
                    }}
                    rows={5}
                    placeholder="Notes or requested changes for the selected option."
                    disabled={saving}
                  />
                  <label className="flex gap-2 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    <Checkbox
                      checked={finalApproval}
                      onCheckedChange={(checked) => setFinalApproval(checked === true)}
                      disabled={saving}
                    />
                    <span>
                      This selected option is approved as the final proof for production.
                    </span>
                  </label>
                  <Button
                    className="w-full"
                    disabled={saving || !selectedOptionId || proofOptions.length === 0}
                    onClick={submitOptionSelection}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {saving ? 'Sending...' : finalApproval ? 'Submit Final Approval' : 'Submit Selection'}
                  </Button>
                  {message && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      {message}
                    </div>
                  )}
                  {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment</CardTitle>
                </CardHeader>
                <CardContent>
                  {details?.payment_url ? (
                    <Button asChild className="w-full">
                      <a href={details.payment_url} target="_blank" rel="noreferrer">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay Deposit / Balance
                      </a>
                    </Button>
                  ) : (
                    <p className="text-sm text-slate-600">
                      Payment link is not available yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-blue-700" />
                  Current Proof
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {details?.proof_image_url ? (
                  <a href={details.proof_image_url} target="_blank" rel="noreferrer" className="block bg-white">
                    <img
                      src={details.proof_image_url}
                      alt="Current proof"
                      className="max-h-[72vh] w-full object-contain"
                    />
                  </a>
                ) : (
                  <div className="flex min-h-[22rem] items-center justify-center bg-slate-100 px-6 text-center text-sm text-slate-600">
                    The proof image has not been posted yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Job Phase</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800">
                    {formatPhase(details?.customer_phase ?? null)}
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                    Proof status: {formatPhase(proofStatus)}
                  </div>
                  {isApproved && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      Approved and sent to the SlapWrapz team.
                    </div>
                  )}
                  {hasRevisionRequest && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      Revision request sent to the SlapWrapz team.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Proof Response</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full"
                    disabled={saving || !details?.proof_image_url}
                    onClick={() => submitDecision('approved')}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {saving ? 'Saving...' : 'Approve Proof'}
                  </Button>
                  <Textarea
                    value={revisionMessage}
                    onChange={(event) => {
                      setRevisionMessage(event.target.value);
                      setError('');
                      setMessage('');
                    }}
                    rows={5}
                    placeholder="Describe requested changes."
                    disabled={saving}
                  />
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled={saving || !details?.proof_image_url || !revisionMessage.trim()}
                    onClick={() => submitDecision('changes_requested')}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {saving ? 'Sending...' : 'Request Changes'}
                  </Button>
                  {message && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      {message}
                    </div>
                  )}
                  {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment</CardTitle>
                </CardHeader>
                <CardContent>
                  {details?.payment_url ? (
                    <Button asChild className="w-full">
                      <a href={details.payment_url} target="_blank" rel="noreferrer">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay Deposit / Balance
                      </a>
                    </Button>
                  ) : (
                    <p className="text-sm text-slate-600">
                      Payment link is not available yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default CustomerProofPortal;
