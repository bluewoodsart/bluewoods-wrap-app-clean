import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, MessageSquare } from 'lucide-react';

interface QuoteConfirmationFinalProps {
  onStartNewQuote: () => void;
}

const QuoteConfirmationFinal: React.FC<QuoteConfirmationFinalProps> = ({ onStartNewQuote }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 flex items-center justify-center">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">
            🚨 Urgent Reply Needed!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="space-y-4">
            <p className="text-lg font-semibold text-gray-800">
              Check your email or text to confirm your quote.
            </p>
            <p className="text-gray-700">
              Our A.I. is reaching out to available shops in your area...
            </p>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-center gap-4 text-blue-700">
              <Mail className="w-6 h-6" />
              <span className="font-medium">Email notification sent</span>
            </div>
            <div className="flex items-center justify-center gap-4 text-blue-700 mt-2">
              <MessageSquare className="w-6 h-6" />
              <span className="font-medium">Text message sent</span>
            </div>
          </div>
          
          <Button 
            onClick={onStartNewQuote}
            variant="outline"
            className="w-full mt-6"
          >
            Start New Quote
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuoteConfirmationFinal;