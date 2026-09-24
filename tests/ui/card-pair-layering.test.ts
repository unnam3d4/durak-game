import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("card pair layering", () => {
  it("keeps the defending card visually above the attack card", async () => {
    const css = await readFile(
      path.resolve("src/ui/multiplayer-table.css"),
      "utf8"
    );

    expect(css).toContain(".card-pair>.card{\n  z-index:1;");
    expect(css).toContain(".card-pair>.defense-card{\n  z-index:3;");
    expect(css).toContain(
      ".card-pair>.defense-card>.card{\n  position:relative;\n  z-index:3;"
    );
  });
});
