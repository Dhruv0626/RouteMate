import L from "leaflet";

/**
 * Factory for 3D vehicle icons based on vehicle type
 */
export const makeVehicleIcon = (type, heading = 0, size = 48) => {
  const t = (type || "").toUpperCase();
  let img = "/images/cars/hatchback.png"; // DEFAULT
  
  if (t.includes("MOTO") || t.includes("BIKE")) {
    img = "/images/cars/bike.png";
  } else if (t.includes("AUTO") || t.includes("RICKSHAW")) {
    img = "/images/cars/auto.png";
  } else if (t === "XL" || t.includes("SUV")) {
    img = "/images/cars/suv.png";
  } else if (t === "PRIME" || t.includes("SEDAN")) {
    img = "/images/cars/sedan.png";
  }

  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;
      transform: rotate(${heading}deg); transition: transform 0.8s ease; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));">
      <img src="${img}" style="width:100%;height:100%;object-fit:contain;" />
      </div>`,
    className: "vehicle-icon-3d",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

/**
 * Pulse icon for user's live location
 */
export const makeLiveIcon = () => {
    return L.divIcon({
        html: `<div style="width:18px;height:18px;background:#6366f1;border:3px solid #fff;
      border-radius:50%;animation:pulse-rm 1.5s ease-out infinite;box-shadow: 0 0 15px rgba(99,102,241,0.5);">
      <style>@keyframes pulse-rm{0%{box-shadow:0 0 0 0 rgba(99,102,241,.7);}
      70%{box-shadow:0 0 0 12px rgba(99,102,241,0);}
      100%{box-shadow:0 0 0 0 rgba(99,102,241,0);}}</style></div>`,
        className: "live-pulse-icon", 
        iconSize: [18,18], 
        iconAnchor: [9,9],
    });
};

/**
 * Route label badge for map midpoints
 */
export const makeRouteLabelIcon = (route, isSelected) => {
  return L.divIcon({
    html: `<div style="
      background:${route.color};color:#fff;
      font-size:10px;font-weight:700;font-family:'Inter',sans-serif;
      padding:4px 9px;border-radius:20px;white-space:nowrap;
      box-shadow:0 2px 10px rgba(0,0,0,0.4);
      border:${isSelected ? "2px solid #fff" : "1.5px solid rgba(255,255,255,0.55)"};
      opacity:${isSelected ? 1 : 0.82};
      pointer-events:none;
    ">${route.label} · ${route.durationMin} min</div>`,
    className: "route-label-badge",
    iconAnchor: [0, 0],
  });
};

/**
 * Generic branded pin with a label (Now simplified per user request to match simple pins)
 */
export const makePin = (color, label) => makeSimplePin(color);

/**
 * Simple branded pin without a label
 */
export const makeSimplePin = (color) => L.divIcon({
  html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4))">
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3" fill="white"/>
    </svg>
  </div>`,
  className: "map-pin-simple",
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

export const makeDestPin = (isActive) => makeSimplePin(isActive ? "#ef4444" : "#3b82f6");

export const makeFleetVehicleIcon = (type, status, size = 48) => {
  const t = (type || "").toUpperCase();
  let img = "/images/cars/hatchback.png"; 
  if (t.includes("MOTO") || t.includes("BIKE")) img = "/images/cars/bike.png";
  else if (t.includes("AUTO") || t.includes("RICKSHAW")) img = "/images/cars/auto.png";
  else if (t === "XL" || t.includes("SUV")) img = "/images/cars/suv.png";
  else if (t === "PRIME" || t.includes("SEDAN")) img = "/images/cars/sedan.png";

  const showTag = status === "active" || status === "idle";
  const tagColor = status === "active" ? "#10b981" : "#f59e0b";
  const tagText = status === "active" ? "In-trip" : "Online";

  const tagHtml = showTag 
    ? `<div style="background:${tagColor};color:white;font-size:9px;font-weight:900;padding:2px 8px;border-radius:12px;margin-bottom:-4px;text-transform:uppercase;box-shadow:0 2px 4px rgba(0,0,0,0.3);white-space:nowrap;z-index:2;position:relative;border:1px solid rgba(255,255,255,0.2)">${tagText}</div>`
    : '';

  return L.divIcon({
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        ${tagHtml}
        <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));">
          <img src="${img}" style="width:100%;height:100%;object-fit:contain;" />
        </div>
      </div>`,
    className: "fleet-vehicle-icon",
    iconSize: [80, 80],
    iconAnchor: [40, 50],
  });
};
