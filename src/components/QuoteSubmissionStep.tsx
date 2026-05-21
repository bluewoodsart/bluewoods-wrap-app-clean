import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface QuoteSubmissionStepProps {
  onSubmitQuote: () => void;
}

const QuoteSubmissionStep: React.FC<QuoteSubmissionStepProps> = ({ onSubmitQuote }) => {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-6">
      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader className="text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4">
            ✅
          </div>
          <CardTitle className={`text-gradient ${isMobile ? 'text-xl' : 'text-2xl'}`}>
            Ready to Submit Your Quote Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-gray-700 text-lg">
              Great! We have all the information we need for your vehicle wrap quote.
            </p>
            <p className="text-gray-600">
              Click the button below to submit your request and we'll connect you with local professionals.
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-green-200 space-y-3">
            <h3 className="font-semibold text-green-800 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              What happens next:
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 ml-7">
              <li>• We'll show you a map of local wrap shops</li>
              <li>• You'll provide your contact information</li>
              <li>• Local professionals will receive your quote request</li>
              <li>• You'll receive quotes via email or phone</li>
            </ul>
          </div>
          <Button 
            onClick={onSubmitQuote}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg py-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            size="lg"
          >
            Submit Your Quote Request
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuoteSubmissionStep;