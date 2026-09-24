import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Yandex production build contract", () => {
  it("uses relative Vite assets and the release build target", async () => {
    const config = await readFile(
      path.resolve("vite.config.ts"),
      "utf8"
    );

    expect(config).toContain('base: "./"');
    expect(config).toContain('target: "es2022"');
    expect(config).not.toContain('base: "/durak-game/"');
  });

  it("exposes the archive verification script", async () => {
    const packageJson = JSON.parse(
      await readFile(path.resolve("package.json"), "utf8")
    ) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["verify:yandex-build"]).toBe(
      "npm run build && node scripts/verify-yandex-build.mjs"
    );
  });

  it("uses the Yandex platform SDK root path in index.html", async () => {
    const indexHtml = await readFile(
      path.resolve("index.html"),
      "utf8"
    );

    expect(indexHtml).toContain('src="/sdk.js"');
    expect(indexHtml).not.toContain('src="./sdk.js"');
  });
});
