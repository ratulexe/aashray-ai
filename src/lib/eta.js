export const NORMAL_EVACUATION_SPEED_KMH = 4;
export const MOBILITY_ASSISTANCE_SPEED_KMH = 2.5;
export const MINIMUM_ETA_MINUTES = 5;
export const RESERVATION_BUFFER_MINUTES = 60;

// Phase-1 prototype estimate: Haversine distance plus assumed walking speeds.
// A future routing integration can replace the ETA source while preserving
// the reservation-expiry model.
export function calculateEvacuationEtaMinutes({
  distanceKm,
  mobilityAssistance,
}) {
  const speedKmh = mobilityAssistance
    ? MOBILITY_ASSISTANCE_SPEED_KMH
    : NORMAL_EVACUATION_SPEED_KMH;

  const calculatedEtaMinutes = Math.ceil((distanceKm / speedKmh) * 60);

  // Avoid unrealistic zero-minute holds for very nearby shelters.
  return Math.max(MINIMUM_ETA_MINUTES, calculatedEtaMinutes);
}

export function calculateReservationExpiry({
  createdAtMs,
  etaMinutes,
  bufferMinutes = RESERVATION_BUFFER_MINUTES,
}) {
  const validityMinutes = etaMinutes + bufferMinutes;

  return {
    bufferMinutes,
    validityMinutes,
    expiresAtMs: createdAtMs + validityMinutes * 60 * 1000,
  };
}
