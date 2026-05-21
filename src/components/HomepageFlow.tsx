import React from 'react';
import { HeroSection } from './HeroSection';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';

interface HomepageFlowProps {
  onFlowSelect: (flow: string) => void;
}

const HomepageFlow: React.FC<HomepageFlowProps> = ({ onFlowSelect }) => {
  const isMobile = useIsMobile();

  const logSelection = async (selectedPath: string) => {
    try {
      await supabase
        .from('home_selection_log')
        .insert({
          selected_path: selectedPath,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging selection:', error);
    }
  };

  const handleServiceSelect = async (service: string) => {
    await logSelection(`service_${service}`);
    
    if (service === 'vehicle-wrap') {
      onFlowSelect('vehicle-wrap');
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-6 md:py-12 px-2 md:px-4 relative`}>
      <div className={`mx-auto ${
        isMobile ? 'max-w-full' : 'max-w-6xl'
      }`}>
        <HeroSection onServiceSelect={handleServiceSelect} />
      </div>
    </div>
  );
};

export default HomepageFlow;