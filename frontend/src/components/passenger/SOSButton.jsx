import { useState, useEffect, useRef } from "react";
import { AlertTriangle, X, Shield, Phone, Loader2 } from "lucide-react";
import { triggerSOS, confirmSafe } from "../../services/sosService";

// ─── SOS Warning Modal ───────────────────────────────────────────────────────
function SOSWarningModal({ tripId, reason, onSafe, onClose }) {
  const [confirming, setConfirming] = useState(false);
  const [countdown, setCountdown]  = useState(180); // 3 min

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const mins = String(Math.floor(countdown / 60)).padStart(2, "0");
  const secs = String(countdown % 60).padStart(2, "0");

  const handleSafe = async () => {
    try {
      setConfirming(true);
      await confirmSafe(tripId);
      onSafe();
    } catch {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-end justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-[#0f172a] border border-yellow-500/40 rounded-3xl overflow-hidden shadow-2xl">
        {/* Pulsing top bar */}
        <div className="h-1.5 bg-yellow-400 animate-pulse" />

        <div className="p-6 text-center space-y-4">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mx-auto animate-bounce">
            <AlertTriangle size={32} className="text-yellow-400" />
          </div>

          <h2 className="text-xl font-black text-white">Are you okay?</h2>
          <p className="text-sm text-gray-400 leading-relaxed">{reason}</p>

          {/* Countdown */}
          <div className="bg-gray-900 rounded-2xl py-3 px-6">
            <p className="text-xs text-gray-500 mb-1">Emergency contacts alerted in</p>
            <p className={`text-3xl font-black font-mono ${countdown < 30 ? "text-red-400 animate-pulse" : "text-yellow-400"}`}>
              {mins}:{secs}
            </p>
          </div>

          {/* Actions */}
          <button
            onClick={handleSafe}
            disabled={confirming}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-green-500 hover:bg-green-400 text-white font-black text-lg transition-all hover:scale-[1.02] disabled:opacity-60"
          >
            {confirming ? <Loader2 size={20} className="animate-spin" /> : <Shield size={20} />}
            {confirming ? "Confirming..." : "✅ Yes, I'm Safe"}
          </button>

          <p className="text-xs text-gray-600">
            If you don't respond, emergency contacts will be notified automatically
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── SOS Trigger Modal ────────────────────────────────────────────────────────
function SOSConfirmModal({ tripId, onTriggered, onClose }) {
  const [triggering, setTriggering] = useState(false);
  const [countdown, setCountdown]   = useState(5);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(intervalRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleTrigger = async () => {
    try {
      setTriggering(true);
      clearInterval(intervalRef.current);

      let coords = null;
      try {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            pos => { coords = [pos.coords.longitude, pos.coords.latitude]; resolve(); },
            reject,
            { timeout: 3000 }
          );
        });
      } catch { /* location unavailable — still trigger SOS */ }

      const res = await triggerSOS(tripId, "manual_button", coords);
      onTriggered(res.data.data?.emergencyLink);
    } catch {
      setTriggering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-end justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-[#0f172a] border border-red-500/40 rounded-3xl overflow-hidden shadow-2xl">
        <div className="h-1.5 bg-gradient-to-r from-red-600 to-red-400 animate-pulse" />
        <div className="p-6 text-center space-y-4">

          {/* Countdown ring */}
          <div className="relative w-20 h-20 mx-auto">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
              <span className="text-3xl font-black text-red-400">{countdown}</span>
            </div>
            {countdown > 0 && (
              <div
                className="absolute inset-0 rounded-full border-2 border-red-500"
                style={{
                  background: `conic-gradient(transparent ${((5 - countdown) / 5) * 360}deg, rgba(239,68,68,0.2) 0deg)`,
                }}
              />
            )}
          </div>

          <h2 className="text-xl font-black text-white">Triggering SOS</h2>
          <p className="text-sm text-gray-400">
            Your emergency contacts and RouteMate safety team will be alerted immediately with your live location.
          </p>

          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-lg transition-all hover:scale-[1.02] disabled:opacity-60 shadow-lg shadow-red-500/20"
          >
            {triggering ? <Loader2 size={20} className="animate-spin" /> : null}
            {triggering ? "Sending SOS..." : "🆘 Send Emergency Alert"}
          </button>

          <button
            onClick={onClose}
            disabled={triggering}
            className="w-full py-3 rounded-2xl border border-gray-700 text-gray-400 text-sm font-semibold hover:bg-gray-800 transition-all"
          >
            Cancel — I'm Safe
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SOS Triggered Screen ─────────────────────────────────────────────────────
function SOSActiveScreen({ onClose }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-[#0f172a] animate-fade-in">
      <div className="text-center space-y-6 max-w-sm w-full">
        {/* Pulsing SOS badge */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
          <div className="w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500/50 flex items-center justify-center">
            <span className="text-4xl">🆘</span>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-black text-white mb-2">Help is on the way</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Stay calm. Your location has been shared with your emergency contacts and our safety team.
          </p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-4 text-left space-y-3">
          {[
            { icon: "✅", text: "Admin safety team alerted" },
            { icon: "📧", text: "Emergency contacts notified by email" },
            { icon: "📍", text: "Live location link sent" },
            { icon: "⏸️", text: "Fare meter paused" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
              <span>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
          <Phone size={12} />
          <span>For immediate help, call emergency services: <strong>112</strong></span>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl border border-gray-700 text-gray-400 text-sm hover:bg-gray-800 transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Main SOS Button ──────────────────────────────────────────────────────────
/**
 * @param {string}  tripId          - Current active trip ID
 * @param {boolean} warningActive   - True when backend sent a "sos_warning" socket event
 * @param {string}  warningReason   - Reason text for the warning modal
 * @param {Function} onWarningClose - Called when passenger confirms safe
 */
export default function SOSButton({ tripId, warningActive = false, warningReason = "", onWarningClose }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [sosActive, setSosActive]     = useState(false);

  const handleTriggered = () => {
    setShowConfirm(false);
    setSosActive(true);
  };

  const handleSafe = () => {
    if (onWarningClose) onWarningClose();
  };

  return (
    <>
      {/* The SOS button itself */}
      <button
        id="sos-trigger-button"
        onClick={() => setShowConfirm(true)}
        className="relative flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-sm transition-all hover:scale-105 shadow-lg shadow-red-500/30 active:scale-95"
        style={{ minWidth: 90 }}
      >
        {/* Pulsing dot */}
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-400">
          <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-60" />
        </span>
        <AlertTriangle size={15} />
        SOS
      </button>

      {/* Warning modal (auto-detection) */}
      {warningActive && !sosActive && (
        <SOSWarningModal
          tripId={tripId}
          reason={warningReason}
          onSafe={handleSafe}
          onClose={handleSafe}
        />
      )}

      {/* Confirm modal (manual trigger) */}
      {showConfirm && !sosActive && (
        <SOSConfirmModal
          tripId={tripId}
          onTriggered={handleTriggered}
          onClose={() => setShowConfirm(false)}
        />
      )}

      {/* SOS active screen */}
      {sosActive && (
        <SOSActiveScreen onClose={() => setSosActive(false)} />
      )}
    </>
  );
}
