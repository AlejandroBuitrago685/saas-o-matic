import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ErrorState } from '../../shared/ui/error-state';
import { LoadingBlock } from '../../shared/ui/loading-block';
import { CustomerResults } from './customer-results';
import { CustomerSearchBox } from './customer-search-box';
import { CustomerSearchStore } from './customer-search.store';
import { DashboardMetrics } from './dashboard-metrics';
import { DashboardStatsStore } from './dashboard-stats.store';

/** Skeleton cards while the first page loads: as many as a row of three, twice. */
const SKELETON_CARDS = [0, 1, 2, 3, 4, 5] as const;

/**
 * V1 · Dashboard (spec 05 §3.1): the metrics (RF-19), and the search and paginated listing of the customers, whose
 * query and page live in the URL. «Nuevo cliente» is already in the header of every view.
 */
@Component({
  selector: 'app-dashboard-page',
  imports: [CustomerResults, CustomerSearchBox, DashboardMetrics, ErrorState, LoadingBlock, RouterLink],
  providers: [CustomerSearchStore, DashboardStatsStore],
  templateUrl: './dashboard.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  protected readonly store = inject(CustomerSearchStore);
  protected readonly skeletonCards = SKELETON_CARDS;
}
