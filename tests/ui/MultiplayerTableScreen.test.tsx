import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MultiplayerTableScreen } from "../../src/ui/MultiplayerTableScreen";
import { card } from "../support/match-fixtures";
import { CURRENT_MULTIPLAYER_MATCH_KEY } from "../../src/save/multiplayer-match-save";
import { makeMultiplayerState } from "../support/multiplayer-fixtures";

function dispatchPointer(
  element: Element,
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
  init: { pointerId: number; clientX: number; clientY: number }
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: init.clientX,
    clientY: init.clientY
  });
  Object.defineProperty(event, "pointerId", {
    configurable: true,
    value: init.pointerId
  });
  fireEvent(element, event);
}

function rect(
  left: number,
  top: number,
  right: number,
  bottom: number
): DOMRect {
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
    x: left,
    y: top,
    toJSON: () => ({})
  } as DOMRect;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("MultiplayerTableScreen", () => {
  it("renders every seated opponent in a four-player match", () => {
    const state = makeMultiplayerState({}, 4);

    render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    expect(screen.getByText("Соперник 1")).toBeInTheDocument();
    expect(screen.getByText("Соперник 2")).toBeInTheDocument();
    expect(screen.getByText("Соперник 3")).toBeInTheDocument();
    expect(screen.getAllByTestId("human-card")).toHaveLength(6);
  });

  it("renders persisted seat nicknames without internal opponent labels", () => {
    const state = makeMultiplayerState({}, 4);

    render(
      <MultiplayerTableScreen
        initialState={state}
        playerNickname="Vovan_77"
        opponentProfiles={[
          {
            participantId: "bot",
            nickname: "VIKTOR",
            hiddenRating: 1300,
            skill: "normal"
          },
          {
            participantId: "bot2",
            nickname: "Maks77",
            hiddenRating: 1400,
            skill: "normal"
          },
          {
            participantId: "bot3",
            nickname: "Димон",
            hiddenRating: 1500,
            skill: "normal"
          }
        ]}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    expect(screen.getByText("VIKTOR")).toBeInTheDocument();
    expect(screen.getByText("Maks77")).toBeInTheDocument();
    expect(screen.getByText("Димон")).toBeInTheDocument();
    expect(screen.getByText("Vovan_77")).toBeInTheDocument();
    expect(screen.queryByText("Соперник 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Соперник 2")).not.toBeInTheDocument();
    expect(screen.queryByText("Соперник 3")).not.toBeInTheDocument();
  });

  it("lets the human drag several selected equal-rank cards onto the table together", () => {
    const first = card("clubs", 7);
    const second = card("diamonds", 7);
    const state = makeMultiplayerState({
      hands: {
        human: [first, second, card("spades", 9)],
        bot: [card("clubs", 10), card("diamonds", 10), card("hearts", 10)],
        bot2: [card("clubs", 11), card("diamonds", 11), card("hearts", 11)],
        bot3: []
      },
      talon: [],
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: [],
      defenderHandSizeAtBoutStart: 3
    });

    const { container } = render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "7 треф" }));
    fireEvent.click(screen.getByRole("button", { name: "7 бубен" }));

    const battlefield = container.querySelector(".battlefield");
    expect(battlefield).not.toBeNull();
    if (!battlefield) return;
    battlefield.getBoundingClientRect = () => rect(100, 100, 500, 500);

    const selectedCard = screen.getByRole("button", { name: "7 треф" });
    dispatchPointer(selectedCard, "pointerdown", {
      pointerId: 20,
      clientX: 20,
      clientY: 20
    });
    dispatchPointer(selectedCard, "pointermove", {
      pointerId: 20,
      clientX: 180,
      clientY: 180
    });
    dispatchPointer(selectedCard, "pointerup", {
      pointerId: 20,
      clientX: 180,
      clientY: 180
    });

    expect(screen.getAllByTestId("human-card")).toHaveLength(1);
    expect(screen.getByTestId("attack-clubs-7")).toBeInTheDocument();
    expect(screen.getByTestId("attack-diamonds-7")).toBeInTheDocument();
  });

  it("lets the human drag an opening card onto the battlefield", () => {
    const opening = card("clubs", 7);
    const state = makeMultiplayerState({
      hands: {
        human: [opening, card("diamonds", 9)],
        bot: [card("clubs", 10), card("hearts", 11)],
        bot2: [card("spades", 12)],
        bot3: []
      },
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: []
    });

    const { container } = render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    const battlefield = container.querySelector(".battlefield");
    expect(battlefield).not.toBeNull();
    if (!battlefield) return;
    battlefield.getBoundingClientRect = () => rect(100, 100, 500, 500);

    const cardButton = screen.getByRole("button", { name: "7 треф" });
    dispatchPointer(cardButton, "pointerdown", {
      pointerId: 21,
      clientX: 20,
      clientY: 20
    });
    dispatchPointer(cardButton, "pointermove", {
      pointerId: 21,
      clientX: 180,
      clientY: 180
    });
    dispatchPointer(cardButton, "pointerup", {
      pointerId: 21,
      clientX: 180,
      clientY: 180
    });

    expect(screen.getByTestId("attack-clubs-7")).toBeInTheDocument();
    expect(screen.getAllByTestId("human-card")).toHaveLength(1);
  });

  it("lets the human drag a defense card onto a specific attack", () => {
    const attack = card("clubs", 7);
    const defense = card("clubs", 8);
    const state = makeMultiplayerState({
      hands: {
        human: [defense, card("diamonds", 9)],
        bot: [card("hearts", 7), card("hearts", 10)],
        bot2: [card("spades", 11)],
        bot3: []
      },
      trumpCard: card("spades", 14),
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "human",
      phase: "defend",
      table: [{ attack }]
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    const attackTarget = document.querySelector<HTMLElement>(
      '[data-drop-attack-id="clubs-7"]'
    );
    expect(attackTarget).not.toBeNull();
    if (!attackTarget) return;
    attackTarget.getBoundingClientRect = () => rect(200, 100, 320, 280);

    const cardButton = screen.getByRole("button", { name: "8 треф" });
    expect(cardButton).toBeEnabled();
    dispatchPointer(cardButton, "pointerdown", {
      pointerId: 22,
      clientX: 20,
      clientY: 20
    });
    dispatchPointer(cardButton, "pointermove", {
      pointerId: 22,
      clientX: 250,
      clientY: 160
    });

    expect(
      document.querySelectorAll('[data-drop-attack-id="clubs-7"]')
    ).toHaveLength(1);
    expect(attackTarget.getBoundingClientRect()).toMatchObject({
      left: 200,
      top: 100,
      right: 320,
      bottom: 280
    });

    dispatchPointer(cardButton, "pointerup", {
      pointerId: 22,
      clientX: 250,
      clientY: 160
    });

    expect(screen.getByTestId("defense-clubs-7")).toHaveAttribute(
      "aria-label",
      "8 треф"
    );
  });

  it("lets the human choose which attack an ambiguous defense covers", () => {
    const state = makeMultiplayerState({
      hands: {
        human: [card("spades", 6), card("clubs", 8)],
        bot: [card("diamonds", 9)],
        bot2: [card("hearts", 10)],
        bot3: []
      },
      talon: [],
      trumpCard: card("spades", 14),
      attackerId: "bot2",
      defenderId: "human",
      activePlayerId: "human",
      phase: "defend",
      defenderHandSizeAtBoutStart: 2,
      table: [
        { attack: card("hearts", 7) },
        { attack: card("clubs", 7) }
      ]
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "6 пик" }));
    expect(screen.getByTestId("attack-hearts-7")).toBeEnabled();
    expect(screen.getByTestId("attack-clubs-7")).toBeEnabled();

    fireEvent.click(screen.getByTestId("attack-clubs-7"));

    expect(screen.getByTestId("defense-clubs-7")).toHaveAttribute(
      "aria-label",
      "6 пик"
    );
    expect(screen.queryByTestId("defense-hearts-7")).not.toBeInTheDocument();
  });

  it("offers a pass while the human has throw-in priority", () => {
    const state = makeMultiplayerState({
      hands: {
        human: [card("diamonds", 9)],
        bot: [card("clubs", 10)],
        bot2: [card("hearts", 11)],
        bot3: []
      },
      talon: [],
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "throw-in",
      table: [
        {
          attack: card("clubs", 7),
          defense: card("clubs", 8)
        }
      ],
      defenderHandSizeAtBoutStart: 3
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    expect(screen.getByRole("button", { name: "Пас" })).toBeInTheDocument();
  });

  it("throws a matching card in immediately without a selection-confirm step", () => {
    const throwIn = card("diamonds", 7);
    const state = makeMultiplayerState({
      hands: {
        human: [throwIn, card("spades", 9)],
        bot: [card("clubs", 10), card("hearts", 11)],
        bot2: [card("spades", 12)],
        bot3: []
      },
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "throw-in",
      table: [
        {
          attack: card("clubs", 7),
          defense: card("clubs", 8)
        }
      ],
      defenderHandSizeAtBoutStart: 3
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "7 бубен" }));

    expect(screen.getByTestId("attack-diamonds-7")).toBeInTheDocument();
    expect(screen.getAllByTestId("human-card")).toHaveLength(1);
  });

  it("shows a visible discard pile count for beaten cards", () => {
    const state = makeMultiplayerState({
      discard: [
        card("clubs", 6),
        card("diamonds", 6),
        card("hearts", 8),
        card("spades", 8)
      ]
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    expect(screen.getByTestId("beaten-pile")).toHaveAttribute(
      "aria-label",
      "Бито: 4 карт"
    );
    expect(screen.getByTestId("beaten-pile")).toHaveTextContent("Бито");
    expect(screen.getByTestId("beaten-pile")).toHaveTextContent("4");
  });

  it("shows PASS and TAKE as short seat callouts", () => {
    const passState = makeMultiplayerState(
      {
        hands: {
          human: [card("diamonds", 9)],
          bot: [card("clubs", 10)],
          bot2: [card("hearts", 11)],
          bot3: []
        },
        attackerId: "human",
        defenderId: "bot",
        activePlayerId: "human",
        phase: "throw-in",
        table: [
          {
            attack: card("clubs", 7),
            defense: card("clubs", 8)
          }
        ],
        defenderHandSizeAtBoutStart: 3
      },
      3
    );

    const { unmount } = render(
      <MultiplayerTableScreen
        initialState={passState}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Пас" }));
    expect(screen.getByText("ПАС")).toBeInTheDocument();

    unmount();

    const takeState = makeMultiplayerState({
      hands: {
        human: [card("diamonds", 9)],
        bot: [card("clubs", 10)],
        bot2: [card("hearts", 11)],
        bot3: []
      },
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "human",
      phase: "defend",
      table: [{ attack: card("clubs", 7) }],
      defenderHandSizeAtBoutStart: 1
    });

    render(
      <MultiplayerTableScreen
        initialState={takeState}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Беру" }));
    expect(screen.getByText("БЕРУ")).toBeInTheDocument();
  });

  it("lets a bot continue automatically when it owns the turn", async () => {
    vi.useFakeTimers();
    const state = makeMultiplayerState({
      attackerId: "bot",
      defenderId: "bot2",
      activePlayerId: "bot",
      phase: "attack",
      table: []
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 500}
      />
    );

    expect(screen.getByText("Стол свободен")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    expect(screen.queryByText("Стол свободен")).not.toBeInTheDocument();
  });

  it("reveals an opponent card immediately without a transit overlay", async () => {
    vi.useFakeTimers();
    const state = makeMultiplayerState({
      hands: {
        human: [card("diamonds", 9), card("hearts", 11)],
        bot: [card("clubs", 7), card("spades", 10)],
        bot2: [card("diamonds", 12)],
        bot3: []
      },
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "bot",
      phase: "attack",
      table: []
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 500}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    const tableCard = document.querySelector<HTMLElement>(
      ".battlefield [data-card-id]"
    );
    expect(tableCard).not.toBeNull();
    expect(screen.queryByTestId("card-transit")).not.toBeInTheDocument();
    expect(tableCard).not.toHaveStyle({ visibility: "hidden" });
  });

  it("pauses a pending multiplayer bot move while the page is hidden", async () => {
    vi.useFakeTimers();
    const state = makeMultiplayerState({
      attackerId: "bot",
      defenderId: "bot2",
      activePlayerId: "bot",
      phase: "attack",
      table: []
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 500}
      />
    );

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden"
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await act(async () => {
      vi.advanceTimersByTime(5_000);
      await Promise.resolve();
    });
    expect(screen.getByText("Стол свободен")).toBeInTheDocument();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible"
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });
    expect(screen.queryByText("Стол свободен")).not.toBeInTheDocument();
  });

  it("persists multiplayer state through injected storage", () => {
    window.localStorage.clear();
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      }
    };
    const state = makeMultiplayerState({
      hands: {
        human: [card("clubs", 7), card("diamonds", 9)],
        bot: [card("clubs", 10), card("hearts", 11)],
        bot2: [card("spades", 12), card("diamonds", 13)],
        bot3: []
      },
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: []
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        storage={storage}
        now={() => 1234}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "7 треф" }));

    const raw = storage.getItem(CURRENT_MULTIPLAYER_MATCH_KEY);
    expect(raw).not.toBeNull();
    expect(raw).toContain("clubs-7");
    expect(raw).toContain('"savedAtMs":1234');
    expect(
      window.localStorage.getItem(CURRENT_MULTIPLAYER_MATCH_KEY)
    ).toBeNull();
  });

  it("shows the result without a bout-presentation delay", async () => {
    vi.useFakeTimers();
    const attack = card("clubs", 7);
    const defense = card("clubs", 8);
    const state = makeMultiplayerState(
      {
        hands: {
          human: [],
          bot: [card("diamonds", 9)],
          bot2: [],
          bot3: []
        },
        talon: [],
        attackerId: "human",
        defenderId: "bot",
        activePlayerId: "human",
        phase: "throw-in",
        table: [{ attack, defense }],
        defenderHandSizeAtBoutStart: 1,
        throwInCursor: 0,
        consecutivePasses: 0
      },
      2
    );

    render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Пас" }));

    expect(
      screen.queryByTestId("presentation-card-clubs-7")
    ).not.toBeInTheDocument();
    expect(
      document.querySelector(".bout-presentation-label")
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(180);
      await Promise.resolve();
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("reports a finished ranked result exactly once across rerenders", () => {
    const onMatchComplete = vi.fn();
    const state = makeMultiplayerState(
      {
        hands: {
          human: [],
          bot: [card("clubs", 14)],
          bot2: [],
          bot3: []
        },
        talon: [],
        table: [],
        phase: "finished",
        finishOrder: ["human"],
        boutFinishOrder: [],
        foolId: "bot",
        activePlayerId: "bot"
      },
      2
    );

    const { rerender } = render(
      <MultiplayerTableScreen
        initialState={state}
        opponentRatings={[1200]}
        onMatchComplete={onMatchComplete}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    expect(onMatchComplete).toHaveBeenCalledTimes(1);
    expect(onMatchComplete).toHaveBeenCalledWith({
      placement: 1,
      participantCount: 2,
      opponentRatings: [1200],
      technicalLoss: false,
      surrendered: false
    });

    rerender(
      <MultiplayerTableScreen
        initialState={state}
        opponentRatings={[1200]}
        onMatchComplete={onMatchComplete}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    expect(onMatchComplete).toHaveBeenCalledTimes(1);
  });

  it("shows finishing places and the human placement at game end", () => {
    const state = makeMultiplayerState(
      {
        hands: {
          human: [],
          bot: [card("clubs", 14)],
          bot2: [],
          bot3: []
        },
        talon: [],
        table: [],
        phase: "finished",
        finishOrder: ["bot2", "human", "bot3"],
        boutFinishOrder: [],
        foolId: "bot",
        activePlayerId: "bot"
      },
      4
    );

    const onExitToMenu = vi.fn();
    render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 15_000}
        onExitToMenu={onExitToMenu}
      />
    );

    expect(screen.getByText("1 место")).toBeInTheDocument();
    expect(screen.getByText("3 место")).toBeInTheDocument();

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "2 место" }))
      .toBeInTheDocument();
    expect(within(dialog).getByText("Соперник 1 остался с картами."))
      .toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "В меню" }));
    expect(onExitToMenu).toHaveBeenCalledTimes(1);
  });

  it("skips the decorative intro and starts the turn clock immediately", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible"
    });
    const state = makeMultiplayerState(
      {
        attackerId: "human",
        defenderId: "bot",
        activePlayerId: "human",
        phase: "attack",
        table: []
      },
      2
    );

    render(
      <MultiplayerTableScreen
        initialState={state}
        showIntro
        now={() => Date.now()}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    expect(screen.queryByTestId("match-intro")).not.toBeInTheDocument();
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("20");

    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("19");
  });

  it("starts a 20-second multiplayer turn timer", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const state = makeMultiplayerState({
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: []
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        now={() => Date.now()}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("20");

    await act(async () => {
      vi.advanceTimersByTime(5_000);
    });

    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("15");
  });

  it("pauses the multiplayer turn timer while hidden", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const state = makeMultiplayerState({
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: []
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        now={() => Date.now()}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(4_000);
    });
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("16");

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden"
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("16");

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible"
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await act(async () => {
      vi.advanceTimersByTime(6_000);
    });
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("10");
  });

  it("ends the match with a technical loss when a human opening turn reaches zero", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const state = makeMultiplayerState(
      {
        hands: {
          human: [
            card("hearts", 6),
            card("clubs", 9),
            card("diamonds", 7)
          ],
          bot: [card("clubs", 10), card("diamonds", 10)],
          bot2: [],
          bot3: []
        },
        trumpCard: card("hearts", 14),
        attackerId: "human",
        defenderId: "bot",
        activePlayerId: "human",
        phase: "attack",
        table: [],
        defenderHandSizeAtBoutStart: 2
      },
      2
    );

    render(
      <MultiplayerTableScreen
        initialState={state}
        now={() => Date.now()}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(20_250);
      await Promise.resolve();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(180);
      await Promise.resolve();
    });

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Время вышло" })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "Техническое поражение: ход не был сделан за 20 секунд."
      )
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("human-card")).toHaveLength(3);
  });

  it("does not auto-take when the human defender reaches zero", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const attack = card("clubs", 7);
    const state = makeMultiplayerState(
      {
        hands: {
          human: [card("diamonds", 9)],
          bot: [card("spades", 10)],
          bot2: [],
          bot3: []
        },
        talon: [],
        trumpCard: card("hearts", 14),
        attackerId: "bot",
        defenderId: "human",
        activePlayerId: "human",
        phase: "defend",
        table: [{ attack }],
        defenderHandSizeAtBoutStart: 1
      },
      2
    );

    render(
      <MultiplayerTableScreen
        initialState={state}
        now={() => Date.now()}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(20_250);
      await Promise.resolve();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(180);
      await Promise.resolve();
    });

    expect(screen.getByTestId("attack-clubs-7")).toBeInTheDocument();
    expect(screen.getAllByTestId("human-card")).toHaveLength(1);
    expect(
      within(screen.getByRole("dialog")).getByRole("heading", {
        name: "Время вышло"
      })
    ).toBeInTheDocument();
  });

  it("does not restart the multiplayer clock if an animation ends while blurred", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const state = makeMultiplayerState({
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: []
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        now={() => Date.now()}
        animationMs={300}
        botDelay={() => 15_000}
      />
    );

    fireEvent.click(screen.getAllByTestId("human-card")[0]!);
    act(() => {
      window.dispatchEvent(new Event("blur"));
    });

    await act(async () => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("20");

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("19");
  });

  it("lets the human transfer selected cards through the dedicated slot", () => {
    const opening = card("clubs", 7);
    const firstTransfer = card("diamonds", 7);
    const secondTransfer = card("hearts", 7);
    const state = makeMultiplayerState({
      variant: "perevodnoy",
      hands: {
        human: [firstTransfer, secondTransfer, card("spades", 9)],
        bot: [
          card("clubs", 8),
          card("diamonds", 9),
          card("hearts", 10)
        ],
        bot2: [card("clubs", 10)],
        bot3: []
      },
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "human",
      phase: "defend",
      table: [{ attack: opening }],
      defenderHandSizeAtBoutStart: 3
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    const transferSlot = screen.getByTestId("transfer-slot");
    expect(transferSlot).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "7 бубен" }));
    fireEvent.click(screen.getByRole("button", { name: "7 червей" }));

    expect(transferSlot).toBeEnabled();
    expect(transferSlot).toHaveTextContent("2 выбрано");

    fireEvent.click(transferSlot);

    expect(screen.getAllByTestId("human-card")).toHaveLength(1);
    expect(screen.getByTestId("attack-diamonds-7")).toBeInTheDocument();
    expect(screen.getByTestId("attack-hearts-7")).toBeInTheDocument();
  });

  it("lets the human drag a transfer card into the dedicated transfer slot", () => {
    const opening = card("clubs", 7);
    const transferCard = card("diamonds", 7);
    const state = makeMultiplayerState({
      variant: "perevodnoy",
      hands: {
        human: [transferCard, card("spades", 9)],
        bot: [card("clubs", 8), card("diamonds", 10)],
        bot2: [card("hearts", 11), card("spades", 12)],
        bot3: []
      },
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "human",
      phase: "defend",
      table: [{ attack: opening }],
      defenderHandSizeAtBoutStart: 2
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    const transferSlot = screen.getByTestId("transfer-slot");
    transferSlot.getBoundingClientRect = () => rect(400, 100, 520, 240);

    const cardButton = screen.getByRole("button", { name: "7 бубен" });
    dispatchPointer(cardButton, "pointerdown", {
      pointerId: 24,
      clientX: 20,
      clientY: 20
    });
    dispatchPointer(cardButton, "pointermove", {
      pointerId: 24,
      clientX: 450,
      clientY: 160
    });
    dispatchPointer(cardButton, "pointerup", {
      pointerId: 24,
      clientX: 450,
      clientY: 160
    });

    expect(screen.queryByTestId("transfer-slot")).not.toBeInTheDocument();
    expect(screen.getByTestId("attack-diamonds-7")).toBeInTheDocument();
    expect(screen.getAllByTestId("human-card")).toHaveLength(1);
  });

  it("still lets an ambiguous trump transfer card be used for defense", () => {
    const opening = card("clubs", 7);
    const trumpTransfer = card("spades", 7);
    const state = makeMultiplayerState({
      variant: "perevodnoy",
      hands: {
        human: [trumpTransfer, card("diamonds", 9)],
        bot: [
          card("clubs", 8),
          card("diamonds", 10),
          card("hearts", 11)
        ],
        bot2: [card("diamonds", 7), card("clubs", 10)],
        bot3: []
      },
      trumpCard: card("spades", 6),
      attackerId: "bot2",
      defenderId: "human",
      activePlayerId: "human",
      phase: "defend",
      table: [{ attack: opening }],
      defenderHandSizeAtBoutStart: 2
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "7 пик" }));
    expect(screen.getByTestId("transfer-slot")).toBeEnabled();
    expect(screen.getByRole("button", { name: "Отбить выбранной" }))
      .toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Отбить выбранной" }));

    expect(screen.getByTestId("defense-clubs-7")).toHaveAttribute(
      "aria-label",
      "7 пик"
    );
  });
});
