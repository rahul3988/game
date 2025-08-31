import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Wallet,
  CreditCard,
  Smartphone
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { paymentService } from '../services/paymentService';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '@win5x/common';

const WithdrawPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [accountDetails, setAccountDetails] = useState({
    upiId: '',
    phoneNumber: '',
    accountNumber: '',
    ifscCode: '',
    walletAddress: '',
  });
  const [step, setStep] = useState<'form' | 'success'>('form');

  const paymentMethods = [
    { id: 'upi', name: 'UPI', icon: '📱', fields: ['upiId'] },
    { id: 'bank', name: 'Bank Account', icon: '🏦', fields: ['accountNumber', 'ifscCode'] },
    { id: 'phonepe', name: 'PhonePe', icon: '📱', fields: ['phoneNumber'] },
    { id: 'googlepay', name: 'Google Pay', icon: '💳', fields: ['upiId'] },
    { id: 'paytm', name: 'Paytm', icon: '💰', fields: ['phoneNumber'] },
    { id: 'usdt', name: 'USDT', icon: '₿', fields: ['walletAddress'] },
  ];

  const createWithdrawalMutation = useMutation({
    mutationFn: (data: {
      amount: number;
      paymentMethod: string;
      accountDetails: any;
    }) => paymentService.createWithdrawalRequest(data),
    onSuccess: () => {
      setStep('success');
      queryClient.invalidateQueries({ queryKey: ['user-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to submit withdrawal request');
    },
  });

  const handleSubmit = () => {
    const amountNum = parseFloat(amount);
    
    if (!user || amountNum > user.balance) {
      toast.error('Insufficient balance');
      return;
    }
    
    if (amountNum < 100) {
      toast.error('Minimum withdrawal amount is ₹100');
      return;
    }
    
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    const selectedMethod = paymentMethods.find(m => m.id === paymentMethod);
    if (!selectedMethod) return;

    // Validate required fields
    const missingFields = selectedMethod.fields.filter(field => 
      !accountDetails[field as keyof typeof accountDetails]?.trim()
    );

    if (missingFields.length > 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Filter only relevant account details
    const relevantDetails = selectedMethod.fields.reduce((acc, field) => {
      acc[field] = accountDetails[field as keyof typeof accountDetails];
      return acc;
    }, {} as any);

    createWithdrawalMutation.mutate({
      amount: amountNum,
      paymentMethod: selectedMethod.name,
      accountDetails: relevantDetails,
    });
  };

  const resetForm = () => {
    setAmount('');
    setPaymentMethod('');
    setAccountDetails({
      upiId: '',
      phoneNumber: '',
      accountNumber: '',
      ifscCode: '',
      walletAddress: '',
    });
    setStep('form');
  };

  const selectedMethodObj = paymentMethods.find(m => m.id === paymentMethod);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {step === 'success' && (
              <button
                onClick={() => window.history.back()}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white">Withdraw Funds</h1>
              <p className="text-gray-400">Withdraw money from your Win5x wallet</p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-gray-400 text-sm">Available Balance</p>
            <p className="text-2xl font-bold text-green-400">
              {formatCurrency(user?.balance || 0)}
            </p>
          </div>
        </div>

        {/* Form */}
        {step === 'form' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Withdrawal Request</h3>
                <p className="card-description">
                  Enter withdrawal details below
                </p>
              </div>
              
              <div className="card-content space-y-6">
                {/* Amount Input */}
                <div>
                  <label className="form-label">Withdrawal Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">₹</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="form-input pl-8"
                      placeholder="Enter amount to withdraw"
                      min="100"
                      max={user?.balance || 0}
                    />
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Min: ₹100 | Available: {formatCurrency(user?.balance || 0)}
                  </p>
                </div>

                {/* Payment Method Selection */}
                <div>
                  <label className="form-label">Payment Method</label>
                  <div className="grid grid-cols-2 gap-3">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          paymentMethod === method.id
                            ? 'border-gold-500 bg-gold-500/10'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-2">{method.icon}</div>
                          <p className="text-white font-semibold text-sm">{method.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Account Details */}
                {selectedMethodObj && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4"
                  >
                    <h4 className="text-lg font-semibold text-white">
                      {selectedMethodObj.name} Details
                    </h4>
                    
                    {selectedMethodObj.fields.includes('upiId') && (
                      <div>
                        <label className="form-label">UPI ID</label>
                        <input
                          type="text"
                          value={accountDetails.upiId}
                          onChange={(e) => setAccountDetails(prev => ({ ...prev, upiId: e.target.value }))}
                          className="form-input"
                          placeholder="example@upi"
                        />
                      </div>
                    )}

                    {selectedMethodObj.fields.includes('phoneNumber') && (
                      <div>
                        <label className="form-label">Phone Number</label>
                        <input
                          type="tel"
                          value={accountDetails.phoneNumber}
                          onChange={(e) => setAccountDetails(prev => ({ ...prev, phoneNumber: e.target.value }))}
                          className="form-input"
                          placeholder="+91 XXXXXXXXXX"
                        />
                      </div>
                    )}

                    {selectedMethodObj.fields.includes('accountNumber') && (
                      <>
                        <div>
                          <label className="form-label">Account Number</label>
                          <input
                            type="text"
                            value={accountDetails.accountNumber}
                            onChange={(e) => setAccountDetails(prev => ({ ...prev, accountNumber: e.target.value }))}
                            className="form-input"
                            placeholder="Enter account number"
                          />
                        </div>
                        <div>
                          <label className="form-label">IFSC Code</label>
                          <input
                            type="text"
                            value={accountDetails.ifscCode}
                            onChange={(e) => setAccountDetails(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
                            className="form-input"
                            placeholder="BANK0001234"
                          />
                        </div>
                      </>
                    )}

                    {selectedMethodObj.fields.includes('walletAddress') && (
                      <div>
                        <label className="form-label">Wallet Address</label>
                        <input
                          type="text"
                          value={accountDetails.walletAddress}
                          onChange={(e) => setAccountDetails(prev => ({ ...prev, walletAddress: e.target.value }))}
                          className="form-input"
                          placeholder="Enter USDT wallet address"
                        />
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Warning */}
                <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
                    <div>
                      <p className="text-yellow-300 font-semibold">Important</p>
                      <ul className="text-yellow-200 text-sm mt-1 space-y-1">
                        <li>• Withdrawals are processed manually by our team</li>
                        <li>• Processing time: 24-48 hours</li>
                        <li>• Ensure account details are correct</li>
                        <li>• Minimum withdrawal: ₹100</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!amount || !paymentMethod || createWithdrawalMutation.isPending}
                  className="btn btn-warning btn-lg w-full"
                >
                  {createWithdrawalMutation.isPending ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Wallet className="h-5 w-5 mr-2" />
                      Request Withdrawal
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Success */}
        {step === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="card">
              <div className="card-content py-12">
                <div className="w-20 h-20 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-4">Withdrawal Request Submitted!</h2>
                <p className="text-gray-300 mb-6">
                  Your withdrawal request has been submitted successfully. Our team will process it within 24-48 hours.
                </p>
                
                <div className="bg-gray-700 rounded-lg p-4 mb-6">
                  <div className="text-sm text-gray-300 space-y-2">
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="text-yellow-400 font-semibold">₹{amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Method:</span>
                      <span className="text-white">{selectedMethodObj?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="text-yellow-400">Pending Review</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={resetForm}
                    className="btn btn-primary btn-lg w-full"
                  >
                    Make Another Withdrawal
                  </button>
                  
                  <button
                    onClick={() => window.history.back()}
                    className="btn btn-outline btn-md w-full"
                  >
                    Back to Game
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default WithdrawPage;