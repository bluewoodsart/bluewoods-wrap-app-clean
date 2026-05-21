import React from 'react';
import { Button } from '@/components/ui/button';
import ImageSlideshow from './ImageSlideshow';
import { useIsMobile } from '@/hooks/use-mobile';

interface HeroSectionProps {
  onServiceSelect: (service: string) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onServiceSelect }) => {
  const isMobile = useIsMobile();

  return (
    <div className="hero-bg min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-violet-400/10 to-indigo-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="text-center space-y-8 relative z-10 px-4">
        {/* Main heading */}
        <div className="space-y-6">
          <h1 className={`font-bold leading-tight ${
            isMobile ? 'text-4xl' : 'text-6xl md:text-7xl'
          }`}>
            <span className="text-gradient block">Transform Your Vehicle</span>
            <span className="text-gradient-secondary block mt-2">with Professional Wraps</span>
          </h1>
          
          <p className={`text-gray-700 max-w-3xl mx-auto leading-relaxed font-medium ${
            isMobile ? 'text-lg px-4' : 'text-xl'
          }`}>
            Get instant quotes, upload photos, and connect with certified wrap professionals in your area. 
            <span className="text-gradient-secondary font-semibold block mt-2">Premium quality wraps with nationwide coverage.</span>
          </p>
        </div>

        {/* Main CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            onClick={() => onServiceSelect('vehicle-wrap')}
            className={`btn-gradient glow-effect ${
              isMobile ? 'px-8 py-4 text-lg w-full max-w-xs' : 'px-12 py-5 text-xl'
            }`}
          >
            🚗 Get Your Wrap Quote
          </Button>
        </div>

        {/* Image slideshow */}
        <div className={`${isMobile ? 'px-2' : 'px-4'} mt-12`}>
          <div className="glass-effect rounded-2xl p-4 glow-effect">
            <ImageSlideshow />
          </div>
        </div>
      </div>
    </div>
  );
};

export { HeroSection };
export default HeroSection;