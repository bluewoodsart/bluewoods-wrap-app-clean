import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Store, Apple, ArrowLeft, Camera, Palette, Shield, HelpCircle } from 'lucide-react';

interface UserTypeSelectorProps {
  onUserTypeSelect: (userType: string) => void;
  onBack: () => void;
  selectedDevice: string;
}

export const UserTypeSelector: React.FC<UserTypeSelectorProps> = ({ 
  onUserTypeSelect, 
  onBack, 
  selectedDevice 
}) => {
  const getDeviceIcon = () => {
    switch (selectedDevice) {
      case 'iphone':
      case 'ipad':
      case 'mac':
        return <Apple className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getDeviceName = () => {
    switch (selectedDevice) {
      case 'iphone':
        return 'iPhone';
      case 'ipad':
        return 'iPad';
      case 'mac':
        return 'Mac';
      default:
        return 'Web';
    }
  };

  return (
    <div className="min-h-screen section-bg-primary relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="max-w-4xl mx-auto p-4 relative z-10">
        <Card className="glass-effect glow-effect border-white/20">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-white/20 to-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                {getDeviceIcon() || <Camera className="w-8 h-8 text-white" />}
              </div>
              <span className="ml-4 text-white/80 font-medium">
                Optimized for {getDeviceName()}
              </span>
            </div>
            <CardTitle className="text-4xl mb-4 text-white">
              🚗 Ready to Transform Your Vehicle?
            </CardTitle>
            <p className="text-white/80 text-lg">
              Welcome to your one-stop app for custom vehicle wraps, paint protection, and design.
            </p>
          </CardHeader>
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-semibold mb-6 text-white">Choose what you need:</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
              <Card 
                className="cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-105 card-gradient glow-effect"
                onClick={() => onUserTypeSelect('customer')}
              >
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <Palette className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gradient">🎨 Custom Vehicle Wraps</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Get a full or partial wrap to promote your business or give your vehicle a personal style. We'll guide you step-by-step and show you a preview.
                    </p>
                    <Button className="w-full btn-gradient">
                      → Start My Wrap Quote
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-105 card-gradient glow-effect"
                onClick={() => onUserTypeSelect('customer')}
              >
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gradient">🛡 Paint Protection Film</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Protect your vehicle's paint with an invisible layer that guards against rock chips, scratches, and daily wear.
                    </p>
                    <Button className="w-full btn-gradient-secondary">
                      → Get Protection Estimate
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-105 card-gradient glow-effect"
                onClick={() => onUserTypeSelect('shop')}
              >
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                      <Store className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gradient">🏪 Shop Owner Portal</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Set up pricing and manage customer quotes for your wrap shop with our professional tools.
                    </p>
                    <Button className="w-full btn-gradient-secondary">
                      Setup My Shop
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-gradient glow-effect">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-gray-500 to-slate-500 rounded-full flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gradient">📸 Upload Ready?</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    You'll be able to upload all your files and photos during the quote process. We accept images, screenshots, mockups, and more.
                  </p>
                  <p className="text-sm font-semibold text-gradient-secondary">
                    For real-time quote comparisons from local shops, activate full access for just $19.99.
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="text-center space-y-4">
              <Button variant="outline" onClick={() => onUserTypeSelect('help')} className="mr-4 glass-effect border-white/30 text-white hover:bg-white/10">
                <HelpCircle className="w-4 h-4 mr-2" />
                → Help Me Choose
              </Button>
              <Button variant="outline" onClick={onBack} className="glass-effect border-white/30 text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Change Device
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserTypeSelector;