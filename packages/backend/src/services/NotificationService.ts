import { PrismaClient } from '@prisma/client';
import { SocketService } from '../websocket/SocketService';
import { logger } from '../utils/logger';

export interface Notification {
  id: string;
  userId: string;
  type: 'deposit_approved' | 'deposit_rejected' | 'withdrawal_approved' | 'withdrawal_rejected' | 'bet_won' | 'bet_lost' | 'cashback_credited' | 'round_result';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
}

export class NotificationService {
  constructor(
    private prisma: PrismaClient,
    private socketService?: SocketService
  ) {}

  // Send notification to user
  async sendNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    data?: any
  ): Promise<void> {
    try {
      // Store notification in database
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          data: data ? JSON.stringify(data) : null,
          isRead: false,
        },
      });

      // Send real-time notification via WebSocket
      if (this.socketService) {
        await this.socketService.notifyUser(userId, 'notification', {
          id: notification.id,
          type,
          title,
          message,
          data,
          createdAt: notification.createdAt,
        });
      }

      logger.info(`Notification sent to user ${userId}: ${title}`);
    } catch (error) {
      logger.error('Failed to send notification:', error);
    }
  }

  // Send notification to all admins
  async sendAdminNotification(
    type: 'deposit_request' | 'withdrawal_request' | 'high_exposure' | 'system_alert',
    title: string,
    message: string,
    data?: any
  ): Promise<void> {
    try {
      if (this.socketService) {
        await this.socketService.notifyAllAdmins('admin_notification', {
          type,
          title,
          message,
          data,
          timestamp: new Date(),
        });
      }

      logger.info(`Admin notification sent: ${title}`);
    } catch (error) {
      logger.error('Failed to send admin notification:', error);
    }
  }

  // Notification templates
  async notifyDepositApproved(userId: string, amount: number, utrCode: string): Promise<void> {
    await this.sendNotification(
      userId,
      'deposit_approved',
      'Deposit Approved! 🎉',
      `Your deposit of ₹${amount} has been approved and credited to your account.`,
      { amount, utrCode }
    );
  }

  async notifyDepositRejected(userId: string, amount: number, reason: string): Promise<void> {
    await this.sendNotification(
      userId,
      'deposit_rejected',
      'Deposit Rejected',
      `Your deposit of ₹${amount} was rejected. Reason: ${reason}`,
      { amount, reason }
    );
  }

  async notifyWithdrawalApproved(userId: string, amount: number): Promise<void> {
    await this.sendNotification(
      userId,
      'withdrawal_approved',
      'Withdrawal Approved! 💰',
      `Your withdrawal of ₹${amount} has been approved and will be processed shortly.`,
      { amount }
    );
  }

  async notifyWithdrawalRejected(userId: string, amount: number, reason: string): Promise<void> {
    await this.sendNotification(
      userId,
      'withdrawal_rejected',
      'Withdrawal Rejected',
      `Your withdrawal of ₹${amount} was rejected. The amount has been refunded to your account. Reason: ${reason}`,
      { amount, reason }
    );
  }

  async notifyBetWon(userId: string, amount: number, winAmount: number, roundNumber: number): Promise<void> {
    await this.sendNotification(
      userId,
      'bet_won',
      'You Won! 🎉',
      `Congratulations! You won ₹${winAmount} on your ₹${amount} bet in round ${roundNumber}.`,
      { amount, winAmount, roundNumber }
    );
  }

  async notifyCashbackCredited(userId: string, amount: number): Promise<void> {
    await this.sendNotification(
      userId,
      'cashback_credited',
      'Cashback Credited! 🎁',
      `You've received ₹${amount} as daily cashback (10% of yesterday's losses). Use it to play more games!`,
      { amount }
    );
  }

  async notifyRoundResult(userId: string, roundNumber: number, winningNumber: number, userWon: boolean, winAmount?: number): Promise<void> {
    const title = userWon ? 'Round Won! 🎉' : 'Round Complete';
    const message = userWon 
      ? `Round ${roundNumber} complete! Number ${winningNumber} won. You won ₹${winAmount}!`
      : `Round ${roundNumber} complete! Number ${winningNumber} won. Better luck next time!`;

    await this.sendNotification(
      userId,
      'round_result',
      title,
      message,
      { roundNumber, winningNumber, userWon, winAmount }
    );
  }

  // Admin notification templates
  async notifyNewDepositRequest(amount: number, username: string, utrCode: string): Promise<void> {
    await this.sendAdminNotification(
      'deposit_request',
      'New Deposit Request',
      `${username} submitted a deposit request of ₹${amount} with UTR: ${utrCode}`,
      { amount, username, utrCode }
    );
  }

  async notifyNewWithdrawalRequest(amount: number, username: string): Promise<void> {
    await this.sendAdminNotification(
      'withdrawal_request',
      'New Withdrawal Request',
      `${username} requested withdrawal of ₹${amount}`,
      { amount, username }
    );
  }

  async notifyHighExposure(exposure: number, maxExposure: number): Promise<void> {
    await this.sendAdminNotification(
      'high_exposure',
      'High Exposure Alert',
      `Current house exposure (₹${exposure}) exceeds 80% of maximum (₹${maxExposure})`,
      { exposure, maxExposure }
    );
  }

  // Get user notifications
  async getUserNotifications(userId: string, page = 1, pageSize = 20): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }> {
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({
        where: { userId },
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      notifications: notifications.map(n => ({
        ...n,
        data: n.data ? JSON.parse(n.data) : null,
      })),
      total,
      unreadCount,
    };
  }

  // Mark notifications as read
  async markAsRead(notificationIds: string[]): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: { in: notificationIds } },
      data: { isRead: true },
    });
  }

  // Mark all user notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}