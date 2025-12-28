import { Admin } from "../models/admin.model.js";
import { Transaction } from "../models/transaction.mode.js";
import { APIError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Game } from "../models/game.mode.js";
import { GamePercentage } from "../models/gamepercentage.model.js";
import { User } from "../models/user.model.js";
import { Mongoose } from "mongoose";

import { LiveGame } from "../models/liveGame.mode.js";
import { Bet } from "../models/bet.model.js";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const admin = await Admin.findById(userId);
    const accessToken = await admin.generateAccessToken(admin._id);
    const refreshToken = await admin.generateRefreshToken(admin._id);
    admin.refreshToken = refreshToken;
    await admin.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    console.log(error);
    throw new APIError(
      500,
      "Something went wrong while generating refresh and access token."
    );
  }
};
const generateAccessAndRefreshTokensDistributors = async (userId) => {
  try {
    const admin = await User.findById(userId);
    const accessToken = await admin.generateAccessToken(admin._id);
    const refreshToken = await admin.generateRefreshToken(admin._id);
    admin.refreshToken = refreshToken;
    await admin.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    console.log(error);
    throw new APIError(
      500,
      "Something went wrong while generating refresh and access token."
    );
  }
};

const registerAdmin = asyncHandler(async (req, res) => {
  try {
    // Get Data from REQ BODY
    const { username, password } = req.body;

    // CHECK NULL FIELDS

    const existedUser = await Admin.findOne({
      $or: [{ username }],
    });

    if (existedUser) {
      throw new APIError(400, "Admin Already Exists.");
    }

    // Add Data to MongoDB
    const admin = await Admin.create({
      username,
      password,
      userType: "admin",
      profit_points: 0,
      winning_points: 0,
    });

    // Removed Password and RefreshToken From USER
    const createdAdmin = await Admin.findById(admin._id).select(
      "-password -refreshToken"
    );

    if (!createdAdmin) {
      throw new APIError(500, "Something went wrong while creating user.");
    }
    // Return Response
    return res
      .status(201)

      .json(new APIResponse(201, createdAdmin, "ADMIN Created Sucessfully !!"));
  } catch (error) {
    throw new APIError(400, error);
  }
});

const loginAdmin = asyncHandler(async (req, res) => {
  // get email & password from req.body

  try {
    const { username, password, userType } = req.body;

    if (!username || !password || !userType) {
      throw new APIError(
        400,
        "Username and Password and USERTYPE are required !!"
      );
    }
    // check if user exists if not return error
    let admin;

    if (userType == "Admin") {
      admin = await Admin.findOne({ username });
      if (!admin) {
        throw new APIError(400, "User don't exist.");
      }
      const isPasswordValid = await admin.isPasswordCorrect(password);
      if (!isPasswordValid) {
        throw new APIError(400, "Wrong Password !!");
      }
      // if yes then send access token and refresh token.
      const { accessToken, refreshToken } =
        await generateAccessAndRefreshTokens(admin._id);
      const loggedInAdmin = await Admin.findById(admin._id).select(
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
              admin: loggedInAdmin,
              accessToken,
              refreshToken,
            },
            "Admin Logged In Sucessfully !!"
          )
        );
    } else {
      admin = await User.findOne({ username });
      if (!admin) {
        throw new APIError(400, "User don't exist.");
      }
      // Prevent Prime users from logging into admin panel
      if (admin.userType === "Prime User") {
        throw new APIError(403, "Prime users are not allowed to login to the admin panel.");
      }
      // Only allow Distributor to login
      if (admin.userType !== "Distributor") {
        throw new APIError(403, "Only Admin and Distributor users can login to the admin panel.");
      }
      // Check if user is active
      if (!admin.isUserActive) {
        throw new APIError(403, "Your account is inactive. Please contact administrator.");
      }
      const isPasswordValid = await admin.isPasswordCorrect(password);
      if (!isPasswordValid) {
        throw new APIError(400, "Wrong Password !!");
      }
      // if yes then send access token and refresh token.
      const { accessToken, refreshToken } =
        await generateAccessAndRefreshTokensDistributors(admin._id);
      const loggedInAdmin = await User.findById(admin._id).select(
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
              admin: loggedInAdmin,
              accessToken,
              refreshToken,
            },
            "Admin Logged In Sucessfully !!"
          )
        );
    }

    // Check Password

    // return response as cookies
  } catch (error) {
    throw new APIError(400, "User Not Found");
  }
});

const getTransactions = asyncHandler(async (req, res) => {
  const { userId, fromDate, toDate, page } = req.body; // Assuming these are query parameters
  let limit = 20;
  // const fromDateObj = `${fromDate}T00:00:00.000+05:30`;
  // const toDateObj = `${toDate}T23:59:59.999+05:30`;

  // let dates = convertISTtoUTC(fromDateObj, toDateObj);
  let query;
  if (userId == "all") {
    query = {
      createdAt: { $gte: fromDate, $lte: toDate },
    };
  } else {
    query = {
      userId: userId,
      createdAt: { $gte: fromDate, $lte: toDate },
    };
  }

  const total = await Transaction.countDocuments(query);
  const transactions = await Transaction.find(query)
    .sort({ createdAt: -1 })
    .exec();

  const groupedTransactions = {};

  const processTransactions = async () => {
    for (const transaction of transactions) {
      const { userId, createdAt, ...rest } = transaction;
      const dateKey = createdAt.toISOString().slice(0, 10); // Extract date part from createdAt

      // Fetch the user details asynchronously
      const user = await User.findById(userId);
      if (user) {
        // If the dateKey doesn't exist in the groupedTransactions, create it
        if (!groupedTransactions[dateKey]) {
          groupedTransactions[dateKey] = {};
        }

        // If the userId doesn't exist for the dateKey, create it
        if (!groupedTransactions[dateKey][user.username]) {
          groupedTransactions[dateKey][user.username] = [];
        }

        // Push the transaction object to the corresponding userId array for the date
        groupedTransactions[dateKey][user.username].push({
          ...rest._doc,
          // username: user.username,
        });
      }
    }
  };

  await processTransactions();

  let record = userId == "all" ? groupedTransactions : transactions;
  const totalPages = Math.ceil(total / limit);
  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        { transactions: record, totalPages, currentPage: page },
        "Transactions"
      )
    );
});

const getDashboardDetails = asyncHandler(async (req, res) => {
  let { userId, userType } = req.body;

  let user = await getUserProfile(userId, userType);
  const currentDate = new Date();
  const startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));

  const query = {
    createdAt: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  };

  const transactions = await Transaction.find(query);

  let profit_points = 0;
  let winning_points = 0;
  let totalOrderPoints = 0;

  const promises = transactions.map(async (transaction) => {
    let user = await User.findById(transaction.userId);
    if (userType == "admin") {
      if (transaction.type == "Gaming") {
        if (!transaction.isProfit) {
          profit_points = profit_points + transaction.amount * 1;
          totalOrderPoints = totalOrderPoints + transaction.totalBetPoints;
        } else if (transaction.isProfit) {
          winning_points = winning_points + transaction.amount * 1;
          profit_points = profit_points - transaction.amount * 1;
        }
      }
    } else {
      if (
        transaction.type == "Gaming" &&
        user?.createdBy.toString() == userId
      ) {
        if (!transaction.isProfit) {
          profit_points = profit_points + transaction.amount * 1;
          totalOrderPoints = totalOrderPoints + transaction.totalBetPoints;
        } else if (transaction.isProfit) {
          winning_points = winning_points + transaction.amount * 1;
          profit_points = profit_points - transaction.amount * 1;
        }
      }
    }
  });
  await Promise.all(promises);

  return res.status(200).json(
    new APIResponse(
      200,
      {
        orderPoints: totalOrderPoints,
        profit_points,
        winning_points,
        user,
      },
      "Dashboard"
    )
  );
});

const updateGamePercentage = asyncHandler(async (req, res) => {
  const { percent } = req.body;

  let gamepercentage = await GamePercentage.find();
  let gamepercentageValue = await GamePercentage.findById(
    gamepercentage[0]._id
  );
  gamepercentageValue.percent = percent;
  await gamepercentageValue.save();

  return res
    .status(201)
    .json(new APIResponse(201, {}, "Updated Game Percentage"));
});

const getGamePercentage = asyncHandler(async (req, res) => {
  let percent = await GamePercentage.find();

  return res
    .status(200)
    .json(
      new APIResponse(200, { percent: percent[0].percent }, "Game Percent")
    );
});

const getLiveGameDistributor = asyncHandler(async (req, res) => {
  const { userId, userType } = req.body;
  const liveGame = await LiveGame.find();

  if (!liveGame) {
    throw new APIError(400, "Live Game Not Found");
  }

  const game = await Game.findById(liveGame[0].gameId);

  let bets = await Bet.find({ gameId: game._id });

  if (!bets) {
    console.log("BETS NOT FOUND");
  }

  let starPoints = {
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
  };

  let orderPoints = 0;
  const promises = bets.map(async (bet) => {
    let user = await User.findById(bet.userId);
    if (user.createdBy == userId) {
      for (const property in bet.betAmounts) {
        orderPoints = orderPoints + bet.betAmounts[property];
        starPoints[property] =
          starPoints[property] + bet.betAmounts[property] * 11;
      }
    }
  });
  await Promise.all(promises);

  let updatedGame = { ...game._doc };
  updatedGame.orderPoints = orderPoints;
  updatedGame.starPoints = starPoints;

  return res
    .status(200)
    .json(new APIResponse(200, { game: updatedGame }, "Live Game Found"));
});

const getUserProfile = async (userId, userType) => {
  let user;
  if (userType == "admin") {
    user = await Admin.findById(userId).select("-password -accessToken");
  } else {
    user = await User.findById(userId).select("-password -accessToken");
  }
  return user;
};

export {
  registerAdmin,
  loginAdmin,
  getTransactions,
  getDashboardDetails,
  updateGamePercentage,
  getGamePercentage,
  getLiveGameDistributor,
  getUserProfile,
};
