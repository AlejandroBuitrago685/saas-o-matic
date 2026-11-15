// The system map of the evaluator walkthrough (D-192). The section is complete without this script: every card is
// in the page. The script draws the lines between the pieces, shows one card at a time and plays the three flows,
// lighting the pieces of each step and sending a dot along its lines. A classic script, like recorrido.js, so it also
// works from file://; its names live in this block, not in the global scope.
'use strict';

{
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const STEP_DELAY = 4500;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = window.matchMedia('(max-width: 1199px)');

  const svgElement = (tag, attributes) => {
    const element = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
    return element;
  };

  /** The box of an element relative to the map, which is where the lines are drawn. */
  const boxOf = (ctx, element) => {
    const map = ctx.map.getBoundingClientRect();
    const { left, top, right, bottom } = element.getBoundingClientRect();
    const [l, t, r, b] = [left - map.left, top - map.top, right - map.left, bottom - map.top];
    return { left: l, top: t, right: r, bottom: b, x: (l + r) / 2, y: (t + b) / 2 };
  };

  /** An orthogonal line from `a` to `b` when `b` is below or to the right of `a`; null otherwise. */
  const route = (a, b) => {
    if (b.top >= a.bottom - 2) {
      const [from, to] = [Math.max(a.left, b.left) + 24, Math.min(a.right, b.right) - 24];
      if (from <= to) return `M${(from + to) / 2} ${a.bottom} V${b.top}`;
      return `M${a.x} ${a.bottom} V${(a.bottom + b.top) / 2} H${b.x} V${b.top}`;
    }
    if (b.left < a.right - 2) return null;
    const [from, to] = [Math.max(a.top, b.top) + 12, Math.min(a.bottom, b.bottom) - 12];
    if (from <= to) return `M${a.right} ${(from + to) / 2} H${b.left}`;
    return `M${a.right} ${a.y} H${(a.right + b.left) / 2} V${b.y} H${b.left}`;
  };

  const drawWires = (ctx) => {
    const { width, height } = ctx.map.getBoundingClientRect();
    ctx.wires.setAttribute('viewBox', `0 0 ${width} ${height}`);
    ctx.wires.replaceChildren();
    ctx.paths.clear();
    for (const edge of ctx.edges) {
      const [a, b] = [boxOf(ctx, ctx.pieces.get(edge.from)), boxOf(ctx, ctx.pieces.get(edge.to))];
      const forward = route(a, b);
      const d = forward ?? route(b, a);
      if (d === null) continue;
      const path = svgElement('path', { d, class: `sys-wire sys-wire-${edge.kind}` });
      ctx.wires.append(path);
      ctx.paths.set(edge.id, { path, flipped: forward === null, kind: edge.kind });
    }
  };

  /** The legs a dot travels for a step: its HTTP lines in order, or its only line when it is an import. */
  const legsOf = (ctx, refs) =>
    refs.flatMap((ref) => {
      const backwards = ref.startsWith('<');
      const entry = ctx.paths.get(backwards ? ref.slice(1) : ref);
      if (entry === undefined || (entry.kind === 'import' && refs.length > 1)) return [];
      const reverse = backwards !== entry.flipped;
      return [{ path: entry.path, reverse, length: entry.path.getTotalLength() }];
    });

  const pointAt = (legs, distance) => {
    let left = distance;
    for (const leg of legs) {
      if (left <= leg.length) return leg.path.getPointAtLength(leg.reverse ? leg.length - left : left);
      left -= leg.length;
    }
    const last = legs[legs.length - 1];
    return last.path.getPointAtLength(last.reverse ? 0 : last.length);
  };

  const stopPacket = (ctx) => {
    cancelAnimationFrame(ctx.frame);
    ctx.wires.querySelector('.sys-packet')?.remove();
    ctx.label.hidden = true;
  };

  /** Sends a dot along the lines of the step; without `animate` (after a resize) it waits at the end of its trip. */
  const sendPacket = (ctx, step, animate = true) => {
    stopPacket(ctx);
    const legs = legsOf(ctx, listOf(step.dataset.edges));
    if (legs.length === 0) return;
    const total = legs.reduce((sum, leg) => sum + leg.length, 0);
    const dot = svgElement('circle', { r: 7, class: 'sys-packet' });
    ctx.wires.append(dot);
    ctx.label.textContent = step.dataset.label ?? '';
    ctx.label.hidden = ctx.label.textContent === '';
    const place = (point) => {
      dot.setAttribute('cx', String(point.x));
      dot.setAttribute('cy', String(point.y));
      ctx.label.style.left = `${point.x}px`;
      ctx.label.style.top = `${point.y}px`;
    };
    if (!animate) return place(pointAt(legs, total));
    if (reduceMotion.matches) return place(pointAt(legs, total / 2));
    const duration = Math.min(2600, 700 + total * 1.6);
    const start = performance.now();
    const frame = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      place(pointAt(legs, total * (1 - (1 - progress) ** 3)));
      if (progress < 1) ctx.frame = requestAnimationFrame(frame);
    };
    ctx.frame = requestAnimationFrame(frame);
  };

  const currentStep = (ctx) => (ctx.flow === null ? null : ctx.flows.get(ctx.flow).steps[ctx.step]);

  const listOf = (text) => (text ?? '').split(' ').filter(Boolean);

  const markPieces = (ctx, step) => {
    const lit = new Set(listOf(step?.dataset.lit));
    for (const [id, piece] of ctx.pieces) {
      piece.classList.toggle('is-lit', lit.has(id));
      piece.setAttribute('aria-current', String(step === null && ctx.piece === id));
    }
  };

  /** Lights the pieces and lines of the current step, or marks the chosen piece when exploring. */
  const applyLight = (ctx) => {
    const step = currentStep(ctx);
    const refs = listOf(step?.dataset.edges);
    ctx.root.classList.toggle('is-flowing', step !== null);
    markPieces(ctx, step);
    for (const [id, { path, flipped }] of ctx.paths) {
      path.classList.toggle('is-lit', refs.includes(id) || refs.includes(`<${id}`));
      path.classList.toggle('is-reverse', refs.includes(`<${id}`) !== flipped);
    }
  };

  const showCard = (ctx, id) => {
    for (const card of ctx.cards) card.classList.toggle('is-current', card.id === id);
  };

  const renderNav = (ctx) => {
    const flow = ctx.flow === null ? null : ctx.flows.get(ctx.flow);
    ctx.nav.hidden = flow === null;
    if (flow === null) return;
    flow.steps.forEach((step, index) => step.classList.toggle('is-current', index === ctx.step));
    ctx.progress.replaceChildren(...flow.steps.map(() => document.createElement('span')));
    [...ctx.progress.children].forEach((bar, index) => bar.classList.toggle('is-done', index <= ctx.step));
    ctx.count.textContent = `Paso ${ctx.step + 1} de ${flow.steps.length}`;
    ctx.prev.disabled = ctx.step === 0;
    ctx.next.textContent = ctx.step === flow.steps.length - 1 ? 'Volver a empezar' : 'Siguiente';
    ctx.play.textContent = ctx.playing ? 'Pausar' : 'Reproducir';
    ctx.play.setAttribute('aria-pressed', String(ctx.playing));
  };

  const render = (ctx) => {
    applyLight(ctx);
    showCard(
      ctx,
      ctx.flow !== null ? `flujo-${ctx.flow}` : ctx.piece !== null ? `pieza-${ctx.piece}` : 'esquema-idea',
    );
    renderNav(ctx);
    const step = currentStep(ctx);
    if (step !== null) sendPacket(ctx, step);
    else stopPacket(ctx);
  };

  const schedule = (ctx) => {
    clearTimeout(ctx.timer);
    if (!ctx.playing) return;
    if (ctx.step >= ctx.flows.get(ctx.flow).steps.length - 1) {
      ctx.playing = false;
      return renderNav(ctx);
    }
    ctx.timer = setTimeout(() => goStep(ctx, ctx.step + 1), STEP_DELAY);
  };

  const goStep = (ctx, index) => {
    const count = ctx.flows.get(ctx.flow).steps.length;
    ctx.step = Math.max(0, Math.min(index, count - 1));
    render(ctx);
    schedule(ctx);
  };

  const setFlow = (ctx, id) => {
    clearTimeout(ctx.timer);
    Object.assign(ctx, { flow: id === '' ? null : id, step: 0, playing: false });
    for (const button of ctx.buttons) {
      button.setAttribute('aria-pressed', String((button.dataset.flow ?? '') === id));
    }
    render(ctx);
  };

  const selectPiece = (ctx, id) => {
    if (ctx.flow !== null) setFlow(ctx, '');
    ctx.piece = ctx.piece === id ? null : id;
    render(ctx);
    if (narrow.matches && ctx.piece !== null) {
      ctx.cardBox.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'nearest' });
    }
  };

  const isTyping = (event) =>
    event.target instanceof Element &&
    event.target.closest('input, select, textarea, [contenteditable]') !== null;

  /** Listened to on the map only: a key pressed in a control elsewhere in the page never moves a flow. */
  const onKey = (ctx, event) => {
    if (isTyping(event) || event.altKey || event.ctrlKey || event.metaKey) return;
    const delta = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (event.key === 'Escape') {
      ctx.piece = null;
      setFlow(ctx, '');
    } else if (ctx.flow !== null && delta !== undefined) goStep(ctx, ctx.step + delta);
  };

  const bind = (ctx) => {
    for (const [id, piece] of ctx.pieces) {
      piece.addEventListener('click', (event) => {
        event.preventDefault();
        selectPiece(ctx, id);
      });
    }
    for (const button of ctx.buttons)
      button.addEventListener('click', () => setFlow(ctx, button.dataset.flow ?? ''));
    ctx.prev.addEventListener('click', () => goStep(ctx, ctx.step - 1));
    ctx.next.addEventListener('click', () =>
      goStep(ctx, (ctx.step + 1) % ctx.flows.get(ctx.flow).steps.length),
    );
    ctx.play.addEventListener('click', () => {
      ctx.playing = !ctx.playing;
      renderNav(ctx);
      schedule(ctx);
    });
    ctx.root.addEventListener('keydown', (event) => onKey(ctx, event));
    new ResizeObserver(() => {
      drawWires(ctx);
      applyLight(ctx);
      const step = currentStep(ctx);
      if (step !== null) sendPacket(ctx, step, false);
    }).observe(ctx.map);
  };

  const flowsOf = (root) =>
    new Map(
      [...root.querySelectorAll('.sys-flow')].map((card) => [
        card.id.replace('flujo-', ''),
        { steps: [...card.querySelectorAll('.sys-step')] },
      ]),
    );

  const contextOf = (root) => {
    const query = (selector) => root.querySelector(selector);
    return {
      root,
      flows: flowsOf(root),
      map: query('[data-sys-map]'),
      wires: query('[data-sys-wires]'),
      label: query('[data-sys-label]'),
      cardBox: query('[data-sys-cards]'),
      cards: [...root.querySelectorAll('.sys-card')],
      pieces: new Map([...root.querySelectorAll('.sys-piece')].map((piece) => [piece.dataset.piece, piece])),
      buttons: [...root.querySelectorAll('.sys-flow-btn')],
      nav: query('[data-sys-nav]'),
      progress: query('[data-sys-progress]'),
      count: query('[data-sys-count]'),
      prev: query('[data-sys-prev]'),
      next: query('[data-sys-next]'),
      play: query('[data-sys-play]'),
      edges: JSON.parse(document.getElementById('esquema-lineas')?.textContent ?? '[]'),
      paths: new Map(),
      flow: null,
      piece: null,
      step: 0,
      playing: false,
      timer: 0,
      frame: 0,
    };
  };

  const root = document.querySelector('[data-system]');
  if (root !== null) {
    const ctx = contextOf(root);
    root.classList.add('is-enhanced');
    for (const hidden of root.querySelectorAll('[data-sys-flows]')) hidden.hidden = false;
    bind(ctx);
    drawWires(ctx);
    render(ctx);
  }
}
