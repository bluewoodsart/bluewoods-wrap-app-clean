import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CustomerData } from '@/types';

interface ArtworkUploadProps {
  data: Partial<CustomerData>;
  setData: (data: Partial<CustomerData>) => void;
}

const ArtworkUpload: React.FC<ArtworkUploadProps> = ({ data, setData }) => {
  const [hasArtwork, setHasArtwork] = useState(data.hasArtwork || '');

  const handleArtworkChange = (value: string) => {
    setHasArtwork(value);
    setData({...data, hasArtwork: value});
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎨 Do You Already Have Wrap Artwork?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700 font-medium">
            Let us know if you already have print-ready artwork that matches your vehicle.
          </p>
          
          <RadioGroup value={hasArtwork} onValueChange={handleArtworkChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="artwork-yes" />
              <Label htmlFor="artwork-yes">
                <div className="font-medium">Yes, I have my own artwork</div>
                <div className="text-sm text-gray-600 mt-1">
                  (We'll check if it's ready to print and fits your vehicle layout)
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="artwork-no" />
              <Label htmlFor="artwork-no">
                <div className="font-medium">No, I need help designing it</div>
                <div className="text-sm text-gray-600 mt-1">
                  (We'll guide you through options, and a design fee will be included in your quote based on complexity)
                </div>
              </Label>
            </div>
          </RadioGroup>
          
          <div className="bg-blue-50 p-4 rounded-lg mt-4">
            <p className="text-blue-800 text-sm flex items-center gap-2">
              💡 You'll be able to upload files or request design help after your quote is created.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArtworkUpload;