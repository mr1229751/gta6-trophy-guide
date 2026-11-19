// render.js — draws the checklist, the progress header and the detail
// panel. Everything is built as DOM nodes with textContent, so trophy
// names and descriptions are shown exactly as the data file gives them.

import { KIND_LABELS, POINTS, earnedPoints, totalPoints } from './data.js';
import { matchesFilters, isShielded } from './filters.js';

const SHIELD_NAME = 'Story trophy — hidden by the spoiler shield';
const SHIELD_DESC = 'Earn this trophy in game to reveal what it is.';

// Small element factory: tag, optional class, optional text.
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// The coloured pill that names a trophy's grade.
export function gradeBadge(grade) {
  return el('span', `badge grade-${grade}`, grade[0].toUpperCase() + grade.slice(1));
}

// Fills the masthead numbers: trophies earned, points earned, bar, %.
export function renderProgress(refs, trophies, checked) {
  const earned = trophies.filter((t) => checked.has(t.id)).length;
  const points = earnedPoints(trophies, checked);
  const total = totalPoints(trophies);
  const pct = Math.round((earned / trophies.length) * 100);
  refs.count.textContent = `${earned} / ${trophies.length} trophies`;
  refs.points.textContent = `${points} / ${total} PSN points`;
  refs.pct.textContent = `${pct}% complete`;
  refs.fill.style.width = `${pct}%`;
}

// Draws the filtered checklist. Rows report checkbox changes and clicks
// back through the handlers the boot module supplies.
export function renderList(container, trophies, checked, selectedId, handlers) {
  container.replaceChildren();
  let visible = 0;
  for (const trophy of trophies) {
    if (!matchesFilters(trophy)) continue;
    visible += 1;
    const shielded = isShielded(trophy, checked);
    const row = el('li', 'trophy-row');
    if (checked.has(trophy.id)) row.classList.add('is-checked');
    if (trophy.id === selectedId) row.classList.add('is-selected');
    row.dataset.id = String(trophy.id);

    const checkWrap = el('label', 'row-check');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = checked.has(trophy.id);
    box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
    box.addEventListener('change', () => handlers.onToggle(trophy.id, box.checked));
    checkWrap.appendChild(box);
    row.appendChild(checkWrap);

    const main = el('div', 'row-main');
    const top = el('div', 'row-top');
    top.appendChild(gradeBadge(trophy.grade));
    top.appendChild(el('span', 'kind-tag', KIND_LABELS[trophy.kind]));
    if (trophy.missable) top.appendChild(el('span', 'missable-flag', 'Missable'));
    main.appendChild(top);
    main.appendChild(el('h3', 'row-name', shielded ? SHIELD_NAME : trophy.name));
    main.appendChild(el('p', 'row-desc', shielded ? SHIELD_DESC : trophy.description));
    row.appendChild(main);

    row.addEventListener('click', (event) => {
      if (event.target !== box) handlers.onSelect(trophy.id);
    });
    container.appendChild(row);
  }
  if (visible === 0) {
    container.appendChild(el('li', 'list-empty', 'No trophies match these filters.'));
  }
  return visible;
}

// Draws the detail panel for the selected trophy: official description,
// this guide's own walkthrough, the step list, the missable warning when
// the data raises one, and the cited sources as links.
export function renderDetail(panel, trophy, checked) {
  panel.replaceChildren();
  if (!trophy) {
    panel.appendChild(el('h2', 'detail-title', 'Pick a trophy'));
    panel.appendChild(
      el('p', 'detail-hint', 'Select any trophy in the list to read its guide, its steps and its sources. Your progress is saved in this browser as you tick trophies off.'),
    );
    return;
  }
  if (isShielded(trophy, checked)) {
    panel.appendChild(el('h2', 'detail-title', SHIELD_NAME));
    panel.appendChild(
      el('p', 'detail-hint', 'The spoiler shield is on, and this story trophy is still unearned, so its name, description and guide stay covered. Earn it in game — or switch the shield off — to reveal it.'),
    );
    return;
  }

  const top = el('div', 'row-top');
  top.appendChild(gradeBadge(trophy.grade));
  top.appendChild(el('span', 'kind-tag', KIND_LABELS[trophy.kind]));
  top.appendChild(el('span', 'kind-tag', `${POINTS[trophy.grade]} pts`));
  if (trophy.missable) top.appendChild(el('span', 'missable-flag', 'Missable'));
  panel.appendChild(top);

  panel.appendChild(el('h2', 'detail-title', trophy.name));
  panel.appendChild(el('h3', 'detail-head', 'Official description'));
  panel.appendChild(el('p', 'detail-desc', trophy.description));

  if (trophy.missable) {
    const warn = el('div', 'missable-warning');
    warn.appendChild(el('strong', '', 'Missable — read the guide before the moment passes. '));
    warn.appendChild(
      el('span', '', 'This guide flags it from the wording of the official list; the guide below explains why and names the deadline.'),
    );
    panel.appendChild(warn);
  }

  panel.appendChild(el('h3', 'detail-head', 'Guide'));
  panel.appendChild(el('p', 'detail-guide', trophy.guide));

  panel.appendChild(el('h3', 'detail-head', 'Steps'));
  const steps = el('ol', 'detail-steps');
  for (const step of trophy.steps) steps.appendChild(el('li', '', step));
  panel.appendChild(steps);

  panel.appendChild(el('h3', 'detail-head', 'Sources'));
  const sources = el('ul', 'detail-sources');
  for (const source of trophy.sources) {
    const item = el('li');
    const link = el('a', '', source.label);
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    item.appendChild(link);
    sources.appendChild(item);
  }
  panel.appendChild(sources);
}
