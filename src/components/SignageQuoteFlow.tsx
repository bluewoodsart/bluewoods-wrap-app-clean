import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import FileUpload from './FileUpload';
import { supabase } from '@/lib/supabase';
import { getRepAwareBackTarget, getStoredRepSlug } from '@/lib/repTracking';
import { getRepAttributionForSlug } from '@/lib/salesReps';
import { UploadedFile } from '@/types';

interface ContactInfo {
  name: string;
  businessName: string;
  email: string;
  phone: string;
  preferredContact: 'email';
}

interface SignageDetails {
  width: string;
  height: string;
  unit: 'inches' | 'feet';
  quantity: string;
  material: string;
  signText: string;
  notes: string;
}

const SIGN_MATERIALS = [
  'Coroplast',
  'Acrylic',
  'Aluminum Composite / ACM',
  'PVC',
  'Foam Board',
  'Vinyl Decal / Adhesive Sign',
  'Other / Not Sure'
];

const createQuoteId = () =>
  `sign_${Date.now()}_${Math.random().toString(36).substring(2)}`;

const SignageQuoteFlow: React.FC = () => {
  const navigate = useNavigate();
  const [quoteId] = useState(createQuoteId);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    name: '',
    businessName: '',
    email: '',
    phone: '',
    preferredContact: 'email'
  });
  const [signage, setSignage] = useState<SignageDetails>({
    width: '',
    height: '',
    unit: 'inches',
    quantity: '',
    material: '',
    signText: '',
    notes: ''
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleBack = () => {
    navigate(getRepAwareBackTarget());
  };

  const updateContact = (key: keyof ContactInfo, value: string) => {
    setContactInfo((current) => ({ ...current, [key]: value }));
  };

  const updateSignage = (key: keyof SignageDetails, value: string) => {
    setSignage((current) => ({ ...current, [key]: value }));
  };

  const hasValidContact = () =>
    contactInfo.name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo.email.trim()) &&
    contactInfo.phone.trim().length > 0;

  const validate = () => {
    if (!hasValidContact()) {
      setError('Please add a name, valid email, and phone number.');
      return false;
    }

    if (!signage.width.trim() || !signage.height.trim() || !signage.quantity.trim()) {
      setError('Please add the sign width, height, and quantity.');
      return false;
    }

    if (!signage.material) {
      setError('Please select a sign material.');
      return false;
    }

    if (!signage.signText.trim()) {
      setError('Please add the sign text or message.');
      return false;
    }

    setError('');
    return true;
  };

  const sendQuoteEmails = async (
    finalContactInfo: ContactInfo,
    quoteDetails: Record<string, unknown>,
    files: UploadedFile[]
  ) => {
    const response = await fetch('/api/send-quote-emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contactInfo: finalContactInfo,
        quoteDetails,
        uploadedFiles: files.map((file) => ({
          name: file.name,
          url: file.url,
          type: file.type,
          size: file.size
        }))
      })
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw new Error(
        `Quote request was saved, but email sending failed. Status: ${response.status}. Response: ${responseBody || 'No response body'}`
      );
    }
  };

  const submitSignageQuote = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    setError('');

    const repSlug = getStoredRepSlug();
    const repAttribution = getRepAttributionForSlug(repSlug);
    const uploadedFilePayload = uploadedFiles.map((file) => ({
      id: file.id,
      name: file.name,
      url: file.url,
      type: file.type,
      size: file.size,
      tags: file.tags
    }));
    const quoteDetails = {
      quoteId,
      productType: 'sign',
      quoteType: 'generic_signage_quote',
      intakeType: 'generic_signage_quote',
      selectedService: 'Generic Signage',
      companyName: contactInfo.businessName,
      repSlug,
      uploadedFileCount: uploadedFiles.length,
      signage
    };

    const { error: finalizeError } = await supabase
      .rpc('finalize_quote_request_public', {
        p_quote_id: quoteId,
        p_customer_name: contactInfo.name,
        p_customer_email: contactInfo.email,
        p_customer_phone: contactInfo.phone,
        p_preferred_contact: contactInfo.preferredContact,
        p_rep_slug: repAttribution.rep_slug,
        p_rep_email: repAttribution.rep_email,
        p_assigned_rep_name: repAttribution.assigned_rep_name,
        p_quote_data: quoteDetails,
        p_uploaded_files: uploadedFilePayload,
        p_product_type: 'sign'
      });

    if (finalizeError) {
      console.error('Generic signage quote finalize failed:', finalizeError);
      setIsSubmitting(false);
      setError(finalizeError.message);
      return;
    }

    if (uploadedFiles.length > 0) {
      const { error: fileContactError } = await supabase.rpc('attach_contact_to_customer_files', {
        file_ids: uploadedFiles.map((file) => file.id),
        submitted_quote_id: quoteId,
        submitted_customer_name: contactInfo.name,
        submitted_customer_email: contactInfo.email,
        submitted_customer_phone: contactInfo.phone,
        submitted_preferred_contact: contactInfo.preferredContact
      });

      if (fileContactError) {
        console.error('Generic signage file contact update failed:', fileContactError);
      }
    }

    try {
      await sendQuoteEmails(contactInfo, { ...quoteDetails, ...repAttribution }, uploadedFiles);
    } catch (emailError) {
      console.error('Generic signage quote email send failed after quote save:', {
        error: emailError,
        quoteId,
        customerEmail: contactInfo.email,
        endpoint: '/api/send-quote-emails'
      });
      setIsSubmitting(false);
      setError('Your sign quote was saved, but the confirmation email could not be sent. Please try again or contact us directly.');
      return;
    }

    setIsSubmitting(false);
    navigate('/thank-you', {
      state: {
        customerEmail: contactInfo.email
      }
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <Button
          type="button"
          variant="ghost"
          className="mb-4 text-slate-700"
          onClick={handleBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className="border-blue-100 shadow-xl">
          <CardHeader>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Blue Woods Brands
            </p>
            <CardTitle className="text-3xl text-slate-950">Generic Signage Quote Request</CardTitle>
            <p className="text-sm text-slate-600">
              Sign size, material, message, artwork, notes, and contact information.
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-950">Customer Info</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="sign-name">Name *</Label>
                  <Input
                    id="sign-name"
                    value={contactInfo.name}
                    onChange={(event) => updateContact('name', event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="sign-business">Business Name</Label>
                  <Input
                    id="sign-business"
                    value={contactInfo.businessName}
                    onChange={(event) => updateContact('businessName', event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="sign-phone">Phone *</Label>
                  <Input
                    id="sign-phone"
                    type="tel"
                    value={contactInfo.phone}
                    onChange={(event) => updateContact('phone', event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="sign-email">Email *</Label>
                  <Input
                    id="sign-email"
                    type="email"
                    value={contactInfo.email}
                    onChange={(event) => updateContact('email', event.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-950">Sign Specs</h2>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label htmlFor="sign-width">Width *</Label>
                  <Input
                    id="sign-width"
                    value={signage.width}
                    onChange={(event) => updateSignage('width', event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="sign-height">Height *</Label>
                  <Input
                    id="sign-height"
                    value={signage.height}
                    onChange={(event) => updateSignage('height', event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="sign-unit">Unit</Label>
                  <Select value={signage.unit} onValueChange={(value) => updateSignage('unit', value)}>
                    <SelectTrigger id="sign-unit" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inches">Inches</SelectItem>
                      <SelectItem value="feet">Feet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sign-quantity">Quantity *</Label>
                  <Input
                    id="sign-quantity"
                    value={signage.quantity}
                    onChange={(event) => updateSignage('quantity', event.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="sign-material">Material *</Label>
                <Select value={signage.material} onValueChange={(value) => updateSignage('material', value)}>
                  <SelectTrigger id="sign-material" className="mt-2">
                    <SelectValue placeholder="Select sign material" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIGN_MATERIALS.map((material) => (
                      <SelectItem key={material} value={material}>
                        {material}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-950">Sign Message / Artwork</h2>
              <div>
                <Label htmlFor="sign-text">Sign Text / Message *</Label>
                <Textarea
                  id="sign-text"
                  placeholder="Enter the words, phone number, website, hours, offer, or message that should appear on the sign."
                  value={signage.signText}
                  onChange={(event) => updateSignage('signText', event.target.value)}
                  className="mt-2"
                  rows={4}
                />
              </div>
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-blue-700" />
                  <h3 className="font-semibold text-slate-950">Upload Logo / Artwork / Reference Files</h3>
                </div>
                <FileUpload
                  onFilesUploaded={setUploadedFiles}
                  quoteId={quoteId}
                  acceptedTypes="image/*,.pdf,.ai,.eps,.svg,.psd"
                  maxFiles={20}
                  maxFileSizeMB={50}
                  title="Upload Sign Files"
                  showCameraButton={false}
                  additionalTags={['signage', 'artwork']}
                  enforceMaxFilesError={true}
                />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-950">Notes</h2>
              <div>
                <Label htmlFor="sign-notes">Additional Notes</Label>
                <Textarea
                  id="sign-notes"
                  placeholder="Tell us about indoor/outdoor use, install location, deadline, colors, finish, shape, or anything else we should know."
                  value={signage.notes}
                  onChange={(event) => updateSignage('notes', event.target.value)}
                  className="mt-2"
                  rows={4}
                />
              </div>
            </section>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              onClick={submitSignageQuote}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white"
              size="lg"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Sign Quote Request'}
              {!isSubmitting && <CheckCircle className="ml-2 h-4 w-4" />}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default SignageQuoteFlow;
