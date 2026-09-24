import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsScreen } from "../../src/ui/SettingsScreen";

describe("SettingsScreen", () => {
  it("shows and toggles the sound preference", () => {
    const onSoundChange = vi.fn();
    render(
      <SettingsScreen
        lang="ru"
        soundEnabled
        onSoundChange={onSoundChange}
        onBack={() => undefined}
      />
    );

    const toggle = screen.getByRole("switch", { name: "Звук" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);
    expect(onSoundChange).toHaveBeenCalledWith(false);
  });

  it("renders English platform copy", () => {
    render(
      <SettingsScreen
        lang="en"
        soundEnabled={false}
        onSoundChange={() => undefined}
        onBack={() => undefined}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Settings" })
    ).toBeInTheDocument();
    expect(screen.getByText("English")).toBeInTheDocument();
  });
});
