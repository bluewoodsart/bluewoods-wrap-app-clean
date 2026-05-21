import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CustomerData } from '@/types';

interface VehicleTypeSelectorProps {
  data: Partial<CustomerData>;
  setData: (data: Partial<CustomerData>) => void;
}

const VehicleTypeSelector: React.FC<VehicleTypeSelectorProps> = ({ data, setData }) => {
  const [vehicleType, setVehicleType] = useState(data.vehicleType || '');
  const [otherDescription, setOtherDescription] = useState(data.otherVehicleDescription || '');

  const handleVehicleTypeChange = (value: string) => {
    setVehicleType(value);
    setData({...data, vehicleType: value});
  };

  const handleOtherDescriptionChange = (value: string) => {
    setOtherDescription(value);
    setData({...data, otherVehicleDescription: value});
  };

  const vehicleOptions = [
    { value: 'van', label: 'Van' },
    { value: 'sports-car', label: 'Sports Car' },
    { value: 'luxury-vehicle', label: 'Luxury Vehicle' },
    { value: 'rv', label: 'RV' },
    { value: 'motorhome', label: 'Motorhome' },
    { value: 'food-truck', label: 'Food Truck' },
    { value: 'box-truck', label: 'Box Truck' },
    { value: 'trailer-cargo', label: 'Trailer – Cargo' },
    { value: 'trailer-race', label: 'Trailer – Race' },
    { value: 'trailer-utility', label: 'Trailer – Utility' },
    { value: 'semi-truck', label: 'Semi Truck' },
    { value: 'boat', label: 'Boat' },
    { value: 'jet-ski', label: 'Jet Ski' },
    { value: 'motorcycle', label: 'Motorcycle' },
    { value: 'atv', label: 'ATV' },
    { value: 'golf-cart', label: 'Golf Cart' },
    { value: 'construction-equipment', label: 'Construction Equipment' },
    { value: 'other', label: 'Other (describe)' }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚗 Vehicle Type
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Select your vehicle type:
            </Label>
            <RadioGroup value={vehicleType} onValueChange={handleVehicleTypeChange}>
              <div className="grid grid-cols-2 gap-3">
                {vehicleOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label htmlFor={option.value} className="text-sm cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
            
            {vehicleType === 'other' && (
              <div className="mt-4">
                <Label htmlFor="other-description" className="text-sm font-medium">
                  Describe your vehicle:
                </Label>
                <Input
                  id="other-description"
                  value={otherDescription}
                  onChange={(e) => handleOtherDescriptionChange(e.target.value)}
                  placeholder="Please describe your vehicle..."
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VehicleTypeSelector;