import { PaymentService } from '../services/PaymentService';
import { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client');

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    paymentService = new PaymentService(mockPrisma);
  });

  describe('Deposit Management', () => {
    test('should create deposit request with valid UTR', async () => {
      const mockPaymentMethod = {
        id: 'method-1',
        name: 'phonepe',
        minAmount: 10,
        maxAmount: 50000,
        isActive: true,
      };

      const mockExistingDeposit = null;

      mockPrisma.depositRequest.findFirst = jest.fn().mockResolvedValue(mockExistingDeposit);
      mockPrisma.paymentMethod.findFirst = jest.fn().mockResolvedValue(mockPaymentMethod);
      mockPrisma.depositRequest.create = jest.fn().mockResolvedValue({
        id: 'deposit-1',
        userId: 'user-1',
        amount: 100,
        utrCode: 'UTR123456',
        status: 'PENDING',
      });

      const result = await paymentService.createDepositRequest(
        'user-1',
        'method-1',
        100,
        'UTR123456'
      );

      expect(result.utrCode).toBe('UTR123456');
      expect(result.status).toBe('PENDING');
    });

    test('should reject duplicate UTR codes', async () => {
      const mockExistingDeposit = {
        id: 'existing-deposit',
        utrCode: 'UTR123456',
        status: 'PENDING',
      };

      mockPrisma.depositRequest.findFirst = jest.fn().mockResolvedValue(mockExistingDeposit);

      await expect(
        paymentService.createDepositRequest('user-1', 'method-1', 100, 'UTR123456')
      ).rejects.toThrow('UTR code already used');
    });

    test('should validate amount within payment method limits', async () => {
      const mockPaymentMethod = {
        id: 'method-1',
        minAmount: 10,
        maxAmount: 1000,
        isActive: true,
      };

      mockPrisma.depositRequest.findFirst = jest.fn().mockResolvedValue(null);
      mockPrisma.paymentMethod.findFirst = jest.fn().mockResolvedValue(mockPaymentMethod);

      // Test amount too low
      await expect(
        paymentService.createDepositRequest('user-1', 'method-1', 5, 'UTR123456')
      ).rejects.toThrow('Amount must be between');

      // Test amount too high
      await expect(
        paymentService.createDepositRequest('user-1', 'method-1', 2000, 'UTR123456')
      ).rejects.toThrow('Amount must be between');
    });
  });

  describe('Withdrawal Management', () => {
    test('should create withdrawal request with sufficient balance', async () => {
      const mockUser = {
        id: 'user-1',
        balance: 1000,
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);
      mockPrisma.$transaction = jest.fn().mockResolvedValue([
        {}, // User update result
        {   // Withdrawal request result
          id: 'withdrawal-1',
          userId: 'user-1',
          amount: 500,
          status: 'PENDING',
        },
      ]);

      const result = await paymentService.createWithdrawalRequest(
        'user-1',
        500,
        'UPI',
        { upiId: 'user@upi' }
      );

      expect(result.amount).toBe(500);
      expect(result.status).toBe('PENDING');
    });

    test('should reject withdrawal with insufficient balance', async () => {
      const mockUser = {
        id: 'user-1',
        balance: 100,
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      await expect(
        paymentService.createWithdrawalRequest('user-1', 500, 'UPI', { upiId: 'user@upi' })
      ).rejects.toThrow('Insufficient balance');
    });
  });

  describe('Admin Actions', () => {
    test('should approve deposit and credit user balance', async () => {
      const mockDeposit = {
        id: 'deposit-1',
        userId: 'user-1',
        amount: 100,
        status: 'PENDING',
      };

      mockPrisma.depositRequest.findUnique = jest.fn().mockResolvedValue(mockDeposit);
      mockPrisma.$transaction = jest.fn().mockResolvedValue([
        { ...mockDeposit, status: 'APPROVED' }, // Updated deposit
        {}, // User balance update
        {}, // Transaction record
      ]);

      const result = await paymentService.approveDepositRequest('deposit-1', 'admin-1');

      expect(result.status).toBe('APPROVED');
    });

    test('should reject deposit and not credit balance', async () => {
      const mockDeposit = {
        id: 'deposit-1',
        userId: 'user-1',
        amount: 100,
        status: 'PENDING',
      };

      mockPrisma.depositRequest.findUnique = jest.fn().mockResolvedValue(mockDeposit);
      mockPrisma.depositRequest.update = jest.fn().mockResolvedValue({
        ...mockDeposit,
        status: 'REJECTED',
      });

      const result = await paymentService.rejectDepositRequest(
        'deposit-1',
        'admin-1',
        'Invalid UTR code'
      );

      expect(result.status).toBe('REJECTED');
    });
  });
});