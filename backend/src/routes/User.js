import express from "express";
import { CreateUser, LoginUser } from "../controllers/UserController.js";

const router = express.Router();

router.post("/Register", CreateUser);
router.post("/Login", LoginUser);
//router.get("/Profile", authMiddleware, GetUserProfile);

export default router;