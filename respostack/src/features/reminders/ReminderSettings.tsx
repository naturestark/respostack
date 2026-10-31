import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {
  isNotificationSupported,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  sendTestNotification,
} from './reminder.scheduler';
import {
  getNotificationPreference,
  setNotificationPreference,
} from './reminder.settings';
import { NotificationPermissionStatus } from './reminder.types';

interface ReminderSettingsProps {
  onShowToast: (type: 'success' | 'error', message: string) => void;
}

export const ReminderSettings: React.FC<ReminderSettingsProps> = ({ onShowToast }) => {
  const [permission, setPermission] = useState<NotificationPermissionStatus>('default');
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRequesting, setIsRequesting] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  useEffect(() => {
    async function loadPreferences() {
      setPermission(getNotificationPermissionStatus());
      const enabled = await getNotificationPreference();
      setIsEnabled(enabled);
      setIsLoading(false);
    }
    loadPreferences();
  }, []);

  const handleToggleNotification = async () => {
    const next = !isEnabled;
    try {
      await setNotificationPreference(next);
      setIsEnabled(next);
      onShowToast(
        'success',
        next ? 'Browser notification delivery enabled.' : 'Browser notification delivery disabled.'
      );
    } catch {
      onShowToast('error', 'Failed to update notification settings.');
    }
  };

  const handleRequestPermission = async () => {
    if (isRequesting) return;
    setIsRequesting(true);
    try {
      const newStatus = await requestNotificationPermission();
      setPermission(newStatus);
      if (newStatus === 'granted') {
        await setNotificationPreference(true);
        setIsEnabled(true);
        onShowToast('success', 'Notification permission granted.');
      } else if (newStatus === 'denied') {
        onShowToast('error', 'Notification permission was denied in your browser settings.');
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleTestNotification = async () => {
    if (isTesting) return;
    setIsTesting(true);
    try {
      const success = await sendTestNotification();
      if (success) {
        onShowToast('success', 'Test notification sent.');
      } else {
        onShowToast('error', 'Could not display test notification.');
      }
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-start gap-3.5 mb-4">
        <div className="p-2 rounded-lg bg-teal-100 text-teal-800 flex-shrink-0" aria-hidden="true">
          🔔
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-base font-semibold text-slate-900">
              Reminders &amp; Deadline Awareness
            </h3>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                permission === 'granted'
                  ? 'bg-teal-50 text-teal-700 border-teal-200'
                  : permission === 'denied'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {permission === 'granted'
                ? '✓ Permission Granted'
                : permission === 'denied'
                ? 'Permission Denied'
                : permission === 'unsupported'
                ? 'Notifications Unsupported'
                : 'Not Requested'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Configure how Respostack reminds you of approaching deadlines and scheduled reminder times.
          </p>
        </div>
      </div>

      {/* In-app Awareness Description */}
      <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-600 mb-4 leading-relaxed space-y-1">
        <p className="font-semibold text-slate-800">In-App Attention System (Always Active)</p>
        <p>
          Respostack automatically highlights overdue responsibilities, tasks due today, and approaching deadlines in the <strong>Today</strong> tab. If a reminder is missed while the app is closed, it is flagged under <strong>Reminders Due &amp; Missed</strong> as soon as you reopen Respostack.
        </p>
      </div>

      {/* Browser Notifications Section */}
      <div className="space-y-4 pt-1">
        <div className="flex items-start justify-between gap-4 py-2 border-t border-slate-100">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Optional Browser Notifications</h4>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Display local desktop or mobile system notifications when a configured reminder instant arrives.
            </p>
          </div>

          {permission === 'granted' ? (
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={handleToggleNotification}
                disabled={isLoading}
                className="sr-only peer"
                aria-label="Toggle browser notifications"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          ) : permission === 'default' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestPermission}
              isLoading={isRequesting}
              className="text-xs border-teal-300 text-teal-800 hover:bg-teal-50 flex-shrink-0"
            >
              Enable Notifications
            </Button>
          ) : null}
        </div>

        {/* State Information Banners */}
        {permission === 'denied' && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 leading-relaxed">
            <strong>Permission Blocked:</strong> Browser notifications were denied. To enable them, click the lock/settings icon in your browser address bar and change Notification permissions to &ldquo;Allow&rdquo;.
          </div>
        )}

        {permission === 'granted' && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-xs text-slate-500">
              Verify notification appearance on this device:
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestNotification}
              isLoading={isTesting}
              className="text-xs"
            >
              Send Test Notification
            </Button>
          </div>
        )}

        {/* Background Limitations Disclosure */}
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
          <p className="font-semibold block mb-0.5">⚠️ Local PWA Reminder Limitations:</p>
          <p>
            Respostack operates without an external push server or background cloud database. Reminders are checked and dispatched when the application is open or running in the background. Background delivery when your browser is completely terminated cannot be guaranteed without cloud synchronization.
          </p>
        </div>
      </div>
    </Card>
  );
};
