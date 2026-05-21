import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CurlExamples } from './CurlExamples';
import { JavaScriptExamples } from './JavaScriptExamples';

const SUPABASE_URL = 'https://dqibkndlnavlovprrkwd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaWJrbmRsbmF2bG92cHJya3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUxNzI1MDIsImV4cCI6MjA1MDc0ODUwMn0.6ixjhzwKQSqrNHWqmOOdvBGOdGVZGlQJWXGCJBqBQSA';

export function APIDocumentation() {
  const endpoints = [
    {
      method: 'POST',
      path: '/rest/v1/wrap_orders',
      description: 'Create a new wrap order',
      headers: ['apikey', 'Authorization', 'Content-Type']
    },
    {
      method: 'GET',
      path: '/rest/v1/wrap_orders',
      description: 'Retrieve all wrap orders',
      headers: ['apikey', 'Authorization']
    },
    {
      method: 'GET',
      path: '/rest/v1/wrap_orders?order_status=eq.pending',
      description: 'Filter orders by status',
      headers: ['apikey', 'Authorization']
    }
  ];

  const fields = [
    { name: 'customer_name', type: 'text', description: 'Customer full name' },
    { name: 'email', type: 'text', description: 'Customer email address' },
    { name: 'phone', type: 'text', description: 'Customer phone number' },
    { name: 'vehicle_year', type: 'text', description: 'Vehicle year' },
    { name: 'vehicle_make', type: 'text', description: 'Vehicle manufacturer' },
    { name: 'vehicle_model', type: 'text', description: 'Vehicle model' },
    { name: 'vehicle_color', type: 'text', description: 'Vehicle color' },
    { name: 'vehicle_type', type: 'text', description: 'Type: car, truck, van, etc.' },
    { name: 'wrap_type', type: 'text', description: 'full_wrap, partial_wrap, design_only' },
    { name: 'partial_wrap_option', type: 'text', description: 'half_wrap, quarter_wrap, doors_only' },
    { name: 'design_complexity', type: 'text', description: 'simple, complex, vinyl_letters' },
    { name: 'budget_range', type: 'text', description: 'Customer budget range' },
    { name: 'photos_urls', type: 'text[]', description: 'Array of photo URLs' },
    { name: 'artwork_urls', type: 'text[]', description: 'Array of artwork URLs' },
    { name: 'logos_urls', type: 'text[]', description: 'Array of logo URLs' },
    { name: 'qr_code_url', type: 'text', description: 'Generated QR code image URL' },
    { name: 'qr_code_text', type: 'text', description: 'Text encoded in QR code' },
    { name: 'quote_summary', type: 'text', description: 'Summary of the quote' },
    { name: 'shop_assigned', type: 'text', description: 'Assigned shop name' },
    { name: 'order_status', type: 'text', description: 'pending, in_progress, completed' },
    { name: 'notes', type: 'text', description: 'Additional notes' }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Base URL</h3>
              <code className="bg-gray-100 px-2 py-1 rounded">{SUPABASE_URL}</code>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Authentication</h3>
              <p className="text-sm text-gray-600 mb-2">Include these headers in all requests:</p>
              <div className="space-y-1">
                <code className="block bg-gray-100 px-2 py-1 rounded text-sm">apikey: {SUPABASE_ANON_KEY}</code>
                <code className="block bg-gray-100 px-2 py-1 rounded text-sm">Authorization: Bearer {SUPABASE_ANON_KEY}</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {endpoints.map((endpoint, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={endpoint.method === 'POST' ? 'default' : 'secondary'}>
                    {endpoint.method}
                  </Badge>
                  <code className="text-sm">{endpoint.path}</code>
                </div>
                <p className="text-sm text-gray-600">{endpoint.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Schema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Field</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2 font-mono">{field.name}</td>
                    <td className="p-2">
                      <Badge variant="outline">{field.type}</Badge>
                    </td>
                    <td className="p-2 text-gray-600">{field.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="curl" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="curl">cURL Examples</TabsTrigger>
          <TabsTrigger value="javascript">JavaScript Examples</TabsTrigger>
        </TabsList>
        
        <TabsContent value="curl">
          <CurlExamples />
        </TabsContent>
        
        <TabsContent value="javascript">
          <JavaScriptExamples />
        </TabsContent>
      </Tabs>
    </div>
  );
}