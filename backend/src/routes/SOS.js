import express from "express";
import {
  TriggerSOS,
  ConfirmSafe,
  GetEmergencyByToken,
  GetActiveSOSList,
  GetSOSHistory,
  ResolveSOSIncident,
  GetEmergencyContacts,
  AddEmergencyContact,
  UpdateEmergencyContact,
  DeleteEmergencyContact,
  TestEmergencyContact,
} from "../controllers/SOSController.js";
import authMiddleware from "../middlewares/AuthMid.js";
import authorizeRoles from "../middlewares/RoleMid.js";

const router = express.Router();

// ─── Public Routes ─────────────────────────────────────────────────────────────
// Live emergency page (accessed via shareable token link — no auth required)
router.get("/emergency/:token", GetEmergencyByToken);

// ─── Passenger Routes ─────────────────────────────────────────────────────────
router.post("/trigger",      authMiddleware, authorizeRoles("passenger"), TriggerSOS);
router.post("/confirm-safe", authMiddleware, authorizeRoles("passenger"), ConfirmSafe);

// Emergency Contacts CRUD
router.get(   "/contacts",                  authMiddleware, authorizeRoles("passenger"), GetEmergencyContacts);
router.post(  "/contacts",                  authMiddleware, authorizeRoles("passenger"), AddEmergencyContact);
router.put(   "/contacts/:contactId",       authMiddleware, authorizeRoles("passenger"), UpdateEmergencyContact);
router.delete("/contacts/:contactId",       authMiddleware, authorizeRoles("passenger"), DeleteEmergencyContact);
router.post(  "/contacts/:contactId/test",  authMiddleware, authorizeRoles("passenger"), TestEmergencyContact);

// ─── Admin Routes ─────────────────────────────────────────────────────────────
router.get(   "/active",          authMiddleware, authorizeRoles("admin"), GetActiveSOSList);
router.get(   "/history",         authMiddleware, authorizeRoles("admin"), GetSOSHistory);
router.patch( "/:sosId/resolve",  authMiddleware, authorizeRoles("admin"), ResolveSOSIncident);

export default router;
