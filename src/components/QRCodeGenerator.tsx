import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface QRCodeGeneratorProps {
  initialUrl?: string;
  onUrlChange?: (url: string) => void;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ 
  initialUrl = '', 
  onUrlChange 
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    if (url.trim()) {
      const encodedUrl = encodeURIComponent(url.trim());
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?data=${encodedUrl}&size=200x200`);
    } else {
      setQrCodeUrl('');
    }
  }, [url]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    if (onUrlChange) {
      onUrlChange(newUrl);
    }
  };

  const handleDownload = async () => {
    if (!qrCodeUrl) return;
    
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'qr-code.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading QR code:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📱 QR Code Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="qr-url">Website URL or Text</Label>
          <Input
            id="qr-url"
            type="text"
            placeholder="https://example.com"
            value={url}
            onChange={handleUrlChange}
            className="w-full"
          />
        </div>
        
        {qrCodeUrl && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <img 
                src={qrCodeUrl} 
                alt="Generated QR Code" 
                className="border rounded-lg shadow-sm"
              />
            </div>
            
            <div className="flex justify-center">
              <Button onClick={handleDownload} variant="outline">
                📥 Download QR Code
              </Button>
            </div>
            
            <Alert>
              <AlertDescription>
                ⚠️ Make sure your website is live before printing this QR code.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QRCodeGenerator;