import React from 'react';

const TransactionsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Transactions</h3>
          <p className="card-description">
            Manage deposits, withdrawals, and financial transactions
          </p>
        </div>
        <div className="card-content">
          <div className="text-center py-12">
            <p className="text-gray-500">Transaction management interface will be implemented here</p>
            <p className="text-sm text-gray-400 mt-2">
              Features: Pending approvals, transaction history, bulk operations, fraud detection
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionsPage;