import { runSync } from "./sync.js";

runSync().catch((err) => {
  console.error("Sync failed:", err);
  process.exitCode = 1;
});
