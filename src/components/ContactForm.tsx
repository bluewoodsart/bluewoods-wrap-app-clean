import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ContactFormProps {
  contactMethod: 'email' | 'phone';
  onBack: () => void;
  onSubmit: (data: any) => void;
}

const ContactForm: React.FC<ContactFormProps> = ({ contactMethod, onBack, onSubmit }) => {
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    preference: 'call',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-2 md:p-4">
      <div className={`mx-auto ${isMobile ? 'max-w-full' : 'max-w-2xl'}`}>
        <Card>
          <CardHeader className={isMobile ? 'p-4' : ''}>
            <CardTitle className={`text-center ${isMobile ? 'text-lg' : 'text-2xl'}`}>
              How would you like to receive your quote?
            </CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? 'p-4' : ''}>
            <form onSubmit={handleSubmit} className={`space-y-4 ${isMobile ? '' : 'space-y-6'}`}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>

                {contactMethod === 'email' ? (
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label>Preference</Label>
                      <RadioGroup
                        value={formData.preference}
                        onValueChange={(value) => setFormData({...formData, preference: value})}
                        className="mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="call" id="call" />
                          <Label htmlFor="call">Call Me</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="text" id="text" />
                          <Label htmlFor="text">Text Me</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="message">Anything else you'd like to tell us?</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    placeholder="Optional message..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                <p className="mb-2">
                  We respect your privacy and comply with all anti-spam laws.
                </p>
                <p>
                  For text messages, you can opt out at any time by replying STOP.
                </p>
              </div>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={onBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button type="submit">
                  Send My Quote
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContactForm;