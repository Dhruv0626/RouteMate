import crypto from "crypto";
import TripModel from "../models/Trip.js";
import SOSModel from "../models/SOS.js";
import UserModel from "../models/User.js";
import { notifyAdmins, notifyUser } from "../utils/NotifyUtil.js";
import { sendSOSEmail, sendTestSOSEmail } from "../utils/ResendEmailUtil.js";
import { getIO } from "../utils/SocketManager.js";

const APP_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// ─── Haversine Distance (km) ─────────────────────────────────────────────────
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── Core: Trigger SOS ───────────────────────────────────────────────────────
/**
 * Shared SOS trigger logic used by both manual triggers and the cron job.
 */
export const triggerSOS = async ({ tripId, triggerMethod, location }) => {
  // 1. Load trip with passenger + driver populated
  const trip = await TripModel.findById(tripId)
    .populate("passenger", "name email emergencyContacts")
    .populate("driver",    "name email");

  if (!trip || trip.phase !== "ongoing") return null;

  // 2. Check if active SOS already exists for this trip
  const existing = await SOSModel.findOne({ trip: tripId, status: "active" });
  if (existing) return existing; // Don't create duplicate

  // 3. Generate emergency token (24hr live-location link)
  const token    = crypto.randomBytes(32).toString("hex");
  const expiry   = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const liveLink = `${APP_URL}/emergency/${token}`;

  // 4. Save emergency token on the trip
  await TripModel.findByIdAndUpdate(tripId, {
    emergencyToken:       token,
    emergencyTokenExpiry: expiry,
    passengerConfirmedSafe: false,
  });

  // 5. Create SOS record
  const sos = await SOSModel.create({
    trip:            tripId,
    passenger:       trip.passenger._id,
    driver:          trip.driver._id,
    location:        location || { type: "Point", coordinates: [] },
    triggerMethod,
    emergencyToken:       token,
    emergencyTokenExpiry: expiry,
    status: "active",
  });

  const passengerName = trip.passenger.name;
  const io = getIO();

  // 6. Notify all admins (in-app + socket red alert)
  await notifyAdmins({
    title:   "🆘 SOS Emergency Alert!",
    message: `${passengerName} has triggered an emergency during their trip. Immediate action required.`,
    type:    "error",
    link:    `/admin/dashboard/sos`,
    metadata: { sosId: sos._id, tripId, triggerMethod, emergencyToken: token },
  });

  // Broadcast real-time admin alert
  if (io) io.emit("sos_alert", { sosId: sos._id, tripId, passengerName, liveLink, triggerMethod });

  // 7. Notify driver (in-app warning)
  await notifyUser({
    userId:  trip.driver._id,
    title:   "⚠️ Emergency Reported",
    message: "A safety emergency has been reported on your current trip. Please ensure passenger safety. The admin team has been alerted.",
    type:    "error",
    link:    null,
    metadata: { sosId: sos._id },
  });

  // 8. Notify passenger (calm screen)
  await notifyUser({
    userId:  trip.passenger._id,
    title:   "🆘 Help is on the way",
    message: "Stay calm. Your location has been shared with your emergency contacts and our safety team. Help is coming.",
    type:    "error",
    link:    null,
    metadata: { sosId: sos._id },
  });

  // 9. Send emails to emergency contacts
  const contacts = trip.passenger.emergencyContacts || [];
  for (const contact of contacts) {
    if (contact.notifyViaEmail && contact.email) {
      await sendSOSEmail({
        toEmail:       contact.email,
        toName:        contact.name,
        passengerName,
        emergencyLink: liveLink,
        triggerMethod,
      }).catch(err => console.error("[SOSController] Email error:", err.message));
    }
  }

  console.log(`🆘 SOS triggered — Trip: ${tripId} | Method: ${triggerMethod} | Token: ${token}`);
  return sos;
};

// ─── POST /api/sos/trigger ────────────────────────────────────────────────────
/**
 * Manual SOS trigger by passenger (manual_button or shake_gesture)
 */
export const TriggerSOS = async (req, res) => {
  try {
    const { tripId, triggerMethod, coordinates } = req.body;

    if (!tripId || !triggerMethod) {
      return res.status(400).json({ success: false, message: "tripId and triggerMethod are required" });
    }

    const validMethods = ["manual_button", "shake_gesture"];
    if (!validMethods.includes(triggerMethod)) {
      return res.status(400).json({ success: false, message: "Invalid triggerMethod for manual trigger" });
    }

    // Verify the trip belongs to this passenger
    const trip = await TripModel.findById(tripId);
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

    if (trip.passenger.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (trip.phase !== "ongoing") {
      return res.status(400).json({ success: false, message: "SOS can only be triggered during an ongoing trip" });
    }

    const location = coordinates?.length === 2
      ? { type: "Point", coordinates }
      : { type: "Point", coordinates: [] };

    const sos = await triggerSOS({ tripId, triggerMethod, location });

    if (!sos) {
      return res.status(400).json({ success: false, message: "Could not trigger SOS — trip may not be ongoing or SOS already active" });
    }

    const emergencyLink = `${APP_URL}/emergency/${sos.emergencyToken}`;
    return res.status(201).json({
      success: true,
      message: "SOS triggered. Help is on the way.",
      data: { sosId: sos._id, emergencyLink },
    });
  } catch (err) {
    console.error("[SOSController] TriggerSOS error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── POST /api/sos/confirm-safe ───────────────────────────────────────────────
/**
 * Passenger taps "✅ Yes, I'm safe" to cancel auto-SOS warning
 */
export const ConfirmSafe = async (req, res) => {
  try {
    const { tripId } = req.body;

    const trip = await TripModel.findById(tripId);
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

    if (trip.passenger.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await TripModel.findByIdAndUpdate(tripId, {
      passengerConfirmedSafe: true,
      sosWarningSentAt:       null,
      consecutiveNoProgress:  0,
      stoppedAt:              null,
    });

    return res.status(200).json({ success: true, message: "Confirmed safe — trip continues normally." });
  } catch (err) {
    console.error("[SOSController] ConfirmSafe error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── GET /api/sos/emergency/:token ────────────────────────────────────────────
/**
 * Public endpoint — fetch live emergency data by token (for the shareable link page)
 */
export const GetEmergencyByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const sos = await SOSModel.findOne({ emergencyToken: token })
      .populate("passenger", "name profileImage")
      .populate("driver",    "name")
      .populate("trip",      "source destination phase");

    if (!sos) return res.status(404).json({ success: false, message: "Emergency link not found or expired" });

    if (sos.emergencyTokenExpiry && new Date() > sos.emergencyTokenExpiry) {
      return res.status(410).json({ success: false, message: "Emergency link has expired (24hr limit)" });
    }

    return res.status(200).json({
      success: true,
      data: {
        sosId:          sos._id,
        status:         sos.status,
        triggerMethod:  sos.triggerMethod,
        triggeredAt:    sos.triggeredAt,
        passengerName:  sos.passenger?.name,
        passengerImage: sos.passenger?.profileImage,
        driverName:     sos.driver?.name,
        source:         sos.trip?.source?.address,
        destination:    sos.trip?.destination?.address,
        tripPhase:      sos.trip?.phase,
        lastLocation:   sos.location?.coordinates,
      },
    });
  } catch (err) {
    console.error("[SOSController] GetEmergencyByToken error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── GET /api/sos/active ──────────────────────────────────────────────────────
/**
 * Admin: Get all active SOS incidents
 */
export const GetActiveSOSList = async (req, res) => {
  try {
    const incidents = await SOSModel.find({ status: "active" })
      .sort({ triggeredAt: -1 })
      .populate("passenger", "name email Mobile_no profileImage")
      .populate("driver",    "name email Mobile_no")
      .populate("trip",      "source destination phase startedAt");

    return res.status(200).json({ success: true, data: incidents });
  } catch (err) {
    console.error("[SOSController] GetActiveSOSList error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── GET /api/sos/history ─────────────────────────────────────────────────────
/**
 * Admin: Get resolved SOS history
 */
export const GetSOSHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [incidents, total] = await Promise.all([
      SOSModel.find({ status: "resolved" })
        .sort({ resolvedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("passenger", "name email")
        .populate("driver",    "name email")
        .populate("resolvedBy","name")
        .populate("trip",      "source destination"),
      SOSModel.countDocuments({ status: "resolved" }),
    ]);

    return res.status(200).json({
      success: true,
      data: incidents,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[SOSController] GetSOSHistory error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── PATCH /api/sos/:sosId/resolve ───────────────────────────────────────────
/**
 * Admin: Resolve an active SOS incident
 */
export const ResolveSOSIncident = async (req, res) => {
  try {
    const { sosId } = req.params;
    const { notes } = req.body;

    const sos = await SOSModel.findById(sosId).populate("passenger", "name _id");
    if (!sos) return res.status(404).json({ success: false, message: "SOS not found" });
    if (sos.status === "resolved") return res.status(400).json({ success: false, message: "Already resolved" });

    sos.status     = "resolved";
    sos.resolvedAt = new Date();
    sos.resolvedBy = req.user._id;
    sos.notes      = notes || "";
    await sos.save();

    // Notify passenger that the situation is handled
    await notifyUser({
      userId:  sos.passenger._id,
      title:   "✅ Emergency Resolved",
      message: "Our safety team has marked your emergency as resolved. If you still need help, please call emergency services (112).",
      type:    "success",
      link:    null,
    });

    // Real-time admin dashboard update
    const io = getIO();
    if (io) io.emit("sos_resolved", { sosId: sos._id });

    return res.status(200).json({ success: true, message: "SOS resolved successfully", data: sos });
  } catch (err) {
    console.error("[SOSController] ResolveSOSIncident error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Emergency Contacts CRUD ─────────────────────────────────────────────────

// GET /api/sos/contacts — Get my emergency contacts
export const GetEmergencyContacts = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id).select("emergencyContacts");
    return res.status(200).json({ success: true, data: user.emergencyContacts });
  } catch (err) {
    console.error("[SOSController] GetEmergencyContacts error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /api/sos/contacts — Add emergency contact
export const AddEmergencyContact = async (req, res) => {
  try {
    const { name, mobile_no, email, relation } = req.body;

    if (!name || !mobile_no || !relation) {
      return res.status(400).json({ success: false, message: "name, mobile_no, and relation are required" });
    }

    const user = await UserModel.findById(req.user._id).select("emergencyContacts");

    if (user.emergencyContacts.length >= 2) {
      return res.status(400).json({ success: false, message: "Maximum 2 emergency contacts allowed" });
    }

    // Validate and format mobile
    const digitsOnly = mobile_no.replace(/\D/g, "");
    if (digitsOnly.length < 10) {
      return res.status(400).json({ success: false, message: "Invalid mobile number — must be at least 10 digits" });
    }
    const formatted = digitsOnly.startsWith("91") && digitsOnly.length === 12
      ? `+${digitsOnly}`
      : `+91${digitsOnly.slice(-10)}`;

    // Duplicate check
    const isDuplicate = user.emergencyContacts.some(c => c.mobile_no === formatted);
    if (isDuplicate) {
      return res.status(400).json({ success: false, message: "This mobile number is already added as a contact" });
    }

    user.emergencyContacts.push({
      name:           name.trim(),
      mobile_no:      formatted,
      email:          email?.trim() || "",
      relation:       relation.trim(),
      notifyViaEmail: email ? true : false,
      notifyViaWA:    false,
    });

    await user.save();

    return res.status(201).json({
      success: true,
      message: "Emergency contact added",
      data: user.emergencyContacts,
    });
  } catch (err) {
    console.error("[SOSController] AddEmergencyContact error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// PUT /api/sos/contacts/:contactId — Update a contact
export const UpdateEmergencyContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { name, mobile_no, email, relation } = req.body;

    const user = await UserModel.findById(req.user._id).select("emergencyContacts");
    const contact = user.emergencyContacts.id(contactId);

    if (!contact) return res.status(404).json({ success: false, message: "Contact not found" });

    if (name)      contact.name     = name.trim();
    if (relation)  contact.relation = relation.trim();
    if (email !== undefined) {
      contact.email          = email?.trim() || "";
      contact.notifyViaEmail = !!email;
    }
    if (mobile_no) {
      const digitsOnly = mobile_no.replace(/\D/g, "");
      if (digitsOnly.length < 10) {
        return res.status(400).json({ success: false, message: "Invalid mobile number" });
      }
      const formatted = `+91${digitsOnly.slice(-10)}`;

      // Check duplicate excluding self
      const isDuplicate = user.emergencyContacts.some(
        c => c.mobile_no === formatted && c._id.toString() !== contactId
      );
      if (isDuplicate) return res.status(400).json({ success: false, message: "This number is already used" });
      contact.mobile_no = formatted;
    }

    await user.save();
    return res.status(200).json({ success: true, message: "Contact updated", data: user.emergencyContacts });
  } catch (err) {
    console.error("[SOSController] UpdateEmergencyContact error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE /api/sos/contacts/:contactId — Delete a contact
export const DeleteEmergencyContact = async (req, res) => {
  try {
    const { contactId } = req.params;

    const user = await UserModel.findById(req.user._id).select("emergencyContacts");
    const contact = user.emergencyContacts.id(contactId);
    if (!contact) return res.status(404).json({ success: false, message: "Contact not found" });

    user.emergencyContacts.pull(contactId);
    await user.save();

    return res.status(200).json({ success: true, message: "Contact removed", data: user.emergencyContacts });
  } catch (err) {
    console.error("[SOSController] DeleteEmergencyContact error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /api/sos/contacts/:contactId/test — Send test alert to one contact
export const TestEmergencyContact = async (req, res) => {
  try {
    const { contactId } = req.params;

    const user = await UserModel.findById(req.user._id).select("name emergencyContacts");
    const contact = user.emergencyContacts.id(contactId);
    if (!contact) return res.status(404).json({ success: false, message: "Contact not found" });

    if (!contact.email) {
      return res.status(400).json({ success: false, message: "No email set for this contact — cannot send test email" });
    }

    const sent = await sendTestSOSEmail({
      toEmail:       contact.email,
      toName:        contact.name,
      passengerName: user.name,
    });

    if (sent) {
      return res.status(200).json({ success: true, message: `Test alert sent to ${contact.email}` });
    } else {
      return res.status(500).json({ success: false, message: "Failed to send test email" });
    }
  } catch (err) {
    console.error("[SOSController] TestEmergencyContact error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
