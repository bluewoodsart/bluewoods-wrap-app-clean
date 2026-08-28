import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, CreditCard, FileText, Maximize2, RefreshCw, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
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

interface ProofImage {
  id: string;
  image_url: string;
  original_filename: string | null;
  sort_order: number;
}

interface ProofFeedback {
  id: string;
  proof_image_id: string | null;
  image_url: string | null;
  original_filename: string | null;
  message: string;
  created_at: string;
}

interface ApprovedProposal {
  invoice_token: string;
  invoice_status: 'approved';
  invoice_data: {
    lineItems?: Array<{ quantity?: number; rate?: number }>;
    depositPercent?: number;
    projectDescription?: string;
  };
  order_number: string;
  approved_at: string | null;
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

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
    .format(Number.isFinite(value) ? value : 0);

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
  const [proofImages, setProofImages] = useState<ProofImage[]>([]);
  const [selectedProofImageId, setSelectedProofImageId] = useState('');
  const [proofFeedback, setProofFeedback] = useState<ProofFeedback[]>([]);
  const [imagePreview, setImagePreview] = useState<{ src: string; alt: string } | null>(null);
  const [approvedProposal, setApprovedProposal] = useState<ApprovedProposal | null>(null);

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
    const { data: proofImageData, error: proofImagesError } = await supabase
      .rpc('get_customer_proof_images_public', {
        p_token: token
      });

    if (proofImagesError) {
      console.error('Customer proof image set load failed:', proofImagesError);
      setProofImages([]);
    } else {
      const nextProofImages = Array.isArray(proofImageData) ? proofImageData as ProofImage[] : [];
      setProofImages(nextProofImages);
      setSelectedProofImageId((currentId) =>
        nextProofImages.some((proofImage) => proofImage.id === currentId)
          ? currentId
          : nextProofImages[0]?.id || ''
      );
    }

    const { data: proofFeedbackData, error: proofFeedbackError } = await supabase
      .rpc('get_customer_proof_feedback_public', {
        p_token: token
      });

    if (proofFeedbackError) {
      console.error('Customer proof feedback history load failed:', proofFeedbackError);
      setProofFeedback([]);
    } else {
      setProofFeedback(Array.isArray(proofFeedbackData) ? proofFeedbackData as ProofFeedback[] : []);
    }

    const { data: proposalData, error: proposalError } = await supabase
      .rpc('get_approved_quote_invoice_for_proof_public_v1', {
        p_token: token
      });

    if (proposalError) {
      console.error('Approved proposal load failed:', proposalError);
      setApprovedProposal(null);
    } else {
      setApprovedProposal((proposalData?.[0] as ApprovedProposal | undefined) || null);
    }

    setRevisionMessage('');
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

    const selectedImageSupportsFeedback =
      decision === 'changes_requested'
      && selectedProofImage
      && selectedProofImage.id !== 'legacy-current-proof';

    const { error: actionError } = selectedImageSupportsFeedback
      ? await supabase.rpc('submit_customer_proof_image_feedback_public', {
          p_token: token,
          p_proof_image_id: selectedProofImage.id,
          p_revision_message: trimmedRevisionMessage
        })
      : await supabase.rpc('submit_customer_proof_action_public', {
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

    setRevisionMessage('');
    setMessage(
      decision === 'approved'
        ? 'Proof approved. Thank you.'
        : `Change request saved for ${selectedProofImage?.original_filename || 'the selected proof image'}.`
    );
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
  const selectedPreviewOption = proofOptions.find((option) => option.id === selectedOptionId) || proofOptions[0] || null;
  const currentProofImages: ProofImage[] = proofImages.length > 0
    ? proofImages
    : details?.proof_image_url
      ? [{ id: 'legacy-current-proof', image_url: details.proof_image_url, original_filename: null, sort_order: 0 }]
      : [];
  const selectedProofImage =
    currentProofImages.find((proofImage) => proofImage.id === selectedProofImageId)
    || currentProofImages[0]
    || null;
  const proposalTotal = (approvedProposal?.invoice_data.lineItems || []).reduce(
    (sum, item) => sum + Math.max(Number(item.quantity) || 0, 0) * Math.max(Number(item.rate) || 0, 0),
    0
  );
  const proposalDepositPercent = Math.min(
    Math.max(Number(approvedProposal?.invoice_data.depositPercent) || 0, 0),
    100
  );
  const proposalDeposit = proposalTotal * proposalDepositPercent / 100;

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
          <div className="grid gap-5 lg:grid-cols-[13rem_minmax(0,1fr)_22rem] lg:items-start">
            <Card className="order-2 lg:order-1">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-blue-700" />
                  Proof Options
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {proofOptions.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    {proofOptions.map((option) => {
                      const isSelected = selectedOptionId === option.id;
                      const isPreviewed = selectedPreviewOption?.id === option.id;
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
                            isSelected || isPreviewed
                              ? 'border-blue-600 ring-2 ring-blue-100'
                              : 'border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          <img
                            src={option.image_url}
                            alt={option.label}
                            className="h-28 w-full bg-slate-100 object-contain"
                          />
                          <div className="space-y-1 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium text-slate-950">{option.label}</p>
                              {(isSelected || isPreviewed) && (
                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                  {isSelected ? 'Selected' : 'Preview'}
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

            <Card className="order-1 overflow-hidden lg:order-2">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-blue-700" />
                  {selectedPreviewOption?.label || 'Selected Proof'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {selectedPreviewOption ? (
                  <div className="flex min-h-[24rem] items-center justify-center bg-white p-3 lg:min-h-[34rem]">
                    <img
                      src={selectedPreviewOption.image_url}
                      alt={selectedPreviewOption.label}
                      className="max-h-[76vh] w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex min-h-[22rem] items-center justify-center bg-slate-100 px-6 text-center text-sm text-slate-600">
                    Proof options have not been posted yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="order-3 space-y-5">
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
                {selectedProofImage ? (
                  <div className="bg-white">
                    <button
                      type="button"
                      onClick={() => setImagePreview({
                        src: selectedProofImage.image_url,
                        alt: selectedProofImage.original_filename || 'Current proof'
                      })}
                      className="relative block w-full cursor-zoom-in bg-white"
                    >
                      <img
                        src={selectedProofImage.image_url}
                        alt={selectedProofImage.original_filename || 'Current proof'}
                        className="max-h-[72vh] w-full object-contain"
                      />
                      <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/80 p-2 text-white"><Maximize2 className="h-5 w-5" /></span>
                    </button>
                    {currentProofImages.length > 1 && (
                      <div className="border-t border-slate-200 p-3">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                          {currentProofImages.length} proof images — review every view
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                          {currentProofImages.map((proofImage, proofImageIndex) => {
                            const isCurrent = proofImage.id === selectedProofImage.id;
                            return (
                              <button
                                key={proofImage.id}
                                type="button"
                                onClick={() => {
                                  setSelectedProofImageId(proofImage.id);
                                  setRevisionMessage('');
                                  setError('');
                                  setMessage('');
                                }}
                                className={`overflow-hidden rounded-md border bg-white text-left transition ${
                                  isCurrent
                                    ? 'border-blue-600 ring-2 ring-blue-100'
                                    : 'border-slate-200 hover:border-blue-300'
                                }`}
                              >
                                <img
                                  src={proofImage.image_url}
                                  alt={proofImage.original_filename || `Proof image ${proofImageIndex + 1}`}
                                  className="h-24 w-full bg-slate-100 object-contain"
                                />
                                <span className="block truncate px-2 py-1.5 text-xs text-slate-700">
                                  {proofImage.original_filename || `View ${proofImageIndex + 1}`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
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
                  {selectedProofImage && (
                    <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                      Comment applies to: <span className="font-medium">{selectedProofImage.original_filename || 'selected proof image'}</span>
                    </div>
                  )}
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
                    disabled={saving || currentProofImages.length === 0}
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
                    disabled={saving || !selectedProofImage || !revisionMessage.trim()}
                    onClick={() => submitDecision('changes_requested')}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {saving ? 'Sending...' : 'Request Changes'}
                  </Button>
                  {proofFeedback.length > 0 && (
                    <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-600">Submitted change requests</p>
                      {proofFeedback.map((feedback) => (
                        <div key={feedback.id} className="rounded-md border border-slate-200 bg-white p-2.5">
                          <p className="text-xs font-medium text-slate-700">
                            {feedback.original_filename || 'Proof image'}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{feedback.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
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

        {!loading && details?.valid && (
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-blue-700" />
                Proposal / Invoice
              </CardTitle>
            </CardHeader>
            <CardContent>
              {approvedProposal ? (
                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-950">
                      {approvedProposal.invoice_data.projectDescription || `Proposal ${approvedProposal.order_number}`}
                    </p>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-700">
                      <span>Total: <strong>{formatMoney(proposalTotal)}</strong></span>
                      {proposalDepositPercent > 0 && (
                        <span>{proposalDepositPercent}% deposit: <strong>{formatMoney(proposalDeposit)}</strong></span>
                      )}
                    </div>
                  </div>
                  <Button asChild>
                    <a href={`/invoice/${approvedProposal.invoice_token}`}>
                      Review Official Proposal
                    </a>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  Proposal pricing has not been approved yet. It will appear here after SlapWrapz completes and approves the invoice.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <Dialog open={Boolean(imagePreview)} onOpenChange={(open) => !open && setImagePreview(null)}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-6xl overflow-y-auto bg-slate-950 p-2 sm:p-4">
          <DialogTitle className="sr-only">{imagePreview?.alt || 'Proof image preview'}</DialogTitle>
          <DialogDescription className="sr-only">Close this preview to return to the proof at the same position.</DialogDescription>
          <Button type="button" size="icon" variant="secondary" className="absolute right-3 top-3 z-10" onClick={() => setImagePreview(null)} aria-label="Close image preview"><X className="h-5 w-5" /></Button>
          {imagePreview && <img src={imagePreview.src} alt={imagePreview.alt} className="max-h-[calc(100dvh-3rem)] w-full object-contain" />}
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default CustomerProofPortal;
