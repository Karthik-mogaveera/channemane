/**
 * Turn Notification Component
 * Displays a short transient popup ("Your turn" or "AI turn") before each player's turn begins.
 */

import React from "react";

export interface TurnNotificationProps {
  notification: string | null;
  onDismiss?: () => void;
}

export const TurnNotification: React.FC<TurnNotificationProps> = ({
  notification,
  onDismiss,
}) => {
  if (!notification) {
    return null;
  }

  const isAI = notification.includes("AI");
  const isP1 = notification.includes("Player 1");
  const isP2 = notification.includes("Player 2");
  const isP3 = notification.includes("Player 3");

  const playerClass = isAI
    ? "turn-notification-ai"
    : isP1
    ? "turn-notification-p1"
    : isP2
    ? "turn-notification-p2"
    : isP3
    ? "turn-notification-p3"
    : "turn-notification-human";

  const icon = isAI
    ? "🤖"
    : isP1
    ? "🔴"
    : isP2
    ? "🔵"
    : isP3
    ? "🟢"
    : "👤";

  return (
    <div
      className="turn-notification-overlay"
      data-testid="turn-notification-popup"
      role="status"
      aria-live="polite"
      onClick={onDismiss}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onDismiss?.();
        }
      }}
      tabIndex={0}
      style={{ cursor: "pointer", pointerEvents: "auto" }}
    >
      <div
        className={`turn-notification-pill ${playerClass}`}
      >
        <span className="turn-notification-icon" aria-hidden="true">
          {icon}
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
