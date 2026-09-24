import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MetaHubScreen } from "../../src/ui/MetaHubScreen";
import { createDefaultPlayerMeta } from "../../src/meta/player-meta";
import type { PlayerProfileV1 } from "../../src/profile/player-profile";

afterEach(cleanup);

const profile: PlayerProfileV1 = {
  schemaVersion: 1,
  nickname: "Vovan_77",
  xp: 900,
  rating: 1376,
  matchesCompleted: 12,
  wins: 5,
  currentStreak: 2,
  bestStreak: 4,
  createdAtMs: 1,
  updatedAtMs: 2
};

describe("MetaHubScreen", () => {
  it("shows progression, rewards and cosmetics", () => {
    render(
      <MetaHubScreen
        profile={profile}
        meta={{ ...createDefaultPlayerMeta(), coins: 300 }}
        lang="ru"
        onBack={() => undefined}
        onClaimDaily={() => undefined}
        onPurchase={() => undefined}
        onEquip={() => undefined}
        onRename={() => undefined}
      />
    );

    expect(screen.getByText("Прогресс и коллекция")).toBeInTheDocument();
    expect(screen.getByText("Ежедневная награда")).toBeInTheDocument();
    expect(screen.getByText("Изумруд")).toBeInTheDocument();
    expect(screen.getByText("Графит")).toBeInTheDocument();
  });

  it("routes reward and purchase actions", () => {
    const onClaimDaily = vi.fn();
    const onPurchase = vi.fn();

    render(
      <MetaHubScreen
        profile={profile}
        meta={{ ...createDefaultPlayerMeta(), coins: 300 }}
        lang="ru"
        onBack={() => undefined}
        onClaimDaily={onClaimDaily}
        onPurchase={onPurchase}
        onEquip={() => undefined}
        onRename={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Забрать" }));
    expect(onClaimDaily).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole("button", { name: /Купить/ })[0]!);
    expect(onPurchase).toHaveBeenCalledTimes(1);
  });

  it("renders English copy", () => {
    render(
      <MetaHubScreen
        profile={profile}
        meta={createDefaultPlayerMeta()}
        lang="en"
        onBack={() => undefined}
        onClaimDaily={() => undefined}
        onPurchase={() => undefined}
        onEquip={() => undefined}
        onRename={() => undefined}
      />
    );

    expect(screen.getByText("Progress & Collection")).toBeInTheDocument();
    expect(screen.getByText("Daily reward")).toBeInTheDocument();
    expect(screen.getByText("Collection")).toBeInTheDocument();
  });

  it("validates and submits a profile rename", () => {
    const onRename = vi.fn();

    render(
      <MetaHubScreen
        profile={profile}
        meta={createDefaultPlayerMeta()}
        lang="ru"
        onBack={() => undefined}
        onClaimDaily={() => undefined}
        onPurchase={() => undefined}
        onEquip={() => undefined}
        onRename={onRename}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Изменить" }));
    const input = screen.getByRole("textbox", { name: "Имя за столом" });
    fireEvent.change(input, { target: { value: "New_Player" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(onRename).toHaveBeenCalledWith("New_Player");
  });

});
