import cron from "node-cron";
import { Game } from "../models/game.mode.js";
import { LiveGame } from "../models/liveGame.mode.js";
import { findAutomaticWinner } from "./WinningLogic.js";
import { GamePercentage } from "../models/gamepercentage.model.js";

async function createGame() {
  try {
    console.log("Creating New Game");
    const gamepercentage = await GamePercentage.find();
    console.log(gamepercentage);
    const game = await Game.create({
      duration: 5,
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
      startTime: Date.now(),
      endTime: null,
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
  const now = new Date();
  const minutes = now.getMinutes();

  if (minutes % 5 === 4) {
    // FINDING WINNER
    console.log("GENERATING WINNERS :- ");
    findAutomaticWinner();
  }
}

export async function startCronJobs() {
  const createGameJob = "*/5 * * * *";
  cron.schedule(createGameJob, createGame);

  const checkWinnerJob = "50/50 * * * * *";
  cron.schedule(checkWinnerJob, generateWinnerCheck);

  console.log("Cron jobs started");
}
