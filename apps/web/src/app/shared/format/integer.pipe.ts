import { Pipe, type PipeTransform } from '@angular/core';

const INTEGER = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });

/** Whole number in es-ES: «1000», «10.000» (four digits have no separator in es-ES, spec 05 §4.5). */
export function formatInteger(value: number): string {
  return INTEGER.format(value);
}

@Pipe({ name: 'integer' })
export class IntegerPipe implements PipeTransform {
  transform(value: number): string {
    return formatInteger(value);
  }
}
