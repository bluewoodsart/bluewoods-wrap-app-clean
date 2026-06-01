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
import ArtworkUpload from './ArtworkUpload';
import VehiclePhotoUpload from './VehiclePhotoUpload';
import VehicleTypeSelector from './VehicleTypeSelector';
import FileReviewNotice from './FileReviewNotice';
import PartialWrapSelector from './PartialWrapSelector';
import { supabase } from '@/lib/supabase';
import { CustomerData, UploadedFile } from '@/types';
import { vehicleMakes, vehicleModels, generateYears } from '@/data/vehicleData';

interface ContactInfo {
  name: string;
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
  goal: ''
});

const ShortIntakeFlow: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Partial<CustomerData>>(createInitialData);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    name: '',
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
    ...(data.vehiclePhotos ?? []),
    ...(data.logoFiles ?? [])
  ];

  const dedupeUploadedFiles = (uploadedFiles: UploadedFile[]) =>
    Array.from(
      new Map(uploadedFiles.map((file) => [file.id || file.url, file])).values()
    );

  const buildQuoteDetails = () => ({
    quoteId: data.quoteId,
    quoteType: data.quoteType,
    selectedService: data.selectedService,
    partialWrapType: data.partialWrapType,
    partialWrapDescription: data.partialWrapDescription,
    goal: data.goal,
    hasArtwork: data.hasArtwork,
    vehicleType: data.vehicleType,
    otherVehicleDescription: data.otherVehicleDescription,
    vehicleNotListed: data.vehicleNotListed,
    customVehicleDescription: data.customVehicleDescription,
    manualVehicleDescription: data.manualVehicleDescription,
    vehicle: data.vehicle,
    designComplexity: data.designComplexity,
    budget: data.budget,
    uploadedFileCount: collectUploadedFiles().length,
    intakeFlow: 'short-test'
  });

  const hasValidContact = () =>
    contactInfo.name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo.email.trim()) &&
    contactInfo.phone.trim().length > 0;

  const hasVehicleInfo = () => {
    const hasManualVehicle = (data.manualVehicleDescription || '').trim().length > 0;
    const hasDropdownVehicle = Boolean(data.vehicle?.year && data.vehicle?.make && data.vehicle?.model);

    return hasManualVehicle || hasDropdownVehicle;
  };

  const savePartialLead = async () => {
    if (!hasValidContact() || partialLeadSaved || isSavingPartial) return;

    setIsSavingPartial(true);

    const { error: partialError } = await supabase
      .from('quote_requests')
      .insert({
        quote_id: data.quoteId ?? null,
        customer_name: contactInfo.name,
        customer_email: contactInfo.email,
        customer_phone: contactInfo.phone,
        preferred_contact: contactInfo.preferredContact,
        quote_data: {
          quoteId: data.quoteId,
          quoteType: data.quoteType,
          intakeFlow: 'short-test',
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

      if (data.vehicleType === 'other' && !(data.otherVehicleDescription || '').trim()) {
        setError('Please describe the vehicle type.');
        return false;
      }

      if (!hasVehicleInfo()) {
        setError('Please select year, make, and model, or describe the vehicle manually.');
        return false;
      }
    }

    if (step === 3 && !data.selectedService) {
      setError('Please select a service type.');
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
      navigate('/');
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
      throw new Error('Quote request was saved, but email sending failed.');
    }
  };

  const saveFinalQuote = async () => {
    setError('');
    setIsSubmitting(true);

    const uploadedFiles = dedupeUploadedFiles(collectUploadedFiles());
    const quoteDetails = buildQuoteDetails();
    const finalPayload = {
      quote_id: data.quoteId ?? null,
      customer_name: contactInfo.name,
      customer_email: contactInfo.email,
      customer_phone: contactInfo.phone,
      preferred_contact: contactInfo.preferredContact,
      quote_data: quoteDetails,
      uploaded_files: uploadedFiles.map((file) => ({
        id: file.id,
        name: file.name,
        url: file.url,
        type: file.type,
        size: file.size,
        tags: file.tags
      })),
      status: 'new',
      source: TEST_FLOW_SOURCE
    };

    const { data: updatedRows, error: updateError } = partialLeadSaved
      ? await supabase
          .from('quote_requests')
          .update(finalPayload)
          .eq('quote_id', data.quoteId)
          .eq('status', 'partial_lead')
          .select('id')
      : { data: [], error: null };

    if (updateError) {
      console.error('Partial lead update failed. Saving final quote as a new row instead:', updateError);
    }

    if (updateError || !updatedRows || updatedRows.length === 0) {
      const { error: insertError } = await supabase
        .from('quote_requests')
        .insert(finalPayload);

      if (insertError) {
        console.error('Short intake quote save failed:', insertError);
        setIsSubmitting(false);
        setError(insertError.message);
        return;
      }
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
      await sendQuoteEmails(contactInfo, quoteDetails, uploadedFiles);
    } catch (emailError) {
      console.error('Quote email send failed:', emailError);
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
        <Label htmlFor="short-phone">Phone Number *</Label>
        <Input
          id="short-phone"
          type="tel"
          value={contactInfo.phone}
          onChange={(event) => setContactInfo({ ...contactInfo, phone: event.target.value })}
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
          Contact info saved for this test flow.
        </div>
      )}
    </div>
  );

  const renderVehicleStep = () => {
    const years = generateYears();
    const availableModels = data.vehicle?.make ? vehicleModels[data.vehicle.make] || [] : [];

    return (
      <div className="space-y-6">
        <VehicleTypeSelector data={data} setData={setData} />
        <div className="rounded-2xl border border-emerald-100 bg-white p-5">
          <h3 className="mb-4 text-lg font-semibold text-emerald-900">Year, Make, and Model</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="short-year">Year</Label>
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
              <Label htmlFor="short-make">Make</Label>
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
              <Label htmlFor="short-model">Model</Label>
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
            <Label htmlFor="short-manual-vehicle">Don’t see your vehicle? Describe it here</Label>
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
          'Custom Full Vehicle Wrap + Design',
          'Partial Vehicle Wraps'
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
      {data.selectedService === 'Partial Vehicle Wraps' && (
        <PartialWrapSelector data={data} setData={setData} />
      )}
    </div>
  );

  const renderUploadsStep = () => (
    <div className="space-y-6">
      <VehiclePhotoUpload data={data} setData={setData} />
      <ArtworkUpload data={data} setData={setData} />
      <FileReviewNotice data={data} setData={setData} />
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
            <p><span className="font-medium">Email:</span> {contactInfo.email}</p>
            <p><span className="font-medium">Phone:</span> {contactInfo.phone}</p>
            <p><span className="font-medium">Vehicle:</span> {vehicleText}</p>
            <p><span className="font-medium">Service:</span> {data.selectedService}</p>
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
          {isSubmitting ? 'Submitting...' : 'Submit Test Quote Request'}
        </Button>
      </div>
    );
  };

  const steps = [
    { title: 'Contact Info', icon: Mail, body: renderContactStep },
    { title: 'Vehicle Info', icon: ArrowRight, body: renderVehicleStep },
    { title: 'Service Type', icon: CheckCircle, body: renderServiceStep },
    { title: 'Uploads', icon: UploadCloud, body: renderUploadsStep },
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
                  Test Flow
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
