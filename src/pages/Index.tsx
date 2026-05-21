import React from 'react';
import AppLayout from '@/components/AppLayout';
import { AppProvider } from '@/contexts/AppContext';

interface IndexProps {
  isPreviewMode?: boolean;
}

const Index: React.FC<IndexProps> = ({ isPreviewMode = false }) => {
  return (
    <AppProvider>
      <AppLayout isPreviewMode={isPreviewMode} />
    </AppProvider>
  );
};

export default Index;