import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FileUpload from './FileUpload';
import { CustomerData, UploadedFile, VehiclePhotoFiles } from '@/types';

interface VehiclePhotoUploadProps {
  data: Partial<CustomerData>;
  setData: (data: Partial<CustomerData>) => void;
}

const photoSlots: Array<{
  key: keyof VehiclePhotoFiles;
  title: string;
  required: boolean;
  tags: string[];
}> = [
  {
    key: 'front',
    title: 'Front, straight on',
    required: true,
    tags: ['vehicle_photo', 'vehicle_front']
  },
  {
    key: 'rear',
    title: 'Rear, straight on',
    required: true,
    tags: ['vehicle_photo', 'vehicle_rear']
  },
  {
    key: 'driverSide',
    title: 'Driver side, straight on / 90 degrees',
    required: true,
    tags: ['vehicle_photo', 'vehicle_driver_side']
  },
  {
    key: 'passengerSide',
    title: 'Passenger side, straight on / 90 degrees',
    required: true,
    tags: ['vehicle_photo', 'vehicle_passenger_side']
  },
  {
    key: 'roof',
    title: 'Roof (optional)',
    required: false,
    tags: ['vehicle_photo', 'vehicle_roof']
  }
];

const VehiclePhotoUpload: React.FC<VehiclePhotoUploadProps> = ({ data, setData }) => {
  const updateVehiclePhotoSlot = (slotKey: keyof VehiclePhotoFiles, files: UploadedFile[]) => {
    const vehiclePhotoFiles = {
      ...(data.vehiclePhotoFiles ?? {}),
      [slotKey]: files
    };
    const vehiclePhotos = photoSlots.flatMap((slot) => vehiclePhotoFiles[slot.key] ?? []);

    setData({
      ...data,
      vehiclePhotoFiles,
      vehiclePhotos
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Vehicle Photos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="font-semibold text-blue-900">
              For the most accurate wrap proof, upload straight-on photos, not angled photos.
            </p>
            <p className="mt-1 text-sm text-blue-800">
              Required views help us estimate coverage and create cleaner proof layouts.
            </p>
          </div>

          <div className="grid gap-4">
            {photoSlots.map((slot) => (
              <div key={slot.key} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-medium text-slate-900">{slot.title}</h3>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                    slot.required ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {slot.required ? 'Required' : 'Optional'}
                  </span>
                </div>

                <FileUpload
                  onFilesUploaded={(files) => updateVehiclePhotoSlot(slot.key, files)}
                  quoteId={data.quoteId}
                  acceptedTypes="image/*"
                  maxFiles={2}
                  title="Choose Photo"
                  showCameraButton={true}
                  additionalTags={slot.tags}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VehiclePhotoUpload;
