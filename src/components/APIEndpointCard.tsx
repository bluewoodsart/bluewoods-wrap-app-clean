import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy } from 'lucide-react';

interface APIEndpointCardProps {
  method: string;
  title: string;
  url: string;
  description: string;
  headers?: { [key: string]: string };
  body?: string;
}

export function APIEndpointCard({ method, title, url, description, headers, body }: APIEndpointCardProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'POST': return 'default';
      case 'GET': return 'secondary';
      case 'PUT': return 'destructive';
      case 'DELETE': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Badge variant={getMethodColor(method)}>{method}</Badge>
          {title}
        </CardTitle>
        <p className="text-sm text-gray-600">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-semibold">URL:</label>
          <div className="flex items-center gap-2 mt-1">
            <code className="bg-gray-100 px-3 py-2 rounded flex-1 text-sm">
              {url}
            </code>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => copyToClipboard(url)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {headers && (
          <div>
            <label className="text-sm font-semibold">Headers:</label>
            <div className="mt-2 space-y-2">
              {Object.entries(headers).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <code className="bg-gray-100 px-3 py-2 rounded flex-1 text-sm">
                    "{key}": "{value}"
                  </code>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => copyToClipboard(`"${key}": "${value}"`)} 
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {body && (
          <div>
            <label className="text-sm font-semibold">Body:</label>
            <div className="flex items-start gap-2 mt-2">
              <pre className="bg-gray-100 px-3 py-2 rounded flex-1 text-xs overflow-x-auto">
                {body}
              </pre>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => copyToClipboard(body)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}