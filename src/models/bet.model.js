import mongoose, { Schema } from "mongoose";
import { Game } from "./game.mode.js";
import { APIError } from "../utils/APIError.js";

const betSchema = new Schema(
  {
    userId: {
      type: Schema.ObjectId,
      ref: "User",
    },
    betAmounts: {
      type: Object,
    },
    gameId: {
      type: Schema.ObjectId,
      ref: "Game",
    },
    totalBetPoints: {
      type: Number,
    },
    isScanned: {
      type: Boolean,
    },
    uniqueString: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

betSchema.pre("save", async function (next) {
  const game = await Game.findById(this.gameId);
  if (!game) {
    throw new APIError(400, "Game not found !");
  }

  // Calculating TotalBetPoints
  let totalBetPoints = 0;
  let orderPoints = game.orderPoints;
  let starPoints = game.starPoints;
  for (const property in this.betAmounts) {
    totalBetPoints = totalBetPoints + this.betAmounts[property];
    orderPoints = orderPoints + this.betAmounts[property];
    starPoints[property] =
      starPoints[property] + this.betAmounts[property] * 11;
  }
  this.totalBetPoints = totalBetPoints;
  console.log(totalBetPoints, orderPoints, starPoints);

  // Calculating Max Return
  let max_return = orderPoints * game.game_percentage;

  await Game.findByIdAndUpdate(
    this.gameId,
    {
      $set: {
        orderPoints,
        starPoints,
        max_amount_to_return: max_return,
      },
    },
    {
      new: true,
    }
  );

  next();
});

export const Bet = mongoose.model("Bet", betSchema);
