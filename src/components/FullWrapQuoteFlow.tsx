import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import FileUpload from './FileUpload';
import { supabase } from '@/lib/supabase';
import { getRepAwareBackTarget, getStoredRepSlug } from '@/lib/repTracking';
import { getRepAttributionForSlug } from '@/lib/salesReps';
import {
  bodyStyleOptions,
  budgetOptions,
  coverageAreaOptions,
  designNeedOptions,
  finishPreferenceOptions,
  timelineOptions,
  wrapTypeOptions
} from '@/lib/wrapQuoteOptions';
import { UploadedFile } from '@/types';

interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  preferredContact: 'email' | 'text' | 'call';
}

interface VehicleDetails {
  year: string;
  make: string;
  model: string;
  bodyStyle: string;
  vehicleColor: string;
}

interface WrapDetails {
  coverageAreas: string[];
  wrapType: string;
  useType: 'business' | 'personal' | 'both' | '';
  finishPreference: string;
  designNeeds: string;
  budget: string;
  timeline: string;
  measurementNotes: string;
  notes: string;
}

interface UploadGroups {
  vehiclePhotos: UploadedFile[];
  logos: UploadedFile[];
  artwork: UploadedFile[];
  measurements: UploadedFile[];
  referenceImages: UploadedFile[];
}

const ESTIMATE_LANGUAGE =
  'Estimated project range — final quote confirmed after artwork, photos, and coverage review.';

const createQuoteId = () =>
  `full_wrap_${Date.now()}_${Math.random().toString(36).substring(2)}`;

const uploadCategoryLabels: Record<keyof UploadGroups, string> = {
  vehiclePhotos: 'Vehicle photos',
  logos: 'Logos',
  artwork: 'Artwork',
  measurements: 'Measurements',
  referenceImages: 'Reference images'
};

const FullWrapQuoteFlow: React.FC = () => {
  const navigate = useNavigate();
  const [quoteId] = useState(createQuoteId);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    name: '',
    email: '',
    phone: '',
    preferredContact: 'email'
  });
  const [vehicle, setVehicle] = useState<VehicleDetails>({
    year: '',
    make: '',
    model: '',
    bodyStyle: '',
    vehicleColor: ''
  });
  const [wrapDetails, setWrapDetails] = useState<WrapDetails>({
    coverageAreas: [],
    wrapType: '',
    useType: '',
    finishPreference: '',
    designNeeds: '',
    budget: '',
    timeline: '',
    measurementNotes: '',
    notes: ''
  });
  const [uploads, setUploads] = useState<UploadGroups>({
    vehiclePhotos: [],
    logos: [],
    artwork: [],
    measurements: [],
    referenceImages: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleBack = () => {
    navigate(getRepAwareBackTarget());
  };

  const uploadedFiles = useMemo(
    () =>
      Object.values(uploads).flat().filter((file, index, allFiles) =>
        index === allFiles.findIndex((candidate) => candidate.id === file.id)
      ),
    [uploads]
  );

  const updateContact = (key: keyof ContactInfo, value: string) => {
    setContactInfo((current) => ({ ...current, [key]: value }));
  };

  const updateVehicle = (key: keyof VehicleDetails, value: string) => {
    setVehicle((current) => ({ ...current, [key]: value }));
  };

  const updateWrapDetails = (key: keyof WrapDetails, value: string | string[]) => {
    setWrapDetails((current) => ({ ...current, [key]: value }));
  };

  const toggleCoverageArea = (coverageArea: string) => {
    setWrapDetails((current) => ({
      ...current,
      coverageAreas: current.coverageAreas.includes(coverageArea)
        ? current.coverageAreas.filter((item) => item !== coverageArea)
        : [...current.coverageAreas, coverageArea]
    }));
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

    if (!vehicle.year.trim() || !vehicle.make.trim() || !vehicle.model.trim()) {
      setError('Please add the vehicle year, make, and model.');
      return false;
    }

    if (!vehicle.bodyStyle || !vehicle.vehicleColor.trim()) {
      setError('Please add the body style and vehicle color.');
      return false;
    }

    if (!wrapDetails.coverageAreas.length || !wrapDetails.wrapType || !wrapDetails.useType) {
      setError('Please select coverage areas, wrap type, and business or personal use.');
      return false;
    }

    if (!wrapDetails.finishPreference || !wrapDetails.designNeeds || !wrapDetails.budget || !wrapDetails.timeline) {
      setError('Please complete finish preference, design needs, budget, and timeline.');
      return false;
    }

    setError('');
    return true;
  };

  const updateUploadedGroup = (group: keyof UploadGroups, files: UploadedFile[]) => {
    setUploads((current) => ({ ...current, [group]: files }));
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

  const submitFullWrapQuote = async () => {
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
    const uploadCategories = Object.entries(uploads).reduce<Record<string, number>>(
      (categories, [key, files]) => ({
        ...categories,
        [key]: files.length
      }),
      {}
    );
    const quoteDetails = {
      quoteId,
      quoteType: 'full_wrap_quote',
      intakeType: 'full_wrap_quote',
      productType: 'wrap',
      selectedService: 'Full Vehicle Wrap Quote',
      vehicle,
      coverageAreas: wrapDetails.coverageAreas,
      wrapType: wrapDetails.wrapType,
      useType: wrapDetails.useType,
      designNeeds: wrapDetails.designNeeds,
      finishPreference: wrapDetails.finishPreference,
      budget: wrapDetails.budget,
      timeline: wrapDetails.timeline,
      notes: wrapDetails.notes,
      measurementNotes: wrapDetails.measurementNotes,
      uploadCategories,
      uploadedFileCount: uploadedFiles.length,
      estimateLanguage: ESTIMATE_LANGUAGE,
      repSlug
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
        p_product_type: 'wrap'
      });

    if (finalizeError) {
      console.error('Full wrap quote finalize failed:', finalizeError);
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
        console.error('Full wrap file contact update failed:', fileContactError);
      }
    }

    try {
      await sendQuoteEmails(contactInfo, { ...quoteDetails, ...repAttribution }, uploadedFiles);
    } catch (emailError) {
      console.error('Full wrap quote email send failed after quote save:', {
        error: emailError,
        quoteId,
        customerEmail: contactInfo.email,
        endpoint: '/api/send-quote-emails'
      });
      setIsSubmitting(false);
      setError('Your full wrap quote was saved, but the confirmation email could not be sent. Please try again or contact us directly.');
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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <Button
          type="button"
          variant="ghost"
          className="mb-4 text-slate-700"
          onClick={handleBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className="border-cyan-100 shadow-xl">
          <CardHeader>
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
              SlapWrapz by Blue Woods Brands
            </p>
            <CardTitle className="text-3xl text-slate-950">Full Vehicle Wrap Quote</CardTitle>
            <p className="text-sm text-slate-600">
              Complete wrap intake for serious projects with vehicle details, coverage, files, timing, and budget.
            </p>
          </CardHeader>
          <CardContent className="space-y-10">
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-950">Contact Info</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="full-wrap-name">Name *</Label>
                  <Input
                    id="full-wrap-name"
                    value={contactInfo.name}
                    onChange={(event) => updateContact('name', event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="full-wrap-email">Email *</Label>
                  <Input
                    id="full-wrap-email"
                    type="email"
                    value={contactInfo.email}
                    onChange={(event) => updateContact('email', event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="full-wrap-phone">Phone *</Label>
                  <Input
                    id="full-wrap-phone"
                    value={contactInfo.phone}
                    onChange={(event) => updateContact('phone', event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Preferred Contact *</Label>
                  <Select
                    value={contactInfo.preferredContact}
                    onValueChange={(value) => updateContact('preferredContact', value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose a contact method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="call">Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-950">Vehicle</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="full-wrap-year">Year *</Label>
                  <Input
                    id="full-wrap-year"
                    value={vehicle.year}
                    onChange={(event) => updateVehicle('year', event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="full-wrap-make">Make *</Label>
                  <Input
                    id="full-wrap-make"
                    value={vehicle.make}
                    onChange={(event) => updateVehicle('make', event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="full-wrap-model">Model *</Label>
                  <Input
                    id="full-wrap-model"
                    value={vehicle.model}
                    onChange={(event) => updateVehicle('model', event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Body Style *</Label>
                  <Select value={vehicle.bodyStyle} onValueChange={(value) => updateVehicle('bodyStyle', value)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose body style" />
                    </SelectTrigger>
                    <SelectContent>
                      {bodyStyleOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="full-wrap-color">Vehicle Color *</Label>
                  <Input
                    id="full-wrap-color"
                    value={vehicle.vehicleColor}
                    onChange={(event) => updateVehicle('vehicleColor', event.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-950">Wrap Details</h2>
              <div>
                <Label>Coverage Areas *</Label>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {coverageAreaOptions.map((coverageArea) => (
                    <label
                      key={coverageArea}
                      className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm"
                    >
                      <Checkbox
                        checked={wrapDetails.coverageAreas.includes(coverageArea)}
                        onCheckedChange={() => toggleCoverageArea(coverageArea)}
                      />
                      <span>{coverageArea}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Wrap Type *</Label>
                  <Select value={wrapDetails.wrapType} onValueChange={(value) => updateWrapDetails('wrapType', value)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose wrap type" />
                    </SelectTrigger>
                    <SelectContent>
                      {wrapTypeOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Material / Finish Preference *</Label>
                  <Select
                    value={wrapDetails.finishPreference}
                    onValueChange={(value) => updateWrapDetails('finishPreference', value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose finish" />
                    </SelectTrigger>
                    <SelectContent>
                      {finishPreferenceOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Business or Personal Use *</Label>
                <RadioGroup
                  value={wrapDetails.useType}
                  onValueChange={(value) => updateWrapDetails('useType', value)}
                  className="mt-3 grid gap-3 md:grid-cols-3"
                >
                  {[
                    ['business', 'Business'],
                    ['personal', 'Personal'],
                    ['both', 'Both']
                  ].map(([value, label]) => (
                    <label
                      key={value}
                      className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm"
                    >
                      <RadioGroupItem value={value} />
                      <span>{label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Design Needs *</Label>
                  <Select
                    value={wrapDetails.designNeeds}
                    onValueChange={(value) => updateWrapDetails('designNeeds', value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose design needs" />
                    </SelectTrigger>
                    <SelectContent>
                      {designNeedOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Budget *</Label>
                  <Select value={wrapDetails.budget} onValueChange={(value) => updateWrapDetails('budget', value)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose budget" />
                    </SelectTrigger>
                    <SelectContent>
                      {budgetOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Timeline *</Label>
                  <Select value={wrapDetails.timeline} onValueChange={(value) => updateWrapDetails('timeline', value)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose timeline" />
                    </SelectTrigger>
                    <SelectContent>
                      {timelineOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-medium text-cyan-900">
                {ESTIMATE_LANGUAGE}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="full-wrap-measurements">Measurement Notes</Label>
                  <Textarea
                    id="full-wrap-measurements"
                    value={wrapDetails.measurementNotes}
                    onChange={(event) => updateWrapDetails('measurementNotes', event.target.value)}
                    className="mt-2 min-h-28"
                    placeholder="Add measurements, panel sizes, trailer dimensions, or notes about areas to measure."
                  />
                </div>
                <div>
                  <Label htmlFor="full-wrap-notes">Notes</Label>
                  <Textarea
                    id="full-wrap-notes"
                    value={wrapDetails.notes}
                    onChange={(event) => updateWrapDetails('notes', event.target.value)}
                    className="mt-2 min-h-28"
                    placeholder="Tell us anything else that will help us quote the project."
                  />
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-cyan-100 p-3 text-cyan-700">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Uploads</h2>
                  <p className="text-sm text-slate-600">
                    Upload helpful files now. Large production files can still be requested later with a secure upload link.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <FileUpload
                  onFilesUploaded={(files) => updateUploadedGroup('vehiclePhotos', files)}
                  quoteId={quoteId}
                  acceptedTypes="image/*,.pdf"
                  maxFiles={12}
                  maxFileSizeMB={25}
                  title="Vehicle Photos"
                  additionalTags={['full_wrap_quote', 'vehicle_photo']}
                  enforceMaxFilesError={true}
                />
                <FileUpload
                  onFilesUploaded={(files) => updateUploadedGroup('logos', files)}
                  quoteId={quoteId}
                  acceptedTypes="image/*,.pdf,.ai,.eps,.svg"
                  maxFiles={8}
                  maxFileSizeMB={25}
                  title="Logos"
                  additionalTags={['full_wrap_quote', 'logo']}
                  enforceMaxFilesError={true}
                />
                <FileUpload
                  onFilesUploaded={(files) => updateUploadedGroup('artwork', files)}
                  quoteId={quoteId}
                  acceptedTypes="image/*,.pdf,.ai,.eps,.svg,.psd"
                  maxFiles={10}
                  maxFileSizeMB={25}
                  title="Artwork"
                  additionalTags={['full_wrap_quote', 'artwork']}
                  enforceMaxFilesError={true}
                />
                <FileUpload
                  onFilesUploaded={(files) => updateUploadedGroup('measurements', files)}
                  quoteId={quoteId}
                  acceptedTypes="image/*,.pdf"
                  maxFiles={8}
                  maxFileSizeMB={25}
                  title="Measurements"
                  additionalTags={['full_wrap_quote', 'measurement']}
                  enforceMaxFilesError={true}
                />
                <div className="lg:col-span-2">
                  <FileUpload
                    onFilesUploaded={(files) => updateUploadedGroup('referenceImages', files)}
                    quoteId={quoteId}
                    acceptedTypes="image/*,.pdf"
                    maxFiles={10}
                    maxFileSizeMB={25}
                    title="Reference Images"
                    additionalTags={['full_wrap_quote', 'reference_image']}
                    enforceMaxFilesError={true}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-950">Upload summary</p>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {(Object.keys(uploadCategoryLabels) as Array<keyof UploadGroups>).map((key) => (
                    <p key={key}>
                      <span className="font-medium">{uploadCategoryLabels[key]}:</span> {uploads[key].length}
                    </p>
                  ))}
                </div>
                <p className="mt-3 font-medium">Total files: {uploadedFiles.length}</p>
              </div>
            </section>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                Saves to the same SlapWrapz quote system.
              </div>
              <Button
                type="button"
                onClick={submitFullWrapQuote}
                disabled={isSubmitting}
                className="bg-cyan-700 px-6 text-white hover:bg-cyan-800"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Full Wrap Quote'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default FullWrapQuoteFlow;
