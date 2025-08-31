import React from 'react';

const UsersPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Users Management</h3>
          <p className="card-description">
            Manage user accounts, balances, and permissions
          </p>
        </div>
        <div className="card-content">
          <div className="text-center py-12">
            <p className="text-gray-500">Users management interface will be implemented here</p>
            <p className="text-sm text-gray-400 mt-2">
              Features: User list, balance adjustments, account status management
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;