import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import { Shield, AlertTriangle, Clock, MapPin, User, Navigation, Phone } from "lucide-react";
import { getEmergencyByToken } from "../services/sosService";
import api from "../services/api";

// Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

function formatTime(dateStr) {
  if (!dateStr) return "Unknown";
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

const TRIGGER_LABELS = {
  manual_button:  "Passenger triggered SOS manually",
  shake_gesture:  "Passenger shook device (distress signal)",
  auto_timeout:   "Driver stopped for 15+ minutes",
  route_deviation:"Driver moved away from destination",
};

export default function EmergencyPage() {
  const { token } = useParams();
  const [data, setData]       = useState(null);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(null); // live location from socket/polling

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getEmergencyByToken(token);
        setData(res.data.data);

        // Set initial location from SOS record
        if (res.data.data.lastLocation?.length === 2) {
          const [lng, lat] = res.data.data.lastLocation;
          setLocation({ lat, lng });
        }
      } catch (err) {
        const msg = err.response?.data?.message || "Emergency link not found or has expired.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  // Poll for location updates every 10 seconds (simple polling since this is a public page)
  useEffect(() => {
    if (!data) return;
    const interval = setInterval(async () => {
      try {
        const res = await getEmergencyByToken(token);
        const freshLoc = res.data.data?.lastLocation;
        if (freshLoc?.length === 2) {
          setLocation({ lat: freshLoc[1], lng: freshLoc[0] });
        }
      } catch { /* silent */ }
    }, 10000);
    return () => clearInterval(interval);
  }, [data, token]);

  if (loading) return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full border-4 border-red-500/30 border-t-red-500 animate-spin mx-auto" />
        <p className="text-gray-400 text-sm">Loading emergency data…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto">
          <AlertTriangle size={40} className="text-gray-500" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white mb-2">Link Unavailable</h1>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
        <p className="text-xs text-gray-600">Emergency location links expire after 24 hours.</p>
      </div>
    </div>
  );

  const mapCenter = location ? [location.lat, location.lng] : [23.0225, 72.5714];

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      {/* Header */}
      <div className="relative">
        <div className="h-1.5 bg-gradient-to-r from-red-600 via-red-400 to-red-600 animate-pulse" />
        <header className="px-6 py-5 flex items-center justify-between border-b border-gray-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <Shield size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">RouteMate Safety</p>
              <h1 className="text-lg font-black text-white">Emergency Alert</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
              {data?.status === "resolved" ? "Resolved" : "Active"}
            </span>
          </div>
        </header>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Passenger Info Card */}
        <div className="bg-[#0f172a] border border-red-500/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-2xl">
              {data?.passengerImage
                ? <img src={data.passengerImage} alt="" className="w-full h-full object-cover rounded-xl" />
                : "🆘"}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-black text-white">{data?.passengerName || "Passenger"}</h2>
              <p className="text-sm text-red-400 font-semibold">Needs immediate assistance</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900/60 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Triggered At</p>
              <p className="text-sm font-bold text-white">{formatTime(data?.triggeredAt)}</p>
              <p className="text-xs text-gray-500">{formatDate(data?.triggeredAt)}</p>
            </div>
            <div className="bg-gray-900/60 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Driver</p>
              <p className="text-sm font-bold text-white">{data?.driverName || "—"}</p>
            </div>
          </div>

          {/* Trigger reason */}
          <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/15 rounded-xl p-3">
            <AlertTriangle size={15} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-300">
              {TRIGGER_LABELS[data?.triggerMethod] || "Emergency triggered"}
            </p>
          </div>

          {/* Trip route */}
          {(data?.source || data?.destination) && (
            <div className="space-y-2">
              {data?.source && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
                  <span className="text-gray-400 truncate">{data.source}</span>
                </div>
              )}
              {data?.destination && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                  <span className="text-gray-400 truncate">{data.destination}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Map */}
        <div className="bg-[#0f172a] border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
            <Navigation size={14} className="text-red-400" />
            <p className="text-sm font-bold text-white">Live Location</p>
            {location && (
              <span className="ml-auto text-xs text-gray-500">
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              </span>
            )}
          </div>
          <div style={{ height: 360 }}>
            {location ? (
              <MapContainer center={mapCenter} zoom={15} style={{ height: "100%", width: "100%" }} zoomControl={true}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="© OpenStreetMap"
                />
                <Marker position={[location.lat, location.lng]} icon={redIcon}>
                  <Popup>
                    <strong style={{ color: "#ef4444" }}>🆘 {data?.passengerName}</strong><br />
                    Last updated: {new Date().toLocaleTimeString()}
                  </Popup>
                </Marker>
                <Circle
                  center={[location.lat, location.lng]}
                  radius={80}
                  pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.1, weight: 2 }}
                />
              </MapContainer>
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-900">
                <div className="text-center space-y-2">
                  <MapPin size={24} className="mx-auto text-gray-600" />
                  <p className="text-gray-500 text-sm">Location data not available</p>
                  <p className="text-gray-600 text-xs">Live location will appear when GPS is active</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Emergency Actions */}
        <div className="bg-[#0f172a] border border-gray-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Immediate Actions</h3>
          <a
            href="tel:112"
            className="flex items-center gap-3 p-4 rounded-xl bg-red-600 hover:bg-red-500 transition-all text-white font-bold"
          >
            <Phone size={18} />
            Call Emergency Services — 112
          </a>
          <p className="text-xs text-gray-600 text-center">
            This link is active for 24 hours from when the alert was triggered.
            Powered by RouteMate Safety System.
          </p>
        </div>
      </div>
    </div>
  );
}
