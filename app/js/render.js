// render.js — pure string builders. Nothing in this file touches the DOM.
//
// Each helper returns an HTML string the view layer drops into place with
// innerHTML. Escaping happens here, once, at the point where data meets
// markup. Written as a plain script body that registers one slice of the
// GTA6 namespace, so it parses both as a classic script and as a module.
(function () {
  'use strict';

  var NS = (globalThis.GTA6 = globalThis.GTA6 || {});

  var ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  /** Escape a value for use in text and in a double- or single-quoted attribute. */
  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, function (ch) { return ENTITIES[ch]; });
  }

  var GRADE_LABEL = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
  var KIND_LABEL = {
    story: 'Story',
    side: 'Side mission',
    activities: 'Activity',
    collectibles: 'Collectibles',
    misc: 'Misc',
  };

  function gradeLabel(grade) {
    return GRADE_LABEL[grade] || String(grade || '');
  }

  function kindLabel(kind) {
    return KIND_LABEL[kind] || String(kind || '');
  }

  /** A grade pill, e.g. a bronze trophy. Unknown grades degrade to a plain chip. */
  function gradeBadge(grade) {
    var key = String(grade || '').toLowerCase();
    if (!GRADE_LABEL[key]) {
      return '<span class="chip">' + escapeHtml(key || 'unrated') + '</span>';
    }
    return (
      '<span class="badge badge--' + key + '">' +
      '<span class="sr-only">Grade:</span>' + GRADE_LABEL[key] +
      '</span>'
    );
  }

  var ringSeq = 0;

  /**
   * The progress ring as inline SVG. Two calls on one page get distinct
   * gradient ids so the second ring never steals the first one's fill.
   */
  function progressRing(earned, total) {
    var done = Math.max(0, Number(earned) || 0);
    var all = Math.max(0, Number(total) || 0);
    if (all > 0 && done > all) done = all;
    var pct = all === 0 ? 0 : Math.round((done / all) * 100);
    var radius = 40;
    var circumference = 2 * Math.PI * radius;
    var offset = circumference * (1 - (all === 0 ? 0 : done / all));
    ringSeq += 1;
    var gid = 'ring-grad-' + ringSeq;
    var label = done + ' of ' + all + ' trophies earned, ' + pct + ' percent';

    return (
      '<svg class="ring" viewBox="0 0 100 100" role="img" aria-label="' + escapeHtml(label) + '">' +
      '<title>' + escapeHtml(label) + '</title>' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#0d7d74"/>' +
      '<stop offset="55%" stop-color="#14b8a6"/>' +
      '<stop offset="100%" stop-color="#5eead4"/>' +
      '</linearGradient></defs>' +
      '<circle class="ring__track" cx="50" cy="50" r="' + radius + '"/>' +
      '<circle class="ring__fill" cx="50" cy="50" r="' + radius + '" ' +
      'stroke="url(#' + gid + ')" ' +
      'stroke-dasharray="' + circumference.toFixed(2) + '" ' +
      'stroke-dashoffset="' + offset.toFixed(2) + '" ' +
      'data-pct="' + pct + '"/>' +
      '<text class="ring__pct" x="50" y="52" text-anchor="middle" dominant-baseline="middle">' + pct + '%</text>' +
      '<text class="ring__cap" x="50" y="66" text-anchor="middle">EARNED</text>' +
      '</svg>'
    );
  }

  /** Small metadata chips for a trophy: kind, chapter, counter, missable, hidden. */
  function trophyChips(trophy) {
    var chips = [];
    chips.push('<span class="chip">' + escapeHtml(kindLabel(trophy.kind)) + '</span>');
    if (trophy.chapter) chips.push('<span class="chip">' + escapeHtml(trophy.chapter) + '</span>');
    if (trophy.count !== null && trophy.count !== undefined && trophy.countLabel) {
      chips.push(
        '<span class="chip chip--count">' + escapeHtml(trophy.count) + ' · ' + escapeHtml(trophy.countLabel) + '</span>'
      );
    }
    if (trophy.missable) chips.push('<span class="chip chip--missable">Missable</span>');
    if (trophy.hidden) chips.push('<span class="chip chip--hidden">Hidden</span>');
    return chips.join('');
  }

  /**
   * The one-line meta tail on a collapsed row: type, chapter, and the counter
   * where there is one. Kept short so a row stays two lines tall.
   */
  function trophyMeta(trophy) {
    var bits = [kindLabel(trophy.kind)];
    if (trophy.chapter) bits.push(trophy.chapter);
    else if (trophy.mission) bits.push(trophy.mission);
    if (trophy.count !== null && trophy.count !== undefined && trophy.countLabel) bits.push(trophy.countLabel);
    return bits.join(' · ');
  }

  /** One cited source as a link that never hands the opener over. */
  function sourceLink(source) {
    if (!source || !source.url) return '';
    return (
      '<a href="' + escapeHtml(source.url) + '" target="_blank" rel="noopener noreferrer">' +
      escapeHtml(source.name || source.url) +
      '<span class="sr-only"> (opens in a new tab)</span></a>'
    );
  }

  function sourcesList(list) {
    if (!Array.isArray(list) || list.length === 0) return '';
    return (
      '<p class="guide__sources"><span>Sources</span>' +
      list.map(sourceLink).join('') +
      '</p>'
    );
  }

  /**
   * One trophy row.
   *
   * state (all optional):
   *   earned     the trophy is ticked
   *   masked     the walkthrough must stay hidden behind a spoiler gate
   *   expanded   render the guide open
   *   canReveal  show the reveal button (defaults to masked)
   */
  function trophyRow(trophy, state) {
    var ctx = state || {};
    var id = trophy.id;
    var earned = Boolean(ctx.earned);
    var masked = Boolean(ctx.masked);
    var expanded = Boolean(ctx.expanded);
    var guideId = 'guide-' + id;
    var tickId = 'tick-' + id;

    var classes = ['row'];
    if (earned) classes.push('is-earned');
    if (trophy.missable) classes.push('is-missable');

    var head =
      '<div class="row__head">' +
      '<span class="tick"><input type="checkbox" id="' + tickId + '" data-act="tick" data-id="' + id + '"' +
      (earned ? ' checked' : '') + ' aria-label="Mark ' + escapeHtml(trophy.name) + ' as earned"></span>' +
      '<button class="row__main" type="button" data-act="toggle-guide" data-id="' + id + '"' +
      ' aria-expanded="' + (expanded ? 'true' : 'false') + '" aria-controls="' + guideId + '">' +
      '<span class="row__line">' +
      '<span class="row__name">' + escapeHtml(trophy.name) + '</span>' +
      (trophy.missable ? '<span class="row__flag">missable</span>' : '') +
      '<span class="row__meta">' + escapeHtml(trophyMeta(trophy)) + '</span>' +
      '</span>' +
      '<span class="row__desc">' + escapeHtml(trophy.description) + '</span>' +
      '</button>' +
      '<span class="row__aside">' + gradeBadge(trophy.grade) +
      '<span class="row__chev" aria-hidden="true"></span></span>' +
      '</div>';

    var body;
    if (masked) {
      body =
        '<div class="guide__spoiler">' +
        '<span>Hidden trophy: the walkthrough is masked until you reveal it.</span>' +
        '<button class="btn btn--sm" type="button" data-act="reveal" data-id="' + id + '">Reveal guide</button>' +
        '</div>' +
        (earned ? '' : '');
    } else {
      var meta = [];
      if (trophy.mission) meta.push('<span><b>Where:</b> ' + escapeHtml(trophy.mission) + '</span>');
      if (trophy.chapter) meta.push('<span><b>Chapter:</b> ' + escapeHtml(trophy.chapter) + '</span>');
      if (trophy.count !== null && trophy.count !== undefined) {
        meta.push('<span><b>Counter:</b> ' + escapeHtml(trophy.count) + ' ' + escapeHtml(trophy.countLabel || '') + '</span>');
      }
      body =
        '<div class="guide__meta">' + meta.join('') + '</div>' +
        '<p class="guide__text">' + escapeHtml(trophy.guide) + '</p>' +
        (trophy.missableNote
          ? '<div class="guide__note"><strong>Point of no return</strong>' + escapeHtml(trophy.missableNote) + '</div>'
          : '') +
        sourcesList(trophy.sources);
    }

    return (
      '<article class="' + classes.join(' ') + '" id="trophy-' + id + '">' +
      head +
      '<div class="row__guide" id="' + guideId + '"' + (expanded ? '' : ' hidden') + '>' + body + '</div>' +
      '</article>'
    );
  }

  /**
   * One roadmap stage card.
   *
   * stage: { stage, title, summary } from the document's roadmap.
   * trophies: the stage's trophies, each already decorated with .earned
   *           (or plain trophies plus a `progress` object on the stage).
   */
  function roadmapCard(stage, trophies) {
    var list = Array.isArray(trophies) ? trophies : [];
    var total = list.length;
    var done = 0;
    var missableTotal = 0;
    for (var i = 0; i < total; i++) {
      var item = list[i];
      var earnedFlag = item && item.earned !== undefined ? item.earned : item && item.state && item.state.earned;
      if (earnedFlag) done += 1;
      var trophy = item && item.trophy ? item.trophy : item;
      if (trophy && trophy.missable) missableTotal += 1;
    }
    if (stage && typeof stage.total === 'number') total = stage.total;
    if (stage && typeof stage.earned === 'number') done = stage.earned;
    var pct = total === 0 ? 0 : Math.round((done / total) * 100);
    var doneAll = total > 0 && done === total;

    var classes = ['road'];
    if (doneAll) classes.push('is-done');
    else if (done > 0) classes.push('is-active');

    var tags = [];
    tags.push('<span class="chip">' + total + (total === 1 ? ' trophy' : ' trophies') + '</span>');
    if (missableTotal > 0) {
      tags.push('<span class="chip chip--missable">' + missableTotal + ' missable</span>');
    }

    return (
      '<article class="' + classes.join(' ') + '">' +
      '<div class="road__num" aria-hidden="true">' + escapeHtml(stage ? stage.stage : '?') + '</div>' +
      '<div class="road__body">' +
      '<h3 class="road__title">' + escapeHtml(stage ? stage.title : '') + '</h3>' +
      '<p class="road__summary">' + escapeHtml(stage ? stage.summary : '') + '</p>' +
      '<p class="road__tags">' + tags.join('') + '</p>' +
      '<button class="road__link" type="button" data-act="stage-filter" data-stage="' +
      escapeHtml(stage ? stage.stage : '') + '">Show these trophies in the checklist</button>' +
      '</div>' +
      '<div class="road__meter">' +
      '<span class="road__pct">' + pct + '%</span>' +
      '<span class="road__track"><span class="road__fill" style="width:' + pct + '%"></span></span>' +
      '<span class="road__count">' + done + ' / ' + total + ' earned</span>' +
      '</div>' +
      '</article>'
    );
  }

  /**
   * One entry in the missable chain.
   *
   * trophy: a trophy from the list.
   * ctx: { index, earned }
   */
  function missableItem(trophy, ctx) {
    var state = ctx || {};
    var index = state.index === undefined ? '' : state.index;
    var earned = Boolean(state.earned);
    var where = [];
    if (trophy.chapter) where.push(escapeHtml(trophy.chapter));
    if (trophy.mission) where.push(escapeHtml(trophy.mission));

    return (
      '<article class="lock' + (earned ? ' is-earned' : '') + '" id="missable-' + trophy.id + '">' +
      '<div class="lock__idx" aria-hidden="true">' + escapeHtml(index) + '</div>' +
      '<div>' +
      '<h3 class="lock__name">' + escapeHtml(trophy.name) + '</h3>' +
      '<p class="lock__desc">' + escapeHtml(trophy.description) + '</p>' +
      '<p class="lock__note">' + escapeHtml(trophy.missableNote || 'This trophy can be lost for good.') + '</p>' +
      '</div>' +
      '<div class="lock__aside">' + gradeBadge(trophy.grade) +
      '<span class="lock__where">' + (where.length ? where.join('<br>') : '&nbsp;') + '</span>' +
      (earned
        ? '<span class="chip">Banked</span>'
        : '<button class="btn btn--sm" type="button" data-act="tick-on" data-id="' + trophy.id + '">Mark earned</button>') +
      '</div>' +
      '</article>'
    );
  }

  /** A grade tally bar for the rail. */
  function gradeBar(grade, earned, total) {
    var pct = total === 0 ? 0 : Math.round((earned / total) * 100);
    return (
      '<div class="gradebar">' +
      '<span class="gradebar__label">' + escapeHtml(gradeLabel(grade)) + '</span>' +
      '<span class="gradebar__track"><span class="gradebar__fill gradebar__fill--' + escapeHtml(grade) +
      '" style="width:' + pct + '%"></span></span>' +
      '<span class="gradebar__count">' + earned + '/' + total + '</span>' +
      '</div>'
    );
  }

  /** The "nothing matched" panel. */
  function emptyState(title, text) {
    return (
      '<div class="empty"><h3>' + escapeHtml(title) + '</h3><p>' + escapeHtml(text) + '</p></div>'
    );
  }

  NS.render = {
    escapeHtml: escapeHtml,
    gradeBadge: gradeBadge,
    gradeLabel: gradeLabel,
    kindLabel: kindLabel,
    trophyChips: trophyChips,
    trophyMeta: trophyMeta,
    progressRing: progressRing,
    trophyRow: trophyRow,
    roadmapCard: roadmapCard,
    missableItem: missableItem,
    gradeBar: gradeBar,
    sourcesList: sourcesList,
    sourceLink: sourceLink,
    emptyState: emptyState,
  };
})();
