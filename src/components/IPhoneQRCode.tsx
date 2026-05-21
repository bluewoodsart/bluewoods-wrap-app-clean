import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, Download, Share2 } from 'lucide-react';

interface IPhoneQRCodeProps {
  url?: string;
}

const IPhoneQRCode: React.FC<IPhoneQRCodeProps> = ({ 
  url = window.location.href 
}) => {
  // Create iPhone-optimized URL
  const iPhoneUrl = new URL(url);
  iPhoneUrl.searchParams.set('device', 'iphone');
  iPhoneUrl.searchParams.set('mobile', 'true');
  
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(iPhoneUrl.toString())}`;

  const handleDownload = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'iphone-qr-code.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading QR code:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Scan with iPhone',
          text: 'Scan this QR code with your iPhone',
          url: iPhoneUrl.toString()
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Smartphone className="w-5 h-5" />
          iPhone QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <img 
              src={qrCodeUrl} 
              alt="QR Code for iPhone" 
              className="w-64 h-64"
            />
          </div>
        </div>
        
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            📱 Scan with your iPhone camera or QR code reader
          </p>
          <p className="text-xs text-gray-500 break-all px-2">
            {iPhoneUrl.toString()}
          </p>
        </div>
        
        <div className="flex gap-2 justify-center">
          <Button onClick={handleDownload} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          {navigator.share && (
            <Button onClick={handleShare} variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default IPhoneQRCode;