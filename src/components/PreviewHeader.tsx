import React from 'react';
import { Button } from './ui/button';
import { Monitor, Smartphone, Tablet } from 'lucide-react';

interface PreviewHeaderProps {
  selectedDevice: string;
  onDeviceChange: (device: string) => void;
}

const PreviewHeader: React.FC<PreviewHeaderProps> = ({ selectedDevice, onDeviceChange }) => {
  const devices = [
    { id: 'web', label: 'Web', icon: Monitor },
    { id: 'iphone', label: 'iPhone', icon: Smartphone },
    { id: 'ipad', label: 'iPad', icon: Tablet },
    { id: 'mac', label: 'Mac', icon: Monitor }
  ];

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <h1 className="text-lg font-semibold text-gray-900">
          Vehicle Wrap & PPF Quoting Tool
        </h1>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 mr-3">Preview on device:</span>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {devices.map((device) => {
              const Icon = device.icon;
              return (
                <Button
                  key={device.id}
                  variant={selectedDevice === device.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onDeviceChange(device.id)}
                  className="flex items-center space-x-1 px-3 py-1.5"
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{device.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewHeader;