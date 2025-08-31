import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  QrCode, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft,
  Wallet,
  CreditCard,
  Smartphone
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { paymentService } from '../services/paymentService';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '@win5x/common';

interface PaymentMethod {
  id: string;
  name: string;
  displayName: string;
  qrCodeUrl?: string;
  qrCodeData?: string;
  walletAddress?: string;
  instructions?: string;
  minAmount: number;
  maxAmount: number;
}

const DepositPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [utrCode, setUtrCode] = useState('');
  const [step, setStep] = useState<'select' | 'payment' | 'utr' | 'success'>('select');

  // Fetch payment methods
  const { data: paymentMethods, isLoading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentService.getPaymentMethods(),
  });

  // Create deposit mutation
  const createDepositMutation = useMutation({
    mutationFn: (data: { paymentMethodId: string; amount: number; utrCode: string }) =>
      paymentService.createDepositRequest(data),
    onSuccess: () => {
      setStep('success');
      queryClient.invalidateQueries({ queryKey: ['user-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to submit deposit request');
    },
  });

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setStep('payment');
  };

  const handleAmountSubmit = () => {
    const amountNum = parseFloat(amount);
    if (!selectedMethod) return;
    
    if (amountNum < selectedMethod.minAmount || amountNum > selectedMethod.maxAmount) {
      toast.error(`Amount must be between ₹${selectedMethod.minAmount} and ₹${selectedMethod.maxAmount}`);
      return;
    }
    
    setStep('utr');
  };

  const handleUtrSubmit = () => {
    if (!selectedMethod || !amount || !utrCode) return;
    
    createDepositMutation.mutate({
      paymentMethodId: selectedMethod.id,
      amount: parseFloat(amount),
      utrCode: utrCode.trim(),
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getMethodIcon = (methodName: string) => {
    switch (methodName.toLowerCase()) {
      case 'phonepe':
        return '📱';
      case 'googlepay':
        return '💳';
      case 'paytm':
        return '💰';
      case 'usdt':
        return '₿';
      default:
        return '💳';
    }
  };

  const resetForm = () => {
    setSelectedMethod(null);
    setAmount('');
    setUtrCode('');
    setStep('select');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {step !== 'select' && (
              <button
                onClick={() => step === 'payment' ? setStep('select') : step === 'utr' ? setStep('payment') : resetForm()}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white">Deposit Funds</h1>
              <p className="text-gray-400">Add money to your Win5x wallet</p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-gray-400 text-sm">Current Balance</p>
            <p className="text-2xl font-bold text-green-400">
              {formatCurrency(user?.balance || 0)}
            </p>
          </div>
        </div>

        {/* Step 1: Select Payment Method */}
        {step === 'select' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-semibold text-white mb-4">Choose Payment Method</h2>
            
            <div className="grid gap-4">
              {paymentMethods?.map((method) => (
                <motion.button
                  key={method.id}
                  onClick={() => handleMethodSelect(method)}
                  className="card p-6 hover:border-gold-500 transition-all duration-200 text-left"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl">{getMethodIcon(method.name)}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{method.displayName}</h3>
                        <p className="text-gray-400 text-sm">
                          ₹{method.minAmount} - ₹{method.maxAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-gold-400">
                      <CreditCard className="h-6 w-6" />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2: Enter Amount & Show QR */}
        {step === 'payment' && selectedMethod && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="card">
              <div className="card-header">
                <h3 className="card-title flex items-center gap-2">
                  <span className="text-2xl">{getMethodIcon(selectedMethod.name)}</span>
                  {selectedMethod.displayName}
                </h3>
              </div>
              
              <div className="card-content space-y-6">
                {/* Amount Input */}
                <div>
                  <label className="form-label">Deposit Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">₹</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="form-input pl-8"
                      placeholder={`${selectedMethod.minAmount} - ${selectedMethod.maxAmount}`}
                      min={selectedMethod.minAmount}
                      max={selectedMethod.maxAmount}
                    />
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Min: ₹{selectedMethod.minAmount} | Max: ₹{selectedMethod.maxAmount.toLocaleString()}
                  </p>
                </div>

                {/* QR Code */}
                {selectedMethod.qrCodeUrl && (
                  <div className="text-center">
                    <h4 className="text-lg font-semibold text-white mb-4">Scan QR Code</h4>
                    <div className="inline-block p-4 bg-white rounded-lg">
                      <img 
                        src={selectedMethod.qrCodeUrl} 
                        alt="Payment QR Code"
                        className="w-48 h-48"
                      />
                    </div>
                  </div>
                )}

                {/* Wallet Address for USDT */}
                {selectedMethod.walletAddress && (
                  <div>
                    <label className="form-label">Wallet Address</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={selectedMethod.walletAddress}
                        readOnly
                        className="form-input flex-1"
                      />
                      <button
                        onClick={() => copyToClipboard(selectedMethod.walletAddress!)}
                        className="btn btn-outline btn-sm"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Instructions */}
                {selectedMethod.instructions && (
                  <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
                    <h4 className="text-blue-300 font-semibold mb-2">Payment Instructions</h4>
                    <p className="text-blue-200 text-sm">{selectedMethod.instructions}</p>
                  </div>
                )}

                <button
                  onClick={handleAmountSubmit}
                  disabled={!amount || parseFloat(amount) < selectedMethod.minAmount}
                  className="btn btn-primary btn-lg w-full"
                >
                  Continue to UTR Entry
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Enter UTR Code */}
        {step === 'utr' && selectedMethod && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Enter Transaction Details</h3>
                <p className="card-description">
                  After completing your payment, enter the UTR code below
                </p>
              </div>
              
              <div className="card-content space-y-6">
                {/* Payment Summary */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300">Payment Method:</span>
                    <span className="text-white font-semibold">{selectedMethod.displayName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Amount:</span>
                    <span className="text-green-400 font-bold text-lg">₹{amount}</span>
                  </div>
                </div>

                {/* UTR Input */}
                <div>
                  <label className="form-label">UTR/Transaction Code</label>
                  <input
                    type="text"
                    value={utrCode}
                    onChange={(e) => setUtrCode(e.target.value.toUpperCase())}
                    className="form-input"
                    placeholder="Enter UTR code from your payment app"
                    maxLength={50}
                  />
                  <p className="text-sm text-gray-400 mt-1">
                    Find this code in your payment app's transaction history
                  </p>
                </div>

                {/* Warning */}
                <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                    <div>
                      <p className="text-yellow-300 font-semibold">Important</p>
                      <p className="text-yellow-200 text-sm">
                        Make sure to enter the correct UTR code. Incorrect codes may delay your deposit approval.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleUtrSubmit}
                  disabled={!utrCode.trim() || createDepositMutation.isPending}
                  className="btn btn-success btn-lg w-full"
                >
                  {createDepositMutation.isPending ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Submit Deposit Request
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="card">
              <div className="card-content py-12">
                <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-4">Deposit Request Submitted!</h2>
                <p className="text-gray-300 mb-6">
                  Your deposit request has been submitted successfully. Our team will verify and approve it shortly.
                </p>
                
                <div className="bg-gray-700 rounded-lg p-4 mb-6">
                  <div className="text-sm text-gray-300 space-y-2">
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="text-green-400 font-semibold">₹{amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>UTR Code:</span>
                      <span className="text-white font-mono">{utrCode}</span>
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
                    Make Another Deposit
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

export default DepositPage;