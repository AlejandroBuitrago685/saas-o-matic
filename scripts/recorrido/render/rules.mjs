// @ts-check
/**
 * The business rule of each step of the flow, with an example whose numbers the compiled domain computed (D-183).
 * One function per kind of rule; `renderRule` picks it with an exhaustive switch.
 */
import { euros, num, money, percent } from '../format.mjs';
import { markup } from '../html.mjs';
import { renderTierBar } from './projection.mjs';

/**
 * @typedef {object} RuleData
 * @property {{ text: string, normalized: string, query: string }} search
 * @property {{ input: string, isValid: boolean, detail: string }[]} taxIds
 * @property {{ country: string, taxRateBps: number }[]} taxRates
 * @property {import('../sources/examples.mjs').PricingExample} tiers
 * @property {string} tiersVector
 * @property {import('../sources/examples.mjs').PricingExample} converted the example in euros that is converted
 * @property {{ currency: string, rate: number, tierSubtotals: readonly number[], base: number, tax: number, total: number }} conversion
 * @property {string[]} requestFields the fields of the body of POST /simulations, read from the contract
 */

/** @param {RuleData} data */
function search({ search: example }) {
  return markup`<p>
      La API guarda el nombre de empresa normalizado y normaliza la consulta con la misma función del dominio:
      sin tildes y en minúsculas.
    </p>
    <p class="worked">
      <span>«${example.text}»</span><span class="worked-arrow" aria-hidden="true">→</span
      ><code>${example.normalized}</code>
    </p>
    <p>Por eso <code>${example.query}</code> encuentra a «${example.text}».</p>`;
}

/** @param {RuleData} data */
function taxId({ taxIds }) {
  return markup`<p>
      Un validador por país detrás de una interfaz común; en España, DNI, NIE y CIF con su carácter de
      control.
    </p>
    <table class="worked-table">
      <caption class="visually-hidden">
        Respuesta del dominio para dos identificadores españoles
      </caption>
      <thead>
        <tr>
          <th scope="col">Identificador</th>
          <th scope="col">Respuesta de <code>validateTaxId</code></th>
        </tr>
      </thead>
      <tbody>
        ${taxIds.map(
          (row) =>
            markup`<tr>
              <td><code>${row.input}</code></td>
              <td class="${row.isValid ? 'is-valid' : 'is-invalid'}">
                ${row.isValid ? 'Válido' : 'Rechazado'} · <code>${row.detail}</code>
              </td>
            </tr>`,
        )}
      </tbody>
    </table>`;
}

/** @param {RuleData} data */
function taxRate({ taxRates }) {
  return markup`<p>El país del cliente fija su impuesto; el catálogo lo valida la API al arrancar.</p>
    <ul class="chips">
      ${taxRates.map((row) => markup`<li><span>${row.country}</span> ${percent(row.taxRateBps)}</li>`)}
    </ul>`;
}

/** @param {RuleData} data */
function tiers({ tiers: example, tiersVector }) {
  return markup`<p>Tramos acumulativos: cada usuario paga el precio de su tramo, no el del último.</p>
    ${renderTierBar(example)}
    <ol class="worked-lines">
      ${example.tiers.map(
        (line) =>
          markup`<li>
            <span>Usuarios ${line.fromUser}–${line.toUser ?? example.users}</span
            ><span class="amount"
              >${num(line.units)} × ${euros(line.unitPriceCents)} = ${euros(line.subtotalCents)}</span
            >
          </li>`,
      )}
      <li class="worked-total">
        <span>Base de ${num(example.users)} usuarios</span
        ><span class="amount">${euros(example.baseCents)}</span>
      </li>
    </ol>
    <p class="vector">Es el vector ${tiersVector} de la especificación.</p>`;
}

/** @param {RuleData} data */
function tax({ tiers: example }) {
  return markup`<p>
      Un solo impuesto sobre la base entera y un único redondeo, al céntimo y hacia arriba en el medio.
    </p>
    <ol class="worked-lines">
      <li><span>Base</span><span class="amount">${euros(example.baseCents)}</span></li>
      <li>
        <span>Impuesto (${example.country}, ${percent(example.taxRateBps)})</span
        ><span class="amount">${euros(example.taxCents)}</span>
      </li>
      <li class="worked-total">
        <span>Total mensual</span><span class="amount">${euros(example.totalCents)}</span>
      </li>
    </ol>`;
}

/** @param {RuleData} data */
function currency({ converted: example, conversion }) {
  const { currency: code } = conversion;
  return markup`<p>
      Cada tramo y el impuesto se convierten por separado; la base y el total son sumas de lo convertido, así
      que siempre cuadran.
    </p>
    <ol class="worked-lines">
      ${example.tiers.map(
        (line, index) =>
          markup`<li>
            <span>Tramo ${line.tier}: ${euros(line.subtotalCents)}</span
            ><span class="amount">${money(conversion.tierSubtotals[index] ?? 0, code)}</span>
          </li>`,
      )}
      <li>
        <span>Impuesto: ${euros(example.taxCents)}</span
        ><span class="amount">${money(conversion.tax, code)}</span>
      </li>
      <li class="worked-total">
        <span>Total de ${num(example.users)} usuarios</span
        ><span class="amount">${money(conversion.total, code)}</span>
      </li>
    </ol>
    <p class="vector">
      Con el tipo de referencia de los tests: 1 € = ${String(conversion.rate).replace('.', ',')} ${code}. Los
      tipos los pide el navegador; el servidor no hace peticiones salientes.
    </p>`;
}

/** @param {RuleData} data */
function save({ requestFields }) {
  return markup`<p>
      El navegador solo envía las cantidades; la API recalcula los importes con el mismo dominio y guarda una
      instantánea de los tramos y del impuesto.
    </p>
    <p class="worked">
      <span>Cuerpo de <code>POST /simulations</code>:</span
      >${requestFields.map((field) => markup` <code>${field}</code>`)}
    </p>
    <p>Cualquier importe en la petición es un campo desconocido y se rechaza con un <code>400</code>.</p>`;
}

/**
 * @param {import('../content/flow.mjs').RuleKind} kind
 * @param {RuleData} data
 */
export function renderRule(kind, data) {
  switch (kind) {
    case 'search':
      return search(data);
    case 'tax-id':
      return taxId(data);
    case 'tax-rate':
      return taxRate(data);
    case 'tiers':
      return tiers(data);
    case 'tax':
      return tax(data);
    case 'currency':
      return currency(data);
    case 'save':
      return save(data);
  }
}
