import React from 'react';
import { QrCode, X } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

interface QRCodePreviewProps {
  url?: string;
}

const QRCodePreview: React.FC<QRCodePreviewProps> = ({ url = window.location.href }) => {
  // Add preview=true parameter to the URL for QR code
  const previewUrl = new URL(url);
  previewUrl.searchParams.set('preview', 'true');
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(previewUrl.toString())}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center space-x-2">
          <QrCode className="w-4 h-4" />
          <span>QR Code</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Preview on Device</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 p-4">
          <div className="bg-white p-4 rounded-lg border">
            <img 
              src={qrCodeUrl} 
              alt="QR Code for device preview" 
              className="w-48 h-48"
            />
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Scan this QR code with your mobile device to preview the application
            </p>
            <p className="text-xs text-gray-500 break-all">
              {previewUrl.toString()}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodePreview;