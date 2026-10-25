import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React, { useRef } from "react";
import { useFocusTrap } from "../../src/ui/hooks/useFocusTrap";

const TestModal: React.FC<{ isOpen: boolean; onEscape?: () => void }> = ({
  isOpen,
  onEscape,
}) => {
  const trapRef = useFocusTrap<HTMLDivElement>({ isOpen, onEscape });

  if (!isOpen) return null;

  return (
    <div ref={trapRef} role="dialog" aria-modal="true" data-testid="test-dialog">
      <button data-testid="btn-1">First</button>
      <button data-testid="btn-2">Second</button>
      <button data-testid="btn-3">Third</button>
    </div>
  );
};

describe("useFocusTrap Hook", () => {
  it("automatically focuses the first focusable element when opened", async () => {
    vi.useFakeTimers();
    render(<TestModal isOpen={true} />);

    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByTestId("btn-1")).toHaveFocus();
    vi.useRealTimers();
  });

  it("traps focus in forward Tab navigation from last element back to first element", () => {
    render(<TestModal isOpen={true} />);

    const btn1 = screen.getByTestId("btn-1");
    const btn3 = screen.getByTestId("btn-3");

    btn3.focus();
    expect(btn3).toHaveFocus();

    // Press Tab on the last element
    fireEvent.keyDown(document, { key: "Tab", shiftKey: false });
    expect(btn1).toHaveFocus();
  });

  it("traps focus in backward Shift+Tab navigation from first element to last element", () => {
    render(<TestModal isOpen={true} />);

    const btn1 = screen.getByTestId("btn-1");
    const btn3 = screen.getByTestId("btn-3");

    btn1.focus();
    expect(btn1).toHaveFocus();

    // Press Shift+Tab on the first element
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(btn3).toHaveFocus();
  });

  it("calls onEscape when Escape key is pressed", () => {
    const handleEscape = vi.fn();
    render(<TestModal isOpen={true} onEscape={handleEscape} />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleEscape).toHaveBeenCalledTimes(1);
  });

  it("does not call onEscape if modal is not open", () => {
    const handleEscape = vi.fn();
    render(<TestModal isOpen={false} onEscape={handleEscape} />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleEscape).not.toHaveBeenCalled();
  });
});
