import { useState, useEffect } from "react";
import {
  Shield, Plus, Trash2, Edit3, Send, Phone, Mail,
  User, X, Check, ChevronDown, Loader2, AlertTriangle
} from "lucide-react";
import {
  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  testEmergencyContact,
} from "../../services/sosService";

const RELATION_OPTIONS = [
  "Mother", "Father", "Brother", "Sister",
  "Wife", "Husband", "Friend", "Other"
];

const EMPTY_FORM = { name: "", mobile_no: "", email: "", relation: "" };

export default function EmergencyContactsManager() {
  const [contacts, setContacts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [testingId, setTestingId]   = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError]           = useState("");
  const [toast, setToast]           = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await getEmergencyContacts();
      setContacts(res.data.data || []);
    } catch {
      setError("Failed to load emergency contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContacts(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  };

  const openEdit = (contact) => {
    setEditingId(contact._id);
    setForm({
      name:      contact.name,
      mobile_no: contact.mobile_no,
      email:     contact.email || "",
      relation:  contact.relation,
    });
    setError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.mobile_no || !form.relation) {
      setError("Name, mobile number and relation are required");
      return;
    }
    try {
      setSaving(true);
      setError("");
      if (editingId) {
        const res = await updateEmergencyContact(editingId, form);
        setContacts(res.data.data);
        showToast("Contact updated ✓");
      } else {
        const res = await addEmergencyContact(form);
        setContacts(res.data.data);
        showToast("Contact added ✓");
      }
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save contact");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contactId) => {
    try {
      setDeletingId(contactId);
      const res = await deleteEmergencyContact(contactId);
      setContacts(res.data.data);
      showToast("Contact removed");
    } catch {
      showToast("Failed to remove contact");
    } finally {
      setDeletingId(null);
    }
  };

  const handleTest = async (contactId) => {
    try {
      setTestingId(contactId);
      await testEmergencyContact(contactId);
      showToast("✅ Test alert sent to contact's email!");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to send test alert");
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-red-500/10 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <Shield size={18} className="text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-(--text-main)">Emergency Contacts</h3>
            <p className="text-xs text-(--text-dim)">Notified instantly if SOS is triggered</p>
          </div>
        </div>
        {contacts.length < 2 && (
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-black text-xs font-bold hover:scale-105 transition-all"
          >
            <Plus size={13} />
            Add Contact
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm animate-fade-in">
          <Check size={14} />
          {toast}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-primary" />
        </div>
      )}

      {/* Empty state */}
      {!loading && contacts.length === 0 && !showForm && (
        <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-(--card-border) bg-(--card-bg)/30">
          <AlertTriangle size={28} className="mx-auto mb-3 text-yellow-500 opacity-60" />
          <p className="text-sm font-semibold text-(--text-dim) mb-1">No emergency contacts added</p>
          <p className="text-xs text-(--text-dim) opacity-60 mb-4">Add up to 2 contacts who will be notified in an emergency</p>
          <button onClick={openAdd} className="px-4 py-2 rounded-xl bg-primary text-black text-xs font-bold hover:scale-105 transition-all">
            Add First Contact
          </button>
        </div>
      )}

      {/* Contact Cards */}
      {!loading && contacts.map((contact) => (
        <div
          key={contact._id}
          className="p-4 rounded-2xl border border-(--card-border) bg-(--card-bg) space-y-3"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-center">
                <User size={16} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-bold text-sm text-(--text-main)">{contact.name}</p>
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-(--text-dim) border border-(--card-border)">
                  {contact.relation}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => openEdit(contact)}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-(--text-dim) hover:text-(--text-main)"
              >
                <Edit3 size={13} />
              </button>
              <button
                onClick={() => handleDelete(contact._id)}
                disabled={deletingId === contact._id}
                className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-(--text-dim) hover:text-red-600 dark:hover:text-red-400"
              >
                {deletingId === contact._id
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Trash2 size={13} />
                }
              </button>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-(--text-dim)">
            <div className="flex items-center gap-2">
              <Phone size={11} className="text-(--text-dim) opacity-60" />
              <span>{contact.mobile_no}</span>
            </div>
            {contact.email && (
              <div className="flex items-center gap-2">
                <Mail size={11} className="text-(--text-dim) opacity-60" />
                <span>{contact.email}</span>
              </div>
            )}
          </div>

          {/* Notification badges */}
          <div className="flex items-center gap-2">
            {contact.notifyViaEmail && contact.email && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Mail size={10} /> Email Alert
              </span>
            )}
            {!contact.email && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                <AlertTriangle size={10} /> No email — alerts disabled
              </span>
            )}
          </div>

          {/* Test button */}
          {contact.email && (
            <button
              onClick={() => handleTest(contact._id)}
              disabled={testingId === contact._id}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-(--card-border) hover:border-primary/40 hover:bg-primary/5 transition-all text-xs text-(--text-dim) hover:text-primary"
            >
              {testingId === contact._id
                ? <Loader2 size={12} className="animate-spin" />
                : <Send size={12} />
              }
              {testingId === contact._id ? "Sending..." : "Send Test Alert"}
            </button>
          )}
        </div>
      ))}

      {/* Max limit notice */}
      {contacts.length >= 2 && (
        <p className="text-[10px] font-black uppercase tracking-widest text-center text-(--text-dim) opacity-60">
          Maximum 2 contacts reached. Remove one to add another.
        </p>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-bold text-(--text-main)">
              {editingId ? "Edit Contact" : "New Emergency Contact"}
            </p>
            <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-(--text-dim)">
              <X size={14} />
            </button>
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-(--text-dim) mb-1 block">Full Name *</label>
            <input
              type="text"
              placeholder="Contact's full name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-(--bg-main) border border-(--card-border) text-(--text-main) text-sm focus:border-primary/50 focus:outline-none transition-colors"
            />
          </div>

          {/* Mobile */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-(--text-dim) mb-1 block">Mobile Number * (10 digit)</label>
            <input
              type="tel"
              placeholder="9876543210"
              value={form.mobile_no}
              onChange={e => setForm(f => ({ ...f, mobile_no: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-(--bg-main) border border-(--card-border) text-(--text-main) text-sm focus:border-primary/50 focus:outline-none transition-colors"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-(--text-dim) mb-1 block">Email (for SOS alerts)</label>
            <input
              type="email"
              placeholder="contact@email.com (optional)"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-(--bg-main) border border-(--card-border) text-(--text-main) text-sm focus:border-primary/50 focus:outline-none transition-colors"
            />
          </div>

          {/* Relation */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-(--text-dim) mb-1 block">Relation *</label>
            <div className="relative">
              <select
                value={form.relation}
                onChange={e => setForm(f => ({ ...f, relation: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-(--bg-main) border border-(--card-border) text-(--text-main) text-sm focus:border-primary/50 focus:outline-none transition-colors appearance-none"
              >
                <option value="">Select relation...</option>
                {RELATION_OPTIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-dim) pointer-events-none" />
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-black font-bold text-sm hover:scale-[1.02] transition-all disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? "Saving..." : editingId ? "Update Contact" : "Add Contact"}
          </button>
        </div>
      )}
    </div>
  );
}
