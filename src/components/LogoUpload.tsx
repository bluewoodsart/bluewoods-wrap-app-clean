import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import FileUpload from './FileUpload';
import QRCodeGenerator from './QRCodeGenerator';
import { CustomerData } from '@/types';

interface LogoUploadProps {
  data: Partial<CustomerData>;
  setData: (data: Partial<CustomerData>) => void;
}

const LogoUpload: React.FC<LogoUploadProps> = ({ data, setData }) => {
  const [logoOption, setLogoOption] = useState(data.logoOption || '');
  const [hasQRCode, setHasQRCode] = useState(data.hasQRCode || '');
  const [qrCodeUrl, setQRCodeUrl] = useState(data.qrCodeUrl || '');

  const handleLogoOptionChange = (value: string) => {
    setLogoOption(value);
    setData({...data, logoOption: value});
    if (value === 'upload-later') {
      setData({...data, tags: [...(data.tags || []), 'logo-required-later']});
    }
  };

  const handleQRCodeChange = (value: string) => {
    setHasQRCode(value);
    setData({...data, hasQRCode: value});
  };

  const handleQRUrlChange = (url: string) => {
    setQRCodeUrl(url);
    setData({...data, qrCodeUrl: url});
  };

  return (
    <div className="space-y-6">
      {/* Logo Upload + Logo Design Option - Moved to top */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📎 Logo Upload + Logo Design Option
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <p className="font-medium text-blue-900 mb-2">❓ Do you have a logo for your wrap?</p>
          </div>
          
          <RadioGroup value={logoOption} onValueChange={handleLogoOptionChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="have-logo" id="have-logo" />
              <Label htmlFor="have-logo" className="font-medium">
                • Yes – I have a logo to upload
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="upload-later" id="upload-later" />
              <Label htmlFor="upload-later" className="font-medium">
                • No – I'll upload later
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="need-design" id="need-design" />
              <Label htmlFor="need-design" className="font-medium">
                • I need help designing a logo
              </Label>
            </div>
          </RadioGroup>
          
          {logoOption === 'have-logo' && (
            <div>
              <p className="text-gray-700 mb-4 font-medium">
                Upload your logos, branding files, photos, or QR codes:
              </p>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Please upload any of the following:</p>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• Logos (AI, EPS, PDF, SVG, TIFF, High-Res JPG)</li>
                  <li>• Brand guidelines or color swatches</li>
                  <li>• Product photos or other images</li>
                  <li>• QR codes for your business or promotions</li>
                </ul>
              </div>
              
              <FileUpload 
                onFilesUploaded={(files) => setData({...data, logoFiles: files})}
                quoteId={data.quoteId}
                acceptedTypes=".png,.svg,.ai,.pdf,.jpg,.jpeg,.eps,.tiff,.tif"
                maxFiles={10}
                title="Upload Your Files"
              />
              
              {(!data.logoFiles || data.logoFiles.length === 0) && (
                <div className="bg-yellow-50 p-3 rounded-lg mt-3">
                  <p className="text-yellow-800 text-sm">
                    No files uploaded yet. You can upload them later or send them to your selected shop.
                  </p>
                </div>
              )}
            </div>
          )}
          
          {logoOption === 'upload-later' && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-blue-800 text-sm">
                No problem! You can continue with your quote and upload logo files later. We've tagged your project so shops know a logo is needed.
              </p>
            </div>
          )}
          
          {logoOption === 'need-design' && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                Great! We'll include logo design support in your quote and follow up with our design team.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Option - Moved higher */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📱 QR Code Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700 font-medium">
            Do you already have a QR code file?
          </p>
          
          <RadioGroup value={hasQRCode} onValueChange={handleQRCodeChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="qr-yes" />
              <Label htmlFor="qr-yes">⭘ Yes – I'll upload my QR code</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="qr-no" />
              <Label htmlFor="qr-no">⭘ No – I'd like you to create a QR code for me</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="skip" id="qr-skip" />
              <Label htmlFor="qr-skip">⭘ Skip – No QR code needed</Label>
            </div>
          </RadioGroup>
          
          {hasQRCode === 'yes' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Please upload your QR code file above with your other branding materials.
              </p>
            </div>
          )}
          
          {hasQRCode === 'no' && (
            <div className="space-y-4">
              <QRCodeGenerator 
                initialUrl={qrCodeUrl}
                onUrlChange={handleQRUrlChange}
              />
            </div>
          )}
          
          {hasQRCode === 'skip' && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-gray-700 text-sm">
                No QR code will be included in your wrap design.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LogoUpload;