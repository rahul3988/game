import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export class PaymentService {
  constructor(private prisma: PrismaClient) {}

  // Payment Methods Management
  async getActivePaymentMethods() {
    return this.prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getAllPaymentMethods() {
    return this.prisma.paymentMethod.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async updatePaymentMethod(id: string, data: {
    displayName?: string;
    isActive?: boolean;
    qrCodeUrl?: string;
    qrCodeData?: string;
    walletAddress?: string;
    instructions?: string;
    minAmount?: number;
    maxAmount?: number;
  }) {
    const oldMethod = await this.prisma.paymentMethod.findUnique({
      where: { id },
    });

    const updatedMethod = await this.prisma.paymentMethod.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    // Log the change
    await this.logPaymentAudit({
      entityType: 'payment_method',
      entityId: id,
      action: 'updated',
      oldData: oldMethod,
      newData: updatedMethod,
    });

    return updatedMethod;
  }

  // Deposit Management
  async createDepositRequest(
    userId: string,
    paymentMethodId: string,
    amount: number,
    utrCode: string
  ) {
    // Check if UTR code already exists
    const existingDeposit = await this.prisma.depositRequest.findFirst({
      where: {
        utrCode,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });

    if (existingDeposit) {
      throw new Error('UTR code already used');
    }

    // Validate payment method
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: { id: paymentMethodId, isActive: true },
    });

    if (!paymentMethod) {
      throw new Error('Invalid payment method');
    }

    // Validate amount
    if (amount < paymentMethod.minAmount || amount > paymentMethod.maxAmount) {
      throw new Error(
        `Amount must be between ₹${paymentMethod.minAmount} and ₹${paymentMethod.maxAmount}`
      );
    }

    const depositRequest = await this.prisma.depositRequest.create({
      data: {
        userId,
        paymentMethodId,
        amount,
        utrCode: utrCode.toUpperCase(),
        status: 'PENDING',
      },
      include: {
        user: { select: { username: true, email: true } },
        paymentMethod: { select: { name: true, displayName: true } },
      },
    });

    // Log the deposit request
    await this.logPaymentAudit({
      entityType: 'deposit_request',
      entityId: depositRequest.id,
      action: 'created',
      newData: depositRequest,
      userId,
    });

    logger.info(`Deposit request created: ${depositRequest.id} for user ${userId}`);
    return depositRequest;
  }

  async approveDepositRequest(
    depositId: string,
    adminId: string,
    adminNotes?: string
  ) {
    const deposit = await this.prisma.depositRequest.findUnique({
      where: { id: depositId },
      include: { user: true },
    });

    if (!deposit) {
      throw new Error('Deposit request not found');
    }

    if (deposit.status !== 'PENDING') {
      throw new Error('Deposit request is not pending');
    }

    // Update deposit status and credit user balance
    const [updatedDeposit] = await this.prisma.$transaction([
      this.prisma.depositRequest.update({
        where: { id: depositId },
        data: {
          status: 'APPROVED',
          approvedBy: adminId,
          approvedAt: new Date(),
          adminNotes,
        },
      }),
      this.prisma.user.update({
        where: { id: deposit.userId },
        data: {
          balance: { increment: deposit.amount },
        },
      }),
      this.prisma.transaction.create({
        data: {
          userId: deposit.userId,
          type: 'DEPOSIT',
          amount: deposit.amount,
          status: 'COMPLETED',
          description: `Deposit approved - UTR: ${deposit.utrCode}`,
          approvedBy: adminId,
        },
      }),
    ]);

    // Log the approval
    await this.logPaymentAudit({
      entityType: 'deposit_request',
      entityId: depositId,
      action: 'approved',
      oldData: deposit,
      newData: updatedDeposit,
      adminId,
    });

    logger.info(`Deposit approved: ${depositId} by admin ${adminId}`);
    return updatedDeposit;
  }

  async rejectDepositRequest(
    depositId: string,
    adminId: string,
    rejectedReason: string
  ) {
    const deposit = await this.prisma.depositRequest.findUnique({
      where: { id: depositId },
    });

    if (!deposit) {
      throw new Error('Deposit request not found');
    }

    if (deposit.status !== 'PENDING') {
      throw new Error('Deposit request is not pending');
    }

    const updatedDeposit = await this.prisma.depositRequest.update({
      where: { id: depositId },
      data: {
        status: 'REJECTED',
        approvedBy: adminId,
        approvedAt: new Date(),
        rejectedReason,
      },
    });

    // Log the rejection
    await this.logPaymentAudit({
      entityType: 'deposit_request',
      entityId: depositId,
      action: 'rejected',
      oldData: deposit,
      newData: updatedDeposit,
      adminId,
    });

    logger.info(`Deposit rejected: ${depositId} by admin ${adminId}`);
    return updatedDeposit;
  }

  async getDepositRequests(filters: {
    status?: string;
    userId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { status, userId, page = 1, pageSize = 20 } = filters;
    
    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [deposits, total] = await Promise.all([
      this.prisma.depositRequest.findMany({
        where,
        include: {
          user: { select: { username: true, email: true } },
          paymentMethod: { select: { name: true, displayName: true } },
          approver: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.depositRequest.count({ where }),
    ]);

    return {
      deposits,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Withdrawal Management
  async createWithdrawalRequest(
    userId: string,
    amount: number,
    paymentMethod: string,
    accountDetails: any
  ) {
    // Check user balance
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    if (!user || user.balance < amount) {
      throw new Error('Insufficient balance');
    }

    // Deduct amount from user balance immediately (hold it)
    const withdrawalRequest = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { balance: { decrement: amount } },
      }),
      this.prisma.withdrawalRequest.create({
        data: {
          userId,
          amount,
          paymentMethod,
          accountDetails: JSON.stringify(accountDetails),
          status: 'PENDING',
        },
        include: {
          user: { select: { username: true, email: true } },
        },
      }),
    ]);

    const withdrawal = withdrawalRequest[1];

    // Log the withdrawal request
    await this.logPaymentAudit({
      entityType: 'withdrawal_request',
      entityId: withdrawal.id,
      action: 'created',
      newData: withdrawal,
      userId,
    });

    logger.info(`Withdrawal request created: ${withdrawal.id} for user ${userId}`);
    return withdrawal;
  }

  async approveWithdrawalRequest(
    withdrawalId: string,
    adminId: string,
    adminNotes?: string
  ) {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new Error('Withdrawal request not found');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new Error('Withdrawal request is not pending');
    }

    const updatedWithdrawal = await this.prisma.$transaction([
      this.prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: 'APPROVED',
          approvedBy: adminId,
          approvedAt: new Date(),
          adminNotes,
        },
      }),
      this.prisma.transaction.create({
        data: {
          userId: withdrawal.userId,
          type: 'WITHDRAWAL',
          amount: -withdrawal.amount,
          status: 'COMPLETED',
          description: `Withdrawal approved to ${withdrawal.paymentMethod}`,
          approvedBy: adminId,
        },
      }),
    ]);

    // Log the approval
    await this.logPaymentAudit({
      entityType: 'withdrawal_request',
      entityId: withdrawalId,
      action: 'approved',
      oldData: withdrawal,
      newData: updatedWithdrawal[0],
      adminId,
    });

    logger.info(`Withdrawal approved: ${withdrawalId} by admin ${adminId}`);
    return updatedWithdrawal[0];
  }

  async rejectWithdrawalRequest(
    withdrawalId: string,
    adminId: string,
    rejectionReason: string
  ) {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new Error('Withdrawal request not found');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new Error('Withdrawal request is not pending');
    }

    // Refund the amount back to user balance
    const updatedWithdrawal = await this.prisma.$transaction([
      this.prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: 'REJECTED',
          approvedBy: adminId,
          approvedAt: new Date(),
          rejectionReason,
        },
      }),
      this.prisma.user.update({
        where: { id: withdrawal.userId },
        data: { balance: { increment: withdrawal.amount } },
      }),
    ]);

    // Log the rejection
    await this.logPaymentAudit({
      entityType: 'withdrawal_request',
      entityId: withdrawalId,
      action: 'rejected',
      oldData: withdrawal,
      newData: updatedWithdrawal[0],
      adminId,
    });

    logger.info(`Withdrawal rejected: ${withdrawalId} by admin ${adminId}`);
    return updatedWithdrawal[0];
  }

  async getWithdrawalRequests(filters: {
    status?: string;
    userId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { status, userId, page = 1, pageSize = 20 } = filters;
    
    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawalRequest.findMany({
        where,
        include: {
          user: { select: { username: true, email: true } },
          approver: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.withdrawalRequest.count({ where }),
    ]);

    return {
      withdrawals,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Audit Logging
  private async logPaymentAudit(data: {
    entityType: string;
    entityId: string;
    action: string;
    oldData?: any;
    newData?: any;
    adminId?: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      await this.prisma.paymentAuditLog.create({
        data: {
          ...data,
          oldData: data.oldData ? JSON.stringify(data.oldData) : null,
          newData: data.newData ? JSON.stringify(data.newData) : null,
        },
      });
    } catch (error) {
      logger.error('Failed to create payment audit log:', error);
    }
  }

  // Statistics
  async getPaymentStats() {
    const [
      totalDeposits,
      totalWithdrawals,
      pendingDeposits,
      pendingWithdrawals,
      approvedDeposits,
      approvedWithdrawals,
    ] = await Promise.all([
      this.prisma.depositRequest.aggregate({
        where: { status: 'APPROVED' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.withdrawalRequest.aggregate({
        where: { status: 'APPROVED' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.depositRequest.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.withdrawalRequest.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.depositRequest.findMany({
        where: { status: 'APPROVED' },
        select: { amount: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.withdrawalRequest.findMany({
        where: { status: 'APPROVED' },
        select: { amount: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      totalDeposits: {
        amount: totalDeposits._sum.amount || 0,
        count: totalDeposits._count,
      },
      totalWithdrawals: {
        amount: totalWithdrawals._sum.amount || 0,
        count: totalWithdrawals._count,
      },
      pending: {
        deposits: pendingDeposits,
        withdrawals: pendingWithdrawals,
      },
      recent: {
        deposits: approvedDeposits,
        withdrawals: approvedWithdrawals,
      },
    };
  }
}