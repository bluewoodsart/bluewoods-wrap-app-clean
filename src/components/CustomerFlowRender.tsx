import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CustomerData } from '@/types';
import { Step3, Step4, Step5, Step6, Step7, Step8, Step9, Step10, Step11 } from './CustomerSteps';
import PartialWrapSelector from './PartialWrapSelector';
import { useIsMobile } from '@/hooks/use-mobile';

interface RenderStepProps {
  step: number;
  data: Partial<CustomerData>;
  setData: (data: Partial<CustomerData>) => void;
  onEmailQuote: () => void;
  onPhoneQuote: () => void;
  onSubmitQuote?: () => void;
  onFinalConfirmation?: () => void;
}

export const renderStep = ({ step, data, setData, onEmailQuote, onPhoneQuote, onSubmitQuote, onFinalConfirmation }: RenderStepProps) => {
  const isMobile = useIsMobile();

  switch (step) {
    case 1:
      return (
        <div className="space-y-4">
          <h2 className={`font-bold ${
            isMobile ? 'text-xl' : 'text-2xl'
          }`}>Vehicle Wrap Services</h2>
          <p className="text-gray-600">Select the service you need:</p>
          
          <RadioGroup 
            value={data.selectedService || ''} 
            onValueChange={(value) => setData({...data, selectedService: value})}
            className="space-y-3"
          >
            {[
              { id: 'Custom Full Vehicle Wrap + Design', label: '🎨 Custom Full Vehicle Wrap + Design' },
              { id: 'Partial Vehicle Wraps', label: '🚗 Partial Vehicle Wraps' }
            ].map(service => (
              <div key={service.id} className="border rounded-lg p-3 md:p-4">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value={service.id} id={service.id} />
                  <Label htmlFor={service.id} className={`font-medium cursor-pointer ${
                    isMobile ? 'text-sm' : ''
                  }`}>
                    {service.label}
                  </Label>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>
      );
    case 2:
      if (data.selectedService === 'Partial Vehicle Wraps') {
        return <PartialWrapSelector data={data} setData={setData} />;
      }
      return (
        <div className="space-y-4">
          <h2 className={`font-bold ${
            isMobile ? 'text-xl' : 'text-2xl'
          }`}>Project Goal</h2>
          <div>
            <Label htmlFor="goal">What is your goal for this project?</Label>
            <Textarea 
              id="goal" 
              placeholder="e.g. real estate wraps, business promotion, personal artwork, color change…"
              value={data.goal || ''}
              onChange={(e) => setData({...data, goal: e.target.value})}
              className="mt-2"
              rows={isMobile ? 3 : 4}
            />
          </div>
        </div>
      );
    case 3:
      if (data.selectedService === 'Partial Vehicle Wraps') {
        return (
          <div className="space-y-4">
            <h2 className={`font-bold ${
              isMobile ? 'text-xl' : 'text-2xl'
            }`}>Project Goal</h2>
            <div>
              <Label htmlFor="goal">What is your goal for this project?</Label>
              <Textarea 
                id="goal" 
                placeholder="e.g. real estate wraps, business promotion, personal artwork, color change…"
                value={data.goal || ''}
                onChange={(e) => setData({...data, goal: e.target.value})}
                className="mt-2"
                rows={isMobile ? 3 : 4}
              />
            </div>
          </div>
        );
      }
      return <Step3 data={data} setData={setData} />;
    case 4: 
      if (data.selectedService === 'Partial Vehicle Wraps') {
        return <Step3 data={data} setData={setData} />;
      }
      return <Step4 data={data} setData={setData} />;
    case 5: 
      if (data.selectedService === 'Partial Vehicle Wraps') {
        return <Step4 data={data} setData={setData} />;
      }
      return <Step5 data={data} setData={setData} />;
    case 6: 
      if (data.selectedService === 'Partial Vehicle Wraps') {
        return <Step5 data={data} setData={setData} />;
      }
      return <Step6 data={data} setData={setData} />;
    case 7: 
      if (data.selectedService === 'Partial Vehicle Wraps') {
        return <Step6 data={data} setData={setData} />;
      }
      return <Step7 data={data} setData={setData} />;
    case 8: 
      if (data.selectedService === 'Partial Vehicle Wraps') {
        return <Step7 data={data} setData={setData} />;
      }
      return <Step8 data={data} setData={setData} />;
    case 9: 
      if (data.selectedService === 'Partial Vehicle Wraps') {
        return <Step8 data={data} setData={setData} />;
      }
      return (
        <Step9 
          data={data} 
          setData={setData}
          onSubmitQuote={onSubmitQuote}
        />
      );
    case 10: 
      if (data.selectedService === 'Partial Vehicle Wraps') {
        return (
          <Step9 
            data={data} 
            setData={setData}
            onSubmitQuote={onSubmitQuote}
          />
        );
      }
      return (
        <Step10 
          data={data} 
          setData={setData}
          onEmailQuote={onEmailQuote}
          onPhoneQuote={onPhoneQuote}
          onFinalConfirmation={onFinalConfirmation}
        />
      );
    case 11:
      return (
        <Step10 
          data={data} 
          setData={setData}
          onEmailQuote={onEmailQuote}
          onPhoneQuote={onPhoneQuote}
          onFinalConfirmation={onFinalConfirmation}
        />
      );
    default:
      return <div><h2>Step {step}</h2><p>Under construction</p></div>;
  }
};