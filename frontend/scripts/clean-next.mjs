import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const nextDir = resolve(process.cwd(), ".next");

try {
  await rm(nextDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
  console.log("Removed .next cache");
} catch (err) {
  console.warn("Skipping .next cleanup:", err?.message || err);
}
