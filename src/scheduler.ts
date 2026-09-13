import cron from "node-cron";
import "dotenv/config";
import { runSync } from "./sync.js";

const schedule = process.env.SYNC_CRON ?? "0 * * * *";

if (!cron.validate(schedule)) {
  throw new Error(`Invalid SYNC_CRON expression: "${schedule}"`);
}

console.log(`Wallet -> Actual Budget sync scheduled with cron "${schedule}".`);

let running = false;

async function tick(): Promise<void> {
  if (running) {
    console.warn("Previous sync still running, skipping this tick.");
    return;
  }
  running = true;
  try {
    await runSync();
  } catch (err) {
    console.error("Scheduled sync failed:", err);
  } finally {
    running = false;
  }
}

cron.schedule(schedule, tick);

// Run once immediately on startup so the container doesn't wait a full
// interval before the first sync.
void tick();
