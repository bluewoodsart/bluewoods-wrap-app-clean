import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft } from 'lucide-react';

interface ContactInfoFormProps {
  onSubmit: (contactInfo: ContactInfo) => void;
  onBack: () => void;
  actionType: 'email' | 'phone';
}

interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  preferredContact: 'email' | 'text' | 'call';
}

const ContactInfoForm: React.FC<ContactInfoFormProps> = ({ onSubmit, onBack, actionType }) => {
  const [formData, setFormData] = useState<ContactInfo>({
    name: '',
    email: '',
    phone: '',
    preferredContact: actionType === 'email' ? 'email' : 'call'
  });
  const [errors, setErrors] = useState<Partial<ContactInfo>>({});

  const validateForm = () => {
    const newErrors: Partial<ContactInfo> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (validateForm()) {
      console.log('ContactInfoForm: calling onSubmit with data:', formData);
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof ContactInfo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const getTitle = () => {
    switch (actionType) {
      case 'email':
        return '📧 Email My Custom Quote';
      default:
        return '📞 Text or Call Me';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 block">
                Preferred Contact Method:
              </Label>
              <RadioGroup 
                value={formData.preferredContact} 
                onValueChange={(value) => handleInputChange('preferredContact', value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="email-contact" />
                  <Label htmlFor="email-contact">Email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="text" id="text-contact" />
                  <Label htmlFor="text-contact">Text Message</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="call" id="call-contact" />
                  <Label htmlFor="call-contact">Phone Call</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border">
              <p className="text-sm text-gray-700">
                <strong>Privacy Notice:</strong> Your information will not be shared with any third parties. It's used strictly for preparing your quote. You can unsubscribe at any time.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onBack} className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button type="submit" className="flex-1">
                Submit Request
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactInfoForm;