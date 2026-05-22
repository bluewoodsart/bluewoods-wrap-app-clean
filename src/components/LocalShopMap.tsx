import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Phone } from 'lucide-react';
import LeafletMap from './LeafletMap';
import ContactInfoForm from './ContactInfoForm';
import { supabase } from '@/lib/supabase';

interface Shop {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  services: string[];
  distance?: string;
  rating?: number;
}

interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  preferredContact: 'email' | 'text' | 'call';
}

interface LocalShopMapProps {
  customerData?: any;
  onEmailQuote: () => void;
  onPhoneQuote: () => void;
  onFinalConfirmation?: () => void;
}

const LocalShopMap: React.FC<LocalShopMapProps> = ({ customerData, onEmailQuote, onPhoneQuote, onFinalConfirmation }) => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactFormType, setContactFormType] = useState<'email' | 'phone'>('email');

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('*');
      
      if (error) {
        console.error('Error fetching shops:', error);
        setShops([]);
      } else {
        const transformedShops = (data || []).map((shop: any) => ({
          id: shop.id,
          name: shop.name || 'Shop Name',
          address: shop.address || 'Address not available',
          lat: shop.latitude || 33.7490,
          lng: shop.longitude || -84.3880,
          phone: shop.phone || '(555) 000-0000',
          services: shop.services || ['Vehicle Wraps', 'PPF'],
          rating: shop.rating || 4.5
        }));
        setShops(transformedShops);
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
      setShops([]);
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = (contactInfo: ContactInfo) => {
    console.log('Contact info submitted:', contactInfo);
    console.log('Customer data:', customerData);
    onFinalConfirmation?.();
  };

  const handleActionClick = (type: 'email' | 'phone') => {
    setContactFormType(type);
    setShowContactForm(true);
  };

  if (showContactForm) {
    return (
      <ContactInfoForm
        onSubmit={handleContactSubmit}
        onBack={() => setShowContactForm(false)}
        actionType={contactFormType}
      />
    );
  }

  const hasShops = shops.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📍 Quote Review & Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-gray-700">
            {hasShops ? "We've found shops near you who offer the services you requested." : "We're expanding our network in your area!"}
          </p>
          
          <div className="relative">
            {loading ? (
              <div className="bg-gray-100 h-64 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-2 animate-pulse" />
                  <p>Loading map...</p>
                </div>
              </div>
            ) : (
              <LeafletMap 
                shops={shops}
                center={[33.7490, -84.3880]}
                zoom={hasShops ? 10 : 8}
                className="h-64 w-full rounded-lg z-10"
              />
            )}
            
            {!hasShops && !loading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center z-20">
                <div className="text-center text-white p-6">
                  <h3 className="font-bold text-xl mb-4">We are processing your request</h3>
                  <p className="text-sm">Our system communicates automatically with local pro shops.</p>
                </div>
              </div>
            )}
          </div>
          
          {hasShops && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Local Shops Near You:</h3>
              {shops.map((shop) => (
                <Card key={shop.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold">{shop.name}</h4>
                        <p className="text-sm text-gray-600">{shop.address}</p>
                        {shop.distance && (
                          <p className="text-sm text-blue-600">{shop.distance} away</p>
                        )}
                        {shop.rating && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-yellow-500">⭐</span>
                            <span className="text-sm">{shop.rating}</span>
                          </div>
                        )}
                      </div>
                      <Button size="sm" className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {shop.phone}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {!hasShops && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-blue-600">🚀</span>
                <div>
                  <p className="text-blue-700 text-sm">
                    Your quote request has been saved and we'll notify you as soon as shops become available in your area.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <Button 
              onClick={() => handleActionClick('email')}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              size="lg"
            >
              Submit Your Quote Request
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocalShopMap;
