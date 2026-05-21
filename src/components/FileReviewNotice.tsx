import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const FileReviewNotice: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔍 File Review Notice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Every file you upload will go through a quick review by our expert team.
          </p>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <span className="text-green-600 font-bold">✅</span>
              <div>
                <p className="text-green-800 font-medium">High Resolution Files</p>
                <p className="text-green-700 text-sm">If your photo or artwork is at least 300 DPI (dots per inch), you're good to go for large prints or wraps.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
              <span className="text-yellow-600 font-bold">⚠️</span>
              <div>
                <p className="text-yellow-800 font-medium">Low Resolution Files</p>
                <p className="text-yellow-700 text-sm">
                  If your file is lower resolution, don't worry! We offer image upgrade services to recreate or clean up your design so it's print-ready and looks sharp.
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-800 text-sm">
              Whether it's a logo, screenshot, or photo, we'll make sure your final design looks great.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FileReviewNotice;