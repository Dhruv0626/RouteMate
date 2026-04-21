import React, { useState, useEffect, useRef, useCallback } from "react";
import { searchLocation } from "../../utils/geocode";

// ─── Simple debounce hook ─────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Reverse-geocode a lat/lng → human-readable name (Nominatim) ─────────────
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en", "User-Agent": "RouteMate/1.0" } }
    );
    const data = await res.json();
    return data?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function SearchIcon({ size = 16 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"
      strokeLinejoin="round"
      style={{ animation: "spin 0.8s linear infinite" }}>
      <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function PinIcon({ color = "#6366f1", size = 13 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
      viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
      style={{ marginTop: "2px", flexShrink: 0 }}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function GPSIcon({ size = 14 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
      viewBox="0 0 24 24" fill="none" stroke="#22c55e"
      strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <circle cx="12" cy="12" r="8" opacity="0.35" />
    </svg>
  );
}

// ─── LocationSearch Component ─────────────────────────────────────────────────
/**
 * Props:
 *  label              - Label text shown above the input
 *  placeholder        - Placeholder text
 *  onSelect           - Callback: (location: { name, lat, lng }) => void
 *  showCurrentLocation - If true, show "Use My Current Location" as first suggestion on focus
 *  currentLocation    - { lat, lng } — pre-fetched GPS position (optional)
 */
const LocationSearch = ({
  label,
  placeholder = "Search location…",
  onSelect,
  showCurrentLocation = false,
  currentLocation = null,
  value = "",
}) => {
  const [query, setQuery]             = useState(value || "");
  const [results, setResults]         = useState([]);
  const [isLoading, setIsLoading]     = useState(false);
  const [isOpen, setIsOpen]           = useState(false);
  const [selectedName, setSelectedName] = useState(value || "");
  const [isFocused, setIsFocused]     = useState(false);
  const selectingRef = useRef(false);

  // Update internal state when value prop changes
  useEffect(() => {
    setQuery(value || "");
    setSelectedName(value || "");
  }, [value]);
  // GPS state
  const [gpsLoading, setGpsLoading]   = useState(false);
  const [gpsLocation, setGpsLocation] = useState(null); // { lat, lng, name }

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debouncedQuery = useDebounce(query, 200);

  // ─── Pre-resolve GPS name as soon as currentLocation prop arrives ────────
  useEffect(() => {
    if (!showCurrentLocation || !currentLocation) return;
    if (gpsLocation) return; // already resolved
    reverseGeocode(currentLocation.lat, currentLocation.lng).then((name) => {
      setGpsLocation({ lat: currentLocation.lat, lng: currentLocation.lng, name });
    });
  }, [showCurrentLocation, currentLocation, gpsLocation]);

  // ─── Fetch search suggestions ────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 1) {
      setResults([]);
      // Keep dropdown open on focus if showing GPS option
      if (!(showCurrentLocation && isFocused)) setIsOpen(false);
      return;
    }
    if (debouncedQuery === selectedName || selectingRef.current) return;

    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const data = await searchLocation(debouncedQuery);
        // Strict filter: Only show Ahmedabad locations
        const filtered = data.filter(loc => 
          loc.name.toLowerCase().includes("ahmedabad") || 
          loc.name.toLowerCase().includes("gujarat")
        );
        
        // If selection was made while fetching, don't show results
        if (selectingRef.current) {
          setResults([]);
          setIsOpen(false);
          return;
        }

        setResults(filtered);
        setIsOpen(filtered.length > 0);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery, selectedName, showCurrentLocation, isFocused]);

  // ─── Close on outside click ──────────────────────────────────────────────
  useEffect(() => {
    const handleMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  // ─── Handle selection ────────────────────────────────────────────────────
  const handleSelect = useCallback(
    (location) => {
      if (!location) {
        setSelectedName("");
        setQuery("");
        setIsOpen(false);
        setResults([]);
        return;
      }
      
      selectingRef.current = true;
      setSelectedName(location.name);
      setQuery(location.name);
      setIsOpen(false);
      setResults([]);
      setIsFocused(false);
      
      if (inputRef.current) {
        inputRef.current.blur();
      }
      
      onSelect?.(location);
      
      // Keep selecting state for a bit to prevent race conditions with debounce
      setTimeout(() => {
        selectingRef.current = false;
      }, 500);
    },
    [onSelect]
  );

  // ─── Handle "Use My Current Location" click ──────────────────────────────
  const handleUseCurrentLocation = useCallback(async () => {
    // If we already have a resolved GPS location, use it immediately
    if (gpsLocation) {
      handleSelect(gpsLocation);
      return;
    }

    // Otherwise do a live GPS fetch
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    setIsOpen(false);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const name = await reverseGeocode(lat, lng);
        const loc = { lat, lng, name };
        setGpsLocation(loc);
        handleSelect(loc);
        setGpsLoading(false);
      },
      (err) => {
        console.warn("[LocationSearch] GPS error:", err.message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [gpsLocation, handleSelect]);

  // ─── Input focus: open dropdown to show GPS + old results if any ─────────
  const handleFocus = () => {
    setIsFocused(true);
    if (showCurrentLocation || results.length > 0) {
      setIsOpen(true);
    }
  };

  // ─── Shorten long display names ──────────────────────────────────────────
  const shortenName = (name) => {
    if (!name) return "";
    return name.split(", ").slice(0, 3).join(", ");
  };

  // Whether to show the GPS suggestion row
  const showGpsRow = showCurrentLocation && isFocused && !selectedName;
  const dropdownVisible = isOpen && (showGpsRow || results.length > 0);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {/* Label */}
      {label && (
        <label style={{
          display: "block",
          fontSize: "11px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: "6px",
          color: "var(--text-dim)",
          fontFamily: "'Inter', sans-serif",
        }}>
          {label}
        </label>
      )}

      {/* Input Wrapper */}
      <div style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        background: "var(--card-bg)",
        border: `1px solid ${isFocused ? "rgba(99,102,241,0.5)" : "var(--card-border)"}`,
        borderRadius: "12px",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        boxShadow: isFocused ? "0 0 0 3px rgba(99,102,241,0.12)" : "none",
      }}>
        {/* Left icon */}
        <span style={{
          position: "absolute", left: "12px", top: "50%",
          transform: "translateY(-50%)", color: "var(--text-dim)",
          display: "flex", alignItems: "center",
        }}>
          {isLoading || gpsLoading ? <Spinner /> : <SearchIcon size={15} />}
        </span>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedName(""); // clear lock so re-search can trigger
          }}
          onFocus={handleFocus}
          placeholder={gpsLoading ? "Getting your location…" : placeholder}
          autoComplete="off"
          style={{
            width: "100%",
            padding: "11px 12px 11px 36px",
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--text-main)",
            fontFamily: "'Inter', sans-serif",
            borderRadius: "12px",
          }}
        />

        {/* Clear button */}
        {query && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setQuery("");
              setSelectedName("");
              setResults([]);
              setIsOpen(showCurrentLocation);
              onSelect?.(null);
            }}
            style={{
              position: "absolute", right: "10px", top: "50%",
              transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-dim)", fontSize: "16px", lineHeight: 1,
              padding: "2px 4px", borderRadius: "4px",
              opacity: 0.6,
            }}
            title="Clear"
          >
            ×
          </button>
        )}
      </div>

      {/* ── Dropdown ── */}
      {dropdownVisible && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          right: 0,
          background: "var(--bg-main)",
          border: "1px solid var(--card-border)",
          borderRadius: "14px",
          boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
          zIndex: 9999,
          overflow: "hidden",
          maxHeight: "260px",
          overflowY: "auto",
        }}>

          {/* ── "Use My Current Location" row — always first ── */}
          {showGpsRow && (
            <button
              onMouseDown={(e) => { e.preventDefault(); handleUseCurrentLocation(); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                textAlign: "left",
                padding: "11px 14px",
                border: "none",
                borderBottom: results.length > 0 ? "1px solid var(--card-border)" : "none",
                background: "rgba(34,197,94,0.06)",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(34,197,94,0.12)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(34,197,94,0.06)"}
            >
              {gpsLoading ? <Spinner /> : <GPSIcon size={15} />}
              <span>
                <span style={{
                  display: "block", fontSize: "12px", fontWeight: 700,
                  color: "#22c55e",
                }}>
                  📍 Use My Current Location
                </span>
                {gpsLocation ? (
                  <span style={{
                    display: "block", fontSize: "10px", color: "var(--text-dim)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    maxWidth: "260px",
                  }}>
                    {shortenName(gpsLocation.name)}
                  </span>
                ) : (
                  <span style={{ display: "block", fontSize: "10px", color: "var(--text-dim)" }}>
                    Tap to detect your GPS position
                  </span>
                )}
              </span>
            </button>
          )}

          {/* ── Search result rows ── */}
          {results.map((loc, idx) => (
            <button
              key={idx}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(loc); }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 14px",
                border: "none",
                borderBottom: idx < results.length - 1 ? "1px solid var(--card-border)" : "none",
                background: "transparent",
                cursor: "pointer",
                transition: "background 0.15s ease",
                fontFamily: "'Inter', sans-serif",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(99,102,241,0.08)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <PinIcon color="#6366f1" size={13} />
                <span>
                  <span style={{
                    display: "block", fontSize: "12px", fontWeight: 600,
                    color: "var(--text-main)", marginBottom: "2px",
                  }}>
                    {shortenName(loc.name)}
                  </span>
                  <span style={{
                    display: "block", fontSize: "10px", color: "var(--text-dim)",
                    opacity: 0.9, overflow: "hidden", textOverflow: "ellipsis", 
                    whiteSpace: "nowrap",
                  }}>
                    {loc.name}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationSearch;
