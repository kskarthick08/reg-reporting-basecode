"use client";

import { useMemo, useState } from "react";

import { ActionIcon } from "./ActionIcon";
import type { NotificationItem } from "./types";

type Props = {
  notifications: NotificationItem[];
  markNotificationRead: (id: number) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
};

export function NotificationCenter({
  notifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications
}: Props) {
  const [open, setOpen] = useState(false);
  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  return (
    <details
      className="notification-center"
      open={open}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="secondary-btn btn btn-outline-secondary btn-with-icon notification-center__toggle">
        <ActionIcon name="notifications" className="action-icon" />
        Notifications
        {unreadCount > 0 ? <span className="notification-center__badge">{unreadCount}</span> : null}
      </summary>
      <div className="notification-center__panel panel">
        <div className="notification-center__header">
          <div>
            <div className="notification-center__title">Notifications</div>
            <div className="notification-center__subtitle">Recent workflow, job, and action events stay here until you clear them.</div>
          </div>
          <div className="notification-center__actions">
            <button className="mini-btn" type="button" onClick={markAllNotificationsRead} disabled={notifications.length === 0}>
              Mark all read
            </button>
            <button className="mini-btn" type="button" onClick={clearNotifications} disabled={notifications.length === 0}>
              Clear
            </button>
          </div>
        </div>

        <div className="notification-center__list">
          {notifications.length === 0 ? (
            <div className="notification-center__empty">No notifications yet.</div>
          ) : (
            notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`notification-center__item ${item.read ? "read" : "unread"} ${item.kind}`}
                onClick={() => markNotificationRead(item.id)}
              >
                <span className="notification-center__dot" />
                <span className="notification-center__copy">
                  <strong>{item.text}</strong>
                  <span>{item.at}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </details>
  );
}
