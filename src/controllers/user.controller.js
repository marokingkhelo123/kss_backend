import { Bet } from "../models/bet.model.js";
import { Game } from "../models/game.mode.js";
import { LiveGame } from "../models/liveGame.mode.js";
import { Transaction } from "../models/transaction.mode.js";
import { APIError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "./../models/user.model.js";
import { Admin } from "../models/admin.model.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken(user._id);
    const refreshToken = await user.generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new APIError(
      500,
      "Something went wrong while generating refresh and access token."
    );
  }
};

// ADMIN PANEL API
// GET ALL USERS
// RegisterUser
// Change Password
// GetTransactions ( Datewise & Userwise )
// UpdateUserPoints
// WithDrawResultsManually
// UpdateUser
//

const registerUser = asyncHandler(async (req, res) => {
  try {
    // Get creator from middleware (req.user)
    const creator = req.user;
    if (!creator) {
      throw new APIError(401, "Unauthorized - Creator information not found.");
    }

    // Get Data from REQ BODY
    const {
      firstName,
      lastName,
      location,
      userType: requestedUserType,
      isUserActive,
      username,
      password,
      mobileNo,
      allowSelectWinner,
    } = req.body;

    // CHECK NULL FIELDS
    if (
      [
        firstName,
        lastName,
        location,
        username,
        password,
        mobileNo,
      ].some((field) => field?.trim() === "")
    ) {
      throw new APIError(400, "All required fields must be provided.");
    }

    // Determine the actual userType based on creator's role
    let finalUserType;
    const creatorType = creator.userType;

    if (creatorType === "admin") {
      // Admin can create both Distributor and Prime User
      // Use the requested userType, but validate it
      if (requestedUserType && (requestedUserType === "Distributor" || requestedUserType === "Prime User")) {
        finalUserType = requestedUserType;
      } else {
        throw new APIError(400, "Admin can only create Distributor or Prime User. Invalid userType provided.");
      }
    } else if (creatorType === "Distributor") {
      // Distributor can only create Prime User - force it regardless of what was sent
      finalUserType = "Prime User";
    } else {
      throw new APIError(403, "You don't have permission to create users.");
    }

    // Check if username already exists
    const existedUser = await User.findOne({
      $or: [{ username }],
    });

    if (existedUser) {
      throw new APIError(400, "User Already Exists.");
    }

    // Get creator ID (could be Admin._id or User._id)
    const creatorId = creator._id;

    // Set default values for new user
    const defaultBalance = 0;
    const defaultDepositedAmount = 0;
    const defaultWinningAmount = 0;
    const defaultIsUserActive = isUserActive !== undefined ? isUserActive : true;
    const defaultAllowSelectWinner = allowSelectWinner !== undefined ? allowSelectWinner : (finalUserType === "Distributor" ? true : false);

    // Add Data to MongoDB
    const user = await User.create({
      firstName,
      lastName,
      location,
      userType: finalUserType,
      isUserActive: defaultIsUserActive,
      balance: defaultBalance,
      depositedAmount: defaultDepositedAmount,
      winning_amount: defaultWinningAmount,
      username,
      password,
      mobileNo,
      createdBy: creatorId,
      allowSelectWinner: defaultAllowSelectWinner,
    });

    // Removed Password and RefreshToken From USER
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!createdUser) {
      throw new APIError(500, "Something went wrong while creating user.");
    }
    // Return Response
    return res
      .status(201)
      .json(
        new APIResponse(201, createdUser, "User Registered Sucessfully !!")
      );
  } catch (error) {
    throw new APIError(400, error?.message || error);
  }
});

const loginUserWithToken = asyncHandler(async (req, res) => {
  // get email & password from req.body

  try {
    const options = {
      httpOnly: true,
      secure: true,
    };
    return res.status(200).json(
      new APIResponse(
        200,
        {
          user: req.user,
          allowUser: true,
        },
        "User Logged In Sucessfully !!"
      )
    );
  } catch (error) {
    throw new APIError(400, "User Not Found");
  }
});

const loginUser = asyncHandler(async (req, res) => {
  // get email & password from req.body

  try {
    const { username, password } = req.body;
    if (!username || !password) {
      throw new APIError(400, "Username and Password are required !!");
    }
    // check if user exists if not return error
    let user = await User.findOne({ username });
    if (!user) {
      throw new APIError(400, "User don't exist.");
    }
    // Prevent Distributor from logging into playing screen
    if (user.userType === "Distributor") {
      throw new APIError(403, "Distributors are not allowed to login to the playing screen.");
    }
    // Only allow Prime User to login
    if (user.userType !== "Prime User") {
      throw new APIError(403, "Only Prime users can login to the playing screen.");
    }
    // Check if user is active
    if (!user.isUserActive) {
      throw new APIError(403, "Your account is inactive. Please contact administrator.");
    }
    // Check Password

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      throw new APIError(400, "Wrong Password !!");
    }
    // if yes then send access token and refresh token.
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );
    // return response as cookies
    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    // Added these 2 options will make sure cokkies are only modified from server.
    const options = {
      httpOnly: true,
      secure: true,
    };
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new APIResponse(
          200,
          {
            user: loggedInUser,
            accessToken,
            refreshToken,
          },
          "User Logged In Sucessfully !!"
        )
      );
  } catch (error) {
    throw new APIError(400, "User Not Found");
  }
});

const logoutUser = asyncHandler(async (req, res) => {
  // DeleteCookies...
  let id = req.user._id;
  await User.findByIdAndUpdate(
    id,
    { $set: { refreshToken: undefined } },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new APIResponse(200, {}, "User Logged Out !"));
});

const getAllUser = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password");
  return res.status(200).json(new APIResponse(200, users, "ALL USERS"));
});

const updateUserActive = asyncHandler(async (req, res) => {
  const { _id, isUserActive } = req.body;
  if (!_id && isUserActive) {
    throw new APIError(400, "User ID and Active Field needed.");
  }

  let user = await User.findById(_id);

  if (!user) {
    throw new APIError(400, "User Don't exist");
  }

  // Store the new active state
  const newActiveState = !isUserActive;
  
  // If user is being deactivated, clear their refreshToken to logout their session immediately
  if (!newActiveState && user.isUserActive) {
    // Clear refreshToken to invalidate all active sessions
    user.refreshToken = null;
  }
  
  user.isUserActive = newActiveState;
  await user.save();
  let newuser = await User.findById(_id);

  return res
    .status(200)
    .json(new APIResponse(200, newuser, "User Active State Updated."));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  // Access RefreshToken from Cookies
  try {
    const incommingRefreshToken =
      req.cookies?.refreshToken || req.body.refreshToken;

    if (!incommingRefreshToken) {
      throw new APIError(401, "Unauthorized request !!");
    }

    let decodedToken = jwt.verify(
      incommingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    let user = await User.findById(decodedToken._id).select("refreshToken isUserActive");

    if (!user) {
      throw new APIError(401, "Invalid Refresh Token !!");
    }

    // Check if user is active
    if (!user.isUserActive) {
      throw new APIError(403, "Your account is inactive. Please contact administrator.");
    }

    if (incommingRefreshToken != user.refreshToken) {
      throw new APIError(401, "Refresh token is expired");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new APIResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token Refreshed"
        )
      );
  } catch (error) {
    throw new APIError(401, error?.message || "Invalid Refresh Token");
  }
});

const changeUserPassword = asyncHandler(async (req, res) => {
  try {
    const { username, oldpassword, newpassword } = req.body; // Confirm New Password is also taken sometimes.

    let user = await User.find({ username });
    user = user[0];
    // console.log(user);
    // const isPasswordCorrect = await bcrypt.compare(oldpassword, user.password)
    // console.log(isPasswordCorrect);
    const isPasswordCorrect = await user.isPasswordCorrect(oldpassword);
    if (!isPasswordCorrect) {
      return res
        .status(200)
        .json(
          new APIResponse(
            200,
            { updated: false, message: "Wrong Credentails" },
            "Password Not Updated"
          )
        );
    }

    user.password = newpassword;
    await user.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json(
        new APIResponse(
          200,
          { updated: true, message: "Password Updated ! Please login" },
          "Password Updated Sucessfully"
        )
      );
  } catch (error) {
    console.log(error);
    throw new APIError(400, "Password not updated.");
  }
});

const getCurrentUser = asyncHandler(async (req, res) => {
  try {
    let user = req.user;
    if (!user) {
      throw new APIError(400, "User Not Found ! Wrong Credentails ! ");
    }
    res.status(200).json(new APIResponse(200, { ...user }, "User Found!"));
  } catch (error) {
    throw new APIError(400, "User Not Found ! Wrong Credentails !");
  }
});

const updateDistributorActive = asyncHandler(async (req, res) => {
  const { _id, allowSelectWinner } = req.body;
  if (!_id && allowSelectWinner) {
    throw new APIError(400, "User ID and Active Field needed.");
  }

  let user = await User.findById(_id);

  if (!user) {
    throw new APIError(400, "User Don't exist");
  }

  user.allowSelectWinner = !allowSelectWinner;
  await user.save();
  let newuser = await User.findById(_id);

  return res
    .status(200)
    .json(new APIResponse(200, newuser, "allowSelectWinner State Updated."));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  try {
    // 1. Getting Data From Request Body
    const { fullName, email } = req.body;

    //2. Check If Data is Passed. If not throw ERROR
    if (!fullName || !email) {
      throw new APIError(400, "All fields are required !");
    }

    //3. Look for USER in DB. And using $set operator update the fields.
    const updatedUser = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          fullName,
          email,
        },
      },
      {
        new: true,
      }
    ).select("-password");
    //4. Exclude the password while returning response.

    //5. Response Sent
    return res
      .status(200)
      .json(
        new APIResponse(
          200,
          { updatedUser },
          "Account Details Updated Sucessfully !"
        )
      );
  } catch (error) {
    throw new APIError(400, "All fields are required ! Something went wrong !");
  }
});

// Generate a Game
const createNewGame = asyncHandler(async (req, res) => {
  const game = await Game.create({
    duration: 5,
    totalBets: [],
    orderPoints: 0,
    max_amount_to_return: 0,
    game_percentage: 0.9,
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
  if (!game) {
    throw new APIError(400, "Something went wrong in game creation.");
  }

  res.status(200).json(new APIResponse(200, game, "New Game Created"));
});
// Get Bets from User

const createBet = asyncHandler(async (req, res) => {
  // User Can PUT Game on CurrentGAME ONLY
  const { gameId, userId, betAmounts, uniqueString } = req.body;
  if (!gameId || !userId || !betAmounts) {
    throw new APIError(400, "GameId, UserId, and BetAmounts are required");
  }

  // Get user to check balance
  const user = await User.findById(userId);
  if (!user) {
    throw new APIError(400, "User not found");
  }

  // Calculate total bet amount
  let totalBetAmount = 0;
  for (const property in betAmounts) {
    totalBetAmount = totalBetAmount + betAmounts[property];
  }

  // Check if user has sufficient balance
  if (user.balance < totalBetAmount) {
    throw new APIError(400, `Insufficient balance. You have ${user.balance} points but need ${totalBetAmount} points.`);
  }

  // Get opening balance before deduction
  const openingBalance = user.balance;

  // Deduct bet amount from user balance
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        balance: user.balance - totalBetAmount,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedUser) {
    throw new APIError(400, "Something went wrong while updating user balance.");
  }

  // Create transaction record for the bet
  const transaction = await Transaction.create({
    amount: totalBetAmount,
    gameId: gameId,
    userId: userId,
    isProfit: false,
    totalBetPoints: totalBetAmount,
  });

  if (!transaction) {
    // Rollback balance update if transaction creation fails
    await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          balance: openingBalance,
        },
      }
    );
    throw new APIError(400, "Something went wrong while creating transaction.");
  }

  // Create the bet
  const bet = await Bet.create({
    gameId,
    userId,
    betAmounts,
    uniqueString,
  });

  if (!bet) {
    // Rollback: delete transaction and restore balance if bet creation fails
    await Transaction.findByIdAndDelete(transaction._id);
    await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          balance: openingBalance,
        },
      }
    );
    throw new APIError(400, "Something went wrong in bet creation.");
  }

  // Populate bet with user and game data for receipt
  const populatedBet = await Bet.findById(bet._id)
    .populate("userId", "firstName lastName username _id")
    .populate("gameId", "startTime duration endTime");

  // Get game data
  const game = await Game.findById(gameId);
  
  // Format order number: YYYYMMDD + sequence (using last 6 digits of bet _id converted to number)
  const betDate = new Date(bet.createdAt);
  const dateStr = betDate.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const betIdStr = bet._id.toString();
  // Convert last 6 hex characters to decimal and pad to 6 digits
  const hexSequence = betIdStr.slice(-6);
  const decimalSequence = parseInt(hexSequence, 16) % 1000000; // Ensure it's max 6 digits
  const sequence = String(decimalSequence).padStart(6, "0"); // Pad to 6 digits
  const orderNumber = `${dateStr}${sequence}`;

  // Format KUID: KUID + username
  const kuid = `${user.username}`;

  // Calculate draw time: game startTime + duration
  let drawTime = null;
  if (game && game.startTime) {
    const startTime = new Date(game.startTime);
    const durationMinutes = game.duration || 5;
    const drawDateTime = new Date(startTime.getTime() + durationMinutes * 60000);
    drawTime = drawDateTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  // Format date for receipt
  const receiptDate = betDate.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  // Format print time
  const printTime = new Date().toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Prepare receipt data
  const receiptData = {
    uniqueString: bet.uniqueString,
    betId: bet._id,
    kuid: kuid,
    orderNumber: orderNumber,
    date: receiptDate,
    drawTime: drawTime,
    betAmounts: betAmounts,
    totalBetPoints: bet.totalBetPoints,
    printTime: printTime,
    gameId: gameId,
    userId: userId,
  };

  res.status(200).json(new APIResponse(200, receiptData, "BET Created"));
});

function generateRandomString(length) {
  const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    result += charset[randomIndex];
  }
  return result;
}

// GET LIVE GAME ON MOBILE AND DESKTOP APPLICATION
const getLiveGame = asyncHandler(async (req, res) => {
  console.log("LIVE GAME ACCESSED");
  const liveGame = await LiveGame.find();
  if (!liveGame[0]) {
    throw new APIError(400, "Live Game Not Found");
  }

  const game = await Game.findById(liveGame[0].gameId);

  res.status(200).json(new APIResponse(200, game, "Live Game Found"));
});

const getLatestGames = asyncHandler(async (req, res) => {
  const latestGames = await Game.find()
    .sort({ startTime: -1 })
    .limit(10)
    .select(
      "winning_number winning_x startTime totalUsersPlayed distributorsWinners"
    )
    .exec();
  res.status(200).json(new APIResponse(200, latestGames, "Latest 10 Games"));
});

const getUserBalance = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    throw new APIError(400, "UserId is required");
  }
  let user = await User.findById(userId);
  if (!user) {
    throw new APIError(400, "Something went wrong");
  }
  if (!user.isUserActive) {
    res
      .status(200)
      .json(
        new APIResponse(200, { user: {}, isAllowed: false }, "USER Disabled")
      );
  } else {
    res.status(200).json(new APIResponse(200, { user, isAllowed: true }, ""));
  }
});

const updateUserBalance = asyncHandler(async (req, res) => {
  const { userId, userbalance, userwinning } = req.body;
  console.log("BALANCEUPDATECALLED", req.body);
  if (
    !userId == undefined ||
    !userbalance == undefined ||
    !userwinning == undefined
  ) {
    throw new APIError(400, "Balances and UserID needed.");
  }
  let user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        balance: userbalance,
        winning_amount: userwinning,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");
  if (!user) {
    throw new APIError(400, "User Balance Not Updated");
  }
  res.status(200).json(new APIResponse(200, user, "User Balance Updated"));
});

const getUserTransactions = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    throw new APIError(400, "UserId is required");
  }
  const transactions = await Transaction.find({ userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .exec();
  res.json(new APIResponse(200, transactions, "Transactions"));
});

const withDrawUserBalance = asyncHandler(async (req, res) => {
  const { userId, balance } = req.body;
  if (!userId && !balance) {
    throw new APIError(400, "USERID & Balance are required.");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new APIError(400, "User Not Found");
  }
  let openingBalance = user.balance;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        balance: user.balance - balance,
        winning_amount:
          user.winning_amount < balance ? 0 : user.winning_amount - balance,
      },
    },
    {
      new: true,
    }
  );

  let closingBalance = updatedUser.balance;

  if (!updatedUser) {
    throw new APIError(400, "Something went wrong while money deposit.");
  }

  const transaction = await Transaction.create({
    amount: balance,
    gameId: null,
    source: "WithDraw balance",
    type: "Remove Balance",
    userId,
    openingBalance,
    closingBalance,
    isProfit: false,
    totalBetPoints: 0,
  });

  if (!transaction) {
    throw new APIError(400, "Something went wrong while creating transaction");
  }

  res
    .status(200)
    .json(new APIResponse(200, {}, "Balance Withdrawn Sucessfully !"));
});

const depositUserBalance = asyncHandler(async (req, res) => {
  const { receiverId, senderId, balance } = req.body;
  if (!receiverId || !balance) {
    throw new APIError(400, "Receiver ID and Balance are required.");
  }

  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw new APIError(400, "Receiver user not found.");
  }

  // Check if sender is Admin or Distributor
  let sender = null;
  let isAdmin = false;
  
  if (senderId) {
    // Try to find sender in Admin model first
    sender = await Admin.findById(senderId);
    if (sender && sender.userType === "admin") {
      isAdmin = true;
    } else {
      // If not Admin, try User model (could be Distributor)
      sender = await User.findById(senderId);
      if (!sender) {
        throw new APIError(400, "Sender not found.");
      }
    }
  }

  // Update receiver balance
  let receiveropeningBalance = receiver.balance;
  const updatedUser = await User.findByIdAndUpdate(
    receiverId,
    {
      $set: {
        balance: receiver.balance + balance,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedUser) {
    throw new APIError(400, "Something went wrong while updating receiver balance.");
  }
  let receiverclosingBalance = updatedUser.balance;

  // Create transaction for receiver
  const transaction = await Transaction.create({
    amount: balance,
    gameId: null,
    source: isAdmin ? "Admin Deposit" : "Deposit balance",
    type: "Add Balance",
    userId: receiverId,
    openingBalance: receiveropeningBalance,
    closingBalance: receiverclosingBalance,
    isProfit: false,
    totalBetPoints: 0,
  });

  if (!transaction) {
    throw new APIError(400, "Something went wrong while creating transaction");
  }

  // If sender is Distributor (not Admin), deduct from their balance
  if (sender && sender.userType === "Distributor" && !isAdmin) {
    let senderopeningBalance = sender.balance;
    const updatedSender = await User.findByIdAndUpdate(
      senderId,
      {
        $set: {
          balance: sender.balance - balance,
        },
      },
      {
        new: true,
      }
    );

    if (!updatedSender) {
      throw new APIError(400, "Something went wrong while updating sender balance.");
    }
    let senderclosingBalance = updatedSender.balance;

    // Create transaction for sender (Distributor)
    const senderTransaction = await Transaction.create({
      amount: balance,
      gameId: null,
      source: "Transfer balance",
      type: "Remove Balance",
      userId: senderId,
      openingBalance: senderopeningBalance,
      closingBalance: senderclosingBalance,
      isProfit: false,
      totalBetPoints: 0,
    });

    if (!senderTransaction) {
      throw new APIError(400, "Something went wrong while creating sender transaction");
    }
  }
  // If Admin, no balance deduction needed (Admin can give points freely)

  res
    .status(200)
    .json(new APIResponse(200, {}, "Balance Deposited Sucessfully !"));
});

const getUserInformation = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    throw new APIError(400, "UserId is required");
  }
  var startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  var endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  let bets = await Bet.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId), // Match the bets with the specified user ID
        createdAt: {
          $gte: startOfToday, // Bets created at or after the start of today
        },
      },
    },
    {
      $lookup: {
        from: "games",
        let: { gameId: "$gameId" }, // Variable to store gameId from bets
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", "$$gameId"] }, // Compare gameId with _id of Game collection
            },
          },
          {
            $project: {
              _id: 0,
              startTime: 1, // Include only startTime field from Game collection
            },
          },
        ],
        as: "gameInfo",
      },
    },
    {
      $unwind: "$gameInfo",
    },
    {
      $addFields: {
        startTime: "$gameInfo.startTime", // Add the startTime field to the root document
      },
    },
    {
      $project: {
        gameInfo: 0, // Exclude the gameInfo field
      },
    },
  ]);

  res.status(200).send(new APIResponse(200, bets, "User Information"));
});

const deleteUser = asyncHandler(async (req, res) => {
  let { _id } = req.body;

  if (!_id) {
    throw new APIError(400, "ID fields is required.");
  }
  // name = name.toLowerCase().trim();
  const user = await User.findOne({ _id });

  if (!user) {
    throw new APIError(400, "User don't exist");
  }

  await User.deleteOne({ _id });
  return res.status(200).json(new APIResponse(200, {}, "Location Deleted"));
});

const updateWinner = asyncHandler(async (req, res) => {
  const { _id, winning_number, winning_x, userType, updaterId } = req.body;
  if (!_id && !winning_number && !winning_x) {
    throw new APIError(400, "ID WINNING NUMBER AND WINNING X ARE REQURIED");
  }

  let game = await Game.findById({ _id });
  if (!game) {
    throw new APIError(400, "Game don't exist ");
  }

  let values = {
    1: "one",
    2: "two",
    3: "three",
    4: "four",
    5: "five",
    6: "six",
    7: "seven",
    8: "eight",
    9: "nine",
    10: "ten",
    11: "eleven",
    12: "twelve",
  };

  if (userType == "admin") {
    game.winning_number = values[winning_number];
    game.winning_x = winning_x;
  } else {
    let array = game.distributorsWinners;
    array.push({
      distributorId: updaterId,
      winning_number: values[winning_number],
      winning_x,
    });
    game.distributorsWinners = [...array];
  }
  await game.save();

  return res
    .status(200)
    .json(new APIResponse(200, {}, "Winner Drawn Manually"));
});

const getProfitForBet = asyncHandler(async (req, res) => {
  const { betUniqueNumber, user } = req.body;

  if (!betUniqueNumber) {
    throw new APIError(400, "BET UNIQEU STRING REQUIRED");
  }
  let bet = await Bet.findOne({ uniqueString: betUniqueNumber });

  if (!bet) {
    throw new APIError(400, "BET NOT FOUND");
  }

  let winning_number;
  let winning_x;
  const game = await Game.findById(bet.gameId);
  console.log("INSIDE GAME", game);
  
  // Check if game has finished (has winning_number)
  if (!game.winning_number && game.distributorsWinners.length === 0) {
    throw new APIError(400, "Game is still running. Please wait for the game to finish.");
  }
  
  if (game.distributorsWinners.length > 0) {
    let result = game.distributorsWinners.filter(
      (draw) => draw.distributorId == user.createdBy
    );
    if (result.length > 0) {
      winning_number = result[0].winning_number;
      winning_x = result[0].winning_x;
    } else {
      winning_number = game.winning_number;
      winning_x = game.winning_x;
    }
  } else {
    winning_number = game.winning_number;
    winning_x = game.winning_x;
  }
  let profit = bet.betAmounts[winning_number] * winning_x * 11;
  if (bet.isScanned) {
    return res
      .status(200)
      .json(
        new APIResponse(
          200,
          { isScanned: true, isProfit: profit > 0 ? true : false, profit: 0 },
          "Already Scanned"
        )
      );
  }

  if (profit > 0 && !bet.isScanned) {
    console.log("Creating Transaction");
    // Get the bet owner's current balance from database to ensure accuracy
    const betOwner = await User.findById(bet.userId);
    const betOwnerBalance = Number(betOwner.balance) || 0;
    let openingBalance = betOwnerBalance;
    let closingBalance = betOwnerBalance + profit;
    let transaction = await Transaction.create({
      gameId: game._id,
      userId: bet.userId,
      date: Date.now,
      isProfit: profit > 0 ? true : false,
      amount: profit,
      total_winning: profit,
      openingBalance,
      closingBalance,
      totalBetPoints: 0,
    });
  }
  bet.isScanned = true;
  await bet.save();

  // Update the bet owner's balance (not the scanner's balance)
  const updatedUser = await User.findById(bet.userId);
  // Ensure balance and winning_amount are valid numbers (default to 0 if undefined/null)
  const currentBalance = Number(updatedUser.balance) || 0;
  const currentWinningAmount = Number(updatedUser.winning_amount) || 0;
  updatedUser.balance = currentBalance + profit;
  updatedUser.winning_amount = currentWinningAmount + profit;
  await updatedUser.save();

  return res.status(200).json(
    new APIResponse(
      200,
      {
        isScanned: false,
        isProfit: profit > 0 ? true : false,
        profit: profit,
      },
      "Profit"
    )
  );
});

const getDailyUserTransactions = asyncHandler(async (req, res) => {
  const { userId, start, end } = req.body;
  if (!userId) {
    throw new APIError(400, "UserId is required");
  }

  const query = {
    userId,
    createdAt: {
      $gte: start,
      $lte: end,
    },
  };
  let transactions = await Transaction.find(query);
  transactions.reverse();

  res.json(new APIResponse(200, transactions, "Transactions"));
});

const updateUser = asyncHandler(async (req, res) => {
  const { userId, data } = req.body;
  let user = await User.findById(userId);
  let newUser = {
    ...user._doc,
    ...data,
    password: data.password.length > 0 ? data.password : user._doc.password
  }

  // Find the user by ID and update only the provided fields
  const updatedUser = await User.findByIdAndUpdate(userId, {$set:newUser}, {
    new: true, // Return the modified document
    runValidators:true
  });

  if (!updatedUser) {
    throw new APIError(404, "User not found.");
  }

  // Return Response
  return res.status(200).json(new APIResponse(200, {}, "User Updated"));
});




export {
  getProfitForBet,
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeUserPassword,
  getCurrentUser,
  updateAccountDetails,
  createNewGame,
  createBet,
  getLiveGame,
  getLatestGames,
  getUserBalance,
  updateUserBalance,
  getUserTransactions,
  depositUserBalance,
  withDrawUserBalance,
  getUserInformation,
  getAllUser,
  updateUserActive,
  deleteUser,
  updateWinner,
  getDailyUserTransactions,
  updateDistributorActive,
  loginUserWithToken,
  updateUser
};
