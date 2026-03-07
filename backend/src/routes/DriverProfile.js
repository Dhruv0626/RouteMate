import express from "express";
import {
    CreateDriverProfile,
    GetDriverProfile,
    GetDriverProfileById,
    UpdateDriverProfile,
    UpdateDriverStatus,
    DeleteDriverProfile,
    GetAllDriverProfiles,
    ApproveDriverProfile
} from "../controllers/DriverProfileController.js";
import authMiddleware from "../middlewares/AuthMid.js";
import authorizeRoles from "../middlewares/RoleMid.js";

const router = express.Router();

// ─── Protected Routes (JWT required) ───────────────────────────────────────────

// Driver profile creation and management (for drivers)
router.post("/", authMiddleware, authorizeRoles("driver", "passenger"), CreateDriverProfile);
router.get("/my-profile", authMiddleware, GetDriverProfile);
router.put("/update", authMiddleware, authorizeRoles("driver"), UpdateDriverProfile);
router.patch("/status", authMiddleware, authorizeRoles("driver"), UpdateDriverStatus);
router.delete("/", authMiddleware, authorizeRoles("driver"), DeleteDriverProfile);

// Get specific driver profile by ID (public or requires auth based on privacy)
router.get("/:id", GetDriverProfileById);

// ─── Admin-Only Routes ─────────────────────────────────────────────────────────

// Get all driver profiles with filtering and pagination
router.get("/admin/all-drivers", authMiddleware, authorizeRoles("admin"), GetAllDriverProfiles);

// Approve/reject driver profiles
router.patch("/admin/approve/:id", authMiddleware, authorizeRoles("admin"), ApproveDriverProfile);

export default router;
