// state.js — the progress store for the GTA VI trophy tracker.
//
// Holds three things: the ticks (which of the 55 trophies are earned), the
// filter a view is showing, and the spoiler preference that masks a hidden
// trophy's walkthrough until the reader reveals it. Ticks live in
// localStorage under `gta6-trophy-progress`; the rest of the preferences sit
// under `gta6-trophy-preferences`. Everything here is pure data plus a little
// storage, so the file also loads in Node with no DOM at all.
//
// No import or export statements on purpose: the file is written as an
// ordinary script body that registers one slice of the GTA6 namespace, so it
// parses both as a classic script and as a module (and a browser can fetch it
// with a dynamic import()).
(function () {
  'use strict';

  var NS = (globalThis.GTA6 = globalThis.GTA6 || {});

  var TICK_KEY = 'gta6-trophy-progress';
  var PREF_KEY = 'gta6-trophy-preferences';
  var DATA_VERSION = 1;

  var GRADES = ['platinum', 'gold', 'silver', 'bronze'];
  var KINDS = ['story', 'side', 'activities', 'collectibles', 'misc'];
  var STAGES = [1, 2, 3, 4, 5, 6];

  // localStorage can be absent (Node, a locked-down browser) or throw on
  // access (a browser with storage disabled). Probe once, fall back to memory.
  var STORAGE = (function () {
    try {
      var s = globalThis.localStorage;
      if (!s) return null;
      var probe = '__gta6_probe__';
      s.setItem(probe, '1');
      s.removeItem(probe);
      return s;
    } catch (err) {
      return null;
    }
  })();

  function blankFilters() {
    return { grade: 'all', kind: 'all', stage: 'all', missable: false, hideEarned: false, q: '' };
  }

  function isGrade(value) {
    return GRADES.indexOf(value) !== -1;
  }

  function isKind(value) {
    return KINDS.indexOf(value) !== -1;
  }

  function isStage(value) {
    return STAGES.indexOf(Number(value)) !== -1;
  }

  // Ids come back from storage as whatever JSON held; keep only real ones.
  function toId(value) {
    var n = typeof value === 'string' ? Number(value) : value;
    if (typeof n !== 'number' || !isFinite(n)) return null;
    n = Math.trunc(n);
    return n > 0 ? n : null;
  }

  function uniq(list) {
    var seen = Object.create(null);
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var id = list[i];
      if (seen[id]) continue;
      seen[id] = true;
      out.push(id);
    }
    return out;
  }

  // Accepts the tracker's own export ({ earned: [...] }) and a bare array of
  // ids, so a file from another copy of the guide still imports.
  function parseTicks(raw) {
    if (typeof raw !== 'string' || raw === '') return [];
    var value;
    try {
      value = JSON.parse(raw);
    } catch (err) {
      return [];
    }
    var list = [];
    if (Array.isArray(value)) list = value;
    else if (value && Array.isArray(value.earned)) list = value.earned;
    else if (value && Array.isArray(value.ticks)) list = value.ticks;
    var ids = [];
    for (var i = 0; i < list.length; i++) {
      var id = toId(list[i]);
      if (id !== null) ids.push(id);
    }
    return uniq(ids);
  }

  function readPrefs() {
    var out = { spoilers: false, filters: blankFilters() };
    if (!STORAGE) return out;
    var raw = STORAGE.getItem(PREF_KEY);
    if (!raw) return out;
    var value;
    try {
      value = JSON.parse(raw);
    } catch (err) {
      return out;
    }
    if (!value || typeof value !== 'object') return out;
    out.spoilers = value.spoilers === true;
    var f = value.filters;
    if (f && typeof f === 'object') {
      if (isGrade(f.grade) || f.grade === 'all') out.filters.grade = f.grade;
      if (isKind(f.kind) || f.kind === 'all') out.filters.kind = f.kind;
      if (f.stage === 'all' || isStage(f.stage)) out.filters.stage = String(f.stage);
      out.filters.missable = f.missable === true;
      out.filters.hideEarned = f.hideEarned === true;
      out.filters.q = typeof f.q === 'string' ? f.q.slice(0, 80) : '';
    }
    return out;
  }

  // The searchable text of one trophy, built once and cached.
  function haystackOf(trophy) {
    var bits = [
      trophy.name,
      trophy.description,
      trophy.guide,
      trophy.missableNote,
      trophy.mission,
      trophy.chapter,
      trophy.countLabel,
      trophy.kind,
      trophy.grade,
      trophy.count === null || trophy.count === undefined ? '' : String(trophy.count),
    ];
    return bits.filter(Boolean).join(' ').toLowerCase();
  }

  /**
   * Build the store around a parsed data/trophies.json document.
   * Everything is synchronous; the only I/O is localStorage.
   */
  function createStore(doc) {
    if (!doc || !Array.isArray(doc.trophies)) {
      throw new TypeError('createStore: the trophy document has no trophies array');
    }

    var trophies = doc.trophies.slice().sort(function (a, b) { return a.order - b.order; });
    var byId = new Map();
    var haystacks = new Map();
    trophies.forEach(function (t) {
      byId.set(t.id, t);
      haystacks.set(t.id, haystackOf(t));
    });

    var earned = new Set();
    var revealed = new Set();
    var listeners = [];
    var prefs = readPrefs();
    var filters = prefs.filters;
    var spoilers = prefs.spoilers;

    var saved = STORAGE ? parseTicks(STORAGE.getItem(TICK_KEY) || '') : [];
    saved.forEach(function (id) {
      if (byId.has(id)) earned.add(id);
    });

    function persistTicks() {
      if (!STORAGE) return;
      var payload = {
        v: DATA_VERSION,
        game: doc.game || 'Grand Theft Auto VI',
        list: doc.list || '',
        total: trophies.length,
        earned: Array.from(earned).sort(function (a, b) { return a - b; }),
      };
      try {
        STORAGE.setItem(TICK_KEY, JSON.stringify(payload));
      } catch (err) {
        /* a full quota should not stop the checklist working */
      }
    }

    function persistPrefs() {
      if (!STORAGE) return;
      try {
        STORAGE.setItem(PREF_KEY, JSON.stringify({ spoilers: spoilers, filters: filters }));
      } catch (err) {
        /* ignored, as above */
      }
    }

    function notify() {
      for (var i = 0; i < listeners.length; i++) listeners[i](api);
    }

    function isEarned(id) {
      return earned.has(Number(id));
    }

    function setEarned(id, on) {
      var key = Number(id);
      if (!byId.has(key)) return false;
      var next = on === undefined ? !earned.has(key) : Boolean(on);
      if (next === earned.has(key)) return earned.has(key);
      if (next) earned.add(key);
      else earned.delete(key);
      persistTicks();
      notify();
      return next;
    }

    function haystack(trophy) {
      var cached = haystacks.get(trophy.id);
      if (cached !== undefined) return cached;
      var built = haystackOf(trophy);
      haystacks.set(trophy.id, built);
      return built;
    }

    function matches(trophy, needle) {
      if (needle === '') return true;
      var text = haystack(trophy);
      var terms = needle.split(/\s+/);
      for (var i = 0; i < terms.length; i++) {
        if (text.indexOf(terms[i]) === -1) return false;
      }
      return true;
    }

    /** The filtered list, in trophy order (the order you should chase them). */
    function select() {
      var needle = filters.q.trim().toLowerCase();
      return trophies.filter(function (t) {
        if (filters.grade !== 'all' && t.grade !== filters.grade) return false;
        if (filters.kind !== 'all' && t.kind !== filters.kind) return false;
        if (filters.stage !== 'all' && String(t.stage) !== String(filters.stage)) return false;
        if (filters.missable && !t.missable) return false;
        if (filters.hideEarned && earned.has(t.id)) return false;
        return matches(t, needle);
      });
    }

    function ordered() {
      return trophies.slice();
    }

    function counts() {
      var byGrade = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
      var gradeTotal = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
      var missable = 0;
      var missableEarned = 0;
      var hiddenLeft = 0;
      trophies.forEach(function (t) {
        gradeTotal[t.grade] = (gradeTotal[t.grade] || 0) + 1;
        if (earned.has(t.id)) byGrade[t.grade] = (byGrade[t.grade] || 0) + 1;
        if (t.missable) {
          missable++;
          if (earned.has(t.id)) missableEarned++;
        }
        if (t.hidden && !earned.has(t.id)) hiddenLeft++;
      });
      var done = earned.size;
      return {
        earned: done,
        total: trophies.length,
        left: trophies.length - done,
        pct: trophies.length === 0 ? 0 : Math.round((done / trophies.length) * 100),
        byGrade: byGrade,
        gradeTotal: gradeTotal,
        missable: missable,
        missableEarned: missableEarned,
        missableLeft: missable - missableEarned,
        hiddenLeft: hiddenLeft,
      };
    }

    /** One roadmap stage: its copy from the document plus its tick tally. */
    function stage(stageNumber) {
      var n = Number(stageNumber);
      var meta = (doc.roadmap || []).filter(function (r) { return Number(r.stage) === n; })[0] || null;
      var list = trophies.filter(function (t) { return Number(t.stage) === n; });
      var done = list.filter(function (t) { return earned.has(t.id); }).length;
      var missableList = list.filter(function (t) { return t.missable; });
      return {
        stage: n,
        title: meta ? meta.title : 'Stage ' + n,
        summary: meta ? meta.summary : '',
        trophies: list,
        earned: done,
        total: list.length,
        pct: list.length === 0 ? 0 : Math.round((done / list.length) * 100),
        missableTotal: missableList.length,
        missableEarned: missableList.filter(function (t) { return earned.has(t.id); }).length,
        done: list.length > 0 && done === list.length,
      };
    }

    function stages() {
      return STAGES.map(stage).filter(function (s) { return s.total > 0; });
    }

    /** The trophies that close for good, in the order they lock. */
    function missables() {
      return trophies.filter(function (t) { return t.missable; });
    }

    function filtersActive() {
      return (
        filters.grade !== 'all' ||
        filters.kind !== 'all' ||
        filters.stage !== 'all' ||
        filters.missable ||
        filters.hideEarned ||
        filters.q.trim() !== ''
      );
    }

    function setFilter(patch) {
      if (!patch || typeof patch !== 'object') return filters;
      if (patch.grade !== undefined) filters.grade = isGrade(patch.grade) || patch.grade === 'all' ? patch.grade : 'all';
      if (patch.kind !== undefined) filters.kind = isKind(patch.kind) || patch.kind === 'all' ? patch.kind : 'all';
      if (patch.stage !== undefined) filters.stage = patch.stage === 'all' || isStage(patch.stage) ? String(patch.stage) : 'all';
      if (patch.missable !== undefined) filters.missable = Boolean(patch.missable);
      if (patch.hideEarned !== undefined) filters.hideEarned = Boolean(patch.hideEarned);
      if (patch.q !== undefined) filters.q = String(patch.q).slice(0, 80);
      persistPrefs();
      return filters;
    }

    function resetFilters() {
      filters = blankFilters();
      persistPrefs();
      return filters;
    }

    function setSpoilers(on) {
      spoilers = Boolean(on);
      persistPrefs();
      return spoilers;
    }

    function reveal(id) {
      var key = Number(id);
      if (!byId.has(key)) return false;
      revealed.add(key);
      notify();
      return true;
    }

    function isRevealed(id) {
      return spoilers || revealed.has(Number(id));
    }

    /** True when this trophy's walkthrough has to be masked right now. */
    function isMasked(trophy) {
      return Boolean(trophy && trophy.hidden) && !isRevealed(trophy.id);
    }

    /** The export document: readable, and re-importable by this tracker. */
    function exportData() {
      var c = counts();
      return {
        tracker: 'gta6-trophy-guide',
        game: doc.game || 'Grand Theft Auto VI',
        list: doc.list || '',
        v: DATA_VERSION,
        earned: Array.from(earned).sort(function (a, b) { return a - b; }),
        earnedCount: c.earned,
        total: c.total,
        percent: c.pct,
      };
    }

    function exportText() {
      return JSON.stringify(exportData(), null, 2) + '\n';
    }

    /**
     * Import ticks from a file's text. Returns how many ids were applied,
     * which of them were unknown to this list, and the new total.
     */
    function importText(text) {
      var value;
      try {
        value = JSON.parse(String(text));
      } catch (err) {
        throw new Error('That file is not JSON, so nothing was imported.');
      }
      var list;
      if (Array.isArray(value)) list = value;
      else if (value && Array.isArray(value.earned)) list = value.earned;
      else if (value && Array.isArray(value.ticks)) list = value.ticks;
      else throw new Error('That JSON has no "earned" list of trophy ids.');

      var ids = [];
      var unknown = 0;
      for (var i = 0; i < list.length; i++) {
        var id = toId(list[i]);
        if (id === null) continue;
        if (!byId.has(id)) {
          unknown++;
          continue;
        }
        ids.push(id);
      }
      earned = new Set(uniq(ids));
      persistTicks();
      notify();
      return { applied: earned.size, unknown: unknown, total: trophies.length };
    }

    /** Trigger a JSON download of the current progress (browser only). */
    function download() {
      if (typeof document === 'undefined') return null;
      var text = exportText();
      var blob = new Blob([text], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'gta6-trophy-progress.json';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      return text;
    }

    function importFile(file) {
      if (!file || typeof file.text !== 'function') {
        return Promise.reject(new Error('No file was chosen.'));
      }
      return file.text().then(importText);
    }

    function subscribe(fn) {
      if (typeof fn !== 'function') return function () {};
      listeners.push(fn);
      return function () {
        listeners = listeners.filter(function (other) { return other !== fn; });
      };
    }

    /** How many ticks this browser is holding, and whether storage works at all. */
    function storageInfo() {
      return { ticks: STORAGE ? parseTicks(STORAGE.getItem(TICK_KEY) || '').length : 0, persistent: Boolean(STORAGE) };
    }

    var api = {
      doc: doc,
      trophies: trophies,
      earned: earned,
      filters: filters,
      GRADES: GRADES,
      KINDS: KINDS,
      STAGES: STAGES,
      KEY: TICK_KEY,
      isEarned: isEarned,
      setEarned: setEarned,
      toggle: function (id) { return setEarned(id); },
      select: select,
      ordered: ordered,
      counts: counts,
      stage: stage,
      stages: stages,
      missables: missables,
      matches: matches,
      filtersActive: filtersActive,
      setFilter: setFilter,
      resetFilters: resetFilters,
      getFilters: function () { return filters; },
      getSpoilers: function () { return spoilers; },
      setSpoilers: setSpoilers,
      reveal: reveal,
      isRevealed: isRevealed,
      isMasked: isMasked,
      exportData: exportData,
      exportText: exportText,
      importText: importText,
      importFile: importFile,
      download: download,
      subscribe: subscribe,
      storageInfo: storageInfo,
      persist: persistTicks,
    };

    return api;
  }

  NS.state = {
    createStore: createStore,
    TICK_KEY: TICK_KEY,
    PREF_KEY: PREF_KEY,
    GRADES: GRADES,
    KINDS: KINDS,
    STAGES: STAGES,
    blankFilters: blankFilters,
    parseTicks: parseTicks,
  };
})();
