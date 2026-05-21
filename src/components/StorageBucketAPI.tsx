import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload } from 'lucide-react';
import { APIEndpointCard } from './APIEndpointCard';

const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

export function StorageBucketAPI() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile || !fileName) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const uploadResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/uploads/${fileName}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: formData
      });
      
      const result = await uploadResponse.json();
      setResponse(JSON.stringify(result, null, 2));
    } catch (error) {
      setResponse(`Error: ${error}`);
    }
    setLoading(false);
  };

  const wrapOrderBody = `{
  "customer_name": "{{customer_name}}",
  "email": "{{email}}",
  "phone": "{{phone}}",
  "vehicle_year": "{{vehicle_year}}",
  "vehicle_make": "{{vehicle_make}}",
  "vehicle_model": "{{vehicle_model}}",
  "vehicle_color": "{{vehicle_color}}",
  "vehicle_type": "{{vehicle_type}}",
  "wrap_type": "{{wrap_type}}",
  "design_complexity": "{{design_complexity}}",
  "budget_range": "{{budget_range}}",
  "photos_urls": ["{{photo_url}}"],
  "artwork_urls": ["{{artwork_url}}"],
  "logos_urls": ["{{logo_url}}"],
  "qr_code_url": "{{qr_code_url}}",
  "qr_code_text": "{{qr_code_text}}",
  "quote_summary": "{{quote_summary}}",
  "shop_assigned": "{{shop_assigned}}",
  "order_status": "pending",
  "notes": "{{notes}}"
}`;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Storage & API Documentation</h1>
        
        <Tabs defaultValue="api" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="api">Wrap Orders API</TabsTrigger>
            <TabsTrigger value="storage">Storage Upload</TabsTrigger>
          </TabsList>
          
          <TabsContent value="api" className="space-y-6">
            <APIEndpointCard
              method="POST"
              title="Create Wrap Order"
              url={`${SUPABASE_URL}/rest/v1/wrap_orders`}
              description="Create a new wrap order in the database"
              headers={{
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
              }}
              body={wrapOrderBody}
            />
            
            <APIEndpointCard
              method="GET"
              title="Get Wrap Orders"
              url={`${SUPABASE_URL}/rest/v1/wrap_orders`}
              description="Retrieve all wrap orders from the database"
              headers={{
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
              }}
            />
          </TabsContent>
          
          <TabsContent value="storage">
            <div className="space-y-6">
              <APIEndpointCard
                method="POST"
                title="Upload to Storage Bucket"
                url={`${SUPABASE_URL}/storage/v1/object/uploads/{{filename}}`}
                description="Upload files to your Supabase storage bucket"
                headers={{
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }}
              />
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Test File Upload
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Select File to Upload</Label>
                    <Input 
                      type="file" 
                      onChange={handleFileSelect}
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label>File Name (optional override)</Label>
                    <Input 
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder="Enter custom filename"
                      className="mt-2"
                    />
                  </div>
                  
                  <Button 
                    onClick={uploadFile} 
                    disabled={!selectedFile || loading}
                    className="w-full"
                  >
                    {loading ? 'Uploading...' : 'Upload to Bucket'}
                  </Button>
                  
                  {response && (
                    <div>
                      <Label>Upload Response:</Label>
                      <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96 mt-2">
                        {response}
                      </pre>
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-600">
                    <p><strong>Public URL Pattern:</strong></p>
                    <code className="block bg-gray-100 px-2 py-1 rounded mt-1">
                      {SUPABASE_URL}/storage/v1/object/public/uploads/{{filename}}
                    </code>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}