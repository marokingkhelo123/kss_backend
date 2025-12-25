import mongoose, { Schema } from "mongoose";

const liveGameSchema = new Schema({
  gameId: {
    type: Schema.ObjectId,
    ref: "Game",
  },
});

export const LiveGame = mongoose.model("LiveGame", liveGameSchema);
