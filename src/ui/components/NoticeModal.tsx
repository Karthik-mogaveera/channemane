/**
 * Unified Notice / Information Modal Component
 * Reusable, fully accessible dialog component adhering to WCAG 2.1 modal standards.
 * Consolidates duplicate notice and work-in-progress modal implementations.
 */

import React from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";

export interface NoticeModalProps {
  isOpen?: boolean;
  title: string;
  subtitle?: React.ReactNode;
  icon?: string;
  badgeIcon?: string;
  message?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  onClose: () => void;
  closeButtonText?: string;
  closeButtonTestId?: string;
  testId?: string;
  cardTestId?: string;
  titleId?: string;
  className?: string;
  cardClassName?: string;
}

export const NoticeModal: React.FC<NoticeModalProps> = ({
  isOpen = true,
  title,
  subtitle,
  icon,
  badgeIcon = "🚧",
  message,
  description,
  actions,
  children,
  onClose,
  closeButtonText = "Got it",
  closeButtonTestId = "notice-modal-ok-btn",
  testId = "notice-modal",
  cardTestId = "notice-modal-card",
  titleId = "notice-modal-title",
  className = "",
  cardClassName = "",
}) => {
  const modalRef = useFocusTrap<HTMLDivElement>({
    isOpen,
    onEscape: onClose,
  });

  if (!isOpen) return null;

  const displayIcon = icon ?? badgeIcon;
  const displayBody = message ?? description ?? children;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      ref={modalRef}
      className={`modal-overlay ${className}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid={testId}
      onClick={handleOverlayClick}
    >
      <div
        className={`modal-content notice-modal-card ${cardClassName}`.trim()}
        data-testid={cardTestId}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header notice-modal-header">
          {displayIcon && (
            <div className="notice-badge-icon wip-badge-icon difficulty-badge-icon" aria-hidden="true">
              {displayIcon}
            </div>
          )}
          <h2 id={titleId} className="modal-title">
            {title}
          </h2>
          {subtitle && (
            typeof subtitle === "string" ? (
              <p className="notice-subtitle wip-subtitle coming-soon-subtitle">{subtitle}</p>
            ) : (
              subtitle
            )
          )}
        </div>

        {/* Decorative Separator */}
        <div className="menu-divider" aria-hidden="true">
          <span className="divider-line" />
          <span className="divider-diamond">♦</span>
          <span className="divider-line" />
        </div>

        {/* Modal Body */}
        {displayBody && (
          <div className="modal-body notice-modal-body wip-body coming-soon-body">
            {typeof displayBody === "string" ? (
              <p className="notice-description wip-description coming-soon-description">
                {displayBody}
              </p>
            ) : (
              displayBody
            )}
          </div>
        )}

        {/* Modal Actions / Footer */}
        {actions ? (
          <div className="notice-modal-actions coming-soon-actions">
            {actions}
          </div>
        ) : (
          <div className="modal-footer notice-modal-footer wip-footer">
            <button
              type="button"
              className="btn btn-primary notice-ok-btn wip-ok-btn"
              onClick={onClose}
              data-testid={closeButtonTestId}
              aria-label="Close dialog"
              autoFocus
            >
              {closeButtonText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const InformationModal = NoticeModal;
export type InformationModalProps = NoticeModalProps;
