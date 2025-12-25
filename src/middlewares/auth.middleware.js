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
