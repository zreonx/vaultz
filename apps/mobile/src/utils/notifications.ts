import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

let channelCreated = false;

async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android' && !channelCreated) {
    try {
      await Notifications.setNotificationChannelAsync('vaultz-sync', {
        name: 'Cloud Sync Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 100, 200],
        lightColor: '#10B981',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
      });
      channelCreated = true;
    } catch {
      // Ignore channel creation errors on web or unsupported environments
    }
  }
}

/**
 * Triggers a mobile device native notification in the system notification shade/tray.
 */
export async function showSyncNotification(title: string, body: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return;
    }

    await ensureNotificationChannel();

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { type: 'sync_notification', timestamp: Date.now() },
      },
      trigger: Platform.OS === 'android' ? { channelId: 'vaultz-sync' } : null,
    });
  } catch (err) {
    // Fail silently in environments where native notifications are unavailable
    console.warn('Native notification error:', err);
  }
}
