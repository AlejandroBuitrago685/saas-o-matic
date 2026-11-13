import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Footer of every view: the discreet mention of the technical test (D-122) and the attribution the exchange rate
 * provider requires (RF-18, spec 05 §2).
 */
@Component({
  selector: 'app-footer',
  templateUrl: './app-footer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppFooter {}
