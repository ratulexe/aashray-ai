export function generateEvacuationCode() {
  const number = Math.floor(1000 + Math.random() * 9000);
  return `ASH-${number}`;
}

export function calculateReservationCapacity({
  shelter,
  peopleCount,
}) {
  const reservedBefore = shelter.reserved;
  const availableBefore = shelter.capacity - shelter.occupied - shelter.reserved;
  const reservedAfter = reservedBefore + peopleCount;
  const availableAfter = shelter.capacity - shelter.occupied - reservedAfter;

  return {
    canReserve: availableBefore >= peopleCount,
    reservedBefore,
    reservedAfter,
    availableBefore,
    availableAfter,
  };
}
