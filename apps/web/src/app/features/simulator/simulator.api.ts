import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { CreateSimulationRequest, SimulationResponse } from '@saas-o-matic/contract';
import { firstValueFrom } from 'rxjs';

/** POST /simulations (04-contrato-api §3.6): only the inputs travel, the server computes every amount (D-43). */
@Injectable({ providedIn: 'root' })
export class SimulatorApi {
  private readonly http = inject(HttpClient);

  create(request: CreateSimulationRequest): Promise<SimulationResponse> {
    return firstValueFrom(this.http.post<SimulationResponse>('/simulations', request));
  }
}
