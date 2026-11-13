import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { CustomerResponse } from '@saas-o-matic/contract';

import { CatalogStore } from '../../core/catalog/catalog.store';
import { ToastStore } from '../../core/layout/toast.store';
import { ErrorState } from '../../shared/ui/error-state';
import { LoadingBlock } from '../../shared/ui/loading-block';
import { CustomerForm } from './customer-form';

/** V2 · Alta de cliente (spec 05 §3.2). Without the catalog there is nothing to choose from, so no form. */
@Component({
  selector: 'app-customer-create-page',
  imports: [CustomerForm, ErrorState, LoadingBlock],
  template: `
    <div class="mx-auto flex max-w-2xl flex-col gap-6">
      <div class="flex flex-col gap-1">
        <h1 class="page-title">Nuevo cliente</h1>
        <p>Da de alta la empresa para simular su suscripción.</p>
      </div>
      @if (catalog.ready(); as ready) {
        <app-customer-form [catalog]="ready" (created)="onCreated($event)" />
      } @else if (catalog.state().status === 'error') {
        <app-error-state
          message="No se ha podido cargar el catálogo. Sin él no se puede dar de alta un cliente."
          (retry)="catalog.reload()"
        />
      } @else {
        <div class="card"><app-loading-block label="Cargando el formulario…" [lines]="6" /></div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerCreatePage {
  protected readonly catalog = inject(CatalogStore);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastStore);

  protected async onCreated(customer: CustomerResponse): Promise<void> {
    this.toasts.success('Cliente creado');
    await this.router.navigate(['/customers', customer.id]);
  }
}
