// ─── routing.js ───────────────────────────────────────────────────────────────
// Resilient routing with multi-provider fallback chain (all free, no API key):
//   1. routing.openstreetmap.de  – OSRM OSM mirror (more stable than project-osrm.org)
//   2. valhalla.openstreetmap.de – Valhalla routing (OSM-hosted, excellent CORS)
//   3. Straight-line fallback     – Always works, no route geometry
//
// All functions return: { path: [[lat,lng],...], distanceKm, durationMin } | null
// ─────────────────────────────────────────────────────────────────────────────

const OSRM_MIRROR  = "https://routing.openstreetmap.de/routed-car/route/v1/driving";
const VALHALLA_URL = "https://valhalla1.openstreetmap.de/route";

// ─── Haversine distance (km) ──────────────────────────────────────────────────
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Provider 1: OSRM mirror ──────────────────────────────────────────────────
async function fetchOSRMMirror(fromLng, fromLat, toLng, toLat, { signal, steps = false, alternatives = false } = {}) {
  try {
    const params = `?overview=full&geometries=geojson${steps ? "&steps=true" : ""}${alternatives ? "&alternatives=true" : ""}`;
    const url = `${OSRM_MIRROR}/${fromLng},${fromLat};${toLng},${toLat}${params}`;
    const res = await fetch(url, { signal, ...(signal ? {} : { signal: AbortSignal.timeout(8000) }) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) return null;
    return data.routes; // raw OSRM route objects
  } catch {
    return null;
  }
}

// ─── Provider 2: Valhalla (OpenStreetMap hosted) ──────────────────────────────
async function fetchValhalla(fromLng, fromLat, toLng, toLat, { signal } = {}) {
  try {
    const body = JSON.stringify({
      locations: [
        { lon: fromLng, lat: fromLat },
        { lon: toLng,   lat: toLat   },
      ],
      costing: "auto",
      directions_options: { units: "km" },
    });
    const res = await fetch(VALHALLA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal,
      ...(signal ? {} : { signal: AbortSignal.timeout(10000) }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const leg = data.trip?.legs?.[0];
    if (!leg) return null;

    // Decode Valhalla encoded polyline (uses Google's format, precision=6)
    const coords = decodePolyline(leg.shape, 6);
    const distKm  = data.trip.summary.length;       // km
    const durSecs = data.trip.summary.time;          // seconds

    return [{ geometry: { coordinates: coords.map(([lat, lng]) => [lng, lat]) }, distance: distKm * 1000, duration: durSecs }];
  } catch {
    return null;
  }
}

// ─── Polyline decoder (Google-compatible, precision 5 or 6) ──────────────────
function decodePolyline(encoded, precision = 5) {
  const factor = Math.pow(10, precision);
  const result = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, res = 0;
    do { b = encoded.charCodeAt(index++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += res & 1 ? ~(res >> 1) : res >> 1;
    shift = 0; res = 0;
    do { b = encoded.charCodeAt(index++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += res & 1 ? ~(res >> 1) : res >> 1;
    result.push([lat / factor, lng / factor]);
  }
  return result; // [[lat, lng], ...]
}

// ─── Parse raw OSRM route → standard shape ───────────────────────────────────
function parseOsrmRaw(route) {
  const path = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]); // → [lat,lng]
  return { path, distanceKm: route.distance / 1000, durationSecs: route.duration };
}

// ─── Primary public API ───────────────────────────────────────────────────────

/**
 * Fetch a single route with full geometry.
 * Returns { path: [[lat,lng]], distanceKm, durationSecs, durationMin } or null.
 */
export async function fetchRoute(fromLat, fromLng, toLat, toLng, { signal, steps = false } = {}) {
  // 1. Try OSRM mirror
  const osrmRoutes = await fetchOSRMMirror(fromLng, fromLat, toLng, toLat, { signal, steps });
  if (osrmRoutes?.length) {
    const r = parseOsrmRaw(osrmRoutes[0]);
    let routeSteps = [];
    if (steps) routeSteps = osrmRoutes[0].legs?.[0]?.steps || [];
    return { ...r, durationMin: Math.round(r.durationSecs / 60), steps: routeSteps };
  }

  // 2. Try Valhalla
  const valRoutes = await fetchValhalla(fromLng, fromLat, toLng, toLat, { signal });
  if (valRoutes?.length) {
    const r = parseOsrmRaw(valRoutes[0]);
    return { ...r, durationMin: Math.round(r.durationSecs / 60), steps: [] };
  }

  // 3. Straight-line fallback (no real geometry, at least gives a distance)
  const distKm = haversineKm(fromLat, fromLng, toLat, toLng);
  const estimatedMin = Math.round((distKm / 30) * 60); // ~30 km/h city speed
  return {
    path: [[fromLat, fromLng], [toLat, toLng]],
    distanceKm: parseFloat(distKm.toFixed(1)),
    durationSecs: estimatedMin * 60,
    durationMin: estimatedMin,
    steps: [],
    isFallback: true,
  };
}

/**
 * Fetch route with only distance + duration (no full geometry — cheaper).
 * Returns { distanceKm, durationMin } or null.
 */
export async function fetchRouteInfo(fromLat, fromLng, toLat, toLng) {
  try {
    const params = `?overview=false`;
    const url = `${OSRM_MIRROR}/${fromLng},${fromLat};${toLng},${toLat}${params}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      if (data.code === "Ok" && data.routes?.[0]) {
        const r = data.routes[0];
        return { distanceKm: parseFloat((r.distance / 1000).toFixed(1)), durationMin: Math.round(r.duration / 60) };
      }
    }
  } catch { /* fall through */ }

  // Fallback: full route (Valhalla also gives us distance+duration)
  const full = await fetchRoute(fromLat, fromLng, toLat, toLng);
  if (full) return { distanceKm: full.distanceKm, durationMin: full.durationMin };
  return null;
}

/**
 * Fetch multiple alternative routes.
 * Returns array of route objects shaped for RideMapPage (same as getMultipleRoutes in geocode.js).
 */
export async function fetchMultipleRoutes(pickup, dropoff, systemConfig = null, trafficMultiplier = 1.0) {
  if (!pickup || !dropoff) return [];

  // 1. Try OSRM mirror with alternatives=true (up to 3 routes in one call)
  const osrmRoutes = await fetchOSRMMirror(
    pickup.lng, pickup.lat, dropoff.lng, dropoff.lat,
    { alternatives: true }
  );

  let pool = [];
  if (osrmRoutes?.length) {
    pool = osrmRoutes.map(parseOsrmRaw);
  } else {
    // 2. Valhalla (single route)
    const valRoutes = await fetchValhalla(pickup.lng, pickup.lat, dropoff.lng, dropoff.lat);
    if (valRoutes?.length) pool = valRoutes.map(parseOsrmRaw);
  }

  if (!pool.length) {
    // 3. Straight-line single entry
    const distKm = haversineKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
    pool = [{ path: [[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]], distanceKm: distKm, durationSecs: (distKm / 30) * 3600 }];
  }

  const ROUTE_META = [
    { label: "Fastest",      tag: "⚡ Recommended",  color: "#6366f1" },
    { label: "Balanced",     tag: "🔀 Alternate Path", color: "#f59e0b" },
    { label: "Scenic Route", tag: "🛣️ Via Bypass",     color: "#10b981" },
  ];

  return pool.slice(0, 3).map((r, idx) => {
    const distanceKm  = parseFloat((r.distanceKm ?? r.distanceM / 1000).toFixed(1));
    const rawMin      = Math.round((r.durationSecs ?? r.durationS) / 60);
    const durationMin = Math.max(1, Math.round(rawMin * trafficMultiplier));
    const meta        = ROUTE_META[idx] ?? { label: `Route ${idx + 1}`, tag: "", color: "#6366f1" };
    return {
      id: idx, label: meta.label, tag: meta.tag, color: meta.color,
      distanceKm, distanceStr: `${distanceKm} km`, durationMin, durationRaw: rawMin,
      coords: r.path ?? r.coords,
    };
  });
}
