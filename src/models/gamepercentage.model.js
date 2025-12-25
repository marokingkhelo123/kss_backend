import mongoose, { Schema } from "mongoose";

const gamePercentageSchema = new Schema({
  percent: {
    type: Number,
    default: 0.9,
  },
});

export const GamePercentage = mongoose.model(
  "GamePercentage",
  gamePercentageSchema
);
