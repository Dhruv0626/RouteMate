// ─── geocode.js ───────────────────────────────────────────────────────────────
// Free geocoding  — Nominatim (OpenStreetMap), no API key
// Free routing    — OSRM public API, no API key
// Traffic ETA     — time-of-day multiplier (IST-aware)
// Multi-route     — OSRM alternatives first; small offsets only as fallback
// ─────────────────────────────────────────────────────────────────────────────

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

// ─── OSRM helpers ─────────────────────────────────────────────────────────────
function parseOsrmRoute(route) {
  // GeoJSON [lng,lat] → Leaflet [lat,lng]
  const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  return { distanceM: route.distance, durationS: route.duration, coords };
}

/**
 * Fetch the main route PLUS any OSRM-native alternatives in one call.
 * Returns an array of raw route objects (may be 1-3).
 */
async function fetchOsrmAlternatives(pickup, dropoff) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}` +
    `?overview=full&geometries=geojson&alternatives=true`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) return [];
    return data.routes.map(parseOsrmRoute);
  } catch {
    return [];
  }
}

/**
 * Fetch a single OSRM route through an optional via-waypoint.
 * via = { lat, lng } or null for direct.
 */
export async function fetchOsrmVia(pickup, via, dropoff) {
  const coords = via
    ? `${pickup.lng},${pickup.lat};${via.lng},${via.lat};${dropoff.lng},${dropoff.lat}`
    : `${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) return null;
    return parseOsrmRoute(data.routes[0]);
  } catch {
    return null;
  }
}

/**
 * Small perpendicular offset waypoint — keeps the detour realistic.
 * fraction  0..1: how far along the direct line
 * side      +1 / -1: which perpendicular direction
 * kmOffset  lateral push in km (keep small! ≤ 0.9 km recommended)
 */
function lateralWaypoint(pickup, dropoff, fraction, side, kmOffset) {
  const midLat = pickup.lat + fraction * (dropoff.lat - pickup.lat);
  const midLng = pickup.lng + fraction * (dropoff.lng - pickup.lng);

  const dx = dropoff.lng - pickup.lng;
  const dy = dropoff.lat - pickup.lat;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  const deg = kmOffset / 111;
  return {
    lat: midLat + (-dx / len) * deg * side,
    lng: midLng + (dy / len) * deg * side,
  };
}

/**
 * Two routes are "too similar" if they share > 85% of their total length.
 * We use a simple bounding-box overlap heuristic (fast, no O(n²) coord scan).
 */
function routesTooSimilar(a, b) {
  const bbox = (coords) => coords.reduce(
    (acc, [lat, lng]) => ({
      minLat: Math.min(acc.minLat, lat), maxLat: Math.max(acc.maxLat, lat),
      minLng: Math.min(acc.minLng, lng), maxLng: Math.max(acc.maxLng, lng),
    }),
    { minLat: Infinity, maxLat: -Infinity, minLng: Infinity, maxLng: -Infinity }
  );
  const ba = bbox(a.coords), bb = bbox(b.coords);
  const overlapLat = Math.max(0, Math.min(ba.maxLat, bb.maxLat) - Math.max(ba.minLat, bb.minLat));
  const overlapLng = Math.max(0, Math.min(ba.maxLng, bb.maxLng) - Math.max(ba.minLng, bb.minLng));
  const areaA = (ba.maxLat - ba.minLat) * (ba.maxLng - ba.minLng) || 0.00001;
  const areaB = (bb.maxLat - bb.minLat) * (bb.maxLng - bb.minLng) || 0.00001;
  const areaO = overlapLat * overlapLng;
  // If overlap covers > 85% of the smaller bbox → routes are essentially the same road
  return (areaO / Math.min(areaA, areaB)) > 0.85;
}

// ─── Main: guaranteed ≤3 sensible routes ─────────────────────────────────────
/**
 * Strategy:
 *  1. Ask OSRM for alternatives in one request (fastest + up to 2 native alts).
 *  2. If fewer than 3, supplement with small lateral-offset single-route calls.
 *  3. Sort all candidates by raw duration (shortest = Route 0).
 *  4. Reject any route that is >45% longer *in distance* than the fastest.
 *  5. Deduplicate routes that are geometrically too similar.
 *  6. Return up to 3, labelled per ROUTE_META.
 */
export async function getMultipleRoutes(pickup, dropoff, systemConfig = null) {
  if (!pickup || !dropoff) return [];

  const traffic = getTrafficCondition();

  // Direct straight-line km (Haversine approximation)
  const dx = dropoff.lng - pickup.lng;
  const dy = dropoff.lat - pickup.lat;
  const directKm = Math.sqrt(dx * dx + dy * dy) * 111;

  // Offset: 0.4–0.9 km (tiny — just enough to nudge OSRM onto a parallel road)
  const offsetKm = parseFloat(Math.min(0.9, Math.max(0.4, directKm * 0.045)).toFixed(2));

  // 1. OSRM native alternatives (may return 1-3) + small offset candidates
  //    All fired in parallel for speed.
  const [altRoutes, viaLeft, viaRight, viaLeftLate, viaRightEarly] = await Promise.all([
    fetchOsrmAlternatives(pickup, dropoff),
    fetchOsrmVia(pickup, lateralWaypoint(pickup, dropoff, 0.35, +1, offsetKm), dropoff),
    fetchOsrmVia(pickup, lateralWaypoint(pickup, dropoff, 0.60, -1, offsetKm), dropoff),
    fetchOsrmVia(pickup, lateralWaypoint(pickup, dropoff, 0.65, +1, offsetKm * 0.7), dropoff),
    fetchOsrmVia(pickup, lateralWaypoint(pickup, dropoff, 0.30, -1, offsetKm * 0.7), dropoff),
  ]);

  // Merge all candidates into one pool
  const pool = [
    ...altRoutes,
    viaLeft, viaRight, viaLeftLate, viaRightEarly,
  ].filter(Boolean);

  if (!pool.length) return [];

  // 2. Sort by raw duration (fastest first — OSRM already does this for alts,
  //    but offset routes may be shorter).
  pool.sort((a, b) => a.durationS - b.durationS);

  // 3. Fastest route defines the acceptable-distance cap
  const fastestDist = pool[0].distanceM;
  const maxAllowed = fastestDist * 1.45; // up to 45% longer is OK

  // 4. Pick up to 3 non-similar routes within the cap
  const chosen = [];
  for (const candidate of pool) {
    if (candidate.distanceM > maxAllowed) continue;          // too long — skip
    if (chosen.some((r) => routesTooSimilar(r, candidate))) continue; // duplicate — skip
    chosen.push(candidate);
    if (chosen.length === 3) break;
  }

  // 5. Map to final shape
  const traffic2 = getTrafficCondition(); // re-read in case time ticked
  return chosen.map((r, idx) => {
    const distanceKm = parseFloat((r.distanceM / 1000).toFixed(1));
    const rawMin = Math.round(r.durationS / 60);
    const durationMin = Math.max(1, Math.round(rawMin * traffic2.multiplier));
    const meta = ROUTE_META[idx] ?? { label: `Route ${idx + 1}`, tag: "", color: "#6366f1" };

    return {
      id: idx,
      label: meta.label,
      tag: meta.tag,
      color: meta.color,
      distanceKm,
      distanceStr: `${distanceKm} km`,
      durationMin,
      durationRaw: rawMin,
      coords: r.coords,
      fares: calculateFares(distanceKm, durationMin, systemConfig),
      traffic: traffic2,
    };
  });
}

// ─── Legacy single-route (nav hook compatibility) ────────────────────────────
export async function getRouteInfo(pickup, dropoff) {
  if (!pickup || !dropoff) return null;
  const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=false`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) return null;
    const r = data.routes[0];
    return { distance: `${(r.distance / 1000).toFixed(1)} km`, duration: Math.round(r.duration / 60) };
  } catch (e) {
    console.error("[geocode] getRouteInfo:", e.message);
    return null;
  }
}
