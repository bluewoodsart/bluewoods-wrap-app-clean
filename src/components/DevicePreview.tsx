import React from 'react';
import { Card } from './ui/card';
import { Monitor, Smartphone, Tablet } from 'lucide-react';

interface DevicePreviewProps {
  device: string;
  children: React.ReactNode;
}

const DevicePreview: React.FC<DevicePreviewProps> = ({ device, children }) => {
  const getDeviceFrame = () => {
    switch (device) {
      case 'iphone':
        return (
          <div className="relative mx-auto" style={{ width: '375px', height: '812px' }}>
            <div className="absolute inset-0 bg-black rounded-[3rem] p-2">
              <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-10"></div>
                <div className="w-full h-full overflow-auto">
                  {children}
                </div>
              </div>
            </div>
          </div>
        );
      case 'ipad':
        return (
          <div className="relative mx-auto" style={{ width: '768px', height: '1024px' }}>
            <div className="absolute inset-0 bg-gray-800 rounded-[2rem] p-4">
              <div className="w-full h-full bg-white rounded-[1.5rem] overflow-hidden">
                <div className="w-full h-full overflow-auto">
                  {children}
                </div>
              </div>
            </div>
          </div>
        );
      case 'mac':
        return (
          <div className="relative mx-auto" style={{ width: '1440px', height: '900px' }}>
            <div className="absolute inset-0 bg-gray-200 rounded-t-2xl p-1">
              <div className="w-full h-full bg-white rounded-t-xl overflow-hidden border">
                <div className="flex items-center justify-center h-8 bg-gray-100 border-b">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                </div>
                <div className="w-full h-full overflow-auto">
                  {children}
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <Card className="w-full max-w-4xl mx-auto">
            <div className="w-full overflow-auto">
              {children}
            </div>
          </Card>
        );
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      {getDeviceFrame()}
    </div>
  );
};

export default DevicePreview;