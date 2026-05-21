import React, { useState } from 'react';
import HomepageFlow from './HomepageFlow';
import CustomerFlow from './CustomerFlow';
import QRCodePreview from './QRCodePreview';

interface AppLayoutProps {
  isPreviewMode?: boolean;
}

const AppLayout: React.FC<AppLayoutProps> = ({ isPreviewMode = false }) => {
  const [currentFlow, setCurrentFlow] = useState<string>('home');

  const handleFlowSelect = (flow: string) => {
    setCurrentFlow(flow);
  };

  const handleBackToHome = () => {
    setCurrentFlow('home');
  };

  const renderFlow = () => {
    switch (currentFlow) {
      case 'home':
        return <HomepageFlow onFlowSelect={handleFlowSelect} />;
      case 'vehicle-wrap':
        return <CustomerFlow onBack={handleBackToHome} flowType="vehicle-wrap" />;
      default:
        return <HomepageFlow onFlowSelect={handleFlowSelect} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/50">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-100/20 to-transparent rounded-full animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-indigo-100/20 to-transparent rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>
      
      <div className="relative z-10">
        {renderFlow()}
      </div>
    </div>
  );
};

export default AppLayout;