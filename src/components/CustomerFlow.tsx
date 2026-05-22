import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomerData } from '@/types';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import ContactForm from './ContactForm';
import QuoteConfirmation from './QuoteConfirmation';
import QuoteConfirmationFinal from './QuoteConfirmationFinal';
import { useIsMobile } from '@/hooks/use-mobile';
import { renderStep } from './CustomerFlowRender';

interface CustomerFlowProps {
  onBack: () => void;
  flowType: string;
}

type FlowState = 'steps' | 'contact-email' | 'contact-phone' | 'confirmation' | 'final-confirmation';

const CustomerFlow: React.FC<CustomerFlowProps> = ({ onBack, flowType }) => {
  const isMobile = useIsMobile();
  const [step, setStep] = useState(1);
  const [flowState, setFlowState] = useState<FlowState>('steps');
  const [data, setData] = useState<Partial<CustomerData>>({
    quoteId: `${flowType}_${Date.now()}_${Math.random().toString(36).substring(2)}`,
    services: [],
    vehicle: { year: '', make: '', model: '' },
    quoteType: flowType
  });

  const getStepCount = () => {
    if (data.selectedService === 'Partial Vehicle Wraps') return 11;
    return 10;
  };

  const validateStep = (currentStep: number): boolean => {
    const isPartialWrap = data.selectedService === 'Partial Vehicle Wraps';

    switch (currentStep) {
      case 1:
        if (!data.selectedService) {
          alert('Please select a service option to continue.');
          return false;
        }
        break;
      case 2:
        if (data.selectedService === 'Partial Vehicle Wraps' && !data.partialWrapType) {
          alert('Please select a partial wrap coverage option.');
          return false;
        }
        if (data.selectedService !== 'Partial Vehicle Wraps' && (!data.goal || data.goal.trim() === '')) {
          alert('Please describe your project goal to continue.');
          return false;
        }
        break;
      case 3:
        if (isPartialWrap && (!data.goal || data.goal.trim() === '')) {
          alert('Please describe your project goal to continue.');
          return false;
        }
        break;
      case 4:
        if (isPartialWrap) {
          break;
        }
        if (!data.vehicleType) {
          alert('Please select your vehicle type to continue.');
          return false;
        }
        if (data.vehicleType === 'other' && (!data.otherVehicleDescription || data.otherVehicleDescription.trim() === '')) {
          alert('Please describe your vehicle type to continue.');
          return false;
        }
        break;
      case 5:
        if (isPartialWrap) {
          if (!data.vehicleType) {
            alert('Please select your vehicle type to continue.');
            return false;
          }
          if (data.vehicleType === 'other' && (!data.otherVehicleDescription || data.otherVehicleDescription.trim() === '')) {
            alert('Please describe your vehicle type to continue.');
            return false;
          }
          break;
        }
        if (!data.vehicle?.year || !data.vehicle?.make || !data.vehicle?.model) {
          alert('Please fill in all vehicle information fields (year, make, model) to continue.');
          return false;
        }
        break;
      case 6:
        if (isPartialWrap) {
          if (!data.vehicle?.year || !data.vehicle?.make || !data.vehicle?.model) {
            alert('Please fill in all vehicle information fields (year, make, model) to continue.');
            return false;
          }
          break;
        }
        if (!data.designComplexity) {
          alert('Please select a design complexity option to continue.');
          return false;
        }
        break;
      case 7:
        if (isPartialWrap && !data.designComplexity) {
          alert('Please select a design complexity option to continue.');
          return false;
        }
        break;
      case 8:
        if (isPartialWrap) {
          break;
        }
        if (!data.budget) {
          alert('Please select a budget range to continue.');
          return false;
        }
        break;
      case 9:
        if (isPartialWrap && !data.budget) {
          alert('Please select a budget range to continue.');
          return false;
        }
        break;
      case 10:
        break;
     }
     return true;
   };
  const handleNext = () => {
    if (!validateStep(step)) {
      return;
    }
    
    if (step < getStepCount()) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onBack();
    }
  };
  const handleSubmitQuote = () => {
    // Navigate to the next step (Step 11 - LocalShopMap)
    setStep(step + 1);
  };
  const handleEmailQuote = () => {
    setFlowState('contact-email');
  };

  const handlePhoneQuote = () => {
    setFlowState('contact-phone');
  };

  const handleContactSubmit = (contactData: any) => {
    setFlowState('final-confirmation');
  };

  const handleFinalConfirmation = () => {
    console.log('handleFinalConfirmation called - setting flowState to final-confirmation');
    setFlowState('final-confirmation');
  };

  const handleStartNewQuote = () => {
    setStep(1);
    setFlowState('steps');
    setData({
      quoteId: `${flowType}_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      services: [],
      vehicle: { year: '', make: '', model: '' },
      quoteType: flowType
    });
    onBack();
  };

  const handleContactBack = () => {
    setFlowState('steps');
  };

  if (flowState === 'contact-email') {
    return (
      <ContactForm
        contactMethod="email"
        onBack={handleContactBack}
        onSubmit={handleContactSubmit}
      />
    );
  }

  if (flowState === 'contact-phone') {
    return (
      <ContactForm
        contactMethod="phone"
        onBack={handleContactBack}
        onSubmit={handleContactSubmit}
      />
    );
  }

  if (flowState === 'confirmation') {
    return (
      <QuoteConfirmation onStartNewQuote={handleStartNewQuote} />
    );
  }
  if (flowState === 'final-confirmation') {
    console.log('Rendering QuoteConfirmationFinal component');
    return (
      <QuoteConfirmationFinal onStartNewQuote={handleStartNewQuote} />
    );
  }

  console.log('Current flowState:', flowState, 'Current step:', step);

  const totalSteps = getStepCount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-2 md:p-4">
      <div className={`mx-auto ${
        isMobile ? 'max-w-full' : 'max-w-2xl'
      }`}>
        <Card>
          <CardHeader className={isMobile ? 'p-4' : ''}>
            <div className="flex items-center justify-between">
              <CardTitle className={isMobile ? 'text-lg' : ''}>
                Vehicle Wrap Quote - Step {step} of {totalSteps}
              </CardTitle>
              <div className={`text-gray-500 ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>
                {Math.round((step / totalSteps) * 100)}% Complete
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </CardHeader>
          <CardContent className={isMobile ? 'p-4' : ''}>
            {renderStep({ 
              step, 
              data, 
              setData, 
              onEmailQuote: handleEmailQuote, 
              onPhoneQuote: handlePhoneQuote,
              onSubmitQuote: handleSubmitQuote,
              onFinalConfirmation: handleFinalConfirmation
            })}
            
            {step < totalSteps && (
              <div className={`flex justify-between mt-6 md:mt-8 ${
                isMobile ? 'gap-2' : ''
              }`}>
                <Button variant="outline" onClick={handleBack} size={isMobile ? 'sm' : 'default'}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} size={isMobile ? 'sm' : 'default'}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerFlow;
