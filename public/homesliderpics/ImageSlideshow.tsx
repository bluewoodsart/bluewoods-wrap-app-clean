import React, { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ImageSlideshowProps {
  images?: string[];
  autoPlay?: boolean;
  interval?: number;
}

const ImageSlideshow: React.FC<ImageSlideshowProps> = ({ 
  images = [
    '/homesliderpics/ChatGPT Image May 26, 2026, 01_11_56 PM.png',
    '/homesliderpics/ChatGPT Image May 26, 2026, 01_12_41 PM.png',
    '/homesliderpics/ChatGPT Image May 26, 2026, 01_12_47 PM.png',
    '/homesliderpics/ChatGPT Image May 26, 2026, 01_12_52 PM.png',
    '/homesliderpics/ChatGPT Image May 26, 2026, 01_12_59 PM.png',
    '/homesliderpics/ChatGPT Image May 26, 2026, 01_13_25 PM.png',
    '/homesliderpics/ChatGPT Image May 26, 2026, 01_13_34 PM.png'
  ],
  autoPlay = true, 
  interval = 4000 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!autoPlay || images.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, interval);

    return () => clearInterval(timer);
  }, [autoPlay, images.length, interval]);

  if (!images.length) return null;

  return (
    <div className={`relative overflow-hidden rounded-xl shadow-lg bg-gradient-to-br from-gray-50 to-gray-100 ${
      isMobile ? 'w-full max-w-sm mx-auto h-48' : 'w-full max-w-2xl mx-auto h-64 md:h-80'
    }`}>
      <div 
        className="flex transition-transform duration-500 ease-in-out h-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((image, index) => (
          <div key={index} className="w-full h-full flex-shrink-0 flex items-center justify-center">
            <img 
              src={image} 
              alt={`Blue Woods infographic ${index + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ))}
      </div>
      
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-blue-600' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageSlideshow;
