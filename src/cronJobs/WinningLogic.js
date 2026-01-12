import { Bet } from "../models/bet.model.js";
import { Game } from "../models/game.mode.js";
import { LiveGame } from "../models/liveGame.mode.js";
import { Transaction } from "../models/transaction.mode.js";
import { User } from "../models/user.model.js";

let values = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};
function generateRandomNumbers() {
  const min = 1;
  const max = 9;

  // Generate two random numbers between 1 and 12
  const randomNumber1 = Math.floor(Math.random() * (max - min + 1)) + min;
  const randomNumber2 = Math.floor(Math.random() * 3) + min;

  // Convert one of the numbers to its textual representation
  const randomNumber1Text = numberToWord(randomNumber1);

  return [randomNumber1Text, randomNumber2];
}

function numberToWord(number) {
  const numberWords = [
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
  ];
  return numberWords[number - 1]; // Adjust index to match number value
}

const calculationOfNewWinner = async (gameId) => {
  try {
    let updatedGame = await Game.findById(gameId);
    let currentGameBets = await Bet.find({ gameId });
    let usersPlayedSet = new Set();

    // PUSH USERID OF EACH UNIQUE USER WHO PLAYED
    currentGameBets.forEach((bet) => {
      usersPlayedSet.add(bet.userId.toString());
    });

    // Convert Set to Array
    let usersPlayed = Array.from(usersPlayedSet);

    let totalPlayUsersArray = [];

    const promises = usersPlayed.map(async (user) => {
      let completeUser = await User.findById(user);
      let distributorsWinners = updatedGame.distributorsWinners;
      let winningResult = null;
      // CHECK IF DISTRIBUTOR OF CURRENT USER HAVE DRAWN WINNERS
      if (distributorsWinners.length > 0) {
        let result = distributorsWinners.filter(
          (object) => object.distributorId == completeUser.createdBy
        );
        winningResult = result[0];
      }
      // FILTER OUT BETS OF THAT PARTICULAR USER
      let userBets = currentGameBets.filter((bet) => bet.userId == user);
      let totalBetPoints = 0;
      let totalWinPoints = 0;
      let total_winning = 0;
      if (winningResult != undefined || winningResult != null) {
        console.log("APPLYING DISTRIBUTOR WIN LOGIC");
        userBets.forEach((bet) => {
          totalBetPoints = totalBetPoints + bet.totalBetPoints;
          totalWinPoints =
            totalWinPoints + bet.betAmounts[winningResult.winning_number] * 1;
        });
        total_winning = totalWinPoints * winningResult.winning_x * 11;
      } else {
        console.log("APPLYING ADMIN WIN LOGIC");
        userBets.forEach((bet) => {
          totalBetPoints = totalBetPoints + bet.totalBetPoints;
          totalWinPoints =
            totalWinPoints + bet.betAmounts[updatedGame.winning_number] * 1;
        });
        total_winning = totalWinPoints * updatedGame.winning_x * 11;
      }
      let object = {
        _id: user,
        totalBetPoints,
        total_winning,
      };
      totalPlayUsersArray.push(object);
    });

    await Promise.all(promises);

    // UPDATE WINNING OF EACH USER

    await Game.findByIdAndUpdate(gameId, {
      $set: {
        totalUsersPlayed: totalPlayUsersArray,
      },
    });
  } catch (error) {
    console.log(error);
  }
};

function findNearestLessThanX(obj, x) {
  if (x == 0) {
    return { key: "one", value: 0 };
  }

  let values = Object.values(obj);

  // Filter values that are less than x
  let filteredValues = values.filter((value) => value < x);

  // If there are no values less than x, return null
  if (filteredValues.length === 0) {
    return { key: "one", value: obj["one"] };
  }

  // Find the maximum value among the filtered values
  let nearestValue = Math.max(...filteredValues);

  // Find the corresponding key for the nearest value
  let nearestKey = Object.keys(obj).find((key) => obj[key] === nearestValue);

  return { key: nearestKey, value: nearestValue };
}

const automaticGameLogic = async (gameId, game) => {
  if (game && gameId) {
    let nearestValue = findNearestLessThanX(
      game.starPoints,
      game.max_amount_to_return
    );
    console.log("NEAREST VALUE : ", nearestValue);
    if (nearestValue) {
      let winning_number = nearestValue.key;
      let winning_x = 1;
      if (game.max_amount_to_return == 0) {
        console.log("No one put bet. Drawing Automatic Random Numbers.....");
        const [randomNumberText, randomNumber] = generateRandomNumbers();
        winning_number = randomNumberText;
        winning_x = 1;
      } else {
        // Loop through the values
        let allsamevalue = false;
        for (let key in values) {
          if (game.starPoints[key] != game.starPoints["one"]) {
            allsamevalue = false;
            break;
          } else {
            allsamevalue = true;
          }
        }

        if (allsamevalue) {
          // When applied same amount on all numbers.
          console.log("I AM IN THIS 176");
          const [randomNumberText, randomNumber] = generateRandomNumbers();
          winning_number = randomNumberText;
          winning_x = 1;
        } else {
          if (game.starPoints[winning_number] == 0) {
            winning_x = Math.floor(Math.random() * 3) + 1;
          } else {
            for (let index = 9; index >= 1; index--) {
              if (index * nearestValue.value < game.max_amount_to_return) {
                winning_x = index;
                break;
              }
            }
          }
        }
      }
      console.log("Winning Number : ", winning_number, "-", winning_x, "X");
      // Updating Current Game with WINNING NUMBER AND X
      let updatedGame = await Game.findByIdAndUpdate(
        gameId,
        {
          $set: { winning_number, winning_x },
        },
        { new: true }
      );
      // Added Amount Earned By each users to their accounts
    }
    await calculationOfNewWinner(gameId);
  } else {
    console.log(
      "Game And GameID are required in Automatic Game Logic Function. "
    );
  }
};

export const findAutomaticWinner = async () => {
  try {
    let liveGame = await LiveGame.find();

    if (!liveGame || liveGame.length === 0) {
      console.log("LIVE GAME NOT FOUND ⚠️");
      return;
    }

    let gameId = liveGame[0].gameId;
    console.log("LiveGame ID Fetched : ", gameId);
    if (gameId) {
      let game = await Game.findById(gameId);
      console.log(game);
      if (game && game.winning_x == null) {
        console.log("Winner Draw Automatically !!");
        await automaticGameLogic(gameId, game);
      } else if (game) {
        console.log("Winners Draw by Admin Manually :");
        await calculationOfNewWinner(gameId);
      } else {
        console.log("GAME NOT FOUND ⚠️");
      }
    } else {
      console.log("LIVE GAME NOT FOUND ⚠️");
    }
  } catch (error) {
    console.log(error);
  }
};
