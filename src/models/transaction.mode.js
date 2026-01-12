import mongoose, { Schema } from "mongoose";
import { APIError } from "../utils/APIError.js";
import { User } from "./user.model.js";

const transactionSchema = new Schema(
  {
    userId: {
      type: Schema.ObjectId,
      ref: "User",
    },
    isProfit: {
      type: Boolean,
    },
    amount: {
      type: Number,
    },
    gameId: {
      type: Schema.ObjectId,
    },
    type: {
      type: String,
    },
    source: {
      type: String,
    },
    total_winning: {
      type: String,
    },
    uniqueString: {
      type: String, // barcode / ticket identifier
    },
    openingBalance: {
      type: Number,
    },
    closingBalance: {
      type: Number,
    },
    totalBetPoints: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.pre("save", async function (next) {
  if (!this.userId) {
    throw new APIError(400, "UserID is required");
  }
  let user = await User.findById(this.userId);
  if (!user) {
    throw new APIError(400, "User Not Found");
  }
  if (this.gameId != null) {
    if (this.isProfit) {
      this.source = "Winnings Balance";
      this.type = "Gaming";
    } else {
      this.source = "Loss balance";
      this.type = "Gaming";
      this.closingBalance = user.balance;
      this.openingBalance = user.balance + this.amount;
    }
  }
  console.log("TRANSACTION BEFORE SAVE", this);
  next();
});

export const Transaction = mongoose.model("Transaction", transactionSchema);

// let winning_amount;
// let balance;
// if (this.isProfit) {
// winning_amount = user.winning_amount + this.total_winning * 1;
// balance = user.balance + this.total_winning * 1;
// }
// await User.findByIdAndUpdate(
//   this.userId,
//   {
//     $set: {
//       winning_amount,
//       balance,
//     },
//   },
//   { new: true }
// );
