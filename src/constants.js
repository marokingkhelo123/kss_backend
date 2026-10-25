// export const DB_PROD = "prod";
export const DB_DEV = "development";
export const DB_NAME = "KSS";

const ALLOWED_GAME_DURATIONS = [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30];

// Read at call time so dotenv has already loaded. Same repo can run a 2-minute
// and a 5-minute app by setting GAME_DURATION_MINUTES on each server.
export function getGameDurationMinutes() {
  const raw = process.env.GAME_DURATION_MINUTES;
  if (raw == null || String(raw).trim() === "") {
    return 2;
  }
  const parsed = Number(raw);
  if (!ALLOWED_GAME_DURATIONS.includes(parsed)) {
    throw new Error(
      `GAME_DURATION_MINUTES must be one of ${ALLOWED_GAME_DURATIONS.join(
        ", "
      )}. Received: ${raw}`
    );
  }
  return parsed;
}

export function getGameEndTime(startTime, durationMinutes = getGameDurationMinutes()) {
  return new Date(new Date(startTime).getTime() + durationMinutes * 60 * 1000);
}

// Slot boundaries follow the server clock, same grid the cron uses.
export function getCurrentSlot(now = new Date()) {
  const duration = getGameDurationMinutes();
  const startTime = new Date(now);
  startTime.setSeconds(0, 0);
  const minutes = startTime.getMinutes();
  startTime.setMinutes(minutes - (minutes % duration));
  return {
    duration,
    startTime,
    endTime: getGameEndTime(startTime, duration),
    serverNow: new Date(now),
  };
}

// Live-game responses always carry this clock, ignoring a stale duration stored on the game.
export function attachGameClock(game, now = new Date()) {
  const duration = getGameDurationMinutes();
  const startTime = game?.startTime ? new Date(game.startTime) : null;
  const endTime = startTime ? getGameEndTime(startTime, duration) : null;
  return {
    duration,
    endTime,
    serverNow: new Date(now).toISOString(),
  };
}
