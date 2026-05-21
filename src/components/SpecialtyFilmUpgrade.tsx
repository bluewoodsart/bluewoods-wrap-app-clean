import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CustomerData } from '@/types';

interface SpecialtyFilmUpgradeProps {
  data: Partial<CustomerData>;
  setData: (data: Partial<CustomerData>) => void;
}

const SpecialtyFilmUpgrade: React.FC<SpecialtyFilmUpgradeProps> = ({ data, setData }) => {
  const [specialtyFilm, setSpecialtyFilm] = useState(data.specialtyFilm || '');

  const handleSpecialtyFilmChange = (value: string) => {
    setSpecialtyFilm(value);
    setData({...data, specialtyFilm: value});
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ✨ Specialty Film Upgrade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Would you like to upgrade your wrap with a specialty finish?
          </p>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              Options include metallic, chrome, matte, satin, reflective, carbon fiber, and more.
            </p>
          </div>
          
          <RadioGroup value={specialtyFilm} onValueChange={handleSpecialtyFilmChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="specialty-yes" />
              <Label htmlFor="specialty-yes" className="font-medium">
                • Yes – I want a Specialty Film
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="specialty-no" />
              <Label htmlFor="specialty-no" className="font-medium">
                • No – Standard film is fine
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpecialtyFilmUpgrade;