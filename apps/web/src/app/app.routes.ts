import type { Routes } from '@angular/router';

const APP = 'SaaS-O-Matic';

/** Routes of spec 05 §2. Every view is loaded lazily, one chunk per feature. */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: `Clientes · ${APP}`,
    loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'customers/new',
    title: `Nuevo cliente · ${APP}`,
    loadComponent: () =>
      import('./features/customer-create/customer-create.page').then((m) => m.CustomerCreatePage),
  },
  {
    path: 'customers/:id',
    title: `Cliente · ${APP}`,
    loadComponent: () =>
      import('./features/customer-detail/customer-detail.page').then((m) => m.CustomerDetailPage),
  },
  {
    path: '**',
    title: `Página no encontrada · ${APP}`,
    loadComponent: () => import('./core/layout/not-found.page').then((m) => m.NotFoundPage),
  },
];
