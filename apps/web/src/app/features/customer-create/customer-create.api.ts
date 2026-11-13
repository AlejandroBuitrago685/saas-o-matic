import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { CreateCustomerRequest, CustomerResponse } from '@saas-o-matic/contract';
import { firstValueFrom } from 'rxjs';

/** POST /customers (04-contrato-api §3.2). Errors arrive as ApiError (apiErrorInterceptor). */
@Injectable({ providedIn: 'root' })
export class CustomerCreateApi {
  private readonly http = inject(HttpClient);

  create(request: CreateCustomerRequest): Promise<CustomerResponse> {
    return firstValueFrom(this.http.post<CustomerResponse>('/customers', request));
  }
}
