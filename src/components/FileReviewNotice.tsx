import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CustomerData, UploadedFile } from '@/types';
import FileUpload from './FileUpload';

interface FileReviewNoticeProps {
  data: Partial<CustomerData>;
  setData: (data: Partial<CustomerData>) => void;
}

const FileReviewNotice: React.FC<FileReviewNoticeProps> = ({ data, setData }) => {
  const handleFilesUploaded = (files: UploadedFile[]) => {
    setData({ ...data, artworkFiles: files, uploadedFiles: files });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            File Review and Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-gray-700">
            Upload anything that helps explain your wrap: artwork, AI generations, logos, screenshots, mockups, photos, PDFs, or inspiration images.
          </p>

          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div>
              <Label className="mb-3 block font-semibold text-slate-900">Do you already have a logo? *</Label>
              <RadioGroup
                value={data.logoServiceInterest || ''}
                onValueChange={(value) =>
                  setData({
                    ...data,
                    logoServiceInterest: value as CustomerData['logoServiceInterest']
                  })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="logo-yes" />
                  <Label htmlFor="logo-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="logo-no" />
                  <Label htmlFor="logo-no">No</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="not_sure" id="logo-not-sure" />
                  <Label htmlFor="logo-not-sure">Not Sure</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label className="mb-3 block font-semibold text-slate-900">Design Assistance Needed? *</Label>
              <RadioGroup
                value={data.designServiceLevel || ''}
                onValueChange={(value) =>
                  setData({
                    ...data,
                    designServiceLevel: value as CustomerData['designServiceLevel']
                  })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="artwork_ready" id="design-artwork-ready" />
                  <Label htmlFor="design-artwork-ready">I already have artwork</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="minor_help" id="design-minor-help" />
                  <Label htmlFor="design-minor-help">Minor design help</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="full_design" id="design-full-service" />
                  <Label htmlFor="design-full-service">Full design service</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="font-semibold text-blue-900">Use this upload area for files up to 50MB.</p>
            <p className="mt-1 text-sm text-blue-800">
              For large print-ready production files like full-size Illustrator, EPS, PSD, or high-resolution PDFs, send a smaller preview here first. We will follow up with a secure large-file upload link for the final artwork.
            </p>
          </div>

          <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4">
            <p className="font-semibold text-purple-900">AI-generated artwork is welcome.</p>
            <p className="mt-1 text-sm text-purple-800">
              If you made your idea with ChatGPT, Midjourney, Canva, Adobe Firefly, or another AI tool, upload it here. We can review it, clean it up, recreate missing detail, upscale it, and convert it into print-ready wrap files.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <span className="text-green-600 font-bold">OK</span>
              <div>
                <p className="text-green-800 font-medium">High Resolution Files</p>
                <p className="text-green-700 text-sm">
                  If your artwork is already high resolution, we'll check sizing, bleed, layout, and vehicle fit.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
              <span className="text-yellow-600 font-bold">FIX</span>
              <div>
                <p className="text-yellow-800 font-medium">Low Resolution or AI Files</p>
                <p className="text-yellow-700 text-sm">
                  If your file is small, blurry, or not print-ready, we can rebuild or enhance it so the final wrap looks sharp.
                </p>
              </div>
            </div>
          </div>

          <FileUpload
            title="Upload Artwork or Reference Files"
            quoteId={data.quoteId}
            acceptedTypes="image/*,.pdf,.ai,.eps,.svg,.psd"
            maxFiles={10}
            maxFileSizeMB={50}
            onFilesUploaded={handleFilesUploaded}
            additionalTags={['brand_asset', 'artwork_reference']}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default FileReviewNotice;
