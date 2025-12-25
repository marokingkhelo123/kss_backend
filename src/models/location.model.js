import mongoose, { Schema } from "mongoose";

const locationSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  active: {
    type: Boolean,
    required: true,
  },
});

export const Location = mongoose.model("Location", locationSchema);
