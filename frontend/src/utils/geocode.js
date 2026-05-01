// ─── geocode.js ───────────────────────────────────────────────────────────────
// Free geocoding  — Nominatim (OpenStreetMap) + Photon, no API key
// Routing         — delegated to utils/routing.js (multi-provider fallback)
// Traffic ETA     — time-of-day multiplier (IST-aware)
// ─────────────────────────────────────────────────────────────────────────────
import { fetchRoute as _fetchRoute, fetchMultipleRoutes as _fetchMultipleRoutes, fetchRouteInfo as _fetchRouteInfo, haversineKm } from "./routing";

// ─── Build a full "Name, Area, City, State – Pincode" from Nominatim address ──
// ─── Internal helper to split full name into bold + grey parts ────────────────
function splitAddress(item) {
  const a = item?.address || {};
  
  // Specific name: The most specific landmark/building/road
  const specificName =
    a.amenity || a.shop || a.tourism || a.leisure || a.stadium ||
    a.university || a.hospital || a.school || a.place_of_worship ||
    a.building || a.road || a.pedestrian || a.path || a.place;

  const area = a.neighbourhood || a.suburb || a.quarter || a.city_district;
  const taluka = a.county || a.state_district;
  const city = a.city || a.town || a.village || a.municipality || a.district;
  const state = a.state;
  const pin = a.postcode;

  // Build ordered list: Area -> Taluka -> City -> State
  const parts = [area, taluka, city].filter(Boolean);
  
  // Ensure Ahmedabad is explicitly present if in Gujarat
  const hasAhmedabad = parts.some(pt => pt.toLowerCase().includes("ahmedabad") || pt.toLowerCase().includes("amdavad"));
  if (state === "Gujarat" && !hasAhmedabad && specificName?.toLowerCase() !== "ahmedabad") {
    parts.push("Ahmedabad");
  }
  if (state) parts.push(state);

  // Deduplicate and join
  const uniqueParts = parts.filter((v, i, arr) => arr.indexOf(v) === i);
  const subtitle = uniqueParts.join(", ") + (pin ? ` – ${pin}` : "");

  return { specificName, subtitle };
}

// ─── Build a full "Name, Area, City, State – Pincode" from Nominatim address ──
export function buildCleanName(item) {
  const { specificName, subtitle } = splitAddress(item);

  const locationParts = [specificName, subtitle].filter(Boolean);

  if (!specificName && !subtitle) {
    return item?.display_name?.split(", ").slice(0, 4).join(", ") || "";
  }

  // Deduplicate and join
  const unique = [specificName].concat(subtitle.split(", ")).filter(Boolean);
  const cleanUnique = unique.filter((v, i, arr) => arr.indexOf(v) === i);
  
  const base = cleanUnique.join(", ");
  return base;
}

// ─── Reverse Geocoding (Nominatim) ────────────────────────────────────────────
// ─── Reverse Geocoding (Nominatim) ────────────────────────────────────────────
export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { "Accept-Language": "en", "User-Agent": "RouteMate/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const name = buildCleanName(data);
    const { specificName, subtitle } = splitAddress(data);
    
    return { 
      name, 
      specificName: specificName || name, 
      subtitle, 
      fullAddress: data?.display_name || name,
      lat, 
      lng 
    };
  } catch (e) {
    console.error("[geocode] reverseGeocode:", e.message);
    const coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    return { name: coords, specificName: coords, subtitle: "", lat, lng };
  }
}

// ─── Location Search (Photon by Komoot — OSM autocomplete, no key, no rate-limit) ────
export async function searchLocation(query) {
  if (!query || query.trim().length < 1) return [];

  // Gujarat bounding box: minLon, minLat, maxLon, maxLat
  const gujaratBbox = "68.0,20.1,74.5,24.7";
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10&lang=en&bbox=${gujaratBbox}`;

  try {
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    if (!res.ok) throw new Error(`Photon HTTP ${res.status}`);
    const json = await res.json();
    const features = json.features || [];

    return features
      .filter(f => {
        // Keep only results in India (Photon bbox is a bias, not hard filter)
        const country = (f.properties.country || "").toLowerCase();
        return country === "india" || country === "";
      })
      .map(f => {
        const p = f.properties;
        const [lng, lat] = f.geometry.coordinates;

        // Primary bold name (most specific)
        const specificName = p.name || p.street || p.city || query;

        // Grey subtitle parts
        const parts = [];
        if (p.district && p.district !== specificName) parts.push(p.district);
        if (p.city && p.city !== specificName) parts.push(p.city);
        if (p.county && p.county !== specificName) parts.push(p.county);
        
        // Ensure Ahmedabad is explicitly present if in Gujarat
        const state = p.state;
        const hasAhmedabad = parts.some(pt => pt.toLowerCase().includes("ahmedabad") || pt.toLowerCase().includes("amdavad"));
        
        if (state === "Gujarat" && !hasAhmedabad && specificName.toLowerCase() !== "ahmedabad") {
          parts.push("Ahmedabad");
        }
        
        if (state && state !== specificName) parts.push(state);
        if (p.postcode) parts.push(`– ${p.postcode}`);
        
        const subtitle = parts.filter((v, i, arr) => arr.indexOf(v) === i).join(", ");

        const fullName = subtitle ? `${specificName}, ${subtitle}` : specificName;

        return { name: fullName, specificName, subtitle, fullAddress: fullName, lat, lng };
      });
  } catch (e) {
    console.warn("[geocode] Photon failed, falling back to Nominatim:", e.message);
    // Fallback: Nominatim India-wide
    try {
      const fallbackUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=10&countrycodes=in&addressdetails=1`;
      const res2 = await fetch(fallbackUrl, {
        headers: { "Accept-Language": "en", "User-Agent": "RouteMate/1.0" },
      });
      if (!res2.ok) return [];
      const data = await res2.json();
      return data.map(item => {
        const { specificName, subtitle } = splitAddress(item);
        const name = buildCleanName(item) || item.display_name;
        return {
          name,
          specificName: specificName || name,
          subtitle,
          fullAddress: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        };
      });
    } catch {
      return [];
    }
  }
}

// ─── Traffic Condition (IST time-of-day) ──────────────────────────────────────
export function getTrafficCondition() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const h = new Date(utcMs + 5.5 * 3600 * 1000).getHours();

  if ((h >= 8 && h < 11) || (h >= 17 && h < 21))
    return { multiplier: 1.55, label: "Heavy Traffic", color: "#ef4444", icon: "🔴" };
  if (h >= 11 && h < 17)
    return { multiplier: 1.20, label: "Moderate Traffic", color: "#f59e0b", icon: "🟡" };
  if (h >= 21 || h < 6)
    return { multiplier: 0.85, label: "Light Traffic", color: "#22c55e", icon: "🟢" };
  return { multiplier: 1.05, label: "Normal Traffic", color: "#22c55e", icon: "🟢" };
}

// ─── Fare Tiers (₹ fixed rates) ───────────────────────────────────────────────
export const FARE_TIERS = [
  { id: "bike", label: "Bike", emoji: "🏍️", baseFare: 15, perKm: 6, perMin: 0.6, capacity: "1 seat" },
  { id: "auto", label: "Auto", emoji: "🛺", baseFare: 30, perKm: 9, perMin: 1.0, capacity: "3 seats" },
  { id: "mini", label: "Mini", emoji: "🚗", baseFare: 50, perKm: 12, perMin: 1.5, capacity: "4 seats" },
  { id: "sedan", label: "Sedan", emoji: "🚙", baseFare: 70, perKm: 15, perMin: 2.0, capacity: "4 seats" },
  { id: "suv", label: "SUV", emoji: "🚐", baseFare: 100, perKm: 20, perMin: 2.5, capacity: "6 seats" },
];

export function calculateFares(distanceKm, durationMin, systemConfig = null) {
  const surge = systemConfig ? parseFloat(String(systemConfig.surgeMultiplier).replace(/[^\d.]/g, "")) : 1;
  const pricing = systemConfig?.pricing;

  return FARE_TIERS.map((tier) => {
    let base = tier.baseFare;
    let kmRate = tier.perKm;

    if (pricing && pricing[tier.id]) {
      base = parseFloat(String(pricing[tier.id]?.baseFare || "").replace(/[^\d.]/g, "")) || base;
      kmRate = parseFloat(String(pricing[tier.id]?.costPerKm || "").replace(/[^\d.]/g, "")) || kmRate;
    }

    const fare = Math.round((base + kmRate * distanceKm) * surge);
    return { ...tier, fare, fareStr: `₹${fare}` };
  });
}

// ─── Route metadata (label / tag / color per slot) ────────────────────────────
export const ROUTE_META = [
  { label: "Fastest", tag: "⚡ Recommended", color: "#6366f1" },
  { label: "Balanced", tag: "🔀 Alternate Path", color: "#f59e0b" },
  { label: "Scenic Route", tag: "🛣️ Via Bypass", color: "#10b981" },
];

// ─── Multi-route (delegates to resilient routing.js) ─────────────────────────
export async function getMultipleRoutes(pickup, dropoff, systemConfig = null) {
  if (!pickup || !dropoff) return [];
  const traffic = getTrafficCondition();
  return _fetchMultipleRoutes(pickup, dropoff, systemConfig, traffic.multiplier);
}

// ─── Legacy via-waypoint (now uses routing.js internally) ────────────────────
export async function fetchOsrmVia(pickup, via, dropoff) {
  // Kept for backward compatibility — direct route ignoring via
  const result = await _fetchRoute(
    pickup.lat, pickup.lng, dropoff.lat, dropoff.lng
  );
  if (!result) return null;
  return { coords: result.path, distanceM: result.distanceKm * 1000, durationS: result.durationSecs };
}

// ─── Legacy single-route info (nav hook compatibility) ───────────────────────
export async function getRouteInfo(pickup, dropoff) {
  if (!pickup || !dropoff) return null;
  const info = await _fetchRouteInfo(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
  if (!info) return null;
  return { distance: `${info.distanceKm} km`, duration: info.durationMin };
}
