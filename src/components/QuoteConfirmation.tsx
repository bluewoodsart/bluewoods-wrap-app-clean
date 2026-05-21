import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

interface QuoteConfirmationProps {
  onStartNewQuote: () => void;
}

const QuoteConfirmation: React.FC<QuoteConfirmationProps> = ({ onStartNewQuote }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl text-center flex items-center justify-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              Quote Request Sent!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="space-y-4">
              <p className="text-lg text-gray-700">
                Thanks for reaching out! A representative will contact you shortly using your preferred method.
              </p>
              <p className="text-gray-600">
                If you'd like to start a brand new quote, tap below.
              </p>
            </div>
            
            <div className="pt-6">
              <Button 
                onClick={onStartNewQuote}
                size="lg"
                className="w-full md:w-auto px-8"
              >
                Start New Quote
              </Button>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg mt-6">
              <p className="text-sm text-blue-800">
                💡 <strong>What's next?</strong> Our team will review your request and reach out within 24 hours with your custom quote and next steps.
              </p>
            </div>
            
            {/* Privacy Disclaimer */}
            <div className="bg-gray-50 p-4 rounded-lg mt-6 border">
              <p className="text-sm text-gray-700">
                <strong>Privacy Notice:</strong> Your information will not be shared with any third parties. It's used only for generating quotes. You can unsubscribe at any time by replying STOP.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuoteConfirmation;