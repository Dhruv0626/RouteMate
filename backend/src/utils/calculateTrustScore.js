export const calculateDriverTrustScore = (driverStats) => {
  const {
    averageRating = 0,
    completedRides = 0,
    totalRides = 0,
    cancelledRides = 0,
    totalTagsReceived = 0,
    positiveTagCount = 0
  } = driverStats;

  // 1. Rating Component (Max 45)
  const ratingScore = (averageRating / 5) * 45;

  // 2. Completion Rate Component (Max 20)
  const completionRate = totalRides > 0 ? (completedRides / totalRides) : 0;
  const completionScore = completionRate * 20;

  // 3. Experience Component (Max 15) - Reward for absolute number of rides
  // 1 point per 10 completed rides, capped at 15 points (150+ rides)
  const experienceScore = Math.min((completedRides / 150) * 15, 15);

  // 4. Tag Bonus (Max 20)
  const tagBonus = totalTagsReceived > 0 ? (positiveTagCount / totalTagsReceived) * 20 : 0;

  // 5. Cancellation Penalty (Max -10)
  const cancelRate = totalRides > 0 ? (cancelledRides / totalRides) : 0;
  const cancelPenalty = cancelRate * 10;

  let trustScore = ratingScore + completionScore + experienceScore + tagBonus - cancelPenalty;
  
  // Final bounds and rounding
  trustScore = Math.min(100, Math.max(0, trustScore));
  return Math.round(trustScore * 10) / 10;
};

export const calculatePassengerTrustScore = (passengerStats) => {
  const {
    averageRating = 0,
    totalTrips = 0,
    cancellationRate = 0,
    totalTagsReceived = 0,
    positiveTagCount = 0
  } = passengerStats;

  const ratingScore = (averageRating / 5) * 60; // max 60
  const experienceScore = Math.min((totalTrips / 50) * 20, 20); // max 20
  const tagBonus = totalTagsReceived > 0 ? (positiveTagCount / totalTagsReceived) * 20 : 0; // max 20
  const cancelPenalty = cancellationRate * 20; // max -20

  let trustScore = ratingScore + experienceScore + tagBonus - cancelPenalty;
  trustScore = Math.min(100, Math.max(0, trustScore));
  return Math.round(trustScore * 10) / 10;
};
