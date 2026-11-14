import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RulesModal } from "../../src/ui/components/RulesModal";

describe("RulesModal — Player-Friendly Rules for All Modes", () => {
  it("renders all 9 player-friendly sections in sequential order", () => {
    render(<RulesModal isOpen={true} onClose={vi.fn()} />);

    const expectedHeadings = [
      "1. The Game Board",
      "2. How to Play Your Turn",
      "3. Continue Sowing",
      "4. Capturing Seeds",
      "5. The Special 4-Seed Bonus",
      "6. When Does a Round End?",
      "7. Opening Pits for the Next Round",
      "8. Player Elimination",
      "9. How to Win",
    ];

    expectedHeadings.forEach((heading) => {
      expect(screen.getByText(heading)).toBeInTheDocument();
    });
  });

  it("does not contain technical pit identifiers, programming jargon, or math formulas", () => {
    const { container } = render(<RulesModal isOpen={true} onClose={vi.fn()} />);
    const textContent = container.textContent || "";

    // Check absence of technical pit identifiers like P0, P1, P2, P15, P23
    expect(textContent).not.toMatch(/\bP0\b/);
    expect(textContent).not.toMatch(/\bP1\b/);
    expect(textContent).not.toMatch(/\bP2\b/);
    expect(textContent).not.toMatch(/\bP15\b/);
    expect(textContent).not.toMatch(/\bP23\b/);

    // Check absence of code / formula notations
    expect(textContent).not.toContain("floor(");
    expect(textContent).not.toContain("min(");
    expect(textContent).not.toContain("max(");
    expect(textContent).not.toContain("boolean");
    expect(textContent).not.toContain("typescript");
    expect(textContent).not.toContain("array");
    expect(textContent).not.toContain("Origins & Heritage");
  });

  it("defaults to 2 Players when no activePlayerCount is passed", () => {
    render(<RulesModal isOpen={true} onClose={vi.fn()} />);

    const twoPlayerTab = screen.getByRole("tab", { name: "2 Players" });
    expect(twoPlayerTab).toHaveClass("active");
    expect(screen.getByTestId("rules-cfg-pits")).toHaveTextContent("14");
    expect(screen.getByTestId("rules-cfg-seeds")).toHaveTextContent("70");
    expect(screen.getByTestId("rules-cfg-storages")).toHaveTextContent("2");
  });

  it("defaults to activePlayerCount when provided", () => {
    render(<RulesModal isOpen={true} onClose={vi.fn()} activePlayerCount={4} />);

    const fourPlayerTab = screen.getByRole("tab", { name: "4 Players" });
    expect(fourPlayerTab).toHaveClass("active");
    expect(screen.getByTestId("rules-cfg-pits")).toHaveTextContent("16");
    expect(screen.getByTestId("rules-cfg-seeds")).toHaveTextContent("80");
    expect(screen.getByTestId("rules-cfg-storages")).toHaveTextContent("4");
  });

  it("allows switching between all 5 player modes and displays accurate board specifications", () => {
    render(<RulesModal isOpen={true} onClose={vi.fn()} />);

    // 3 Players
    fireEvent.click(screen.getByRole("tab", { name: "3 Players" }));
    expect(screen.getByRole("tab", { name: "3 Players" })).toHaveClass("active");
    expect(screen.getByTestId("rules-cfg-pits")).toHaveTextContent("15");
    expect(screen.getByTestId("rules-cfg-seeds")).toHaveTextContent("75");
    expect(screen.getByTestId("rules-cfg-storages")).toHaveTextContent("3");
    expect(screen.getByText(/three horizontal rows of 5 pits each/)).toBeInTheDocument();

    // 4 Players
    fireEvent.click(screen.getByRole("tab", { name: "4 Players" }));
    expect(screen.getByRole("tab", { name: "4 Players" })).toHaveClass("active");
    expect(screen.getByTestId("rules-cfg-pits")).toHaveTextContent("16");
    expect(screen.getByTestId("rules-cfg-seeds")).toHaveTextContent("80");
    expect(screen.getByTestId("rules-cfg-storages")).toHaveTextContent("4");
    expect(screen.getByText(/two rows of 8 pits/)).toBeInTheDocument();

    // 5 Players
    fireEvent.click(screen.getByRole("tab", { name: "5 Players" }));
    expect(screen.getByRole("tab", { name: "5 Players" })).toHaveClass("active");
    expect(screen.getByTestId("rules-cfg-pits")).toHaveTextContent("20");
    expect(screen.getByTestId("rules-cfg-seeds")).toHaveTextContent("100");
    expect(screen.getByTestId("rules-cfg-storages")).toHaveTextContent("5");
    expect(screen.getByText(/three horizontal rows/)).toBeInTheDocument();

    // 6 Players
    fireEvent.click(screen.getByRole("tab", { name: "6 Players" }));
    expect(screen.getByRole("tab", { name: "6 Players" })).toHaveClass("active");
    expect(screen.getByTestId("rules-cfg-pits")).toHaveTextContent("24");
    expect(screen.getByTestId("rules-cfg-seeds")).toHaveTextContent("120");
    expect(screen.getByTestId("rules-cfg-storages")).toHaveTextContent("6");
    expect(screen.getByText(/three horizontal rows of 8 pits/)).toBeInTheDocument();

    // Back to 2 Players
    fireEvent.click(screen.getByRole("tab", { name: "2 Players" }));
    expect(screen.getByRole("tab", { name: "2 Players" })).toHaveClass("active");
    expect(screen.getByTestId("rules-cfg-pits")).toHaveTextContent("14");
    expect(screen.getByTestId("rules-cfg-seeds")).toHaveTextContent("70");
  });

  it("handles all close actions (header button, bottom button, escape, backdrop)", () => {
    const handleClose = vi.fn();
    const { rerender } = render(<RulesModal isOpen={true} onClose={handleClose} />);

    // Header close button
    fireEvent.click(screen.getByTestId("close-rules-btn"));
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Bottom action button
    fireEvent.click(screen.getByTestId("rules-close-btn"));
    expect(handleClose).toHaveBeenCalledTimes(2);

    // Escape key
    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(3);

    // Backdrop click
    const backdrop = screen.getByTestId("rules-modal");
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(4);

    // Clicking inside content card does not close
    const card = screen.getByTestId("rules-board-config-card");
    fireEvent.click(card);
    expect(handleClose).toHaveBeenCalledTimes(4);

    // When isOpen is false, nothing is rendered
    rerender(<RulesModal isOpen={false} onClose={handleClose} />);
    expect(screen.queryByTestId("rules-modal")).not.toBeInTheDocument();
  });
});
