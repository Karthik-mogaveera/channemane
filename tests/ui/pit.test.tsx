import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Pit } from "../../src/ui/components/Pit";

describe("Pit Component", () => {
  it("renders pit number, seed count, and accessible aria-label", () => {
    const handleSelect = vi.fn();
    const handleClaim = vi.fn();

    render(
      <Pit
        pitId={3}
        owner="PLAYER_1"
        seeds={5}
        status="OPEN"
        bonusAvailable={false}
        isSelectable={true}
        isActiveDrop={false}
        isAnimating={false}
        onSelect={handleSelect}
        onClaimBonus={handleClaim}
      />
    );

    const button = screen.getByTestId("pit-3");
    expect(button).toBeInTheDocument();
    // Pit ID badge P3 is hidden per Issue 9
    expect(screen.queryByText("P3")).not.toBeInTheDocument();
    // External seed count is rendered
    expect(screen.getByTestId("pit-count-3")).toHaveTextContent("5");
    expect(button).toHaveAttribute(
      "aria-label",
      "Player 1 Pit, 5 seeds, Selectable"
    );
  });

  it("triggers onSelect when clicked if selectable", () => {
    const handleSelect = vi.fn();
    const handleClaim = vi.fn();

    render(
      <Pit
        pitId={0}
        owner="PLAYER_1"
        seeds={5}
        status="OPEN"
        bonusAvailable={false}
        isSelectable={true}
        isActiveDrop={false}
        isAnimating={false}
        onSelect={handleSelect}
        onClaimBonus={handleClaim}
      />
    );

    const button = screen.getByTestId("pit-0");
    fireEvent.click(button);
    expect(handleSelect).toHaveBeenCalledWith(0);
  });

  it("is disabled when not selectable and no bonus is available", () => {
    const handleSelect = vi.fn();
    const handleClaim = vi.fn();

    render(
      <Pit
        pitId={7}
        owner="PLAYER_2"
        seeds={5}
        status="OPEN"
        bonusAvailable={false}
        isSelectable={false}
        isActiveDrop={false}
        isAnimating={false}
        onSelect={handleSelect}
        onClaimBonus={handleClaim}
      />
    );

    const button = screen.getByTestId("pit-7");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleSelect).not.toHaveBeenCalled();
  });

  it("renders closed state with lock icon and disabled attribute", () => {
    const handleSelect = vi.fn();
    const handleClaim = vi.fn();

    render(
      <Pit
        pitId={6}
        owner="PLAYER_1"
        seeds={0}
        status="CLOSED"
        bonusAvailable={false}
        isSelectable={false}
        isActiveDrop={false}
        isAnimating={false}
        onSelect={handleSelect}
        onClaimBonus={handleClaim}
      />
    );

    const button = screen.getByTestId("pit-6");
    expect(button).toBeDisabled();
    expect(screen.getByText("🔒")).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", "Player 1 Pit, Closed");
  });

  it("renders CLAIM +4 badge and triggers onClaimBonus when clicked", () => {
    const handleSelect = vi.fn();
    const handleClaim = vi.fn();

    render(
      <Pit
        pitId={2}
        owner="PLAYER_1"
        seeds={4}
        status="OPEN"
        bonusAvailable={true}
        isSelectable={true}
        isActiveDrop={false}
        isAnimating={false}
        onSelect={handleSelect}
        onClaimBonus={handleClaim}
      />
    );

    const bonusBadge = screen.getByTestId("claim-bonus-2");
    expect(bonusBadge).toBeInTheDocument();
    expect(bonusBadge).toHaveTextContent("CLAIM +4");

    fireEvent.click(bonusBadge);
    expect(handleClaim).toHaveBeenCalledWith(2);
    expect(handleSelect).not.toHaveBeenCalled();
  });

  it("disables interaction while isAnimating is true", () => {
    const handleSelect = vi.fn();
    const handleClaim = vi.fn();

    render(
      <Pit
        pitId={1}
        owner="PLAYER_1"
        seeds={5}
        status="OPEN"
        bonusAvailable={false}
        isSelectable={true}
        isActiveDrop={false}
        isAnimating={true}
        onSelect={handleSelect}
        onClaimBonus={handleClaim}
      />
    );

    const button = screen.getByTestId("pit-1");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleSelect).not.toHaveBeenCalled();
  });
});
