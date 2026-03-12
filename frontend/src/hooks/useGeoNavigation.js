/**
 * useGeoNavigation.js
 *
 * Custom hook that powers real-time navigation tracking:
 * - Uses browser navigator.geolocation.watchPosition (free, no API key)
 * - Tracks progress along an array of route coordinate steps
 * - Calculates remaining distance and ETA in real time
 * - Detects arrival at destination
 * - Provides a "simulation" mode for testing without physical movement
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Haversine distance between two lat/lng points (metres) ─────────────────
function haversineMetres(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in metres
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Find the index of the closest route point to a given position ───────────
function closestPointIndex(routeCoords, lat, lng) {
  let minDist = Infinity;
  let minIdx = 0;
  for (let i = 0; i < routeCoords.length; i++) {
    const [rLat, rLng] = routeCoords[i];
    const d = haversineMetres(lat, lng, rLat, rLng);
    if (d < minDist) {
      minDist = d;
      minIdx = i;
    }
  }
  return minIdx;
}

// ─── Total length of a polyline segment (metres) ─────────────────────────────
function segmentLength(coords, fromIdx, toIdx) {
  let total = 0;
  for (let i = fromIdx; i < Math.min(toIdx, coords.length - 1); i++) {
    const [lat1, lng1] = coords[i];
    const [lat2, lng2] = coords[i + 1];
    total += haversineMetres(lat1, lng1, lat2, lng2);
  }
  return total;
}

// ─── Compute bearing between two points (degrees, 0 = North) ─────────────────
function bearing(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// ─── Direction label from bearing ────────────────────────────────────────────
function directionLabel(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

// ─── Main Hook ────────────────────────────────────────────────────────────────
/**
 * @param {Array<[lat, lng]>} routeCoords  - Full route polyline coordinates
 * @param {{ lat, lng }}      pickup        - Pickup point
 * @param {{ lat, lng }}      dropoff       - Dropoff point
 * @param {boolean}           simulate      - If true, animate movement along route
 */
export function useGeoNavigation({
  routeCoords = [],
  pickup = null,
  dropoff = null,
  simulate = false,
}) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentPos, setCurrentPos] = useState(null);   // { lat, lng, heading }
  const [progressIdx, setProgressIdx] = useState(0);    // current step index in routeCoords
  const [remainingDist, setRemainingDist] = useState(null); // metres
  const [remainingMin, setRemainingMin] = useState(null);   // minutes
  const [arrived, setArrived] = useState(false);
  const [error, setError] = useState(null);
  const [heading, setHeading] = useState(0);            // degrees

  // ── Refs (don't cause re-renders) ─────────────────────────────────────────
  const watchIdRef = useRef(null);
  const simIntervalRef = useRef(null);
  const simIdxRef = useRef(0);
  const routeRef = useRef(routeCoords);
  routeRef.current = routeCoords;

  // ── Arrival threshold: 40 metres from dropoff ─────────────────────────────
  const ARRIVAL_METRES = 40;
  // ── Average driving speed for ETA (m/s) ───────────────────────────────────
  const AVG_SPEED_MS = 8.3; // ~30 km/h in city

  // ─── Core update function (called on every GPS fix or sim step) ───────────
  const updatePosition = useCallback(
    (lat, lng) => {
      const coords = routeRef.current;
      if (!coords || coords.length === 0) return;

      // Find progress
      const idx = closestPointIndex(coords, lat, lng);
      setProgressIdx(idx);

      // Heading from current to next route point
      if (idx < coords.length - 1) {
        const [nLat, nLng] = coords[idx + 1];
        const hdg = bearing(lat, lng, nLat, nLng);
        setHeading(hdg);
      }

      // Remaining distance from current position to end
      const distToNextPoint = haversineMetres(lat, lng, coords[idx][0], coords[idx][1]);
      const remainingRoute = segmentLength(coords, idx, coords.length - 1);
      const totalRemaining = distToNextPoint + remainingRoute;
      setRemainingDist(totalRemaining);
      setRemainingMin(Math.max(1, Math.round(totalRemaining / AVG_SPEED_MS / 60)));

      // Update current position
      setCurrentPos({ lat, lng });

      // Check arrival at dropoff
      if (dropoff) {
        const distToEnd = haversineMetres(lat, lng, dropoff.lat, dropoff.lng);
        if (distToEnd <= ARRIVAL_METRES) {
          setArrived(true);
          stopNavigation();
        }
      }
    },
    [dropoff] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ─── Start navigation ─────────────────────────────────────────────────────
  const startNavigation = useCallback(() => {
    if (!routeRef.current || routeRef.current.length === 0) {
      setError("No route loaded. Please select pickup and destination first.");
      return;
    }

    setArrived(false);
    setError(null);
    setIsNavigating(true);

    if (simulate) {
      // ── Simulation mode: walk along route coords every 800ms ──────────────
      simIdxRef.current = 0;
      simIntervalRef.current = setInterval(() => {
        const coords = routeRef.current;
        const i = simIdxRef.current;
        if (i >= coords.length) {
          clearInterval(simIntervalRef.current);
          setIsNavigating(false);
          return;
        }
        const [lat, lng] = coords[i];
        updatePosition(lat, lng);
        simIdxRef.current += 1;
      }, 800);
    } else {
      // ── Real GPS mode (browser Geolocation API) ───────────────────────────
      if (!navigator.geolocation) {
        setError("Geolocation is not supported by your browser.");
        setIsNavigating(false);
        return;
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          updatePosition(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          setError(`GPS error: ${err.message}`);
          setIsNavigating(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 2000,
          timeout: 10000,
        }
      );
    }
  }, [simulate, updatePosition]);

  // ─── Stop navigation ──────────────────────────────────────────────────────
  const stopNavigation = useCallback(() => {
    setIsNavigating(false);

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simIntervalRef.current !== null) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
  }, []);

  // ─── Auto-cleanup on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => stopNavigation();
  }, [stopNavigation]);

  // ─── Reset when route changes ─────────────────────────────────────────────
  useEffect(() => {
    stopNavigation();
    setCurrentPos(null);
    setProgressIdx(0);
    setRemainingDist(null);
    setRemainingMin(null);
    setArrived(false);
    setError(null);
  }, [routeCoords, stopNavigation]); // Reset on new route

  // ── Derived values ─────────────────────────────────────────────────────────
  // Split polyline: travelled (grey) vs remaining (indigo)
  const travelledCoords = routeCoords.slice(0, progressIdx + 1);
  const remainingCoords = routeCoords.slice(progressIdx);

  // Next direction instruction
  let nextInstruction = "Head toward destination";
  if (routeCoords.length > progressIdx + 1) {
    const dir = directionLabel(heading);
    const mLeft =
      remainingDist != null ? (remainingDist / 1000).toFixed(1) : "?";
    nextInstruction = `Go ${dir} · ${mLeft} km remaining`;
  }
  if (arrived) nextInstruction = "🎉 You have arrived!";

  return {
    // State
    isNavigating,
    currentPos,
    progressIdx,
    remainingDist,
    remainingMin,
    arrived,
    error,
    heading,
    // Derived
    travelledCoords,
    remainingCoords,
    nextInstruction,
    // Actions
    startNavigation,
    stopNavigation,
  };
}
