import { afterEach, describe, expect, it } from "vitest";
import { installGameSurfaceGuards } from "../../src/platform/game-surface-guards";

let cleanup: (() => void) | null = null;

afterEach(() => {
  cleanup?.();
  cleanup = null;
  document.body.innerHTML = "";
});

describe("game surface guards", () => {
  it("prevents the context menu inside the game root", () => {
    const root = document.createElement("div");
    const card = document.createElement("button");
    root.append(card);
    document.body.append(root);

    cleanup = installGameSurfaceGuards(root);

    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true
    });
    card.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("does not intercept context menus outside the game root", () => {
    const root = document.createElement("div");
    const outside = document.createElement("button");
    document.body.append(root, outside);

    cleanup = installGameSurfaceGuards(root);

    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true
    });
    outside.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it("removes the guard cleanly", () => {
    const root = document.createElement("div");
    const card = document.createElement("button");
    root.append(card);
    document.body.append(root);

    cleanup = installGameSurfaceGuards(root);
    cleanup();
    cleanup = null;

    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true
    });
    card.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });
});
