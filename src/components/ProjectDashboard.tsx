import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import WebhookDemo from './WebhookDemo';

const ProjectDashboard: React.FC = () => {
  // Mock data matching the provided examples
  const project = {
    project_id: 'proj_001',
    customer_id: 'cust_001',
    shop_id: 'shop_001',
    project_type: 'full_wrap',
    status_stage: 'proof_sent',
    current_step_description: 'Waiting for proof approval',
    created_at: '2025-06-25T10:00:00Z',
    updated_at: '2025-06-26T08:30:00Z'
  };

  const shopConfig = {
    shop_id: 'shop_001',
    grommet_price: 0.50,
    windhole_price: 0.50,
    lift_hourly_rate: 125,
    design_hourly_rate: 75,
    install_hourly_rate: 75,
    substrate_prices: {
      'Coroplast': 3.25,
      'Aluminum': 6.00
    }
  };

  const fixRequest = {
    job_id: 'proj_001',
    issue_summary: 'Print color mismatch on rear panel',
    map_id: 'rear',
    sqft_affected: 16,
    num_pieces: 2,
    error_cause: 'File exported in RGB',
    fix_due: '2025-06-28T14:00:00Z'
  };

  const clientAgreement = {
    job_id: 'proj_001',
    agreement_text: 'Wraps are not paint. Minor imperfections expected.',
    signature_image: 'https://uploads/signatures/proj_001.png',
    signed_at: '2025-06-25T12:00:00Z',
    initial_deposit: 500,
    payment_terms_acknowledged: true
  };

  const getStatusProgress = (status: string) => {
    const stages = ['quote_requested', 'quote_sent', 'proof_sent', 'approved', 'in_production', 'ready_install', 'completed'];
    const currentIndex = stages.indexOf(status);
    return ((currentIndex + 1) / stages.length) * 100;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Project Dashboard</h1>
        <p className="text-gray-600">Vehicle Wrap & Sign Management</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="agreements">Agreements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Project {project.project_id}
                <Badge className="bg-yellow-500">
                  {project.status_stage.replace('_', ' ').toUpperCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Current Status</label>
                  <p className="text-lg">{project.current_step_description}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Progress</label>
                  <Progress value={getStatusProgress(project.status_stage)} className="mt-2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Project Type</label>
                    <p className="capitalize">{project.project_type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Updated</label>
                    <p>{new Date(project.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <WebhookDemo />
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shop Pricing Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold">Labor Rates</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Design:</span>
                      <span>${shopConfig.design_hourly_rate}/hr</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Install:</span>
                      <span>${shopConfig.install_hourly_rate}/hr</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Lift:</span>
                      <span>${shopConfig.lift_hourly_rate}/hr</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold">Materials</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Grommet:</span>
                      <span>${shopConfig.grommet_price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Wind Hole:</span>
                      <span>${shopConfig.windhole_price}</span>
                    </div>
                    {Object.entries(shopConfig.substrate_prices).map(([material, price]) => (
                      <div key={material} className="flex justify-between">
                        <span>{material}:</span>
                        <span>${price}/sqft</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Alert className="border-red-200">
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-red-800">{fixRequest.issue_summary}</h3>
                  <Badge variant="destructive">Due: {new Date(fixRequest.fix_due).toLocaleDateString()}</Badge>
                </div>
                <p><strong>Area:</strong> {fixRequest.map_id} ({fixRequest.sqft_affected} sqft, {fixRequest.num_pieces} pieces)</p>
                <p><strong>Cause:</strong> {fixRequest.error_cause}</p>
              </div>
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="agreements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Agreement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Agreement Terms</label>
                  <p className="mt-1">{clientAgreement.agreement_text}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Initial Deposit</label>
                    <p className="text-lg font-semibold">${clientAgreement.initial_deposit}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Signed Date</label>
                    <p>{new Date(clientAgreement.signed_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={clientAgreement.payment_terms_acknowledged ? "default" : "secondary"}>
                    {clientAgreement.payment_terms_acknowledged ? "Terms Acknowledged" : "Pending Acknowledgment"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectDashboard;