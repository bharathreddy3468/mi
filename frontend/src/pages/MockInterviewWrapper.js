// This is a wrapper component that renders the existing MockInterview functionality
// The actual mock interview is in App.js as separate components

import React from 'react';
import { useNavigate } from 'react-router-dom';

const MockInterviewWrapper = () => {
  const navigate = useNavigate();
  
  // Redirect to root where the actual mock interview is handled
  React.useEffect(() => {
    // If you want to keep mock interview separate, move the interview components here
    // For now, we'll show a message
    navigate('/', { state: { startMockInterview: true } });
  }, [navigate]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <p>Redirecting to Mock Interview...</p>
    </div>
  );
};

export default MockInterviewWrapper;
