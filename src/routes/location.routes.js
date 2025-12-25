import { Router } from "express";
import {
  addLocation,
  deleteLocation,
  getAllLocation,
  updateLocation,
} from "../controllers/location.controller.js";

const router = Router();
router.route("/getAllLocations").get(getAllLocation);
router.route("/addLocation").post(addLocation);
router.route("/updateLocation").post(updateLocation);
router.route("/deleteLocation").post(deleteLocation);

export default router;
