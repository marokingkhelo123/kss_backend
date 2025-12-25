// get all locations
// add location
// update location

import { Location } from "../models/location.model.js";
import { APIError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getAllLocation = asyncHandler(async (req, res) => {
  const locations = await Location.find({});
  if (!locations) {
    throw new APIError(400, "Location don't exist");
  }
  return res
    .status(200)
    .json(new APIResponse(200, locations, "Locations Received."));
});

const addLocation = asyncHandler(async (req, res) => {
  let { name, active } = req.body;

  if (!name && !active) {
    throw new APIError(400, "Name and Active fields are required.");
  }
  name = name.toLowerCase().trim();
  const existingLocation = await Location.findOne({ name });

  if (existingLocation) {
    throw new APIError(400, "Location Already Exists");
  }

  const newLocation = await Location.create({
    name,
    active,
  });

  return res
    .status(200)
    .json(new APIResponse(200, newLocation, "Location Created"));
});

const updateLocation = asyncHandler(async (req, res) => {
  let { name, active } = req.body;

  if (!name && !active) {
    throw new APIError(400, "Name and Active fields are required.");
  }
  name = name.toLowerCase().trim();
  const existingLocation = await Location.findOne({ name });

  if (!existingLocation) {
    throw new APIError(400, "Location Don't Exists");
  }

  existingLocation.active = active;
  await existingLocation.save();
  const location = await Location.findOne({ name });
  return res
    .status(200)
    .json(new APIResponse(200, location, "Location Updated"));
});

const deleteLocation = asyncHandler(async (req, res) => {
  let { name } = req.body;

  if (!name) {
    throw new APIError(400, "Name fields is required.");
  }
  name = name.toLowerCase().trim();
  const existingLocation = await Location.findOne({ name });

  if (!existingLocation) {
    throw new APIError(400, "Location Don't Exists");
  }

  await Location.deleteOne({ name });
  return res.status(200).json(new APIResponse(200, {}, "Location Deleted"));
});

export { getAllLocation, addLocation, updateLocation, deleteLocation };
