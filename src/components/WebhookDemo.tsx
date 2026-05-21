import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Upload, AlertCircle, Loader2 } from 'lucide-react';

const WebhookDemo: React.FC = () => {
  const [approveStatus, setApproveStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const handleApproveProof = async () => {
    setApproveStatus('loading');
    setStatusMessage('');
    
    try {
      const response = await fetch(
        'https://dqibkndlnavlovprrkwd.supabase.co/functions/v1/887b69db-6828-4bbd-a37f-41ad8607a49d',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project_id: 'proj_001',
            status_stage: 'proof_approved',
            approved_by: 'cust_001',
            timestamp: new Date().toISOString()
          })
        }
      );

      const result = await response.json();
      
      if (response.ok && result.success) {
        setApproveStatus('success');
        setStatusMessage(`Proof approved for project ${result.project_id}`);
      } else {
        setApproveStatus('error');
        setStatusMessage('Failed to approve proof');
      }
    } catch (error) {
      setApproveStatus('error');
      setStatusMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUploadFile = async () => {
    setUploadStatus('loading');
    setStatusMessage('');
    
    try {
      const response = await fetch(
        'https://dqibkndlnavlovprrkwd.supabase.co/functions/v1/f676ef34-6262-408d-a028-2d350a0106f9',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project_id: 'proj_001',
            file_url: 'https://cdn.example.com/files/logo.png',
            file_type: 'design_upload',
            uploaded_by: 'cust_001',
            timestamp: new Date().toISOString()
          })
        }
      );

      const result = await response.json();
      
      if (response.ok && result.success) {
        setUploadStatus('success');
        setStatusMessage(`File uploaded for project ${result.project_id}`);
      } else {
        setUploadStatus('error');
        setStatusMessage('Failed to upload file');
      }
    } catch (error) {
      setUploadStatus('error');
      setStatusMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getButtonIcon = (status: string) => {
    switch (status) {
      case 'loading': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Webhook Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleApproveProof}
              disabled={approveStatus === 'loading'}
              className={`h-auto p-4 ${approveStatus === 'success' ? 'bg-green-600 hover:bg-green-700' : approveStatus === 'error' ? 'bg-red-600 hover:bg-red-700' : ''}`}
            >
              <div className="flex items-center gap-2">
                {getButtonIcon(approveStatus)}
                <div className="text-left">
                  <div className="font-semibold">Approve Proof</div>
                  <div className="text-sm opacity-90">POST /webhook/project-status</div>
                </div>
              </div>
            </Button>

            <Button
              onClick={handleUploadFile}
              disabled={uploadStatus === 'loading'}
              variant="outline"
              className={`h-auto p-4 ${uploadStatus === 'success' ? 'bg-green-50 border-green-300' : uploadStatus === 'error' ? 'bg-red-50 border-red-300' : ''}`}
            >
              <div className="flex items-center gap-2">
                {getButtonIcon(uploadStatus) || <Upload className="h-4 w-4" />}
                <div className="text-left">
                  <div className="font-semibold">Upload File</div>
                  <div className="text-sm opacity-70">POST /webhook/upload-file</div>
                </div>
              </div>
            </Button>
          </div>

          {statusMessage && (
            <Alert className={approveStatus === 'error' || uploadStatus === 'error' ? 'border-red-200' : 'border-green-200'}>
              <AlertDescription className={approveStatus === 'error' || uploadStatus === 'error' ? 'text-red-800' : 'text-green-800'}>
                {statusMessage}
              </AlertDescription>
            </Alert>
          )}

          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-2">Status Indicators:</h3>
            <div className="flex gap-2">
              <Badge variant={approveStatus === 'success' ? 'default' : 'secondary'}>
                Approve: {approveStatus}
              </Badge>
              <Badge variant={uploadStatus === 'success' ? 'default' : 'secondary'}>
                Upload: {uploadStatus}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebhookDemo;