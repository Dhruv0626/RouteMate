/**
 * RouteMAte Smart Ride Price Calculation Engine
 * Calculates accurate, fair, and transparent prices based on demand and vehicle rates.
 */

export const calculateFareDetails = (input) => {
  const {
    category,
    is_ev = false,
    base_fare,
    per_km_rate,
    per_min_rate,
    night_charge,
    min_fare,
    surge_cap,
    distance_km,
    time_min,
    is_night,
    total_requests,
    available_drivers,
  } = input;

  // --- Step 0: Validation ---
  const required = [
    "category", "base_fare", "per_km_rate", "per_min_rate", 
    "night_charge", "min_fare", "surge_cap", "distance_km", 
    "time_min", "total_requests", "available_drivers"
  ];
  const missing = required.filter(key => input[key] === undefined || input[key] === null);
  
  if (missing.length > 0) {
    return {
      error: "Invalid input",
      message: `Missing required parameters: ${missing.join(", ")}`
    };
  }

  // --- Step 1: Calculate Base Subtotal ---
  const distance_charge = distance_km * per_km_rate;
  const time_charge = time_min * per_min_rate;
  const subtotal_before_night = base_fare + distance_charge + time_charge;

  // --- Step 2: Apply Night Charge (Flat) ---
  const night_charge_applied = is_night ? night_charge : 0;
  const subtotal_after_night = subtotal_before_night + night_charge_applied;

  // --- Step 3: Calculate Demand Ratio ---
  // Avoid division by zero
  const safe_available_drivers = Math.max(available_drivers, 1);
  const demand_ratio = total_requests / safe_available_drivers;

  // --- Step 4: Determine Surge Multiplier ---
  let surge_multiplier = 1.0;
  let surge_label = "No Surge";
  let cap_applied = false;

  if (demand_ratio <= 1.2) {
    surge_multiplier = 1.0;
    surge_label = "No Surge";
  } else if (demand_ratio <= 1.5) {
    surge_multiplier = 1.2;
    surge_label = "Low Surge";
  } else if (demand_ratio <= 2.0) {
    surge_multiplier = 1.4;
    surge_label = "Medium Surge";
  } else if (demand_ratio <= 2.5) {
    surge_multiplier = 1.6;
    surge_label = "High Surge";
  } else {
    surge_multiplier = surge_cap;
    surge_label = is_ev ? "EV Max Surge — Cap Applied" : "Max Surge — Cap Applied";
    cap_applied = true;
  }

  // --- CRITICAL RULE: Hard Surge Cap ---
  if (surge_multiplier > surge_cap) {
    surge_multiplier = surge_cap;
    cap_applied = true;
    surge_label = is_ev ? "EV Max Surge — Cap Applied" : "Max Surge — Cap Applied";
  }

  // --- Step 5: Final Price and Min Fare Check ---
  let final_price = subtotal_after_night * surge_multiplier;
  let min_fare_applied = false;

  if (final_price < min_fare) {
    final_price = min_fare;
    min_fare_applied = true;
  }

  // Round to nearest whole rupee
  final_price = Math.round(final_price);

  // --- Step 6: CO2 Savings (EV Only) ---
  const co2_saved_kg = is_ev ? (distance_km * 0.12).toFixed(2) : 0;

  // --- Final Output ---
  return {
    category,
    is_ev,
    distance_km: Number(distance_km.toFixed(2)),
    time_min: Math.ceil(time_min),
    base_fare,
    distance_charge: Number(distance_charge.toFixed(2)),
    time_charge: Number(time_charge.toFixed(2)),
    subtotal_before_night: Number(subtotal_before_night.toFixed(2)),
    night_charge_applied,
    subtotal_after_night: Number(subtotal_after_night.toFixed(2)),
    total_requests,
    available_drivers,
    demand_ratio: Number(demand_ratio.toFixed(2)),
    surge_multiplier: Number(surge_multiplier.toFixed(2)),
    surge_label,
    surge_cap,
    cap_applied,
    final_price,
    min_fare,
    min_fare_applied,
    co2_saved_kg: Number(co2_saved_kg),
    currency: "INR"
  };
};
