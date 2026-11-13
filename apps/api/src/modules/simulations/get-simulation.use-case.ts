import { NotFoundError } from '../../shared/app-error.js';
import type { Simulation, SimulationRepository } from './simulations.types.js';

export type GetSimulation = (id: string) => Simulation;

/** The simulation of the URL, or 404. */
export function createGetSimulation(simulations: SimulationRepository): GetSimulation {
  return (id) => {
    const simulation = simulations.findById(id);
    if (simulation === undefined) throw new NotFoundError();
    return simulation;
  };
}
