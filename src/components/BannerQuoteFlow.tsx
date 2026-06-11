import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import FileUpload from './FileUpload';
import { supabase } from '@/lib/supabase';
import { getStoredRepSlug } from '@/lib/repTracking';
import { getRepAttributionForSlug } from '@/lib/salesReps';
import { UploadedFile } from '@/types';

interface ContactInfo {
  name: string;
  businessName: string;
  email: string;
  phone: string;
  preferredContact: 'email';
}

interface BannerDetails {
  width: string;
  height: string;
  unit: 'inches' | 'feet';
  quantity: string;
  indoorOutdoor: string;
  sides: string;
  grommets: string;
  hemmedEdges: string;
  polePockets: string;
  materialPreference: string;
  designNeeded: string;
  bannerText: string;
  brandColors: string;
  deadline: string;
  deliveryMethod: string;
  notes: string;
}

const createQuoteId = () =>
  `banner_${Date.now()}_${Math.random().toString(36).substring(2)}`;

const BannerQuoteFlow: React.FC = () => {
  const navigate = useNavigate();
  const [quoteId] = useState(createQuoteId);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    name: '',
    businessName: '',
    email: '',
    phone: '',
    preferredContact: 'email'
  });
  const [banner, setBanner] = useState<BannerDetails>({
    width: '',
    height: '',
    unit: 'inches',
    quantity: '',
    indoorOutdoor: '',
    sides: '',
    grommets: '',
    hemmedEdges: '',
    polePockets: '',
    materialPreference: '',
    designNeeded: '',
    bannerText: '',
    brandColors: '',
    deadline: '',
    deliveryMethod: '',
    notes: ''
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const updateContact = (key: keyof ContactInfo, value: string) => {
    setContactInfo((current) => ({ ...current, [key]: value }));
  };

  const updateBanner = (key: keyof BannerDetails, value: string) => {
    setBanner((current) => ({ ...current, [key]: value }));
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

    if (!banner.width.trim() || !banner.height.trim() || !banner.quantity.trim()) {
      setError('Please add the banner width, height, and quantity.');
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

  const submitBannerQuote = async () => {
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
      productType: 'banner',
      quoteType: 'banner_quote',
      intakeType: 'banner_quote',
      selectedService: 'Banner',
      companyName: contactInfo.businessName,
      repSlug,
      uploadedFileCount: uploadedFiles.length,
      banner
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
        p_product_type: 'banner'
      });

    if (finalizeError) {
      console.error('Banner quote finalize failed:', finalizeError);
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
        console.error('Banner file contact update failed:', fileContactError);
      }
    }

    try {
      await sendQuoteEmails(contactInfo, { ...quoteDetails, ...repAttribution }, uploadedFiles);
    } catch (emailError) {
      console.error('Banner quote email send failed after quote save:', {
        error: emailError,
        quoteId,
        customerEmail: contactInfo.email,
        endpoint: '/api/send-quote-emails'
      });
      setIsSubmitting(false);
      setError('Your banner quote was saved, but the confirmation email could not be sent. Please try again or contact us directly.');
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
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className="border-blue-100 shadow-xl">
          <CardHeader>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Blue Woods Brands
            </p>
            <CardTitle className="text-3xl text-slate-950">Banner Quote Request</CardTitle>
            <p className="text-sm text-slate-600">
              Printed banner details, artwork, timing, and contact information.
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-950">Customer Info</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="banner-name">Name *</Label>
                  <Input
                    id="banner-name"
                    value={contactInfo.name}
                    onChange={(event) => updateContact('name', event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="banner-business">Business Name</Label>
                  <Input
                    id="banner-business"
                    value={contactInfo.businessName}
                    onChange={(event) => updateContact('businessName', event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="banner-phone">Phone *</Label>
                  <Input
                    id="banner-phone"
                    type="tel"
                    value={contactInfo.phone}
                    onChange={(event) => updateContact('phone', event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="banner-email">Email *</Label>
                  <Input
                    id="banner-email"
                    type="email"
                    value={contactInfo.email}
                    onChange={(event) => updateContact('email', event.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-950">Banner Specs</h2>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label htmlFor="banner-width">Width *</Label>
                  <Input
                    id="banner-width"
                    value={banner.width}
                    onChange={(event) => updateBanner('width', event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="banner-height">Height *</Label>
                  <Input
                    id="banner-height"
                    value={banner.height}
                    onChange={(event) => updateBanner('height', event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="banner-unit">Unit</Label>
                  <Select value={banner.unit} onValueChange={(value) => updateBanner('unit', value)}>
                    <SelectTrigger id="banner-unit" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inches">Inches</SelectItem>
                      <SelectItem value="feet">Feet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="banner-quantity">Quantity *</Label>
                  <Input
                    id="banner-quantity"
                    value={banner.quantity}
                    onChange={(event) => updateBanner('quantity', event.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="banner-location">Indoor or Outdoor</Label>
                  <Select value={banner.indoorOutdoor} onValueChange={(value) => updateBanner('indoorOutdoor', value)}>
                    <SelectTrigger id="banner-location" className="mt-2">
                      <SelectValue placeholder="Select one" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indoor">Indoor</SelectItem>
                      <SelectItem value="outdoor">Outdoor</SelectItem>
                      <SelectItem value="both">Both / not sure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="banner-sides">Sides</Label>
                  <Select value={banner.sides} onValueChange={(value) => updateBanner('sides', value)}>
                    <SelectTrigger id="banner-sides" className="mt-2">
                      <SelectValue placeholder="Select one" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single-sided">Single-sided</SelectItem>
                      <SelectItem value="double-sided">Double-sided</SelectItem>
                      <SelectItem value="not-sure">Not sure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ['grommets', 'Grommets'],
                  ['hemmedEdges', 'Hemmed Edges'],
                  ['polePockets', 'Pole Pockets']
                ].map(([key, label]) => (
                  <div key={key} className="rounded-lg border border-slate-200 bg-white p-4">
                    <Label className="mb-3 block">{label}</Label>
                    <RadioGroup
                      value={banner[key as keyof BannerDetails]}
                      onValueChange={(value) => updateBanner(key as keyof BannerDetails, value)}
                      className="flex gap-5"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id={`${key}-yes`} />
                        <Label htmlFor={`${key}-yes`}>Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id={`${key}-no`} />
                        <Label htmlFor={`${key}-no`}>No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                ))}
              </div>

              <div>
                <Label htmlFor="banner-material">Material Preference</Label>
                <Input
                  id="banner-material"
                  placeholder="Example: 13oz vinyl, mesh, not sure"
                  value={banner.materialPreference}
                  onChange={(event) => updateBanner('materialPreference', event.target.value)}
                  className="mt-2"
                />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-950">Artwork / Design</h2>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <Label className="mb-3 block">Need design help?</Label>
                <RadioGroup
                  value={banner.designNeeded}
                  onValueChange={(value) => updateBanner('designNeeded', value)}
                  className="grid gap-3 sm:grid-cols-3"
                >
                  {[
                    ['yes', 'Yes'],
                    ['no', 'No'],
                    ['not-sure', 'Not sure']
                  ].map(([value, label]) => (
                    <div key={value} className="flex items-center space-x-2">
                      <RadioGroupItem value={value} id={`design-${value}`} />
                      <Label htmlFor={`design-${value}`}>{label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div>
                <Label htmlFor="banner-text">Banner Text</Label>
                <Textarea
                  id="banner-text"
                  value={banner.bannerText}
                  onChange={(event) => updateBanner('bannerText', event.target.value)}
                  className="mt-2"
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="banner-colors">Brand Colors</Label>
                <Input
                  id="banner-colors"
                  value={banner.brandColors}
                  onChange={(event) => updateBanner('brandColors', event.target.value)}
                  className="mt-2"
                />
              </div>
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-blue-700" />
                  <h3 className="font-semibold text-slate-950">Upload Logo / Artwork</h3>
                </div>
                <FileUpload
                  onFilesUploaded={setUploadedFiles}
                  quoteId={quoteId}
                  acceptedTypes="image/*,.pdf,.ai,.eps,.svg,.psd"
                  maxFiles={20}
                  maxFileSizeMB={50}
                  title="Upload Banner Files"
                  showCameraButton={false}
                  additionalTags={['banner', 'artwork']}
                  enforceMaxFilesError={true}
                />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-950">Deadline / Delivery</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="banner-deadline">Needed By</Label>
                  <Input
                    id="banner-deadline"
                    type="date"
                    value={banner.deadline}
                    onChange={(event) => updateBanner('deadline', event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="banner-delivery">Pickup, Delivery, or Install Request</Label>
                  <Select value={banner.deliveryMethod} onValueChange={(value) => updateBanner('deliveryMethod', value)}>
                    <SelectTrigger id="banner-delivery" className="mt-2">
                      <SelectValue placeholder="Select one" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pickup">Pickup</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="shipping">Shipping</SelectItem>
                      <SelectItem value="install-request">Install request</SelectItem>
                      <SelectItem value="not-sure">Not sure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="banner-notes">Notes</Label>
                <Textarea
                  id="banner-notes"
                  value={banner.notes}
                  onChange={(event) => updateBanner('notes', event.target.value)}
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
              onClick={submitBannerQuote}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white"
              size="lg"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Banner Quote Request'}
              {!isSubmitting && <CheckCircle className="ml-2 h-4 w-4" />}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default BannerQuoteFlow;
