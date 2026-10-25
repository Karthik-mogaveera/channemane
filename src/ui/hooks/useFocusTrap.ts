/**
 * Reusable Focus Trap Hook for Modal Dialogs (WCAG 2.1 compliance)
 *
 * Capabilities:
 * 1. Automatically shifts focus to the first focusable element (or specific ref/selector) when opened.
 * 2. Traps keyboard focus (Tab and Shift+Tab) strictly inside the modal container.
 * 3. Listens for the Escape key to close dismissible modals.
 * 4. Restores focus to the triggering element when the modal is closed.
 */

import { useEffect, useRef } from "react";

export interface UseFocusTrapOptions {
  isOpen?: boolean;
  onEscape?: () => void;
  initialFocusSelector?: string;
  returnFocus?: boolean;
}

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>({
  isOpen = true,
  onEscape,
  initialFocusSelector,
  returnFocus = true,
}: UseFocusTrapOptions = {}) {
  const containerRef = useRef<T>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (typeof document !== "undefined") {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    }

    const container = containerRef.current;
    if (!container) return;

    const getFocusableElements = (): HTMLElement[] => {
      const elements = container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      return Array.from(elements).filter(
        (el) => el.getAttribute("aria-hidden") !== "true"
      );
    };

    // Auto-focus first focusable element or specified selector
    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      if (initialFocusSelector) {
        const target = containerRef.current.querySelector<HTMLElement>(initialFocusSelector);
        if (target) {
          target.focus();
          return;
        }
      }
      const focusables = getFocusableElements();
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        containerRef.current.setAttribute("tabindex", "-1");
        containerRef.current.focus();
      }
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onEscape) {
        e.preventDefault();
        e.stopPropagation();
        onEscape();
        return;
      }

      if (e.key === "Tab") {
        const focusables = getFocusableElements();
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !container.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !container.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      if (returnFocus && previousActiveElementRef.current?.focus) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, onEscape, initialFocusSelector, returnFocus]);

  return containerRef;
}
