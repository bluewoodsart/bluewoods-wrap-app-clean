import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Phone } from 'lucide-react';
import LeafletMap from './LeafletMap';
import ContactInfoForm from './ContactInfoForm';
import { supabase } from '@/lib/supabase';
import { CustomerData, UploadedFile } from '@/types';

interface Shop {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  services: string[];
  distance?: string;
}

interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  preferredContact: 'email' | 'text' | 'call';
}

interface LocalShopMapProps {
  customerData?: Partial<CustomerData>;
  onEmailQuote: () => void;
  onPhoneQuote: () => void;
  onFinalConfirmation?: () => void;
}

const BLUE_WOODS_HQ: Shop = {
  id: 1,
  name: 'Blue Woods Brands Headquarters',
  address: '305 Etowah Trace, Suite 106, Fayetteville, GA 30214',
  lat: 33.5055,
  lng: -84.4331,
  services: [
    'Vehicle wraps',
    'Print-ready artwork review',
    'AI artwork cleanup',
    'Large-format printing'
  ]
};

const LocalShopMap: React.FC<LocalShopMapProps> = ({
  customerData,
  onFinalConfirmation
}) => {
  const [showContactForm, setShowContactForm] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const collectUploadedFiles = (): UploadedFile[] => {
    return [
      ...(customerData?.uploadedFiles ?? []),
      ...(customerData?.artworkFiles ?? []),
      ...(customerData?.vehiclePhotos ?? []),
      ...(customerData?.logoFiles ?? [])
    ];
  };

  const buildQuoteDetails = () => ({
    quoteId: customerData?.quoteId,
    quoteType: customerData?.quoteType,
    selectedService: customerData?.selectedService,
    partialWrapType: customerData?.partialWrapType,
    partialWrapDescription: customerData?.partialWrapDescription,
    goal: customerData?.goal,
    hasArtwork: customerData?.hasArtwork,
    vehicleType: customerData?.vehicleType,
    otherVehicleDescription: customerData?.otherVehicleDescription,
    vehicleNotListed: customerData?.vehicleNotListed,
    customVehicleDescription: customerData?.customVehicleDescription,
    vehicle: customerData?.vehicle,
    designComplexity: customerData?.designComplexity,
    budget: customerData?.budget,
    uploadedFileCount: collectUploadedFiles().length
  });

  const handleContactSubmit = async (contactInfo: ContactInfo) => {
    setSubmitError('');
    const uploadedFiles = collectUploadedFiles();

    const { error } = await supabase
      .from('quote_requests')
      .insert({
        quote_id: customerData?.quoteId ?? null,
        customer_name: contactInfo.name,
        customer_email: contactInfo.email,
        customer_phone: contactInfo.phone,
        preferred_contact: contactInfo.preferredContact,
        quote_data: buildQuoteDetails(),
        uploaded_files: uploadedFiles.map((file) => ({
          id: file.id,
          name: file.name,
          url: file.url,
          type: file.type,
          size: file.size,
          tags: file.tags
        })),
        status: 'new',
        source: 'bluewoods-wrap-app'
      });

    if (error) {
      console.error('Quote request save failed:', error);
      setSubmitError(error.message);
      throw error;
    }

    if (uploadedFiles.length > 0) {
      const { error: fileContactError } = await supabase.rpc('attach_contact_to_customer_files', {
        file_ids: uploadedFiles.map((file) => file.id),
        submitted_quote_id: customerData?.quoteId ?? null,
        submitted_customer_name: contactInfo.name,
        submitted_customer_email: contactInfo.email,
        submitted_customer_phone: contactInfo.phone,
        submitted_preferred_contact: contactInfo.preferredContact
      });

      if (fileContactError) {
        console.error('File contact update failed:', fileContactError);
      }
    }

    onFinalConfirmation?.();
  };

  if (showContactForm) {
    return (
      <ContactInfoForm
        onSubmit={handleContactSubmit}
        onBack={() => setShowContactForm(false)}
        actionType="email"
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Quote Review & Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-gray-700">
            Your request is being processed by Blue Woods Brands headquarters in Fayetteville. Bringing Brands to Life.
          </p>

          <LeafletMap
            shops={[BLUE_WOODS_HQ]}
            center={[BLUE_WOODS_HQ.lat, BLUE_WOODS_HQ.lng]}
            zoom={14}
            className="h-64 w-full rounded-lg z-10"
          />

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Blue Woods Brands Headquarters</h3>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold">{BLUE_WOODS_HQ.name}</h4>
                    <p className="text-sm text-gray-600">{BLUE_WOODS_HQ.address}</p>
                    <p className="text-sm text-gray-700 mt-2">
                      Your quote details, artwork, and files go directly to Blue Woods Brands headquarters. After you add your contact info, we can follow up with questions, pricing, and large-file upload instructions.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {BLUE_WOODS_HQ.services.map((service) => (
                        <span
                          key={service}
                          className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                  {BLUE_WOODS_HQ.phone && (
                    <Button size="sm" className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {BLUE_WOODS_HQ.phone}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-700 text-sm">
              Your quote request has been saved. Next, add your contact info so Blue Woods Brands can send your custom quote and follow-up questions.
            </p>
          </div>

          {submitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              We could not save the quote request yet: {submitError}
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={() => setShowContactForm(true)}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              size="lg"
            >
              Add Contact Info and Submit Request
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocalShopMap;
