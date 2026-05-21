import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check } from 'lucide-react';

const SUPABASE_URL = 'https://dqibkndlnavlovprrkwd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaWJrbmRsbmF2bG92cHJya3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUxNzI1MDIsImV4cCI6MjA1MDc0ODUwMn0.6ixjhzwKQSqrNHWqmOOdvBGOdGVZGlQJWXGCJBqBQSA';

export function JavaScriptExamples() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const jsExamples = [
    {
      title: 'Create Wrap Order (Fetch API)',
      description: 'Submit a new wrap order using JavaScript fetch',
      code: `const url = '${SUPABASE_URL}/rest/v1/wrap_orders';

const orderData = {
  customer_name: "John Doe",
  email: "john@example.com",
  phone: "404-555-1234",
  vehicle_year: "2022",
  vehicle_make: "Ford",
  vehicle_model: "Transit",
  vehicle_color: "White",
  vehicle_type: "Van",
  wrap_type: "full_wrap",
  partial_wrap_option: null,
  design_complexity: "complex",
  budget_range: "$2,000 – $5,000",
  photos_urls: [
    "${SUPABASE_URL}/storage/v1/object/public/uploads/photo1.png"
  ],
  artwork_urls: [
    "${SUPABASE_URL}/storage/v1/object/public/uploads/artwork1.pdf"
  ],
  logos_urls: [
    "${SUPABASE_URL}/storage/v1/object/public/uploads/logo1.svg"
  ],
  qr_code_url: "https://api.qrserver.com/v1/create-qr-code/?data=https://bluewoodsart.com&size=200x200",
  qr_code_text: "https://bluewoodsart.com",
  quote_summary: "John wants a full wrap with complex design.",
  shop_assigned: "Wrap Masters",
  order_status: "pending",
  notes: "Customer prefers matte finish."
};

fetch(url, {
  method: 'POST',
  headers: {
    'apikey': '${SUPABASE_ANON_KEY}',
    'Authorization': 'Bearer ${SUPABASE_ANON_KEY}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(orderData)
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error(error));`
    },
    {
      title: 'Fetch All Orders',
      description: 'Retrieve all wrap orders from the database',
      code: `fetch('${SUPABASE_URL}/rest/v1/wrap_orders', {
  method: 'GET',
  headers: {
    'apikey': '${SUPABASE_ANON_KEY}',
    'Authorization': 'Bearer ${SUPABASE_ANON_KEY}'
  }
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error(error));`
    },
    {
      title: 'Filter Orders by Status',
      description: 'Get orders with specific status using query parameters',
      code: `fetch('${SUPABASE_URL}/rest/v1/wrap_orders?order_status=eq.pending', {
  method: 'GET',
  headers: {
    'apikey': '${SUPABASE_ANON_KEY}',
    'Authorization': 'Bearer ${SUPABASE_ANON_KEY}'
  }
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error(error));`
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">JavaScript Examples</h2>
        <p className="text-gray-600">Ready-to-use JavaScript code for integrating with the Wrap Orders API</p>
      </div>
      
      {jsExamples.map((example, index) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {example.title}
                <Badge variant="outline">JavaScript</Badge>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(example.code, index)}
                className="flex items-center gap-2"
              >
                {copiedIndex === index ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedIndex === index ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <p className="text-sm text-gray-600">{example.description}</p>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-900 text-blue-400 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
              {example.code}
            </pre>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}