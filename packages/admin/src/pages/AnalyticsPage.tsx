import React from 'react';

const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Analytics & Reports</h3>
          <p className="card-description">
            Detailed analytics and business intelligence
          </p>
        </div>
        <div className="card-content">
          <div className="text-center py-12">
            <p className="text-gray-500">Analytics dashboard will be implemented here</p>
            <p className="text-sm text-gray-400 mt-2">
              Features: Revenue charts, user behavior, betting patterns, profit/loss analysis
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;