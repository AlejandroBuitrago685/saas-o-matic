import { ChangeDetectionStrategy, Component, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';

/** «Clientes» covers the start page and a customer's detail; the creation form belongs to «Nuevo cliente». */
export function isCustomersSectionUrl(url: string): boolean {
  const path = url.split(/[?#]/)[0] ?? '';
  return path === '/' || (path.startsWith('/customers/') && path !== '/customers/new');
}

/**
 * Top bar of every view (spec 05 §2), laid out like the reference: text wordmark with the accent of its headlines
 * on the last word (D-122), navigation on the left and the primary action on the right. The currency selector and
 * the rates indicator join the tools group in P8.
 */
@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './app-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeader {
  private readonly router = inject(Router);

  protected readonly isCustomersSection: Signal<boolean> = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => isCustomersSectionUrl(event.urlAfterRedirects)),
    ),
    { initialValue: isCustomersSectionUrl(this.router.url) },
  );
}
