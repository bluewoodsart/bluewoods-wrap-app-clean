import React from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerFlow from '@/components/CustomerFlow';

const FullProject: React.FC = () => {
  const navigate = useNavigate();

  return (
    <CustomerFlow
      flowType="vehicle-wrap"
      onBack={() => navigate('/')}
    />
  );
};

export default FullProject;
