import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "daily-cleanup",
  { hourUTC: 4, minuteUTC: 0 },
  internal.cleanup.runDailyCleanup,
);

export default crons;