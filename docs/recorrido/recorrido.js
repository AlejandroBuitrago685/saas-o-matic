// Evaluator walkthrough of SaaS-O-Matic (D-183). The page is complete without this script; it only adds behaviour:
// the current section in the contents, the strip of steps, the pieces of the architecture, the filter of the map,
// the search of the requirements, the checklists and the live simulator. A classic script on purpose: module scripts
// do not load from file:// (D-184), so this one never imports anything.
'use strict';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const scrollBehavior = () => (reducedMotion.matches ? 'auto' : 'smooth');

(function markCurrentSection() {
  const links = [...document.querySelectorAll('.rail a[data-section]')];
  const sections = links.map((link) => document.getElementById(link.dataset.section ?? '')).filter(Boolean);
  if (sections.length === 0 || !('IntersectionObserver' in window)) return;
  const visible = new Set();
  const update = () => {
    const current = sections.find((section) => visible.has(section)) ?? sections[0];
    for (const link of links) {
      if (link.dataset.section === current.id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  };
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      update();
    },
    { rootMargin: '-30% 0px -60% 0px' },
  );
  for (const section of sections) observer.observe(section);
})();

(function connectStepStrip() {
  const links = [...document.querySelectorAll('.flow-strip a[data-step]')];
  const steps = [...document.querySelectorAll('.flow details')];
  const mark = () => {
    for (const link of links) {
      const step = document.getElementById(link.dataset.step ?? '');
      if (step instanceof HTMLDetailsElement && step.open) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    }
  };
  for (const link of links) {
    link.addEventListener('click', (event) => {
      const step = document.getElementById(link.dataset.step ?? '');
      if (!(step instanceof HTMLDetailsElement)) return;
      event.preventDefault();
      step.open = true;
      step.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      step.querySelector('summary')?.focus({ preventScroll: true });
    });
  }
  for (const step of steps) step.addEventListener('toggle', mark);
  mark();
})();

(function connectArchitecture() {
  const nodes = [...document.querySelectorAll('.arch-node[data-piece]')];
  const panels = nodes.map((node) => document.getElementById(node.dataset.piece ?? '')).filter(Boolean);
  if (panels.length === 0) return;
  const show = (id) => {
    for (const panel of panels) panel.hidden = panel.id !== id;
    for (const node of nodes) {
      if (node.dataset.piece === id) node.setAttribute('aria-current', 'true');
      else node.removeAttribute('aria-current');
    }
  };
  for (const node of nodes) {
    node.addEventListener('click', (event) => {
      event.preventDefault();
      const id = node.dataset.piece ?? '';
      show(id);
      document.getElementById(id)?.focus({ preventScroll: true });
    });
  }
  show(panels[0].id);
})();

(function connectMapFilter() {
  const filter = document.querySelector('[data-map-filter]');
  const entries = [...document.querySelectorAll('.map-entry')];
  const count = document.querySelector('[data-map-count]');
  if (filter === null || count === null) return;
  const buttons = [...filter.querySelectorAll('button[data-interest]')];
  const apply = (interest) => {
    let shown = 0;
    for (const entry of entries) {
      const matches = interest === 'todo' || (entry.dataset.interests ?? '').split(' ').includes(interest);
      entry.hidden = !matches;
      if (matches) shown += 1;
    }
    for (const group of document.querySelectorAll('.map-group')) {
      group.hidden = group.querySelector('.map-entry:not([hidden])') === null;
    }
    for (const button of buttons)
      button.setAttribute('aria-pressed', String(button.dataset.interest === interest));
    count.textContent = `${shown} ${shown === 1 ? 'entrada' : 'entradas'}`;
  };
  for (const button of buttons) button.addEventListener('click', () => apply(button.dataset.interest));
  filter.hidden = false;
})();

(function connectRequirementSearch() {
  const box = document.querySelector('[data-req-search]');
  const input = document.getElementById('buscar-requisito');
  const count = document.querySelector('[data-req-count]');
  const empty = document.querySelector('[data-req-empty]');
  const rows = [...document.querySelectorAll('.req-table tbody tr')];
  if (box === null || !(input instanceof HTMLInputElement) || count === null || empty === null) return;
  const normalize = (text) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  input.addEventListener('input', () => {
    const words = normalize(input.value).split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const row of rows) {
      const text = normalize(row.dataset.search ?? '');
      row.hidden = !words.every((word) => text.includes(word));
      if (!row.hidden) shown += 1;
    }
    count.textContent = `${shown} ${shown === 1 ? 'requisito' : 'requisitos'}`;
    empty.hidden = shown > 0;
  });
  box.hidden = false;
})();

(function connectChecklists() {
  const storage = (() => {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  })();
  const key = (id) => `saas-o-matic.recorrido.${id}`;
  for (const route of document.querySelectorAll('[data-route]')) {
    const boxes = [...route.querySelectorAll('input[data-persist]')];
    const progress = route.querySelector('[data-route-progress]');
    const update = () => {
      if (progress !== null)
        progress.textContent = `${boxes.filter((box) => box.checked).length} de ${boxes.length} hechos`;
    };
    for (const box of boxes) {
      try {
        box.checked = storage?.getItem(key(box.id)) === '1';
      } catch {
        box.checked = false;
      }
      box.addEventListener('change', () => {
        try {
          if (box.checked) storage?.setItem(key(box.id), '1');
          else storage?.removeItem(key(box.id));
        } catch {
          // Storage blocked or full: the tick still works for this visit.
        }
        update();
      });
    }
    update();
  }
})();

(function loadSimulator() {
  // From file:// a module script would only print a CORS error: the step keeps its picture and its notice (D-184).
  if (window.location.protocol === 'file:' || document.querySelector('[data-simulator]') === null) return;
  const script = document.createElement('script');
  script.type = 'module';
  script.src = 'simulador.js';
  document.head.append(script);
})();
