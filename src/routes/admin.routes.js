import { Router } from "express";
import {
  getDashboardDetails,
  getGamePercentage,
  getLiveGameDistributor,
  getTransactions,
  loginAdmin,
  registerAdmin,
  updateGamePercentage,
} from "../controllers/admin.controller.js";
import {
  getAllUser,
  loginUserWithToken,
  updateUser,
} from "../controllers/user.controller.js";
import {
  verifyJWT,
  verifyJWTDistributor,
} from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/create").post(registerAdmin);
router.route("/login").post(loginAdmin);
router.route("/transactions").post(getTransactions);
router.route("/dashboard-details").post(getDashboardDetails);
router.route("/update-gamepercent").post(updateGamePercentage);
router.route("/get-gamepercent").get(getGamePercentage);
router.route("/loginwithtoken").post(verifyJWT, loginUserWithToken);
router.route("/getAllUsers").post(verifyJWTDistributor, getAllUser);
router
  .route("/getLiveGameDistributor")
  .post(verifyJWTDistributor, getLiveGameDistributor);
  router.route("/updateUser").post(updateUser);


export default router;
