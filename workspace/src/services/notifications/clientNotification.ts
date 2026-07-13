import { NotificationService } from './notificationService';

export class ClientNotification {

  // 1. Progress uploaded | Receiver: Client | Type: Push
  static async progressUploaded(projectName?: string) {
    await NotificationService.showNotification(
      2001,
      'Progress Uploaded (Push)',
      `Contractor uploaded today's work progress and site media for "${projectName || 'your project'}".`
    );
  }

  // 2. Variation requested | Receiver: Client | Type: Push
  static async variationRequested(projectName: string, variationTitle: string) {
    await NotificationService.showNotification(
      2002,
      'Variation Requested (Push)',
      `A new scope variation "${variationTitle || 'Proposal'}" has been requested for "${projectName || 'your project'}".`
    );
  }

  // 3. Payment requested | Receiver: Client | Type: Push
  static async paymentRequested(projectName: string, stageName: string) {
    await NotificationService.showNotification(
      2003,
      'Payment Requested (Push)',
      `The contractor has requested payment for milestone "${stageName || 'Milestone'}" in "${projectName || 'your project'}".`
    );
  }

  // Backward compatibility alias for paymentRequested
  static async paymentReminder() {
    await NotificationService.showNotification(
      2004,
      'Payment Requested (Push)',
      'A payment stage milestone has been requested / is due for your review.'
    );
  }

  // 4. Chat message | Receiver: Client | Type: Push
  static async chatMessage(senderName: string, message: string) {
    const preview = message.length > 60 ? `${message.substring(0, 60)}...` : message;
    await NotificationService.showNotification(
      2005,
      `New Message from ${senderName || 'Contractor'} (Push)`,
      preview
    );
  }

  static async expenseApproval() {
    await NotificationService.showNotification(
      2006,
      'Expense Approval Required (Push)',
      'New contractor expenses are waiting for your review and approval.'
    );
  }
}