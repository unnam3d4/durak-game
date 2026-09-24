import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CardView } from "../../src/ui/CardView";

describe("CardView release artwork", () => {
  it("renders the generated face as a real image over a CSS fallback", () => {
    const { container } = render(
      <CardView
        card={{
          id: "hearts-12",
          suit: "hearts",
          rank: 12
        }}
      />
    );

    const card = container.querySelector(".card");
    const art = container.querySelector(".card-art");

    expect(card).not.toBeNull();
    expect(art).not.toBeNull();
    expect(art).toHaveAttribute(
      "src",
      "./assets/cards/hearts/Q_hearts.webp"
    );
    expect(
      container.querySelector(".card-corner")
    ).not.toBeNull();
  });
});
