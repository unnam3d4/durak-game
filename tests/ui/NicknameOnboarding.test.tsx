import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NicknameOnboarding } from "../../src/ui/NicknameOnboarding";

afterEach(cleanup);

describe("NicknameOnboarding", () => {
  it("starts with an empty nickname input", () => {
    render(<NicknameOnboarding onComplete={() => undefined} />);

    expect(
      screen.getByRole("heading", { name: "Введите ник" })
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("submits a normalized valid nickname", () => {
    const onComplete = vi.fn();
    render(<NicknameOnboarding onComplete={onComplete} />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "  Vovan_77  " }
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Продолжить" })
    );

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith("Vovan_77");
  });

  it("keeps invalid nickname on screen and shows a useful error", () => {
    const onComplete = vi.fn();
    render(<NicknameOnboarding onComplete={onComplete} />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "ab" }
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Продолжить" })
    );

    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "От 3 до 16 символов"
    );
  });
});
