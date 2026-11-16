export function createShelterReservationSms({
  shelterName,
  peopleCount,
  evacuationCode,
}) {
  return `AASHRAY AI ALERT

${peopleCount} spaces are reserved at ${shelterName}.

Evacuation Code: ${evacuationCode}

Show this code when you arrive at the shelter. - Team Aashray AI`;
}
