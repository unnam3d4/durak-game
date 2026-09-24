import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const dist = path.resolve("dist");
const maxBytes = 100 * 1024 * 1024;
const unsafeName = /[\sА-Яа-яЁё]/u;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (unsafeName.test(entry.name)) {
      throw new Error(
        `Unsafe Yandex archive name: ${path.relative(dist, path.join(directory, entry.name))}`
      );
    }

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const indexPath = path.join(dist, "index.html");
  try {
    await stat(indexPath);
  } catch {
    throw new Error("Missing dist/index.html");
  }

  const files = await walk(dist);
  let totalBytes = 0;

  for (const file of files) {
    totalBytes += (await stat(file)).size;
  }

  if (totalBytes > maxBytes) {
    throw new Error(
      `Yandex archive exceeds 100 MiB uncompressed: ${totalBytes} bytes`
    );
  }

  const indexHtml = await readFile(indexPath, "utf8");
  if (indexHtml.includes("/durak-game/")) {
    throw new Error(
      "dist/index.html still contains GitHub Pages /durak-game/ asset paths"
    );
  }

  console.log(
    `Yandex build verified: ${files.length} files, ${totalBytes} uncompressed bytes`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
