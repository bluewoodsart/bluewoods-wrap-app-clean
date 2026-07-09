import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, Mail, UploadCloud } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import FileUpload from './FileUpload';
import { supabase } from '@/lib/supabase';
import { CustomerData, UploadedFile } from '@/types';
import { vehicleMakes, vehicleModels, generateYears } from '@/data/vehicleData';
import { getRepAwareBackTarget, getStoredRepSlug } from '@/lib/repTracking';
import { getRepAttributionForSlug } from '@/lib/salesReps';

interface ContactInfo {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  preferredContact: 'email' | 'text' | 'call';
}

const TEST_FLOW_SOURCE = 'bluewoods-wrap-app';

const createInitialData = (): Partial<CustomerData> => ({
  quoteId: `short_test_${Date.now()}_${Math.random().toString(36).substring(2)}`,
  services: [],
  vehicle: { year: '', make: '', model: '' },
  quoteType: 'short-intake-test',
  intakeType: 'quick_quote',
  repSlug: getStoredRepSlug(),
  goal: ''
});

const ShortIntakeFlow: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Partial<CustomerData>>(createInitialData);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    preferredContact: 'email'
  });
  const [partialLeadSaved, setPartialLeadSaved] = useState(false);
  const [isSavingPartial, setIsSavingPartial] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const totalSteps = 6;

  const collectUploadedFiles = (): UploadedFile[] => [
    ...(data.uploadedFiles ?? []),
    ...(data.artworkFiles ?? []),
    ...(data.logoFiles ?? [])
  ];

  const dedupeUploadedFiles = (uploadedFiles: UploadedFile[]) =>
    Array.from(
      new Map(uploadedFiles.map((file) => [file.id || file.url, file])).values()
    );

  const buildQuoteDetails = () => ({
    quoteId: data.quoteId,
    quoteType: data.quoteType,
    intakeType: 'quick_quote',
    companyName: contactInfo.companyName,
    repSlug: data.repSlug || getStoredRepSlug(),
    selectedService: data.selectedService,
    goal: data.goal,
    hasArtwork: data.hasArtwork,
    artworkStatus: data.hasArtwork,
    vehicleType: data.vehicleType,
    manualVehicleDescription: data.manualVehicleDescription,
    vehicle: data.vehicle,
    budget: data.budget,
    uploadedFileCount: collectUploadedFiles().length,
    intakeFlow: 'quick_quote'
  });

  const hasValidContact = () =>
    contactInfo.name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo.email.trim()) &&
    contactInfo.phone.trim().length > 0;

  const savePartialLead = async () => {
    if (!hasValidContact() || partialLeadSaved || isSavingPartial) return;

    setIsSavingPartial(true);
    const repAttribution = getRepAttributionForSlug(data.repSlug || getStoredRepSlug());

    const { error: partialError } = await supabase
      .from('quote_requests')
      .insert({
        quote_id: data.quoteId ?? null,
        ...repAttribution,
        customer_name: contactInfo.name,
        customer_email: contactInfo.email,
        customer_phone: contactInfo.phone,
        preferred_contact: contactInfo.preferredContact,
        quote_data: {
          quoteId: data.quoteId,
          quoteType: data.quoteType,
          intakeType: 'quick_quote',
          intakeFlow: 'quick_quote',
          companyName: contactInfo.companyName,
          partialLeadStage: 'contact-info'
        },
        uploaded_files: [],
        status: 'partial_lead',
        source: TEST_FLOW_SOURCE
      });

    setIsSavingPartial(false);

    if (partialError) {
      console.error('Partial lead save failed:', partialError);
      return;
    }

    setPartialLeadSaved(true);
  };

  const validateStep = () => {
    if (step === 1 && !hasValidContact()) {
      setError('Please add a name, valid email, and phone number.');
      return false;
    }

    if (step === 2) {
      if (!data.vehicleType) {
        setError('Please select a vehicle type.');
        return false;
      }
    }

    if (step === 3 && !data.selectedService) {
      setError('Please select the service requested.');
      return false;
    }

    if (step === 4 && !data.hasArtwork) {
      setError('Please select your artwork status.');
      return false;
    }

    if (step === 5 && !data.budget) {
      setError('Please select a budget range.');
      return false;
    }

    setError('');
    return true;
  };

  const handleNext = async () => {
    if (!validateStep()) return;

    if (step === 1) {
      await savePartialLead();
    }

    setStep((current) => Math.min(current + 1, totalSteps));
  };

  const handleBack = () => {
    if (step === 1) {
      navigate(getRepAwareBackTarget());
      return;
    }

    setStep((current) => current - 1);
  };

  const sendQuoteEmails = async (
    finalContactInfo: ContactInfo,
    quoteDetails: ReturnType<typeof buildQuoteDetails>,
    uploadedFiles: UploadedFile[]
  ) => {
    const response = await fetch('/api/send-quote-emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contactInfo: finalContactInfo,
        quoteDetails,
        uploadedFiles: uploadedFiles.map((file) => ({
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

  const saveFinalQuote = async () => {
    setError('');
    setIsSubmitting(true);

    const uploadedFiles = dedupeUploadedFiles(collectUploadedFiles());
    const quoteDetails = buildQuoteDetails();
    const repAttribution = getRepAttributionForSlug(quoteDetails.repSlug);
    const uploadedFilePayload = uploadedFiles.map((file) => ({
      id: file.id,
      name: file.name,
      url: file.url,
      type: file.type,
      size: file.size,
      tags: file.tags
    }));

    const { error: finalizeError } = await supabase
      .rpc('finalize_quote_request_public', {
        p_quote_id: data.quoteId ?? '',
        p_customer_name: contactInfo.name,
        p_customer_email: contactInfo.email,
        p_customer_phone: contactInfo.phone,
        p_preferred_contact: contactInfo.preferredContact,
        p_rep_slug: repAttribution.rep_slug,
        p_rep_email: repAttribution.rep_email,
        p_assigned_rep_name: repAttribution.assigned_rep_name,
        p_quote_data: quoteDetails,
        p_uploaded_files: uploadedFilePayload
      });

    if (finalizeError) {
      console.error('Short intake quote finalize failed:', finalizeError);
      setIsSubmitting(false);
      setError(finalizeError.message);
      return;
    }

    if (uploadedFiles.length > 0) {
      const { error: fileContactError } = await supabase.rpc('attach_contact_to_customer_files', {
        file_ids: uploadedFiles.map((file) => file.id),
        submitted_quote_id: data.quoteId ?? null,
        submitted_customer_name: contactInfo.name,
        submitted_customer_email: contactInfo.email,
        submitted_customer_phone: contactInfo.phone,
        submitted_preferred_contact: contactInfo.preferredContact
      });

      if (fileContactError) {
        console.error('File contact update failed:', fileContactError);
      }
    }

    try {
      await sendQuoteEmails(contactInfo, { ...quoteDetails, ...repAttribution }, uploadedFiles);
    } catch (emailError) {
      console.error('Quote email send failed after quote save:', {
        error: emailError,
        quoteId: data.quoteId,
        customerEmail: contactInfo.email,
        endpoint: '/api/send-quote-emails',
        localTestingNote: 'Use npx vercel dev for local API function testing; npm run dev only starts Vite.'
      });
      setIsSubmitting(false);
      setError('Your quote was saved, but the confirmation email could not be sent. Please try again or contact us directly.');
      return;
    }

    setIsSubmitting(false);
    navigate('/thank-you', {
      state: {
        customerEmail: contactInfo.email
      }
    });
  };

  const renderContactStep = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="short-name">Name *</Label>
        <Input
          id="short-name"
          value={contactInfo.name}
          onChange={(event) => setContactInfo({ ...contactInfo, name: event.target.value })}
          className="mt-2"
        />
      </div>
      <div>
        <Label htmlFor="short-company">Company Name <span className="text-slate-500">(optional)</span></Label>
        <Input
          id="short-company"
          value={contactInfo.companyName}
          onChange={(event) => setContactInfo({ ...contactInfo, companyName: event.target.value })}
          className="mt-2"
        />
      </div>
      <div>
        <Label htmlFor="short-phone">Phone *</Label>
        <Input
          id="short-phone"
          type="tel"
          value={contactInfo.phone}
          onChange={(event) => setContactInfo({ ...contactInfo, phone: event.target.value })}
          className="mt-2"
        />
      </div>
      <div>
        <Label htmlFor="short-email">Email *</Label>
        <Input
          id="short-email"
          type="email"
          value={contactInfo.email}
          onChange={(event) => setContactInfo({ ...contactInfo, email: event.target.value })}
          className="mt-2"
        />
      </div>
      <div>
        <Label className="mb-3 block">Preferred Contact Method</Label>
        <RadioGroup
          value={contactInfo.preferredContact}
          onValueChange={(value) =>
            setContactInfo({ ...contactInfo, preferredContact: value as ContactInfo['preferredContact'] })
          }
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="email" id="short-email-contact" />
            <Label htmlFor="short-email-contact">Email</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="text" id="short-text-contact" />
            <Label htmlFor="short-text-contact">Text Message</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="call" id="short-call-contact" />
            <Label htmlFor="short-call-contact">Phone Call</Label>
          </div>
        </RadioGroup>
      </div>
      {partialLeadSaved && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Contact info saved for this quick quote.
        </div>
      )}
    </div>
  );

  const renderVehicleStep = () => {
    const years = generateYears();
    const availableModels = data.vehicle?.make ? vehicleModels[data.vehicle.make] || [] : [];

    return (
      <div className="space-y-6">
        <div>
          <Label htmlFor="short-vehicle-type">Vehicle Type *</Label>
          <Select
            value={data.vehicleType || ''}
            onValueChange={(value) => setData({ ...data, vehicleType: value })}
          >
            <SelectTrigger id="short-vehicle-type" className="mt-2">
              <SelectValue placeholder="Select vehicle type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="car">Car</SelectItem>
              <SelectItem value="truck">Truck</SelectItem>
              <SelectItem value="van">Van</SelectItem>
              <SelectItem value="suv">SUV</SelectItem>
              <SelectItem value="trailer">Trailer</SelectItem>
              <SelectItem value="boat">Boat</SelectItem>
              <SelectItem value="fleet">Fleet / Multiple Vehicles</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white p-5">
          <h3 className="mb-4 text-lg font-semibold text-emerald-900">Vehicle Details</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="short-year">Year <span className="text-slate-500">(optional)</span></Label>
              <Select
                value={data.vehicle?.year || ''}
                onValueChange={(value) => setData({ ...data, vehicle: { ...data.vehicle, year: value } })}
              >
                <SelectTrigger id="short-year" className="mt-2">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="short-make">Make <span className="text-slate-500">(optional)</span></Label>
              <Select
                value={data.vehicle?.make || ''}
                onValueChange={(value) => setData({ ...data, vehicle: { ...data.vehicle, make: value, model: '' } })}
              >
                <SelectTrigger id="short-make" className="mt-2">
                  <SelectValue placeholder="Select make" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {vehicleMakes.map((make) => (
                    <SelectItem key={make} value={make}>{make}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="short-model">Model <span className="text-slate-500">(optional)</span></Label>
              <Select
                value={data.vehicle?.model || ''}
                onValueChange={(value) => setData({ ...data, vehicle: { ...data.vehicle, model: value } })}
                disabled={!data.vehicle?.make}
              >
                <SelectTrigger id="short-model" className="mt-2">
                  <SelectValue placeholder={data.vehicle?.make ? 'Select model' : 'Select make first'} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {availableModels.map((model) => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4">
            <Label htmlFor="short-manual-vehicle">Manual vehicle description</Label>
            <Textarea
              id="short-manual-vehicle"
              placeholder="Example: 2007 Nissan Armada, 2019 Mercedes Sprinter 170 EXT, food truck, box truck, trailer, etc."
              value={data.manualVehicleDescription || ''}
              onChange={(event) => setData({ ...data, manualVehicleDescription: event.target.value })}
              className="mt-2"
              rows={3}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderServiceStep = () => (
    <div className="space-y-5">
      <RadioGroup
        value={data.selectedService || ''}
        onValueChange={(value) => setData({ ...data, selectedService: value })}
        className="space-y-3"
      >
        {[
          'Full Wrap',
          'Partial Wrap',
          'Commercial Fleet Graphics',
          'Color Change',
          'Trailer Wrap',
          'Boat Wrap',
          'Other'
        ].map((service) => (
          <div key={service} className="rounded-lg border p-4">
            <div className="flex items-center space-x-3">
              <RadioGroupItem value={service} id={`short-${service}`} />
              <Label htmlFor={`short-${service}`} className="cursor-pointer font-medium">
                {service}
              </Label>
            </div>
          </div>
        ))}
      </RadioGroup>
    </div>
  );

  const renderUploadsStep = () => (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-100 bg-white p-5">
        <h3 className="text-lg font-semibold text-slate-900">Do You Already Have Wrap Artwork?</h3>
        <RadioGroup
          value={data.hasArtwork || ''}
          onValueChange={(value) => setData({ ...data, hasArtwork: value })}
          className="mt-4 space-y-3"
        >
          {[
            {
              value: 'yes',
              title: 'Yes, I have my own artwork',
              description: "We'll review it and confirm it fits your vehicle."
            },
            {
              value: 'no',
              title: 'No, I need help designing it',
              description: 'Design fees may apply depending on project complexity.'
            },
            {
              value: 'not_sure',
              title: 'Not sure',
              description: "We'll review your project and recommend the best option."
            }
          ].map((option) => (
            <div key={option.value} className="rounded-lg border p-4">
              <div className="flex items-start space-x-3">
                <RadioGroupItem value={option.value} id={`short-artwork-${option.value}`} className="mt-1" />
                <Label htmlFor={`short-artwork-${option.value}`} className="cursor-pointer">
                  <span className="block font-medium text-slate-900">{option.title}</span>
                  <span className="mt-1 block text-sm text-slate-600">{option.description}</span>
                </Label>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
        <h3 className="text-lg font-semibold text-slate-900">Optional File Upload</h3>
        <p className="mt-2 text-sm text-slate-600">Upload anything helpful:</p>
        <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          {[
            'Logos',
            'Artwork',
            'AI-generated concepts',
            'Screenshots',
            'Mockups',
            'Inspiration images',
            'PDFs'
          ].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              {item}
            </div>
          ))}
        </div>
        <div className="mt-5">
          <FileUpload
            onFilesUploaded={(files) => setData({ ...data, uploadedFiles: files })}
            quoteId={data.quoteId}
            acceptedTypes="image/*,.pdf,.ai,.eps,.svg,.psd"
            maxFiles={10}
            maxFileSizeMB={50}
            title="Upload Optional Files"
            showCameraButton={false}
            additionalTags={['quick_quote_optional_file']}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="mt-5 w-full border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
          onClick={() => {
            if (!data.hasArtwork) {
              setError('Please select your artwork status.');
              return;
            }

            setError('');
            setStep(5);
          }}
        >
          Skip Uploads and Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderBudgetNotesStep = () => (
    <div className="space-y-5">
      <div>
        <Label htmlFor="short-budget">Budget range *</Label>
        <Select value={data.budget || ''} onValueChange={(value) => setData({ ...data, budget: value })}>
          <SelectTrigger id="short-budget" className="mt-2">
            <SelectValue placeholder="Select your budget range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="under-1000">Under $1,000</SelectItem>
            <SelectItem value="1000-2000">$1,000 - $2,000</SelectItem>
            <SelectItem value="2000-3000">$2,000 - $3,000</SelectItem>
            <SelectItem value="3000-4000">$3,000 - $4,000</SelectItem>
            <SelectItem value="4000-5000">$4,000 - $5,000</SelectItem>
            <SelectItem value="5000-6000">$5,000 - $6,000</SelectItem>
            <SelectItem value="6000-7000">$6,000 - $7,000</SelectItem>
            <SelectItem value="7000-8000">$7,000 - $8,000</SelectItem>
            <SelectItem value="8000-9000">$8,000 - $9,000</SelectItem>
            <SelectItem value="9000-10000">$9,000 - $10,000</SelectItem>
            <SelectItem value="10000-plus">$10,000+</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="short-goal">Project notes</Label>
        <Textarea
          id="short-goal"
          placeholder="Tell us what you want wrapped, any deadline, brand colors, or special instructions."
          value={data.goal || ''}
          onChange={(event) => setData({ ...data, goal: event.target.value })}
          className="mt-2"
          rows={4}
        />
      </div>
    </div>
  );

  const renderSubmitStep = () => {
    const uploadedFiles = dedupeUploadedFiles(collectUploadedFiles());
    const vehicleText = [
      data.vehicle?.year,
      data.vehicle?.make,
      data.vehicle?.model
    ].filter(Boolean).join(' ') || data.manualVehicleDescription || 'Not provided';

    return (
      <div className="space-y-5">
        <div className="rounded-xl border bg-slate-50 p-4">
          <h3 className="mb-3 font-semibold text-slate-900">Review</h3>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <p><span className="font-medium">Customer:</span> {contactInfo.name}</p>
            {contactInfo.companyName && (
              <p><span className="font-medium">Company:</span> {contactInfo.companyName}</p>
            )}
            <p><span className="font-medium">Email:</span> {contactInfo.email}</p>
            <p><span className="font-medium">Phone:</span> {contactInfo.phone}</p>
            <p><span className="font-medium">Vehicle:</span> {vehicleText}</p>
            <p><span className="font-medium">Service:</span> {data.selectedService}</p>
            <p><span className="font-medium">Artwork:</span> {data.hasArtwork}</p>
            <p><span className="font-medium">Budget:</span> {data.budget}</p>
            <p><span className="font-medium">Files:</span> {uploadedFiles.length}</p>
          </div>
        </div>
        <Button
          onClick={saveFinalQuote}
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white"
          size="lg"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Quick Quote Request'}
        </Button>
      </div>
    );
  };

  const steps = [
    { title: 'Contact Info', icon: Mail, body: renderContactStep },
    { title: 'Vehicle Info', icon: ArrowRight, body: renderVehicleStep },
    { title: 'Service Requested', icon: CheckCircle, body: renderServiceStep },
    { title: 'Artwork Status', icon: UploadCloud, body: renderUploadsStep },
    { title: 'Budget / Notes', icon: ArrowRight, body: renderBudgetNotesStep },
    { title: 'Submit', icon: CheckCircle, body: renderSubmitStep }
  ];
  const activeStep = steps[step - 1];
  const ActiveIcon = activeStep.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-3 md:p-6">
      <div className="mx-auto max-w-3xl">
        <Card className="border-blue-100 shadow-xl">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                  Quick Quote
                </p>
                <CardTitle className="mt-1 flex items-center gap-2 text-2xl">
                  <ActiveIcon className="h-5 w-5 text-blue-600" />
                  {activeStep.title}
                </CardTitle>
              </div>
              <div className="text-right text-sm text-slate-500">
                Step {step} of {totalSteps}
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {activeStep.body()}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {step < totalSteps && (
              <div className="flex justify-between gap-3 pt-2">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={handleNext} disabled={isSavingPartial}>
                  {isSavingPartial ? 'Saving...' : 'Next'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShortIntakeFlow;
