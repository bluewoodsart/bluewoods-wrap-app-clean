import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { CustomerData } from '@/types';

interface MergedVehicleStepProps {
  data: Partial<CustomerData>;
  setData: (data: Partial<CustomerData>) => void;
}

const MergedVehicleStep: React.FC<MergedVehicleStepProps> = ({ data, setData }) => {
  const [selectedVehicleTypes, setSelectedVehicleTypes] = useState<string[]>(data.vehicleTypes || []);
  const [otherDescription, setOtherDescription] = useState(data.otherVehicleDescription || '');

  const vehicleTypes = [
    'Passenger Car', 'SUV', 'Pickup Truck', 'Van', 'Commercial Vehicle',
    'Sports Car', 'Luxury Vehicle', 'RV', 'Motorhome', 'Food Truck',
    'Box Truck', 'Trailer – Cargo', 'Trailer – Race', 'Trailer – Utility',
    'Semi Truck', 'Tractor Cab', 'Boat', 'Marine Vessel (other)',
    'Jet Ski', 'Motorcycle', 'ATV', 'Golf Cart', 'Construction Equipment',
    'Other (describe)'
  ];

  const handleVehicleTypeChange = (type: string, checked: boolean) => {
    let updated;
    if (checked) {
      updated = [...selectedVehicleTypes, type];
    } else {
      updated = selectedVehicleTypes.filter(t => t !== type);
    }
    setSelectedVehicleTypes(updated);
    setData({...data, vehicleTypes: updated});
  };

  const handleOtherDescriptionChange = (value: string) => {
    setOtherDescription(value);
    setData({...data, otherVehicleDescription: value});
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚗 Vehicle Information & Type
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Vehicle Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Vehicle Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vehicleYear">Year</Label>
                <Input 
                  id="vehicleYear" 
                  placeholder="2020"
                  value={data.year || ''}
                  onChange={(e) => setData({...data, year: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="vehicleMake">Make</Label>
                <Input 
                  id="vehicleMake" 
                  placeholder="Toyota"
                  value={data.make || ''}
                  onChange={(e) => setData({...data, make: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="vehicleModel">Model</Label>
                <Input 
                  id="vehicleModel" 
                  placeholder="Camry"
                  value={data.model || ''}
                  onChange={(e) => setData({...data, model: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="vehicleColor">Current Color</Label>
                <Input 
                  id="vehicleColor" 
                  placeholder="White"
                  value={data.vehicleColor || ''}
                  onChange={(e) => setData({...data, vehicleColor: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Vehicle Types */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Vehicle Type(s)</h3>
            <p className="text-sm text-gray-600">
              Select all vehicle types that apply to your project:
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              {vehicleTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`vehicle-${type}`}
                    checked={selectedVehicleTypes.includes(type)}
                    onCheckedChange={(checked) => handleVehicleTypeChange(type, checked as boolean)}
                  />
                  <Label htmlFor={`vehicle-${type}`} className="text-sm cursor-pointer">
                    {type}
                  </Label>
                </div>
              ))}
            </div>
            
            {selectedVehicleTypes.includes('Other (describe)') && (
              <div className="mt-4">
                <Label htmlFor="other-description" className="text-sm font-medium">
                  Describe your other vehicle/item:
                </Label>
                <Textarea
                  id="other-description"
                  value={otherDescription}
                  onChange={(e) => handleOtherDescriptionChange(e.target.value)}
                  placeholder="Please describe your vehicle or item..."
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

export default MergedVehicleStep;