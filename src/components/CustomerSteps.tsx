import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerData } from '@/types';
import ArtworkUpload from './ArtworkUpload';
import VehiclePhotoUpload from './VehiclePhotoUpload';
import DesignComplexitySelector from './DesignComplexitySelector';
import VehicleTypeSelector from './VehicleTypeSelector';
import FileReviewNotice from './FileReviewNotice';
import LocalShopMap from './LocalShopMap';
import QuoteSubmissionStep from './QuoteSubmissionStep';
import { useIsMobile } from '@/hooks/use-mobile';
import { vehicleMakes, vehicleModels, generateYears } from '@/data/vehicleData';

interface StepProps {
  data: Partial<CustomerData>;
  setData: (data: Partial<CustomerData>) => void;
  flowType?: string;
}
interface Step9Props extends StepProps {
  onEmailQuote?: () => void;
  onPhoneQuote?: () => void;
  onFinalConfirmation?: () => void;
}

interface Step10Props extends StepProps {
  onSubmitQuote?: () => void;
}

export const Step2: React.FC<StepProps> = ({ data, setData }) => {
  const isMobile = useIsMobile();
  
  return (
    <div className="card-gradient p-6 rounded-2xl space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
          🎯
        </div>
        <h2 className={`font-bold text-gradient ${
          isMobile ? 'text-xl' : 'text-3xl'
        }`}>Project Goal</h2>
        <p className="text-gray-600">Tell us about your vision</p>
      </div>
      <div>
        <Label htmlFor="goal" className={`font-medium text-purple-700 ${isMobile ? 'text-sm' : 'text-base'}`}>
          What is your goal for this project? *
        </Label>
        <Textarea 
          id="goal" 
          placeholder="e.g. real estate wraps, business promotion, personal artwork, color change…"
          value={data.goal || ''}
          onChange={(e) => setData({...data, goal: e.target.value})}
          className={`mt-3 border-2 border-purple-200 focus:border-purple-400 rounded-xl ${isMobile ? 'text-sm' : ''}`}
          rows={isMobile ? 3 : 4}
          required
        />
      </div>
    </div>
  );
};

export const Step3: React.FC<StepProps> = ({ data, setData }) => {
  return <ArtworkUpload data={data} setData={setData} />;
};

export const Step4: React.FC<StepProps> = ({ data, setData }) => {
  return <VehicleTypeSelector data={data} setData={setData} />;
};

export const Step5: React.FC<StepProps> = ({ data, setData }) => {
  const isMobile = useIsMobile();
  
  // Use vehicle data
  const years = generateYears();
  const availableModels = data.vehicle?.make ? vehicleModels[data.vehicle.make] || [] : [];
  
  return (
    <div className="card-gradient p-6 rounded-2xl space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
          🚗
        </div>
        <h2 className={`font-bold text-gradient ${
          isMobile ? 'text-xl' : 'text-3xl'
        }`}>Vehicle Information</h2>
        <p className="text-gray-600">Tell us about your vehicle</p>
      </div>
      <div className={`grid gap-4 ${
        isMobile ? 'grid-cols-1' : 'grid-cols-3'
      }`}>
        <div>
          <Label htmlFor="year" className={`font-medium text-emerald-700 ${isMobile ? 'text-sm' : 'text-base'}`}>Year *</Label>
          <Select 
            value={data.vehicle?.year || ''} 
            onValueChange={(value) => setData({...data, vehicle: {...data.vehicle, year: value}})}
          >
            <SelectTrigger className={`mt-2 border-2 border-emerald-200 focus:border-emerald-400 rounded-xl ${isMobile ? 'text-sm' : ''}`}>
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
          <Label htmlFor="make" className={`font-medium text-emerald-700 ${isMobile ? 'text-sm' : 'text-base'}`}>Make *</Label>
          <Select 
            value={data.vehicle?.make || ''} 
            onValueChange={(value) => {
              setData({...data, vehicle: {...data.vehicle, make: value, model: ''}});
            }}
          >
            <SelectTrigger className={`mt-2 border-2 border-emerald-200 focus:border-emerald-400 rounded-xl ${isMobile ? 'text-sm' : ''}`}>
              <SelectValue placeholder="Select make" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {vehicleMakes.map((make: string) => (
                <SelectItem key={make} value={make}>{make}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="model" className={`font-medium text-emerald-700 ${isMobile ? 'text-sm' : 'text-base'}`}>Model *</Label>
          <Select 
            value={data.vehicle?.model || ''} 
            onValueChange={(value) => setData({...data, vehicle: {...data.vehicle, model: value}})}
            disabled={!data.vehicle?.make}
          >
            <SelectTrigger className={`mt-2 border-2 border-emerald-200 focus:border-emerald-400 rounded-xl ${isMobile ? 'text-sm' : ''}`}>
              <SelectValue placeholder={data.vehicle?.make ? "Select model" : "Select make first"} />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {availableModels.map((model: string) => (
                <SelectItem key={model} value={model}>{model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export const Step6: React.FC<StepProps> = ({ data, setData }) => {
  return <DesignComplexitySelector data={data} setData={setData} />;
};
export const Step7: React.FC<StepProps> = ({ data, setData }) => {
  return <FileReviewNotice data={data} setData={setData} />;
};

export const Step8: React.FC<StepProps> = ({ data, setData }) => {
  const isMobile = useIsMobile();
  
  return (
    <div className="card-gradient p-6 rounded-2xl space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
          💰
        </div>
        <h2 className={`font-bold text-gradient ${
          isMobile ? 'text-xl' : 'text-3xl'
        }`}>Budget Range</h2>
        <p className="text-gray-600">Help us provide accurate quotes</p>
      </div>
      <div>
        <Label htmlFor="budget" className={`font-medium text-orange-700 ${isMobile ? 'text-sm' : 'text-base'}`}>
          Budget range *
        </Label>
        <Select value={data.budget || ''} onValueChange={(value) => setData({...data, budget: value})}>
          <SelectTrigger className={`mt-3 border-2 border-orange-200 focus:border-orange-400 rounded-xl ${isMobile ? 'text-sm' : ''}`}>
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
    </div>
  );
};

export const Step9: React.FC<Step10Props> = ({ data, setData, onSubmitQuote }) => {
  return (
    <QuoteSubmissionStep 
      onSubmitQuote={onSubmitQuote || (() => {})}
    />
  );
};

export const Step10: React.FC<Step9Props> = ({ data, setData, onEmailQuote, onPhoneQuote, onFinalConfirmation }) => {
  return (
    <LocalShopMap 
      customerData={data} 
      onEmailQuote={onEmailQuote || (() => {})}
      onPhoneQuote={onPhoneQuote || (() => {})}
      onFinalConfirmation={onFinalConfirmation}
    />
  );
};

export const Step11: React.FC<Step9Props> = ({ data, setData, onEmailQuote, onPhoneQuote, onFinalConfirmation }) => {
  return (
    <LocalShopMap 
      customerData={data} 
      onEmailQuote={onEmailQuote || (() => {})}
      onPhoneQuote={onPhoneQuote || (() => {})}
      onFinalConfirmation={onFinalConfirmation}
    />
  );
};


export const Step12 = Step11;
