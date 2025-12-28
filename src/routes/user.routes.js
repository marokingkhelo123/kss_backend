import { Router } from "express";
import {
  changeUserPassword,
  createBet,
  createNewGame,
  deleteUser,
  depositUserBalance,
  getAllUser,
  getDailyUserTransactions,
  getLatestGames,
  getLiveGame,
  getProfitForBet,
  getUserBalance,
  getUserInformation,
  getUserTransactions,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateDistributorActive,
  updateUserActive,
  updateUserBalance,
  updateWinner,
  withDrawUserBalance,
} from "../controllers/user.controller.js";
import { verifyJWT, verifyJWTForRegistration } from "../middlewares/auth.middleware.js";

const router = Router();

// Mobile App & Desktop Routes
router.route("/login").post(loginUser);

router.route("/logout").post(logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/getLiveGame").get(getLiveGame);
router.route("/getLatestGame").get(getLatestGames);
router.route("/getUserTransactions").post(getUserTransactions);
router.route("/depositUserBalance").post(depositUserBalance);
router.route("/getUserBalance").post(getUserBalance);
router.route("/withDrawUserBalance").post(withDrawUserBalance);

// Admin Panel Routes

router.route("/register").post(verifyJWTForRegistration, registerUser);
router.route("/updateWinner").post(updateWinner);
router.route("/update-password").post(changeUserPassword);
router.route("/getAllUsers").get(getAllUser);
router.route("/updateUserActive").post(updateUserActive);
router.route("/updateDistributorActive").post(updateDistributorActive);
router.route("/deleteUser").delete(deleteUser);

// Game Creation
router.route("/create-game").post(createNewGame);
router.route("/create-bet").post(createBet);
router.route("/update-user-balance").post(updateUserBalance);
router.route("/get-user-info").post(getUserInformation);
router.route("/getDailyTransactions").post(getDailyUserTransactions);
router.route("/getBetProfit").post(getProfitForBet);

export default router;
