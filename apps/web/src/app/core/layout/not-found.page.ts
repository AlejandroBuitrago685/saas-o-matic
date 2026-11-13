import { ChangeDetectionStrategy, Component } from '@angular/core';

import { NotFoundView } from '../../shared/ui/not-found-view';

/** Any unknown route (spec 05 §2, CL-49). */
@Component({
  selector: 'app-not-found-page',
  imports: [NotFoundView],
  template: `<app-not-found-view />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {}
