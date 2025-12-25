import mongoose, { Schema } from "mongoose";

const gameSchema = new Schema({
  duration: {
    type: Number,
    required: true,
  },
  totalUsersPlayed: [
    {
      type: Object,
    },
  ],
  max_amount_to_return: {
    type: Number,
  },
  orderPoints: {
    type: Number,
    required: true,
  },
  game_percentage: {
    type: Number,
  },
  starPoints: {
    type: Object,
  },
  winning_number: {
    type: String,
  },
  winning_x: {
    type: Number,
  },
  startTime: {
    type: Date,
  },
  endTime: {
    type: Date,
  },
  distributorsWinners: [{ type: Object }],
});

export const Game = mongoose.model("Game", gameSchema);
