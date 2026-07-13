import { NotificationService } from './notificationService';

export class SystemNotification {

  static async offline() {
    await NotificationService.showNotification(
      3001,
      'Lifehut Workspace',
      'Internet connection lost.'
    );
  }

  static async backupComplete() {
    await NotificationService.showNotification(
      3002,
      'Lifehut Workspace',
      'Backup completed successfully.'
    );
  }

  static async updateAvailable() {
    await NotificationService.showNotification(
      3003,
      'Lifehut Workspace',
      'A new version of the app is available.'
    );
  }

}