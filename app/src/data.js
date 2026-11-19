// data.js — loads the trophy data file that ships inside the app and
// exposes the list together with the PlayStation point values each grade
// is worth, which the progress header uses for its points total.

export const POINTS = { bronze: 15, silver: 30, gold: 90, platinum: 300 };

export const KIND_LABELS = {
  story: 'Story',
  collectibles: 'Collectibles',
  activities: 'Activities',
  online: 'Online',
  completion: 'Completion',
};

let cache = null;

// Fetches data/trophies.json relative to the app root. The file is part of
// the app itself, so this works fully offline wherever the app is served.
export async function loadTrophies() {
  if (cache) return cache;
  const response = await fetch('data/trophies.json');
  if (!response.ok) throw new Error('trophy data failed to load');
  const parsed = await response.json();
  cache = parsed.trophies;
  return cache;
}

// The full points value of a trophy list, earned and unearned alike.
export function totalPoints(trophies) {
  return trophies.reduce((sum, trophy) => sum + POINTS[trophy.grade], 0);
}

// The points value of just the trophies whose ids are in the checked set.
export function earnedPoints(trophies, checked) {
  return trophies.reduce(
    (sum, trophy) => sum + (checked.has(trophy.id) ? POINTS[trophy.grade] : 0),
    0,
  );
}
