import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FileUpload from './FileUpload';
import { CustomerData } from '@/types';

interface VehiclePhotoUploadProps {
  data: Partial<CustomerData>;
  setData: (data: Partial<CustomerData>) => void;
}

const VehiclePhotoUpload: React.FC<VehiclePhotoUploadProps> = ({ data, setData }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📸 Specialty Vehicle Photo Upload (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            This step is only needed if your vehicle is non-standard, like a box truck, RV, food truck, shuttle bus, or anything that's been heavily modified.
          </p>
          
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <p className="text-amber-800 font-medium">
              ⚠️ Don't worry if you can't upload a photo now — just click "Next" below and we'll keep going.
            </p>
            <p className="text-amber-700 text-sm mt-2">
              If needed, we'll request additional photos later during the final quote process.
            </p>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="font-medium text-blue-800 mb-2">If you do upload photos, please include:</p>
            <ul className="space-y-2 text-sm text-blue-700">
              <li>• Clear side, front, and rear views</li>
              <li>• <strong>Straight-on photos</strong> — not at an angle</li>
              <li>• Step back and shoot directly from the side</li>
              <li>• Center the photo for front/rear shots</li>
              <li>• Use natural light and avoid shadows when possible</li>
            </ul>
          </div>
          
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-sm text-green-800">
              📎 You can upload any photos already saved on your phone.
            </p>
          </div>
          
          <h3 className="font-medium text-lg">Upload Vehicle Photos (Optional)</h3>
          <p className="text-gray-600 text-sm">
            Drag & drop files here, or click to select
          </p>
          
          <FileUpload 
            onFilesUploaded={(files) => setData({...data, vehiclePhotos: files})}
            quoteId={data.quoteId}
            acceptedTypes="image/*"
            maxFiles={6}
            title="Choose Files"
            showCameraButton={true}
          />
          
          {(!data.vehiclePhotos || data.vehiclePhotos.length === 0) && (
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-yellow-800 text-sm">
                No files uploaded yet. You can upload them later or send them to your selected shop.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VehiclePhotoUpload;