import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, Tablet, Monitor, Apple } from 'lucide-react';

interface DeviceSelectorProps {
  onDeviceSelect: (device: string) => void;
}

const DeviceSelector: React.FC<DeviceSelectorProps> = ({ onDeviceSelect }) => {
  const devices = [
    {
      id: 'iphone',
      name: 'iPhone',
      icon: <Smartphone className="w-12 h-12" />,
      description: 'Optimized for iPhone devices',
      apple: true
    },
    {
      id: 'ipad',
      name: 'iPad',
      icon: <Tablet className="w-12 h-12" />,
      description: 'Tablet-optimized experience',
      apple: true
    },
    {
      id: 'mac',
      name: 'Mac',
      icon: <Monitor className="w-12 h-12" />,
      description: 'Desktop Mac experience',
      apple: true
    },
    {
      id: 'web',
      name: 'Web Browser',
      icon: <Monitor className="w-12 h-12" />,
      description: 'Standard web experience',
      apple: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl mb-2">
              <Apple className="w-8 h-8 inline mr-2" />
              Choose Your Device
            </CardTitle>
            <p className="text-gray-600">
              Select your device type for the best experience
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {devices.map((device) => (
                <Card 
                  key={device.id} 
                  className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${device.apple ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200'}`}
                  onClick={() => onDeviceSelect(device.id)}
                >
                  <CardContent className="p-6 text-center">
                    <div className={`${device.apple ? 'text-blue-600' : 'text-gray-600'} mb-4 flex justify-center`}>
                      {device.icon}
                    </div>
                    <h3 className="font-semibold text-lg mb-2 flex items-center justify-center">
                      {device.apple && <Apple className="w-4 h-4 mr-1" />}
                      {device.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {device.description}
                    </p>
                    <Button 
                      className={`w-full ${device.apple ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeviceSelect(device.id);
                      }}
                    >
                      Select {device.name}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="mt-8 text-center">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">
                  <Apple className="w-5 h-5 inline mr-2" />
                  Apple Device Optimization
                </h4>
                <p className="text-sm text-blue-700">
                  This app is optimized for Apple devices with enhanced features for iPhone, iPad, and Mac users.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeviceSelector;