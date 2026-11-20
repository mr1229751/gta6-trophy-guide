// app.js — bootstrap for the GTA VI trophy guide.
//
// Fetches data/trophies.json, builds the store, wires the tab bar, the filter
// bar and every click, and re-renders on change. The URL hash mirrors the
// active view and the filter, so a reload (or a bookmark) lands on the same
// screen.
//
// Written as a plain script body that pulls its three siblings in with a
// dynamic import() and registers one slice of the GTA6 namespace, so it
// parses both as a classic script and as a module.
(function () {
  'use strict';

  var NS = (globalThis.GTA6 = globalThis.GTA6 || {});

  var VIEWS = ['checklist', 'roadmap', 'missables'];

  var el = {
    rail: null,
    view: null,
    tabs: null,
    progress: null,
    toast: null,
  };

  var ui = {
    view: 'checklist',
    expanded: new Set(),
    lastSaved: '',
    loading: true,
  };

  var store = null;
  var toastTimer = 0;

  // ---------------------------------------------------------------- helpers

  function $(id) {
    return document.getElementById(id);
  }

  function toast(message) {
    if (!el.toast) return;
    el.toast.textContent = message;
    el.toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.remove('is-on'); }, 2400);
  }

  function stamp() {
    var d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // ---------------------------------------------------------------- hash

  /** Read the hash into { view, filters } — "#/checklist?grade=silver&q=..." */
  function readHash() {
    var raw = (location.hash || '').replace(/^#/, '');
    if (raw === '' || raw === '/') return { view: 'checklist', filters: null };
    if (raw.indexOf('?') === -1 && raw.indexOf('/') === -1) {
      return { view: VIEWS.indexOf(raw) !== -1 ? raw : 'checklist', filters: null };
    }
    var path = raw;
    var query = '';
    var q = raw.indexOf('?');
    if (q !== -1) {
      path = raw.slice(0, q);
      query = raw.slice(q + 1);
    }
    var name = path.replace(/^\/+/, '');
    var view = VIEWS.indexOf(name) !== -1 ? name : 'checklist';
    var filters = null;
    if (query) {
      filters = {};
      var params = new URLSearchParams(query);
      if (params.has('grade')) filters.grade = params.get('grade');
      if (params.has('kind')) filters.kind = params.get('kind');
      if (params.has('stage')) filters.stage = params.get('stage');
      if (params.has('missable')) filters.missable = params.get('missable') === '1';
      if (params.has('hide')) filters.hideEarned = params.get('hide') === '1';
      if (params.has('q')) filters.q = params.get('q');
    }
    return { view: view, filters: filters };
  }

  /** Write the current view and the filters worth keeping into the hash. */
  function writeHash(push) {
    var f = store.getFilters();
    var params = new URLSearchParams();
    if (ui.view === 'checklist') {
      if (f.grade !== 'all') params.set('grade', f.grade);
      if (f.kind !== 'all') params.set('kind', f.kind);
      if (f.stage !== 'all') params.set('stage', f.stage);
      if (f.missable) params.set('missable', '1');
      if (f.hideEarned) params.set('hide', '1');
      if (f.q.trim() !== '') params.set('q', f.q.trim());
    }
    var query = params.toString();
    var next = '#/' + ui.view + (query ? '?' + query : '');
    if (location.hash === next) return;
    if (push) history.pushState(null, '', next);
    else history.replaceState(null, '', next);
  }

  // ---------------------------------------------------------------- render

  function renderRail() {
    el.rail.innerHTML = NS.views.rail(store, ui);
    el.progress.innerHTML = NS.render.progressRing(store.counts().earned, store.counts().total);
  }

  function renderTabs() {
    var buttons = el.tabs.querySelectorAll('[data-view]');
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      if (b.dataset.view === ui.view) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    }
  }

  function renderView() {
    var html;
    if (ui.view === 'roadmap') html = NS.views.roadmap(store);
    else if (ui.view === 'missables') html = NS.views.missables(store);
    else html = NS.views.checklist(store, ui);
    el.view.innerHTML = html;
    document.title =
      (ui.view === 'roadmap' ? 'Roadmap' : ui.view === 'missables' ? 'Missables' : 'Checklist') +
      ' · GTA VI trophy guide';
  }

  function renderAll() {
    if (!store) return;
    renderRail();
    renderTabs();
    renderView();
  }

  /** Re-render only what a tick changes, so the open guide stays put. */
  function renderProgressOnly() {
    renderRail();
    renderTabs();
    if (ui.view === 'checklist') {
      renderView();
    } else {
      renderView();
    }
  }

  function setView(name, push) {
    if (VIEWS.indexOf(name) === -1) return;
    ui.view = name;
    renderAll();
    writeHash(Boolean(push));
    el.view.scrollIntoView({ block: 'start', behavior: 'auto' });
    el.view.focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------- actions

  function toggleGuide(id) {
    if (ui.expanded.has(id)) ui.expanded.delete(id);
    else ui.expanded.add(id);
    renderView();
  }

  function exportProgress() {
    store.download();
    toast('Progress JSON downloaded');
  }

  function importProgress(file) {
    if (!file) return;
    store
      .importFile(file)
      .then(function (result) {
        ui.lastSaved = stamp();
        renderAll();
        var extra = result.unknown ? ' (' + result.unknown + ' unknown ids skipped)' : '';
        toast('Imported ' + result.applied + ' of ' + result.total + ' ticks' + extra);
      })
      .catch(function (err) {
        toast(err && err.message ? err.message : 'That file could not be read');
      });
  }

  function applyFilter(patch) {
    store.setFilter(patch);
    renderAll();
    writeHash(false);
  }

  /**
   * Copy the progress summary to the clipboard. navigator.clipboard needs a
   * secure context, so a local file:// or plain http page falls back to a
   * hidden textarea and the old selection command.
   */
  function copySummary() {
    var text = NS.views.shareSummary(store, ui.view);

    function done(ok) {
      toast(ok ? 'Progress summary copied' : 'Copy failed: select the summary below');
      if (!ok) showSummaryFallback(text);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { done(true); },
        function () { done(legacyCopy(text)); }
      );
      return;
    }
    done(legacyCopy(text));
  }

  function legacyCopy(text) {
    try {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '-1000px';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      var ok = document.execCommand && document.execCommand('copy');
      area.remove();
      return Boolean(ok);
    } catch (err) {
      return false;
    }
  }

  /** When the clipboard is blocked, print the summary so it can be selected. */
  function showSummaryFallback(text) {
    var box = $('summary-fallback');
    if (!box) return;
    box.textContent = text;
    box.hidden = false;
    box.focus();
    box.select();
  }

  /** Put the cursor in the search box, from any view. */
  function focusSearch() {
    if (ui.view !== 'checklist') setView('checklist', true);
    var box = $('f-q');
    if (!box) return;
    box.focus();
    box.select();
  }

  // ---------------------------------------------------------------- events

  function onClick(event) {
    var tab = event.target.closest('.tab[data-view]');
    if (tab) {
      event.preventDefault();
      setView(tab.dataset.view, true);
      return;
    }

    var target = event.target.closest('[data-act]');
    if (!target) return;
    var act = target.dataset.act;
    var id = target.dataset.id ? Number(target.dataset.id) : null;

    if (act === 'export') {
      exportProgress();
      return;
    }
    if (act === 'copy-summary') {
      event.preventDefault();
      copySummary();
      return;
    }
    if (act === 'toggle-guide') {
      event.preventDefault();
      toggleGuide(id);
      return;
    }
    if (act === 'reveal') {
      event.preventDefault();
      store.reveal(id);
      if (!ui.expanded.has(id)) ui.expanded.add(id);
      renderView();
      return;
    }
    if (act === 'tick-on') {
      event.preventDefault();
      store.setEarned(id, true);
      return;
    }
    if (act === 'reset-filters') {
      store.resetFilters();
      renderAll();
      writeHash(false);
      toast('Filters cleared');
      return;
    }
    if (act === 'expand-all') {
      store.select().forEach(function (t) { ui.expanded.add(t.id); });
      renderView();
      return;
    }
    if (act === 'collapse-all') {
      ui.expanded.clear();
      renderView();
      return;
    }
    if (act === 'stage-filter') {
      var stage = target.dataset.stage;
      store.setFilter({ stage: stage });
      setView('checklist', true);
      return;
    }
    if (act === 'spoilers-on') {
      store.setSpoilers(true);
      renderAll();
      toast('Hidden guides revealed');
      return;
    }
  }

  function onChange(event) {
    var input = event.target;
    var act = input.dataset ? input.dataset.act : null;
    if (!act) return;

    if (act === 'tick') {
      var id = Number(input.dataset.id);
      store.setEarned(id, input.checked);
      ui.lastSaved = stamp();
      return;
    }
    if (act === 'export') return;
    if (act === 'filter-grade') return applyFilter({ grade: input.value });
    if (act === 'filter-kind') return applyFilter({ kind: input.value });
    if (act === 'filter-stage') return applyFilter({ stage: input.value });
    if (act === 'filter-missable') return applyFilter({ missable: input.checked });
    if (act === 'filter-hide-earned') return applyFilter({ hideEarned: input.checked });
    if (act === 'spoilers') {
      store.setSpoilers(input.checked);
      renderAll();
      toast(input.checked ? 'Hidden guides revealed' : 'Hidden guides masked again');
      return;
    }
    if (act === 'import') {
      importProgress(input.files && input.files[0]);
      input.value = '';
      return;
    }
  }

  var searchTimer = 0;

  function onInput(event) {
    var input = event.target;
    if (!input.dataset || input.dataset.act !== 'filter-q') return;
    var value = input.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      store.setFilter({ q: value });
      renderAll();
      writeHash(false);
      var box = $('f-q');
      if (box) {
        box.focus();
        box.setSelectionRange(box.value.length, box.value.length);
      }
    }, 120);
  }

  function onKeydown(event) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;

    var key = event.key;
    var typing = isTyping(event.target);

    // "/" jumps to the search box from anywhere that is not already an input.
    if (key === '/' && !typing) {
      event.preventDefault();
      focusSearch();
      return;
    }

    // 1, 2 and 3 switch views, but not while a text field has focus: the
    // digits may be part of what the reader is typing.
    if (!typing && (key === '1' || key === '2' || key === '3')) {
      var name = VIEWS[Number(key) - 1];
      if (name) {
        event.preventDefault();
        setView(name, true);
      }
      return;
    }

    if (key === 'Escape' && event.target === $('f-q')) {
      var box = $('f-q');
      if (box && box.value !== '') {
        event.preventDefault();
        box.value = '';
        store.setFilter({ q: '' });
        renderAll();
        writeHash(false);
        box.focus();
      }
    }
  }

  /** True when the event came from a control that expects typed characters. */
  function isTyping(node) {
    if (!node || !node.tagName) return false;
    var tag = node.tagName.toLowerCase();
    if (tag === 'input') {
      var type = (node.getAttribute('type') || 'text').toLowerCase();
      return type === 'text' || type === 'search' || type === 'email' || type === 'url' || type === 'password' || type === 'number' || type === 'tel';
    }
    return tag === 'textarea' || tag === 'select' || node.isContentEditable === true;
  }

  // ---------------------------------------------------------------- boot

  function boot(doc) {
    el.rail = $('rail');
    el.view = $('view');
    el.tabs = document.querySelector('.tabs');
    el.progress = $('masthead-progress');
    el.toast = $('toast');

    store = NS.state.createStore(doc);

    var fromHash = readHash();
    ui.view = fromHash.view;
    if (fromHash.filters) store.setFilter(fromHash.filters);

    store.subscribe(function () {
      if (ui.lastSaved === '') ui.lastSaved = stamp();
      renderProgressOnly();
    });

    store.subscribe(function () { writeHash(false); });

    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);
    document.addEventListener('keydown', onKeydown);
    window.addEventListener('hashchange', function () {
      var next = readHash();
      var filtersChanged = false;
      if (next.filters) {
        var before = JSON.stringify(store.getFilters());
        store.setFilter(next.filters);
        filtersChanged = before !== JSON.stringify(store.getFilters());
      }
      if (next.view !== ui.view || filtersChanged) {
        ui.view = next.view;
        renderAll();
      }
    });

    // Make in-view anchors work for the print view and for deep links.
    window.addEventListener('beforeprint', function () {
      el.view.querySelectorAll('.row__guide[hidden]').forEach(function (node) {
        node.hidden = false;
      });
    });

    ui.loading = false;
    renderAll();
    writeHash(false);
  }

  // Dynamic imports rather than static ones, so this file is a valid classic
  // script too. They resolve relative to this module's URL.
  function load() {
    return Promise.all([import('./state.js'), import('./render.js'), import('./views.js')])
      .then(function () {
        return fetch('data/trophies.json', { cache: 'no-cache' });
      })
      .then(function (response) {
        if (!response.ok) throw new Error('data/trophies.json answered ' + response.status);
        return response.json();
      })
      .then(boot)
      .catch(function (err) {
        var view = $('view');
        if (view) {
          var why = err && err.message ? err.message : String(err);
          var safe = NS.render ? NS.render.escapeHtml(why) : '';
          view.innerHTML =
            '<div class="empty"><h3>The trophy list did not load</h3>' +
            '<p>' + (safe || 'Open this guide through a local web server rather than the file system.') + '</p>' +
            '<p>From the repository, run <code>node serve.ts</code> then open http://localhost:8080.</p></div>';
        }
      });
  }

  if (typeof document !== 'undefined') load();
})();
