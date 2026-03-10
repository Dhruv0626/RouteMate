import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Zap,
  Clock,
  DollarSign,
  Smartphone,
  AlertCircle,
  CheckCircle,
  Power,
  MapPinOff,
  BatteryCharging,
  Wifi,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState, useEffect } from "react";
import ThemeToggle from "../../components/ui/ThemeToggle";

const GoOnlinePage = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);
  const [selectedRideTypes, setSelectedRideTypes] = useState([]);
  const [location, setLocation] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    address: "Market Street, San Francisco, CA",
    accuracy: 10,
    lastUpdated: "Just now",
  });
  const [batteryLevel, setBatteryLevel] = useState(85);
  const [signalStrength, setSignalStrength] = useState(4);
  const [showDetails, setShowDetails] = useState(false);

  // Ride type options
  const rideTypes = [
    {
      id: "economy",
      name: "Economy",
      icon: "🚗",
      description: "Standard rides",
      baseFare: 3.5,
      perMile: 1.5,
      perMinute: 0.45,
      demand: "Medium",
    },
    {
      id: "premium",
      name: "Premium",
      icon: "💎",
      description: "Comfort rides",
      baseFare: 6.0,
      perMile: 2.0,
      perMinute: 0.6,
      demand: "High",
    },
    {
      id: "shared",
      name: "Shared",
      icon: "👥",
      description: "Shared rides",
      baseFare: 2.0,
      perMile: 0.8,
      perMinute: 0.25,
      demand: "Low",
    },
  ];

  // Toggle ride type selection
  const toggleRideType = (rideId) => {
    if (selectedRideTypes.includes(rideId)) {
      setSelectedRideTypes(selectedRideTypes.filter((id) => id !== rideId));
    } else {
      setSelectedRideTypes([...selectedRideTypes, rideId]);
    }
  };

  // Get current location (simulated)
  const updateLocation = () => {
    // In real app, use Geolocation API
    // navigator.geolocation.getCurrentPosition(...)
    alert("Location updated successfully!");
  };

  // Handle go online/offline toggle
  const handleOnlineToggle = () => {
    if (!isOnline && selectedRideTypes.length === 0) {
      alert("Please select at least one ride type to go online");
      return;
    }
    setIsOnline(!isOnline);
  };

  return (
    <div className="mesh-bg relative min-h-screen pb-10 font-sans text-(--text-main) transition-colors duration-500">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md transition-all duration-500">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/driver/dashboard")}
              className="rounded-lg border border-(--card-border) bg-(--card-bg) p-2 text-(--text-dim) transition-all hover:text-(--text-main) hover:border-primary/40"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold text-(--text-main)">
                Go Online
              </h1>
              <p className="text-[10px] text-(--text-dim) uppercase tracking-wider">
                Start accepting rides
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Online Status Card */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-(--card-border) bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 p-8 backdrop-blur-sm transition-all hover:border-primary/40">
          <div className="flex flex-col items-center justify-center gap-6 text-center">
            <div
              className={`relative h-32 w-32 rounded-full transition-all duration-500 ${
                isOnline
                  ? "bg-gradient-to-r from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/50"
                  : "bg-gradient-to-r from-gray-400 to-gray-500 shadow-lg shadow-gray-500/30"
              }`}
            >
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/10 backdrop-blur-xs">
                <Power
                  size={56}
                  className="text-white"
                  style={{
                    animation: isOnline ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" : "none",
                  }}
                />
              </div>
              {isOnline && (
                <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-emerald-300 animate-pulse border-2 border-white"></div>
              )}
            </div>

            <div>
              <h2
                className={`mb-2 text-3xl font-bold transition-colors duration-500 ${
                  isOnline
                    ? "bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent"
                    : "text-(--text-main)"
                }`}
              >
                {isOnline ? "You're Online" : "You're Offline"}
              </h2>
              <p className="text-(--text-dim)">
                {isOnline
                  ? "Ready to accept rides. Your location is being shared."
                  : "You are not accepting rides at the moment."}
              </p>
            </div>

            <button
              onClick={handleOnlineToggle}
              className={`group relative z-10 cursor-pointer px-12 py-4 font-bold text-white rounded-xl transition-all duration-500 transform hover:scale-105 active:scale-95 ${
                isOnline
                  ? "bg-gradient-to-r from-red-500 to-orange-500 hover:shadow-lg hover:shadow-red-500/40"
                  : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-lg hover:shadow-emerald-500/40"
              }`}
            >
              <span className="relative flex items-center justify-center gap-2">
                {isOnline ? (
                  <>
                    <MapPinOff size={20} />
                    Go Offline
                  </>
                ) : (
                  <>
                    <MapPin size={20} />
                    Go Online
                  </>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Location Status */}
        <div className="mb-8 rounded-xl border border-(--card-border) bg-(--card-bg) p-6 transition-all hover:border-primary/40">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <MapPin size={20} className="text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-(--text-main)">
                  Current Location
                </h3>
                <p className="text-sm text-(--text-dim)">Connected to GPS</p>
              </div>
            </div>
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>

          <div className="space-y-3 mb-4">
            <div className="rounded-lg bg-(--bg-main) p-3">
              <p className="text-sm text-(--text-dim)">Address</p>
              <p className="font-mono text-sm text-(--text-main)">
                {location.address}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-(--bg-main) p-3">
                <p className="text-sm text-(--text-dim)">Coordinates</p>
                <p className="font-mono text-xs text-(--text-main)">
                  {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </p>
              </div>
              <div className="rounded-lg bg-(--bg-main) p-3">
                <p className="text-sm text-(--text-dim)">Accuracy</p>
                <p className="font-mono text-xs text-(--text-main)">
                  ±{location.accuracy}m
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-(--bg-main) p-3">
              <p className="text-sm text-(--text-dim)">Last Updated</p>
              <p className="text-sm text-(--text-main)">{location.lastUpdated}</p>
            </div>
          </div>

          <button
            onClick={updateLocation}
            className="w-full rounded-lg bg-blue-500 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-600 active:scale-95"
          >
            Update Location
          </button>
        </div>

        {/* Select Ride Types */}
        <div className="mb-8 rounded-xl border border-(--card-border) bg-(--card-bg) p-6 transition-all hover:border-primary/40">
          <h3 className="mb-4 text-lg font-semibold text-(--text-main) flex items-center gap-2">
            <Zap size={20} className="text-amber-500" />
            Ride Types
          </h3>
          <p className="mb-4 text-sm text-(--text-dim)">
            Select which ride types you want to accept:
          </p>

          <div className="space-y-3">
            {rideTypes.map((type) => (
              <div
                key={type.id}
                onClick={() => toggleRideType(type.id)}
                className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                  selectedRideTypes.includes(type.id)
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-(--card-border) hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <span className="text-2xl">{type.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-(--text-main)">
                          {type.name}
                        </h4>
                        <span className="text-xs rounded-full bg-blue-500/10 px-2 py-1 text-blue-600 dark:text-blue-400">
                          {type.demand} demand
                        </span>
                      </div>
                      <p className="text-sm text-(--text-dim) mb-2">
                        {type.description}
                      </p>
                      <div className="text-xs text-(--text-dim) space-y-1">
                        <div>
                          Base Fare: <span className="font-semibold">${type.baseFare}</span>
                        </div>
                        <div>
                          Per Mile: <span className="font-semibold">${type.perMile}</span> | Per Min:{" "}
                          <span className="font-semibold">${type.perMinute}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div
                      className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedRideTypes.includes(type.id)
                          ? "border-primary bg-primary"
                          : "border-(--text-dim) bg-(--card-bg)"
                      }`}
                    >
                      {selectedRideTypes.includes(type.id) && (
                        <CheckCircle size={20} className="text-white" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedRideTypes.length === 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Select at least one ride type to go online
              </p>
            </div>
          )}
        </div>

        {/* Device Status */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          {/* Battery */}
          <div className="rounded-xl border border-(--card-border) bg-(--card-bg) p-6 transition-all hover:border-primary/40">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-500/10 p-2">
                  <BatteryCharging size={20} className="text-orange-500" />
                </div>
                <h4 className="font-semibold text-(--text-main)">Battery</h4>
              </div>
              <span className="text-lg font-bold text-(--text-main)">
                {batteryLevel}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-(--bg-main) overflow-hidden">
              <div
                className={`h-full transition-all ${
                  batteryLevel > 50
                    ? "bg-emerald-500"
                    : batteryLevel > 20
                      ? "bg-amber-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${batteryLevel}%` }}
              ></div>
            </div>
            {batteryLevel < 20 && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                ⚠️ Low battery - Consider charging
              </p>
            )}
          </div>

          {/* Signal Strength */}
          <div className="rounded-xl border border-(--card-border) bg-(--card-bg) p-6 transition-all hover:border-primary/40">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <Wifi size={20} className="text-blue-500" />
                </div>
                <h4 className="font-semibold text-(--text-main)">Signal</h4>
              </div>
              <span className="text-lg font-bold text-(--text-main)">
                {signalStrength}/5
              </span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-8 w-1 rounded-full transition-all ${
                    i < signalStrength ? "bg-blue-500" : "bg-(--bg-main)"
                  }`}
                ></div>
              ))}
            </div>
            {signalStrength < 2 && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                ⚠️ Weak signal - May affect ride requests
              </p>
            )}
          </div>

          {/* Internet Status */}
          <div className="rounded-xl border border-(--card-border) bg-(--card-bg) p-6 transition-all hover:border-primary/40">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <Zap size={20} className="text-emerald-500" />
                </div>
                <h4 className="font-semibold text-(--text-main)">Internet</h4>
              </div>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                Active
              </span>
            </div>
            <p className="text-sm text-(--text-dim)">Connected via WiFi</p>
            <span className="mt-2 inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              ✓ Stable Connection
            </span>
          </div>
        </div>

        {/* Additional Info */}
        <div className="rounded-xl border border-(--card-border) bg-(--card-bg) p-6 transition-all hover:border-primary/40">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2">
                <Eye size={20} className="text-purple-500" />
              </div>
              <h4 className="font-semibold text-(--text-main)">
                Additional Information
              </h4>
            </div>
            <div className="transition-transform duration-300" style={{
              transform: showDetails ? "rotate(180deg)" : "rotate(0deg)"
            }}>
              {showDetails ? <EyeOff size={20} /> : <Eye size={20} />}
            </div>
          </button>

          {showDetails && (
            <div className="mt-4 space-y-3 border-t border-(--card-border) pt-4">
              <div className="rounded-lg bg-(--bg-main) p-3">
                <p className="text-sm text-(--text-dim) mb-1">Min. Rating Required</p>
                <p className="font-semibold text-(--text-main)">4.6 ⭐</p>
              </div>
              <div className="rounded-lg bg-(--bg-main) p-3">
                <p className="text-sm text-(--text-dim) mb-1">Acceptance Rate</p>
                <p className="font-semibold text-(--text-main)">87%</p>
              </div>
              <div className="rounded-lg bg-(--bg-main) p-3">
                <p className="text-sm text-(--text-dim) mb-1">Cancellation Rate</p>
                <p className="font-semibold text-(--text-main)">3%</p>
              </div>
              <div className="rounded-lg bg-(--bg-main) p-3">
                <p className="text-sm text-(--text-dim) mb-1">Account Status</p>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <p className="font-semibold text-(--text-main)">Verified</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default GoOnlinePage;