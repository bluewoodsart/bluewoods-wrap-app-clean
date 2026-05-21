import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import ProjectDashboard from './ProjectDashboard';
import CustomerFlow from './CustomerFlow';

interface ProjectFlowProps {
  onBack: () => void;
}

type ViewState = 'selection' | 'dashboard' | 'ppf-flow' | 'vehicle-wrap-flow' | 'sign-flow';

const ProjectFlow: React.FC<ProjectFlowProps> = ({ onBack }) => {
  const [currentView, setCurrentView] = useState<ViewState>('selection');

  const projectTypes = [
    {
      id: 'vehicle_wrap',
      title: 'Vehicle Wrap Project',
      description: 'Full or partial vehicle wraps with design and installation',
      status: 'Active Projects: 3'
    },
    {
      id: 'ppf',
      title: 'Paint Protection Film (PPF)',
      description: 'Professional paint protection film installation',
      status: 'Active Projects: 1'
    },
    {
      id: 'signage',
      title: 'Signage Project',
      description: 'Custom signs and banners for business use',
      status: 'Active Projects: 2'
    },
    {
      id: 'sample_project',
      title: 'Sample Project (proj_001)',
      description: 'View the sample project with mock data',
      status: 'Status: Proof Sent'
    }
  ];

  const handleProjectSelect = (projectId: string) => {
    switch (projectId) {
      case 'sample_project':
        setCurrentView('dashboard');
        break;
      case 'vehicle_wrap':
        setCurrentView('vehicle-wrap-flow');
        break;
      case 'ppf':
        setCurrentView('ppf-flow');
        break;
      case 'signage':
        setCurrentView('sign-flow');
        break;
      default:
        console.log('Selected project type:', projectId);
    }
  };

  const handleBackToSelection = () => {
    setCurrentView('selection');
  };

  if (currentView === 'dashboard') {
    return (
      <div>
        <div className="mb-4">
          <Button 
            variant="ghost" 
            onClick={handleBackToSelection}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        </div>
        <ProjectDashboard />
      </div>
    );
  }

  if (currentView === 'vehicle-wrap-flow') {
    return <CustomerFlow onBack={handleBackToSelection} flowType="vehicle-wrap" />;
  }

  if (currentView === 'ppf-flow') {
    return <CustomerFlow onBack={handleBackToSelection} flowType="ppf" />;
  }

  if (currentView === 'sign-flow') {
    return <CustomerFlow onBack={handleBackToSelection} flowType="signage" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Homepage
          </Button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Project Management
          </h1>
          <p className="text-xl text-gray-600">
            Manage your vehicle wrap and signage projects
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {projectTypes.map((project) => (
            <Card 
              key={project.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-300"
              onClick={() => handleProjectSelect(project.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{project.title}</CardTitle>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{project.description}</p>
                <Badge variant="secondary">{project.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-auto p-4">
                  <div className="text-center">
                    <div className="font-semibold">Create New Project</div>
                    <div className="text-sm text-gray-500">Start a new wrap or sign project</div>
                  </div>
                </Button>
                <Button variant="outline" className="h-auto p-4">
                  <div className="text-center">
                    <div className="font-semibold">View All Projects</div>
                    <div className="text-sm text-gray-500">See complete project list</div>
                  </div>
                </Button>
                <Button variant="outline" className="h-auto p-4">
                  <div className="text-center">
                    <div className="font-semibold">Reports & Analytics</div>
                    <div className="text-sm text-gray-500">View project performance</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProjectFlow;