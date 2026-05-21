import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Copy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { APIDocumentation } from './APIDocumentation';

interface WrapOrder {
  customer_name?: string;
  email?: string;
  phone?: string;
  vehicle_year?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  vehicle_type?: string;
  wrap_type?: string;
  partial_wrap_option?: string;
  design_complexity?: string;
  budget_range?: string;
  photos_urls?: string[];
  artwork_urls?: string[];
  logos_urls?: string[];
  qr_code_url?: string;
  qr_code_text?: string;
  quote_summary?: string;
  shop_assigned?: string;
  order_status?: string;
  notes?: string;
}

export function WrapOrderAPI() {
  const [order, setOrder] = useState<WrapOrder>({
    customer_name: 'Ashley Bussey',
    email: 'ash@bluewoodsart.com',
    vehicle_year: '2020',
    vehicle_make: 'Toyota',
    vehicle_model: 'Camry',
    vehicle_color: 'White',
    vehicle_type: 'Passenger Car',
    wrap_type: 'Partial Wrap',
    partial_wrap_option: 'Half Wrap',
    design_complexity: 'Complex',
    budget_range: '$2,000 - $5,000',
    qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?data=https://bluewoodsart.com&size=200x200',
    qr_code_text: 'https://bluewoodsart.com',
    quote_summary: 'Full wrap with complex design on Toyota Camry',
    shop_assigned: null,
    order_status: 'pending',
    notes: 'Customer wants fast turnaround.'
  });
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const templateJSON = `{
  "customer_name": "{{customer_name}}",
  "email": "{{email}}",
  "vehicle_year": "{{vehicle_year}}",
  "vehicle_make": "{{vehicle_make}}",
  "vehicle_model": "{{vehicle_model}}",
  "vehicle_color": "{{vehicle_color}}",
  "vehicle_type": "{{vehicle_type}}",
  "wrap_type": "{{wrap_type}}",
  "partial_wrap_option": "{{partial_wrap_option}}",
  "design_complexity": "{{design_complexity}}",
  "budget_range": "{{budget_range}}",
  "photos_urls": {{vehicle_photos}},
  "artwork_urls": {{artwork_files}},
  "logos_urls": {{logo_files}},
  "qr_code_url": "{{qr_code_url}}",
  "qr_code_text": "{{qr_code_text}}",
  "quote_summary": "{{quote_summary}}",
  "shop_assigned": "{{shop_assigned}}",
  "order_status": "pending",
  "notes": "{{notes}}"
}`;

  const sampleJSON = `{
  "customer_name": "Ashley Bussey",
  "email": "ash@bluewoodsart.com",
  "vehicle_year": "2020",
  "vehicle_make": "Toyota",
  "vehicle_model": "Camry",
  "vehicle_color": "White",
  "vehicle_type": "Passenger Car",
  "wrap_type": "Partial Wrap",
  "partial_wrap_option": "Half Wrap",
  "design_complexity": "Complex",
  "budget_range": "$2,000 - $5,000",
  "photos_urls": [
    "https://mycdn.com/side.png",
    "https://mycdn.com/front.png"
  ],
  "artwork_urls": [
    "https://mycdn.com/artwork1.pdf"
  ],
  "logos_urls": [
    "https://mycdn.com/logo.svg"
  ],
  "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?data=https://bluewoodsart.com&size=200x200",
  "qr_code_text": "https://bluewoodsart.com",
  "quote_summary": "Full wrap with complex design on Toyota Camry",
  "shop_assigned": null,
  "order_status": "pending",
  "notes": "Customer wants fast turnaround."
}`;

  const headersTemplate = `{
  "apikey": "YOUR_SUPABASE_ANON_KEY",
  "Authorization": "Bearer YOUR_SUPABASE_ANON_KEY",
  "Content-Type": "application/json"
}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wrap_orders')
        .insert([{
          ...order,
          photos_urls: ['https://mycdn.com/side.png', 'https://mycdn.com/front.png'],
          artwork_urls: ['https://mycdn.com/artwork1.pdf'],
          logos_urls: ['https://mycdn.com/logo.svg']
        }])
        .select();
      
      if (error) throw error;
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponse(`Error: ${error}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Wrap Orders API</h1>
        
        <Tabs defaultValue="template" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="template">Template</TabsTrigger>
            <TabsTrigger value="sample">Sample</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            <TabsTrigger value="test">API Tester</TabsTrigger>
            <TabsTrigger value="docs">Documentation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="template">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>POST Request Body Template</span>
                  <Badge variant="secondary">JSON</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="absolute top-2 right-2 z-10"
                    onClick={() => copyToClipboard(templateJSON)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96 pr-16">
                    {templateJSON}
                  </pre>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  <p><strong>HTTP Method:</strong> POST</p>
                  <p><strong>Endpoint:</strong> https://dqibkndlnavlovprrkwd.supabase.co/rest/v1/wrap_orders</p>
                  <p className="mt-2"><strong>Array Handling:</strong> photos_urls, artwork_urls, and logos_urls must be JSON arrays like ["url1","url2"]</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="sample">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Complete Sample Payload</span>
                  <Badge variant="secondary">Example</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="absolute top-2 right-2 z-10"
                    onClick={() => copyToClipboard(sampleJSON)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96 pr-16">
                    {sampleJSON}
                  </pre>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  <p><strong>Note:</strong> This shows how arrays should be formatted as proper JSON arrays</p>
                  <p><strong>Arrays:</strong> photos_urls, artwork_urls, logos_urls are properly formatted as JSON arrays</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="headers">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Required Headers</span>
                  <Badge variant="secondary">POST</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="absolute top-2 right-2 z-10"
                    onClick={() => copyToClipboard(headersTemplate)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96 pr-16">
                    {headersTemplate}
                  </pre>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  <p><strong>Note:</strong> Replace YOUR_SUPABASE_ANON_KEY with your actual Supabase anonymous key</p>
                  <p><strong>Content-Type:</strong> application/json is required for POST requests</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="test">
            <Card>
              <CardHeader>
                <CardTitle>Test Wrap Orders API</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Customer Name</Label>
                    <Input 
                      value={order.customer_name || ''}
                      onChange={(e) => setOrder({...order, customer_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input 
                      value={order.email || ''}
                      onChange={(e) => setOrder({...order, email: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Vehicle Year</Label>
                    <Input 
                      value={order.vehicle_year || ''}
                      onChange={(e) => setOrder({...order, vehicle_year: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Vehicle Make</Label>
                    <Input 
                      value={order.vehicle_make || ''}
                      onChange={(e) => setOrder({...order, vehicle_make: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Vehicle Model</Label>
                    <Input 
                      value={order.vehicle_model || ''}
                      onChange={(e) => setOrder({...order, vehicle_model: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Notes</Label>
                  <Textarea 
                    value={order.notes || ''}
                    onChange={(e) => setOrder({...order, notes: e.target.value})}
                  />
                </div>
                
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Creating...' : 'Test API Call'}
                </Button>
                
                {response && (
                  <div>
                    <Label>API Response:</Label>
                    <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                      {response}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="docs">
            <APIDocumentation />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}