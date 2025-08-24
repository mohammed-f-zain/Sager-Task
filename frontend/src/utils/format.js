export function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function isAllowed(reg) {
  // Rule: registrations that start with letter B (after the dash) can fly
  // Examples: "SG-BA" => "BA" starts with B => allowed
  const parts = (reg || "").split("-");
  const tail = parts.length > 1 ? parts[1] : parts[0] || "";
  return tail.startsWith("B");
}