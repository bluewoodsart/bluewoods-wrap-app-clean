import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShopData } from '@/types';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';

interface ShopFlowProps {
  onBack: () => void;
}

const ShopFlow: React.FC<ShopFlowProps> = ({ onBack }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Partial<ShopData>>({});
  const [isComplete, setIsComplete] = useState(false);

  const totalSteps = 8;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      setIsComplete(true);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onBack();
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Business Information</h2>
            <div>
              <Label htmlFor="businessName">Business Name</Label>
              <Input 
                id="businessName" 
                placeholder="Your Shop Name"
                value={data.businessName || ''}
                onChange={(e) => setData({...data, businessName: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="address">Service Address</Label>
              <Textarea 
                id="address" 
                placeholder="123 Main St, City, State 12345"
                value={data.address || ''}
                onChange={(e) => setData({...data, address: e.target.value})}
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Services Offered</h2>
            <div className="space-y-2">
              {['Wrap Installation (Full/Partial)', 'Paint Protection Film (PPF)', 'In-House Design', 'Design-Only', 'Tint / Chrome Delete / Customization'].map(service => (
                <div key={service} className="flex items-center space-x-2">
                  <Checkbox 
                    checked={data.services?.includes(service) || false}
                    onCheckedChange={(checked) => {
                      const services = data.services || [];
                      if (checked) {
                        setData({...data, services: [...services, service]});
                      } else {
                        setData({...data, services: services.filter(s => s !== service)});
                      }
                    }}
                  />
                  <Label>{service}</Label>
                </div>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Listing Preference</h2>
            <Select value={data.listingType} onValueChange={(value) => setData({...data, listingType: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Choose your preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Be listed publicly for customer quotes</SelectItem>
                <SelectItem value="private">Use tool privately for internal quoting</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 6:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Turnaround Time</h2>
            <div>
              <Label htmlFor="turnaround">Estimated turnaround time for services</Label>
              <Input 
                id="turnaround" 
                placeholder="e.g., 3-5 days for wraps, 1-2 days for PPF"
                value={data.turnaroundTime || ''}
                onChange={(e) => setData({...data, turnaroundTime: e.target.value})}
              />
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Step {step}</h2>
            <p>This step is under construction. Click Next to continue.</p>
          </div>
        );
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <CardTitle className="text-3xl">Shop Setup Complete!</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">✅ Your shop account is now ready!</h3>
                <ul className="text-green-700 space-y-1">
                  <li>• Generate quotes using customer flows</li>
                  <li>• Compare your pricing vs. market averages</li>
                  <li>• Accept leads from quote comparison engine</li>
                  <li>• Access your pricing dashboard</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Next Steps:</h3>
                <Button className="w-full">Access Shop Dashboard</Button>
                <Button className="w-full" variant="outline">Generate Test Quote</Button>
                <Button className="w-full" variant="outline">Update Pricing Settings</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Shop Setup - Step {step} of {totalSteps}</CardTitle>
              <div className="text-sm text-gray-500">
                {Math.round((step / totalSteps) * 100)}% Complete
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </CardHeader>
          <CardContent>
            {renderStep()}
            
            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleNext}>
                {step === totalSteps ? 'Complete Setup' : 'Next'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShopFlow;