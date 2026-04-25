import api from "./api";

// ─── SOS Trigger ─────────────────────────────────────────────────────────────
export const triggerSOS = (tripId, triggerMethod, coordinates = null) =>
  api.post("/sos/trigger", { tripId, triggerMethod, coordinates });

export const confirmSafe = (tripId) =>
  api.post("/sos/confirm-safe", { tripId });

// ─── Emergency Contacts ───────────────────────────────────────────────────────
export const getEmergencyContacts = () =>
  api.get("/sos/contacts");

export const addEmergencyContact = (contactData) =>
  api.post("/sos/contacts", contactData);

export const updateEmergencyContact = (contactId, contactData) =>
  api.put(`/sos/contacts/${contactId}`, contactData);

export const deleteEmergencyContact = (contactId) =>
  api.delete(`/sos/contacts/${contactId}`);

export const testEmergencyContact = (contactId) =>
  api.post(`/sos/contacts/${contactId}/test`);

// ─── Public Emergency Page ────────────────────────────────────────────────────
export const getEmergencyByToken = (token) =>
  api.get(`/sos/emergency/${token}`);

// ─── Admin: SOS Management ────────────────────────────────────────────────────
export const getActiveSOSList = () =>
  api.get("/sos/active");

export const getSOSHistory = (page = 1, limit = 20) =>
  api.get(`/sos/history?page=${page}&limit=${limit}`);

export const resolveSOSIncident = (sosId, notes = "") =>
  api.patch(`/sos/${sosId}/resolve`, { notes });
