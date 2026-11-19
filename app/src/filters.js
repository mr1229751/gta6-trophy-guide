// filters.js — the checklist's filter state (kind chip, grade, search
// text, spoiler shield) and the predicates the renderer applies with it.
// The special kind value 'missable' is not a data kind: it filters to the
// trophies the data flags as missable, whichever kind they are.

export const filterState = {
  kind: 'all',
  grade: 'all',
  query: '',
  spoiler: false,
};

// True when a trophy should appear in the checklist under the current
// filters. Search matches against the name and official description.
export function matchesFilters(trophy) {
  if (filterState.kind === 'missable') {
    if (!trophy.missable) return false;
  } else if (filterState.kind !== 'all' && trophy.kind !== filterState.kind) {
    return false;
  }
  if (filterState.grade !== 'all' && trophy.grade !== filterState.grade) {
    return false;
  }
  if (filterState.query) {
    const haystack = `${trophy.name} ${trophy.description}`.toLowerCase();
    if (!haystack.includes(filterState.query.toLowerCase())) return false;
  }
  return true;
}

// The spoiler shield hides unearned story trophies: their names and
// descriptions are replaced with a placeholder until they are earned.
export function isShielded(trophy, checked) {
  return filterState.spoiler && trophy.kind === 'story' && !checked.has(trophy.id);
}
