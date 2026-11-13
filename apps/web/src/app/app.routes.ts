import type { Routes } from '@angular/router';

const APP = 'SaaS-O-Matic';

/** Routes of spec 05 §2. Every view is loaded lazily, one chunk per feature. */
export const routes: Routes = [
  // The dashboard (V1) needs GET /customers, which arrives in P7. Until then the start page is the creation form,
  // instead of a provisional page that would be thrown away (D-126). TODO(P7): replace with the dashboard route.
  { path: '', pathMatch: 'full', redirectTo: 'customers/new' },
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
