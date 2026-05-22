import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, User as UserIcon, IndianRupee, Phone, RefreshCw, Navigation, ChevronDown, ChevronUp, MapPin, X
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl } from "react-leaflet";
import L from "leaflet";
import socket from "../../services/socket";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useDialog } from "../../context/DialogContext";
import { makeVehicleIcon, makePin } from "../../utils/mapIcons";
import SOSButton from "../../components/passenger/SOSButton";
import { loadRazorpay, openRazorpayCheckout, getMyWallet } from "../../services/paymentService";
import { fetchRoute as routingFetch, fetchRouteInfo as routingFetchInfo } from "../../utils/routing";

const distanceMetres = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const bluePin  = makePin("#3b82f6", "PICKUP");
const redPin   = makePin("#ef4444", "DROP");

const PassengerLiveTracking = () => {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { showAlert, showConfirm } = useDialog();

  const [ride, setRide] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState(null);

  const [displayRoute, setDisplayRoute] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPerspectiveMode, setIsPerspectiveMode] = useState(true);

  // SOS Warning
  const [sosWarningActive, setSosWarningActive] = useState(false);
  const [sosWarningReason, setSosWarningReason] = useState("");

  const [heading, setHeading] = useState(0);
  const [liveEtaMins, setLiveEtaMins] = useState(null);
  const [destEtaMins, setDestEtaMins] = useState(null);

  // Live clock — ticks every 5s so ETA arrival time stays accurate without reloading
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 5_000);
    return () => clearInterval(id);
  }, []);

  // Late departure alert state
  const [lateAlert, setLateAlert] = useState(null); // { zone, message, lateMinutes, canCancel }
  const [cancellingRide, setCancellingRide] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Live wallet balance (fetched fresh from server when payment panel shows)
  const [liveWalletBalance, setLiveWalletBalance] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const fetchLiveWallet = useCallback(async () => {
    setWalletLoading(true);
    try {
      const { data } = await getMyWallet();
      if (data.success) setLiveWalletBalance(data.wallet.walletBalance ?? 0);
    } catch {
      setLiveWalletBalance(user?.walletBalance ?? 0);
    } finally {
      setWalletLoading(false);
    }
  }, [user?.walletBalance]);

  const vehicleIcon = useMemo(() => {
    if (!ride) return null;
    return makeVehicleIcon(ride.vehicleType || "PRIME", heading);
  }, [ride?.vehicleType, heading]);

  useEffect(() => {
    if (user.role !== "passenger") {
      navigate("/driver/dashboard");
    }
  }, [user, navigate]);

  const fetchRide = async () => {
    try {
      const res = await api.get(`/published-rides/${rideId}`);
      if (res.data.success) {
        setRide(res.data.data);
        if (res.data.data.driverLocation) {
          setDriverLocation({ 
            lat: res.data.data.driverLocation[1], 
            lng: res.data.data.driverLocation[0],
            heading: res.data.data.driverLocationHeading || 0
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch ride", err);
      showAlert("Failed to load ride details", "Error", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRide();
  }, [rideId]);

  useEffect(() => {
    if (!ride) return;

    if (ride.status === "completed") {
      showAlert("This ride has been completed successfully. We hope you had a great journey!", "Ride Completed 🎉", "success")
        .then(() => navigate("/passenger/dashboard"));
      return;
    }

    if (ride.status === "cancelled") {
      showAlert("This ride has been cancelled.", "Ride Cancelled", "error")
        .then(() => navigate("/passenger/dashboard"));
      return;
    }

    const pId = user?.id || user?._id;
    if (!pId) return;

    const myBookings = ride.bookings?.filter(b => 
      (b.passenger?._id || b.passenger || b.passenger?.id)?.toString() === pId.toString()
    ) || [];

    // If they have bookings, but NONE of them are confirmed or pending, then they are cancelled
    if (myBookings.length > 0) {
      const hasActive = myBookings.some(b => b.status === "confirmed" || b.status === "pending");
      if (!hasActive) {
        showAlert("Your booking request has been cancelled.", "Ride Cancelled", "error")
          .then(() => navigate("/passenger/dashboard"));
      }
    }
  }, [ride, user, navigate]);

  useEffect(() => {
    if (!rideId) return;
    socket.connect();
    
    const joinRooms = () => {
      socket.emit("join_ride", rideId.toString());
      if (user?._id || user?.id) {
        socket.emit("join_user", (user._id || user.id).toString());
      }
      console.log("Passenger joined rooms:", { rideId, userId: user?._id || user?.id });
    };

    socket.on("connect", joinRooms);
    if (socket.connected) joinRooms();

    const onStatusUpdate = (data) => {
      console.log("Ride status update received:", data);
      const isMatchingId = data.rideId === rideId || 
                           data.rideId === ride?._id || 
                           data.tripId === rideId || 
                           data.tripId === ride?.tripId || 
                           data.tripId === ride?._id;

      if (isMatchingId) {
        if (data.status === "cancelled") {
          showAlert("This ride has been cancelled.", "Ride Cancelled", "error")
            .then(() => navigate("/passenger/dashboard"));
          return;
        }

        setRide(prev => prev ? { ...prev, status: data.status } : prev);
        if (data.status === "reached" || data.status === "completed") {
          setIsMinimized(false);
        }
        // Small delay to ensure backend has finished processing before fetching
        setTimeout(() => fetchRide(), 800);
      }
    };

    const onLocationUpdate = (data) => {
      setDriverLocation({ 
        lat: data.lat || data.location?.lat, 
        lng: data.lng || data.location?.lng,
        heading: data.heading || 0
      });
    };

    const onPaymentCompleted = async (data) => {
      console.log("Payment completion event received:", data);
      const methodLabel = data.method === "wallet" ? "Wallet" : data.method === "cash" ? "Cash" : "UPI";
      
      const idToUse = data.tripId || rideId;
      
      // Await the alert so the "OK" button triggers immediate navigation
      await showAlert(`Payment successful via ${methodLabel}! Redirecting to review…`, "Trip Finished", "success");
      
      navigate(`/review/${idToUse}?direction=to_driver`);
    };

    const onSosWarning = (data) => {
      if (data.tripId === rideId && user.role !== "driver") {
        setSosWarningReason(data.reason || "A safety concern has been detected on your trip.");
        setSosWarningActive(true);
      }
    };

    // ── Late Departure Handlers ──────────────────────────────────────────────
    const onLateUpdate = (data) => {
      if (data.rideId !== rideId) return;
      setLateAlert({
        zone: data.zone,
        message: data.message,
        lateMinutes: data.lateMinutes,
        canCancel: data.canCancel || false,
        urgent: data.urgent || false,
        reason: data.reason || null,
        reasonLabel: data.reasonLabel || null,
        newDepartureTime: data.newDepartureTime || null,
      });
    };

    const onAutoCancelled = async (data) => {
      if (data.rideId !== rideId) return;
      setLateAlert(null);
      await showAlert(
        "Your ride has been automatically cancelled — the driver did not depart within 20 minutes. Your booking has been removed. Please try to find another ride.",
        "🚫 Ride Auto-Cancelled",
        "error"
      );
      navigate("/passenger/dashboard");
    };

    socket.on("ride_status_update", onStatusUpdate);
    socket.on("location_update", onLocationUpdate);
    socket.on("payment_completed", onPaymentCompleted);
    socket.on("sos_warning", onSosWarning);
    socket.on("ride_late_update", onLateUpdate);
    socket.on("ride_auto_cancelled", onAutoCancelled);

    return () => {
      socket.off("connect", joinRooms);
      socket.off("ride_status_update", onStatusUpdate);
      socket.off("location_update", onLocationUpdate);
      socket.off("payment_completed", onPaymentCompleted);
      socket.off("sos_warning", onSosWarning);
      socket.off("ride_late_update", onLateUpdate);
      socket.off("ride_auto_cancelled", onAutoCancelled);
    };
  }, [rideId, user?.id, user?.role]);

  useEffect(() => {
    if (ride?.status === "reached" || ride?.status === "completed") {
      setIsMinimized(false);
      // Fetch fresh wallet balance whenever payment panel becomes visible
      fetchLiveWallet();
    }
  }, [ride?.status]);

  const effectiveDriverLocation = driverLocation || (ride?.source?.location?.coordinates ? {
    lat: ride.source.location.coordinates[1],
    lng: ride.source.location.coordinates[0],
    heading: 0
  } : null);

  // ─── Perspective Mode Tracking ───
  const prevPerspectiveRef = useRef(isPerspectiveMode);

  useEffect(() => {
    if (isPerspectiveMode && map && effectiveDriverLocation) {
      // If just toggled into perspective mode, snap to 18. Otherwise, respect user's manual zoom.
      const targetZoom = prevPerspectiveRef.current !== isPerspectiveMode ? 18 : map.getZoom();
      map.setView([effectiveDriverLocation.lat, effectiveDriverLocation.lng], targetZoom, { animate: true, duration: 1.0 });
    }
    prevPerspectiveRef.current = isPerspectiveMode;
  }, [isPerspectiveMode, effectiveDriverLocation, map]);

  // Map centering logic (Overview mode)
  useEffect(() => {
    if (!map || !ride || !effectiveDriverLocation || isPerspectiveMode) return;
    const isHeadingToPickup = !["in_progress", "reached", "completed"].includes(ride.status);
    
    let targetCoords = null;
    if (isHeadingToPickup && ride.source?.location?.coordinates) {
      targetCoords = [ride.source.location.coordinates[1], ride.source.location.coordinates[0]];
    } else if (ride.destination?.location?.coordinates) {
      targetCoords = [ride.destination.location.coordinates[1], ride.destination.location.coordinates[0]];
    }

    if (targetCoords) {
      const bounds = L.latLngBounds([[effectiveDriverLocation.lat, effectiveDriverLocation.lng], targetCoords]);
      map.fitBounds(bounds, { padding: [100, 100], animate: true });
    } else {
      map.setView([effectiveDriverLocation.lat, effectiveDriverLocation.lng], 15, { animate: true });
    }
  }, [effectiveDriverLocation?.lat, effectiveDriverLocation?.lng, map, ride?.status, isPerspectiveMode]);

  const firstPassenger = useMemo(() => {
    if (!ride) return null;
    if (!ride.bookings) return null;

    const pId = user?.id || user?._id;
    if (!pId) return null;

    // 1. Find active booking (pending/confirmed) for this passenger
    const activeBooking = ride.bookings.find(b => 
      (b.passenger?._id || b.passenger || b.passenger?.id)?.toString() === pId.toString() &&
      b.status !== "cancelled" && b.status !== "rejected"
    );
    if (activeBooking) return activeBooking;

    // 2. Fallback to any booking for this passenger
    const anyBooking = ride.bookings.find(b => 
      (b.passenger?._id || b.passenger || b.passenger?.id)?.toString() === pId.toString()
    );
    if (anyBooking) return anyBooking;

    // 3. Fallback to any active booking
    return ride.bookings.find(b => b.status === "confirmed" || b.status === "pending");
  }, [ride, user?.id, user?._id]);

  const pickupCoords = useMemo(() => {
    const raw = firstPassenger?.passengerSource?.location?.coordinates;
    return raw ? [raw[1], raw[0]] : null; // [lat, lng]
  }, [firstPassenger]);

  const destCoords = useMemo(() => {
    const raw = firstPassenger?.passengerDestination?.location?.coordinates;
    return raw ? [raw[1], raw[0]] : null; // [lat, lng]
  }, [firstPassenger]);

  useEffect(() => {
    if (!effectiveDriverLocation || displayRoute.length <= 1) return;
    let minStep = Infinity;
    let closestIdx = 0;
    for (let i = 0; i < displayRoute.length; i++) {
      const d = distanceMetres(effectiveDriverLocation.lat, effectiveDriverLocation.lng, displayRoute[i][0], displayRoute[i][1]);
      if (d < minStep) {
        minStep = d;
        closestIdx = i;
      }
    }
    if (displayRoute[closestIdx + 1]) {
      const p1 = displayRoute[closestIdx];
      const p2 = displayRoute[closestIdx + 1];
      setHeading((Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180) / Math.PI);
    } else if (effectiveDriverLocation.heading) {
      setHeading(effectiveDriverLocation.heading);
    }
  }, [effectiveDriverLocation?.lat, effectiveDriverLocation?.lng, displayRoute]);

  const visibleRoute = useMemo(() => {
    if (displayRoute.length <= 1 || !effectiveDriverLocation) return displayRoute;
    let minStep = Infinity;
    let closestIdx = 0;
    for (let i = 0; i < displayRoute.length; i++) {
      const d = distanceMetres(effectiveDriverLocation.lat, effectiveDriverLocation.lng, displayRoute[i][0], displayRoute[i][1]);
      if (d < minStep) {
        minStep = d;
        closestIdx = i;
      }
    }
    return minStep < 200 ? displayRoute.slice(closestIdx) : displayRoute;
  }, [displayRoute, effectiveDriverLocation?.lat, effectiveDriverLocation?.lng]);

  const lastFetchedRouteKeyRef = useRef("");

  // Fetch Route and ETA based on status
  useEffect(() => {
    const fetchRouteData = async () => {
      if (!ride || !pickupCoords) return;
      
      const isPickup = !["in_progress", "reached", "completed"].includes(ride.status);
      
      // 1. Determine Full Route Coordinates (for drawing)
      let routeStartLat, routeStartLng;
      if (isPickup) {
        if (effectiveDriverLocation) {
          routeStartLat = effectiveDriverLocation.lat;
          routeStartLng = effectiveDriverLocation.lng;
        } else if (ride.source?.location?.coordinates) {
          routeStartLat = ride.source.location.coordinates[1];
          routeStartLng = ride.source.location.coordinates[0];
        }
      } else {
        if (pickupCoords) {
          routeStartLat = pickupCoords[0];
          routeStartLng = pickupCoords[1];
        }
      }
      const routeStart = (routeStartLat && routeStartLng) ? [routeStartLat, routeStartLng] : null;
      const routeEnd = isPickup ? pickupCoords : destCoords;
      
      if (routeStart && routeEnd) {
        // Check if driver is far from existing route to recalculate if needed
        let minStep = Infinity;
        if (displayRoute.length > 0 && effectiveDriverLocation) {
          for (let i = 0; i < displayRoute.length; i++) {
            const d = distanceMetres(effectiveDriverLocation.lat, effectiveDriverLocation.lng, displayRoute[i][0], displayRoute[i][1]);
            if (d < minStep) minStep = d;
          }
        }

        const routeKey = isPickup ? "pickup" : "destination";
        const isFar = isPickup && (minStep > 200); // Only recalculate for pickup phase

        if (lastFetchedRouteKeyRef.current !== routeKey || isFar) {
          try {
            const result = await routingFetch(routeStart[0], routeStart[1], routeEnd[0], routeEnd[1]);
            if (result) {
               setDisplayRoute(result.path);
               lastFetchedRouteKeyRef.current = routeKey;
               if (isPickup) {
                 setLiveEtaMins(result.durationMin);
               }
            }
          } catch (err) {
            console.error("Failed to fetch drawing route", err);
          }
        }
      }

      // 2. Determine Live ETA (when in progress)
      if (!isPickup && effectiveDriverLocation && destCoords) {
        try {
          const info = await routingFetchInfo(
            effectiveDriverLocation.lat, effectiveDriverLocation.lng, destCoords[0], destCoords[1]
          );
          if (info) setDestEtaMins(info.durationMin);
        } catch (err) {
          console.error("Failed to fetch live ETA", err);
        }
      } else if (isPickup && effectiveDriverLocation && routeEnd && lastFetchedRouteKeyRef.current === "pickup") {
        try {
          const info = await routingFetchInfo(
            effectiveDriverLocation.lat, effectiveDriverLocation.lng, routeEnd[0], routeEnd[1]
          );
          if (info) setLiveEtaMins(info.durationMin);
        } catch (err) {
          console.error("Failed to fetch live ETA", err);
        }
      }
    };

    const timeoutId = setTimeout(fetchRouteData, 2000);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride?.status, ride?.source, pickupCoords, destCoords, effectiveDriverLocation?.lat, effectiveDriverLocation?.lng]);

  if (loading || !ride) return <Loader2 className="animate-spin text-white m-auto" size={48} />;
  
  const amountPaid = firstPassenger?.amountPaid || ride.fare?.totalWithTax || ride.fare?.total || 0;

  const handleCancelDueToDelay = async () => {
    const confirm = await showConfirm(
      "Your driver is significantly late. You can cancel this ride for free. Would you like to cancel?",
      "Cancel Ride",
      "warning"
    );
    if (confirm) {
      setLoading(true);
      try {
        await api.post("/rides/cancel-passenger", { 
          tripId: ride.tripId || ride._id, 
          reason: "Driver delay" 
        });
        showAlert("Your booking has been cancelled. No penalty applied due to driver delay.", "Cancelled", "success");
        navigate("/passenger/dashboard");
      } catch (err) {
        showAlert(err.response?.data?.message || "Cancellation failed", "Error", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancelGeneral = async () => {
    const isActive = ride.status === "active" || ride.status === "matched"; // booking confirmed, driver heading to pickup
    const isArrived = ride.status === "arrived"; // driver at pickup, ride not started
    
    if (!isActive && !isArrived) {
        showAlert("Cancellation is only available before the ride starts.", "Action Blocked", "info");
        return;
    }

    setIsCancelModalOpen(true);
  };

  const submitCancellation = async () => {
    setIsCancelModalOpen(false);
    setLoading(true);
    try {
      const res = await api.post("/rides/cancel-passenger", { 
        tripId: ride.tripId || ride._id, 
        reason: "User cancelled" 
      });
      if (res.data.success) {
        if (res.data.penalty > 0) {
          if (res.data.penaltyDeductedFromWallet) {
            showAlert(
              `Ride cancelled. A cancellation penalty of ₹${res.data.penalty} has been auto-deducted from your wallet. Your rides continue unrestricted.`,
              "Ride Cancelled",
              "success"
            );
          } else {
            showAlert(
              `Ride cancelled. Your wallet balance was insufficient. A penalty of ₹${res.data.penalty} has been added to your dues. Please pay manually to resume booking.`,
              "Ride Cancelled",
              "error"
            );
          }
        } else {
          showAlert("Ride cancelled successfully. No penalty applied.", "Ride Cancelled", "success");
        }

        // Sync newest user balance/status to local state
        if (res.data.newDueBalance !== undefined || res.data.newWalletBalance !== undefined) {
          setUser({
            ...user,
            walletBalance: res.data.newWalletBalance !== undefined ? res.data.newWalletBalance : user.walletBalance,
            dueBalance: res.data.newDueBalance !== undefined ? res.data.newDueBalance : user.dueBalance,
            accountStatus: res.data.accountStatus !== undefined ? res.data.accountStatus : user.accountStatus
          });
        }

        navigate("/passenger/dashboard");
      }
    } catch (err) {
      showAlert(err.response?.data?.message || "Cancellation failed", "Error", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col h-screen bg-[#121212] font-sans overflow-hidden">
      {/* ── Late Departure Banner ── */}
      {lateAlert && !['in_progress','reached','completed'].includes(ride.status) && (
        <div className={`absolute top-20 left-4 right-4 z-[3000] rounded-2xl p-4 shadow-2xl border animate-in slide-in-from-top-3 duration-500 ${
          lateAlert.zone >= 3
            ? 'bg-red-950/95 border-red-500/50 backdrop-blur-xl'
            : lateAlert.zone === 2
            ? 'bg-amber-950/95 border-amber-500/50 backdrop-blur-xl'
            : 'bg-slate-900/95 border-slate-500/30 backdrop-blur-xl'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">
              {lateAlert.zone >= 3 ? '🚨' : lateAlert.zone === 2 ? '⏳' : '🕐'}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-black uppercase tracking-widest mb-1 ${
                lateAlert.zone >= 3 ? 'text-red-400' : lateAlert.zone === 2 ? 'text-amber-400' : 'text-slate-300'
              }`}>
                {lateAlert.zone >= 3 ? 'SERIOUS DELAY — Final Warning'
                  : lateAlert.zone === 2 ? 'MODERATE DELAY'
                  : 'Minor Delay'}
              </p>
              <p className="text-sm text-white/80 font-medium leading-snug">
                {lateAlert.reasonLabel
                  ? `Driver reported: ${lateAlert.reasonLabel}${
                      lateAlert.newDepartureTime
                        ? ` · Revised Departure: ${new Date(lateAlert.newDepartureTime).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})}`
                        : ''
                    }`
                  : lateAlert.message}
              </p>
              {lateAlert.lateMinutes > 0 && (
                <p className="text-[11px] font-black text-white/50 mt-1 uppercase tracking-wider">
                  ⏱ Current delay: {lateAlert.lateMinutes} min
                </p>
              )}
              {lateAlert.canCancel && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleCancelDueToDelay}
                    disabled={cancellingRide}
                    className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all ${
                      lateAlert.zone >= 3
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                        : 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                    } disabled:opacity-50`}
                  >
                    {cancellingRide ? 'Cancelling…' : '❌ Cancel — No Penalty'}
                  </button>
                  <button
                    onClick={() => setLateAlert(null)}
                    className="px-4 py-2.5 rounded-xl font-black text-xs text-white/60 border border-white/10 bg-white/5 active:scale-95 transition-all"
                  >
                    ✅ Wait
                  </button>
                </div>
              )}
            </div>
            {!lateAlert.canCancel && (
              <button onClick={() => setLateAlert(null)} className="text-white/30 hover:text-white/60 shrink-0 text-lg leading-none mt-0.5">✕</button>
            )}
          </div>
        </div>
      )}
      {/* ── Top Bar ── */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 flex items-center justify-between pointer-events-none">
        <button 
          onClick={() => navigate(-1)} 
          className="pointer-events-auto bg-white/10 backdrop-blur-xl border border-white/20 p-3 rounded-2xl shadow-2xl active:scale-95 transition-all text-white"
        >
          <ArrowLeft size={22} />
        </button>

        <div className="bg-[#2a2a2a]/90 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-xl shadow-2xl pointer-events-auto flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_#f59e0b]" />
           <span className="text-[10px] font-black uppercase tracking-widest text-white/90">
             {ride.status === "in_progress" ? "Trip Ongoing" : ride.status === "reached" ? "Reached Destination" : "Heading to Pickup"}
           </span>
        </div>
      </div>

      {/* ── Map ── */}
      <div className="flex-1 w-full relative z-0 nav-tilt-wrapper">
        <div 
          className="w-full h-full transform-gpu"
          style={isPerspectiveMode ? { 
            transform: `scale(2.5) rotateZ(${-heading}deg)`,
            transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
          } : {
            transform: `scale(1) rotateZ(0deg)`,
            transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <MapContainer 
            center={effectiveDriverLocation || pickupCoords || [23.0225, 72.5714]} 
            zoom={14} 
            className="w-full h-full" 
            zoomControl={false}
            zoomAnimation={true}
            ref={setMap}
          >
            <ZoomControl position="bottomright" />
            <TileLayer 
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' 
              maxZoom={19} 
            />
            
            {pickupCoords && ride.status !== "in_progress" && ride.status !== "reached" && ride.status !== "completed" && (
              <Marker position={pickupCoords} icon={bluePin}>
                <Popup><b style={{ color: "#3b82f6" }}>Pickup Point</b></Popup>
              </Marker>
            )}

            {destCoords && (ride.status === "in_progress" || ride.status === "reached" || ride.status === "completed") && (
              <Marker position={destCoords} icon={redPin}>
                <Popup><b style={{ color: "#ef4444" }}>Destination</b></Popup>
              </Marker>
            )}

            {effectiveDriverLocation && vehicleIcon && (
              <Marker 
                position={[effectiveDriverLocation.lat, effectiveDriverLocation.lng]} 
                icon={vehicleIcon}
              >
                <Popup><b>Driver</b></Popup>
              </Marker>
            )}

            {/* Premium Blue Route */}
            {visibleRoute.length > 1 && (
              <>
                <Polyline
                  positions={visibleRoute}
                  pathOptions={{ color: "#1e3a8a", weight: 9, opacity: 0.15, lineCap: "round", lineJoin: "round" }}
                />
                <Polyline
                  positions={visibleRoute}
                  pathOptions={{ 
                    color: ride.status === "in_progress" ? "#6366f1" : "#3b82f6", 
                    weight: 5, 
                    opacity: 1, 
                    lineCap: "round", 
                    lineJoin: "round" 
                  }}
                />
                {visibleRoute.length < 500 && (
                  <Polyline
                    positions={visibleRoute}
                    pathOptions={{ color: "white", weight: 1.5, opacity: 0.4, dashArray: "10 20", lineCap: "round", lineJoin: "round" }}
                  />
                )}
              </>
            )}
          </MapContainer>
        </div>
      </div>

      <style>{`
        .perspective-map {
          perspective: 1200px;
        }
        .perspective-map .leaflet-container {
          transform: rotateX(45deg);
          transform-origin: center bottom;
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      {/* ── Bottom HUD ── */}
      <div className="absolute bottom-4 left-4 right-4 z-[2000] pointer-events-none flex flex-col gap-3">
        {/* Recenter & Perspective Buttons */}
        <div className="flex flex-col items-end gap-3">
             <button
                onClick={() => {
                  setIsPerspectiveMode(!isPerspectiveMode);
                  if (!isPerspectiveMode && map && effectiveDriverLocation) {
                    map.setView([effectiveDriverLocation.lat, effectiveDriverLocation.lng], 16, { animate: true });
                  } else if (isPerspectiveMode && map && effectiveDriverLocation) {
                    const target = ride.status === "in_progress" ? destCoords : pickupCoords;
                    if (target) map.fitBounds(
                      L.latLngBounds([[effectiveDriverLocation.lat, effectiveDriverLocation.lng], [target[1], target[0]]]),
                      { padding: [80, 80], animate: true }
                    );
                  }
                }}
                className={`pointer-events-auto w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 ${
                  isPerspectiveMode 
                  ? "bg-primary text-black border-none" 
                  : "bg-black/60 backdrop-blur border border-white/15 text-white"
                }`}
                title="Toggle Navigation View"
             >
                <Navigation size={20} className={isPerspectiveMode ? "fill-black" : ""} />
             </button>
             <button
                onClick={() => fetchRide()}
                className="pointer-events-auto bg-black/60 backdrop-blur border border-white/15 text-white p-3 rounded-full shadow-lg hover:scale-110 active:scale-90 transition-all disabled:opacity-50"
                title="Refresh Route"
             >
                <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
             </button>
        </div>
        
        <div className={`bg-black/85 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-3 pointer-events-auto shadow-2xl relative overflow-hidden transition-all duration-500 ease-in-out ${isMinimized ? "max-h-[85px]" : "max-h-[800px]"}`}>
          {/* Minimize toggle for passengers */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all z-50 active:scale-90"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? <ChevronUp size={16} className="text-white/60" /> : <ChevronDown size={16} className="text-white/60" />}
          </button>

          {/* ─── PASSENGER HUD ─── */}
          <div className="flex flex-col gap-3">
            {/* Status banner */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
              ride.status === "reached" || ride.status === "completed"
                ? "bg-violet-500/10 border-violet-500/30"
                : ride.status === "in_progress"
                ? "bg-emerald-500/10 border-emerald-500/30"
                : ride.status === "arrived"
                ? "bg-primary/10 border-primary/30"
                : "bg-amber-500/10 border-amber-500/30"
            }`}>
              <span className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${
                ride.status === "reached" || ride.status === "completed" ? "bg-violet-500"
                : ride.status === "in_progress" ? "bg-emerald-500"
                : ride.status === "arrived" ? "bg-primary"
                : "bg-amber-500"
              }`} />
              <span className={`text-xs font-black uppercase tracking-widest ${
                ride.status === "reached" || ride.status === "completed" ? "text-violet-400"
                : ride.status === "in_progress" ? "text-emerald-400"
                : ride.status === "arrived" ? "text-primary"
                : "text-amber-400"
              }`}>
                {ride.status === "reached" || ride.status === "completed" ? "📍 Destination Reached"
                 : ride.status === "in_progress" ? "🚀 Trip in Progress"
                 : ride.status === "arrived" ? "🎯 Driver at Pickup"
                 : "🚗 Driver is on the way"}
              </span>
            </div>

            {/* Main content - hidden when minimized */}
            {!isMinimized && (
              <>
                {/* Driver info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center shrink-0 border border-primary/20 overflow-hidden">
                    {ride.driver?.profileImage
                      ? <img src={ride.driver.profileImage} alt="" className="w-full h-full object-cover" />
                      : <UserIcon size={22} className="text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-black text-sm">{ride.driver?.name || "Your Driver"}</p>
                        <p className="text-[10px] text-white/40 font-medium">{(ride.vehicleType || "Vehicle").toUpperCase()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {effectiveDriverLocation && (
                          <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            <span className="text-[9px] font-black text-emerald-400 uppercase">Live</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                          <IndianRupee size={9} className="text-emerald-400" />
                          <span className="text-xs font-black text-emerald-400">{amountPaid}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ETA / OTP / Info Section */}
                {ride.status === "reached" || ride.status === "completed" ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                    <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">Arrived at Destination</p>
                    <p className="text-[11px] text-white/50 mt-1">Please pay the driver ₹{amountPaid} to complete the trip.</p>
                  </div>
                ) : ride.status === "in_progress" ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                    <p className="text-sm font-black text-emerald-400 text-center">
                      {destEtaMins !== null
                        ? destEtaMins <= 1 ? "🏁 Arriving at destination soon!"
                        : `~${destEtaMins} min to destination`
                        : "Trip is ongoing!"}
                    </p>
                    <p className="text-[11px] text-white/50 mt-1 text-center">Live ETA · Updates as driver moves</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* OTP Display - Critical for starting the ride */}
                    <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 text-center">
                      <p className="text-[10px] font-black text-violet-300 uppercase tracking-widest">Your Ride OTP</p>
                      <p className="text-2xl font-black text-white mt-1 tracking-[10px] uppercase">
                        {ride.otp || "----"}
                      </p>
                      <p className="text-[10px] text-white/40 mt-1">Give this to the driver to start the ride</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          {/* ETA headline */}
                          {(() => {
                            const displayLiveEtaMins = (() => {
                              if (liveEtaMins === null) return null;
                              let totalEta = liveEtaMins;
                              const baseTime = firstPassenger?.confirmedAt || firstPassenger?.bookedAt || ride.createdAt;
                              if (baseTime) {
                                const depTime = new Date(baseTime).getTime();
                                const now = nowTs;
                                if (depTime > now) {
                                  const pendingMins = Math.round((depTime - now) / 60000);
                                  totalEta += Math.max(0, pendingMins);
                                }
                              }
                              return totalEta;
                            })();

                            return (
                              <>
                                <p className={`text-sm font-black ${
                                  displayLiveEtaMins !== null
                                    ? displayLiveEtaMins === 0 ? "text-emerald-400"
                                    : displayLiveEtaMins <= 3 ? "text-emerald-400"
                                    : "text-white"
                                    : "text-white/60"
                                }`}>
                                  {displayLiveEtaMins !== null
                                    ? displayLiveEtaMins === 0
                                      ? "🟢 Driver is arriving now!"
                                      : `🚗 ~${displayLiveEtaMins} min away`
                                    : effectiveDriverLocation
                                    ? "⏳ Calculating ETA…"
                                    : "📡 Waiting for driver GPS signal"}
                                </p>

                                {/* Delay Info — uses pickupEtaMins so delay is from expected PICKUP time */}
                                {(() => {
                                  // expectedPickupTime = when driver was supposed to arrive at pickup
                                  // = confirmation/booking time + travel time from driver's location to pickup point
                                  const pickupEtaMins = ride.pickupEtaMins || 10;
                                  const baseTime = firstPassenger?.confirmedAt || firstPassenger?.bookedAt || ride.createdAt;
                                  const expectedPickupTs = new Date(baseTime).getTime() + pickupEtaMins * 60000;
                                  const expectedPickupTime = new Date(expectedPickupTs);

                                  // Determine system-calculated delay minutes
                                  let delayMinutes = ride.lateMinutes || lateAlert?.lateMinutes || 0;
                                  
                                  // Fallback to live ETA comparison if no official delay is registered but driver is overdue
                                  if (delayMinutes === 0 && displayLiveEtaMins !== null && nowTs > expectedPickupTs) {
                                    delayMinutes = Math.max(0, Math.round((nowTs + displayLiveEtaMins * 60000 - expectedPickupTs) / 60000));
                                  }

                                  return (
                                    <div className="mt-1 flex flex-col gap-0.5">
                                      <p className="text-[10px] text-white/40 flex items-center gap-1 font-bold uppercase tracking-widest flex-wrap">
                                         Expected Pickup: <span className="text-white/60">
                                           {expectedPickupTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                           {delayMinutes > 0 && ` (Revised: ${new Date(expectedPickupTs + delayMinutes * 60000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })})`}
                                         </span>
                                      </p>
                                      {delayMinutes > 0 && (
                                        <p className="text-[11px] text-red-400 font-black flex items-center gap-1">
                                           ⚠️ Expected Delay: {delayMinutes} min
                                        </p>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Sub-label */}
                                <p className="text-[10px] text-white/40 mt-1">
                                  {displayLiveEtaMins !== null
                                    ? "Live ETA · Updates as driver moves"
                                    : effectiveDriverLocation
                                    ? "Updates live as driver moves"
                                    : "Driver location will appear once GPS connects"}
                                </p>

                                {/* Progress bar — fills as driver gets closer (max 20 min reference) */}
                                {displayLiveEtaMins !== null && (
                                  <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-1000"
                                      style={{
                                        width: `${Math.min(100, Math.max(4, ((20 - displayLiveEtaMins) / 20) * 100))}%`,
                                        background: displayLiveEtaMins <= 2
                                          ? "linear-gradient(to right, #10b981, #4ade80)"
                                          : displayLiveEtaMins <= 5
                                          ? "linear-gradient(to right, #f59e0b, #fcd34d)"
                                          : "linear-gradient(to right, #6366f1, #818cf8)"
                                      }}
                                    />
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>

                        <div className="flex items-center gap-2">
                           {ride.driver?.Mobile_no && (
                             <a
                               href={`tel:${ride.driver.Mobile_no}`}
                               className="bg-emerald-500/10 text-emerald-500 p-2.5 rounded-xl border border-emerald-500/20 active:scale-95 transition-all"
                             >
                               <Phone size={16} />
                             </a>
                           )}
                           {(ride.status === "active" || ride.status === "matched" || ride.status === "arrived") && (
                             <button
                               onClick={handleCancelGeneral}
                               className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2.5 rounded-xl border border-red-500/20 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all duration-350 shrink-0"
                               title="Cancel Ride"
                             >
                               Cancel Ride
                             </button>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SOS Button — only when trip is ongoing */}
                {ride.status === "in_progress" && (
                  <div className="mt-1">
                    <SOSButton
                      tripId={rideId}
                      warningActive={sosWarningActive}
                      warningReason={sosWarningReason}
                      onWarningClose={() => setSosWarningActive(false)}
                    />
                  </div>
                )}

                {/* PAYMENT SECTION — only when reached */}
                {(ride.status === "reached" || ride.status === "completed") && (() => {
                  // Use live wallet balance if fetched, otherwise fall back to cached user data
                  const currentWalletBalance = liveWalletBalance !== null ? liveWalletBalance : (user?.walletBalance ?? 0);
                  const hasSufficientBalance = currentWalletBalance >= amountPaid;

                  return (
                    <div className="space-y-3 pt-2 border-t border-white/10 mt-1">
                      {/* Fare + Wallet Summary */}
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Total Fare</p>
                          <p className="text-xl font-black text-emerald-400 flex items-center gap-1">
                            <IndianRupee size={16} /> {amountPaid}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Wallet Balance</p>
                          {walletLoading ? (
                            <div className="flex items-center gap-1 justify-end">
                              <Loader2 size={12} className="animate-spin text-white/40" />
                              <span className="text-xs text-white/40">Fetching…</span>
                            </div>
                          ) : (
                            <p className={`text-sm font-black flex items-center gap-1 justify-end ${hasSufficientBalance ? "text-emerald-400" : "text-red-400"}`}>
                              <IndianRupee size={12} /> {currentWalletBalance.toFixed(2)}
                              {hasSufficientBalance
                                ? <span className="text-[9px] text-emerald-400/60 ml-1">✓ Sufficient</span>
                                : <span className="text-[9px] text-red-400/60 ml-1">✗ Low</span>
                              }
                            </p>
                          )}
                        </div>
                      </div>

                      {/* UPI note — clarify UPI does NOT deduct from wallet */}
                      <div className="flex items-start gap-2 bg-sky-500/8 border border-sky-500/20 rounded-xl px-3 py-2">
                        <span className="text-sky-400 text-[10px] mt-px">ℹ️</span>
                        <p className="text-[10px] text-sky-300/80 leading-relaxed">
                          <span className="font-black text-sky-300">UPI payments</span> are charged directly via Razorpay and will <span className="font-black">not deduct</span> from your RouteMate wallet. They appear in your history as <span className="italic">"UPI – Settled"</span>.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={async () => {
                            try {
                              const fare = amountPaid || 0;
                              if (!hasSufficientBalance) {
                                showAlert(
                                  `Insufficient wallet balance. You need ₹${fare}, but your balance is ₹${currentWalletBalance.toFixed(2)}. Please use UPI or Cash.`,
                                  "Low Balance",
                                  "warning"
                                );
                                return;
                              }
                              const res = await api.post("/payments/wallet-pay", { rideId: ride._id });
                              if (res.data.success) {
                                showAlert("Wallet payment successful! Redirecting to review…", "Done", "success");
                                const idToUse = res.data.tripId || ride.tripId || ride._id;
                                setTimeout(() => navigate(`/review/${idToUse}?direction=to_driver`), 2500);
                              }
                            } catch (err) {
                              showAlert(err.response?.data?.message || "Wallet payment failed", "Error", "error");
                            }
                          }}
                          disabled={!hasSufficientBalance || walletLoading}
                          className="bg-primary text-black py-4 rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Pay via Wallet
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const result = await openRazorpayCheckout({
                                amount: amountPaid || 0,
                                purpose: "upi_trip",
                                rideId: ride._id,
                                tripId: ride.tripId,
                                description: "Trip Payment via UPI",
                              });
                              if (result?.success) {
                                showAlert("Payment successful! Redirecting to review…", "Success", "success");
                                const idToUse = result.tripId || ride.tripId || ride._id;
                                setTimeout(() => navigate(`/review/${idToUse}?direction=to_driver`), 2500);
                              } else if (result === null) {
                                showAlert("Payment cancelled.", "Cancelled", "info");
                              }
                            } catch (err) {
                              showAlert(err.message || "Payment failed", "Error", "error");
                            }
                          }}
                          className="bg-white/10 border border-white/10 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl"
                        >
                          Pay via UPI
                        </button>
                      </div>
                      <button
                        onClick={async () => {
                          await showAlert("Please pay the driver in cash. Once the driver confirms, your ride will be closed.", "Cash Selected", "info");
                          // Redirect to review page immediately so they can wait there or fill it
                          const idToUse = ride.tripId || ride._id;
                          navigate(`/review/${idToUse}?direction=to_driver`);
                        }}
                        className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 py-3 rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                      >
                        💵 I will pay Cash
                      </button>
                      <p className="text-[10px] text-center text-white/30">All payments are encrypted and secure</p>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </div>
      {/* ── Cancellation Terms & Conditions Modal ── */}
      {isCancelModalOpen && (
        <div className="absolute inset-0 z-[4000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-neutral-900 border border-white/10 rounded-[28px] p-6 max-w-sm w-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="text-center mb-5">
              <span className="text-4xl">⚠️</span>
              <h3 className="text-lg font-black text-white mt-2 uppercase tracking-wide">Cancellation Policy</h3>
              <p className="text-xs text-white/50 mt-1">Please review the RouteMate terms before cancelling</p>
            </div>

            {/* Terms List */}
            <div className="space-y-4 mb-6">
              <div className="flex gap-3">
                <span className="text-emerald-400 text-sm shrink-0">⚡</span>
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-wider">Free Cancellation</p>
                  <p className="text-[11px] text-white/60 mt-0.5 leading-relaxed">No charges apply if cancelled within <span className="font-bold text-white">3 minutes</span> of booking confirmation.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-amber-400 text-sm shrink-0">🚗</span>
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-wider">Standard Fee (₹30)</p>
                  <p className="text-[11px] text-white/60 mt-0.5 leading-relaxed">Applies after <span className="font-bold text-white">3 minutes</span> if the driver is more than <span className="font-bold text-white">0.5 km</span> away from pickup.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-red-400 text-sm shrink-0">🎯</span>
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-wider">Proximity Fee (₹50)</p>
                  <p className="text-[11px] text-white/60 mt-0.5 leading-relaxed">Applies after <span className="font-bold text-white">3 minutes</span> if the driver is within <span className="font-bold text-white">0.5 km</span> of your pickup location.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-rose-400 text-sm shrink-0">📍</span>
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-wider">Driver Waiting Fee (₹30 / ₹50)</p>
                  <p className="text-[11px] text-white/60 mt-0.5 leading-relaxed">If the driver has arrived at pickup: <span className="font-bold text-white">₹30</span> fee applies within 1 minute of arrival, <span className="font-bold text-white">₹50</span> after 1 minute.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-violet-400 text-sm shrink-0">🔒</span>
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-wider">Account Restrictions</p>
                  <p className="text-[11px] text-white/60 mt-0.5 leading-relaxed">Any charged cancellation fee is added to your account dues. Account is <span className="font-bold text-white">blocked</span> from new bookings until settled.</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-black py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-emerald-500/10"
              >
                Keep Booking ✅
              </button>
              <button
                onClick={submitCancellation}
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 py-3 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
              >
                Confirm Cancel 🚫
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassengerLiveTracking;
