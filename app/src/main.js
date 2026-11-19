// main.js — boots the guide. It loads the trophy data, restores the
// player's saved progress, wires every control on the page, and keeps
// the progress header, checklist, detail panel and roadmap in sync as
// trophies are ticked off, filters change and views switch.

import { loadTrophies } from './data.js';
import { loadChecked, saveChecked, exportChecked, importChecked } from './tracker.js';
import { filterState } from './filters.js';
import { renderProgress, renderList, renderDetail } from './render.js';
import { renderRoadmap } from './roadmap.js';

let trophies = [];
let checked = loadChecked();
let selectedId = 9; // Break the Bank — a story heist, open in the panel on first load

const byId = (id) => document.getElementById(id);

const progressRefs = {
  count: byId('progress-count'),
  points: byId('progress-points'),
  pct: byId('progress-pct'),
  fill: byId('progress-fill'),
};

function selectedTrophy() {
  return trophies.find((t) => t.id === selectedId) ?? null;
}

// One refresh redraws everything from the current state, so no view can
// drift out of agreement with another.
function refresh() {
  renderProgress(progressRefs, trophies, checked);
  const visible = renderList(byId('trophy-list'), trophies, checked, selectedId, handlers);
  byId('visible-count').textContent = `Showing ${visible} of ${trophies.length} trophies`;
  renderDetail(byId('detail-panel'), selectedTrophy(), checked);
  renderRoadmap(byId('roadmap'), trophies, checked, handlers);
}

const handlers = {
  onToggle(id, isChecked) {
    if (isChecked) checked.add(id);
    else checked.delete(id);
    saveChecked(checked);
    refresh();
  },
  onSelect(id) {
    selectedId = id;
    showView('checklist');
    refresh();
  },
};

// Switches between the checklist and the roadmap, keeping the tabs honest.
function showView(which) {
  const checklist = which === 'checklist';
  byId('view-checklist').hidden = !checklist;
  byId('view-roadmap').hidden = checklist;
  byId('tab-checklist').classList.toggle('active', checklist);
  byId('tab-roadmap').classList.toggle('active', !checklist);
}

function wireControls() {
  byId('tab-checklist').addEventListener('click', () => showView('checklist'));
  byId('tab-roadmap').addEventListener('click', () => showView('roadmap'));

  for (const chip of document.querySelectorAll('#kind-chips .chip')) {
    chip.addEventListener('click', () => {
      filterState.kind = chip.dataset.kind;
      for (const other of document.querySelectorAll('#kind-chips .chip')) {
        other.classList.toggle('active', other === chip);
      }
      refresh();
    });
  }

  byId('grade-filter').addEventListener('change', (event) => {
    filterState.grade = event.target.value;
    refresh();
  });

  byId('search').addEventListener('input', (event) => {
    filterState.query = event.target.value.trim();
    refresh();
  });

  byId('spoiler-toggle').addEventListener('change', (event) => {
    filterState.spoiler = event.target.checked;
    refresh();
  });

  byId('export-btn').addEventListener('click', () => exportChecked(checked));

  const fileInput = byId('import-file');
  byId('import-btn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    importChecked(file)
      .then((ids) => {
        const valid = new Set(trophies.map((t) => t.id));
        checked = new Set([...ids].filter((id) => valid.has(id)));
        saveChecked(checked);
        refresh();
      })
      .catch(() => {
        byId('visible-count').textContent = 'That file could not be read as a progress export.';
      });
    fileInput.value = '';
  });
}

async function boot() {
  trophies = await loadTrophies();
  wireControls();
  refresh();
}

boot().catch((error) => {
  byId('visible-count').textContent = `The guide failed to start: ${error.message}`;
});
