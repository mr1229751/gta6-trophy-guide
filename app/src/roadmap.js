// roadmap.js — the Roadmap & Missables view. Both halves are generated
// from the trophy data: stages group trophies by the stage number the
// data assigns them, and the missables section lists every trophy the
// data flags as missable, with the deadline its guide works to.

import { gradeBadge } from './render.js';

export const STAGE_INFO = [
  {
    n: 1,
    title: 'Stage 1 · Play the story',
    blurb:
      'Run the campaign in chapter order. Every story trophy unlocks on the critical path — and all three missable cautions on this list live in this stage, so read their guides before the moments pass.',
  },
  {
    n: 2,
    title: 'Stage 2 · Sweep the collectibles',
    blurb:
      'With the map open, gather what can be gathered: cards, meditation spots, WAiNK locations, vehicles, areas and properties. Coverage is the requirement everywhere in this stage.',
  },
  {
    n: 3,
    title: 'Stage 3 · Activities and grinds',
    blurb:
      'The long tail: races, ranges, stunts, stranger strands, robberies and the money totals. Nothing here is missable — this stage tests thoroughness, not timing.',
  },
  {
    n: 4,
    title: 'Stage 4 · Cleanup and the platinum',
    blurb:
      'Whatever is left, plus the 100% completion gold. When the counter reads 100%, the platinum is effectively the same moment.',
  },
];

// The deadline each missable is worked against, distilled from its guide.
const DEADLINES = {
  37: 'Deadline: during the VCIA Takedown story mission',
  44: 'Deadline: your first visit to Ocean Beach',
  48: 'Deadline: before the final mission — choices cannot be re-made',
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Draws the four stages with their trophies in list order, then the
// missables section. Clicking a stage chip selects that trophy in the
// checklist, via the handler the boot module supplies.
export function renderRoadmap(container, trophies, checked, handlers) {
  container.replaceChildren();

  for (const stage of STAGE_INFO) {
    const members = trophies.filter((t) => t.stage === stage.n);
    const done = members.filter((t) => checked.has(t.id)).length;
    const block = el('section', 'stage-block');
    const head = el('div', 'stage-head');
    head.appendChild(el('h2', 'stage-title', stage.title));
    head.appendChild(el('span', 'stage-count', `${done} / ${members.length}`));
    block.appendChild(head);
    block.appendChild(el('p', 'stage-blurb', stage.blurb));

    const chips = el('div', 'stage-chips');
    for (const trophy of members) {
      const chip = el(
        'button',
        `stage-chip${checked.has(trophy.id) ? ' is-earned' : ''}`,
        `${checked.has(trophy.id) ? '✓ ' : ''}${trophy.name}`,
      );
      chip.type = 'button';
      chip.addEventListener('click', () => handlers.onSelect(trophy.id));
      chips.appendChild(chip);
    }
    block.appendChild(chips);
    container.appendChild(block);
  }

  const missables = trophies.filter((t) => t.missable);
  const section = el('section', 'missables-block');
  section.appendChild(el('h2', 'stage-title', 'Missables — the short list that matters'));
  section.appendChild(
    el(
      'p',
      'stage-blurb',
      'Only three trophies on the official list are worded in a way that ties them to a moment that can pass. Each is flagged from its description, and each guide explains the reasoning rather than asking you to take it on faith.',
    ),
  );
  for (const trophy of missables) {
    const card = el('article', 'missable-card');
    const top = el('div', 'row-top');
    top.appendChild(gradeBadge(trophy.grade));
    top.appendChild(el('span', 'missable-flag', 'Missable'));
    card.appendChild(top);
    card.appendChild(el('h3', 'missable-name', trophy.name));
    if (DEADLINES[trophy.id]) {
      card.appendChild(el('p', 'missable-deadline', DEADLINES[trophy.id]));
    }
    card.appendChild(el('p', 'missable-guide', trophy.guide));
    section.appendChild(card);
  }
  container.appendChild(section);
}
