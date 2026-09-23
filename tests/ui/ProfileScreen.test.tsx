import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPlayerProfile } from "../../src/profile/player-profile";
import { recordMatchProgression } from "../../src/progression/profile-progression";
import { ProfileScreen } from "../../src/ui/ProfileScreen";

afterEach(cleanup);

function progressedProfile() {
  let profile = createPlayerProfile("Север_7", 1000);
  profile = recordMatchProgression(profile, {
    variant: "podkidnoy",
    participantCount: 2,
    outcome: "win",
    placement: 1
  }).profile;
  profile = recordMatchProgression(profile, {
    variant: "perevodnoy",
    participantCount: 3,
    outcome: "loss",
    placement: 3
  }).profile;
  return profile;
}

describe("ProfileScreen", () => {
  it("shows progression, split stats and achievements", () => {
    render(
      <ProfileScreen
        profile={progressedProfile()}
        onBack={() => {}}
        onRename={() => {}}
      />
    );

    expect(screen.getByRole("heading", { name: "Север_7" }))
      .toBeInTheDocument();
    expect(screen.getByText("10 разряд")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Первый стол")).toBeInTheDocument();
    expect(screen.getByText("Не дурак")).toBeInTheDocument();
    expect(screen.getAllByText("1В · 0П · 0Н").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0В · 1П · 0Н").length).toBeGreaterThan(0);
  });

  it("submits a valid nickname change", () => {
    const onRename = vi.fn();
    render(
      <ProfileScreen
        profile={progressedProfile()}
        onBack={() => {}}
        onRename={onRename}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Изменить" }));
    fireEvent.change(screen.getByLabelText("Новое имя"), {
      target: { value: "Новый_7" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(onRename).toHaveBeenCalledWith("Новый_7");
  });

  it("keeps editing open for an invalid nickname", () => {
    const onRename = vi.fn();
    render(
      <ProfileScreen
        profile={progressedProfile()}
        onBack={() => {}}
        onRename={onRename}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Изменить" }));
    fireEvent.change(screen.getByLabelText("Новое имя"), {
      target: { value: "ab" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(onRename).not.toHaveBeenCalled();
    expect(
      screen.getByText("Имя должно содержать от 3 до 16 символов.")
    ).toBeInTheDocument();
  });
});
