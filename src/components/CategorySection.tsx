import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';

interface CategorySectionProps {
  onCategorySelect: (category: string) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({ onCategorySelect }) => {
  const isMobile = useIsMobile();
  
  const categories = [
    {
      id: 'vehicle-wraps',
      title: 'Full Vehicle Wraps',
      description: 'Business or Personal',
      icon: '🚗',
      color: 'bg-blue-50 hover:bg-blue-100'
    },
    {
      id: 'paint-protection',
      title: 'Paint Protection Film',
      description: 'Clear Vehicle Wraps',
      icon: '🛡️',
      color: 'bg-green-50 hover:bg-green-100'
    },
    {
      id: 'window-lettering',
      title: 'Storefront Window Lettering',
      description: 'Professional signage',
      icon: '🏪',
      color: 'bg-purple-50 hover:bg-purple-100'
    },
    {
      id: 'monument-signs',
      title: 'Lighted, Channel Letter, or Monument Signs',
      description: 'Premium business signage',
      icon: '🏢',
      color: 'bg-orange-50 hover:bg-orange-100'
    },
    {
      id: 'yard-signs',
      title: 'Real Estate, Yard, and Directional Signs',
      description: 'Outdoor advertising',
      icon: '🏡',
      color: 'bg-red-50 hover:bg-red-100'
    },
    {
      id: 'banners',
      title: 'Banners and Event Backdrops',
      description: 'Large format displays',
      icon: '🎪',
      color: 'bg-yellow-50 hover:bg-yellow-100'
    },
    {
      id: 'digital-designs',
      title: 'Custom Digital Designs Only',
      description: 'Design files for your use',
      icon: '🎨',
      color: 'bg-pink-50 hover:bg-pink-100'
    }
  ];

  return (
    <div className={`space-y-4 ${
      isMobile ? 'px-4' : 'space-y-6'
    }`}>
      <h2 className={`font-bold text-center text-gray-900 ${
        isMobile ? 'text-xl' : 'text-2xl md:text-3xl'
      }`}>
        What can we help you create today?
      </h2>
      
      <div className={`grid gap-3 ${
        isMobile 
          ? 'grid-cols-1' 
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
      }`}>
        {categories.map((category) => (
          <Card 
            key={category.id} 
            className={`cursor-pointer transition-all duration-200 ${category.color} border-2 hover:border-gray-300`}
            onClick={() => onCategorySelect(category.id)}
          >
            <CardContent className={`text-center ${
              isMobile ? 'p-4' : 'p-6'
            }`}>
              <div className={`mb-2 ${
                isMobile ? 'text-2xl' : 'text-4xl mb-3'
              }`}>{category.icon}</div>
              <h3 className={`font-semibold mb-2 ${
                isMobile ? 'text-base' : 'text-lg'
              }`}>{category.title}</h3>
              <p className={`text-gray-600 ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>{category.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CategorySection;