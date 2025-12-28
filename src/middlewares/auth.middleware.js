import { Admin } from "../models/admin.model.js";
import { User } from "../models/user.model.js";
import { APIError } from "../utils/APIError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    let { accessToken } = req.body;

    if (!accessToken) {
      throw new APIError(401, "Unauthorized Request");
    }

    // // Verify Token USING JWT
    let decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    console.log(decodedToken);
    let user;
    if (decodedToken.userType == "admin") {
      user = await Admin.findById(decodedToken._id).select(
        "-password -refreshToken"
      );
    } else {
      user = await User.findById(decodedToken._id).select(
        "-password -refreshToken"
      );
    }

    if (!user) {
      //TODO:
      return res.status(201).json({
        allowUser: false,
      });
    }
    if (user.userType !== "admin" &&  !user.isUserActive) {
      return res.status(201).json({
        allowUser: false,
      });
    }
    req.user = user;

    next(); // NOTE: NEVER FORGET NEXT IN MIDDLEWARES
  } catch (error) {
    throw new APIError(401, error?.message || "Invalid Access Token");
  }
});

export const verifyJWTDistributor = asyncHandler(async (req, res, next) => {
  try {
    let { accessToken } = req.body;

    if (!accessToken) {
      throw new APIError(401, "Unauthorized Request");
    }

    // // Verify Token USING JWT
    let decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

    let user;
    if (decodedToken.userType == "admin") {
      user = await Admin.findById(decodedToken._id).select(
        "-password -refreshToken"
      );
    } else {
      user = await User.findById(decodedToken._id).select(
        "-password -refreshToken"
      );
    }

    if (!user.isUserActive && user.userType != "admin") {
      //TODO:
      return res.status(201).json({
        allowUser: false,
      });
    }

    req.user = user;

    next(); // NOTE: NEVER FORGET NEXT IN MIDDLEWARES
  } catch (error) {
    throw new APIError(401, error?.message || "Invalid Access Token");
  }
});

// Middleware for user registration - supports both body and cookies
export const verifyJWTForRegistration = asyncHandler(async (req, res, next) => {
  try {
    // Try to get token from body first, then cookies, then headers
    let accessToken = req.body?.accessToken || req.cookies?.accessToken || req.headers?.authorization?.replace("Bearer ", "");

    if (!accessToken) {
      throw new APIError(401, "Unauthorized Request - Access token required");
    }

    // Verify Token USING JWT
    let decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

    let user;
    if (decodedToken.userType == "admin") {
      user = await Admin.findById(decodedToken._id).select(
        "-password -refreshToken"
      );
    } else {
      user = await User.findById(decodedToken._id).select(
        "-password -refreshToken"
      );
    }

    if (!user) {
      throw new APIError(401, "User not found");
    }

    // Check if user is active (for non-admin users)
    if (user.userType !== "admin" && !user.isUserActive) {
      throw new APIError(403, "Your account is inactive. Please contact administrator.");
    }

    // Only allow Admin and Distributor to create users
    if (user.userType !== "admin" && user.userType !== "Distributor") {
      throw new APIError(403, "You don't have permission to create users.");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new APIError(401, error?.message || "Invalid Access Token");
  }
});
