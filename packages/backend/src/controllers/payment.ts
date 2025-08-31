import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { 
  authenticateToken, 
  requireUser, 
  requireAdmin, 
  requirePermission,
  validateUserStatus, 
  AuthenticatedRequest 
} from '../middleware/auth';
import { PaymentService } from '../services/PaymentService';
import { 
  ValidationError,
  createSuccessResponse,
  paginationSchema 
} from '@win5x/common';
import { z } from 'zod';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();
const paymentService = new PaymentService(prisma);

// Validation schemas
const depositRequestSchema = z.object({
  paymentMethodId: z.string().uuid('Invalid payment method'),
  amount: z.number().min(10, 'Minimum deposit is ₹10').max(100000, 'Maximum deposit is ₹100,000'),
  utrCode: z.string().min(5, 'UTR code must be at least 5 characters').max(50, 'UTR code too long'),
});

const withdrawalRequestSchema = z.object({
  amount: z.number().min(100, 'Minimum withdrawal is ₹100'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  accountDetails: z.object({
    upiId: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
    walletAddress: z.string().optional(),
    phoneNumber: z.string().optional(),
  }),
});

const adminActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional(),
  reason: z.string().optional(),
});

// User Routes
router.use(authenticateToken);

// Get active payment methods (public for authenticated users)
router.get('/methods', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const paymentMethods = await paymentService.getActivePaymentMethods();
  res.json(createSuccessResponse(paymentMethods));
}));

// User deposit request
router.post('/deposit', requireUser, validateUserStatus, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = depositRequestSchema.parse(req.body);
  
  try {
    const depositRequest = await paymentService.createDepositRequest(
      req.user!.id,
      validatedData.paymentMethodId,
      validatedData.amount,
      validatedData.utrCode
    );

    res.status(201).json(createSuccessResponse(depositRequest, 'Deposit request submitted successfully'));
  } catch (error: any) {
    throw new ValidationError(error.message);
  }
}));

// User withdrawal request
router.post('/withdraw', requireUser, validateUserStatus, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = withdrawalRequestSchema.parse(req.body);
  
  try {
    const withdrawalRequest = await paymentService.createWithdrawalRequest(
      req.user!.id,
      validatedData.amount,
      validatedData.paymentMethod,
      validatedData.accountDetails
    );

    res.status(201).json(createSuccessResponse(withdrawalRequest, 'Withdrawal request submitted successfully'));
  } catch (error: any) {
    throw new ValidationError(error.message);
  }
}));

// Get user's deposit history
router.get('/deposits', requireUser, validateUserStatus, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = paginationSchema.parse(req.query);
  
  const result = await paymentService.getDepositRequests({
    userId: req.user!.id,
    page: query.page,
    pageSize: query.pageSize,
  });

  res.json(createSuccessResponse(result));
}));

// Get user's withdrawal history
router.get('/withdrawals', requireUser, validateUserStatus, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = paginationSchema.parse(req.query);
  
  const result = await paymentService.getWithdrawalRequests({
    userId: req.user!.id,
    page: query.page,
    pageSize: query.pageSize,
  });

  res.json(createSuccessResponse(result));
}));

// Admin Routes
router.use(requireAdmin);
router.use(validateUserStatus);

// Get all payment methods (admin)
router.get('/admin/methods', requirePermission('MANAGE_DEPOSITS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const paymentMethods = await paymentService.getAllPaymentMethods();
  res.json(createSuccessResponse(paymentMethods));
}));

// Update payment method (admin)
router.put('/admin/methods/:id', requirePermission('MANAGE_DEPOSITS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const updatedMethod = await paymentService.updatePaymentMethod(id, updateData);
    res.json(createSuccessResponse(updatedMethod, 'Payment method updated successfully'));
  } catch (error: any) {
    throw new ValidationError(error.message);
  }
}));

// Get all deposit requests (admin)
router.get('/admin/deposits', requirePermission('MANAGE_DEPOSITS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = paginationSchema.extend({
    status: z.string().optional(),
    userId: z.string().uuid().optional(),
  }).parse(req.query);
  
  const result = await paymentService.getDepositRequests({
    status: query.status,
    userId: query.userId,
    page: query.page,
    pageSize: query.pageSize,
  });

  res.json(createSuccessResponse(result));
}));

// Approve/reject deposit request (admin)
router.put('/admin/deposits/:id', requirePermission('MANAGE_DEPOSITS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const validatedData = adminActionSchema.parse(req.body);

  try {
    let result;
    if (validatedData.action === 'approve') {
      result = await paymentService.approveDepositRequest(id, req.user!.id, validatedData.notes);
    } else {
      if (!validatedData.reason) {
        throw new ValidationError('Rejection reason is required');
      }
      result = await paymentService.rejectDepositRequest(id, req.user!.id, validatedData.reason);
    }

    res.json(createSuccessResponse(result, `Deposit request ${validatedData.action}d successfully`));
  } catch (error: any) {
    throw new ValidationError(error.message);
  }
}));

// Get all withdrawal requests (admin)
router.get('/admin/withdrawals', requirePermission('MANAGE_WITHDRAWALS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = paginationSchema.extend({
    status: z.string().optional(),
    userId: z.string().uuid().optional(),
  }).parse(req.query);
  
  const result = await paymentService.getWithdrawalRequests({
    status: query.status,
    userId: query.userId,
    page: query.page,
    pageSize: query.pageSize,
  });

  res.json(createSuccessResponse(result));
}));

// Approve/reject withdrawal request (admin)
router.put('/admin/withdrawals/:id', requirePermission('MANAGE_WITHDRAWALS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const validatedData = adminActionSchema.parse(req.body);

  try {
    let result;
    if (validatedData.action === 'approve') {
      result = await paymentService.approveWithdrawalRequest(id, req.user!.id, validatedData.notes);
    } else {
      if (!validatedData.reason) {
        throw new ValidationError('Rejection reason is required');
      }
      result = await paymentService.rejectWithdrawalRequest(id, req.user!.id, validatedData.reason);
    }

    res.json(createSuccessResponse(result, `Withdrawal request ${validatedData.action}d successfully`));
  } catch (error: any) {
    throw new ValidationError(error.message);
  }
}));

// Get payment statistics (admin)
router.get('/admin/stats', requirePermission('VIEW_ANALYTICS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const stats = await paymentService.getPaymentStats();
  res.json(createSuccessResponse(stats));
}));

export { router as paymentRoutes };