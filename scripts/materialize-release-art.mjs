import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile
} from "node:fs/promises";
import path from "node:path";

const packRoot = path.resolve("src", "assets", "release-art-pack");
const manifestPath = path.join(packRoot, "manifest.json");
const outputRoot = path.resolve("public", "assets");
const generatedRoots = ["cards", "card-backs", "ui", "backgrounds", "audio"];

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function safeRelativePath(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    path.isAbsolute(value) ||
    value.split(/[\\/]/u).includes("..") ||
    ![".webp", ".mp3"].includes(path.extname(value))
  ) {
    throw new Error(`Unsafe release artwork path: ${String(value)}`);
  }
  return value;
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (
    manifest.version !== 3 ||
    !Array.isArray(manifest.files) ||
    manifest.files.length !== manifest.fileCount
  ) {
    throw new Error("Invalid release artwork manifest");
  }

  const partNames = (await readdir(packRoot))
    .filter((name) => /^part-\d+\.bin$/u.test(name))
    .sort();

  if (partNames.length === 0) {
    throw new Error("Release artwork pack has no binary chunks");
  }

  const chunks = [];
  for (const name of partNames) {
    chunks.push(await readFile(path.join(packRoot, name)));
  }
  const packed = Buffer.concat(chunks);

  if (packed.length !== manifest.totalBytes) {
    throw new Error(
      `Release artwork byte count mismatch: expected ${manifest.totalBytes}, got ${packed.length}`
    );
  }
  if (sha256(packed) !== manifest.sha256) {
    throw new Error("Release artwork pack checksum mismatch");
  }

  for (const generatedRoot of generatedRoots) {
    await rm(path.join(outputRoot, generatedRoot), {
      recursive: true,
      force: true
    });
  }

  let offset = 0;
  for (const entry of manifest.files) {
    const relativePath = safeRelativePath(entry.path);
    const length = Number(entry.length);
    if (!Number.isSafeInteger(length) || length <= 0) {
      throw new Error(`Invalid release artwork length for ${relativePath}`);
    }

    const nextOffset = offset + length;
    if (nextOffset > packed.length) {
      throw new Error(`Release artwork pack truncated at ${relativePath}`);
    }

    const bytes = packed.subarray(offset, nextOffset);
    if (sha256(bytes) !== entry.sha256) {
      throw new Error(`Release artwork checksum mismatch: ${relativePath}`);
    }

    const destination = path.join(outputRoot, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, bytes);
    offset = nextOffset;
  }

  if (offset !== packed.length) {
    throw new Error(
      `Release artwork pack has ${packed.length - offset} trailing bytes`
    );
  }

  console.log(
    `Release artwork materialized: ${manifest.files.length} files, ${packed.length} bytes`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
