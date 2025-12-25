import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    userType: {
      type: String,
      required: true,
    },
    isUserActive: {
      type: Boolean,
      required: true,
    },
    balance: {
      type: Number,
      required: true,
    },
    depositedAmount: {
      type: Number,
      required: true,
    },
    winning_amount: {
      type: Number,
      required: true,
    },
    password: {
      type: String,
      required: [true, "Password is required !!"],
    },
    mobileNo: {
      type: String,
    },
    refreshToken: {
      type: String,
    },
    createdBy: {
      type: Schema.ObjectId,
      ref: "User",
    },
    allowSelectWinner: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hook to Hash Password before saving into DB
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method Check Password
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Generate Access Token
userSchema.methods.generateAccessToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
      username: this.username,
      userType: this.userType,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

// Generate Refresh Token
userSchema.methods.generateRefreshToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
