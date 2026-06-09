import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { CustomerData, PriceEstimate } from '@/types';
import { Step9, Step10, Step12 } from './CustomerSteps';

interface BannerFlowProps {
  onBack: () => void;
}

const BannerFlow: React.FC<BannerFlowProps> = ({ onBack }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Partial<CustomerData>>({
    quoteId: `banner_${Date.now()}_${Math.random().toString(36).substring(2)}`
  });
  const [estimate, setEstimate] = useState<PriceEstimate | null>(null);

  const totalSteps = 7;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      calculateEstimate();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onBack();
    }
  };

  const calculateEstimate = () => {
    let low = 0, high = 0;
    const breakdown: string[] = [];

    // Banner base pricing
    if (data.bannerType === 'Vinyl Banner') {
      low += 50; high += 150;
    } else if (data.bannerType === 'Mesh Banner') {
      low += 75; high += 200;
    } else if (data.bannerType === 'Fabric Banner') {
      low += 100; high += 300;
    }

    // Size multipliers
    const sizeMultipliers = {
      '2x4 feet': 1.0,
      '3x6 feet': 1.5,
      '4x8 feet': 2.0,
      '6x10 feet': 3.0,
      'Custom Size': 2.5
    };
    const mult = sizeMultipliers[data.bannerSize as keyof typeof sizeMultipliers] || 1.0;
    low *= mult; high *= mult;

    breakdown.push('Banner Production');
    setEstimate({ low: Math.round(low), high: Math.round(high), breakdown });
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Banner Type</h2>
            <p className="text-gray-600">What type of banner do you need?</p>
            <Select value={data.bannerType} onValueChange={(value) => setData({...data, bannerType: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select banner type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Vinyl Banner">🎪 Vinyl Banner - Standard outdoor use</SelectItem>
                <SelectItem value="Mesh Banner">🌬️ Mesh Banner - Wind-resistant</SelectItem>
                <SelectItem value="Fabric Banner">🧵 Fabric Banner - Premium indoor/outdoor</SelectItem>
                <SelectItem value="Retractable Banner">📏 Retractable Banner Stand</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Banner Size</h2>
            <p className="text-gray-600">What size banner do you need?</p>
            <Select value={data.bannerSize} onValueChange={(value) => setData({...data, bannerSize: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select banner size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2x4 feet">2x4 feet - Small events</SelectItem>
                <SelectItem value="3x6 feet">3x6 feet - Standard size</SelectItem>
                <SelectItem value="4x8 feet">4x8 feet - Large display</SelectItem>
                <SelectItem value="6x10 feet">6x10 feet - Extra large</SelectItem>
                <SelectItem value="Custom Size">Custom Size - Tell us your needs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Banner Thickness & Material</h2>
            <p className="text-gray-600">Choose the material thickness for your banner</p>
            <Select value={data.bannerMaterial} onValueChange={(value) => setData({...data, bannerMaterial: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select material thickness" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="13oz Vinyl">13oz Vinyl - Standard weight</SelectItem>
                <SelectItem value="15oz Vinyl">15oz Vinyl - Heavy duty</SelectItem>
                <SelectItem value="18oz Vinyl">18oz Vinyl - Premium thickness</SelectItem>
                <SelectItem value="Mesh Material">Mesh Material - Wind resistant</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Finishing Options</h2>
            <p className="text-gray-600">How would you like your banner finished?</p>
            <div className="space-y-3">
              {[
                { id: 'grommets', label: 'Grommets (metal eyelets)', desc: 'Standard hanging option' },
                { id: 'pole-pockets', label: 'Pole Pockets', desc: 'For pole mounting' },
                { id: 'velcro', label: 'Velcro Strips', desc: 'Easy attachment/removal' },
                { id: 'hemmed-edges', label: 'Hemmed Edges', desc: 'Reinforced borders' }
              ].map(option => (
                <div key={option.id} className="border rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox 
                      checked={data.bannerFinishing?.includes(option.id) || false}
                      onCheckedChange={(checked) => {
                        const finishing = data.bannerFinishing || [];
                        if (checked) {
                          setData({...data, bannerFinishing: [...finishing, option.id]});
                        } else {
                          setData({...data, bannerFinishing: finishing.filter(f => f !== option.id)});
                        }
                      }}
                    />
                    <div>
                      <Label className="font-medium">{option.label}</Label>
                      <p className="text-sm text-gray-600 mt-1">{option.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 5: return <Step9 data={data} setData={setData} />;
      case 6: return <Step10 data={data} setData={setData} onEmailQuote={() => {}} onPhoneQuote={() => {}} />;
      case 7: return <Step12 data={data} setData={setData} onEmailQuote={() => {}} onPhoneQuote={() => {}} />;
      default:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Step {step}</h2>
            <p>This step is under construction. Click Next to continue.</p>
          </div>
        );
    }
  };

  if (estimate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl text-center">🎪 Your Banner Quote</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-600">
                  💵 ${estimate.low.toLocaleString()} - ${estimate.high.toLocaleString()}
                </div>
                <p className="text-gray-600 mt-2">Estimated Price Range</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Banner Summary:</h3>
                <ul className="text-sm space-y-1">
                  <li>• Type: {data.bannerType}</li>
                  <li>• Size: {data.bannerSize}</li>
                  <li>• Material: {data.bannerMaterial}</li>
                  {data.bannerFinishing && data.bannerFinishing.length > 0 && (
                    <li>• Finishing: {data.bannerFinishing.join(', ')}</li>
                  )}
                  {data.uploadedFiles && data.uploadedFiles.length > 0 && (
                    <li>• Files Uploaded: {data.uploadedFiles.length} files</li>
                  )}
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">➡️ Next Steps:</h3>
                <Button className="w-full" variant="outline">• Get a visual mockup</Button>
                <Button className="w-full" variant="outline">• Book a design consultation</Button>
                <Button className="w-full">• Compare quotes from local print shops</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Banner Quote - Step {step} of {totalSteps}</CardTitle>
              <div className="text-sm text-gray-500">
                {Math.round((step / totalSteps) * 100)}% Complete
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-600 h-2 rounded-full transition-all duration-300"
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
                {step === totalSteps ? 'Get Quote' : 'Next'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BannerFlow;
