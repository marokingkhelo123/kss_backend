import cron from "node-cron";
import { Game } from "../models/game.mode.js";
import { LiveGame } from "../models/liveGame.mode.js";
import { findAutomaticWinner } from "./WinningLogic.js";
import { GamePercentage } from "../models/gamepercentage.model.js";
import {
  getCurrentSlot,
  getGameDurationMinutes,
  getGameEndTime,
} from "../constants.js";

let winnerTriggeredForGameId = null;

function roundEndTime(game) {
  if (!game?.startTime) return null;
  return getGameEndTime(game.startTime);
}

async function roundStillRunning(game) {
  const endTime = roundEndTime(game);
  return Boolean(endTime && endTime.getTime() > Date.now() + 2000);
}

async function createGame() {
  try {
    const liveGame = await LiveGame.findOne();
    if (liveGame?.gameId) {
      const current = await Game.findById(liveGame.gameId).select(
        "startTime endTime"
      );
      if (await roundStillRunning(current)) {
        console.log("Current round still running. Skip creating a new game.");
        return;
      }
    }

    console.log("Creating New Game");
    const gamepercentage = await GamePercentage.find();
    console.log(gamepercentage);
    const slot = getCurrentSlot();
    const game = await Game.create({
      duration: slot.duration,
      totalBets: [],
      orderPoints: 0,
      totalUsersPlayed: [],
      max_amount_to_return: 0,
      game_percentage: (gamepercentage && gamepercentage.length > 0 && gamepercentage[0].percent) ? gamepercentage[0].percent : 0.9,
      starPoints: {
        one: 0,
        two: 0,
        three: 0,
        four: 0,
        five: 0,
        six: 0,
        seven: 0,
        eight: 0,
        nine: 0,
        ten: 0,
        eleven: 0,
        twelve: 0,
      },
      startTime: slot.startTime,
      endTime: slot.endTime,
    });

    console.log("New Game Created :- ", game);
    
    // Find existing LiveGame or create a new one
    let updatedLiveGame = await LiveGame.findOneAndUpdate(
      {},
      {
        $set: { gameId: game._id },
      },
      {
        new: true,
        upsert: true, // Create if it doesn't exist
      }
    );
    
    if (updatedLiveGame) {
      console.log("Live Game Updated IN DATABASE :- ", updatedLiveGame.gameId);
    } else {
      console.log("Failed to update Live Game ⚠️");
    }
  } catch (error) {
    console.log(error);
  }
}

async function generateWinnerCheck() {
  try {
    const liveGame = await LiveGame.findOne();
    if (!liveGame?.gameId) return;

    const game = await Game.findById(liveGame.gameId).select(
      "startTime endTime winning_x"
    );
    if (!game?.startTime || game.winning_x != null) return;

    const gameId = String(game._id);
    if (winnerTriggeredForGameId === gameId) return;

    const endTime = roundEndTime(game);
    const remaining = endTime.getTime() - Date.now();
    if (remaining <= 10000 && remaining > -60000) {
      winnerTriggeredForGameId = gameId;
      console.log("GENERATING WINNERS :- ");
      await findAutomaticWinner();
      const updated = await Game.findById(gameId).select("winning_x");
      if (updated && updated.winning_x == null) {
        winnerTriggeredForGameId = null;
      }
    }
  } catch (error) {
    console.log("Failed to check winner window:", error);
  }
}

async function ensureLiveRound() {
  try {
    const slot = getCurrentSlot();
    const liveGame = await LiveGame.findOne();
    const game = liveGame?.gameId
      ? await Game.findById(liveGame.gameId).select("startTime")
      : null;
    const endTime = roundEndTime(game);

    if (endTime && endTime.getTime() === slot.endTime.getTime() && endTime.getTime() > Date.now()) {
      await Game.findByIdAndUpdate(game._id, {
        duration: slot.duration,
        endTime: slot.endTime,
      });
      console.log(
        `Synced live game to ${slot.duration} minutes, ends at ${slot.endTime.toISOString()}`
      );
      return;
    }

    await createGame();
  } catch (error) {
    console.log("Failed to sync live game duration:", error);
  }
}

export async function startCronJobs() {
  const slot = getCurrentSlot();
  console.log(
    `Game duration ${slot.duration} minutes. Current round ends at ${slot.endTime.toISOString()}`
  );
  await ensureLiveRound();

  const createGameJob = `*/${getGameDurationMinutes()} * * * *`;
  cron.schedule(createGameJob, createGame);

  cron.schedule("*/10 * * * * *", generateWinnerCheck);

  console.log("Cron jobs started");
}
