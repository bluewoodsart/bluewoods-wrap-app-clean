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

interface StickerDetails {
  decalType: string;
  material: string;
  width: string;
  height: string;
  unit: 'inches' | 'feet';
  quantity: string;
  surface: string;
  finish: string;
  decalText: string;
  notes: string;
}

const DECAL_TYPES = [
  'Die-Cut Decal',
  'Printed Sticker / Decal',
  'Transfer Vinyl Lettering',
  'Sticker Sheet',
  'QR Code / Review Sticker',
  'Window Decal',
  'Other / Not Sure'
];

const DECAL_MATERIALS = [
  'Permanent Outdoor Vinyl',
  'Removable Vinyl',
  'Reflective Vinyl',
  'Clear Vinyl',
  'Static Cling',
  'Perforated Window Vinyl',
  'Wall / Floor Vinyl',
  'Other / Not Sure'
];

const createQuoteId = () =>
  `decal_${Date.now()}_${Math.random().toString(36).substring(2)}`;

const StickerQuoteFlow: React.FC = () => {
  const navigate = useNavigate();
  const [quoteId] = useState(createQuoteId);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    name: '',
    businessName: '',
    email: '',
    phone: '',
    preferredContact: 'email'
  });
  const [sticker, setSticker] = useState<StickerDetails>({
    decalType: '',
    material: '',
    width: '',
    height: '',
    unit: 'inches',
    quantity: '',
    surface: '',
    finish: 'Not Sure',
    decalText: '',
    notes: ''
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const updateContact = (key: keyof ContactInfo, value: string) => {
    setContactInfo((current) => ({ ...current, [key]: value }));
  };

  const updateSticker = (key: keyof StickerDetails, value: string) => {
    setSticker((current) => ({ ...current, [key]: value }));
  };

  const validate = () => {
    if (
      !contactInfo.name.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo.email.trim()) ||
      !contactInfo.phone.trim()
    ) {
      setError('Please add a name, valid email, and phone number.');
      return false;
    }

    if (!sticker.decalType || !sticker.material) {
      setError('Please select the decal type and material. Choose “Not Sure” when needed.');
      return false;
    }

    if (!sticker.width.trim() || !sticker.height.trim() || !sticker.quantity.trim()) {
      setError('Please add the approximate width, height, and quantity.');
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
      headers: { 'Content-Type': 'application/json' },
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
      throw new Error(`Quote saved, but confirmation email failed with status ${response.status}.`);
    }
  };

  const submitStickerQuote = async () => {
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
      productType: 'decal',
      quoteType: 'sticker_decal_quote',
      intakeType: 'sticker_decal_quote',
      selectedService: 'Stickers & Decals',
      companyName: contactInfo.businessName,
      repSlug,
      uploadedFileCount: uploadedFiles.length,
      sticker
    };

    const { error: finalizeError } = await supabase.rpc('finalize_quote_request_public', {
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
      p_product_type: 'decal'
    });

    if (finalizeError) {
      console.error('Sticker and decal quote finalize failed:', finalizeError);
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
        console.error('Sticker file contact update failed:', fileContactError);
      }
    }

    try {
      await sendQuoteEmails(contactInfo, { ...quoteDetails, ...repAttribution }, uploadedFiles);
    } catch (emailError) {
      console.error('Sticker quote email failed after save:', emailError);
      setIsSubmitting(false);
      setError('Your decal quote was saved, but the confirmation email could not be sent. Please contact us directly.');
      return;
    }

    setIsSubmitting(false);
    navigate('/thank-you', { state: { customerEmail: contactInfo.email } });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <Button type="button" variant="ghost" className="mb-4 text-slate-700" onClick={() => navigate(getRepAwareBackTarget())}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className="border-pink-100 shadow-xl">
          <CardHeader>
            <p className="text-sm font-semibold uppercase tracking-wide text-pink-700">SlapWrapz by Blue Woods Brands</p>
            <CardTitle className="text-3xl text-slate-950">Sticker & Decal Quote Request</CardTitle>
            <p className="text-sm text-slate-600">
              Tell us the size, quantity, material, and where the decals will be used. Approximate details are fine.
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-950">Contact Information</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="decal-name">Name *</Label>
                  <Input id="decal-name" className="mt-2" value={contactInfo.name} onChange={(event) => updateContact('name', event.target.value)} />
                </div>
                <div>
                  <Label htmlFor="decal-business">Business Name</Label>
                  <Input id="decal-business" className="mt-2" value={contactInfo.businessName} onChange={(event) => updateContact('businessName', event.target.value)} />
                </div>
                <div>
                  <Label htmlFor="decal-phone">Phone *</Label>
                  <Input id="decal-phone" type="tel" className="mt-2" value={contactInfo.phone} onChange={(event) => updateContact('phone', event.target.value)} />
                </div>
                <div>
                  <Label htmlFor="decal-email">Email *</Label>
                  <Input id="decal-email" type="email" className="mt-2" value={contactInfo.email} onChange={(event) => updateContact('email', event.target.value)} />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-950">Sticker / Decal Details</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="decal-type">What do you need? *</Label>
                  <Select value={sticker.decalType} onValueChange={(value) => updateSticker('decalType', value)}>
                    <SelectTrigger id="decal-type" className="mt-2"><SelectValue placeholder="Choose a decal type" /></SelectTrigger>
                    <SelectContent>
                      {DECAL_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="decal-material">Material *</Label>
                  <Select value={sticker.material} onValueChange={(value) => updateSticker('material', value)}>
                    <SelectTrigger id="decal-material" className="mt-2"><SelectValue placeholder="Choose a material" /></SelectTrigger>
                    <SelectContent>
                      {DECAL_MATERIALS.map((material) => <SelectItem key={material} value={material}>{material}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                Not sure which material fits? Choose <strong>Other / Not Sure</strong> and describe the surface below.
              </p>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <div>
                  <Label htmlFor="decal-width">Width *</Label>
                  <Input id="decal-width" className="mt-2" inputMode="decimal" value={sticker.width} onChange={(event) => updateSticker('width', event.target.value)} />
                </div>
                <div>
                  <Label htmlFor="decal-height">Height *</Label>
                  <Input id="decal-height" className="mt-2" inputMode="decimal" value={sticker.height} onChange={(event) => updateSticker('height', event.target.value)} />
                </div>
                <div>
                  <Label htmlFor="decal-unit">Unit</Label>
                  <Select value={sticker.unit} onValueChange={(value) => updateSticker('unit', value)}>
                    <SelectTrigger id="decal-unit" className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inches">Inches</SelectItem>
                      <SelectItem value="feet">Feet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="decal-quantity">Quantity *</Label>
                  <Input id="decal-quantity" className="mt-2" inputMode="numeric" value={sticker.quantity} onChange={(event) => updateSticker('quantity', event.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="decal-surface">Where will it be applied?</Label>
                  <Input id="decal-surface" className="mt-2" placeholder="Truck door, window, toolbox, wall, product, etc." value={sticker.surface} onChange={(event) => updateSticker('surface', event.target.value)} />
                </div>
                <div>
                  <Label htmlFor="decal-finish">Finish</Label>
                  <Select value={sticker.finish} onValueChange={(value) => updateSticker('finish', value)}>
                    <SelectTrigger id="decal-finish" className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Gloss">Gloss</SelectItem>
                      <SelectItem value="Matte">Matte</SelectItem>
                      <SelectItem value="Laminated">Laminated for extra protection</SelectItem>
                      <SelectItem value="Not Sure">Not Sure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-950">Text, Artwork & Notes</h2>
              <div>
                <Label htmlFor="decal-text">Words or information on the decal</Label>
                <Textarea id="decal-text" className="mt-2" rows={3} placeholder="Business name, phone number, website, QR destination, lettering, or other exact wording." value={sticker.decalText} onChange={(event) => updateSticker('decalText', event.target.value)} />
              </div>
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-pink-700" />
                  <h3 className="font-semibold text-slate-950">Upload Logo, Artwork, Photo, or Reference</h3>
                </div>
                <FileUpload
                  onFilesUploaded={setUploadedFiles}
                  quoteId={quoteId}
                  acceptedTypes="image/*,.pdf,.ai,.eps,.svg,.psd"
                  maxFiles={20}
                  maxFileSizeMB={50}
                  title="Upload Sticker / Decal Files"
                  showCameraButton={false}
                  additionalTags={['sticker_decal', 'artwork']}
                  enforceMaxFilesError={true}
                />
              </div>
              <div>
                <Label htmlFor="decal-notes">Additional Notes</Label>
                <Textarea id="decal-notes" className="mt-2" rows={4} placeholder="Describe colors, shape, deadline, indoor/outdoor use, installation needs, or anything else we should know." value={sticker.notes} onChange={(event) => updateSticker('notes', event.target.value)} />
              </div>
            </section>

            {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

            <Button onClick={submitStickerQuote} disabled={isSubmitting} className="w-full bg-gradient-to-r from-pink-600 to-orange-500 text-white" size="lg">
              {isSubmitting ? 'Submitting...' : 'Submit Sticker & Decal Quote'}
              {!isSubmitting ? <CheckCircle className="ml-2 h-4 w-4" /> : null}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default StickerQuoteFlow;
