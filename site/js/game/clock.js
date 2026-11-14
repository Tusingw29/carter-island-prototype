// Turns seconds into the "9:00" text shown on the headcount timer.
export function formatClock(totalSeconds) {
  const whole = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(whole / 60);
  const seconds = String(whole % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}
