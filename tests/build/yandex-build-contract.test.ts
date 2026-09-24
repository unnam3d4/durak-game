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

  it("locks the document surface against page scroll and overscroll", async () => {
    const appCss = await readFile(
      path.resolve("src/app/app.css"),
      "utf8"
    );

    const documentSurfaceRules = [
      ...appCss.matchAll(/html,body,#root\s*\{([^}]*)\}/g)
    ].map((match) => match[1] ?? "");

    expect(documentSurfaceRules.length).toBeGreaterThan(0);
    expect(
      documentSurfaceRules.some(
        (rule) =>
          /height\s*:\s*100%/.test(rule) &&
          /overflow\s*:\s*hidden/.test(rule) &&
          /overscroll-behavior\s*:\s*none/.test(rule)
      )
    ).toBe(true);
  });
});
