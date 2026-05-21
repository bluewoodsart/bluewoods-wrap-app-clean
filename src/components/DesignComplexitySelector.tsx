import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomerData } from '@/types';

interface DesignComplexitySelectorProps {
  data: Partial<CustomerData>;
  setData: (data: Partial<CustomerData>) => void;
}

const DesignComplexitySelector: React.FC<DesignComplexitySelectorProps> = ({ data, setData }) => {
  const complexityOptions = [
    {
      id: 'Vinyl Cut Letters',
      title: '🔹 Vinyl Cut Letters (Most Affordable)',
      description: 'Simple text using pre-colored vinyl — no printing involved. Great for phone numbers, DOT numbers, or basic business names on vehicles.',
      idealFor: [
        'Vehicle DOT compliance lettering',
        'Business name on vehicle doors',
        'Phone number decals for vehicles',
        'Vehicle identification numbers'
      ],
      note: '💵 This is the most budget-friendly option.'
    },
    {
      id: 'Simple Design',
      title: '🔹 Simple Design',
      description: 'Includes your logo, 1–2 colors, and basic layout. No illustrations or detailed elements.',
      idealFor: [
        'Vehicle business branding',
        'Simple vehicle wraps',
        'Clean vehicle graphics'
      ]
    },
    {
      id: 'Medium Complexity',
      title: '🔹 Medium Complexity',
      description: 'Includes illustrations, multiple images, or layered graphics. Often full-color.',
      idealFor: [
        'Promotional vehicle wraps',
        'Vehicle advertising campaigns',
        'Multi-section vehicle graphics'
      ]
    },
    {
      id: 'Custom Full Vehicle Wraps',
      title: '🎨 Custom Full Vehicle Wraps',
      description: 'Hand-drawn, artistic, or large-scale creative designs that require extra layout time.',
      idealFor: [
        'Show car wraps',
        'Custom vehicle artwork',
        'Artistic vehicle wraps',
        'Creative vehicle advertising'
      ]
    }
  ];

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">🎨 Let's talk about your design needs.</h2>
        <p className="text-gray-600">
          To help us give you an accurate quote, choose the level of design complexity that best matches what you're looking for:
        </p>
      </div>

      <div className="space-y-4">
        {complexityOptions.map((option) => (
          <Card 
            key={option.id} 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              data.designComplexity === option.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
            }`}
            onClick={() => setData({ ...data, designComplexity: option.id })}
          >
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-2">{option.title}</h3>
              <p className="text-gray-700 mb-3">{option.description}</p>
              
              <div className="mb-3">
                <p className="text-sm font-medium text-green-700 mb-1">🟢 Ideal for:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {option.idealFor.map((item, index) => (
                    <li key={index}>- {item}</li>
                  ))}
                </ul>
              </div>
              
              {option.note && (
                <p className="text-sm italic text-blue-600">{option.note}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-gray-100 p-4 rounded-lg text-center">
        <p className="text-sm text-gray-700">
          🧠 Not sure which to pick? Select the closest match and we'll confirm during the design review.
        </p>
        <p className="text-sm text-gray-700 mt-2">
          Once you choose, we'll factor this into your quote automatically.
        </p>
      </div>
    </div>
  );
};

export default DesignComplexitySelector;