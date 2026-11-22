// Parts the learner just unlocked, so the story page can greet them with a short "Unlocked!" label.
// Kept in memory and in sessionStorage (survives a reload in the same tab). Each part is shown once.
const KEY = "wb:just-unlocked";
const TTL_MS = 30 * 60 * 1000;
let mem: Record<string, number> = {};

function load(): Record<string, number> {
  try { const raw = sessionStorage.getItem(KEY); if (raw) mem = { ...JSON.parse(raw), ...mem }; } catch { /* storage not available */ }
  const now = Date.now();
  mem = Object.fromEntries(Object.entries(mem).filter(([, t]) => now - t < TTL_MS));
  return mem;
}
function save() { try { sessionStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* storage not available */ } }

export function markJustUnlocked(sectionId: string) { load(); mem[sectionId] = Date.now(); save(); }

// Returns the ids from this list that were just unlocked, and forgets them (shown once).
export function takeJustUnlocked(sectionIds: string[]): string[] {
  const all = load();
  const hit = sectionIds.filter((id) => id in all);
  if (hit.length) { for (const id of hit) delete mem[id]; save(); }
  return hit;
}
