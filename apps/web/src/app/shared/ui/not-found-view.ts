import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Icon } from './icon';

/** V5 (spec 05 §3.6, CL-49): «Página no encontrada» or «Cliente no encontrado», with a way back to the start. */
@Component({
  selector: 'app-not-found-view',
  imports: [Icon, RouterLink],
  template: `
    <section class="card mx-auto flex max-w-xl flex-col items-start gap-4">
      <span class="icon-tile"><app-icon name="search" class="size-6" /></span>
      <div class="page-heading">
        <h1 class="page-title">{{ title() }}</h1>
        <p class="page-subtitle">Puede que el enlace sea incorrecto o que ya no exista.</p>
      </div>
      <a routerLink="/" class="btn btn-primary"
        ><app-icon name="arrow-left" class="size-5" />Volver al inicio</a
      >
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundView {
  readonly title = input('Página no encontrada');
}
