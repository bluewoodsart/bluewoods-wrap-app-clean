import React from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerFlow from '@/components/CustomerFlow';
import { getRepAwareBackTarget } from '@/lib/repTracking';

const FullProject: React.FC = () => {
  const navigate = useNavigate();
  const handleBack = () => {
    navigate(getRepAwareBackTarget());
  };

  return (
    <CustomerFlow
      flowType="vehicle-wrap"
      onBack={handleBack}
    />
  );
};

export default FullProject;
