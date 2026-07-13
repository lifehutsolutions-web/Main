import { LocalNotifications } from '@capacitor/local-notifications';

export class NotificationService {

  static async initialize() {
    const permission = await LocalNotifications.requestPermissions();

    if (permission.display !== 'granted') {
      console.log('Notification permission denied');
    }
  }

  static async showNotification(
    id: number,
    title: string,
    body: string
  ) {
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title,
          body,
          schedule: {
            at: new Date(Date.now() + 1000)
          }
        }
      ]
    });
  }

  static async cancel(id: number) {
    await LocalNotifications.cancel({
      notifications: [{ id }]
    });
  }

  static async cancelAll() {
    const pending = await LocalNotifications.getPending();

    await LocalNotifications.cancel({
      notifications: pending.notifications
    });
  }
}