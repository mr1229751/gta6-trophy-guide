// tracker.js — the player's progress: which trophies are checked off.
// Progress lives in the browser's local storage so it survives reloads,
// and it can be exported to a small JSON file and imported back on any
// machine, which is also how a finished run can be shared or backed up.

const STORAGE_KEY = 'leonida-legend-progress-v1';

// Reads the saved set of checked trophy ids. Any storage problem — a
// private window, a corrupted value — degrades to an empty set rather
// than breaking the guide.
export function loadChecked() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    const ids = Array.isArray(parsed) ? parsed : parsed.checked;
    if (!Array.isArray(ids)) return new Set();
    return new Set(ids.filter((n) => Number.isInteger(n)));
  } catch {
    return new Set();
  }
}

// Persists the checked set. Failing to save is not fatal: the in-memory
// set still drives the page for this session.
export function saveChecked(checked) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...checked]));
  } catch {
    // storage unavailable; progress simply will not persist
  }
}

// Downloads the checked ids as a JSON file the import side understands.
export function exportChecked(checked) {
  const payload = JSON.stringify(
    { app: 'leonida-legend', version: 1, checked: [...checked].sort((a, b) => a - b) },
    null,
    2,
  );
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'gta6-trophy-progress.json';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Reads a file produced by exportChecked (or any JSON holding a bare
// array of ids) and resolves to the set of trophy ids it names.
export function importChecked(file) {
  return file.text().then((text) => {
    const parsed = JSON.parse(text);
    const ids = Array.isArray(parsed) ? parsed : parsed.checked;
    if (!Array.isArray(ids)) throw new Error('that file holds no checked list');
    return new Set(ids.filter((n) => Number.isInteger(n)));
  });
}
