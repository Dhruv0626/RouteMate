import express from "express";
import {
  addPlace,
  getPlaces,
  updatePlace,
  deletePlace,
} from "../controllers/SavedPlaceController.js";
import authMiddleware from "../middlewares/AuthMid.js";

const router = express.Router();

// All routes are private
router.use(authMiddleware);

router.route("/")
  .get(getPlaces)
  .post(addPlace);

router.route("/:id")
  .put(updatePlace)
  .delete(deletePlace);

export default router;
