// views.js — the three screens, as HTML strings.
//
// checklist(store, ui)  the filter bar plus every trophy, grouped by stage
// roadmap(store)        the six stages in order, with per-stage progress
// missables(store)      only the trophies that close for good, in lock order
// rail(store, ui)       the progress ring and save tools beside the list
//
// Nothing here writes to the DOM; app.js decides where the strings land.
// Written as a plain script body that registers one slice of the GTA6
// namespace, so it parses both as a classic script and as a module.
(function () {
  'use strict';

  var NS = (globalThis.GTA6 = globalThis.GTA6 || {});
  var R = NS.render;

  function esc(value) {
    return R.escapeHtml(value);
  }

  function plural(n, one, many) {
    return n === 1 ? one : many === undefined ? one + 's' : many;
  }

  // ---------------------------------------------------------------- rail

  /** The progress panel. The ring lives in the header; this is the breakdown. */
  function progressPanel(store) {
    var c = store.counts();
    var bars = store.GRADES.map(function (grade) {
      return R.gradeBar(grade, c.byGrade[grade] || 0, c.gradeTotal[grade] || 0);
    }).join('');

    return (
      '<section class="panel" aria-labelledby="progress-title">' +
      '<h2 class="panel__title" id="progress-title">Progress</h2>' +
      '<p class="ring-facts__count"><b>' + c.earned + '</b> of ' + c.total + ' earned</p>' +
      '<p class="ring-facts__note">' +
      (c.left === 0
        ? 'Every trophy banked. Platinum closed.'
        : c.left + ' ' + plural(c.left, 'trophy') + ' to go · ' + c.pct + '% of the list') +
      '</p>' +
      '<div class="gradebars">' + bars + '</div>' +
      '<p class="ring-facts__meta">' +
      '<span>' + c.missableLeft + ' missable left</span>' +
      '<span>' + c.hiddenLeft + ' hidden left</span>' +
      '</p>' +
      '</section>'
    );
  }

  /** The save panel: export, import, spoilers, and the share button. */
  function toolsPanel(store, ui) {
    var spoilers = store.getSpoilers();
    var persistent = store.storageInfo().persistent;
    return (
      '<section class="panel" aria-labelledby="tools-title">' +
      '<h2 class="panel__title" id="tools-title">Save &amp; share</h2>' +
      '<div class="btn-row">' +
      '<button class="btn btn--primary" type="button" data-act="export">Download JSON</button>' +
      '<button class="btn" type="button" data-act="copy-summary">Copy summary</button>' +
      '</div>' +
      '<div class="btn-row" style="margin-top:6px">' +
      '<label class="btn btn--ghost file-btn">Import JSON' +
      '<input type="file" accept="application/json,.json" data-act="import" aria-label="Import trophy progress from a JSON file">' +
      '</label>' +
      '</div>' +
      '<label class="toggle" style="margin-top:9px">' +
      '<input type="checkbox" data-act="spoilers"' + (spoilers ? ' checked' : '') + '>' +
      '<span>Show hidden trophy guides</span>' +
      '</label>' +
      '<p class="ring-facts__meta" style="margin-top:7px">' +
      (persistent
        ? '<span>Ticks are kept in this browser</span>'
        : '<span>Storage is blocked, so ticks last for this tab only</span>') +
      '</p>' +
      (ui && ui.lastSaved ? '<p class="ring-facts__note">Saved ' + esc(ui.lastSaved) + '</p>' : '') +
      '</section>'
    );
  }

  function rail(store, ui) {
    return progressPanel(store) + toolsPanel(store, ui);
  }

  // ---------------------------------------------------------------- filter bar

  function option(value, label, current) {
    return '<option value="' + esc(value) + '"' + (String(current) === String(value) ? ' selected' : '') + '>' + esc(label) + '</option>';
  }

  function filterBar(store) {
    var f = store.getFilters();
    var stages = store.stages();

    var gradeOpts = option('all', 'Every grade', f.grade) +
      store.GRADES.map(function (g) { return option(g, R.gradeLabel(g), f.grade); }).join('');

    var kindOpts = option('all', 'Every type', f.kind) +
      store.KINDS.map(function (k) { return option(k, R.kindLabel(k), f.kind); }).join('');

    var stageOpts = option('all', 'Every stage', f.stage) +
      stages.map(function (s) { return option(s.stage, 'Stage ' + s.stage + ': ' + s.title, f.stage); }).join('');

    return (
      '<form class="filters" id="filters" role="search" aria-label="Filter the trophy list" onsubmit="return false">' +
      '<div class="field">' +
      '<label class="field__label" for="f-q">Search</label>' +
      '<input class="input" id="f-q" name="q" type="search" autocomplete="off" spellcheck="false" ' +
      'placeholder="Name, mission, guide text" value="' + esc(f.q) + '" data-act="filter-q">' +
      '</div>' +
      '<div class="field">' +
      '<label class="field__label" for="f-grade">Grade</label>' +
      '<select class="select" id="f-grade" name="grade" data-act="filter-grade">' + gradeOpts + '</select>' +
      '</div>' +
      '<div class="field">' +
      '<label class="field__label" for="f-kind">Type</label>' +
      '<select class="select" id="f-kind" name="kind" data-act="filter-kind">' + kindOpts + '</select>' +
      '</div>' +
      '<div class="field">' +
      '<label class="field__label" for="f-stage">Stage</label>' +
      '<select class="select" id="f-stage" name="stage" data-act="filter-stage">' + stageOpts + '</select>' +
      '</div>' +
      '<div class="field field--toggles">' +
      '<span class="field__label" aria-hidden="true">Only show</span>' +
      '<div class="toggles">' +
      '<label class="toggle"><input type="checkbox" data-act="filter-missable"' + (f.missable ? ' checked' : '') + '><span>Missable</span></label>' +
      '<label class="toggle"><input type="checkbox" data-act="filter-hide-earned"' + (f.hideEarned ? ' checked' : '') + '><span>Unearned</span></label>' +
      '</div>' +
      '</div>' +
      '</form>'
    );
  }

  // ---------------------------------------------------------------- checklist

  function viewHead(title, blurb, actions) {
    return (
      '<div class="view-head">' +
      '<div><h2>' + esc(title) + '</h2><p>' + esc(blurb) + '</p></div>' +
      (actions ? '<div class="view-head__actions">' + actions + '</div>' : '') +
      '</div>'
    );
  }

  function checklist(store, ui) {
    var visible = store.select();
    var all = store.ordered();
    var f = store.getFilters();
    var expanded = (ui && ui.expanded) || new Set();

    var byStage = new Map();
    visible.forEach(function (t) {
      if (!byStage.has(t.stage)) byStage.set(t.stage, []);
      byStage.get(t.stage).push(t);
    });

    var body = '';
    store.stages().forEach(function (s) {
      var list = byStage.get(s.stage);
      if (!list || list.length === 0) return;
      var earnedInList = list.filter(function (t) { return store.isEarned(t.id); }).length;
      body +=
        '<section class="stage" aria-labelledby="stage-' + s.stage + '">' +
        '<div class="stage__head">' +
        '<span class="stage__num">STAGE ' + s.stage + '</span>' +
        '<h3 class="stage__title" id="stage-' + s.stage + '">' + esc(s.title) + '</h3>' +
        '<span class="stage__count">' + earnedInList + '/' + list.length + ' earned</span>' +
        '</div>' +
        '<div class="rows">' +
        list.map(function (t) {
          return R.trophyRow(t, {
            earned: store.isEarned(t.id),
            masked: store.isMasked(t),
            expanded: expanded.has(t.id),
          });
        }).join('') +
        '</div>' +
        '</section>';
    });

    if (visible.length === 0) {
      body = R.emptyState('No trophies match those filters', 'Clear the search box or set the grade, type and stage back to "every" to see the full list again.');
    }

    var summary =
      '<span><strong>' + visible.length + '</strong> of ' + all.length + ' shown' +
      (store.counts().earned ? ' · ' + store.counts().earned + ' banked' : '') + '</span>' +
      (store.filtersActive()
        ? '<button class="btn btn--sm btn--ghost" type="button" data-act="reset-filters">Clear filters</button>'
        : '<span>Ticks are saved as you go</span>');

    return (
      viewHead(
        'Trophy checklist',
        'Every trophy in the order it unlocks, grouped by stage. Open a row for its walkthrough and sources.',
        '<button class="btn btn--sm" type="button" data-act="expand-all">Expand all guides</button>' +
        '<button class="btn btn--sm btn--ghost" type="button" data-act="collapse-all">Collapse all</button>' +
        '<button class="btn btn--sm btn--ghost" type="button" data-act="copy-summary">Copy summary</button>'
      ) +
      (f ? filterBar(store) : '') +
      '<div class="filter-foot">' + summary + '</div>' +
      body
    );
  }

  // ---------------------------------------------------------------- roadmap

  function roadmap(store) {
    var stages = store.stages();
    var c = store.counts();
    var active = stages.filter(function (s) { return !s.done; })[0] || null;

    var cards = stages.map(function (s) {
      var trophyView = s.trophies.map(function (t) {
        return { id: t.id, missable: t.missable, earned: store.isEarned(t.id) };
      });
      return R.roadmapCard(s, trophyView);
    }).join('');

    var head = viewHead(
      'The road to platinum',
      'Six stages, in order. Play them this way and nothing becomes unreachable.',
      '<button class="btn btn--sm" type="button" data-act="copy-summary">Copy progress summary</button>'
    );

    var banner =
      '<div class="locksummary">' +
      '<div class="stat"><p class="stat__num">' + c.earned + ' / ' + c.total + '</p><p class="stat__label">Trophies earned</p></div>' +
      '<div class="stat"><p class="stat__num stat__num--warn">' + c.missableLeft + '</p><p class="stat__label">Missables still open</p></div>' +
      '<div class="stat"><p class="stat__num">' + (active ? 'Stage ' + active.stage : 'Done') + '</p><p class="stat__label">' +
      (active ? esc(active.title.replace(/^Chapter[s]? [0-9 and]+: /, '')) : 'Everything cleared') + '</p></div>' +
      '<div class="stat"><p class="stat__num stat__num--ok">' + c.pct + '%</p><p class="stat__label">Completion</p></div>' +
      '</div>';

    return head + banner + '<div class="roadmap">' + cards + '</div>';
  }

  // ---------------------------------------------------------------- missables

  function missables(store) {
    var list = store.missables();
    var open = list.filter(function (t) { return !store.isEarned(t.id); });
    var banked = list.length - open.length;

    var items = list.map(function (t, i) {
      return R.missableItem(t, { index: i + 1, earned: store.isEarned(t.id) });
    }).join('');

    var head = viewHead(
      'Missable trophies',
      'These close for good once the story moves past them, in the order they lock. Skip one and 100% is gone.',
      store.getSpoilers() ? '' : '<button class="btn btn--sm" type="button" data-act="spoilers-on">Reveal hidden guides</button>'
    );

    var summary =
      '<div class="locksummary">' +
      '<div class="stat"><p class="stat__num ' + (open.length ? 'stat__num--warn' : 'stat__num--ok') + '">' + open.length + '</p><p class="stat__label">Still reachable</p></div>' +
      '<div class="stat"><p class="stat__num stat__num--ok">' + banked + '</p><p class="stat__label">Already banked</p></div>' +
      '<div class="stat"><p class="stat__num">' + list.length + '</p><p class="stat__label">In the whole list</p></div>' +
      '<div class="stat"><p class="stat__num">' + (open[0] ? esc(open[0].chapter || 'Free roam') : '—') + '</p><p class="stat__label">Next one locks in</p></div>' +
      '</div>';

    var foot =
      open.length === 0
        ? '<p class="empty"><strong>Nothing left to lose.</strong> Every missable on the list is ticked, so the remaining trophies can be cleaned up in any order.</p>'
        : '';

    return head + summary + '<div class="chain">' + items + '</div>' + foot;
  }

  // ---------------------------------------------------------------- share text

  /**
   * A plain-text progress summary to paste into a chat or a notes app. It
   * names the open missables and the next few trophies, so it reads without
   * the app in front of you. Spoiler-free: hidden trophy names are only
   * listed once they are earned.
   */
  function shareSummary(store, viewName) {
    var c = store.counts();
    var lines = [];
    lines.push('GTA VI trophy tracker — ' + c.earned + '/' + c.total + ' (' + c.pct + '%)');

    var stages = store.stages();
    lines.push('Stages: ' + stages.map(function (s) { return s.stage + ' ' + s.earned + '/' + s.total; }).join(' · '));

    var openMissables = store.missables().filter(function (t) { return !store.isEarned(t.id); });
    if (openMissables.length === 0) {
      lines.push('Missables: all ' + c.missable + ' banked');
    } else {
      lines.push('Missable and still open (' + openMissables.length + '): ' + openMissables.map(function (t) { return t.name; }).join('; '));
    }

    lines.push('Grades: ' + store.GRADES.map(function (g) {
      return R.gradeLabel(g) + ' ' + (c.byGrade[g] || 0) + '/' + (c.gradeTotal[g] || 0);
    }).join(' · '));

    if (c.left === 0) {
      lines.push('Platinum earned — nothing left on the list.');
    } else {
      var next = store.ordered().filter(function (t) {
        return !store.isEarned(t.id) && !(t.hidden && !store.getSpoilers());
      }).slice(0, 3);
      if (next.length > 0) {
        lines.push('Next up: ' + next.map(function (t) {
          return t.name + (t.mission ? ' (' + t.mission + ')' : '');
        }).join('; '));
      }
    }

    if (viewName) lines.push('Looking at: ' + viewName + ' view');
    return lines.join('\n');
  }

  NS.views = {
    checklist: checklist,
    roadmap: roadmap,
    missables: missables,
    rail: rail,
    progressPanel: progressPanel,
    toolsPanel: toolsPanel,
    filterBar: filterBar,
    shareSummary: shareSummary,
    viewHead: viewHead,
  };
})();
