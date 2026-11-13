import { ChangeDetectionStrategy, Component, type ElementRef, input, output, viewChild } from '@angular/core';
import { MAX_SEARCH_QUERY_LENGTH } from '@saas-o-matic/domain';

function inputValue(event: Event): string {
  return event.target instanceof HTMLInputElement ? event.target.value : '';
}

/**
 * Search field of the dashboard (spec 05 §3.1): its own label, 100 characters at most, Enter searches at once and a
 * button clears it. It only reports what happens; the store decides when to search. «Borrar» goes away with the text,
 * so it hands the focus back to the field instead of leaving it nowhere (spec 05 §5).
 */
@Component({
  selector: 'app-customer-search-box',
  template: `
    <form role="search" class="field" (submit)="$event.preventDefault(); submitted.emit()">
      <label for="customer-search" class="label">Buscar por empresa o identificador fiscal</label>
      <div class="flex gap-2">
        <input
          #field
          id="customer-search"
          type="search"
          class="input"
          autocomplete="off"
          enterkeyhint="search"
          [attr.maxlength]="maxLength"
          [value]="text()"
          (input)="typed.emit(inputValue($event))"
        />
        @if (text() !== '') {
          <button type="button" class="btn btn-secondary shrink-0" (click)="clear()">
            Borrar<span class="sr-only"> la búsqueda</span>
          </button>
        }
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerSearchBox {
  readonly text = input.required<string>();
  readonly typed = output<string>();
  readonly submitted = output();
  readonly cleared = output();

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  protected readonly maxLength = MAX_SEARCH_QUERY_LENGTH;
  protected readonly inputValue = inputValue;

  /** Moves the focus to the field: also for the dashboard, when its «Limpiar búsqueda» goes away. */
  focus(): void {
    this.field().nativeElement.focus();
  }

  protected clear(): void {
    this.cleared.emit();
    this.focus();
  }
}
