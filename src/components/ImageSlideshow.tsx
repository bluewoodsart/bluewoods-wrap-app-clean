import React, { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ImageSlideshowProps {
  images?: string[];
  autoPlay?: boolean;
  interval?: number;
}

const ImageSlideshow: React.FC<ImageSlideshowProps> = ({ 
  images = [
    'https://d64gsuwffb70l.cloudfront.net/685431aa226522c36ce7c257_1753730035053_85f1177a.png',
    'https://d64gsuwffb70l.cloudfront.net/685431aa226522c36ce7c257_1753730036350_49355481.png',
    'https://d64gsuwffb70l.cloudfront.net/685431aa226522c36ce7c257_1753730036733_36cd5890.png',
    'https://d64gsuwffb70l.cloudfront.net/685431aa226522c36ce7c257_1753730036981_0354d918.png',
    'https://d64gsuwffb70l.cloudfront.net/685431aa226522c36ce7c257_1753730037274_e559ed8a.png',
    'https://d64gsuwffb70l.cloudfront.net/685431aa226522c36ce7c257_1753730037550_810c5077.png',
    'https://d64gsuwffb70l.cloudfront.net/685431aa226522c36ce7c257_1753730037770_9680218d.png',
    'https://d64gsuwffb70l.cloudfront.net/685431aa226522c36ce7c257_1753730038135_8f1a9f16.png'
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
              alt={`Vehicle wrap example ${index + 1}`}
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