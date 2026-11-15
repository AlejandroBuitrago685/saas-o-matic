// Evaluator walkthrough of SaaS-O-Matic (D-183). The page is complete without this script; it only adds behaviour:
// the current section in the contents, the strip of steps, the search of the requirements and the live simulator.
// The system map has its own script, esquema.js (D-192). A classic script on purpose: module scripts do not load
// from file:// (D-184), so this one never imports anything.
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

(function loadSimulator() {
  // From file:// a module script would only print a CORS error: the step keeps its picture and its notice (D-184).
  if (window.location.protocol === 'file:' || document.querySelector('[data-simulator]') === null) return;
  const script = document.createElement('script');
  script.type = 'module';
  script.src = 'simulador.js';
  document.head.append(script);
})();
