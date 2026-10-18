/**
 * Turn Notification Component
 * Displays a short transient popup ("Your turn" or "AI turn") before each player's turn begins.
 */

import React from "react";

export interface TurnNotificationProps {
  notification: string | null;
}

export const TurnNotification: React.FC<TurnNotificationProps> = ({
  notification,
}) => {
  if (!notification) {
    return null;
  }

  const isAI = notification.includes("AI");

  return (
    <div
      className="turn-notification-overlay"
      data-testid="turn-notification-popup"
      role="status"
      aria-live="polite"
    >
      <div
        className={`turn-notification-pill ${
          isAI ? "turn-notification-ai" : "turn-notification-human"
        }`}
      >
        <span className="turn-notification-icon" aria-hidden="true">
          {isAI ? "🤖" : "👤"}
        </span>
        <span
          className="turn-notification-text"
          data-testid="turn-notification-text"
        >
          {notification}
        </span>
      </div>
    </div>
  );
};
