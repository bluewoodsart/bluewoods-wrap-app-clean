import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CustomerData } from '@/types';

interface PartialWrapSelectorProps {
  data: Partial<CustomerData>;
  setData: (data: Partial<CustomerData>) => void;
}

const PartialWrapSelector: React.FC<PartialWrapSelectorProps> = ({ data, setData }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Partial Wrap Coverage</h2>
      <p className="text-gray-600">What coverage do you want for your partial wrap?</p>
      
      <RadioGroup 
        value={data.partialWrapType || ''} 
        onValueChange={(value) => setData({...data, partialWrapType: value})}
        className="space-y-3"
      >
        {[
          { id: '3/4-wrap', label: '¾ Wrap' },
          { id: '1/2-wrap', label: '½ Wrap' },
          { id: '1/4-wrap', label: '¼ Wrap' },
          { id: 'front-doors', label: 'Front Doors Only' },
          { id: 'back-window', label: 'Back Window Only' },
          { id: 'other', label: 'Other' }
        ].map(option => (
          <div key={option.id} className="border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <RadioGroupItem value={option.id} id={option.id} />
              <Label htmlFor={option.id} className="font-medium cursor-pointer">
                {option.label}
              </Label>
            </div>
          </div>
        ))}
      </RadioGroup>

      {data.partialWrapType === 'other' && (
        <div className="mt-4">
          <Label htmlFor="other-description">Please describe your custom coverage:</Label>
          <Textarea 
            id="other-description"
            placeholder="Describe the specific areas you want wrapped..."
            value={data.partialWrapDescription || ''}
            onChange={(e) => setData({...data, partialWrapDescription: e.target.value})}
            className="mt-2"
            rows={3}
          />
        </div>
      )}
    </div>
  );
};

export default PartialWrapSelector;