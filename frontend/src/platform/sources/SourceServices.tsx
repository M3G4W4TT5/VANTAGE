import { createContext, useContext } from 'react';
import type { BasemapSource } from '../maps/BasemapSource';
import type { PlaceSource } from '../places/PlaceSource';

export type SourceServices = { basemapSources: BasemapSource[]; defaultBasemapId: string; offlineBasemap: BasemapSource; placeSource: PlaceSource };
export const SourceServicesContext = createContext<SourceServices | null>(null);
export function useSourceServices() {
  const services = useContext(SourceServicesContext);
  if (!services) throw new Error('Source capabilities have not been registered.');
  return services;
}
