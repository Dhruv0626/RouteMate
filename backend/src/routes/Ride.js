import express from "express";
import { 
    GetPassengerHistory, 
    GetDriverHistory, 
    CreateDemoRide, 
    GetFareEstimate, 
    GetActiveTrips 
} from "../controllers/RideController.js";
import authMiddleware from "../middlewares/AuthMid.js";

const router = express.Router();

router.get("/passenger-history", authMiddleware, GetPassengerHistory);
router.get("/driver-history",    authMiddleware, GetDriverHistory);
router.get("/active-trips",     authMiddleware, GetActiveTrips);
router.get("/fare-estimate",    authMiddleware, GetFareEstimate);
router.post("/create-demo", authMiddleware, CreateDemoRide);

export default router;
