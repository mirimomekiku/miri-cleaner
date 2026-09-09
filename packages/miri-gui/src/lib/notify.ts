import { bridge } from "./bridge";
import { getSettings, NotificationSettings } from "./settings";

export type NotificationCategory = keyof Omit<NotificationSettings, "enabled">;

/**
 * Shows a native OS notification for one of the app's known categories,
 * respecting both the master toggle and the per-category toggle in
 * Settings. Never throws -- a notification failing (permission denied, no
 * notification daemon running, etc.) is a courtesy lost, not a reason to
 * break whatever triggered it.
 */
export async function notify(category: NotificationCategory, title: string, body: string): Promise<void> {
  const settings = getSettings();
  if (!settings.notifications.enabled || !settings.notifications[category]) {
    return;
  }
  try {
    await bridge.showNotification(title, body);
  } catch {
    // Notifications are a courtesy, never fatal to the feature that triggered one.
  }
}
