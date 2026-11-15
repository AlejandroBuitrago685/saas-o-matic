// @ts-check
/**
 * How the project was built (D-183): one highlighted decision per part (its lead is read from decisiones.md) and the
 * cycle every part followed (04-plan-implementacion §4, D-73).
 */

/** @type {Readonly<Record<string, string>>} part → the decision the walkthrough highlights */
export const HIGHLIGHTED_DECISIONS = {
  P0: 'D-88',
  P1: 'D-95',
  P2: 'D-100',
  P3: 'D-115',
  P4: 'D-120',
  P5: 'D-122',
  P6: 'D-130',
  P7: 'D-136',
  P8: 'D-144',
  P9: 'D-152',
  P10: 'D-161',
  P11: 'D-170',
  P12: 'D-181',
  P13: 'D-183',
};

/**
 * @typedef {object} AfterPlanWork
 * @property {string} title
 * @property {string} what one sentence
 * @property {string[]} pullRequests their numbers, in order
 * @property {string} decision the decision it is about
 */

/**
 * What came after P13, outside the parts of the plan: the delivery close and the redesign (diario). The plan's table
 * «Partes y PR» stops at P13, so these pull requests are listed here; `tools/recorrido.test.ts` checks that each one
 * comes after the parts and that every decision is defined.
 * @type {readonly AfterPlanWork[]}
 */
export const AFTER_PLAN = [
  {
    title: 'Conversaciones con la IA y privacidad',
    what: 'Las sesiones de construcción enteras, convertidas a Markdown, y una comprobación de privacidad de todo lo entregado.',
    pullRequests: ['23', '26'],
    decision: 'D-188',
  },
  {
    title: '«Lo más destacable» del README',
    what: 'Siete líneas, cada una con el enlace a lo que la demuestra y con sus cifras leídas de su fuente.',
    pullRequests: ['24'],
    decision: 'D-190',
  },
  {
    title: 'Rediseño visual a partir de tres maquetas',
    what: 'Una dirección visual nueva para la interfaz, sin tocar su lógica, con capturas y recorrido regenerados.',
    pullRequests: ['25'],
    decision: 'D-191',
  },
];

/**
 * @typedef {object} CycleStep
 * @property {string} name
 * @property {string} what
 * @property {string} source where the rule of the step is written
 */

/** @type {readonly CycleStep[]} */
export const PART_CYCLE = [
  {
    name: 'Plan',
    what: 'Una sesión nueva lee la nota de traspaso y presenta el plan: objetivo, criterios, ficheros, orden de los tests y riesgos. No se toca código hasta que el responsable del proyecto lo aprueba.',
    source: 'ai-workspace/04-plan-implementacion.md#4-protocolo-de-cada-parte-d-73',
  },
  {
    name: 'TDD',
    what: 'Primero el test con los vectores de la especificación; en el dominio, siempre, con el 100 % de cobertura.',
    source: 'ai-workspace/03-arquitectura/07-tests.md',
  },
  {
    name: 'Revisor',
    what: 'Un subagente de solo lectura revisa el diff contra la especificación y la seguridad. Los P0 y P1 se corrigen, cada uno con su test.',
    source: '.claude/agents/revisor.md',
  },
  {
    name: 'Documentación',
    what: 'Una sola actualización al cerrar: decisiones, diario, trazabilidad y el prompt literal.',
    source: 'ai-workspace/diario.md',
  },
  {
    name: 'PR y CI',
    what: 'Una rama y una PR por parte. main solo acepta la PR con todos los checks del CI en verde.',
    source: '.github/workflows/ci.yml',
  },
];
