import React from 'react';

const RoundsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Game Rounds</h3>
          <p className="card-description">
            View game round history and statistics
          </p>
        </div>
        <div className="card-content">
          <div className="text-center py-12">
            <p className="text-gray-500">Game rounds interface will be implemented here</p>
            <p className="text-sm text-gray-400 mt-2">
              Features: Round history, winning patterns, round details, manual controls
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoundsPage;