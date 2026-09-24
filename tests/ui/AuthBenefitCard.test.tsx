import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthBenefitCard } from "../../src/ui/AuthBenefitCard";

afterEach(cleanup);

describe("AuthBenefitCard", () => {
  it("starts authorization only from the explicit sign-in button", async () => {
    const onAuthorize = vi.fn().mockResolvedValue(false);

    render(
      <AuthBenefitCard
        onAuthorize={onAuthorize}
        onDismiss={() => undefined}
      />
    );

    expect(onAuthorize).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Войти через Яндекс" })
    );

    await waitFor(() => {
      expect(onAuthorize).toHaveBeenCalledTimes(1);
    });
  });

  it("lets a guest dismiss the optional offer and keep playing", () => {
    const onDismiss = vi.fn();

    render(
      <AuthBenefitCard
        onAuthorize={async () => false}
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Позже" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("localizes the benefit copy", () => {
    render(
      <AuthBenefitCard
        lang="en"
        onAuthorize={async () => false}
        onDismiss={() => undefined}
      />
    );

    expect(
      screen.getByRole("button", { name: "Sign in with Yandex" })
    ).toBeInTheDocument();
    expect(screen.getByText(/save progress across devices/i))
      .toBeInTheDocument();
  });
});
