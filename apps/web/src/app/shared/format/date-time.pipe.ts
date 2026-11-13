import { Pipe, type PipeTransform } from '@angular/core';

export type DateTimeStyle = 'date' | 'dateTime';

const OPTIONS: Readonly<Record<DateTimeStyle, Intl.DateTimeFormatOptions>> = {
  date: { day: '2-digit', month: '2-digit', year: 'numeric' },
  dateTime: { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' },
};

/**
 * ISO 8601 instant → «13/11/2026» or «13/11/2026, 11:20», in the browser's time zone (spec 05 §3.5). The time zone
 * can be fixed so tests do not depend on the machine.
 */
export function formatDateTime(iso: string, style: DateTimeStyle, timeZone?: string): string {
  return new Intl.DateTimeFormat('es-ES', { ...OPTIONS[style], timeZone }).format(new Date(iso));
}

@Pipe({ name: 'dateTime' })
export class DateTimePipe implements PipeTransform {
  transform(iso: string, style: DateTimeStyle = 'dateTime'): string {
    return formatDateTime(iso, style);
  }
}
