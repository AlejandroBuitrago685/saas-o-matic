import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** V5 (spec 05 §3.6, CL-49): «Página no encontrada» or «Cliente no encontrado», with a way back to the start. */
@Component({
  selector: 'app-not-found-view',
  imports: [RouterLink],
  template: `
    <section class="card mx-auto flex max-w-xl flex-col items-start gap-4">
      <h1 class="page-title">{{ title() }}</h1>
      <p>Puede que el enlace sea incorrecto o que ya no exista.</p>
      <a routerLink="/" class="btn btn-primary">Volver al inicio</a>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundView {
  readonly title = input('Página no encontrada');
}
