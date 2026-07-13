import { NotificationService } from './notificationService';

export class ContractorNotification {

  // 1. Daily progress reminder | Receiver: Contractor | Type: Local
  static async dailyProgressReminder() {
    await NotificationService.showNotification(
      1001,
      'Daily Progress Reminder (Local)',
      'Please submit today\'s work progress details for your active projects.'
    );
  }

  // Backward compatibility alias for dailyProgressReminder
  static async progressReminder() {
    await this.dailyProgressReminder();
  }

  // 2. Variation approved | Receiver: Contractor | Type: Push
  static async variationApproved(projectName: string) {
    await NotificationService.showNotification(
      1002,
      'Variation Approved (Push)',
      `The client has approved your scope variation proposal for "${projectName || 'your project'}".`
    );
  }

  // 3. Payment approved | Receiver: Contractor | Type: Push
  static async paymentApproved(projectName: string, stageName: string) {
    await NotificationService.showNotification(
      1003,
      'Payment Approved (Push)',
      `Your payment request for milestone "${stageName || 'Milestone'}" in "${projectName || 'your project'}" has been verified & approved.`
    );
  }

  // 4. Chat message | Receiver: Contractor | Type: Push
  static async chatMessage(senderName: string, message: string) {
    const preview = message.length > 60 ? `${message.substring(0, 60)}...` : message;
    await NotificationService.showNotification(
      1004,
      `New Message from ${senderName || 'Client'} (Push)`,
      preview
    );
  }

  // 5. Backup reminder | Receiver: Contractor | Type: Local
  static async backupReminder() {
    await NotificationService.showNotification(
      1005,
      'Backup Reminder (Local)',
      'Don\'t forget to back up your local database and project data to secure storage today.'
    );
  }

  static async attendanceReminder() {
    await NotificationService.showNotification(
      1006,
      'Attendance Reminder (Local)',
      'Please mark today\'s attendance in the platform.'
    );
  }

  static async expenseReminder() {
    await NotificationService.showNotification(
      1007,
      'Expense Reminder (Local)',
      'Pending contractor expenses are waiting for submission.'
    );
  }
}